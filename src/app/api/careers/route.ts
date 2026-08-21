import { NextResponse } from "next/server";
import dns from "dns";
import { siteContact } from "@/lib/site-config";

dns.setDefaultResultOrder("ipv4first");

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const FROM_EMAIL = "noreply@overwatchmoz.com";
const FROM_NAME = "Overwatch Careers";

async function sendBrevoEmail(payload: object) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error: ${err}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const position = formData.get("position") as string;
    const message = formData.get("message") as string;
    const locale = formData.get("locale") as string;
    const isPortuguese = locale === "pt";
    const cvFile = formData.get("cv") as File | null;

    if (!name || !email || !phone || !position) {
      return NextResponse.json({ error: "Name, email, phone, and position are required" }, { status: 400 });
    }

    if (!cvFile || cvFile.size === 0) {
      return NextResponse.json({ error: "CV file upload is required" }, { status: 400 });
    }

    const positionLabel = position || "General Application";
    const subjectLabel = positionLabel.toLowerCase().includes("application") ? positionLabel : `${positionLabel} Application`;

    const htmlContent = `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Brand Accent -->
          <div style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);"></div>
          
          <!-- Header -->
          <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #3b82f6; display: block; margin-bottom: 4px;">System Notification</span>
            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.01em;">New Job Application</h1>
            <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Received via Overwatch Careers Portal</p>
          </div>

          <!-- Body Info -->
          <div style="padding: 32px;">
            <div style="margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 140px; text-transform: uppercase; letter-spacing: 0.05em;">Applicant Name</td>
                    <td style="padding: 12px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Email Address</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #3b82f6;"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Phone Number</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #0f172a;">${phone || "Not provided"}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Position</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #0f172a;">${positionLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">CV Attachment</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #0f172a;">
                      ${cvFile && cvFile.size > 0 ? `<span style="color: #0f172a; font-weight: 500;">📎 ${cvFile.name}</span>` : '<span style="color: #94a3b8;">No CV uploaded</span>'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Cover Message -->
            ${message ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; display: block; margin-bottom: 10px;">Cover Message</span>
              <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">${message}</div>
            </div>
            ` : ""}
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px 0;">This is an automated operational transmission from Overwatch.</p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 0;">© 2026 Overwatch Mozambique. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    // Build attachments array if CV uploaded
    const attachments: Array<{ content: string; name: string; type?: string }> = [];
    if (cvFile && cvFile.size > 0) {
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      attachments.push({
        content: buffer.toString("base64"),
        name: cvFile.name,
        type: cvFile.type || "application/octet-stream",
      });
    }

    const payload: Record<string, unknown> = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: "filipa@overwatchmoz.com", name: "Filipa" }],
      cc: [
        { email: siteContact.email, name: "Overwatch Operations" },
        { email: "ebube.michael@overwatchmoz.com", name: "Ebube Michael" },
      ],
      replyTo: { email, name },
      subject: `[Careers] ${subjectLabel} — ${name}`,
      htmlContent,
    };

    if (attachments.length > 0) {
      payload.attachment = attachments;
    }

    // 1. Send alert email to HR Team
    await sendBrevoEmail(payload);

    const hrCopy = isPortuguese
      ? {
          title: "Candidatura Recebida",
          greeting: `Caro(a) ${name},`,
          thanks: `Obrigado por submeter a sua candidatura para <strong>${positionLabel}</strong> na Overwatch.`,
          received: "Recebemos os seus dados e o CV. A nossa equipa de recrutamento está a analisar as candidaturas para identificar os perfis cujas competências e experiência correspondem às nossas necessidades.",
          nextSteps: "Se o seu perfil corresponder ao que procuramos, entraremos em contacto directamente por e-mail ou telefone para conversar sobre os próximos passos do processo de recrutamento.",
          interest: "Obrigado pelo seu interesse em fazer parte da equipa Overwatch.",
          noticeTitle: "⚠️ Aviso Importante",
          notice: "Esta é uma resposta automática. Por favor, <strong>não responda</strong> directamente a este e-mail, pois esta caixa de correio não é monitorizada.",
          enquiries: `Para qualquer questão adicional, contacte-nos através de <a href="mailto:${siteContact.email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${siteContact.email}</a> ou utilize o assistente do nosso website para uma resposta mais rápida.`,
          regards: "Com os melhores cumprimentos,",
          team: "Equipa de Recursos Humanos",
          company: "Overwatch Moçambique",
          rights: "Todos os direitos reservados.",
          subject: "Candidatura Recebida — Overwatch",
        }
      : {
          title: "Application Received",
          greeting: `Dear ${name},`,
          thanks: `Thank you for submitting your application for the <strong>${positionLabel}</strong> position at Overwatch.`,
          received: "We have successfully received your details and CV. Our hiring team is currently reviewing all submissions to identify candidates whose skills and experience align with our requirements.",
          nextSteps: "If your profile is a strong match, we will contact you directly via email or phone to discuss the next steps in our recruitment process.",
          interest: "Thank you for your interest in joining the Overwatch team.",
          noticeTitle: "⚠️ Important Notice",
          notice: "This is an automated response. Please <strong>do not reply</strong> directly to this email as this inbox is not monitored.",
          enquiries: `For any further enquiries, please email us directly at <a href="mailto:${siteContact.email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${siteContact.email}</a>, or use our website chatbot for a faster response.`,
          regards: "Best regards,",
          team: "HR Team",
          company: "Overwatch Mozambique",
          rights: "All rights reserved.",
          subject: "Application Received — Overwatch",
        };

    // 2. Send professional auto-responder confirmation to the applicant
    const hrHtmlContent = `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Brand Accent -->
          <div style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);"></div>
          
          <!-- Body Content -->
          <div style="padding: 32px;">
            <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">${hrCopy.title}</h1>
            <p>${hrCopy.greeting}</p>
            <p>${hrCopy.thanks}</p>
            <p>${hrCopy.received}</p>
            <p>${hrCopy.nextSteps}</p>
            <p>${hrCopy.interest}</p>

            <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #cbd5e1; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">${hrCopy.noticeTitle}</p>
              <p style="margin: 0 0 8px 0; line-height: 1.5;">${hrCopy.notice}</p>
              <p style="margin: 0; line-height: 1.5;">${hrCopy.enquiries}</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">${hrCopy.regards}</p>
            <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 4px 0 0 0;">${hrCopy.team}</p>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">${hrCopy.company}</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">© 2026 ${hrCopy.company}. ${hrCopy.rights}</p>
          </div>
        </div>
      </div>
    `;

    await sendBrevoEmail({
      sender: { name: "Overwatch HR Team", email: FROM_EMAIL },
      to: [{ email, name }],
      subject: hrCopy.subject,
      htmlContent: hrHtmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Careers form error:", error);
    return NextResponse.json({ error: "Failed to send application" }, { status: 500 });
  }
}
