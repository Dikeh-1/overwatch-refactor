import { authenticated } from "@/lib/careers-auth";
import { getApplications, getApplication, updateApplication } from "@/lib/careers-store";
import {
  sendInocioWilsonRebookingEmail,
  sendAddressCorrectionBroadcastEmail,
} from "@/lib/careers-email";
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

    // 1. Preview Test Email
    if (typeof body.testEmail === "string" && body.testEmail.trim()) {
      const mockCandidate: Application = {
        id: "preview-correction-id",
        name: body.testName || "Candidata (Teste Rectificação)",
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

      const res = await sendAddressCorrectionBroadcastEmail({
        application: mockCandidate,
        slot: mockCandidate.testSlot,
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        isTest: true,
        recipient: body.testEmail.trim(),
      });
    }

    const allApps = await getApplications();

    // 2. Specific Target: Inocio Wilson (Inosse Lamula) Rebooking Exception
    if (body.target === "inocio" || body.inocioOnly) {
      let inocio = allApps.find(
        (a) =>
          a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
          a.email.toLowerCase() === "inociowilson7@gmail.com" ||
          a.name.toLowerCase().includes("inoci") ||
          a.name.toLowerCase().includes("inosse")
      );

      if (!inocio) {
        return Response.json(
          { error: "Candidato Inocio Wilson não encontrado na base de dados." },
          { status: 404 }
        );
      }

      // RESTORE INOCIO WILSON: Unarchive, set to shortlisted, clear past test slot so he can choose a new one
      const updatedInocio = await updateApplication(inocio.id, {
        status: "shortlisted",
        testSlot: undefined,
        testBookedAt: undefined,
        attendedAt: undefined,
        attendanceStatus: undefined,
      });

      const res = await sendInocioWilsonRebookingEmail({
        application: updatedInocio,
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        target: "inocio",
        candidate: {
          id: updatedInocio.id,
          name: updatedInocio.name,
          email: updatedInocio.email,
          status: updatedInocio.status,
          rebookingUrl: `${origin}/pt/careers/test-invite/${updatedInocio.id}`,
        },
        message: "Candidatura de Inocio Wilson reactivada com sucesso e e-mail de reagendamento enviado!",
      });
    }

    // 3. Specific Target: Shelsia Raíssa Chimbende
    if (body.target === "shelsia") {
      let shelsia = allApps.find(
        (a) =>
          a.id === "8e47e205-26fd-43ae-ab5c-3568486e7ba6" ||
          a.email.toLowerCase() === "chimbendeshelsia@gmail.com" ||
          a.name.toLowerCase().includes("shelsia")
      );

      if (!shelsia) {
        return Response.json(
          { error: "Candidata Shelsia Raíssa Chimbende não encontrada." },
          { status: 404 }
        );
      }

      const res = await sendAddressCorrectionBroadcastEmail({
        application: shelsia,
        slot: shelsia.testSlot,
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        target: "shelsia",
        candidate: {
          id: shelsia.id,
          name: shelsia.name,
          email: shelsia.email,
        },
        message: "E-mail de rectificação de endereço enviado para Shelsia Raíssa Chimbende!",
      });
    }

    // 4. Broadcast to ALL Booked Candidates
    const candidatesToBroadcast = allApps.filter(
      (a) =>
        Boolean(a.testSlot) &&
        a.status !== "rejected" &&
        a.status !== "archived" &&
        !a.email.endsWith(".invalid")
    );

    if (candidatesToBroadcast.length === 0) {
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

    for (const candidate of candidatesToBroadcast) {
      try {
        const res = await sendAddressCorrectionBroadcastEmail({
          application: candidate,
          slot: candidate.testSlot,
          baseUrl: origin,
        });

        if (res.success) {
          successCount++;
          recipients.push({
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            slot: candidate.testSlot || "",
          });
        } else {
          failedCount++;
          console.error(`Failed to send address correction email to ${candidate.email}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`Exception sending correction email to ${candidate.email}:`, err);
      }

      // Small throttle delay between sends (150ms) to respect provider quotas
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Also unarchive Inocio if requested in broadcast
    if (body.includeInocio) {
      let inocio = allApps.find(
        (a) =>
          a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
          a.email.toLowerCase() === "inociowilson7@gmail.com"
      );
      if (inocio) {
        try {
          const updatedInocio = await updateApplication(inocio.id, {
            status: "shortlisted",
            testSlot: undefined,
            testBookedAt: undefined,
            attendedAt: undefined,
            attendanceStatus: undefined,
          });
          await sendInocioWilsonRebookingEmail({ application: updatedInocio, baseUrl: origin });
        } catch (e) {
          console.error("Failed to restore/email Inocio in broadcast:", e);
        }
      }
    }

    return Response.json({
      success: successCount > 0,
      count: successCount,
      failed: failedCount,
      total: candidatesToBroadcast.length,
      recipients,
    });
  } catch (err) {
    console.error("address-correction error:", err);
    return Response.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
