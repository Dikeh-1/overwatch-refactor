import { NextResponse } from "next/server";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const FROM_EMAIL = "noreply@overwatchmoz.com";
const FROM_NAME = "Overwatch Website";
const TO_EMAIL = "comercial@overwatchmoz.com";

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
    const body = await request.json();
    const { name, email, phone, company, type, message } = body;

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

    // 1. Send alert email to Operations Team (Filipa, CC: Ops, Ebube)
    await sendBrevoEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: "filipa@overwatchmoz.com", name: "Filipa" }],
      cc: [
        { email: TO_EMAIL, name: "Overwatch Operations" },
        { email: "ebube.michael@overwatchmoz.com", name: "Ebube Michael" },
      ],
      replyTo: { email, name },
      subject: `[Overwatch] New Assessment Request — ${name}`,
      htmlContent,
    });

    // 2. Send professional auto-responder confirmation to the client
    const clientHtmlContent = `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Brand Accent -->
          <div style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);"></div>
          
          <!-- Body Content -->
          <div style="padding: 32px;">
            <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Security Assessment Request Received</h1>
            <p>Dear ${name},</p>
            <p>Thank you for contacting Overwatch regarding a professional site security assessment.</p>
            <p>We have successfully received your request details. Our security operations team is currently reviewing your message and site criteria. One of our experts will get back to you as soon as possible to discuss details or arrange a convenient time for the assessment.</p>
            
            <div style="margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #cbd5e1; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">⚠️ Important Notice</p>
              <p style="margin: 0 0 8px 0; line-height: 1.5;">This is an automated response. Please <strong>do not reply</strong> directly to this email as this inbox is not monitored.</p>
              <p style="margin: 0; line-height: 1.5;">For any further enquiries, please email us directly at <a href="mailto:comercial@overwatchmoz.com" style="color: #3b82f6; text-decoration: none; font-weight: 500;">comercial@overwatchmoz.com</a>, or use our website chatbot for a faster response.</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">Best regards,</p>
            <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 4px 0 0 0;">Customer Operations Team</p>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">Overwatch Mozambique</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">© 2026 Overwatch Mozambique. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    await sendBrevoEmail({
      sender: { name: "Overwatch Operations", email: FROM_EMAIL },
      to: [{ email, name }],
      subject: `Thank you for contacting Overwatch`,
      htmlContent: clientHtmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
