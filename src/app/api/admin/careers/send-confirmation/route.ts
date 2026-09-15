import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication, updateApplication } from "@/lib/careers-store";
import { sendCustomBookingConfirmation } from "@/lib/careers-email";

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
    const testEmail: string | undefined =
      typeof body.testEmail === "string" && body.testEmail.trim()
        ? body.testEmail.trim()
        : undefined;

    const messageText: string | undefined =
      typeof body.messageText === "string" && body.messageText.trim()
        ? body.messageText.trim()
        : undefined;

    const subject: string | undefined =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : undefined;

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    if (testEmail) {
      const mockCandidate: import("@/lib/careers").Application = {
        id: "test-preview-id",
        name: body.testName || "Candidata (Teste)",
        email: testEmail,
        whatsapp: "+258 84 287 0793",
        role: "cctv-operator",
        locale: "pt",
        grade12: "yes",
        experience: "yes",
        shifts: "yes",
        sex: "female",
        ai: "yes",
        cvName: "cv_teste.pdf",
        cvSize: 15000,
        cvType: "application/pdf",
        lastProfession: "Operadora",
        createdAt: new Date().toISOString(),
        status: "shortlisted",
        testSlot: "Quarta-feira, 16 de Setembro – 10h00",
      };

      const res = await sendCustomBookingConfirmation({
        application: mockCandidate,
        slot: mockCandidate.testSlot || "Quarta-feira, 16 de Setembro – 10h00",
        messageText,
        subject: subject || "Teste de Confirmação: Overwatch Moçambique",
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        count: res.success ? 1 : 0,
        failed: res.success ? 0 : 1,
        isTest: true,
      });
    }

    const candidateId: string | undefined =
      typeof body.candidateId === "string" ? body.candidateId : undefined;
    const candidateIds: string[] = Array.isArray(body.candidateIds)
      ? body.candidateIds
      : candidateId
        ? [candidateId]
        : [];

    if (candidateIds.length === 0) {
      return Response.json(
        { error: "Nenhum candidato selecionado." },
        { status: 400 },
      );
    }

    let successCount = 0;
    let failedCount = 0;

    for (const id of candidateIds) {
      if (!/^[\da-f-]{36}$/i.test(id)) {
        failedCount++;
        continue;
      }

      try {
        const candidate = await getApplication(id);
        if (!candidate || !candidate.testSlot) {
          failedCount++;
          continue;
        }

        const res = await sendCustomBookingConfirmation({
          application: candidate,
          slot: candidate.testSlot,
          messageText,
          subject,
          baseUrl: origin,
        });

        if (res.success) {
          successCount++;
          try {
            await updateApplication(candidate.id, {
              confirmationSentAt: new Date().toISOString(),
            });
          } catch (e) {
            console.error("Failed to update confirmationSentAt:", e);
          }
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return Response.json({
      success: successCount > 0,
      count: successCount,
      failed: failedCount,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 },
    );
  }
}
