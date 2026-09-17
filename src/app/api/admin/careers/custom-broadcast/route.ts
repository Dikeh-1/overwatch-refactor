import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications } from "@/lib/careers-store";
import { sendTransactionalEmail } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";
import type { Application } from "@/lib/careers";

export const dynamic = "force-dynamic";

interface BroadcastRequest {
  audienceFilter: "invited_unconfirmed" | "booked_confirmed" | "all_invited" | "all_applied" | "disqualified";
  genderFilter?: "all" | "female" | "male";
  roleId?: string;
  subject: string;
  message: string;
  includeBookingButton?: boolean;
  buttonText?: string;
  testOnly?: boolean;
  testEmail?: string;
}

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(null, { status: 403 });
  }

  try {
    const body = (await request.json()) as BroadcastRequest;
    const {
      audienceFilter,
      genderFilter = "all",
      roleId,
      subject,
      message,
      includeBookingButton = true,
      buttonText = "Confirmar Data do Teste Presencial",
      testOnly = false,
      testEmail,
    } = body;

    if (!subject?.trim() || !message?.trim()) {
      return Response.json(
        { error: "Subject and message are required." },
        { status: 400 },
      );
    }

    if (testOnly) {
      const recipient = testEmail?.trim();
      if (!recipient || !recipient.includes("@")) {
        return Response.json(
          { error: "Por favor introduza um endereço de e-mail válido para o teste." },
          { status: 400 },
        );
      }

      const sampleCandidate: Application = {
        id: "preview-sample-id",
        name: "Candidato de Teste",
        email: recipient,
        whatsapp: "+258 84 000 0000",
        role: roleId || "cctv",
        locale: "pt",
        grade12: "yes",
        sex: "female",
        ai: "no",
        experience: "yes",
        lastProfession: "Operadora de CCTV",
        shifts: "yes",
        cvName: "curriculo.pdf",
        cvType: "application/pdf",
        cvSize: 102400,
        status: "interview",
        createdAt: new Date().toISOString(),
      };

      const html = generateOfficialBroadcastHtml({
        candidate: sampleCandidate,
        subject,
        message,
        includeBookingButton,
        buttonText,
      });

      await sendTransactionalEmail({
        sender: { name: "Overwatch Recrutamento", email: "carreiras@overwatchmoz.com" },
        to: [{ email: recipient, name: sampleCandidate.name }],
        subject: `[TESTE PREVIEW] ${subject.trim()}`,
        htmlContent: html,
        textContent: message.trim(),
      });

      return Response.json({
        success: true,
        testMode: true,
        recipient,
      });
    }

    const allApps = await getApplications();

    // Filter by role if specified
    let targetPool = roleId && roleId !== "all" ? allApps.filter((a) => a.role === roleId) : allApps;

    // Filter by audience cohort
    if (audienceFilter === "invited_unconfirmed") {
      targetPool = targetPool.filter(
        (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived",
      );
    } else if (audienceFilter === "booked_confirmed") {
      targetPool = targetPool.filter(
        (a) => Boolean(a.testSlot) && a.status !== "archived",
      );
    } else if (audienceFilter === "all_invited") {
      targetPool = targetPool.filter(
        (a) => Boolean(a.invitedAt) && a.status !== "archived",
      );
    } else if (audienceFilter === "disqualified") {
      targetPool = targetPool.filter((a) => a.status === "archived");
    } else if (audienceFilter === "all_applied") {
      targetPool = targetPool.filter((a) => a.status !== "archived");
    }

    // Filter by gender
    if (genderFilter !== "all") {
      targetPool = targetPool.filter((a) => a.sex === genderFilter);
    }

    // Deduplicate by email address and exclude deactivated candidate
    const seenEmails = new Set<string>();
    const deduplicatedCandidates: Application[] = [];

    for (const app of targetPool) {
      const normEmail = app.email.trim().toLowerCase();
      if (
        normEmail === "inociowilson7@gmail.com" ||
        app.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956"
      ) {
        continue;
      }
      if (!seenEmails.has(normEmail)) {
        seenEmails.add(normEmail);
        deduplicatedCandidates.push(app);
      }
    }

    if (deduplicatedCandidates.length === 0) {
      return Response.json(
        { error: "Nenhum candidato corresponde aos filtros seleccionados." },
        { status: 400 },
      );
    }

    let sentCount = 0;
    const errors: { email: string; error: string }[] = [];

    for (const candidate of deduplicatedCandidates) {
      try {
        const html = generateOfficialBroadcastHtml({
          candidate,
          subject,
          message,
          includeBookingButton,
          buttonText,
        });

        await sendTransactionalEmail({
          sender: { name: "Overwatch Recrutamento", email: "carreiras@overwatchmoz.com" },
          to: [{ email: candidate.email.trim(), name: candidate.name.trim() }],
          subject: subject.trim(),
          htmlContent: html,
          textContent: message.trim(),
        });

        sentCount++;
      } catch (err) {
        errors.push({
          email: candidate.email,
          error: (err as Error).message || String(err),
        });
      }
    }

    return Response.json({
      success: true,
      sentCount,
      totalTargeted: deduplicatedCandidates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Custom broadcast error:", error);
    return Response.json(
      { error: (error as Error).message || "Broadcast dispatch failed." },
      { status: 500 },
    );
  }
}

function generateOfficialBroadcastHtml(params: {
  candidate: Application;
  subject: string;
  message: string;
  includeBookingButton: boolean;
  buttonText: string;
}) {
  const { candidate, subject, message, includeBookingButton, buttonText } = params;

  const origin = "https://www.overwatchmoz.com";
  const logoWhiteUrl = `${origin}/logo-white.png`;
  const bookingUrl = `${origin}/pt/careers/test-invite/${candidate.id}`;

  const isFemale = candidate.sex === "female";
  const firstName = candidate.name.split(" ")[0].trim();
  const greeting = isFemale ? `Prezada ${firstName}` : `Prezado ${firstName}`;

  // Format message paragraphs and lists cleanly
  const paragraphs = message
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const formattedContent = paragraphs
    .map((block) => {
      // Check for bullet list
      if (block.includes("\n•") || block.includes("\n-") || block.startsWith("•") || block.startsWith("-")) {
        const lines = block.split("\n");
        const items: string[] = [];
        let introText = "";
        lines.forEach((l) => {
          const t = l.trim();
          if (t.startsWith("•") || t.startsWith("-")) {
            items.push(`<li style="margin-bottom: 6px; color: #334155;">${t.replace(/^[•-]\s*/, "")}</li>`);
          } else if (t) {
            introText += `<p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 8px 0;">${t}</p>`;
          }
        });
        return `${introText}<ul style="margin: 6px 0 16px 20px; padding: 0; font-size: 14px; line-height: 1.6;">${items.join("")}</ul>`;
      }

      // Check for numbered list (1. 2. 3.)
      if (/^\d+\./m.test(block)) {
        const lines = block.split("\n");
        const items: string[] = [];
        let introText = "";
        lines.forEach((l) => {
          const t = l.trim();
          if (/^\d+\./.test(t)) {
            items.push(`<li style="margin-bottom: 6px; color: #334155;">${t.replace(/^\d+\.\s*/, "")}</li>`);
          } else if (t) {
            introText += `<p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 8px 0;">${t}</p>`;
          }
        });
        return `${introText}<ol style="margin: 6px 0 16px 20px; padding: 0; font-size: 14px; line-height: 1.6;">${items.join("")}</ol>`;
      }

      return `<p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 14px 0;">${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f1f5f9; padding: 32px 14px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">
      
      <!-- Official Letterhead Header (Dark Navy #0b1329) -->
      <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${logoWhiteUrl}" alt="Overwatch" height="22" width="147" style="height: 22px; width: auto; max-width: 145px; display: block; border: 0;" />
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                REF: COM-2026/MAPUTO
              </span>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                Departamento de Recursos Humanos
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Official Subheading Bar -->
      <div style="background-color: #f8fafc; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0b1329;">
              COMUNICAÇÃO OFICIAL · PROCESSO DE RECRUTAMENTO
            </td>
            <td style="text-align: right; color: #64748b; font-size: 11px;">
              Maputo, Moçambique
            </td>
          </tr>
        </table>
      </div>

      <!-- Body Content -->
      <div style="padding: 28px 24px; background-color: #ffffff;">
        <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 16px 0;">
          ${greeting},
        </h1>

        <div style="margin-bottom: 20px;">
          ${formattedContent}
        </div>

        ${
          includeBookingButton
            ? `
        <!-- Direct CTA Button (Official Dark Navy) -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(11, 19, 41, 0.25); letter-spacing: 0.02em;">
            ${buttonText} &rarr;
          </a>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
            Link pessoal: <a href="${bookingUrl}" style="color: #0b1329; text-decoration: underline; word-break: break-all;">${bookingUrl}</a>
          </div>
        </div>
        `
            : ""
        }

        <!-- Official Premises & Address Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
          <strong style="font-size: 12px; color: #090d16; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
            📍 Endereço Oficial das Instalações
          </strong>
          <div style="font-size: 13px; color: #475569; line-height: 1.5;">
            <strong>Overwatch Moçambique:</strong> Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.<br />
            <span style="font-size: 12px; color: #64748b;">(Acesso sujeito a confirmação prévia de presença e apresentação de documento de identificação original com fotografia).</span>
          </div>
        </div>

        <!-- Sign-Off -->
        <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
          Com os melhores cumprimentos,<br />
          <strong style="color: #090d16;">Equipa de Recrutamento</strong><br />
          Overwatch Moçambique
        </div>
      </div>

      <!-- Formal Legal & Contact Footer -->
      <div style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
        <strong style="color: #090d16;">Overwatch Moçambique, Lda.</strong><br />
        ${siteContact.address.pt}<br />
        Telefone / WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #0b1329; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #0b1329; text-decoration: none;">${siteContact.email}</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
      </div>

    </div>
  </div>
</body>
</html>
`;
}
