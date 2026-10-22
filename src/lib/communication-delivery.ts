import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getMail, listMail, putMail, type MailItem, type MailAttachment, hydrateMailAttachments, insertMailBatch } from "./communication-mail-store";
import { renderOfficialMail } from "./communication-renderer";
import { sendTransactionalEmail } from "./careers-email";
import { getApplication, updateApplication } from "./careers-store";
import { canReceiveTestInvitation, sameRole } from "./careers-workflow";
import type { Application } from "./careers";

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
  try { return await putMail({ id, kind: "outbox", scope, data: { ...data, candidateId: candidate.id, roleId: candidate.role, cohortId: candidate.cohortId, recipient: candidate.email, campaignId, status: "queued", deliveryId: randomUUID() } }, 0); }
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
      if (!content || content.kind !== "draft" || content.scope !== item.scope || !["queued", "sent"].includes(content.data.status)) throw Error("The saved message is unavailable. Review this draft before sending.");
      item = { ...item, data: { ...item.data, subject: content.data.subject, messageBody: content.data.messageBody, attachments: await hydrateMailAttachments(content.data.attachments, item.scope), followUp: content.data.followUpEnabled ? { trigger: "booking_confirmed", subject: content.data.followUpSubject, message: content.data.followUpBody } : undefined } };
    }
    const candidate = await getApplication(item.data.candidateId);
    if (!candidate || !sameRole(candidate.role, item.data.roleId) || candidate.cohortId !== item.data.cohortId || candidate.email !== item.data.recipient) throw Error("Candidate identity or cycle changed. Review before sending.");
    if (item.data.includeBookingButton && !canReceiveTestInvitation(candidate)) throw Error("This applicant is no longer eligible for a booking invitation.");
    const rendered = renderOfficialMail({ candidate, subject: item.data.subject, message: item.data.messageBody, roleTitle: item.data.roleTitle, locale: item.data.locale || "pt", includeBookingButton: item.data.includeBookingButton });
    await sendTransactionalEmail({ to: [{ email: candidate.email, name: candidate.name }], subject: rendered.subject, htmlContent: rendered.html, textContent: rendered.text, attachment: item.data.attachments?.map((a: MailAttachment) => ({ name: a.name, content: a.content })) }, candidate.id);
    delivered = true;
    // Commit delivery first. History/automation failures must never make this message eligible for a duplicate send.
    claimed = await putMail({ ...claimed, data: { ...claimed.data, subject: rendered.subject, messageBody: rendered.text, status: "sent", sentAt: new Date().toISOString(), attachments: (item.data.attachments || []).map((a: MailAttachment) => ({ name: a.name, type: a.type, size: a.size })) } }, claimed.version);
    const current = await getApplication(candidate.id) || candidate;
    await updateApplication(candidate.id, { ...(item.data.includeBookingButton ? { invitedAt: new Date().toISOString() } : {}), communications: [...(current.communications || []), { id: item.data.deliveryId, type: "custom", subject: rendered.subject, bodySnippet: rendered.text, recipient: candidate.email, sentAt: claimed.data.sentAt, status: "sent" }] });
    if (item.data.followUp) {
      const ruleId = deliveryId(`booking-follow-up:${candidate.id}`), previous = await getMail(ruleId);
      await putMail({ id: ruleId, scope: item.scope, kind: "automation", data: { ...item.data.followUp, candidateId: candidate.id, roleId: candidate.role, cohortId: candidate.cohortId, recipient: candidate.email, locale: item.data.locale, roleTitle: item.data.roleTitle, status: "waiting_for_booking", campaignId: item.data.campaignId } }, previous?.version || 0);
      const booked = await getApplication(candidate.id);
      if (booked?.testBookedAt && booked.testBookedAt >= claimed.data.sentAt) await bookingFollowUp(booked);
    }
  } catch (error) {
    const latest = await getMail(item.id);
    if (latest) await putMail({ ...latest, data: { ...latest.data, status: delivered ? "sent" : "failed", error: delivered ? "Delivered. Profile history or follow-up setup needs attention; do not resend." : (error as Error).message, requiresReview: delivered } }, latest.version).catch(() => {});
  }
}
export async function processStudioQueue(scope: string, campaignId?: string) {
  // Recover an interrupted queue insertion using the already frozen recipient list.
  const drafts = campaignId ? [await getMail(campaignId)] : await listMail(scope,"draft","queued");
  for (const draft of drafts) if (draft?.kind === "draft" && draft.scope === scope && draft.data.status === "queued" && Array.isArray(draft.data.queuedItems)) await insertMailBatch(draft.data.queuedItems);
  const until = Date.now() + 230000;
  while (Date.now() < until) {
    const queued = (await listMail(scope,"outbox","queued")).filter(item => item.data.status === "queued" && (!campaignId || item.data.campaignId === campaignId)).slice(0,3);
    if (!queued.length) {
      if (campaignId) {
        const rows = (await listMail(scope,"outbox")).filter(item => item.data.campaignId === campaignId);
        const draft = await getMail(campaignId);
        if (draft?.kind === "draft" && rows.length && rows.every(item => item.data.status === "sent")) await putMail({ ...draft, data: { ...draft.data, status: "sent" } }, draft.version).catch(() => {});
      }
      return;
    }
    await Promise.all(queued.map(deliverQueuedItem));
  }
}
export async function bookingFollowUp(candidate: Application) {
  const rule = await getMail(deliveryId(`booking-follow-up:${candidate.id}`));
  if (!rule || rule.kind !== "automation" || rule.data.status !== "waiting_for_booking" || rule.data.cohortId !== candidate.cohortId || !sameRole(rule.data.roleId,candidate.role)) return;
  const item = await enqueueStudioMail(candidate, { subject: rule.data.subject, messageBody: rule.data.message, roleTitle: rule.data.roleTitle, locale: rule.data.locale, includeBookingButton: false }, rule.scope, `${rule.id}:${candidate.testBookedAt}`);
  await deliverQueuedItem(item);
  const outcome = await getMail(item.id);
  await putMail({ ...rule, data: { ...rule.data, status: outcome?.data.status === "sent" ? "completed" : "needs_attention", outboxId: item.id } }, rule.version).catch(error => { if ((error as Error).message !== "MAIL_CONFLICT") throw error; });
}
