import "server-only";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { roles, type Application, formatSlotDisplay } from "./careers";
import { siteContact } from "./site-config";

/** Compute time-based greeting in Mozambique (UTC+2) at the moment of sending */
function getMozambiqueGreeting(lang: "pt" | "en" = "pt"): string {
  const h = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Maputo" })
  ).getHours();
  if (h >= 5 && h < 12) return lang === "pt" ? "Bom dia" : "Good morning";
  if (h >= 12 && h < 18) return lang === "pt" ? "Boa tarde" : "Good afternoon";
  return lang === "pt" ? "Boa noite" : "Good evening";
}

/** Admin email optionally BCC'd on candidate emails if explicitly set in environment */
const ADMIN_BCC_EMAIL = process.env.ADMIN_BCC_EMAIL ? process.env.ADMIN_BCC_EMAIL.trim() : "";

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

  const mailOptions: Record<string, unknown> = {
    from: `"${payload.sender?.name || "Overwatch"}" <${user}>`,
    to: payload.to.map((t) => t.email).join(", "),
    replyTo: payload.replyTo
      ? payload.replyTo.email
      : payload.sender?.email || "info@overwatchmoz.com",
    subject: payload.subject,
    html: payload.htmlContent,
    text: payload.textContent,
    attachments,
  };

  if (payload.cc && payload.cc.length > 0) {
    mailOptions.cc = payload.cc.map((c) => c.email).join(", ");
  }

  if (ADMIN_BCC_EMAIL) {
    mailOptions.bcc = ADMIN_BCC_EMAIL;
  }

  const info = await transporter.sendMail(mailOptions);
  return { success: true, provider: "gmail-smtp", messageId: info.messageId };
}

const brevoCreditsCache = new Map<string, { hasCredits: boolean; checkedAt: number }>();

async function checkBrevoAccountCredits(apiKey: string): Promise<boolean> {
  const now = Date.now();
  const cached = brevoCreditsCache.get(apiKey);
  if (cached && now - cached.checkedAt < 3 * 60 * 1000) {
    return cached.hasCredits;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      brevoCreditsCache.set(apiKey, { hasCredits: false, checkedAt: now });
      return false;
    }
    const data = await res.json();
    const sendLimitPlan = data?.plan?.find(
      (p: { creditsType?: string; type?: string }) =>
        p.creditsType === "sendLimit" || p.type === "free",
    );
    const credits =
      typeof sendLimitPlan?.credits === "number" ? sendLimitPlan.credits : 0;
    const hasCredits = credits > 0;
    brevoCreditsCache.set(apiKey, { hasCredits, checkedAt: now });
    if (!hasCredits) {
      console.warn(`[Email Provider] Brevo key ending ...${apiKey.slice(-6)} has ${credits} credits remaining.`);
    }
    return hasCredits;
  } catch {
    return false;
  }
}

async function sendViaBrevo(
  apiKey: string,
  payload: SendEmailOptions,
  outgoingSender: { name: string; email: string },
) {
  const brevoPayload: Record<string, unknown> = {
    ...payload,
    sender: outgoingSender,
  };
  if (ADMIN_BCC_EMAIL) {
    brevoPayload.bcc = [{ email: ADMIN_BCC_EMAIL, name: "Overwatch Admin" }];
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(brevoPayload),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Brevo API error ${res.status}: ${errText}`);
  }
  return { success: true, provider: "brevo" };
}

export async function sendTransactionalEmail(payload: SendEmailOptions) {
  const fallbackUser = process.env.FALLBACK_SMTP_USER;
  const fallbackPass = process.env.FALLBACK_SMTP_PASS;
  const hasGmailSmtp = Boolean(fallbackUser && fallbackPass);

  const defaultSender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };
  const outgoingSender = payload.sender?.email ? payload.sender : defaultSender;

  const primaryBrevoKey = process.env.BREVO_API_KEY?.trim();
  const secondaryBrevoKey = (
    process.env.BREVO_API_KEY_BACKUP ||
    process.env.BREVO_API_KEY_SECONDARY ||
    ""
  ).trim();

  // If Gmail SMTP is explicitly forced via EMAIL_PROVIDER=gmail
  if (hasGmailSmtp && process.env.EMAIL_PROVIDER === "gmail") {
    return sendViaGmailSmtp({ ...payload, sender: outgoingSender });
  }

  // ─── TIER 1: Primary Brevo Account ──────────────────────────────────
  if (primaryBrevoKey && (await checkBrevoAccountCredits(primaryBrevoKey))) {
    try {
      return await sendViaBrevo(primaryBrevoKey, payload, outgoingSender);
    } catch (err) {
      console.warn("[Failover] Tier 1 Primary Brevo failed. Attempting Tier 2 Secondary Brevo:", err);
    }
  }

  // ─── TIER 2: Secondary Brevo Account (New Backup) ───────────────────
  if (secondaryBrevoKey && (await checkBrevoAccountCredits(secondaryBrevoKey))) {
    try {
      return await sendViaBrevo(secondaryBrevoKey, payload, outgoingSender);
    } catch (err) {
      console.warn("[Failover] Tier 2 Secondary Brevo failed. Falling back to Tier 3 Gmail SMTP:", err);
    }
  }

  // ─── TIER 3: Gmail SMTP (Final High-Reliability Failover) ───────────
  if (hasGmailSmtp) {
    return sendViaGmailSmtp({ ...payload, sender: outgoingSender });
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
      to: [
        { email: "filipa@overwatchmoz.com", name: "Filipa" },
      ],
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
  const logoWhiteUrl = `${origin}/logo-white.png`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(siteContact.address.pt)}`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const formattedSlotsHtml = slots
    .map(
      (s, idx) =>
        `<tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0f172a;">
            ${s}
          </td>
          <td style="padding: 10px 14px; text-align: right;">
            <span style="font-family: monospace; font-size: 10px; color: #64748b; background-color: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              Opção 0${idx + 1}
            </span>
          </td>
        </tr>`,
    )
    .join("");

  const greetingPt = getMozambiqueGreeting("pt");
  let processedMessage = messageText
    .replace(/\{\{greeting\}\}/gi, greetingPt)
    .replace(/\{\{name\}\}/gi, application.name)
    .replace(/\{\{booking_link\}\}/gi, bookingUrl);

  // If message starts with hardcoded greeting, auto-update to current Mozambique time greeting
  processedMessage = processedMessage.replace(/^(Boa tarde|Bom dia|Boa noite)(,?)/i, `${greetingPt}$2`);

  const processedMessageHtml = processedMessage
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p style=\"margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;\">")
    .replace(/\n/g, "<br />");

  const messageHtmlWrapped = `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">${processedMessageHtml}</p>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">
          
          <!-- Official Letterhead Header (Dark Navy) -->
          <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoWhiteUrl}" alt="Overwatch" height="22" width="147" style="height: 22px; width: auto; max-width: 145px; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                    REF: CCO-2026/MAPUTO
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Departamento de Recursos Humanos
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Official Subheading Bar -->
          <div style="background-color: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; font-size: 11px;">
                  CONVOCATÓRIA OFICIAL · TESTE DE SELECÇÃO PRESENCIAL
                </td>
                <td style="text-align: right; color: #64748b; font-size: 11px;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content (Clean White) -->
          <div style="padding: 24px 20px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              ${messageHtmlWrapped}
            </div>

            <!-- Available Slots Schedule Table -->
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 22px 0;">
              <div style="background-color: #f8fafc; padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
                Turnos Disponíveis (10h00 – 11h30):
              </div>
              <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                ${formattedSlotsHtml}
              </table>
            </div>

            <!-- Action Button (Dark Navy) -->
            <div style="text-align: center; margin: 26px 0 16px 0;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; font-size: 13px; font-weight: 700; padding: 13px 30px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;">
                Confirmar Minha Presença no Teste &rarr;
              </a>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
                Clique no botão acima para escolher a sua data no sistema.
              </div>
              <div style="font-size: 11px; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; display: inline-block; margin-top: 10px; font-weight: 600;">
                ⚠️ O agendamento é de utilização única. Uma vez confirmada a data, a escolha é definitiva e não poderá ser alterada.
              </div>
            </div>

            <!-- Security Notice Box -->
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #713f12; line-height: 1.6; margin-top: 22px;">
              <strong style="display: block; margin-bottom: 5px; color: #854d0e; font-size: 12px;">Nota de Segurança:</strong>
              Apresente documento de identificação original (BI/Passaporte) na portaria da Overwatch para entrada autorizada.
            </div>
          </div>

          <!-- Sign-Off & Official Footer -->
          <div style="background-color: #f8fafc; padding: 14px 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <strong style="color: #0f172a;">Equipa de Recrutamento</strong> · Overwatch Moçambique
                </td>
                <td style="text-align: right; font-family: monospace; color: #94a3b8; font-size: 10px;">
                  Maputo, MZ
                </td>
              </tr>
            </table>
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

export async function sendGatePassEmail({
  application,
  slot,
  baseUrl,
  isReminder = false,
  messageText,
  subject,
}: {
  application: Application;
  slot?: string;
  baseUrl?: string;
  isReminder?: boolean;
  messageText?: string;
  subject?: string;
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

  const logoWhiteUrl = `${origin}/logo-white.png`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    "Av. Paulo Samuel Kankhomba nº 1948, Maputo"
  )}`;
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;
  const checkInUrl = `${origin}/gate?id=${application.id}`;
  const rawSlot = slot || application.testSlot || "Quarta-feira, 16 de Setembro – 10h00";
  const activeSlot = formatSlotDisplay(rawSlot, "pt") || rawSlot;

  // Generate official high-res QR code PNG buffer and base64 string
  let qrBase64 = "";
  try {
    const qrBuffer = await QRCode.toBuffer(checkInUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: "#07090e",
        light: "#ffffff",
      },
    });
    qrBase64 = qrBuffer.toString("base64");
  } catch (err) {
    console.error("Failed to generate QR buffer for email:", err);
  }

  const qrDataUri = qrBase64 ? `data:image/png;base64,${qrBase64}` : "";
  const greeting = getMozambiqueGreeting("pt");

  const outgoingSubject =
    subject ||
    (isReminder
      ? `Lembrete: O seu teste presencial da Overwatch é amanhã — Traga o seu Passe QR`
      : `Passe Oficial de Acesso: Teste Presencial Overwatch — Apresentação Obrigatória na Portaria`);

  const refBadge = isReminder ? "REF: CCO-2026/LEMBRETE" : "REF: CCO-2026/PASSE-PORTARIA";
  const subHeading = isReminder
    ? "LEMBRETE OFICIAL · TESTE DE SELECÇÃO AMANHÃ"
    : "PASSE DIGITAL DE ENTRADA · CONTROLO DE ACESSO";

  const safeName = (application.name || "candidata")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d-]/g, "_");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${outgoingSubject}</title>
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
                    ${refBadge}
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Departamento de Segurança &amp; Recursos Humanos
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
                  ${subHeading}
                </td>
                <td style="text-align: right; color: #64748b;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 24px; background-color: #ffffff;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 10px 0;">
              ${greeting}, ${application.name}
            </h1>
            
            <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.6;">
              ${
                isReminder
                  ? `Lembramos que o seu <strong>Teste Presencial de Selecção</strong> para a vaga de <strong>Operadora de CCO</strong> da Overwatch Moçambique está agendado para <strong>amanhã</strong>.`
                  : `Disponibilizamos abaixo o seu <strong>Passe Oficial de Acesso com Código QR</strong> para o Teste Presencial de Selecção Técnica para a vaga de <strong>Operadora de CCO</strong>.`
              }
            </p>

            <!-- MANDATORY ACCESS NOTICE (Amber/Yellow alert card) -->
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <strong style="font-size: 13px; color: #854d0e; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                ⚠️ REGRA OBRIGATÓRIA DE ACESSO À PORTARIA DA OVERWATCH
              </strong>
              <p style="font-size: 13px; color: #713f12; margin: 0 0 8px 0; line-height: 1.55;">
                O controlo de acesso às nossas instalações é estritamente fiscalizado pelo posto de segurança. <strong>Para ter autorização de entrada na sede da empresa, é obrigatório apresentar este Código QR na portaria</strong> ao agente de segurança para validação da sua vaga.
              </p>
              <div style="font-size: 12px; color: #854d0e; line-height: 1.5; padding-top: 6px; border-top: 1px dashed #fde047;">
                • <strong>Poderá apresentar uma CÓPIA DIGITAL:</strong> Exibindo o código QR directamente no ecrã do seu telemóvel.<br />
                • <strong>OU uma CÓPIA IMPRESSA:</strong> Imprimindo em papel este passe ou o ficheiro de imagem anexado a este e-mail.
              </div>
            </div>

            <!-- SECURITY PASS GRAPHIC CARD (Dark High-Tech Card) -->
            <div style="background: linear-gradient(180deg, #0b1329 0%, #07090e 100%); border: 2px solid #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; color: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.18);">
              <div style="font-family: monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #34d399; font-weight: 700; margin-bottom: 4px;">
                OVERWATCH MOÇAMBIQUE · PASSE DIGITAL DE ENTRADA
              </div>
              <div style="font-size: 19px; font-weight: 800; color: #ffffff; margin-bottom: 4px; letter-spacing: -0.01em;">
                ${application.name}
              </div>
              <div style="font-size: 12px; color: #94a3b8; font-family: monospace; margin-bottom: 18px;">
                Vaga: Operadora de CCO · ID: ${application.id.slice(0, 8).toUpperCase()}
              </div>

              <!-- White QR Box for 100% Reliable Scanner Contrast -->
              <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
                ${
                  qrDataUri
                    ? `<img src="${qrDataUri}" alt="Código QR de Acesso - ${application.name}" width="220" height="220" style="display: block; width: 220px; height: 220px; margin: 0 auto; border: 0;" />`
                    : `<div style="width: 220px; height: 220px; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b;">Consulte no link abaixo</div>`
                }
                <div style="font-size: 11px; font-family: monospace; color: #090d16; font-weight: 700; margin-top: 10px; letter-spacing: 0.02em;">
                  📅 ${activeSlot}
                </div>
              </div>

              <div style="margin-top: 16px; font-size: 11px; color: #94a3b8;">
                Apresente este passe ao guarda na portaria para validação electrónica instantânea.
              </div>
            </div>

            <!-- OFFICIAL SESSION DETAILS TABLE -->
            <div style="border: 1px solid #cbd5e1; border-left: 4px solid #0b1329; border-radius: 8px; background-color: #f8fafc; padding: 18px 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; width: 140px; text-transform: uppercase;">
                    📅 Data do Teste:
                  </td>
                  <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #090d16;">
                    ${activeSlot}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    ⏰ Horário do Teste:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #090d16;">
                    10h00 às 11h30
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    ⏱️ Chegada Obrigatória:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #047857;">
                    09h30 (30 minutos antes do início)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">
                    🚫 Encerramento Portão:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #b91c1c;">
                    09h50 impreterivelmente
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; vertical-align: top;">
                    📍 Local:
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #334155; line-height: 1.45;">
                    <strong>Overwatch Moçambique</strong><br />
                    ${siteContact.address.pt}<br />
                    <a href="${mapsUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600; font-size: 12px; display: inline-block; margin-top: 4px;">
                      Ver localização no Google Maps &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <!-- MANDATORY CHECKLIST BOX -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
              <strong style="font-size: 13px; color: #090d16; display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">
                📋 O que deve trazer obrigatoriamente:
              </strong>
              <div style="font-size: 13px; color: #334155; line-height: 1.6;">
                • <strong>Passe de Entrada QR Code:</strong> No telemóvel ou cópia impressa.<br />
                • <strong>Documento de Identificação Original e Válido:</strong> BI, Passaporte ou DIRE (cópias não autenticadas ou fotos não são aceites).<br />
                • <strong>Caneta esferográfica:</strong> De tinta azul ou preta.<br />
                • <strong>Pontualidade:</strong> A tolerância de chegada é estrita devido ao limite diário de candidatas por sessão.
              </div>
            </div>

            <!-- DIRECT ONLINE PORTAL LINK BUTTON -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(11, 19, 41, 0.25); letter-spacing: 0.02em;">
                Aceder ao Meu Passe Online / Descarregar &rarr;
              </a>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
                Pode aceder a qualquer momento a este link pessoal para guardar a imagem ou imprimir o passe.
              </div>
            </div>

            <!-- Formal Sign-Off -->
            <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
              Contamos com a sua presença pontual e desejamos-lhe boa sorte no seu teste.<br /><br />
              Com os melhores cumprimentos,<br />
              <strong style="color: #090d16;">Equipa de Segurança &amp; Recrutamento</strong><br />
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

  const textContent = `${greeting}, ${application.name}.

${
  isReminder
    ? "Lembramos que o seu Teste Presencial de Selecção para a vaga de Operadora de CCO da Overwatch Moçambique é amanhã."
    : "Disponibilizamos o seu Passe Oficial de Acesso com Código QR para o Teste Presencial de Selecção Técnica da Overwatch Moçambique."
}

REGRA OBRIGATÓRIA DE ACESSO À PORTARIA:
Para ter autorização de entrada nas instalações da Overwatch, é indispensável apresentar o seu Código QR na portaria.
Poderá apresentar uma CÓPIA DIGITAL (no ecrã do telemóvel) ou uma CÓPIA IMPRESSA (anexada a este e-mail).

DETALHES DO TESTE:
- Data & Turno: ${activeSlot}
- Horário do Teste: 10h00 às 11h30
- Chegada Obrigatória: 09h30 (30 minutos antes)
- Encerramento do Portão: 09h50 impreterivelmente
- Local: Overwatch Moçambique — ${siteContact.address.pt}

O QUE DEVE TRAZER:
1. Passe de Acesso QR Code (digital ou impresso)
2. Documento de Identificação Original e Válido (BI / Passaporte / DIRE)
3. Caneta esferográfica azul ou preta

Consulte e descarregue o seu passe a qualquer momento no seu link pessoal:
${bookingUrl}

Com os melhores cumprimentos,
Equipa de Segurança & Recrutamento
Overwatch Moçambique`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const payload: SendEmailOptions = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject: outgoingSubject,
    htmlContent,
    textContent,
  };

  if (qrBase64) {
    payload.attachment = [
      {
        name: `Passe-Acesso-Overwatch-${safeName}.png`,
        content: qrBase64,
      },
    ];
  }

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
  return sendGatePassEmail({
    application,
    slot,
    baseUrl,
    isReminder: false,
  });
}

export async function sendCustomBookingConfirmation({
  application,
  slot,
  messageText,
  subject,
  baseUrl,
}: {
  application: Application;
  slot: string;
  messageText?: string;
  subject?: string;
  baseUrl?: string;
}) {
  return sendGatePassEmail({
    application,
    slot,
    messageText,
    subject,
    baseUrl,
    isReminder: false,
  });
}


export async function sendDisqualificationEmail({
  application,
  reason,
  baseUrl,
}: {
  application: Application;
  reason?: string;
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
  const logoWhiteUrl = `${origin}/logo-white.png`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const greeting = getMozambiqueGreeting("pt");
  const defaultReason =
    "Não cumprimento da totalidade dos requisitos eliminatórios do concurso (submissão de carta de apresentação e/ou comprovação curricular de experiência em sistemas de CCTV para candidatos masculinos).";
  const finalReason = reason || defaultReason;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Actualização de Candidatura — Overwatch Moçambique</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">
          
          <!-- Official Letterhead Header (Dark Navy) -->
          <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoWhiteUrl}" alt="Overwatch" height="22" width="147" style="height: 22px; width: auto; max-width: 145px; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                    REF: CCO-2026/MAPUTO
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Departamento de Recursos Humanos
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Official Subheading Bar -->
          <div style="background-color: #f8fafc; padding: 10px 24px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #334155;">
                  NOTIFICAÇÃO OFICIAL · PROCESSO DE SELECÇÃO
                </td>
                <td style="text-align: right; color: #64748b;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content (Clean White) -->
          <div style="padding: 28px 24px; background-color: #ffffff;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 12px 0;">
              ${greeting} ${application.name},
            </h1>
            <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
              Agradecemos a sua candidatura e o interesse demonstrado em integrar a equipa de Operadoras de CCO da <strong>Overwatch Moçambique</strong>.
            </p>
            <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
              Após verificação detalhada da conformidade da sua candidatura com os requisitos formais e eliminatórios do concurso, informamos que o seu perfil não preenche os critérios obrigatórios definidos pela direcção para avançar para a fase de testes presenciais.
            </p>

            <!-- Disqualification Reason Box -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <strong style="font-size: 12px; color: #991b1b; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
                Motivo da Decisão:
              </strong>
              <div style="font-size: 13px; color: #7f1d1d; line-height: 1.5;">
                ${finalReason}
              </div>
            </div>

            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.55;">
              Nestes termos, qualquer agendamento de teste anteriormente registado fica sem efeito e a sua candidatura foi arquivada na nossa base de dados.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 24px 0; line-height: 1.55;">
              Agradecemos o tempo dedicado ao processo e desejamos-lhe os maiores sucessos nos seus projectos futuros e na sua carreira profissional.
            </p>

            <!-- Formal Sign-Off -->
            <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
              Com os melhores cumprimentos,<br />
              <strong style="color: #090d16;">Equipa de Recrutamento & Selecção</strong><br />
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
    subject: "Actualização de Candidatura: Operadora de CCO — Overwatch Moçambique",
    htmlContent,
    textContent: `${greeting} ${application.name},\n\nAgradecemos a sua candidatura para a vaga de Operadora de CCO da Overwatch Moçambique.\n\nApós análise dos requisitos eliminatórios do concurso, informamos que a sua candidatura não foi seleccionada para avançar para a fase de testes presenciais.\n\nMotivo:\n${finalReason}\n\nQualquer agendamento de teste anterior fica cancelado e a candidatura foi arquivada.\n\nDesejamos-lhe os maiores sucessos futuros.\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento\nOverwatch Moçambique`,
  };

  return sendTransactionalEmail(payload);
}

export async function sendRetractionEmail({
  application,
  baseUrl,
}: {
  application: Application;
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
  const logoWhiteUrl = `${origin}/logo-white.png`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const greeting = getMozambiqueGreeting("pt");
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rectificação de Notificação — Overwatch Moçambique</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">
          
          <!-- Official Letterhead Header (Dark Navy) -->
          <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoWhiteUrl}" alt="Overwatch" height="22" width="147" style="height: 22px; width: auto; max-width: 145px; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                    REF: CCO-2026/RECTIFICAÇÃO
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Departamento de Recursos Humanos
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Subheading Bar -->
          <div style="background-color: #f0fdf4; padding: 12px 24px; border-bottom: 1px solid #bbf7d0; font-size: 11px; color: #166534;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #15803d;">
                  RECTIFICAÇÃO OFICIAL · CANDIDATURA ACTIVA
                </td>
                <td style="text-align: right; color: #166534; font-weight: 500;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 24px; background-color: #ffffff;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 14px 0;">
              ${greeting} ${application.name},
            </h1>
            
            <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.6;">
              Entramos em contacto para emitir uma <strong>rectificação formal e urgente</strong> referente à notificação de desqualificação recentemente transmitida pelo nosso sistema.
            </p>

            <!-- Explanation & Assurance Box -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <strong style="font-size: 13px; color: #15803d; display: block; margin-bottom: 6px;">
                ✓ A sua candidatura encontra-se activa e válida
              </strong>
              <p style="font-size: 13px; color: #166534; margin: 0; line-height: 1.55;">
                Devido a uma <strong>falha técnica temporária no nosso sistema automático de selecção</strong>, foi-lhe transmitida uma notificação errónea. Pedimos as nossas mais sinceras desculpas pelo transtorno. Confirmamos expressamente que a sua candidatura à vaga de Operadora de CCO da Overwatch Moçambique está em curso regular e seleccionada para realização de teste.
              </p>
            </div>

            <p style="font-size: 14px; color: #334155; margin: 0 0 22px 0; line-height: 1.6;">
              Se ainda não reservou a sua presença ou se o seu horário foi alterado, pode aceder ao seu link exclusivo de agendamento abaixo e escolher o dia mais conveniente para o seu teste presencial:
            </p>

            <!-- Action Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${bookingUrl}" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(11, 19, 41, 0.25); letter-spacing: 0.02em;">
                Agendar / Confirmar a Minha Sessão de Teste &rarr;
              </a>
            </div>

            <!-- Booking quota note -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #64748b; line-height: 1.55;">
              <strong style="color: #334155;">Nota importante sobre as vagas:</strong> As sessões presenciais decorrem no nosso escritório em Maputo e dispõem de um limite máximo de 10 candidatas por dia para garantir as condições ideais de avaliação. Por favor, aceda ao link para garantir a sua vaga.
            </div>

            <!-- Formal Sign-Off -->
            <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
              Agradecemos a sua compreensão e contamos com a sua presença.<br /><br />
              Com os melhores cumprimentos,<br />
              <strong style="color: #090d16;">Equipa de Recrutamento & Selecção</strong><br />
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
    subject: "Rectificação: A sua candidatura à Overwatch continua activa",
    htmlContent,
    textContent: `${greeting} ${application.name},\n\nEntramos em contacto para emitir uma rectificação formal referente à notificação anterior enviada pelo nosso sistema.\n\nDevido a uma falha técnica temporária no nosso sistema automático de selecção, foi-lhe transmitida uma notificação errónea. Lamentamos o transtorno.\n\nConfirmamos expressamente que a sua candidatura à vaga de Operadora de CCO da Overwatch Moçambique continua activa e seleccionada para realização de teste.\n\nPoderá agendar ou confirmar o seu teste acedendo ao link pessoal abaixo:\n${bookingUrl}\n\nNota: Cada dia dispõe de um limite de 10 vagas por dia.\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento & Selecção\nOverwatch Moçambique`,
  };

  return sendTransactionalEmail(payload);
}

/**
 * Specialized Exception Rebooking Email for Inocio Wilson
 * Explains address error & cancellation as a system glitch, apologizes,
 * and grants an exclusive exception to choose a new test date via dedicated link.
 */
export async function sendInocioWilsonRebookingEmail({
  application,
  baseUrl,
}: {
  application: Application;
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

  const logoWhiteUrl = `${origin}/logo-white.png`;
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;
  const correctedAddress = "Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo";
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(correctedAddress)}`;
  const greeting = getMozambiqueGreeting("pt");

  const subject = "Excepção Concedida & Novo Agendamento: Teste Presencial — Overwatch Moçambique";

  const htmlContent = `
    <!DOCTYPE html>
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
                    REF: CCO-2026/EXCEPCAO-REAGENDAMENTO
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Direcção de Recursos Humanos
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
                  CONCESSÃO DE EXCEPÇÃO · NOVO AGENDAMENTO DE TESTE
                </td>
                <td style="text-align: right; color: #64748b;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 24px; background-color: #ffffff;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 14px 0;">
              ${greeting}, ${application.name}
            </h1>
            
            <p style="font-size: 14px; color: #334155; margin: 0 0 14px 0; line-height: 1.65;">
              Entramos em contacto directo em virtude da anomalia técnica ocorrida hoje no nosso sistema automático de comunicações referente ao endereço das instalações da Overwatch e ao envio indevido de notificações.
            </p>

            <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.65;">
              Reconhecemos que esta instabilidade no sistema causou constrangimentos à sua deslocação para a realização do teste presencial agendado para hoje. Apresentamos as nossas sinceras desculpas pelo sucedido. A nossa equipa de engenharia trabalha activamente a cada minuto para aprimorar os nossos sistemas de recrutamento.
            </p>

            <!-- EXCLUSIVE EXCEPTION NOTICE CARD -->
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <strong style="font-size: 13px; color: #065f46; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                ✨ EXCEPÇÃO CONCEDIDA: REAGENDAMENTO AUTORIZADO
              </strong>
              <p style="font-size: 13px; color: #047857; margin: 0; line-height: 1.55;">
                Por decisão expressa da Direcção de RH, foi-lhe atribuída uma autorização excepcional exclusiva. O seu link pessoal foi totalmente reactivado para que possa <strong>escolher uma nova data de teste</strong> que seja mais conveniente para si.
              </p>
            </div>

            <!-- CORRECT ADDRESS CARD (Highlighting 1948) -->
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <strong style="font-size: 13px; color: #854d0e; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                📍 ENDEREÇO EXACTO E RECTIFICADO DAS INSTALAÇÕES:
              </strong>
              <p style="font-size: 14px; color: #090d16; font-weight: 700; margin: 0 0 4px 0;">
                Overwatch Moçambique — Edifício Sede
              </p>
              <p style="font-size: 13px; color: #713f12; margin: 0 0 8px 0; line-height: 1.5;">
                <strong>Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo</strong><br />
                <span style="font-size: 12px; color: #a16207;">(Entre a Av. Vlademir Lenine e a Av. Salvador Allende, antes da esquina com a Av. Filipe Samuel Magaia)</span>
              </p>
              <a href="${mapsUrl}" target="_blank" style="display: inline-block; color: #0284c7; font-weight: 700; font-size: 12px; text-decoration: underline;">
                Abrir localização exacta no Google Maps &rarr;
              </a>
            </div>

            <!-- DEDICATED REBOOKING ACTION BUTTON -->
            <div style="text-align: center; margin: 28px 0 20px 0;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 30px; border-radius: 8px; box-shadow: 0 4px 14px rgba(11, 19, 41, 0.25); letter-spacing: 0.02em;">
                Escolher Minha Nova Data de Teste &rarr;
              </a>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
                Clique no botão acima para aceder ao portal e seleccionar o seu novo dia.
              </div>
            </div>

            <!-- RULES AND REQUIREMENTS -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
              <strong style="font-size: 12px; color: #090d16; display: block; margin-bottom: 6px; text-transform: uppercase;">
                Instruções para o Novo Dia Escolhido:
              </strong>
              <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                • <strong>Horário de Chegada:</strong> Apresentar-se às 09h30 na portaria (o portão encerra impreterivelmente às 09h50, teste 10h00–11h30).<br />
                • <strong>Documentos:</strong> Documento original de identificação (BI / Passaporte / DIRE).<br />
                • <strong>Material:</strong> Caneta esferográfica de tinta preta ou azul.<br />
                • <strong>Passe QR:</strong> Após seleccionar a nova data, o seu novo Passe QR será gerado imediatamente no portal.
              </div>
            </div>

            <!-- Formal Sign-Off -->
            <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
              Aguardamos a confirmação da sua nova data e desejamos-lhe muito sucesso.<br /><br />
              Com os melhores cumprimentos,<br />
              <strong style="color: #090d16;">Direcção de Recursos Humanos & Recrutamento</strong><br />
              Overwatch Moçambique
            </div>
          </div>

          <!-- Formal Legal & Contact Footer -->
          <div style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
            <strong style="color: #090d16;">Overwatch Moçambique, Lda.</strong><br />
            ${correctedAddress}<br />
            Telefone / WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #0284c7; text-decoration: none;">${siteContact.email}</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `${greeting} ${application.name},

Entramos em contacto directo em virtude da anomalia técnica ocorrida hoje no nosso sistema automático de comunicações referente ao endereço das instalações da Overwatch e ao envio indevido de notificações.

Reconhecemos que esta instabilidade no sistema causou constrangimentos à sua comparência ao teste presencial agendado para hoje. Apresentamos as nossas sinceras desculpas pelo sucedido.

EXCEPÇÃO CONCEDIDA: REAGENDAMENTO AUTORIZADO
Por decisão expressa da Direcção de RH, foi-lhe concedida autorização excepcional exclusiva. O seu link pessoal foi reactivado para que possa escolher uma nova data de teste:
${bookingUrl}

ENDEREÇO EXACTO E RECTIFICADO DAS INSTALAÇÕES:
Overwatch Moçambique
Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo
(Localização Google Maps: ${mapsUrl})

INSTRUÇÕES PARA O DIA ESCOLHIDO:
- Horário de Chegada: 09h30 (portão encerra às 09h50, teste 10h00–11h30)
- Trazer documento original de identificação (BI/Passaporte/DIRE)
- Trazer caneta esferográfica preta ou azul
- O seu novo Passe QR será gerado imediatamente após escolher a data no portal

Com os melhores cumprimentos,
Direcção de Recursos Humanos
Overwatch Moçambique`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  return sendTransactionalEmail({
    sender,
    to: [{ email: application.email, name: application.name }],
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Address Correction Broadcast Email to ALL Booked Candidates
 * Clarifies official building number 1948 (due to automated system sync glitch),
 * apologizes, reconfirms their slot, and includes the updated QR Gate Pass.
 */
export async function sendAddressCorrectionBroadcastEmail({
  application,
  slot,
  baseUrl,
}: {
  application: Application;
  slot?: string;
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

  const logoWhiteUrl = `${origin}/logo-white.png`;
  const correctedAddress = "Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo";
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(correctedAddress)}`;
  const bookingUrl = `${origin}/pt/careers/test-invite/${application.id}`;
  const checkInUrl = `${origin}/gate?id=${application.id}`;
  const rawSlot = slot || application.testSlot || "Quinta-feira, 17 de Setembro – 10h00";
  const activeSlot = formatSlotDisplay(rawSlot, "pt") || rawSlot;

  // Generate official high-res QR code PNG buffer and base64 string
  let qrBase64 = "";
  try {
    const qrBuffer = await QRCode.toBuffer(checkInUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: "#07090e",
        light: "#ffffff",
      },
    });
    qrBase64 = qrBuffer.toString("base64");
  } catch (err) {
    console.error("Failed to generate QR buffer for correction email:", err);
  }

  const qrDataUri = qrBase64 ? `data:image/png;base64,${qrBase64}` : "";
  const greeting = getMozambiqueGreeting("pt");
  const subject = "Rectificação Importante de Endereço: Teste Presencial — Overwatch Moçambique";

  const safeName = (application.name || "candidata")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d-]/g, "_");

  const htmlContent = `
    <!DOCTYPE html>
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
                    REF: CCO-2026/RECTIFICACAO-ENDERECO
                  </span>
                  <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                    Comissão de Recrutamento & Selecção
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
                  RECTIFICAÇÃO FORMAL DE LOCALIZAÇÃO · N.º DO EDIFÍCIO
                </td>
                <td style="text-align: right; color: #64748b;">
                  Maputo, Moçambique
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 24px; background-color: #ffffff;">
            <h1 style="font-size: 18px; font-weight: 700; color: #090d16; margin: 0 0 14px 0;">
              ${greeting}, ${application.name}
            </h1>
            
            <p style="font-size: 14px; color: #334155; margin: 0 0 14px 0; line-height: 1.65;">
              Emitimos este comunicado oficial para rectificar uma informação relativa ao endereço físico da sede da Overwatch Moçambique onde decorrerá o seu Teste Presencial de Selecção.
            </p>

            <p style="font-size: 14px; color: #334155; margin: 0 0 18px 0; line-height: 1.65;">
              Devido a uma anomalia temporária de sincronização no nosso sistema automático de envio, algumas mensagens anteriores apresentaram incorrectamente o número de porta 1498. <strong>O número oficial e correcto do edifício da Overwatch é o N.º 1948</strong>.
            </p>

            <!-- SINCERE APOLOGY (System Glitch) -->
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #475569; border-radius: 8px; padding: 14px 16px; margin: 18px 0; font-size: 13px; color: #334155; line-height: 1.6;">
              Pedimos as nossas sinceras desculpas por qualquer confusão causada por este lapso do sistema. A nossa equipa técnica monitoriza e aprimora continuamente as nossas infra-estruturas digitais para assegurar a máxima fiabilidade.
            </div>

            <!-- PROMINENT CORRECTED ADDRESS CARD (1948) -->
            <div style="background-color: #fefce8; border: 2px solid #ca8a04; border-radius: 10px; padding: 20px; margin: 22px 0;">
              <strong style="font-size: 13px; color: #854d0e; display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
                📍 ENDEREÇO EXACTO E OFICIAL PARA O DIA DO TESTE:
              </strong>
              <div style="font-size: 17px; font-weight: 800; color: #090d16; margin-bottom: 6px;">
                Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo
              </div>
              <p style="font-size: 13px; color: #713f12; margin: 0 0 12px 0; line-height: 1.55;">
                Ponto de referência: Entre a Av. Vlademir Lenine e a Av. Salvador Allende (antes da esquina com a Av. Filipe Samuel Magaia).
              </p>
              <a href="${mapsUrl}" target="_blank" style="display: inline-block; background-color: #ca8a04; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 12px; padding: 10px 18px; border-radius: 6px;">
                Ver Localização Exacta no Google Maps &rarr;
              </a>
            </div>

            <!-- RECONFIRMATION OF SLOT -->
            <div style="border: 1px solid #cbd5e1; border-left: 4px solid #0b1329; border-radius: 8px; background-color: #f8fafc; padding: 16px 18px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 140px;">
                    Turno Confirmado:
                  </td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #090d16;">
                    📅 ${activeSlot}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    Estado da Vaga:
                  </td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #047857;">
                    ✓ 100% Confirmada e Válida
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                    Horário de Chegada:
                  </td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #047857;">
                    09h30 (Portão encerra impreterivelmente às 09h50)
                  </td>
                </tr>
              </table>
            </div>

            <!-- SECURITY PASS CARD EMBEDDED -->
            <div style="background: linear-gradient(180deg, #0b1329 0%, #07090e 100%); border: 2px solid #1e293b; border-radius: 12px; padding: 22px; margin: 22px 0; text-align: center; color: #ffffff;">
              <div style="font-family: monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #34d399; font-weight: 700; margin-bottom: 4px;">
                PASSE OFICIAL DE ACESSO · APRESENTAÇÃO OBRIGATÓRIA
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 2px;">
                ${application.name}
              </div>
              <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 16px;">
                Vaga: Operadora de CCO · Endereço: N.º 1948
              </div>

              <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; display: inline-block;">
                ${
                  qrDataUri
                    ? `<img src="${qrDataUri}" alt="QR Code - ${application.name}" width="200" height="200" style="display: block; width: 200px; height: 200px; margin: 0 auto; border: 0;" />`
                    : `<div style="width: 200px; height: 200px; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b;">Consulte no link abaixo</div>`
                }
                <div style="font-size: 11px; font-family: monospace; color: #090d16; font-weight: 700; margin-top: 8px;">
                  📅 ${activeSlot}
                </div>
              </div>

              <div style="margin-top: 14px; font-size: 11px; color: #94a3b8;">
                Poderá apresentar este passe no ecrã do telemóvel ou imprimir o ficheiro anexado.
              </div>
            </div>

            <!-- DIRECT LINK BUTTON -->
            <div style="text-align: center; margin: 26px 0 16px 0;">
              <a href="${bookingUrl}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 13px 28px; border-radius: 8px;">
                Aceder ao Meu Passe Online &rarr;
              </a>
            </div>

            <!-- Formal Sign-Off -->
            <div style="margin-top: 24px; font-size: 14px; color: #334155; line-height: 1.5;">
              Contamos com a sua presença pontual no <strong>N.º 1948</strong> e desejamos-lhe boa sorte no seu teste.<br /><br />
              Com os melhores cumprimentos,<br />
              <strong style="color: #090d16;">Comissão de Segurança & Recrutamento</strong><br />
              Overwatch Moçambique
            </div>
          </div>

          <!-- Formal Legal & Contact Footer -->
          <div style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
            <strong style="color: #090d16;">Overwatch Moçambique, Lda.</strong><br />
            ${correctedAddress}<br />
            Telefone / WhatsApp: <a href="https://wa.me/${siteContact.whatsappNumber}" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:${siteContact.email}" style="color: #0284c7; text-decoration: none;">${siteContact.email}</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `${greeting} ${application.name},

RECTIFICAÇÃO FORMAL DE ENDEREÇO — OVERWATCH MOÇAMBIQUE
Emitimos este comunicado oficial para rectificar uma informação relativa ao endereço físico da sede da Overwatch Moçambique onde decorrerá o seu Teste Presencial de Selecção.

Devido a uma anomalia temporária de sincronização no nosso sistema automático de envio, algumas mensagens anteriores apresentaram o número 1498. O NÚMERO OFICIAL E CORRECTO DO EDIFÍCIO É O N.º 1948.

Pedimos sinceras desculpas por este lapso do sistema.

ENDEREÇO OFICIAL E CORRECTO:
Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo
(Ponto de referência: Entre a Av. Vlademir Lenine e a Av. Salvador Allende, antes da esquina com a Av. Filipe Samuel Magaia)
Link Google Maps: ${mapsUrl}

A SUA VAGA E DATA CONTINUAM 100% CONFIRMADAS:
- Turno: ${activeSlot}
- Horário de Chegada: 09h30 (portão encerra impreterivelmente às 09h50)
- Trazer documento original de identificação (BI/Passaporte/DIRE) e caneta esferográfica
- Apresentar o seu Passe de Acesso QR Code (em anexo ou no ecrã do telemóvel)

Consulte o seu passe online a qualquer momento:
${bookingUrl}

Com os melhores cumprimentos,
Comissão de Segurança & Recrutamento
Overwatch Moçambique`;

  const sender = {
    name: "Overwatch Recrutamento",
    email: "noreply@overwatchmoz.com",
  };

  const payload: SendEmailOptions = {
    sender,
    to: [{ email: application.email, name: application.name }],
    subject,
    htmlContent,
    textContent,
  };

  if (qrBase64) {
    payload.attachment = [
      {
        name: `Passe-Acesso-Overwatch-${safeName}.png`,
        content: qrBase64,
      },
    ];
  }

  return sendTransactionalEmail(payload);
}
