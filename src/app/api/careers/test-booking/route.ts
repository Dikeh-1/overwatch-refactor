import { getApplication, updateApplication, getTestSlotConfig, getApplications } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS, normalizeSlot, isPastDateSlot } from "@/lib/careers";
import { sendBookingConfirmation } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const DEACTIVATED_STATUSES = ["archived", "rejected"] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^[\da-f-]{36}$/i.test(id)) {
      return Response.json(
        { error: "Identificador de candidatura inválido." },
        { status: 400 },
      );
    }

    const candidate = await getApplication(id);
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Silently block deactivated candidates or Inocio Wilson (Inosse Lamula)
    const isInocio =
      id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
      candidate.email.toLowerCase() === "inociowilson7@gmail.com";

    if (isInocio && candidate.status !== "archived") {
      // Silently ensure his record is marked archived
      updateApplication(candidate.id, {
        status: "archived",
        testSlot: undefined,
        testBookedAt: undefined,
        attendedAt: undefined,
        attendanceStatus: undefined,
      }).catch(() => {});
    }

    if (isInocio || DEACTIVATED_STATUSES.includes(candidate.status as any)) {
      return Response.json(
        {
          error: "Este link de convocatória foi desactivado.",
          deactivated: true,
          reason: "A candidatura foi arquivada ou excluída do processo de selecção.",
        },
        { status: 410 },
      );
    }

    const allApps = await getApplications();
    const { slots: activeSlots, quota = 15 } = await getTestSlotConfig();
    const hasActiveGrace = Boolean(candidate.rebookingGrace && !candidate.rebookingGrace.usedAt);

    // Filter available candidate booking slots:
    // If candidate has not booked yet or is using Grace OTL, only provide future open slots.
    // If all configured slots are in the past, fallback to DEFAULT_TEST_SLOTS filtered for future.
    let candidateSlots = activeSlots;
    if (hasActiveGrace || !candidate.testSlot) {
      const futureSlots = candidateSlots.filter((s) => !isPastDateSlot(s));
      if (futureSlots.length > 0) {
        candidateSlots = futureSlots;
      } else {
        candidateSlots = DEFAULT_TEST_SLOTS.filter((s) => !isPastDateSlot(s));
        if (candidateSlots.length === 0) {
          candidateSlots = [...DEFAULT_TEST_SLOTS];
        }
      }
    }

    const maxPerDay = quota;
    const slotStats: Record<string, { booked: number; max: number; isFull: boolean; remaining: number; isPast: boolean }> = {};
    for (const s of candidateSlots) {
      const normS = normalizeSlot(s);
      const isPast = isPastDateSlot(s);
      const booked = allApps.filter(
        (a) => normalizeSlot(a.testSlot) === normS && a.status !== "rejected" && a.status !== "archived" && a.id !== candidate.id
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

    return Response.json({
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
    });
  } catch (error) {
    console.error("Test booking GET error:", error);
    return Response.json(
      { error: "Erro ao carregar detalhes da convocatória." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, slot } = body;

    if (!id || !/^[\da-f-]{36}$/i.test(id)) {
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

    const candidate = await getApplication(id);
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Block booking for deactivated candidates or Inocio Wilson
    const isInocio =
      id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
      candidate.email.toLowerCase() === "inociowilson7@gmail.com";

    if (isInocio || DEACTIVATED_STATUSES.includes(candidate.status as any)) {
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

    // Slot quota safeguard: enforce dynamic quota (default 15 candidates per day)
    const { quota = 15 } = await getTestSlotConfig();
    const allApps = await getApplications();
    const currentBookings = allApps.filter(
      (a) => normalizeSlot(a.testSlot) === normalizedSlot && a.status !== "rejected" && a.status !== "archived" && a.id !== id
    ).length;

    if (currentBookings >= quota) {
      return Response.json(
        {
          error:
            `As vagas para este dia já se encontram esgotadas (limite de ${quota} candidatas por dia atingido). Por favor seleccione outra data disponível.`,
          slotFull: true,
        },
        { status: 409 },
      );
    }

    const bookedAt = new Date().toISOString();
    const updates: Record<string, any> = {
      testSlot: normalizedSlot,
      testBookedAt: bookedAt,
      status: "interview",
      attendedAt: undefined,
      attendanceStatus: undefined,
    };

    if (hasActiveGrace && candidate.rebookingGrace) {
      updates.previousTestSlot = candidate.rebookingGrace.previousSlot || candidate.testSlot || undefined;
      updates.rebookingGrace = {
        ...candidate.rebookingGrace,
        usedAt: bookedAt,
      };
    }

    const updated = await updateApplication(id, updates);

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // Send confirmation email to applicant with location & details
    try {
      await sendBookingConfirmation({
        application: updated,
        slot: normalizedSlot,
        baseUrl: origin,
      });
    } catch (emailErr) {
      console.error("Failed to send booking confirmation email:", emailErr);
    }

    return Response.json({
      success: true,
      id: updated.id,
      name: updated.name,
      testSlot: updated.testSlot,
      testBookedAt: updated.testBookedAt,
    });
  } catch (error) {
    console.error("Test booking POST error:", error);
    return Response.json(
      { error: "Falha ao gravar confirmação do teste." },
      { status: 500 },
    );
  }
}
