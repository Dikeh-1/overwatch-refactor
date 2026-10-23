import { bookingFollowUp } from "@/lib/communication-delivery";
import { after } from "next/server";
import { sameBookingScope, getQuotaForSlot } from "@/lib/careers-booking-rules";
import { auditRequest } from "@/lib/admin-activity";
import { resolveApplication, isTerminal } from "@/lib/careers-workflow";
import { getCandidateSlotConfig, reserveTestSlot } from "@/lib/careers-booking";
import { getApplication, updateApplication, getTestSlotConfig, getApplications } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS, normalizeSlot, isPastDateSlot } from "@/lib/careers";
import { sendBookingConfirmation } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEACTIVATED_STATUSES = ["archived", "rejected"] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || typeof id !== "string" || !/^[\w-]{6,64}$/i.test(id.trim())) {
      return Response.json(
        { error: "Identificador de candidatura inválido." },
        { status: 400 },
      );
    }

    const raw = await getApplication(id);
    const candidate = raw ? resolveApplication(raw) : null;
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Block booking link if candidate status is deactivated or archived
    if (isTerminal(candidate)) {
      return Response.json(
        {
          error: "Este link de convocatória foi desactivado.",
          deactivated: true,
          reason: "A candidatura foi arquivada ou excluída do processo de selecção.",
        },
        { status: 410 },
      );
    }

    if (!candidate.invitedAt && !candidate.testSlot && candidate.status !== "test_invited") return Response.json({ error: "This applicant has not received a test invitation.", code: "INVITATION_REQUIRED" }, { status: 403 });
    if (!candidate.bookingLinkOpenedAt) await updateApplication(candidate.id, { bookingLinkOpenedAt: new Date().toISOString() });

    const allApps = await getApplications(true);
    const { slots: activeSlots, quota = 15, slotQuotas = {} } = await getCandidateSlotConfig(candidate);
    const hasActiveGrace = Boolean(candidate.rebookingGrace && !candidate.rebookingGrace.usedAt);

    // Filter available candidate booking slots:
    // If candidate has not booked yet or is using Grace OTL, only provide future open slots.
    // If all configured slots are in the past, fallback to DEFAULT_TEST_SLOTS filtered for future.
    const candidateSlots = activeSlots.filter(s => !isPastDateSlot(s));

    const slotStats: Record<string, { booked: number; max: number; isFull: boolean; remaining: number; isPast: boolean }> = {};
    for (const s of candidateSlots) {
      const normS = normalizeSlot(s);
      const maxPerDay = getQuotaForSlot(s, quota, slotQuotas);
      const isPast = isPastDateSlot(s);
      const booked = allApps.filter(
        (a) => sameBookingScope(a, candidate) && normalizeSlot(a.testSlot) === normS && !isTerminal(resolveApplication(a)) && a.id !== candidate.id
      ).length;
      const isFull = isPast || booked >= maxPerDay;
      slotStats[s] = {
        booked,
        max: maxPerDay,
        isFull,
        isPast,
        remaining: isPast ? 0 : Math.max(0, maxPerDay - booked),
      };
    }

    return Response.json(
      {
        id: candidate.id,
        name: candidate.name,
        role: candidate.role,
        testSlot: hasActiveGrace ? null : candidate.testSlot || null,
        previousTestSlot: candidate.rebookingGrace?.previousSlot || candidate.testSlot || null,
        rebookingGraceActive: hasActiveGrace,
        rebookingGrace: candidate.rebookingGrace || null,
        testBookedAt: candidate.testBookedAt || null,
        invitedAt: candidate.invitedAt || null,
        slots: candidateSlots,
        slotStats,
        windowFilledNotice: !candidate.testSlot,
        attendedAt: candidate.attendedAt || null,
        attendanceStatus: candidate.attendanceStatus || null,
        address: siteContact.address.pt,
        whatsapp: siteContact.whatsappNumber,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Test booking GET error:", error);
    return Response.json(
      { error: "Erro ao carregar detalhes da convocatória." },
      { status: 500 },
    );
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { id, slot } = body;

    if (!id || typeof id !== "string" || !/^[\w-]{6,64}$/i.test(id.trim())) {
      return Response.json(
        { error: "Identificador de candidatura inválido." },
        { status: 400 },
      );
    }

    if (!slot || typeof slot !== "string" || !slot.trim()) {
      return Response.json(
        { error: "Por favor selecione uma data válida para o teste." },
        { status: 400 },
      );
    }

    const raw = await getApplication(id);
    const candidate = raw ? resolveApplication(raw) : null;
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Block booking for deactivated or archived candidates
    if (isTerminal(candidate)) {
      return Response.json(
        {
          error: "Este link de agendamento foi desactivado. Contacte o departamento de RH para mais informações.",
          deactivated: true,
        },
        { status: 410 },
      );
    }

    // Single-use booking safeguard: block repeat booking unless active rebooking grace was authorized
    const hasActiveGrace = Boolean(candidate.rebookingGrace && !candidate.rebookingGrace.usedAt);

    if (candidate.testSlot && !hasActiveGrace) {
      return Response.json(
        {
          error:
            "Já agendou o seu teste anteriormente. O agendamento só pode ser realizado uma única vez.",
          alreadyBooked: true,
          testSlot: candidate.testSlot,
        },
        { status: 409 },
      );
    }

    const normalizedSlot = normalizeSlot(slot);

    // Past slot safeguard: block booking for dates/times that have already concluded
    if (isPastDateSlot(normalizedSlot)) {
      return Response.json(
        {
          error:
            "A data seleccionada já passou. Por favor escolha um turno disponível futuro.",
          slotExpired: true,
        },
        { status: 400 },
      );
    }

    const config = await getCandidateSlotConfig(candidate);
    const updated = await reserveTestSlot(candidate, normalizedSlot, config, await getApplications(true));

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // Booking is already committed. Neither email blocks confirmation of the
    // reservation, and a slow standard receipt cannot delay the configured follow-up.
    after(async () => {
      const outcomes = await Promise.allSettled([
        bookingFollowUp(updated),
        sendBookingConfirmation({ application: updated, slot: normalizedSlot, baseUrl: origin }),
      ]);
      for (const result of outcomes) if (result.status === "rejected") console.error("Booking email needs attention:", result.reason);
    });

    return Response.json({
      success: true,
      id: updated.id,
      name: updated.name,
      testSlot: updated.testSlot,
      testBookedAt: updated.testBookedAt,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["SLOT_FULL", "ALREADY_BOOKED", "INVALID_SLOT", "CANDIDATE_INACTIVE", "INVITATION_REQUIRED", "BOOKING_CHANGED"].includes(code)) return Response.json({ error: code === "SLOT_FULL" ? "Este turno está cheio. Escolha outra data." : code === "INVALID_SLOT" ? "Seleccione um turno disponível configurado para este lote." : "Este agendamento não está disponível. Contacte a equipa de recrutamento.", code }, { status: 409 });
    console.error("Test booking POST error:", error);
    return Response.json(
      { error: "Falha ao gravar confirmação do teste." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
