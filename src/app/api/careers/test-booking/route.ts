import { getApplication, updateApplication } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS } from "@/lib/careers";
import { sendBookingConfirmation } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";

export const dynamic = "force-dynamic";

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

    return Response.json({
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      testSlot: candidate.testSlot || null,
      testBookedAt: candidate.testBookedAt || null,
      invitedAt: candidate.invitedAt || null,
      slots: DEFAULT_TEST_SLOTS,
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
      // Non-blocking for candidate UI response, but logged
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
