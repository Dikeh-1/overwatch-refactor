import { authenticated } from "@/lib/careers-auth";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { sendGatePassEmail } from "@/lib/careers-email";
import { Application } from "@/lib/careers";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.CAREERS_ADMIN_PASSWORD || "OverwatchRecruit2026!";

function isAuthorized(request: Request, isAuthCookie: boolean): boolean {
  if (isAuthCookie) return true;
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey && adminKey === ADMIN_PASSWORD) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.replace(/^Bearer\s+/i, "") === ADMIN_PASSWORD) return true;
  return false;
}

export async function POST(request: Request) {
  const isAuthCookie = await authenticated();
  if (!isAuthorized(request, isAuthCookie)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // Support test email send
    if (typeof body.testEmail === "string" && body.testEmail.trim()) {
      const mockCandidate: Application = {
        id: "pass-preview-test-id",
        name: body.testName || "Candidata (Teste do Passe)",
        email: body.testEmail.trim(),
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
        status: "interview",
        testSlot: body.testSlot || "Quarta-feira, 16 de Setembro – 10h00",
      };

      const res = await sendGatePassEmail({
        application: mockCandidate,
        slot: mockCandidate.testSlot,
        baseUrl: origin,
        isReminder: false,
      });

      return Response.json({
        success: res.success,
        count: res.success ? 1 : 0,
        failed: res.success ? 0 : 1,
        isTest: true,
        recipient: body.testEmail.trim(),
      });
    }

    // Determine target candidates
    const allApps = await getApplications();
    let candidatesToDispatch: Application[] = [];

    if (Array.isArray(body.candidateIds) && body.candidateIds.length > 0) {
      const idSet = new Set(body.candidateIds);
      candidatesToDispatch = allApps.filter((a) => idSet.has(a.id) && Boolean(a.testSlot));
    } else if (typeof body.candidateId === "string" && body.candidateId.trim()) {
      const target = allApps.find((a) => a.id === body.candidateId.trim());
      if (target && target.testSlot) {
        candidatesToDispatch = [target];
      }
    } else {
      // Dispatch to ALL candidates who have booked their slot, excluding rejected/archived
      candidatesToDispatch = allApps.filter(
        (a) =>
          Boolean(a.testSlot) &&
          a.status !== "rejected" &&
          a.status !== "archived" &&
          !a.email.endsWith(".invalid")
      );
    }

    if (candidatesToDispatch.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        failed: 0,
        message: "Nenhuma candidata agendada encontrada para envio.",
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const recipients: { id: string; name: string; email: string; slot: string }[] = [];

    for (const candidate of candidatesToDispatch) {
      try {
        const res = await sendGatePassEmail({
          application: candidate,
          slot: candidate.testSlot,
          baseUrl: origin,
          isReminder: false,
        });

        if (res.success) {
          successCount++;
          recipients.push({
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            slot: candidate.testSlot || "",
          });

          // Mark pass as sent in store
          try {
            await updateApplication(candidate.id, {
              gatePassSentAt: new Date().toISOString(),
            });
          } catch (updateErr) {
            console.error(`Failed to record gatePassSentAt for ${candidate.id}:`, updateErr);
          }
        } else {
          failedCount++;
          console.error(`Failed to send gate pass email to ${candidate.email}`);
        }
      } catch (sendErr) {
        failedCount++;
        console.error(`Exception sending gate pass to ${candidate.email}:`, sendErr);
      }

      // Small throttle delay between sends (150ms) to respect provider quotas
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return Response.json({
      success: successCount > 0,
      count: successCount,
      failed: failedCount,
      total: candidatesToDispatch.length,
      recipients,
    });
  } catch (err) {
    console.error("dispatch-gate-passes error:", err);
    return Response.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
