import "server-only";
import { roles, type Application } from "./careers";
import { siteContact } from "./site-config";

export async function notifyApplication(application: Application, cv: Buffer) {
  // Never dispatch test fixture emails to production inboxes
  if (
    !process.env.BREVO_API_KEY ||
    application.email.endsWith(".invalid") ||
    process.env.CAREERS_TEST_MODE === "true"
  ) {
    return;
  }

  const role = roles.find((r) => r.id === application.role) || {
    id: application.role,
    en: application.role,
    pt: application.role,
  };
  const isPt = application.locale === "pt";
  const cvSizeKB = Math.round(application.cvSize / 1024);

  const sender = {
    name: "Overwatch Careers",
    email: "noreply@overwatchmoz.com",
  };

  // Human-readable formatted labels
  const roleName = isPt ? role.pt : role.en;
  const grade12Text =
    application.grade12 === "yes"
      ? "Sim, 12.ª classe concluída"
      : "Não concluída";
  const sexText =
    application.sex === "female"
      ? "Feminino"
      : application.sex === "male"
        ? "Masculino"
        : application.sex;
  const aiText =
    application.ai === "yes"
      ? "Sim, tem conhecimento e sabe utilizar"
      : "Não, sem conhecimento prévio";
  const experienceText =
    application.experience === "yes"
      ? "Sim, possui experiência comprovada"
      : "Não, sem experiência anterior";
  const shiftsText =
    application.shifts === "yes"
      ? "Sim, disponível para escala 2 dias, 2 noites, 2 folgas"
      : "Não disponível para este regime";

  // 1. Professional Overwatch Branded HTML Template for HR / Operations Team
  const adminHtmlContent = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
      <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <!-- Brand Dark Monochrome Accent Bar -->
        <div style="height: 4px; background: #090d16;"></div>
        
        <!-- Header -->
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; display: block; margin-bottom: 4px;">Recrutamento Overwatch • Nova Candidatura</span>
          <h1 style="font-size: 22px; font-weight: 700; color: #090d16; margin: 0; letter-spacing: -0.01em;">${application.name}</h1>
          <p style="font-size: 14px; color: #64748b; margin: 6px 0 0 0;">Vaga pretendida: <strong style="color: #090d16;">${roleName}</strong></p>
        </div>

        <!-- Body Info -->
        <div style="padding: 32px;">
          <!-- Attached CV Callout Banner -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 12px;">📎</span>
            <div>
              <strong style="font-size: 13px; color: #166534; display: block;">Currículo (CV) Anexado a este E-mail</strong>
              <span style="font-size: 12px; color: #15803d;">Ficheiro: ${application.cvName} (${cvSizeKB} KB)</span>
            </div>
          </div>

          <!-- Applicant Details Table -->
          <div style="margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; width: 170px; text-transform: uppercase; letter-spacing: 0.04em;">Nome Completo</td>
                  <td style="padding: 11px 0; font-size: 14px; font-weight: 600; color: #090d16;">${application.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Endereço de E-mail</td>
                  <td style="padding: 11px 0; font-size: 14px; font-weight: 500; color: #090d16;"><a href="mailto:${application.email}" style="color: #090d16; text-decoration: underline;">${application.email}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">WhatsApp</td>
                  <td style="padding: 11px 0; font-size: 14px; font-weight: 600; color: #059669;">
                    <a href="https://wa.me/${application.whatsapp.replace(/\D/g, "")}" style="color: #059669; text-decoration: none;">${application.whatsapp} →</a>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">12.ª Classe</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: #090d16;">${grade12Text}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Género / Sexo</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: #090d16;">${sexText}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Sabe Usar IA?</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 600; color: ${application.ai === "yes" ? "#059669" : "#64748b"};">${aiText}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Experiência CCTV / Seg.</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 600; color: ${application.experience === "yes" ? "#059669" : "#64748b"};">${experienceText}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Última Profissão</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: #090d16;">${application.lastProfession}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Disponibilidade Turnos</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: ${application.shifts === "yes" ? "#059669" : "#dc2626"};">${shiftsText}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Data de Submissão</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: #64748b;">${new Date(application.createdAt).toLocaleString("pt-MZ")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cover Letter Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; display: block; margin-bottom: 8px;">Carta de Apresentação</span>
            <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
              ${application.coverLetter || "Nenhuma carta de apresentação submetida com esta candidatura."}
            </div>
          </div>

          <!-- Admin Portal Link Button -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://www.overwatchmoz.com/admin" style="display: inline-block; background-color: #090d16; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px; letter-spacing: 0.02em;">
              Aceder ao Painel de Recrutamento →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px 0;">O currículo do candidato segue anexado a esta mensagem.</p>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">© 2026 Overwatch Moçambique. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  `;

  // Fallback plain text version (cleanly formatted, no raw key-value code dumps)
  const adminTextContent = `NOVA CANDIDATURA OVERWATCH\n\n` +
    `Candidato: ${application.name}\n` +
    `Cargo Pretendido: ${roleName}\n` +
    `E-mail: ${application.email}\n` +
    `WhatsApp: ${application.whatsapp}\n` +
    `12.ª Classe: ${grade12Text}\n` +
    `Género: ${sexText}\n` +
    `Sabe Usar Inteligência Artificial: ${aiText}\n` +
    `Experiência CCTV / Segurança: ${experienceText}\n` +
    `Última Profissão: ${application.lastProfession}\n` +
    `Disponibilidade para Turnos (2D/2N/2F): ${shiftsText}\n\n` +
    `Currículo Anexo: ${application.cvName} (${cvSizeKB} KB)\n\n` +
    `Carta de Apresentação:\n${application.coverLetter || "Não enviada."}\n\n` +
    `Painel de Gestão: https://www.overwatchmoz.com/admin`;

  // 2. Professional Branded Auto-Responder for Candidate
  const candidateSubject = isPt
    ? `Candidatura Recebida — Overwatch (${role.pt})`
    : `Application Received — Overwatch (${role.en})`;

  const candidateCopy = isPt
    ? {
        title: "Candidatura Registada com Sucesso",
        greeting: `Olá ${application.name},`,
        p1: `Confirmamos a recepção da sua candidatura para a vaga de <strong>${role.pt}</strong> na Overwatch, juntamente com o seu currículo.`,
        p2: "A nossa equipa de operações de segurança e recursos humanos está a analisar o seu perfil e as suas qualificações.",
        p3: "Caso o seu perfil seja selecionado para a fase de entrevistas, entraremos em contacto directamente consigo através de WhatsApp ou por este endereço de e-mail.",
        ref: `Referência da candidatura: <strong>${application.id.slice(0, 8).toUpperCase()}</strong>`,
        noticeTitle: "Informação Importante",
        notice: "Esta é uma confirmação automática de recepção. Por favor não responda directamente a este e-mail.",
        enquiries: `Para quaisquer esclarecimentos adicionais, contacte-nos através de <a href="mailto:${siteContact.email}" style="color: #090d16; font-weight: 600;">${siteContact.email}</a>.`,
        team: "Equipa de Recrutamento & Operações",
        company: "Overwatch Moçambique",
      }
    : {
        title: "Application Successfully Received",
        greeting: `Hello ${application.name},`,
        p1: `We have successfully received your application for the position of <strong>${role.en}</strong> at Overwatch, along with your resume.`,
        p2: "Our security operations and human resources team is currently reviewing your application and background.",
        p3: "If your profile matches our requirements for the interview stage, we will contact you directly via WhatsApp or this email address.",
        ref: `Application Reference: <strong>${application.id.slice(0, 8).toUpperCase()}</strong>`,
        noticeTitle: "Important Notice",
        notice: "This is an automated delivery confirmation. Please do not reply directly to this email address.",
        enquiries: `For any inquiries, reach us at <a href="mailto:${siteContact.email}" style="color: #090d16; font-weight: 600;">${siteContact.email}</a>.`,
        team: "Recruitment & Operations Team",
        company: "Overwatch Mozambique",
      };

  const candidateHtmlContent = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <!-- Brand Dark Monochrome Accent Bar -->
        <div style="height: 4px; background: #090d16;"></div>
        
        <!-- Body Content -->
        <div style="padding: 32px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #090d16; margin: 0 0 16px 0;">${candidateCopy.title}</h1>
          <p style="margin: 0 0 12px 0;">${candidateCopy.greeting}</p>
          <p style="margin: 0 0 12px 0;">${candidateCopy.p1}</p>
          <p style="margin: 0 0 12px 0;">${candidateCopy.p2}</p>
          <p style="margin: 0 0 16px 0;">${candidateCopy.p3}</p>
          
          <div style="margin: 20px 0; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #334155;">
            ${candidateCopy.ref}
          </div>

          <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #cbd5e1; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">${candidateCopy.noticeTitle}</p>
            <p style="margin: 0 0 8px 0; line-height: 1.5;">${candidateCopy.notice}</p>
            <p style="margin: 0; line-height: 1.5;">${candidateCopy.enquiries}</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 14px; font-weight: 600; color: #090d16; margin: 0;">${candidateCopy.team}</p>
          <p style="font-size: 13px; color: #94a3b8; margin: 2px 0 0 0;">${candidateCopy.company}</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">© 2026 ${candidateCopy.company}. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  `;

  // Standardize file name for email attachment
  const safeCvName = application.cvName.replace(/[^\w.-]/g, "_");

  const payloads = [
    // 1. Email to HR/Operations with attached CV
    {
      sender,
      to: [{ email: "filipa@overwatchmoz.com", name: "Filipa" }],
      cc: [
        { email: siteContact.email, name: "Overwatch Operations" },
        { email: "ebube.michael@overwatchmoz.com", name: "Ebube Michael" },
      ],
      replyTo: { name: application.name, email: application.email },
      subject: `[Candidatura] ${roleName} — ${application.name}`,
      htmlContent: adminHtmlContent,
      textContent: adminTextContent,
      attachment: [
        {
          name: safeCvName,
          content: cv.toString("base64"),
        },
      ],
    },
    // 2. Candidate auto-responder confirmation
    {
      sender,
      to: [{ email: application.email, name: application.name }],
      subject: candidateSubject,
      htmlContent: candidateHtmlContent,
      textContent: `${candidateCopy.greeting}\n\n${candidateCopy.p1.replace(/<[^>]+>/g, "")}\n\n${candidateCopy.p2}\n\n${candidateCopy.ref.replace(/<[^>]+>/g, "")}\n\n${candidateCopy.team}\n${candidateCopy.company}`,
    },
  ];

  await Promise.allSettled(
    payloads.map(async (payload) => {
      const result = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok) {
        const errText = await result.text().catch(() => "");
        console.error("Recruitment email delivery failed", result.status, errText);
      }
    }),
  );
}

export async function sendTestInvitation({
  application,
  subject,
  messageText,
  slots,
  baseUrl,
}: {
  application: Application;
  subject: string;
  messageText: string;
  slots: string[];
  baseUrl?: string;
}) {
  if (
    !process.env.BREVO_API_KEY ||
    application.email.endsWith(".invalid") ||
    process.env.CAREERS_TEST_MODE === "true"
  ) {
    return { success: true, mocked: true };
  }

  const origin = (
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.overwatchmoz.com"
  ).replace(/\/+$/, "");
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;
  const logoUrl = `${origin}/logo.png`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(siteContact.address.pt)}`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const formattedSlotsHtml = slots
    .map(
      (s) =>
        `<li style="margin-bottom: 8px; padding: 11px 16px; background: #0f1422; border-radius: 8px; border-left: 3px solid #10b981; font-weight: 600; color: #f8fafc; font-size: 14px;">${s}</li>`,
    )
    .join("");

  const processedMessage = messageText
    .replace(/\{\{name\}\}/gi, application.name)
    .replace(/\{\{booking_link\}\}/gi, bookingUrl);

  const htmlContent = `
    <div style="background-color: #090d16; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #121827; border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div style="height: 4px; background: linear-gradient(90deg, #10b981, #06b6d4, #3b82f6);"></div>
        <div style="padding: 36px 30px;">
          <!-- Dynamic Logo Frame -->
          <div style="text-align: center; margin-bottom: 26px;">
            <div style="display: inline-block; background-color: #ffffff; padding: 12px 26px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2);">
              <img src="${logoUrl}" alt="Overwatch Moçambique" height="32" style="height: 32px; width: auto; display: block; margin: 0 auto; border: 0;" />
            </div>
            <div style="margin-top: 14px;">
              <span style="display: inline-block; padding: 5px 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.06em;">
                Convocatória Oficial · Teste Presencial
              </span>
            </div>
          </div>

          <div style="color: #cbd5e1; font-size: 15px; line-height: 1.65; white-space: pre-line; margin-bottom: 24px;">
${processedMessage}
          </div>

          <div style="background: #090d16; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 12px;">
              Opções de Data e Hora Disponíveis:
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${formattedSlotsHtml}
            </ul>
          </div>

          <!-- 1-Click Action Button -->
          <div style="text-align: center; margin: 32px 0 20px 0;">
            <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #090d16; font-size: 15px; font-weight: 700; padding: 15px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(255,255,255,0.2);">
              Escolher Data do Teste Presencial &rarr;
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 10px;">
            Clique no botão acima para escolher a sua data. A sua vaga é reservada imediatamente.
          </p>

          <!-- Location & Company Address Card -->
          <div style="background: #090d16; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; margin-top: 26px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #10b981; margin-bottom: 6px;">
              Local do Teste Presencial:
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #ffffff;">
              Overwatch Moçambique
            </div>
            <div style="font-size: 13px; color: #cbd5e1; margin-top: 2px; line-height: 1.5;">
              ${siteContact.address.pt}
            </div>
            <div style="margin-top: 8px;">
              <a href="${mapsUrl}" target="_blank" style="color: #38bdf8; font-size: 12px; text-decoration: underline;">
                Abrir localização no Google Maps &rarr;
              </a>
            </div>
          </div>

          <!-- Direct Link Fallback -->
          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #64748b; word-break: break-all;">
            Se o botão não funcionar no seu aplicativo, aceda diretamente através deste link:<br />
            <a href="${bookingUrl}" style="color: #38bdf8; text-decoration: underline;">${bookingUrl}</a>
          </div>
        </div>

        <!-- Branded Full Address & Contacts Footer -->
        <div style="background-color: #090d16; padding: 22px 28px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;">
          <strong style="color: #cbd5e1; font-size: 13px;">Overwatch Moçambique</strong><br />
          ${siteContact.address.pt}<br />
          WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #34d399; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #38bdf8; text-decoration: none;">${siteContact.email}</a><br />
          Website: <a href="${origin}" style="color: #94a3b8; text-decoration: none;">www.overwatchmoz.com</a>
        </div>
      </div>
    </div>
  `;

  const payload = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject,
    htmlContent,
    textContent: `${processedMessage}\n\nEscolha a data do teste no seguinte link:\n${bookingUrl}\n\nLocal do Teste:\n${siteContact.address.pt}\n\nAtenciosamente,\nEquipa de Recrutamento\nOverwatch Moçambique`,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Brevo delivery failed (${res.status}): ${errorText}`);
  }

  return { success: true };
}

export async function sendBookingConfirmation({
  application,
  slot,
  baseUrl,
}: {
  application: Application;
  slot: string;
  baseUrl?: string;
}) {
  if (
    !process.env.BREVO_API_KEY ||
    application.email.endsWith(".invalid") ||
    process.env.CAREERS_TEST_MODE === "true"
  ) {
    return { success: true, mocked: true };
  }

  const origin = (
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.overwatchmoz.com"
  ).replace(/\/+$/, "");
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;
  const logoUrl = `${origin}/logo.png`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(siteContact.address.pt)}`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const htmlContent = `
    <div style="background-color: #090d16; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #121827; border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div style="height: 4px; background: #10b981;"></div>
        <div style="padding: 36px 30px;">
          <!-- Dynamic Logo Frame -->
          <div style="text-align: center; margin-bottom: 26px;">
            <div style="display: inline-block; background-color: #ffffff; padding: 12px 26px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2);">
              <img src="${logoUrl}" alt="Overwatch Moçambique" height="32" style="height: 32px; width: auto; display: block; margin: 0 auto; border: 0;" />
            </div>
            <div style="margin-top: 14px;">
              <span style="display: inline-block; padding: 5px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; font-size: 12px; font-weight: 700; color: #10b981; text-transform: uppercase;">
                ✓ Presença Confirmada no Teste
              </span>
            </div>
          </div>

          <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 8px;">
            Olá, ${application.name}
          </h2>
          <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 28px;">
            A sua presença no teste presencial de selecção para <strong>Operadora de CCO</strong> está confirmada.
          </p>

          <div style="background: #090d16; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 22px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 0.05em;">Data e Hora Confirmada:</span>
              <div style="font-size: 17px; font-weight: 700; color: #ffffff; margin-top: 2px;">
                ${slot}
              </div>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;">Local do Teste:</span>
              <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 2px;">
                ${siteContact.address.pt}
              </div>
              <a href="${mapsUrl}" target="_blank" style="display: inline-block; margin-top: 6px; font-size: 12px; color: #38bdf8; text-decoration: underline;">
                Abrir localização no Google Maps &rarr;
              </a>
            </div>
            <div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;">Requisitos para o Teste:</span>
              <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 13px; color: #cbd5e1;">
                <li>Trazer documento de identificação original e válido (BI / Passaporte / DIRE).</li>
                <li>Trazer caneta esferográfica de tinta azul ou preta.</li>
                <li>Chegar com <strong>15 minutos de antecedência</strong> (09h45).</li>
              </ul>
            </div>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
            Caso necessite de alterar a sua data, utilize o link pessoal:<br />
            <a href="${bookingUrl}" style="color: #38bdf8; text-decoration: underline;">${bookingUrl}</a>
          </p>
        </div>

        <!-- Branded Full Address & Contacts Footer -->
        <div style="background-color: #090d16; padding: 22px 28px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;">
          <strong style="color: #cbd5e1; font-size: 13px;">Overwatch Moçambique</strong><br />
          ${siteContact.address.pt}<br />
          WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #34d399; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #38bdf8; text-decoration: none;">${siteContact.email}</a><br />
          Website: <a href="${origin}" style="color: #94a3b8; text-decoration: none;">www.overwatchmoz.com</a>
        </div>
      </div>
    </div>
  `;

  const payload = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject: "Presença Confirmada: Teste de Selecção Overwatch",
    htmlContent,
    textContent: `Olá, ${application.name}.\n\nA sua presença no teste presencial de Operadora de CCO está confirmada para:\n${slot}\n\nLocal:\n${siteContact.address.pt}\n\nRequisitos:\n- Trazer BI ou Passaporte\n- Trazer caneta esferográfica\n- Chegar 15 minutos antes\n\nAtenciosamente,\nEquipa de Recrutamento\nOverwatch Moçambique`,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("Booking confirmation delivery failed", res.status, errorText);
  }

  return { success: true };
}
