import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getTestSlots, saveTestSlots } from "@/lib/careers-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await authenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const slots = await getTestSlots();
    return Response.json({ slots });
  } catch (error) {
    console.error("Failed to retrieve test slots:", error);
    return Response.json(
      { error: "Falha ao obter turnos de teste." },
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
    if (!Array.isArray(body.slots) || body.slots.length === 0) {
      return Response.json(
        { error: "Por favor indique pelo menos um turno válido." },
        { status: 400 },
      );
    }

    const cleanSlots = body.slots
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);

    if (cleanSlots.length === 0) {
      return Response.json(
        { error: "Nenhum turno preenchido." },
        { status: 400 },
      );
    }

    const saved = await saveTestSlots(cleanSlots);
    return Response.json({ success: true, slots: saved });
  } catch (error) {
    console.error("Failed to save test slots:", error);
    return Response.json(
      { error: "Falha ao gravar turnos de teste." },
      { status: 500 },
    );
  }
}
