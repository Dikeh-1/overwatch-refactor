import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication, updateApplication } from "@/lib/careers-store";
import { screenCandidate } from "@/lib/careers-screening";
import { sendDisqualificationEmail } from "@/lib/careers-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const sendEmail: boolean = body.sendEmail !== false;

    if (ids.length === 0) {
      return Response.json(
        { error: "Nenhum candidato selecionado para desqualificação." },
        { status: 400 },
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    const results: {
      id: string;
      name: string;
      success: boolean;
      freedSlot?: string;
      reason: string;
    }[] = [];

    for (const id of ids) {
      try {
        const candidate = await getApplication(id);
        if (!candidate) continue;

        const screening = screenCandidate(candidate);
        const reason =
          body.customReason ||
          screening.reasonDescriptionPt ||
          "Não conformidade com os requisitos eliminatórios do concurso.";

        const freedSlot = candidate.testSlot;

        // Clear booking and archive candidate
        const updated = await updateApplication(id, {
          testSlot: undefined,
          testBookedAt: undefined,
          status: "archived",
        });

        // Send polite formal disqualification notice if requested
        if (sendEmail) {
          try {
            await sendDisqualificationEmail({
              application: updated,
              reason,
              baseUrl: origin,
            });
          } catch (emailErr) {
            console.error(`Failed to send disqualification email to ${id}:`, emailErr);
          }
        }

        results.push({
          id,
          name: candidate.name,
          success: true,
          freedSlot,
          reason,
        });

        // Respect rate limit pacing
        if (sendEmail) {
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch (err) {
        console.error(`Error disqualifying candidate ${id}:`, err);
      }
    }

    return Response.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Disqualification error:", error);
    return Response.json(
      { error: "Erro ao processar desqualificação de candidatos." },
      { status: 500 },
    );
  }
}
