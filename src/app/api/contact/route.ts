import { NextResponse } from "next/server";
import dns from "dns";
import { siteContact } from "@/lib/site-config";
import { sendTransactionalEmail } from "@/lib/careers-email";

dns.setDefaultResultOrder("ipv4first");

const FROM_EMAIL = "noreply@overwatchmoz.com";
const FROM_NAME = "Overwatch Website";
const OPERATIONS_EMAIL = siteContact.email;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, type, message, locale } = body;
    const isPortuguese = locale === "pt";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const htmlContent = `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Brand Accent -->
          <div style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);"></div>
          
          <!-- Header -->
          <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #3b82f6; display: block; margin-bottom: 4px;">System Notification</span>
            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.01em;">Site Assessment Request</h1>
            <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Received via Overwatch Contact Portal</p>
          </div>

          <!-- Body Info -->
          <div style="padding: 32px;">
            <div style="margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 140px; text-transform: uppercase; letter-spacing: 0.05em;">Client Name</td>
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
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Company</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #0f172a;">${company || "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Property Type</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #0f172a;">${type || "Not specified"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Message -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; display: block; margin-bottom: 10px;">Message Body</span>
              <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">${message}</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px 0;">This is an automated operational transmission from Overwatch.</p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 0;">© 2026 Overwatch Mozambique. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    const adminTextContent = `NOVO PEDIDO DE AVALIAÇÃO DE SEGURANÇA (OVERWATCH)
--------------------------------------------------
Nome do Cliente: ${name}
Email: ${email}
Telefone: ${phone || "Não informado"}
Empresa: ${company || "Não informada"}
Tipo de Propriedade: ${type || "Não especificado"}

Mensagem:
${message}
--------------------------------------------------
Enviado através do portal de contacto do website.`;

    // 1. Send alert email to Operations Team (Filipa, Ebube, Ops)
    await sendTransactionalEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [
        { email: "filipa@overwatchmoz.com", name: "Filipa" },
        { email: "ebubemichael033@gmail.com", name: "Ebube Michael" },
      ],
      cc: [
        { email: OPERATIONS_EMAIL, name: "Overwatch Operations" },
        { email: "ebube.michael@overwatchmoz.com", name: "Ebube Michael" },
      ],
      replyTo: { email, name },
      subject: `[Overwatch] Novo Pedido de Avaliação — ${name}`,
      htmlContent,
      textContent: adminTextContent,
    });

    const clientCopy = isPortuguese
      ? {
          title: "Pedido de Avaliação de Segurança Recebido",
          greeting: `Caro(a) ${name},`,
          thanks: "Obrigado por contactar a Overwatch para uma avaliação profissional de segurança do local.",
          received: "Recebemos os dados do seu pedido. A nossa equipa de operações de segurança está a analisar a sua mensagem e as características do local. Um dos nossos especialistas entrará em contacto assim que possível para esclarecer detalhes ou marcar uma data conveniente para a avaliação.",
          noticeTitle: "⚠️ Aviso Importante",
          notice: "Esta é uma resposta automática. Por favor, <strong>não responda</strong> directamente a este e-mail, pois esta caixa de correio não é monitorizada.",
          enquiries: `Para qualquer questão adicional, contacte-nos através de <a href="mailto:${siteContact.email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${siteContact.email}</a> ou utilize o assistente do nosso website para uma resposta mais rápida.`,
          regards: "Com os melhores cumprimentos,",
          team: "Equipa de Operações com Clientes",
          company: "Overwatch Moçambique",
          rights: "Todos os direitos reservados.",
          subject: "Obrigado por contactar a Overwatch",
        }
      : {
          title: "Security Assessment Request Received",
          greeting: `Dear ${name},`,
          thanks: "Thank you for contacting Overwatch regarding a professional site security assessment.",
          received: "We have successfully received your request details. Our security operations team is currently reviewing your message and site criteria. One of our experts will get back to you as soon as possible to discuss details or arrange a convenient time for the assessment.",
          noticeTitle: "⚠️ Important Notice",
          notice: "This is an automated response. Please <strong>do not reply</strong> directly to this email as this inbox is not monitored.",
          enquiries: `For any further enquiries, please email us directly at <a href="mailto:${siteContact.email}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${siteContact.email}</a>, or use our website chatbot for a faster response.`,
          regards: "Best regards,",
          team: "Customer Operations Team",
          company: "Overwatch Mozambique",
          rights: "All rights reserved.",
          subject: "Thank you for contacting Overwatch",
        };

    // 2. Send professional auto-responder confirmation to the client
    const clientHtmlContent = `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Brand Accent -->
          <div style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);"></div>
          
          <!-- Body Content -->
          <div style="padding: 32px;">
            <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">${clientCopy.title}</h1>
            <p>${clientCopy.greeting}</p>
            <p>${clientCopy.thanks}</p>
            <p>${clientCopy.received}</p>
            
            <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #cbd5e1; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">${clientCopy.noticeTitle}</p>
              <p style="margin: 0 0 8px 0; line-height: 1.5;">${clientCopy.notice}</p>
              <p style="margin: 0; line-height: 1.5;">${clientCopy.enquiries}</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">${clientCopy.regards}</p>
            <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 4px 0 0 0;">${clientCopy.team}</p>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">${clientCopy.company}</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">© 2026 ${clientCopy.company}. ${clientCopy.rights}</p>
          </div>
        </div>
      </div>
    `;

    const clientTextContent = `${clientCopy.greeting}\n\n${clientCopy.thanks}\n\n${clientCopy.received}\n\n${clientCopy.regards}\n${clientCopy.team}\n${clientCopy.company}`;

    await sendTransactionalEmail({
      sender: { name: "Overwatch Operations", email: FROM_EMAIL },
      to: [{ email, name }],
      replyTo: { email: OPERATIONS_EMAIL, name: "Overwatch Operations" },
      subject: clientCopy.subject,
      htmlContent: clientHtmlContent,
      textContent: clientTextContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
