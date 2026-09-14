import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication, updateApplication } from "@/lib/careers-store";
import { DEFAULT_TEST_SLOTS } from "@/lib/careers";
import { sendTestInvitation } from "@/lib/careers-email";

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
    const candidateIds: string[] = Array.isArray(body.candidateIds)
      ? body.candidateIds
      : [];
    const subject: string =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique";
    const messageText: string =
      typeof body.messageText === "string" && body.messageText.trim()
        ? body.messageText.trim()
        : `Boa tarde {{name}},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema.

Atenciosamente,
Equipa de Recrutamento Overwatch Moçambique`;

    const slots: string[] =
      Array.isArray(body.slots) && body.slots.length > 0
        ? body.slots
        : [...DEFAULT_TEST_SLOTS];

    if (candidateIds.length === 0) {
      return Response.json(
        { error: "Nenhum candidato selecionado." },
        { status: 400 },
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    const results: { id: string; name: string; success: boolean; error?: string }[] =
      [];

    for (const id of candidateIds) {
      if (!/^[\da-f-]{36}$/i.test(id)) {
        results.push({ id, name: "Unknown", success: false, error: "ID inválido" });
        continue;
      }

      try {
        const candidate = await getApplication(id);
        if (!candidate) {
          results.push({
            id,
            name: "Unknown",
            success: false,
            error: "Candidato não encontrado",
          });
          continue;
        }

        // Send email invitation
        await sendTestInvitation({
          application: candidate,
          subject,
          messageText,
          slots,
          baseUrl: origin,
        });

        // Mark as invited and advance to shortlisted
        await updateApplication(id, {
          invitedAt: new Date().toISOString(),
          status: "shortlisted",
        });

        results.push({ id, name: candidate.name, success: true });
      } catch (err) {
        console.error(`Error sending test invite to ${id}:`, err);
        results.push({
          id,
          name: id,
          success: false,
          error: (err as Error)?.message || "Falha no envio",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    return Response.json({
      success: true,
      count: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Bulk invite endpoint error:", error);
    return Response.json(
      { error: "Falha ao processar convocatórias." },
      { status: 500 },
    );
  }
}
