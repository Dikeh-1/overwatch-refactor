import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications } from "@/lib/careers-store";
import { sendTransactionalEmail } from "@/lib/careers-email";
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

    const allApps = await getApplications();

    // Filter by role if specified
    let targetPool = roleId && roleId !== "all" ? allApps.filter((a) => a.role === roleId) : allApps;

    // Filter by audience cohort
    if (audienceFilter === "invited_unconfirmed") {
      // Candidates invited to technical test who have NOT confirmed a date yet
      targetPool = targetPool.filter(
        (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived",
      );
    } else if (audienceFilter === "booked_confirmed") {
      // Candidates who already confirmed their test slot
      targetPool = targetPool.filter(
        (a) => Boolean(a.testSlot) && a.status !== "archived",
      );
    } else if (audienceFilter === "all_invited") {
      // All candidates invited to test
      targetPool = targetPool.filter(
        (a) => Boolean(a.invitedAt) && a.status !== "archived",
      );
    } else if (audienceFilter === "disqualified") {
      // Archived / disqualified
      targetPool = targetPool.filter((a) => a.status === "archived");
    } else if (audienceFilter === "all_applied") {
      // All candidates excluding archived
      targetPool = targetPool.filter((a) => a.status !== "archived");
    }

    // Filter by gender
    if (genderFilter !== "all") {
      targetPool = targetPool.filter((a) => a.sex === genderFilter);
    }

    // Deduplicate by email address (case-insensitive)
    const seenEmails = new Set<string>();
    const deduplicatedCandidates: Application[] = [];

    for (const app of targetPool) {
      const normEmail = app.email.trim().toLowerCase();
      // Exclude Inocio Wilson (deactivated)
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

    // If test send only, dispatch single sample to admin/specified address
    if (testOnly) {
      const recipientEmail = testEmail || "ebube.michael@overwatchmoz.com";
      const sampleCandidate = deduplicatedCandidates[0] || {
        id: "test-preview-candidate",
        name: "Candidata Teste (Exemplo)",
        email: recipientEmail,
        sex: "female",
        role: "cctv-operator",
      };

      const html = generateBroadcastHtml({
        candidateName: sampleCandidate.name,
        candidateId: sampleCandidate.id,
        message,
        includeBookingButton,
        buttonText,
        isFemale: sampleCandidate.sex === "female",
      });

      await sendTransactionalEmail({
        sender: { name: "Overwatch Recrutamento", email: "carreiras@overwatchmoz.com" },
        to: [{ email: recipientEmail, name: sampleCandidate.name }],
        subject: `[TESTE PREVIEW] ${subject}`,
        htmlContent: html,
        textContent: message,
      });

      return Response.json({
        success: true,
        testMode: true,
        recipient: recipientEmail,
        audienceCount: deduplicatedCandidates.length,
      });
    }

    // Execute live broadcast dispatch
    let sentCount = 0;
    const errors: { email: string; error: string }[] = [];

    for (const candidate of deduplicatedCandidates) {
      try {
        const html = generateBroadcastHtml({
          candidateName: candidate.name,
          candidateId: candidate.id,
          message,
          includeBookingButton,
          buttonText,
          isFemale: candidate.sex === "female",
        });

        await sendTransactionalEmail({
          sender: { name: "Overwatch Recrutamento", email: "carreiras@overwatchmoz.com" },
          to: [{ email: candidate.email.trim(), name: candidate.name.trim() }],
          subject: subject.trim(),
          htmlContent: html,
          textContent: message,
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

function generateBroadcastHtml(params: {
  candidateName: string;
  candidateId: string;
  message: string;
  includeBookingButton: boolean;
  buttonText: string;
  isFemale: boolean;
}) {
  const {
    candidateName,
    candidateId,
    message,
    includeBookingButton,
    buttonText,
    isFemale,
  } = params;

  // Convert plain text newlines to formatted HTML paragraphs and list items
  const formattedBody = message
    .split("\n\n")
    .map((paragraph) => {
      // Check if this paragraph contains bullet points
      if (paragraph.includes("\n•") || paragraph.includes("\n-") || paragraph.startsWith("•") || paragraph.startsWith("-")) {
        const lines = paragraph.split("\n");
        const listItems: string[] = [];
        let intro = "";

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
            listItems.push(`<li style="margin-bottom: 8px; color: #334155;">${trimmed.replace(/^[•-]\s*/, "")}</li>`);
          } else if (trimmed) {
            intro += `<p style="margin: 0 0 8px 0; color: #334155; line-height: 1.6;">${trimmed}</p>`;
          }
        });

        return `${intro}<ul style="margin: 8px 0 16px 20px; padding: 0;">${listItems.join("")}</ul>`;
      }

      // Check if numbered list (e.g. 1. 2. 3.)
      if (/^\d+\./m.test(paragraph)) {
        const lines = paragraph.split("\n");
        const listItems: string[] = [];
        let intro = "";

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (/^\d+\./.test(trimmed)) {
            listItems.push(`<li style="margin-bottom: 8px; color: #334155;">${trimmed.replace(/^\d+\.\s*/, "")}</li>`);
          } else if (trimmed) {
            intro += `<p style="margin: 0 0 8px 0; color: #334155; line-height: 1.6;">${trimmed}</p>`;
          }
        });

        return `${intro}<ol style="margin: 8px 0 16px 20px; padding: 0;">${listItems.join("")}</ol>`;
      }

      return `<p style="margin: 0 0 14px 0; color: #334155; line-height: 1.6;">${paragraph.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  const bookingUrl = `https://www.overwatchmoz.com/pt/careers/test-invite/${candidateId}`;

  const greeting = isFemale
    ? `Prezada ${candidateName.split(" ")[0]},`
    : `Prezado ${candidateName.split(" ")[0]},`;

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comunicação Oficial — Overwatch</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0b0f19; padding: 32px; text-align: center; border-bottom: 2px solid #0284c7;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">OVERWATCH</span>
                    <div style="font-size: 11px; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase; margin-top: 4px; font-weight: 600;">Direcção de Recursos Humanos & Operações</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">
                ${greeting}
              </div>

              <div style="font-size: 14.5px; color: #334155; line-height: 1.65;">
                ${formattedBody}
              </div>

              ${
                includeBookingButton
                  ? `
              <!-- Call to Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); text-align: center; letter-spacing: 0.3px;">
                      ${buttonText} &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <span style="font-size: 12px; color: #64748b;">
                      Link de acesso directo: <a href="${bookingUrl}" style="color: #0284c7; text-decoration: underline; word-break: break-all;">${bookingUrl}</a>
                    </span>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Address & Premises Notice -->
              <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  📍 Endereço Oficial das Instalações
                </div>
                <div style="font-size: 13px; color: #475569; line-height: 1.5;">
                  <strong>Overwatch Moçambique:</strong> Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.<br/>
                  <span style="font-size: 12px; color: #64748b;">(Acesso permitido estritamente mediante confirmação prévia e apresentação de documento de identificação com fotografia).</span>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; font-weight: 500;">
                Esta é uma comunicação oficial da Equipa de Recrutamento da Overwatch Moçambique.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                © 2026 Overwatch Moçambique. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
