import { getApplication, updateApplication, getTestSlots, getApplications } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS } from "@/lib/careers";
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

    // Booking link is nullified for disqualified / archived candidates
    if (DEACTIVATED_STATUSES.includes(candidate.status as any)) {
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
    const activeSlots = await getTestSlots();
    const candidateSlots = activeSlots;

    const maxPerDay = 10;
    const slotStats: Record<string, { booked: number; max: number; isFull: boolean; remaining: number }> = {};
    for (const s of candidateSlots) {
      const booked = allApps.filter(
        (a) => a.testSlot === s && a.status !== "rejected" && a.status !== "archived" && a.id !== candidate.id
      ).length;
      slotStats[s] = {
        booked,
        max: maxPerDay,
        isFull: booked >= maxPerDay,
        remaining: Math.max(0, maxPerDay - booked),
      };
    }

    return Response.json({
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      testSlot: candidate.testSlot || null,
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

    // Block booking for deactivated candidates
    if (DEACTIVATED_STATUSES.includes(candidate.status as any)) {
      return Response.json(
        {
          error: "Este link de agendamento foi desactivado. Contacte o departamento de RH para mais informações.",
          deactivated: true,
        },
        { status: 410 },
      );
    }

    // Single-use booking safeguard: block repeat booking
    if (candidate.testSlot) {
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

    // Slot quota safeguard: max 10 candidates per day
    const allApps = await getApplications();
    const currentBookings = allApps.filter(
      (a) => a.testSlot === slot.trim() && a.status !== "rejected" && a.status !== "archived" && a.id !== id
    ).length;

    if (currentBookings >= 10) {
      return Response.json(
        {
          error:
            "As vagas para este dia já se encontram esgotadas (limite de 10 candidatas por dia atingido). Por favor seleccione outra data disponível.",
          slotFull: true,
        },
        { status: 409 },
      );
    }

    const bookedAt = new Date().toISOString();
    const updated = await updateApplication(id, {
      testSlot: slot.trim(),
      testBookedAt: bookedAt,
      status: "interview",
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // Send confirmation email to applicant with location & details
    try {
      await sendBookingConfirmation({
        application: updated,
        slot: slot.trim(),
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
