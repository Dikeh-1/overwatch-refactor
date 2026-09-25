import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { APPROVED_NEXT_PHASE_15, Application, normalizePhone } from "@/lib/careers";
import { sendNextPhaseInvitationEmail } from "@/lib/careers-email";
import crypto from "node:crypto";

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export async function GET() {
  if (!(await authenticated())) return new Response(null, { status: 401 });

  try {
    const applications = await getApplications();

    // Map each of the 15 approved candidates to their live application record
    const candidates = await Promise.all(
      APPROVED_NEXT_PHASE_15.map(async (seed, index) => {
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

        // Ensure token exists on candidate record so live links are 100% stable
        let token = matchedApp?.nextPhaseToken;
        if (matchedApp && !token) {
          token = crypto.randomBytes(16).toString("hex");
          await updateApplication(matchedApp.id, { nextPhaseToken: token });
        }

        const id = matchedApp ? matchedApp.id : `seed_${index + 1}`;
        const name = matchedApp ? matchedApp.name : seed.name;
        const email = matchedApp ? matchedApp.email : "";
        const phone = matchedApp ? normalizePhone(matchedApp.whatsapp) : "";
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
    const action = body.action as "preview" | "dispatch" | "reconcile" | "update_contact";
    const applications = await getApplications();

    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
    const baseUrl = `${proto}://${host}`;

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
        const seed = APPROVED_NEXT_PHASE_15[sIdx];
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
      let candidateName = APPROVED_NEXT_PHASE_15[0].name;

      if (body.candidateId) {
        const matched = applications.find((a) => a.id === body.candidateId);
        if (matched) {
          candidateName = matched.name;
          if (matched.nextPhaseToken) sampleToken = matched.nextPhaseToken;
        }
      } else if (body.candidateName) {
        candidateName = body.candidateName;
      }

      const sampleCandidate = {
        id: body.candidateId || "preview_sample",
        name: candidateName,
        email: previewEmail,
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

      for (const seed of APPROVED_NEXT_PHASE_15) {
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

        // Idempotency: Skip if already invited
        if (app.nextPhaseInvitedAt && app.nextPhaseToken) {
          results.push({ name: app.name, status: "already_sent" });
          continue;
        }

        const token = app.nextPhaseToken || crypto.randomBytes(16).toString("hex");
        const now = new Date().toISOString();

        try {
          await sendNextPhaseInvitationEmail({
            candidate: { id: app.id, name: app.name, email: app.email },
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
            details: `Dispatched official next-phase conditions notice (Score: ${seed.score})`,
          });

          await updateApplication(app.id, {
            testScore: seed.score,
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

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Next-phase POST error:", err);
    return Response.json({ error: err.message || "Next phase action failed" }, { status: 500 });
  }
}
