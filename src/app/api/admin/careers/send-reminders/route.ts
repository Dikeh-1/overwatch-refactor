import { authenticated } from "@/lib/careers-auth";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { sendGatePassEmail } from "@/lib/careers-email";
import { Application, getSlotDayNumber, getMaputoToday } from "@/lib/careers";

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

    // Support test email
    if (typeof body.testEmail === "string" && body.testEmail.trim()) {
      const mockCandidate: Application = {
        id: "reminder-preview-test-id",
        name: body.testName || "Candidata (Teste do Lembrete)",
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
        testSlot: body.testSlot || "Quinta-feira, 17 de Setembro – 10h00",
      };

      const res = await sendGatePassEmail({
        application: mockCandidate,
        slot: mockCandidate.testSlot,
        baseUrl: origin,
        isReminder: true,
      });

      return Response.json({
        success: res.success,
        count: res.success ? 1 : 0,
        failed: res.success ? 0 : 1,
        isTest: true,
        recipient: body.testEmail.trim(),
      });
    }

    // Calculate Maputo Today and Tomorrow
    const now = new Date();
    const todayMaputo = getMaputoToday(now);
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowMaputo = getMaputoToday(tomorrowDate);

    // Target day: can be overridden in body (e.g. { targetDay: 17 }) or defaults to Maputo tomorrow
    const targetDay: number = typeof body.targetDay === "number" ? body.targetDay : tomorrowMaputo.day;

    const allApps = await getApplications();

    // STRICT FILTER:
    // 1. Must have a booked slot
    // 2. Candidate slot day must match targetDay (tomorrow)
    // 3. Candidate slot day MUST NOT be today (strictly skip candidates coming in today)
    // 4. Candidate must not be rejected/archived
    const eligibleCandidates = allApps.filter((a) => {
      if (!a.testSlot) return false;
      if (a.status === "rejected" || a.status === "archived") return false;
      if (a.email.endsWith(".invalid")) return false;

      const slotDay = getSlotDayNumber(a.testSlot);
      if (slotDay === null) return false;

      // Skip today's candidates completely
      if (slotDay === todayMaputo.day) return false;

      return slotDay === targetDay;
    });

    const skippedTodayCount = allApps.filter((a) => {
      if (!a.testSlot) return false;
      const slotDay = getSlotDayNumber(a.testSlot);
      return slotDay === todayMaputo.day;
    }).length;

    if (eligibleCandidates.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        failed: 0,
        targetDay,
        todayDay: todayMaputo.day,
        skippedTodayCount,
        message: `Nenhuma candidata agendada para o dia ${targetDay} (amanhã). Candidatas de hoje (dia ${todayMaputo.day}): ${skippedTodayCount} (omitidas conforme solicitado).`,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const recipients: { id: string; name: string; email: string; slot: string }[] = [];

    for (const candidate of eligibleCandidates) {
      try {
        const res = await sendGatePassEmail({
          application: candidate,
          slot: candidate.testSlot,
          baseUrl: origin,
          isReminder: true,
        });

        if (res.success) {
          successCount++;
          recipients.push({
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            slot: candidate.testSlot || "",
          });

          try {
            await updateApplication(candidate.id, {
              reminderSentAt: new Date().toISOString(),
            });
          } catch (updateErr) {
            console.error(`Failed to record reminderSentAt for ${candidate.id}:`, updateErr);
          }
        } else {
          failedCount++;
          console.error(`Failed to send reminder to ${candidate.email}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`Exception sending reminder to ${candidate.email}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return Response.json({
      success: successCount > 0,
      count: successCount,
      failed: failedCount,
      total: eligibleCandidates.length,
      targetDay,
      todayDay: todayMaputo.day,
      skippedTodayCount,
      recipients,
    });
  } catch (err) {
    console.error("send-reminders error:", err);
    return Response.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
