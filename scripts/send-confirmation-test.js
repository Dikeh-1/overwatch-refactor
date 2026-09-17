const fs = require('fs');
const path = require('path');

// 1. Read environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const k = trimmed.slice(0, eqIdx).trim();
    let v = trimmed.slice(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const brevoApiKey = env.BREVO_API_KEY;
if (!brevoApiKey) {
  console.error("ERROR: BREVO_API_KEY is not defined in .env.local");
  process.exit(1);
}

function getMozambiqueGreeting() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const mozTime = new Date(utc + 2 * 3600000);
  const hour = mozTime.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

async function run() {
  const targetEmail = 'ebubemichael033@gmail.com';
  const targetName = 'Ebube Junior Michael';
  const slot = 'Quarta-feira, 16 de Setembro – 10h00';
  const logoWhiteUrl = 'https://raw.githubusercontent.com/horuswave/overwatch-refactor/main/public/logo-white.png';
  const addressPt = 'Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo';

  const greetingPt = getMozambiqueGreeting();
  console.log(`Current Mozambique greeting: ${greetingPt}`);

  const rawMessage = `{{greeting}},

Obrigada pela confirmação.

O seu teste de selecção para a vaga de Operadora de CCO da Overwatch ficou agendado para:`;

  let processedMessage = rawMessage
    .replace(/\{\{greeting\}\}/gi, greetingPt)
    .replace(/\{\{name\}\}/gi, targetName);

  processedMessage = processedMessage.replace(/^(Boa tarde|Bom dia|Boa noite)(,?)/i, `${greetingPt}$2`);

  const processedMessageHtml = processedMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">')
    .replace(/\n/g, '<br />');

  const messageHtmlWrapped = `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">${processedMessageHtml}</p>`;
  const outgoingSubject = "Confirmação de Presença: Teste de Selecção — Overwatch Moçambique";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${outgoingSubject}</title>
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
                  CONFIRMAÇÃO OFICIAL · TESTE DE SELECÇÃO PRESENCIAL
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

            <!-- Confirmed Slot Card -->
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 22px 0;">
              <div style="background-color: #f8fafc; padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
                Turno Agendado:
              </div>
              <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                <tr>
                  <td style="padding: 12px 14px; font-size: 13px; font-weight: 700; color: #0f172a;">
                    📅 ${slot}
                  </td>
                  <td style="padding: 12px 14px; text-align: right;">
                    <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #047857; background-color: #ecfdf5; padding: 4px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: inline-block;">
                      Confirmado
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Security & Location Instructions Notice Box -->
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #713f12; line-height: 1.6; margin-top: 22px;">
              <strong style="display: block; margin-bottom: 8px; color: #854d0e; font-size: 12px;">Instruções para o Dia do Teste:</strong>
              <div style="margin-bottom: 8px;">
                • <strong>Local:</strong> Overwatch — Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo
              </div>
              <div style="margin-bottom: 8px;">
                • <strong>Horário &amp; Pontualidade:</strong> Estar no local às 09h30 (30 minutos antes). O portão encerra impreterivelmente às 09h50.
              </div>
              <div>
                • <strong>Documentos &amp; Material:</strong> Trazer caneta esferográfica e documento de identificação original e válido (BI/Passaporte/DIRE).
              </div>
            </div>
          </div>

          <!-- Sign-Off & Official Footer -->
          <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
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
    sender: {
      name: "Overwatch Recrutamento",
      email: "noreply@overwatchmoz.com",
    },
    to: [{ email: targetEmail, name: targetName }],
    subject: outgoingSubject,
    htmlContent: htmlContent,
    textContent: `${processedMessage}\n\nTurno Agendado: ${slot}\nLocal:\n${addressPt}\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento · Overwatch Moçambique`,
  };

  console.log(`Sending confirmation test email to ${targetEmail} via Brevo API...`);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log("Brevo API Status:", res.status);
  console.log("Brevo API Response:", responseText);

  if (res.ok) {
    console.log(`\n SUCCESS! Confirmation email dispatched to ${targetEmail}.`);
  } else {
    console.error("\n FAILED to dispatch email via Brevo.");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
