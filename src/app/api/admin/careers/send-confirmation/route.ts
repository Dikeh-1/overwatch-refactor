import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication } from "@/lib/careers-store";
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
