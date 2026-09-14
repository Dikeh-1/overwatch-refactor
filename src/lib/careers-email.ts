import "server-only";
import nodemailer from "nodemailer";
import { roles, type Application } from "./careers";
import { siteContact } from "./site-config";

interface SendEmailOptions {
  sender?: { name: string; email: string };
  to: { email: string; name: string }[];
  cc?: { email: string; name: string }[];
  replyTo?: { name: string; email: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  attachment?: { name: string; content: string }[];
}

async function sendViaGmailSmtp(payload: SendEmailOptions) {
  const user = process.env.FALLBACK_SMTP_USER;
  const pass = process.env.FALLBACK_SMTP_PASS;
  if (!user || !pass) {
    throw new Error("Missing FALLBACK_SMTP_USER or FALLBACK_SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const attachments = payload.attachment?.map((att) => ({
    filename: att.name,
    content: Buffer.from(att.content, "base64"),
  }));

  const mailOptions = {
    from: `"${payload.sender?.name || "Overwatch Recrutamento"}" <${user}>`,
    to: payload.to.map((t) => t.email).join(", "),
    cc: payload.cc?.map((c) => c.email).join(", "),
    replyTo: payload.replyTo
      ? payload.replyTo.email
      : payload.sender?.email || "noreply@overwatchmoz.com",
    subject: payload.subject,
    html: payload.htmlContent,
    text: payload.textContent,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, provider: "gmail-smtp", messageId: info.messageId };
}

async function sendTransactionalEmail(payload: SendEmailOptions) {
  const fallbackUser = process.env.FALLBACK_SMTP_USER;
  const fallbackPass = process.env.FALLBACK_SMTP_PASS;
  const useFallback =
    process.env.EMAIL_PROVIDER === "fallback" ||
    process.env.EMAIL_PROVIDER === "gmail" ||
    !process.env.BREVO_API_KEY;

  if (useFallback && fallbackUser && fallbackPass) {
    return sendViaGmailSmtp(payload);
  }

  // Attempt Brevo
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        return { success: true, provider: "brevo" };
      }
      console.warn(`Brevo returned status ${res.status}, falling back to Gmail SMTP...`);
    } catch (err) {
      console.warn("Brevo request failed, falling back to Gmail SMTP:", err);
    }
  }

  // Auto-failover to Gmail SMTP
  if (fallbackUser && fallbackPass) {
    return sendViaGmailSmtp(payload);
  }

  throw new Error("No email provider available to send message.");
}

export async function notifyApplication(application: Application, cv: Buffer) {
  // Never dispatch test fixture emails to production inboxes
  if (
    (!process.env.BREVO_API_KEY && !process.env.FALLBACK_SMTP_PASS) ||
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
                  <td style="padding: 11px 0; font-size: 14px; font-weight: 600; color: #090d16;">
                    <a href="https://wa.me/${application.whatsapp.replace(/\D/g, "")}" style="color: #0284c7; text-decoration: underline;">${application.whatsapp} →</a>
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
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 600; color: ${application.ai === "yes" ? "#090d16" : "#64748b"};">${aiText}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Experiência CCTV / Seg.</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 600; color: ${application.experience === "yes" ? "#090d16" : "#64748b"};">${experienceText}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Última Profissão</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: #090d16;">${application.lastProfession}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Disponibilidade Turnos</td>
                  <td style="padding: 11px 0; font-size: 13px; font-weight: 500; color: ${application.shifts === "yes" ? "#090d16" : "#dc2626"};">${shiftsText}</td>
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
      try {
        await sendTransactionalEmail(payload);
      } catch (err) {
        console.error("Recruitment email delivery failed:", err);
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
    (!process.env.BREVO_API_KEY && !process.env.FALLBACK_SMTP_PASS) ||
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
        `<tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
            <span style="display: inline-block; width: 6px; height: 6px; background-color: #0f172a; border-radius: 50%; margin-right: 10px; vertical-align: middle;"></span>
            ${s}
          </td>
          <td style="padding: 10px 0; font-size: 12px; color: #64748b; text-align: right; font-weight: 500;">
            10h00 – 11h30
          </td>
        </tr>`,
    )
    .join("");

  const processedMessage = messageText
    .replace(/\{\{name\}\}/gi, application.name)
    .replace(/\{\{booking_link\}\}/gi, bookingUrl);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Convocatória Overwatch</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 36px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06); overflow: hidden;">
          
          <!-- Top Accent Line -->
          <div style="height: 4px; background-color: #090d16;"></div>

          <!-- Official Letterhead Header -->
          <div style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoUrl}" alt="Overwatch" height="26" style="height: 26px; width: auto; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; display: block;">
                    Recrutamento &amp; Selecção
                  </span>
                  <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 2px;">
                    Maputo, Moçambique
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px 32px 28px 32px;">
            <div style="font-size: 15px; line-height: 1.65; color: #334155; white-space: pre-line; margin-bottom: 24px;">
${processedMessage}
            </div>

            <!-- Available Slots Schedule Table -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 10px;">
                Opções de Turnos Disponíveis:
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                ${formattedSlotsHtml}
              </table>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0 20px 0;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #090d16; color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 34px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;">
                Confirmar Minha Presença no Teste &rarr;
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 8px;">
              Clique no botão acima para escolher a sua data. A sua vaga é reservada imediatamente no sistema.
            </p>

            <!-- Test Location & Protocol -->
            <div style="margin-top: 26px; padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.55;">
              <strong style="color: #090d16; font-size: 13px; display: block; margin-bottom: 6px;">
                Instruções para o Dia do Teste:
              </strong>
              <div style="margin-bottom: 4px;">
                • <strong>Local:</strong> Sede da Overwatch — ${siteContact.address.pt}
                (<a href="${mapsUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">Ver no Google Maps</a>)
              </div>
              <div style="margin-bottom: 4px;">
                • <strong>Documentos:</strong> Trazer documento de identificação original e válido (BI, Passaporte ou DIRE).
              </div>
              <div>
                • <strong>Material &amp; Horário:</strong> Trazer caneta esferográfica e chegar com 15 minutos de antecedência (às 09h45).
              </div>
            </div>

            <!-- Direct Link Fallback -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; word-break: break-all;">
              Se o botão não abrir, copie e cole este link no seu navegador:<br />
              <a href="${bookingUrl}" style="color: #0284c7; text-decoration: underline;">${bookingUrl}</a>
            </div>

            <!-- Formal Sign-Off -->
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
            Telefone / WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #0284c7; text-decoration: none;">${siteContact.email}</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject,
    htmlContent,
    textContent: `${processedMessage}\n\nEscolha a data do teste no seguinte link:\n${bookingUrl}\n\nLocal do Teste:\n${siteContact.address.pt}\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento\nOverwatch Moçambique`,
  };

  return sendTransactionalEmail(payload);
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
    (!process.env.BREVO_API_KEY && !process.env.FALLBACK_SMTP_PASS) ||
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
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Teste de Selecção</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 36px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06); overflow: hidden;">
          
          <!-- Official Top Accent Bar -->
          <div style="height: 4px; background-color: #090d16;"></div>

          <!-- Official Letterhead Header -->
          <div style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoUrl}" alt="Overwatch" height="26" style="height: 26px; width: auto; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #090d16; display: block;">
                    Presença Confirmada
                  </span>
                  <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 2px;">
                    Ref: CCO-2026/MAPUTO
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px 32px 28px 32px;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 8px 0;">
              Olá, ${application.name}
            </h1>
            <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.55;">
              Confirmamos a recepção da sua escolha de data. A sua presença no teste presencial de selecção para a vaga de <strong>Operadora de CCO</strong> está devidamente registada no nosso sistema.
            </p>

            <!-- Confirmation Details Card -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #090d16; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; width: 140px; text-transform: uppercase;">
                    Data e Hora:
                  </td>
                  <td style="padding: 6px 0; font-size: 15px; font-weight: 700; color: #090d16;">
                    ${slot}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">
                    Local:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 500; color: #334155;">
                    ${siteContact.address.pt}
                    <div style="margin-top: 4px;">
                      <a href="${mapsUrl}" target="_blank" style="color: #0284c7; font-size: 12px; text-decoration: underline;">
                        Ver localização no Google Maps &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">
                    Apresentação:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #090d16;">
                    09h45 (15 minutos antes do início)
                  </td>
                </tr>
              </table>
            </div>

            <!-- What to Bring -->
            <div style="padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.55; margin-bottom: 24px;">
              <strong style="color: #090d16; font-size: 13px; display: block; margin-bottom: 6px;">
                Requisitos Obrigatórios para o Teste:
              </strong>
              <div style="margin-bottom: 4px;">
                • Documento de identificação original e válido (BI / Passaporte / DIRE).
              </div>
              <div style="margin-bottom: 4px;">
                • Caneta esferográfica de tinta azul ou preta.
              </div>
              <div>
                • Pede-se pontualidade rigorosa para cumprimento das normas de acesso às instalações da Overwatch.
              </div>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
              Caso surja algum imprevisto e necessite de reagendar, utilize o seu link pessoal:<br />
              <a href="${bookingUrl}" style="color: #0284c7; text-decoration: underline;">${bookingUrl}</a>
            </p>

            <!-- Formal Sign-Off -->
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
            Telefone / WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #0284c7; text-decoration: none;">${siteContact.email}</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const payload = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject: "Presença Confirmada: Teste de Selecção Overwatch",
    htmlContent,
    textContent: `Olá, ${application.name}.\n\nA sua presença no teste presencial de Operadora de CCO está confirmada para:\n${slot}\n\nLocal:\n${siteContact.address.pt}\n\nRequisitos:\n- Trazer BI ou Passaporte original\n- Trazer caneta esferográfica\n- Chegar com 15 minutos de antecedência (09h45)\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento\nOverwatch Moçambique`,
  };

  return sendTransactionalEmail(payload);
}
