import { authenticated } from "@/lib/careers-auth";
import {
  getApplications,
  updateApplication,
  getTestSlotConfig,
  saveTestSlotConfig,
} from "@/lib/careers-store";
import { sendHolidayRescheduleEmail } from "@/lib/careers-email";
import { Application, normalizeSlot, isFriday25Sept } from "@/lib/careers";

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

const WEDNESDAY_SLOT = "Quarta-feira, 23 de Setembro - 10h00";
const THURSDAY_SLOT = "Quinta-feira, 24 de Setembro - 10h00";
const FRIDAY_SLOT_TARGET = "Sexta-feira, 25 de Setembro - 10h00";

export async function GET(request: Request) {
  const isAuthCookie = await authenticated();
  if (!isAuthorized(request, isAuthCookie)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allApps = await getApplications();
    const fridayCandidates = allApps.filter((a) => isFriday25Sept(a.testSlot));
    const wedCount = allApps.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(WEDNESDAY_SLOT)).length;
    const thuCount = allApps.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(THURSDAY_SLOT)).length;

    // Simulate balanced distribution:
    // Sort or cycle through candidates to keep Wednesday and Thursday as balanced as possible
    let currentWed = wedCount;
    let currentThu = thuCount;

    const proposed = fridayCandidates.map((c) => {
      let targetSlot = WEDNESDAY_SLOT;
      if (currentWed > currentThu) {
        targetSlot = THURSDAY_SLOT;
        currentThu++;
      } else {
        targetSlot = WEDNESDAY_SLOT;
        currentWed++;
      }
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        currentSlot: c.testSlot || FRIDAY_SLOT_TARGET,
        targetSlot,
      };
    });

    return Response.json({
      success: true,
      fridayCandidatesCount: fridayCandidates.length,
      currentCounts: {
        wednesday: wedCount,
        thursday: thuCount,
        friday: fridayCandidates.length,
      },
      projectedCounts: {
        wednesday: currentWed,
        thursday: currentThu,
        friday: 0,
      },
      proposedDistribution: proposed,
    });
  } catch (error) {
    console.error("[Reschedule Friday GET error]:", error);
    return Response.json({ error: "Falha ao calcular distribuição de feriado." }, { status: 500 });
  }
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

    // 1. Send Preview Test Email
    if (typeof body.testEmail === "string" && body.testEmail.trim()) {
      const mockCandidate: Application = {
        id: "preview-holiday-id",
        name: body.testName || "Candidata (Teste Feriado)",
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
        testSlot: WEDNESDAY_SLOT,
      };

      const res = await sendHolidayRescheduleEmail({
        application: mockCandidate,
        oldSlot: FRIDAY_SLOT_TARGET,
        newSlot: body.testSlot || WEDNESDAY_SLOT,
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        isTest: true,
        recipient: body.testEmail.trim(),
      });
    }

    // 2. Execute Real Redistribution and Email Dispatch
    if (body.execute !== true) {
      return Response.json(
        { error: "Confirmação necessária para executar a redistribuição (execute: true)." },
        { status: 400 }
      );
    }

    const allApps = await getApplications();
    const fridayCandidates = allApps.filter((a) => isFriday25Sept(a.testSlot));

    if (fridayCandidates.length === 0) {
      return Response.json({
        success: true,
        message: "Nenhuma candidata agendada para Sexta-feira, 25 de Setembro encontrada.",
        rescheduledCount: 0,
      });
    }

    let wedCount = allApps.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(WEDNESDAY_SLOT)).length;
    let thuCount = allApps.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(THURSDAY_SLOT)).length;

    const results: {
      id: string;
      name: string;
      email: string;
      oldSlot: string;
      newSlot: string;
      emailSent: boolean;
    }[] = [];

    for (const candidate of fridayCandidates) {
      const oldSlot = candidate.testSlot || FRIDAY_SLOT_TARGET;
      let newSlot = WEDNESDAY_SLOT;

      // Assign custom target if specifically requested per candidate, else balance evenly
      if (body.assignments && body.assignments[candidate.id]) {
        newSlot = body.assignments[candidate.id];
      } else if (wedCount > thuCount) {
        newSlot = THURSDAY_SLOT;
        thuCount++;
      } else {
        newSlot = WEDNESDAY_SLOT;
        wedCount++;
      }

      // Update candidate database record
      await updateApplication(candidate.id, {
        testSlot: newSlot,
        previousTestSlot: oldSlot,
      });

      // Send branded notification email with new slot details & QR access pass
      let emailSuccess = false;
      try {
        const emailRes = await sendHolidayRescheduleEmail({
          application: {
            ...candidate,
            testSlot: newSlot,
          },
          oldSlot,
          newSlot,
          baseUrl: origin,
        });
        emailSuccess = emailRes.success;
      } catch (sendErr) {
        console.error(`[Holiday Reschedule Email Failed for ${candidate.email}]:`, sendErr);
      }

      results.push({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        oldSlot,
        newSlot,
        emailSent: emailSuccess,
      });
    }

    // 3. Remove Friday 25 Sept from Active Test Slot Config so nobody else can book it
    try {
      const currentConfig = await getTestSlotConfig();
      const filteredSlots = currentConfig.slots.filter((s) => !isFriday25Sept(s));
      await saveTestSlotConfig({
        slots: filteredSlots,
        quota: currentConfig.quota,
      });
    } catch (cfgErr) {
      console.error("[Failed to update test-slots config after holiday shift]:", cfgErr);
    }

    return Response.json({
      success: true,
      rescheduledCount: results.length,
      emailsSentCount: results.filter((r) => r.emailSent).length,
      results,
    });
  } catch (error) {
    console.error("[Reschedule Friday POST error]:", error);
    return Response.json(
      { error: "Falha ao processar a redistribuição e envio de emails de feriado." },
      { status: 500 }
    );
  }
}
