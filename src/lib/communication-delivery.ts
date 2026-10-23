import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getMail, listMail, putMail, type MailItem, type MailAttachment, hydrateMailAttachments, insertMailBatch } from "./communication-mail-store";
import { renderOfficialMail } from "./communication-renderer";
import { sendTransactionalEmail } from "./careers-email";
import { getApplication, updateApplication } from "./careers-store";
import { canReceiveTestInvitation, sameRole } from "./careers-workflow";
import type { Application } from "./careers";
import { getRecruitmentWorkspaceData } from "./careers-workspace-store";

export const deliveryId = (key: string) => createHash("sha256").update(key).digest("hex");
export type FollowUp = { trigger: "booking_confirmed"; subject: string; message: string };
export function validFollowUp(value: unknown): value is FollowUp {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<FollowUp>;
  return data.trigger === "booking_confirmed" && typeof data.subject === "string" && Boolean(data.subject.trim()) && data.subject.length <= 1000 && typeof data.message === "string" && Boolean(data.message.trim()) && data.message.length <= 100000 && !/\{\{booking_link\}\}/.test(data.message);
}
export async function enqueueStudioMail(candidate: Application, data: MailItem["data"], scope: string, campaignId: string): Promise<MailItem> {
  const id = deliveryId(`${campaignId}:${candidate.id}`), existing = await getMail(id);
  if (existing) return existing;
  try { return await putMail({ id, kind: "outbox", scope, data: { ...data, candidateId: candidate.id, roleId: candidate.role, cohortId: candidate.cohortId, recipient: candidate.email, testSlot: candidate.testSlot || (data as any)?.testSlot, campaignId, status: "queued", deliveryId: randomUUID() } }, 0); }
  catch (error) { if ((error as Error).message === "MAIL_CONFLICT") { const winner = await getMail(id); if (winner) return winner; } throw error; }
}
export async function deliverQueuedItem(item: MailItem) {
  if (item.kind !== "outbox" || item.data.status !== "queued") return;
  let claimed: MailItem;
  try { claimed = await putMail({ ...item, data: { ...item.data, status: "sending" } }, item.version); }
  catch (error) { if ((error as Error).message === "MAIL_CONFLICT") return; throw error; }
  let delivered = false;
  try {
    if (item.data.contentId) {
      const content = await getMail(item.data.contentId);
      if (content?.kind === "draft" && content.scope === item.scope && content.data.status === "cancelled") {
        await putMail({ ...claimed, data: { ...claimed.data, status: "deleted", deletedAt: new Date().toISOString() } }, claimed.version);
        return;
      }
      if (!content || content.kind !== "draft" || content.scope !== item.scope || !["draft", "queued", "sent", "completed"].includes(content.data.status)) throw Error("The saved message is unavailable. Review this draft before sending.");
      item = { ...item, data: { ...item.data, subject: content.data.subject, messageBody: content.data.messageBody, attachments: await hydrateMailAttachments(content.data.attachments, item.scope), followUp: content.data.followUpEnabled ? { trigger: "booking_confirmed", subject: content.data.followUpSubject, message: content.data.followUpBody } : undefined } };
    }
    const rawCandidate = await getApplication(item.data.candidateId, true);
    const workspaceApps = item.data.includeBookingButton ? ((await getRecruitmentWorkspaceData().catch(() => ({ applications: [] as Application[] }))).applications || []) : [];
    const workspaceCandidate = workspaceApps.find(a => a.id === item.data.candidateId);
    let candidate = rawCandidate || workspaceCandidate;
    if (candidate && item.data.testSlot && !candidate.testSlot) { candidate = { ...candidate, testSlot: item.data.testSlot }; }
    if (!candidate || !sameRole(candidate.role, item.data.roleId) || candidate.cohortId !== item.data.cohortId || candidate.email !== item.data.recipient) throw Error("Candidate identity or cycle changed. Review before sending.");
    // Queue creation uses recovered stages and cycle-specific screening. Use the
    // same evaluation here instead of rejecting against stale stored scores.
    const evaluated = item.data.includeBookingButton ? workspaceCandidate : candidate;
    if (item.data.includeBookingButton && (!evaluated || !canReceiveTestInvitation(evaluated))) {
      await putMail({ ...claimed, data: { ...claimed.data, status: "skipped", error: "Invitation skipped: the applicant is no longer eligible. No email was sent." } }, claimed.version);
      return;
    }
    const rendered = renderOfficialMail({ candidate, subject: item.data.subject, message: item.data.messageBody, roleTitle: item.data.roleTitle, locale: item.data.locale || "pt", includeBookingButton: item.data.includeBookingButton });
    const receipt = await sendTransactionalEmail({ to: [{ email: candidate.email, name: candidate.name }], subject: rendered.subject, htmlContent: rendered.html, textContent: rendered.text, attachment: item.data.attachments?.map((a: MailAttachment) => ({ name: a.name, content: a.content })) }, candidate.id);
    delivered = true;
    // Commit delivery first. History/automation failures must never make this message eligible for a duplicate send.
    claimed = await putMail({ ...claimed, data: { ...claimed.data, subject: rendered.subject, messageBody: rendered.text, htmlContent: rendered.html, providerMessageId: receipt.messageId, status: "sent", sentAt: new Date().toISOString(), attachments: (item.data.attachments || []).map((a: MailAttachment) => ({ name: a.name, type: a.type, size: a.size })) } }, claimed.version);
    const current = await getApplication(candidate.id) || candidate;
    const commEntry = { id: item.data.deliveryId, type: "custom" as const, subject: rendered.subject, bodySnippet: rendered.text, recipient: candidate.email, sentAt: claimed.data.sentAt, status: "sent" as const };
    const invitedPatch = item.data.includeBookingButton
      ? {
          invitedAt: claimed.data.sentAt || new Date().toISOString(),
          ...(!current.testSlot && ["new", "shortlisted", "archived"].includes(current.status) ? { status: "test_invited" as const } : {}),
        }
      : {};
    await updateApplication(candidate.id, { ...invitedPatch, communications: [...(current.communications || []), commEntry] });
    // Keep duplicate application rows for the same email & role in sync so uncontacted counts never desync
    const normEmail = candidate.email.trim().toLowerCase();
    for (const dup of workspaceApps.filter(a => a.id !== candidate.id && sameRole(a.role, candidate.role) && a.email.trim().toLowerCase() === normEmail)) {
      await updateApplication(dup.id, { ...invitedPatch, communications: [...(dup.communications || []), commEntry] }).catch(() => {});
    }
    if (item.data.followUp) {
      const ruleId = deliveryId(`booking-follow-up:${candidate.id}`), previous = await getMail(ruleId);
      await putMail({ id: ruleId, scope: item.scope, kind: "automation", data: { ...item.data.followUp, candidateId: candidate.id, roleId: candidate.role, cohortId: candidate.cohortId, recipient: candidate.email, locale: item.data.locale, roleTitle: item.data.roleTitle, status: "waiting_for_booking", campaignId: item.data.campaignId } }, previous?.version || 0);
      const booked = await getApplication(candidate.id);
      if (booked?.testBookedAt && booked.testBookedAt >= claimed.data.sentAt) await bookingFollowUp(booked);
    }
  } catch (error) {
    const latest = await getMail(item.id);
    if (latest) await putMail({ ...latest, data: { ...latest.data, status: delivered ? "sent" : (error as Error & { deliveryUncertain?: boolean }).deliveryUncertain ? "needs_verification" : "failed", error: delivered ? "Delivered. Profile history or follow-up setup needs attention; do not resend." : (error as Error).message, requiresReview: delivered } }, latest.version).catch(() => {});
  }
}
export async function processStudioQueue(scope: string, campaignId?: string) {
  // One durable worker per mailbox keeps concurrent resume/send requests from
  // multiplying the five-message batch size. Individual claims still guard each send.
  void campaignId; // Existing callers may identify a campaign; the worker drains its whole mailbox.
  const workerId = deliveryId(`mail-worker:${scope}`), current = await getMail(workerId);
  if (current?.data.status === "processing" && current.data.expiresAt > Date.now()) return;
  let lease: MailItem;
  try { lease = await putMail({ id: workerId, kind: "worker", scope, data: { status: "processing", expiresAt: Date.now() + 25000 } }, current?.version || 0); }
  catch (error) { if ((error as Error).message === "MAIL_CONFLICT") return; throw error; }
  try {
    const drafts = await listMail(scope,"draft","queued");
    for (const draft of drafts) if (draft.data.status === "queued" && Array.isArray(draft.data.queuedItems) && (await getMail(draft.id))?.data.status === "queued") await insertMailBatch(draft.data.queuedItems);
    const until = Date.now() + 230000;
    while (Date.now() < until) {
      const queued = (await listMail(scope,"outbox","queued")).filter(item => item.data.status === "queued").slice(0,5);
      if (!queued.length) {
        const rows = await listMail(scope,"outbox");
        for (const draft of await listMail(scope,"draft","queued")) {
          const campaign = rows.filter(item => item.data.campaignId === draft.id);
          if (campaign.length && campaign.every(item => ["sent", "failed", "skipped", "deleted", "needs_verification"].includes(item.data.status))) await putMail({ ...draft, data: { ...draft.data, status: campaign.every(item => item.data.status === "sent") ? "sent" : "completed", completedAt: new Date().toISOString() } }, draft.version).catch(() => {});
        }
        return;
      }
      await Promise.all(queued.map(deliverQueuedItem));
      lease = await putMail({ ...lease, data: { status: "processing", expiresAt: Date.now() + 25000 } }, lease.version).catch(() => lease);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } finally { await putMail({ ...lease, data: { status: "idle" } }, lease.version).catch(() => {}); }
}
export async function bookingFollowUp(candidate: Application) {
  let rule = await getMail(deliveryId(`booking-follow-up:${candidate.id}`));
  if (!rule || rule.kind !== "automation" || rule.data.status !== "waiting_for_booking" || rule.data.cohortId !== candidate.cohortId || !sameRole(rule.data.roleId,candidate.role)) return;
  try { rule = await putMail({ ...rule, data: { ...rule.data, status: "sending" } }, rule.version); }
  catch (error) { if ((error as Error).message === "MAIL_CONFLICT") return; throw error; }
  try {
  const item = await enqueueStudioMail(candidate, { subject: rule.data.subject, messageBody: rule.data.message, roleTitle: rule.data.roleTitle, locale: rule.data.locale, includeBookingButton: false, testSlot: candidate.testSlot }, rule.scope, `${rule.id}:${candidate.testBookedAt}`);
  await deliverQueuedItem(item);
  const outcome = await getMail(item.id);
  await putMail({ ...rule, data: { ...rule.data, status: outcome?.data.status === "sent" ? "completed" : "needs_attention", outboxId: item.id } }, rule.version).catch(error => { if ((error as Error).message !== "MAIL_CONFLICT") throw error; });
  } catch (error) {
    await putMail({ ...rule, data: { ...rule.data, status: "needs_attention", error: (error as Error).message } }, rule.version).catch(() => {});
    throw error;
  }
}
