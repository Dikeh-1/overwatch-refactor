import { verifyAdminAuthorization } from "@/lib/careers-auth";
import { getApplications, getApplication, updateApplication } from "@/lib/careers-store";
import {
  sendAddressCorrectionBroadcastEmail,
} from "@/lib/careers-email";
import { Application } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdminAuthorization(request))) {
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

    // 2. Specific Candidate Target by ID or Email
    if (body.candidateId || body.candidateEmail || (body.target && body.target !== "all")) {
      const searchTarget = String(body.candidateId || body.candidateEmail || body.target).toLowerCase().trim();
      const target = allApps.find(
        (a) =>
          a.id.toLowerCase() === searchTarget ||
          a.email.toLowerCase() === searchTarget ||
          a.name.toLowerCase().includes(searchTarget)
      );

      if (!target) {
        return Response.json(
          { error: "Candidata não encontrada no sistema de selecção." },
          { status: 404 }
        );
      }

      if (body.deactivate || body.archive) {
        await updateApplication(target.id, {
          status: "archived",
          testSlot: undefined,
          testBookedAt: undefined,
          attendedAt: undefined,
          attendanceStatus: undefined,
        });

        return Response.json({
          success: true,
          candidate: { id: target.id, name: target.name, email: target.email },
          deactivated: true,
          message: `Candidatura de ${target.name} arquivada com sucesso.`,
        });
      }

      const res = await sendAddressCorrectionBroadcastEmail({
        application: target,
        slot: target.testSlot,
        baseUrl: origin,
      });

      return Response.json({
        success: res.success,
        candidate: {
          id: target.id,
          name: target.name,
          email: target.email,
        },
        message: `E-mail de rectificação de endereço enviado para ${target.name}!`,
      });
    }

    // 4. Broadcast to ALL Booked Candidates (excluding those who already wrote or did the test)
    const candidatesToBroadcast = allApps.filter(
      (a) =>
        Boolean(a.testSlot) &&
        !a.attendedAt &&
        a.attendanceStatus !== "present" &&
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
