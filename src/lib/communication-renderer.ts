import type { Application } from "./careers";
import { candidateVariables, renderStudioMessage, BOOKING_TOKEN } from "./communication-content";

export function renderOfficialMail({ candidate, subject, message, roleTitle, locale = "pt", includeBookingButton = false }: { candidate: Application; subject: string; message: string; roleTitle: string; locale?: "en" | "pt"; includeBookingButton?: boolean }) {
  const en = locale === "en";
  const body = includeBookingButton && !message.includes(BOOKING_TOKEN) ? `${message}\n\n${BOOKING_TOKEN}` : message;
  const html = renderStudioMessage(body, candidate, roleTitle, locale, includeBookingButton);
  const plain = candidateVariables(message.replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi,"\n").replace(/<[^>]*>/g,""),candidate,roleTitle,locale).replaceAll(BOOKING_TOKEN, includeBookingButton ? `https://www.overwatchmoz.com/${locale}/careers/test-invite/${candidate.id}` : "");
  const origin = "https://www.overwatchmoz.com", logoWhiteUrl = `${origin}/logo-white.png`;
  return { subject: candidateVariables(subject,candidate,roleTitle,locale), text: plain + (includeBookingButton && !message.includes(BOOKING_TOKEN) ? `\nhttps://www.overwatchmoz.com/${locale}/careers/test-invite/${candidate.id}` : ""), html: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b"><div style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;color:#1e293b">
      <!-- Official Letterhead Header (Dark Navy #0b1329) -->
      <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${logoWhiteUrl}" alt="Overwatch" height="22" width="147" style="height: 22px; width: auto; max-width: 145px; display: block; border: 0;" />
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                REF: COM-${new Date().getFullYear()}/MAPUTO
              </span>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                ${en ? "Human Resources Department" : "Departamento de Recursos Humanos"}
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
              ${en ? "OFFICIAL COMMUNICATION · RECRUITMENT PROCESS" : "COMUNICAÇÃO OFICIAL · PROCESSO DE RECRUTAMENTO"}
            </td>
            <td style="text-align: right; color: #64748b; font-size: 11px;">
              Maputo, Moçambique
            </td>
          </tr>
        </table>
      </div>


<div style="padding:28px;font-size:14px;line-height:1.7">${html}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">${en ? "Recruitment team" : "Equipa de Recrutamento"}<br>Overwatch Moçambique<br>Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo<br><a href="mailto:info@overwatchmoz.com" style="color:#0284c7;text-decoration:none">info@overwatchmoz.com</a> · <a href="https://www.overwatchmoz.com" style="color:#0284c7;text-decoration:none">www.overwatchmoz.com</a> (${en ? 'Chatbot: "Speak with an agent"' : "Chatbot: «Falar com um agente»"})</div></div></div></body></html>` };
}
