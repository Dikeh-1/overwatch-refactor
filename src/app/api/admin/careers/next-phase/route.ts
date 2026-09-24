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
    const candidates = APPROVED_NEXT_PHASE_15.map((seed, index) => {
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

      const id = matchedApp ? matchedApp.id : `seed_${index + 1}`;
      const name = matchedApp ? matchedApp.name : seed.name;
      const email = matchedApp ? matchedApp.email : "";
      const phone = matchedApp ? normalizePhone(matchedApp.whatsapp) : "";
      const score = matchedApp?.testScore ?? seed.score;
      const nextPhaseStatus = matchedApp?.nextPhaseStatus || "selected";
      const invitationStatus = matchedApp?.nextPhaseInvitedAt ? "sent" : "not_sent";
      const candidateResponse = matchedApp?.nextPhaseResponse === "yes"
        ? "confirmed"
        : matchedApp?.nextPhaseResponse === "no"
          ? "declined"
          : "awaiting";
      const responseDate = matchedApp?.nextPhaseRespondedAt || null;

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
        candidateResponse,
        responseDate,
        token: matchedApp?.nextPhaseToken,
      };
    });

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
    const action = body.action as "preview" | "dispatch" | "reconcile";
    const applications = await getApplications();

    if (action === "preview") {
      const previewEmail = (body.previewEmail || process.env.ADMIN_PREVIEW_EMAIL || "").trim();
      if (!previewEmail || !previewEmail.includes("@")) {
        return Response.json({ error: "Valid preview recipient email required" }, { status: 400 });
      }

      // Generate a sample preview token
      const sampleToken = `preview_${crypto.randomBytes(8).toString("hex")}`;
      const sampleCandidate = {
        id: "preview_sample",
        name: APPROVED_NEXT_PHASE_15[0].name,
        email: previewEmail,
      };

      const res = await sendNextPhaseInvitationEmail({
        candidate: sampleCandidate,
        token: sampleToken,
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

        const token = crypto.randomBytes(16).toString("hex");
        const now = new Date().toISOString();

        try {
          await sendNextPhaseInvitationEmail({
            candidate: { id: app.id, name: app.name, email: app.email },
            token,
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
