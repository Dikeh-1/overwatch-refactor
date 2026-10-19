import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication, updateApplication } from "@/lib/careers-store";
import {
  sendTechnicalLocationDeclineEmail,
  sendTechnicalRegionDeclineEmail,
} from "@/lib/careers-email";
import { classifyCandidateLocation } from "@/lib/location-utils";
import crypto from "node:crypto";

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
    const isPreview = Boolean(body.preview);
    const previewEmail = (body.previewEmail || "").trim();
    /**
     * declineType controls which email template is used:
     *   "outside_mozambique" — candidates outside Mozambique entirely (default)
     *   "mozambique_other"   — candidates in Mozambique but outside Maputo region
     */
    const declineType: "outside_mozambique" | "mozambique_other" =
      body.declineType === "mozambique_other" ? "mozambique_other" : "outside_mozambique";

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // ── 1. Preview Test Email Mode ───────────────────────────────────────────
    if (isPreview) {
      if (!previewEmail || !previewEmail.includes("@")) {
        return Response.json(
          { error: "Por favor insira um endereço de email válido para o teste." },
          { status: 400 }
        );
      }

      const testCandidate = { name: "Candidato de Teste", email: previewEmail };
      if (declineType === "mozambique_other") {
        await sendTechnicalRegionDeclineEmail({
          application: testCandidate,
          baseUrl: origin,
          preview: true,
          recipientEmail: previewEmail,
        });
      } else {
        await sendTechnicalLocationDeclineEmail({
          application: testCandidate,
          baseUrl: origin,
          preview: true,
          recipientEmail: previewEmail,
        });
      }

      return Response.json({
        success: true,
        previewSent: true,
        recipient: previewEmail,
        message: `Email modelo de teste enviado com sucesso para ${previewEmail}`,
      });
    }

    // ── 2. Batch Decline ─────────────────────────────────────────────────────
    if (ids.length === 0) {
      return Response.json(
        { error: "Nenhum candidato selecionado para declinar." },
        { status: 400 }
      );
    }

    const auditLabel =
      declineType === "mozambique_other"
        ? "Declined: Outside Maputo Region"
        : "Declined: Outside Mozambique";

    const auditDetails =
      declineType === "mozambique_other"
        ? "Candidatura declinada por não residir na região de Maputo (Maputo, Matola, Marracuene ou Mavalane). Requisito de presença física na Grande Maputo."
        : "Candidatura declinada por motivo de localização. Requisito presencial em Moçambique.";

    const results: {
      id: string;
      name: string;
      email: string;
      location: string;
      success: boolean;
      emailSent: boolean;
    }[] = [];

    for (const id of ids) {
      try {
        const candidate = await getApplication(id);
        if (!candidate) continue;

        const locInfo = classifyCandidateLocation(candidate);

        // Activity log entry
        const currentLog = candidate.activityLog || [];
        const updatedLog = [
          ...currentLog,
          {
            id: crypto.randomUUID(),
            action: auditLabel,
            details: `${auditDetails} (${locInfo.locationLabel})`,
            actor: "Direcção Overwatch / Admin",
            timestamp: new Date().toISOString(),
          },
        ];

        await updateApplication(id, {
          status: "not_advancing",
          activityLog: updatedLog,
        });

        let emailSent = false;
        if (body.sendEmail !== false) {
          try {
            if (declineType === "mozambique_other") {
              await sendTechnicalRegionDeclineEmail({
                application: candidate,
                baseUrl: origin,
              });
            } else {
              await sendTechnicalLocationDeclineEmail({
                application: candidate,
                baseUrl: origin,
              });
            }
            emailSent = true;
          } catch (emailErr) {
            console.error(`Failed to send decline email to candidate ${id}:`, emailErr);
          }
        }

        results.push({
          id,
          name: candidate.name,
          email: candidate.email,
          location: locInfo.locationLabel,
          success: true,
          emailSent,
        });

        // Respect Brevo API pacing rate
        if (emailSent) {
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch (err) {
        console.error(`Error processing decline for candidate ${id}:`, err);
        results.push({
          id,
          name: "Unknown",
          email: "",
          location: "",
          success: false,
          emailSent: false,
        });
      }
    }

    return Response.json({
      success: true,
      count: results.filter((r) => r.success).length,
      emailsSent: results.filter((r) => r.emailSent).length,
      results,
    });
  } catch (error) {
    console.error("Decline location error:", error);
    return Response.json(
      { error: "Erro ao processar recusa de candidatos." },
      { status: 500 }
    );
  }
}
