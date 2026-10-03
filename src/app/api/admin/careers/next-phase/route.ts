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
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    const [allApplications, deletedRaw] = await Promise.all([
      getApplications(),
      getDeletedNextPhaseIdentifiers(),
    ]);
    const deletedIdentifiers = new Set(deletedRaw);

    // Filter applications by role if specified
    const applications = allApplications.filter((a) => {
      if (!roleParam || roleParam === "all") return true;
      if (roleParam === "cctv" || roleParam === "cctv_operator") {
        return !a.role || a.role === "cctv" || a.role === "cctv_operator";
      }
      return a.role === roleParam;
    });

    const isCctvRole = !roleParam || roleParam === "all" || roleParam === "cctv" || roleParam === "cctv_operator";

    const isDeleted = (id?: string, name?: string) => {
      if (id && deletedIdentifiers.has(id)) return true;
      if (name) {
        const norm = normalizeName(name);
        if (deletedIdentifiers.has(norm) || deletedIdentifiers.has(name)) return true;
      }
      return false;
    };

    const matchedAppIds = new Set<string>();

    // Map each of the approved seed candidates to their live application record if in CCTV role workspace
    const activeSeeds = isCctvRole
      ? APPROVED_NEXT_PHASE_CANDIDATES.filter((seed, index) => {
          if (seed.matchedId && isDeleted(seed.matchedId, seed.name)) return false;
          if (isDeleted(`seed_${index + 1}`, seed.name)) return false;
          if (isDeleted(undefined, seed.name)) return false;
          return true;
        })
      : [];

    const seededCandidates = await Promise.all(
      activeSeeds.map(async (seed, index) => {
        let matchedApp: Application | undefined;

        if (seed.matchedId) {
          matchedApp = applications.find((a) => a.id === seed.matchedId);
        }

        if (!matchedApp) {
          const normSeed = normalizeName(seed.name);
          matchedApp = applications.find((a) => {
            const normApp = normalizeName(a.name);
            return normApp === normSeed || normApp.includes(normSeed) || normSeed.includes(normApp);
          });
        }

        if (!matchedApp) {
          return null;
        }

        matchedAppIds.add(matchedApp.id);

        // Ensure token exists on candidate record so live links are 100% stable
        let token = matchedApp.nextPhaseToken;
        if (!token) {
          token = crypto.randomBytes(16).toString("hex");
          await updateApplication(matchedApp.id, { nextPhaseToken: token });
        }

        const id = matchedApp.id;
        const name = matchedApp.name;
        const email = matchedApp.email || "";
        const phone = normalizePhone(matchedApp.whatsapp);
        const score = matchedApp?.testScore ?? seed.score;
        const nextPhaseStatus = matchedApp?.nextPhaseStatus || "selected";
        const invitationStatus: "not_sent" | "sent" = matchedApp?.nextPhaseInvitedAt ? "sent" : "not_sent";
        const invitationSentAt = matchedApp?.nextPhaseInvitedAt || null;
        const candidateResponse: "confirmed" | "declined" | "awaiting" | null = matchedApp?.nextPhaseResponse === "yes"
          ? "confirmed"
          : matchedApp?.nextPhaseResponse === "no"
            ? "declined"
            : invitationStatus === "sent"
              ? "awaiting"
              : null;
        const responseDate = matchedApp?.nextPhaseRespondedAt || null;
        const recruitmentStage = matchedApp?.status || (matchedApp ? "shortlisted" : "selected");
        const responseOption = matchedApp?.nextPhaseResponse === "yes"
          ? (matchedApp.nextPhaseResponseOption || "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.")
          : matchedApp?.nextPhaseResponse === "no"
            ? (matchedApp.nextPhaseResponseOption || "Não tenho interesse")
            : null;

        return {
          id,
          seedIndex: index + 1,
          approvedName: seed.name,
          name,
          score,
          email,
          phone,
          isMatched: Boolean(matchedApp),
          matchedId: matchedApp?.id,
          nextPhaseStatus,
          invitationStatus,
          invitationSentAt,
          candidateResponse,
          responseDate,
          respondedAt: responseDate,
          responseOption,
          recruitmentStage,
          token: token || `cand_${index + 1}_${seed.score}`,
        };
      })
    );

    // Also include any other applications explicitly moved to next phase that were not in the seed roster
    const additionalApps = applications.filter((a) => {
      if (matchedAppIds.has(a.id)) return false;
      if (isDeleted(a.id, a.name)) return false;
      if (a.status === "archived" || a.status === "rejected") return false;
      return (
        a.status === "next_phase_selected" ||
        a.status === "next_phase_invited" ||
        a.status === "awaiting_response" ||
        a.status === "interest_confirmed" ||
        a.status === "interest_declined" ||
        a.nextPhaseStatus === "selected" ||
        a.nextPhaseStatus === "invited" ||
        a.nextPhaseStatus === "confirmed" ||
        a.nextPhaseStatus === "declined"
      );
    });

    const additionalCandidates = await Promise.all(
      additionalApps.map(async (app, idx) => {
        let token = app.nextPhaseToken;
        if (!token) {
          token = crypto.randomBytes(16).toString("hex");
          await updateApplication(app.id, { nextPhaseToken: token });
        }

        const invitationStatus: "not_sent" | "sent" = app.nextPhaseInvitedAt ? "sent" : "not_sent";
        const candidateResponse: "confirmed" | "declined" | "awaiting" | null = app.nextPhaseResponse === "yes"
          ? "confirmed"
          : app.nextPhaseResponse === "no"
            ? "declined"
            : invitationStatus === "sent"
              ? "awaiting"
              : null;

        return {
          id: app.id,
          seedIndex: seededCandidates.length + idx + 1,
          approvedName: app.name,
          name: app.name,
          score: app.testScore ?? 0,
          email: app.email || "",
          phone: normalizePhone(app.whatsapp),
          isMatched: true,
          matchedId: app.id,
          nextPhaseStatus: app.nextPhaseStatus || "selected",
          invitationStatus,
          invitationSentAt: app.nextPhaseInvitedAt || null,
          candidateResponse,
          responseDate: app.nextPhaseRespondedAt || null,
          respondedAt: app.nextPhaseRespondedAt || null,
          responseOption: app.nextPhaseResponse === "yes"
            ? (app.nextPhaseResponseOption || "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.")
            : app.nextPhaseResponse === "no"
              ? (app.nextPhaseResponseOption || "Não tenho interesse")
              : null,
          recruitmentStage: app.status || "next_phase_selected",
          token,
        };
      })
    );

    const candidates = [...(seededCandidates.filter(Boolean) as any[]), ...additionalCandidates].map((cand, idx) => ({
      ...cand,
      seedIndex: idx + 1,
    }));

    const summary = {
      totalSelected: candidates.length,
      notSent: candidates.filter((c) => c.invitationStatus === "not_sent").length,
      awaiting: candidates.filter((c) => c.invitationStatus === "sent" && c.candidateResponse === "awaiting").length,
      confirmed: candidates.filter((c) => c.candidateResponse === "confirmed").length,
      declined: candidates.filter((c) => c.candidateResponse === "declined").length,
    };

    return Response.json({ candidates, summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("Next-phase GET error:", err);
    return Response.json({ error: "Failed to load next phase data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return new Response(null, { status: 403 });

  try {
    const body = await request.json();
    const action = body.action as "preview" | "dispatch" | "reconcile" | "update_contact" | "delete_candidate" | "bulk_delete" | "delete_candidates" | "send_instructions";
    const [applications, deletedRaw] = await Promise.all([
      getApplications(),
      getDeletedNextPhaseIdentifiers(),
    ]);
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
        const { saveApplication } = await import("@/lib/careers-store");
        const token = crypto.randomBytes(16).toString("hex");
        const newApp: Application = {
          id: candidateId.startsWith("seed_") ? crypto.randomUUID() : candidateId,
          createdAt: new Date().toISOString(),
          name: cleanName || "Candidate",
          email: cleanEmail,
          whatsapp: cleanPhone,
          role: "cco-operator-maputo",
          locale: "pt",
          grade12: "yes",
          sex: "female",
          ai: "no",
          experience: "yes",
          lastProfession: "Operadora CCO",
          shifts: "yes",
          cvName: "assessment.pdf",
          cvType: "application/pdf",
          cvSize: 1024,
          status: "shortlisted",
          testScore: body.score || 86,
          nextPhaseStatus: "selected",
          nextPhaseToken: token,
        };
        await saveApplication(newApp, Buffer.from(""));
        return Response.json({ success: true, candidate: newApp });
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

      if (isCctvRole) {
        for (const seed of APPROVED_NEXT_PHASE_CANDIDATES) {
          if (seed.matchedId && isDeleted(seed.matchedId, seed.name)) continue;
          if (isDeleted(undefined, seed.name)) continue;

          let app: Application | undefined;
          if (seed.matchedId) {
            app = applications.find((a) => a.id === seed.matchedId);
          }
          if (!app) {
            const normSeed = normalizeName(seed.name);
            app = applications.find((a) => normalizeName(a.name) === normSeed);
          }

          if (!app || !app.email) {
            failedCount++;
            results.push({ name: seed.name, status: "skipped_no_email" });
            continue;
          }

          handledAppIds.add(app.id);
          targets.push({ app, score: seed.score });
        }
      }

      // Also dispatch to any other dynamically added Next Phase applicants matching role
      for (const a of applications) {
        if (handledAppIds.has(a.id)) continue;
        if (isDeleted(a.id, a.name)) continue;
        if (a.status === "archived" || a.status === "rejected") continue;
        if (roleParam && roleParam !== "all" && a.role !== roleParam) continue;

        const isNextPhase =
          a.status === "next_phase_selected" ||
          a.status === "next_phase_invited" ||
          a.status === "awaiting_response" ||
          a.status === "interest_confirmed" ||
          a.status === "interest_declined" ||
          a.nextPhaseStatus === "selected" ||
          a.nextPhaseStatus === "invited" ||
          a.nextPhaseStatus === "confirmed" ||
          a.nextPhaseStatus === "declined";

        if (isNextPhase && a.email) {
          handledAppIds.add(a.id);
          targets.push({ app: a, score: a.testScore });
        }
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

      if (!message.trim()) {
        return Response.json({ error: "Instructions message body is required" }, { status: 400 });
      }

      if (isPreview) {
        if (!previewEmail || !previewEmail.includes("@")) {
          return Response.json({ error: "Valid preview email address required" }, { status: 400 });
        }

        const sampleTarget =
          applications.find((a) => candidateIds.includes(a.id)) ||
          applications.find((a) => a.role === "cctv" || !a.role) || {
            name: "Candidata Modelo",
            email: previewEmail,
          };

        const personalizedMessage = message.replace(/\{name\}/gi, sampleTarget.name);

        await sendNextPhaseInstructionsEmail({
          candidate: { name: sampleTarget.name, email: previewEmail },
          instructions: personalizedMessage,
          baseUrl,
          customSubject: subject,
          preview: true,
          recipientEmail: previewEmail,
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

      for (const id of candidateIds) {
        const app = applications.find((a) => a.id === id);
        if (!app || !app.email) {
          failedCount++;
          results.push({ id, name: app?.name || "Unknown", status: "skipped_no_email" });
          continue;
        }

        const personalizedMessage = message
          .replace(/\{name\}/gi, app.name)
          .replace(/\{token\}/gi, app.nextPhaseToken || "")
          .replace(/\{role\}/gi, "Operadora de CCO");

        try {
          await sendNextPhaseInstructionsEmail({
            candidate: { id: app.id, name: app.name, email: app.email, score: app.testScore },
            instructions: personalizedMessage,
            baseUrl,
            customSubject: subject,
          });

          const communications = app.communications || [];
          communications.push({
            id: crypto.randomUUID(),
            type: "custom",
            subject,
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
            details: `Dispatched operational onboarding/training instructions ("${subject}")`,
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

