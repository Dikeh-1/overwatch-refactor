import { after } from "next/server";
import { processStudioQueue, validFollowUp, deliveryId } from "@/lib/communication-delivery";
import { getMail, putMail, insertMailBatch } from "@/lib/communication-mail-store";
import { candidateVariables, studioScope } from "@/lib/communication-content";
import { renderOfficialMail } from "@/lib/communication-renderer";
import { getCandidateSlotConfig } from "@/lib/careers-booking";
import { isPastDateSlot, isSlotBookingExpired } from "@/lib/careers";
import { auditRequest } from "@/lib/admin-activity";
import crypto from "node:crypto";
import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
import { applicationsForCohort, sameRole, canReceiveTestInvitation, hasSentCommunication, isNextPhase, isQualified } from "@/lib/careers-workflow";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { sendTransactionalEmail } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";
import type { Application } from "@/lib/careers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface BroadcastRequest {
  draftId?: string;
  followUp?: { trigger: "booking_confirmed"; subject: string; message: string };
  locale?: "en" | "pt";
  cohortId?: string;
  audienceFilter:
    | "invited_unconfirmed"
    | "shortlisted_unbooked"
    | "booked_confirmed"
    | "all_invited"
    | "all_applied"
    | "all_role"
    | "screened"
    | "interview"
    | "disqualified"
    | "next_phase"
    | "individual";
  genderFilter?: "all" | "female" | "male";
  roleId?: string;
  candidateId?: string;
  candidateEmail?: string;
  subject: string;
  message: string;
  includeBookingButton?: boolean;
  buttonText?: string;
  testOnly?: boolean;
  testEmail?: string;
  attachments?: { name: string; content: string; type?: string }[];
}

async function handlePOST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(null, { status: 403 });
  }

  try {
    const body = (await request.json()) as BroadcastRequest;
    const {
      audienceFilter,
      genderFilter = "all",
      roleId,
      candidateId,
      candidateEmail,
      subject,
      message,
      includeBookingButton = false,
      buttonText = "Confirmar Data do Teste Presencial",
      testOnly = false,
      testEmail,
      attachments,
    } = body;

    if (typeof subject !== "string" || typeof message !== "string" || subject.length > 1000 || message.length > 100000 || !subject.trim() || !message.trim()) {
      return Response.json(
        { error: "Subject and message are required." },
        { status: 400 },
      );
    }

    if (body.followUp && (!includeBookingButton || !validFollowUp(body.followUp))) return Response.json({ error: "A booking follow-up needs a booking invitation and a subject and message. It cannot contain another booking link." }, { status: 400 });

    if (testOnly) {
      const recipient = testEmail?.trim();
      if (!recipient || !recipient.includes("@")) {
        return Response.json(
          { error: "Por favor introduza um endereço de e-mail válido para o teste." },
          { status: 400 },
        );
      }

      const workspace = await getRecruitmentWorkspaceData();
    const cohort = body.cohortId ? workspace.cohorts.find(c => c.id === body.cohortId) : undefined;
    if (body.cohortId && !cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });
    const allApps = cohort ? applicationsForCohort(workspace.applications, cohort, workspace.cohorts) : workspace.applications;
      const matchedCandidate = allApps.find(
        (a) => a.email.trim().toLowerCase() === recipient.toLowerCase(),
      );

      const sampleCandidate: Application = {
        id: "preview-only",
        name: matchedCandidate?.name || "Sample applicant",
        email: recipient,
        whatsapp: matchedCandidate?.whatsapp || "+258 84 287 0793",
        role: roleId || "cctv",
        locale: "pt",
        grade12: "yes",
        sex: (matchedCandidate?.sex || "female") as "female" | "male",
        ai: "no",
        experience: "yes",
        lastProfession: matchedCandidate?.lastProfession || "Operadora de CCTV",
        shifts: "yes",
        cvName: "curriculo.pdf",
        cvType: "application/pdf",
        cvSize: 102400,
        status: "interview",
        createdAt: new Date().toISOString(),
        testSlot: matchedCandidate?.testSlot,
      };

      const previewRole = workspace.roles.find(role => sameRole(role.id, roleId));
      const roleTitle = previewRole ? body.locale === "en" ? previewRole.en : previewRole.pt : roleId === "cctv" || !roleId ? "Operadora de CCTV" : roleId;
      const isEnglish = body.locale ? body.locale === "en" :
        /Dear\s+/i.test(message) ||
        /Kind regards/i.test(message) ||
        /Please be reminded/i.test(message) ||
        /recruitment process/i.test(message);

      const substitutedSubject = substituteCandidateVariables(
        subject,
        sampleCandidate,
        roleTitle,
        isEnglish,
      );
      const substitutedMessage = substituteCandidateVariables(
        message,
        sampleCandidate,
        roleTitle,
        isEnglish,
      );

      const html = generateOfficialBroadcastHtml({
        candidate: sampleCandidate,
        subject,
        message,
        includeBookingButton,
        buttonText,
        roleTitle,
        locale: isEnglish ? "en" : "pt",
      });

      await sendTransactionalEmail({
        sender: { name: "Overwatch Recrutamento", email: "info@overwatchmoz.com" },
        to: [{ email: recipient, name: sampleCandidate.name }],
        subject: `[TEST PREVIEW] ${substitutedSubject.trim()}`,
        htmlContent: html,
        textContent: substitutedMessage.trim(),
        attachment: attachments?.map((a) => ({ name: a.name, content: a.content })),
      });

      return Response.json({
        success: true,
        testMode: true,
        recipient,
        samplePersonalizedName: sampleCandidate.name,
      });
    }

    const workspace = await getRecruitmentWorkspaceData();
    const cohort = body.cohortId ? workspace.cohorts.find(c => c.id === body.cohortId) : undefined;
    if (body.cohortId && !cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });
    const allApps = cohort ? applicationsForCohort(workspace.applications, cohort, workspace.cohorts) : workspace.applications;

    // Filter by individual or audience cohort
    let targetPool: Application[] = [];

    if (audienceFilter === "individual" || candidateId || candidateEmail) {
      targetPool = allApps.filter(a => candidateId ? a.id === candidateId : Boolean(candidateEmail && a.email.trim().toLowerCase() === candidateEmail.trim().toLowerCase()));
      if (roleId && roleId !== "all" && targetPool.some(a => !sameRole(a.role, roleId))) return Response.json({ error: "Candidate outside the selected role" }, { status: 400 });
    } else {
      // Filter by role if specified
      const roleApps = roleId && roleId !== "all" ? allApps.filter((a) => sameRole(a.role, roleId)) : allApps;
      const contactedEmails = new Set(
        roleApps.filter(hasSentCommunication).map((a) => a.email.trim().toLowerCase()),
      );
      const bookedEmails = new Set(
        roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").map((a) => a.email.trim().toLowerCase()),
      );
      targetPool = roleApps;

      // Filter by audience cohort
      if (audienceFilter === "invited_unconfirmed" || audienceFilter === "shortlisted_unbooked") {
        targetPool = targetPool.filter(a => !a.testSlot && !bookedEmails.has(a.email.trim().toLowerCase()) && !["archived", "rejected", "not_advancing", "withdrawn", "disqualified"].includes(a.status));
      } else if (audienceFilter === "booked_confirmed") {
        targetPool = targetPool.filter(
          (a) => Boolean(a.testSlot) && a.status !== "archived",
        );
      } else if (audienceFilter === "all_invited") {
        targetPool = targetPool.filter(
          (a) => Boolean(a.invitedAt) && a.status !== "archived",
        );
      } else if (audienceFilter === "screened") {
        targetPool = targetPool.filter(isQualified);
      } else if (audienceFilter === "interview") {
        targetPool = targetPool.filter(
          (a) => a.status === "interview",
        );
      } else if (audienceFilter === "next_phase") {
        targetPool = targetPool.filter(isNextPhase);
      } else if (audienceFilter === "disqualified") {
        targetPool = targetPool.filter((a) => a.status === "archived");
      } else if (audienceFilter === "all_applied" || audienceFilter === "all_role") {
        targetPool = targetPool.filter((a) => a.status !== "archived" && !hasSentCommunication(a) && !contactedEmails.has(a.email.trim().toLowerCase()));
      }

      // Filter by gender
      if (genderFilter !== "all") {
        targetPool = targetPool.filter((a) => a.sex === genderFilter);
      }
    }

    if (includeBookingButton) targetPool = targetPool.filter(canReceiveTestInvitation);

    // Deduplicate by email address and exclude deactivated candidate
    const seenEmails = new Set<string>();
    const deduplicatedCandidates: Application[] = [];

    for (const app of targetPool) {
      const normEmail = app.email.trim().toLowerCase();
      if (!seenEmails.has(normEmail)) {
        seenEmails.add(normEmail);
        deduplicatedCandidates.push(app);
      }
    }

    if (deduplicatedCandidates.length === 0) {
      return Response.json(
        { error: "Nenhum candidato corresponde aos filtros seleccionados." },
        { status: 400 },
      );
    }

    if (includeBookingButton) {
      const configs = new Map<string, Awaited<ReturnType<typeof getCandidateSlotConfig>>>();
      for (const candidate of deduplicatedCandidates) {
        const key = `${candidate.role}:${candidate.cohortId}`;
        const config = configs.get(key) || await getCandidateSlotConfig(candidate); configs.set(key, config);
        if (!config.slots.some(slot => !isPastDateSlot(slot) && !isSlotBookingExpired(slot))) return Response.json({ error: "No future test slots are configured for this applicant's recruitment cycle. Configure its schedule in Settings before inviting." }, { status: 400 });
      }
    }
    if (body.draftId) {
      const draft = await getMail(body.draftId);
      const scope = studioScope(body.cohortId, roleId, audienceFilter === "individual" ? candidateId : undefined);
      if (!draft || draft.kind !== "draft" || draft.scope !== scope) return Response.json({ error: "Save the draft before sending." }, { status: 409 });
      if (!["draft", "queued"].includes(draft.data.status)) return Response.json({ error: "This draft was already sent. Review Sent mail before creating another message." }, { status: 409 });
      if (draft.data.followUpEnabled && (!draft.data.includeBookingButton || !validFollowUp({ trigger: "booking_confirmed", subject: draft.data.followUpSubject, message: draft.data.followUpBody }))) return Response.json({ error: "Fix the saved booking follow-up before sending." }, { status: 400 });
      if (draft.data.status === "draft" && (draft.data.subject !== subject || draft.data.messageBody !== message || Boolean(draft.data.includeBookingButton) !== includeBookingButton)) return Response.json({ error: "The message changed since its last save. Save it again before sending." }, { status: 409 });
      const queuedItems = draft.data.status === "queued" ? draft.data.queuedItems : deduplicatedCandidates.map(candidate => {
        const role = workspace.roles.find(r => sameRole(r.id, candidate.role));
        return { id: deliveryId(`${body.draftId}:${candidate.id}`), kind: "outbox" as const, scope, data: { contentId: body.draftId, subject, candidateId: candidate.id, candidateName: candidate.name, roleId: candidate.role, cohortId: candidate.cohortId, recipient: candidate.email, campaignId: body.draftId, roleTitle: role ? draft.data.emailLang === "en" ? role.en : role.pt : candidate.role, locale: draft.data.emailLang === "en" ? "en" : "pt", includeBookingButton: Boolean(draft.data.includeBookingButton), status: "queued", deliveryId: crypto.randomUUID() } };
      });
      if (!Array.isArray(queuedItems) || !queuedItems.length) return Response.json({ error: "The saved recipient list is unavailable. Review Outbox before retrying." }, { status: 409 });
      // Freeze content and recipients before making any delivery claimable. Concurrent requests cannot add recipients.
      if (draft.data.status === "draft") await putMail({ ...draft, data: { ...draft.data, status: "queued", queuedItems } }, draft.version);
      await insertMailBatch(queuedItems);
      after(async () => { await processStudioQueue(scope, body.draftId); });
      return Response.json({ success: true, queued: true, campaignId: body.draftId, totalTargeted: queuedItems.length });
    }

    let sentCount = 0;
    const errors: { email: string; error: string }[] = [];
    const historyWarnings: string[] = [];

    for (const candidate of deduplicatedCandidates) {
      try {
        const isEnglish = body.locale ? body.locale === "en" :
          /Dear\s+/i.test(message) ||
          /Kind regards/i.test(message) ||
          /Please be reminded/i.test(message) ||
          /recruitment process/i.test(message);

        const role = workspace.roles.find(r => sameRole(r.id, candidate.role));
        const roleTitle = role ? (isEnglish ? role.en : role.pt) : candidate.role;
        const candSubj = substituteCandidateVariables(subject, candidate, roleTitle, isEnglish);
        const candMsg = substituteCandidateVariables(message, candidate, roleTitle, isEnglish);

        const html = generateOfficialBroadcastHtml({
          candidate,
          subject,
          message,
          includeBookingButton,
          buttonText,
          roleTitle,
          locale: isEnglish ? "en" : "pt",
        });

        await sendTransactionalEmail({
          sender: { name: "Overwatch Recrutamento", email: "info@overwatchmoz.com" },
          to: [{ email: candidate.email.trim(), name: candidate.name.trim() }],
          subject: candSubj.trim(),
          htmlContent: html,
          textContent: candMsg.trim(),
          attachment: attachments?.map((a) => ({ name: a.name, content: a.content })),
        }, candidate.id);

        sentCount++;
        try {
          await updateApplication(candidate.id, { ...(includeBookingButton ? { invitedAt: new Date().toISOString(), ...(!candidate.testSlot && ["new", "shortlisted", "archived"].includes(candidate.status) ? { status: "test_invited" as const } : {}) } : {}), communications: [...(candidate.communications || []), { id: crypto.randomUUID(), type: "custom", subject: candSubj, bodySnippet: candMsg, recipient: candidate.email, sentAt: new Date().toISOString(), status: "sent" }] });
        } catch {
          // Delivery already succeeded. Reporting failure here invites duplicate emails.
          historyWarnings.push(candidate.id);
        }
      } catch (err) {
        await updateApplication(candidate.id, { communications: [...(candidate.communications || []), { id: crypto.randomUUID(), type: "custom", subject, recipient: candidate.email, sentAt: new Date().toISOString(), status: "failed" }] }).catch(() => {});
        errors.push({
          email: candidate.email,
          error: (err as Error).message || String(err),
        });
      }

      // Safe pacing between sequential emails to avoid rate limits
      await new Promise((r) => setTimeout(r, 120));
    }

    return Response.json({
      success: true,
      sentCount,
      failedCount: errors.length,
      totalTargeted: deduplicatedCandidates.length,
      errors: errors.length > 0 ? errors : undefined,
      historyWarnings: historyWarnings.length ? historyWarnings : undefined,
    });
  } catch (error) {
    console.error("Custom broadcast error:", error);
    return Response.json(
      { error: (error as Error).message || "Broadcast dispatch failed." },
      { status: 500 },
    );
  }
}

export function substituteCandidateVariables(text: string, candidate: Application, roleTitle?: string, isEnglish?: boolean): string {
  return candidateVariables(text, candidate, roleTitle || (candidate.role === "cctv" ? isEnglish ? "CCTV Operator" : "Operadora de CCTV" : candidate.role), isEnglish ? "en" : "pt");
}
export function generateOfficialBroadcastHtml(params: { candidate: Application; subject: string; message: string; includeBookingButton: boolean; buttonText: string; roleTitle?: string; locale?: "en" | "pt" }) {
  return renderOfficialMail({ ...params, roleTitle: params.roleTitle || params.candidate.role, locale: params.locale || (/Dear\s+|Kind regards|recruitment process/i.test(params.message) ? "en" : "pt") }).html;
}
export async function POST(request: Request) { return auditRequest(request, () => handlePOST(request)); }
