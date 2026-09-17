import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications, getApplication, updateApplication, getTestSlots } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS, type Application } from "@/lib/careers";
import { sendRebookingGraceEmail } from "@/lib/careers-email";

export const dynamic = "force-dynamic";

/** Helper to check if a slot corresponds to a past date */
function isPastSlot(slot: string): boolean {
  if (!slot) return false;
  // Slots on 16, 17, or 18 September 2026 are considered past/current week
  if (slot.includes("16 de Setembro") || slot.includes("17 de Setembro") || slot.includes("18 de Setembro")) {
    return true;
  }
  return false;
}

export async function GET() {
  if (!(await authenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const allApps = await getApplications();
    const activeSlots = await getTestSlots();

    // Only future open slots (Sept 21-25)
    const openFutureSlots = activeSlots.filter((s) => !isPastSlot(s));
    const effectiveSlots = openFutureSlots.length > 0 ? openFutureSlots : [...DEFAULT_TEST_SLOTS];

    // Compute slot stats for future dates
    const slotStats: Record<string, { booked: number; max: number; isFull: boolean; remaining: number }> = {};
    for (const s of effectiveSlots) {
      const booked = allApps.filter(
        (a) => a.testSlot === s && a.status !== "rejected" && a.status !== "archived"
      ).length;
      slotStats[s] = {
        booked,
        max: 10,
        isFull: booked >= 10,
        remaining: Math.max(0, 10 - booked),
      };
    }

    // Categorize candidates
    const missedCandidates = allApps.filter((a) => {
      // Exclude archived/rejected/Inocio
      if (a.status === "archived" || a.status === "rejected") return false;
      if (a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" || a.email?.toLowerCase() === "inociowilson7@gmail.com") return false;

      // Candidates who already successfully rebooked
      const isRebooked =
        Boolean(a.rebookingGrace?.usedAt) ||
        (Boolean(a.previousTestSlot) && Boolean(a.testSlot) && a.testSlot !== a.previousTestSlot && !isPastSlot(a.testSlot || ""));
      if (isRebooked) return false;

      // Has booked a past slot and did not attend
      const wasBookedPast = a.testSlot && isPastSlot(a.testSlot);
      const notAttended = !a.attendedAt;
      const hasUnusedGrace = a.rebookingGrace && !a.rebookingGrace.usedAt;

      return (wasBookedPast && notAttended) || hasUnusedGrace;
    });

    const activeGraceCandidates = allApps.filter(
      (a) => a.rebookingGrace && !a.rebookingGrace.usedAt
    );

    const rebookedCandidates = allApps.filter(
      (a) =>
        Boolean(a.rebookingGrace?.usedAt) ||
        (Boolean(a.previousTestSlot) && Boolean(a.testSlot) && a.testSlot !== a.previousTestSlot)
    );

    return Response.json({
      success: true,
      openSlots: effectiveSlots,
      slotStats,
      counts: {
        totalApplications: allApps.length,
        missed: missedCandidates.length,
        activeGrace: activeGraceCandidates.length,
        rebooked: rebookedCandidates.length,
      },
      missedCandidates,
      activeGraceCandidates,
      rebookedCandidates,
    });
  } catch (error) {
    console.error("Rebooking grace GET error:", error);
    return Response.json(
      { error: "Falha ao carregar dados de reagendamento." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const action = body.action || "grant_single";
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // ─── ACTION 1: GRANT SINGLE CANDIDATE ───────────────────────────
    if (action === "grant_single") {
      const { candidateId, sendEmail = true, reason } = body;

      if (!candidateId) {
        return Response.json({ error: "ID de candidatura obrigatório." }, { status: 400 });
      }

      const candidate = await getApplication(candidateId);
      if (!candidate) {
        return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });
      }

      // Single-use safeguard: If candidate has already completed their grace rebooking, block reissuing
      if (candidate.rebookingGrace?.usedAt && !body.force) {
        return Response.json(
          {
            error: "Este candidato já concluiu o seu reagendamento de uso único (OTL) e tem o turno confirmado. Não pode ser reemitido outro OTL.",
            alreadyCompleted: true,
            usedAt: candidate.rebookingGrace.usedAt,
            currentSlot: candidate.testSlot,
          },
          { status: 400 }
        );
      }

      const token = crypto.randomUUID();
      const grantedAt = new Date().toISOString();
      const previousSlot = candidate.testSlot || candidate.previousTestSlot || undefined;

      const graceData: NonNullable<Application["rebookingGrace"]> = {
        token,
        grantedAt,
        previousSlot,
        reason: reason || "Dificuldade de localização do edifício",
        usedAt: null,
      };

      let emailSent = false;
      let emailError: string | null = null;

      if (sendEmail) {
        try {
          const emailRes = await sendRebookingGraceEmail({
            application: candidate,
            token,
            previousSlot,
            baseUrl: origin,
          });
          if (emailRes && emailRes.success) {
            emailSent = true;
            graceData.emailSentAt = new Date().toISOString();
          }
        } catch (err) {
          console.error("Failed to send rebooking grace email:", err);
          emailError = (err as Error).message;
        }
      }

      const updated = await updateApplication(candidate.id, {
        rebookingGrace: graceData,
      });

      const otlUrl = `${origin}/pt/careers/test-invite/${updated.id}?otl=${encodeURIComponent(token)}`;

      return Response.json({
        success: true,
        candidateId: updated.id,
        candidateName: updated.name,
        token,
        otlUrl,
        emailSent,
        emailError,
        candidate: updated,
      });
    }

    // ─── ACTION 2: GRANT BULK CANDIDATES ─────────────────────────────
    if (action === "grant_bulk") {
      const candidateIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : [];
      const sendEmail: boolean = body.sendEmail !== false;
      const reason: string = body.reason || "Reagendamento excepcional em lote";

      if (candidateIds.length === 0) {
        return Response.json({ error: "Nenhum candidato seleccionado." }, { status: 400 });
      }

      const results: {
        id: string;
        name: string;
        success: boolean;
        otlUrl?: string;
        emailSent?: boolean;
        error?: string;
      }[] = [];

      for (const id of candidateIds) {
        try {
          const candidate = await getApplication(id);
          if (!candidate) {
            results.push({ id, name: id, success: false, error: "Não encontrado" });
            continue;
          }

          // Skip Inocio Wilson
          if (candidate.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" || candidate.email?.toLowerCase() === "inociowilson7@gmail.com") {
            continue;
          }

          // Skip candidates who have already completed their grace rebooking
          if (candidate.rebookingGrace?.usedAt) {
            results.push({
              id,
              name: candidate.name,
              success: false,
              error: "Reagendamento já concluído anteriormente",
            });
            continue;
          }

          const token = crypto.randomUUID();
          const grantedAt = new Date().toISOString();
          const previousSlot = candidate.testSlot || candidate.previousTestSlot || undefined;

          const graceData: NonNullable<Application["rebookingGrace"]> = {
            token,
            grantedAt,
            previousSlot,
            reason,
            usedAt: null,
          };

          let emailSent = false;
          if (sendEmail) {
            try {
              const res = await sendRebookingGraceEmail({
                application: candidate,
                token,
                previousSlot,
                baseUrl: origin,
              });
              if (res && res.success) {
                emailSent = true;
                graceData.emailSentAt = new Date().toISOString();
              }
            } catch (emailErr) {
              console.warn(`Bulk rebooking email failed for ${candidate.name}:`, emailErr);
            }
          }

          const updated = await updateApplication(candidate.id, {
            rebookingGrace: graceData,
          });

          const otlUrl = `${origin}/pt/careers/test-invite/${updated.id}?otl=${encodeURIComponent(token)}`;
          results.push({
            id: updated.id,
            name: updated.name,
            success: true,
            otlUrl,
            emailSent,
          });

          // Pacing between emails
          if (sendEmail) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        } catch (err) {
          results.push({ id, name: id, success: false, error: (err as Error).message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return Response.json({
        success: true,
        total: candidateIds.length,
        processed: successCount,
        results,
      });
    }

    // ─── ACTION 3: REVOKE GRACE ──────────────────────────────────────
    if (action === "revoke") {
      const { candidateId } = body;
      if (!candidateId) {
        return Response.json({ error: "ID de candidatura obrigatório." }, { status: 400 });
      }
      const candidate = await getApplication(candidateId);
      if (!candidate) {
        return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });
      }

      const updated = await updateApplication(candidate.id, {
        rebookingGrace: undefined,
      });

      return Response.json({
        success: true,
        candidateId: updated.id,
        message: "Período de graça revogado com sucesso.",
        candidate: updated,
      });
    }

    return Response.json({ error: `Acção inválida: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Rebooking grace POST error:", error);
    return Response.json(
      { error: "Falha ao processar reagendamento de graça." },
      { status: 500 },
    );
  }
}
