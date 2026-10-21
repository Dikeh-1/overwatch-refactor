import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
import { applicationsForCohort, sameRole, isNextPhase, isTerminal } from "@/lib/careers-workflow";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import {
  getApplications,
  updateApplication,
  deleteApplications,
  getDeletedNextPhaseIdentifiers,
  addDeletedNextPhaseIdentifiers,
} from "@/lib/careers-store";
import { APPROVED_NEXT_PHASE_CANDIDATES, Application, normalizePhone } from "@/lib/careers";
import { sendNextPhaseInvitationEmail, sendNextPhaseInstructionsEmail } from "@/lib/careers-email";
import crypto from "node:crypto";

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export async function GET(request: Request) {
  if (!(await authenticated())) return new Response(null, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const role = params.get("role");
    const cohortId = params.get("cohortId");
    const [workspace, deleted] = await Promise.all([getRecruitmentWorkspaceData(), getDeletedNextPhaseIdentifiers()]);
    const cohort = cohortId ? workspace.cohorts.find(c => c.id === cohortId) : undefined;
    if (cohortId && !cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });
    const members = cohort ? applicationsForCohort(workspace.applications, cohort, workspace.cohorts) : workspace.applications;
    const candidates = members.filter(a => (!role || role === "all" || sameRole(a.role, role)) && isNextPhase(a) && !deleted.includes(a.id) && !deleted.includes(normalizeName(a.name))).sort((a,b) => (b.testScore ?? -1) - (a.testScore ?? -1) || a.name.localeCompare(b.name)).map((a,index) => ({
      id: a.id, seedIndex: index+1, approvedName: a.name, name: a.name, score: a.testScore ?? null,
      email: a.email, phone: normalizePhone(a.whatsapp), isMatched: true, matchedId: a.id,
      nextPhaseStatus: a.nextPhaseStatus || "selected", invitationStatus: a.nextPhaseInvitedAt ? "sent" : "not_sent", invitationSentAt: a.nextPhaseInvitedAt || null,
      candidateResponse: a.nextPhaseResponse === "yes" || a.nextPhaseStatus === "confirmed" ? "confirmed" : a.nextPhaseResponse === "no" || a.nextPhaseStatus === "declined" ? "declined" : a.nextPhaseInvitedAt ? "awaiting" : null,
      responseDate: a.nextPhaseRespondedAt || null, respondedAt: a.nextPhaseRespondedAt || null,
      responseOption: a.nextPhaseResponseOption || null, recruitmentStage: a.status,
      token: a.nextPhaseToken || null,
    }));
    return Response.json({ candidates, summary: { totalSelected: candidates.length, notSent: candidates.filter(c => c.invitationStatus === "not_sent").length, awaiting: candidates.filter(c => c.candidateResponse === "awaiting").length, confirmed: candidates.filter(c => c.candidateResponse === "confirmed").length, declined: candidates.filter(c => c.candidateResponse === "declined").length } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error(error); return Response.json({ error: "Unable to load next phase" }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return new Response(null, { status: 403 });

  try {
    const body = await request.json();
    const action = body.action as
      | "preview"
      | "dispatch"
      | "reconcile"
      | "update_contact"
      | "delete_candidate"
      | "bulk_delete"
      | "delete_candidates"
      | "send_instructions"
      | "generate_token";
    const [workspace, deletedRaw] = await Promise.all([
      getRecruitmentWorkspaceData(),
      getDeletedNextPhaseIdentifiers(),
    ]);
    const cohort = body.cohortId ? workspace.cohorts.find(c => c.id === body.cohortId) : undefined;
    if (body.cohortId && !cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });
    const applications = (cohort ? applicationsForCohort(workspace.applications, cohort, workspace.cohorts) : workspace.applications).filter(a => !body.role || body.role === "all" || sameRole(a.role, body.role));
    const requestedIds = [...(Array.isArray(body.candidateIds) ? body.candidateIds : []), ...(body.candidateId ? [body.candidateId] : []), ...(body.matchedId ? [body.matchedId] : []), ...(Array.isArray(body.candidates) ? body.candidates.flatMap((c: {id: string; matchedId?: string}) => [c.id, ...(c.matchedId ? [c.matchedId] : [])]) : [])];
    if (requestedIds.some(id => !applications.some(a => a.id === id))) return Response.json({ error: "Candidate outside this workspace" }, { status: 400 });
    const deletedIdentifiers = new Set(deletedRaw);
    const isDeleted = (id?: string, name?: string) => {
      if (id && deletedIdentifiers.has(id)) return true;
      if (name) {
        const norm = normalizeName(name);
        if (deletedIdentifiers.has(norm) || deletedIdentifiers.has(name)) return true;
      }
      return false;
    };

    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
    const baseUrl = `${proto}://${host}`;

    if (action === "generate_token") {
      const candidateId = String(body.candidateId || "").trim();
      if (!candidateId) return Response.json({ error: "Candidate ID required" }, { status: 400 });
      let app = applications.find((a) => a.id === candidateId);
      if (!app && candidateId.startsWith("seed_")) {
        const sIdx = parseInt(candidateId.replace("seed_", ""), 10) - 1;
        const seed = APPROVED_NEXT_PHASE_CANDIDATES[sIdx];
        if (seed) {
          const normSeed = normalizeName(seed.name);
          app = applications.find((a) => normalizeName(a.name) === normSeed);
        }
      }
      if (!app) return Response.json({ error: "Candidate not found" }, { status: 404 });
      if (!isNextPhase(app)) return Response.json({ error: "Candidate is not selected for next phase" }, { status: 400 });
      const token = app.nextPhaseToken || crypto.randomBytes(16).toString("hex");
      const updated = await updateApplication(app.id, { nextPhaseToken: token });
      return Response.json({
        success: true,
        token,
        dedicatedLink: `/pt/careers/next-phase/${token}`,
        fullDedicatedUrl: `${baseUrl}/pt/careers/next-phase/${token}`,
        candidate: updated,
      });
    }

    if (action === "delete_candidate") {
      const candidateId = String(body.candidateId || "").trim();
      const candidateName = String(body.candidateName || "").trim();
      const matchedId = String(body.matchedId || "").trim();

      if (!candidateId && !matchedId && !candidateName) {
        return Response.json({ error: "Candidate identifier required" }, { status: 400 });
      }

      const toDeleteFromDb: string[] = [];
      if (matchedId && /^[\da-f-]{36}$/i.test(matchedId)) {
        toDeleteFromDb.push(matchedId);
      }
      if (candidateId && /^[\da-f-]{36}$/i.test(candidateId) && !toDeleteFromDb.includes(candidateId)) {
        toDeleteFromDb.push(candidateId);
      }

      if (toDeleteFromDb.length === 0 && candidateName) {
        const norm = normalizeName(candidateName);
        const match = applications.find((a) => normalizeName(a.name) === norm);
        if (match) toDeleteFromDb.push(match.id);
      }

      if (toDeleteFromDb.length > 0) {
        await deleteApplications(toDeleteFromDb);
      }

      const idsToExclude: string[] = [];
      if (candidateId) idsToExclude.push(candidateId);
      if (matchedId) idsToExclude.push(matchedId);
      if (candidateName) idsToExclude.push(candidateName);
      toDeleteFromDb.forEach((id) => idsToExclude.push(id));

      await addDeletedNextPhaseIdentifiers(idsToExclude);

      return Response.json({
        success: true,
        deletedCandidateId: candidateId,
        purgedApplications: toDeleteFromDb.length,
      });
    }

    if (action === "bulk_delete" || action === "delete_candidates") {
      const candidateIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : [];
      const candidatesList: Array<{ id: string; name?: string; matchedId?: string }> = Array.isArray(body.candidates) ? body.candidates : [];

      const toDeleteFromDb: string[] = [];
      const idsToExclude: string[] = [];

      for (const id of candidateIds) {
        if (/^[\da-f-]{36}$/i.test(id)) toDeleteFromDb.push(id);
        idsToExclude.push(id);
      }

      for (const item of candidatesList) {
        if (item.matchedId && /^[\da-f-]{36}$/i.test(item.matchedId)) toDeleteFromDb.push(item.matchedId);
        if (item.id && /^[\da-f-]{36}$/i.test(item.id)) toDeleteFromDb.push(item.id);
        if (item.id) idsToExclude.push(item.id);
        if (item.matchedId) idsToExclude.push(item.matchedId);
        if (item.name) {
          idsToExclude.push(item.name);
          const norm = normalizeName(item.name);
          const match = applications.find((a) => normalizeName(a.name) === norm);
          if (match && !toDeleteFromDb.includes(match.id)) toDeleteFromDb.push(match.id);
        }
      }

      if (toDeleteFromDb.length > 0) {
        await deleteApplications(Array.from(new Set(toDeleteFromDb)));
      }
      if (idsToExclude.length > 0) {
        await addDeletedNextPhaseIdentifiers(idsToExclude);
      }

      return Response.json({
        success: true,
        count: idsToExclude.length,
        purgedApplications: toDeleteFromDb.length,
      });
    }

    if (action === "update_contact") {
      const candidateId = body.candidateId;
      const cleanEmail = (body.email || "").trim().toLowerCase();
      const cleanPhone = (body.phone || "").trim();
      const cleanName = (body.name || "").trim();

      if (!candidateId) {
        return Response.json({ error: "Candidate ID required" }, { status: 400 });
      }

      let app = applications.find((a) => a.id === candidateId);
      if (!app && candidateId.startsWith("seed_")) {
        const sIdx = parseInt(candidateId.replace("seed_", ""), 10) - 1;
        const seed = APPROVED_NEXT_PHASE_CANDIDATES[sIdx];
        if (seed) {
          const normSeed = normalizeName(seed.name);
          app = applications.find((a) => normalizeName(a.name) === normSeed);
        }
      }

      if (app) {
        const updateData: any = {};
        if (cleanEmail) updateData.email = cleanEmail;
        if (cleanPhone) updateData.whatsapp = cleanPhone;
        if (cleanName) updateData.name = cleanName;
        if (!app.nextPhaseToken) {
          updateData.nextPhaseToken = crypto.randomBytes(16).toString("hex");
        }

        const updated = await updateApplication(app.id, updateData);
        return Response.json({ success: true, candidate: updated });
      } else {
        return Response.json({ error: "Candidate not found" }, { status: 404 });
      }
    }

    if (action === "preview") {
      const previewEmail = (body.previewEmail || process.env.ADMIN_PREVIEW_EMAIL || "").trim();
      if (!previewEmail || !previewEmail.includes("@")) {
        return Response.json({ error: "Valid preview recipient email required" }, { status: 400 });
      }

      let sampleToken = `preview_${crypto.randomBytes(8).toString("hex")}`;
      let candidateName = body.candidateName || APPROVED_NEXT_PHASE_CANDIDATES[0]?.name || "Candidate";
      let candidateScore: number | undefined = APPROVED_NEXT_PHASE_CANDIDATES[0]?.score;

      if (body.candidateId) {
        const matched = applications.find((a) => a.id === body.candidateId);
        if (matched) {
          candidateName = matched.name;
          candidateScore = matched.testScore ?? candidateScore;
          if (matched.nextPhaseToken) sampleToken = matched.nextPhaseToken;
        }
      } else if (body.candidateName) {
        candidateName = body.candidateName;
      }

      const sampleCandidate = {
        id: body.candidateId || "preview_sample",
        name: candidateName,
        email: previewEmail,
        score: candidateScore,
      };

      const res = await sendNextPhaseInvitationEmail({
        candidate: sampleCandidate,
        token: sampleToken,
        baseUrl,
        preview: true,
        recipientEmail: previewEmail,
        customSubject: body.subject,
      });

      return Response.json({
        success: true,
        previewSentTo: previewEmail,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "dispatch") {
      let sentCount = 0;
      let failedCount = 0;
      const results: any[] = [];
      const handledAppIds = new Set<string>();

      const roleParam = body.role ? String(body.role) : undefined;
      const isCctvRole = !roleParam || roleParam === "all" || roleParam === "cctv" || roleParam === "cctv_operator";

      interface DispatchTarget {
        app: Application;
        score?: number;
      }

      const targets: DispatchTarget[] = [];

      for (const app of applications) {
        if (!isDeleted(app.id, app.name) && isNextPhase(app) && !isTerminal(app) && app.email) targets.push({ app, score: app.testScore });
      }

      for (const target of targets) {
        const { app, score } = target;

        // Idempotency: Skip if already invited
        if (app.nextPhaseInvitedAt && app.nextPhaseToken) {
          results.push({ name: app.name, status: "already_sent" });
          continue;
        }

        const token = app.nextPhaseToken || crypto.randomBytes(16).toString("hex");
        const now = new Date().toISOString();

        try {
          await sendNextPhaseInvitationEmail({
            candidate: { id: app.id, name: app.name, email: app.email, score },
            token,
            baseUrl,
            customSubject: body.subject,
          });

          // Update candidate record
          const communications = app.communications || [];
          communications.push({
            id: crypto.randomUUID(),
            type: "next_phase_invite",
            subject: body.subject || "Próxima Fase – Processo de Selecção Overwatch",
            recipient: app.email,
            sentAt: now,
            status: "sent",
            sender: "Overwatch Recrutamento",
          });

          const activityLog = app.activityLog || [];
          activityLog.push({
            id: crypto.randomUUID(),
            timestamp: now,
            action: "Next Phase Invitation Dispatched",
            actor: "Admin",
            details: `Dispatched official next-phase conditions notice (Score: ${score ?? "N/A"})`,
          });

          await updateApplication(app.id, {
            testScore: score ?? app.testScore,
            nextPhaseStatus: "invited",
            nextPhaseToken: token,
            nextPhaseInvitedAt: now,
            status: "next_phase_invited",
            communications,
            activityLog,
          });

          sentCount++;
          results.push({ name: app.name, email: app.email, status: "sent" });
        } catch (err: any) {
          failedCount++;
          results.push({ name: app.name, email: app.email, status: "failed", error: err.message });
        }

        // Rate limiting throttle between provider API dispatches
        await new Promise((r) => setTimeout(r, 120));
      }

      return Response.json({
        success: true,
        sentCount,
        failedCount,
        results,
      });
    }

    if (action === "send_instructions") {
      const candidateIds: string[] = Array.isArray(body.candidateIds)
        ? body.candidateIds
        : body.candidateId
        ? [body.candidateId]
        : [];
      const subject = body.subject || "Instruções da Próxima Fase – Processo de Selecção Overwatch";
      const message = body.message || "";
      const isPreview = Boolean(body.preview);
      const previewEmail = (body.previewEmail || "").trim();
      const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
      const attachments = rawAttachments
        .filter((a: any) => a && (a.content || a.data))
        .map((a: any) => ({
          name: String(a.name || "document.pdf"),
          content: String(a.content || a.data || ""),
        }));

      if (!message.trim()) {
        return Response.json({ error: "Instructions message body is required" }, { status: 400 });
      }

      const substituteVars = (text: string, vars: Record<string, string>) => {
        let res = text;
        for (const [key, val] of Object.entries(vars)) {
          // Replace both {{key}} and {key} case-insensitively with flexible whitespace
          const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}\\}?`, "gi");
          res = res.replace(regex, val || "");
        }
        return res;
      };

      if (isPreview) {
        if (!previewEmail || !previewEmail.includes("@")) {
          return Response.json({ error: "Valid preview email address required" }, { status: 400 });
        }

        const sampleTarget =
          applications.find((a) => candidateIds.includes(a.id)) ||
          applications.find((a) => a.role === "cctv" || !a.role) || {
            id: "preview-id",
            name: "Candidata Modelo",
            email: previewEmail,
            role: "cctv",
            testSlot: "Turma A (09:00 - 11:00)",
          };

        const previewVars: Record<string, string> = {
          name: sampleTarget.name,
          candidate_name: sampleTarget.name,
          role: "Operadora de CCO",
          role_title: "Operadora de CCO",
          slot: (sampleTarget as any).testSlot || "Turma A (09:00 - 11:00)",
          date: new Date().toLocaleDateString("pt-MZ"),
          location: "Av. Paulo Samuel Khankhomba, N.º 1948, Maputo",
          company: "Overwatch Lda.",
          email: previewEmail,
        };

        const personalizedMessage = substituteVars(message, previewVars);
        const personalizedSubject = substituteVars(subject, previewVars);

        await sendNextPhaseInstructionsEmail({
          candidate: { name: sampleTarget.name, email: previewEmail },
          instructions: personalizedMessage,
          baseUrl,
          customSubject: personalizedSubject,
          preview: true,
          recipientEmail: previewEmail,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        return Response.json({
          success: true,
          previewSentTo: previewEmail,
          timestamp: new Date().toISOString(),
        });
      }

      if (candidateIds.length === 0) {
        return Response.json({ error: "At least one recipient candidate is required" }, { status: 400 });
      }

      let sentCount = 0;
      let failedCount = 0;
      const results: any[] = [];
      const now = new Date().toISOString();

      for (const id of [...new Set(candidateIds)]) {
        const app = applications.find((a) => a.id === id);
        if (!app || !app.email) {
          failedCount++;
          results.push({ id, name: app?.name || "Unknown", status: "skipped_no_email" });
          continue;
        }

        const roleName =
          app.role === "cctv" || app.role === "cctv_operator" || !app.role
            ? "Operadora de CCO"
            : app.role === "cctv_technical_manager"
            ? "Gestor Técnico de CCTV"
            : app.role;

        const candidateVars: Record<string, string> = {
          name: app.name,
          candidate_name: app.name,
          token: app.nextPhaseToken || "",
          role: roleName,
          role_title: roleName,
          slot: app.testSlot || "",
          date: new Date().toLocaleDateString("pt-MZ"),
          location: "Av. Paulo Samuel Khankhomba, N.º 1948, Maputo",
          company: "Overwatch Lda.",
          email: app.email,
        };

        const personalizedMessage = substituteVars(message, candidateVars);
        const personalizedSubject = substituteVars(subject, candidateVars);

        try {
          await sendNextPhaseInstructionsEmail({
            candidate: { id: app.id, name: app.name, email: app.email, score: app.testScore, role: roleName },
            instructions: personalizedMessage,
            baseUrl,
            customSubject: personalizedSubject,
            attachments: attachments.length > 0 ? attachments : undefined,
          });

          const communications = app.communications || [];
          communications.push({
            id: crypto.randomUUID(),
            type: "custom",
            subject: personalizedSubject,
            recipient: app.email,
            sentAt: now,
            status: "sent",
            sender: "Overwatch Recrutamento",
          });

          const activityLog = (app as any).activityLog || [];
          activityLog.push({
            id: crypto.randomUUID(),
            timestamp: now,
            action: "Next Phase Further Instructions Dispatched",
            actor: "Admin",
            details: `Dispatched operational onboarding/training instructions ("${personalizedSubject}")`,
          });

          await updateApplication(app.id, {
            communications,
            activityLog,
            instructionsSentAt: now,
          } as any);

          sentCount++;
          results.push({ id: app.id, name: app.name, email: app.email, status: "sent" });
        } catch (err: any) {
          failedCount++;
          results.push({ id: app.id, name: app.name, email: app.email, status: "failed", error: err.message });
        }

        // Rate limiting throttle between provider API dispatches
        await new Promise((r) => setTimeout(r, 120));
      }

      return Response.json({
        success: true,
        sentCount,
        failedCount,
        results,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Next-phase POST error:", err);
    return Response.json({ error: err.message || "Next phase action failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const body = await request.json();
    const candidateId = String(body.candidateId || body.id || "").trim();
    const candidateName = String(body.candidateName || body.name || "").trim();
    const matchedId = String(body.matchedId || "").trim();
    const applications = await getApplications();

    const toDeleteFromDb: string[] = [];
    if (matchedId && /^[\da-f-]{36}$/i.test(matchedId)) toDeleteFromDb.push(matchedId);
    if (candidateId && /^[\da-f-]{36}$/i.test(candidateId) && !toDeleteFromDb.includes(candidateId)) {
      toDeleteFromDb.push(candidateId);
    }
    if (toDeleteFromDb.length === 0 && candidateName) {
      const norm = normalizeName(candidateName);
      const match = applications.find((a) => normalizeName(a.name) === norm);
      if (match) toDeleteFromDb.push(match.id);
    }
    if (toDeleteFromDb.length > 0) {
      await deleteApplications(toDeleteFromDb);
    }

    const idsToExclude: string[] = [];
    if (candidateId) idsToExclude.push(candidateId);
    if (matchedId) idsToExclude.push(matchedId);
    if (candidateName) idsToExclude.push(candidateName);
    toDeleteFromDb.forEach((id) => idsToExclude.push(id));

    await addDeletedNextPhaseIdentifiers(idsToExclude);

    return Response.json({ success: true, purgedApplications: toDeleteFromDb.length });
  } catch (err: any) {
    console.error("Next-phase DELETE error:", err);
    return Response.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}

