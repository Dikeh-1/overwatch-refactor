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

    // 1. Support test email send
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
        testSlot: body.testSlot || "Quinta-feira, 17 de Setembro – 10h00",
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

    // 2. Compute Mozambique / Maputo today and tomorrow
    const now = new Date();
    const todayMaputo = getMaputoToday(now);
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowMaputo = getMaputoToday(tomorrowDate);

    // Target day: defaults to Maputo tomorrow (the next day) or explicit targetDay in body
    const targetDay: number = typeof body.targetDay === "number" ? body.targetDay : tomorrowMaputo.day;

    const allApps = await getApplications();
    let candidatesToDispatch: Application[] = [];

    if (Array.isArray(body.candidateIds) && body.candidateIds.length > 0) {
      const idSet = new Set(body.candidateIds);
      candidatesToDispatch = allApps.filter(
        (a) =>
          idSet.has(a.id) &&
          Boolean(a.testSlot) &&
          !a.attendedAt &&
          a.attendanceStatus !== "present" &&
          a.status !== "rejected" &&
          a.status !== "archived" &&
          a.id !== "6548b28d-9e3b-41c0-bfcf-47c992fa0956" &&
          a.email.toLowerCase() !== "inociowilson7@gmail.com"
      );
    } else if (typeof body.candidateId === "string" && body.candidateId.trim()) {
      const target = allApps.find((a) => a.id === body.candidateId.trim());
      if (
        target &&
        target.testSlot &&
        !target.attendedAt &&
        target.attendanceStatus !== "present" &&
        target.status !== "rejected" &&
        target.status !== "archived" &&
        target.id !== "6548b28d-9e3b-41c0-bfcf-47c992fa0956" &&
        target.email.toLowerCase() !== "inociowilson7@gmail.com"
      ) {
        candidatesToDispatch = [target];
      }
    } else {
      // STRICT FILTER:
      // - Must have a booked test slot
      // - Must NOT be archived or rejected
      // - Must NOT be Inocio Wilson (silently blocked)
      // - Must NOT have already attended/checked-in or completed the test
      // - Slot MUST match the next day (targetDay / tomorrow)
      // - STRICTLY EXCLUDE today's candidates and past days
      candidatesToDispatch = allApps.filter((a) => {
        if (!a.testSlot) return false;
        if (a.status === "rejected" || a.status === "archived") return false;
        if (a.email.endsWith(".invalid")) return false;
        if (a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" || a.email.toLowerCase() === "inociowilson7@gmail.com") return false;

        // Skip candidates who have already attended, written, or checked in for the test
        if (a.attendedAt || a.attendanceStatus === "present") return false;

        const slotDay = getSlotDayNumber(a.testSlot);
        if (slotDay === null) return false;

        // Skip today's and past candidates completely
        if (slotDay <= todayMaputo.day) return false;

        // Must match the next day (tomorrow)
        return slotDay === targetDay;
      });
    }

    // Count skipped groups for detailed reporting
    const skippedAlreadyAttendedCount = allApps.filter(
      (a) =>
        Boolean(a.testSlot) &&
        (Boolean(a.attendedAt) || a.attendanceStatus === "present")
    ).length;

    const skippedTodayCount = allApps.filter((a) => {
      if (!a.testSlot) return false;
      const slotDay = getSlotDayNumber(a.testSlot);
      return slotDay === todayMaputo.day;
    }).length;

    if (candidatesToDispatch.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        failed: 0,
        targetDay,
        todayDay: todayMaputo.day,
        skippedTodayCount,
        skippedAlreadyAttendedCount,
        message: `Nenhuma candidata pendente agendada para o dia seguinte (dia ${targetDay}). Candidatas já avaliadas/presentes: ${skippedAlreadyAttendedCount}. Candidatas de hoje (dia ${todayMaputo.day}): ${skippedTodayCount} (omitidas conforme regra).`,
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
      targetDay,
      todayDay: todayMaputo.day,
      skippedTodayCount,
      skippedAlreadyAttendedCount,
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
