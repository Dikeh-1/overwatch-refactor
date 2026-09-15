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
  const origin = 'https://www.overwatchmoz.com';
  const logoUrl = `${origin}/logo.png`;
  const addressPt = 'Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo';
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent('Av. Paulo Samuel Khankhomba nº 1948, Maputo')}`;

  const greetingPt = getMozambiqueGreeting();
  console.log(`Current Mozambique greeting: ${greetingPt}`);

  const rawMessage = `{{greeting}},

Obrigada pela confirmação.

O seu teste de selecção para a vaga de Operadora de CCO da Overwatch ficou agendado para:

Data: {{slot}}
Hora do teste: 10h00
Local:
Overwatch
Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia

Pedimos que esteja no local 30 minutos antes, às 09h30.

Por motivos de organização do processo, às 09h50 o portão será encerrado e não será permitida a entrada de candidatas que cheguem depois dessa hora.

Pedimos também que traga:
• Uma caneta
• Uma cópia do seu documento de identificação

Por favor, planeie a sua deslocação com antecedência.

Com os melhores cumprimentos,
Overwatch`;

  let processedMessage = rawMessage
    .replace(/\{\{greeting\}\}/gi, greetingPt)
    .replace(/\{\{name\}\}/gi, targetName)
    .replace(/\{\{slot\}\}/gi, slot)
    .replace(/\[inserir data\]/gi, slot);

  processedMessage = processedMessage.replace(/^(Boa tarde|Bom dia|Boa noite)(,?)/i, `${greetingPt}$2`);

  const processedMessageHtml = processedMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/•/g, '&#8226;')
    .replace(/\n\n/g, '</p><p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.65; color: #334155;">')
    .replace(/\n/g, '<br />');

  const messageHtmlWrapped = `<p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.65; color: #334155;">${processedMessageHtml}</p>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Teste — Overwatch Moçambique</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #f1f5f9; padding: 36px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06); overflow: hidden;">
          
          <!-- Top Accent Line -->
          <div style="height: 4px; background-color: #090d16;"></div>

          <!-- Letterhead Header with Real Logo -->
          <div style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${logoUrl}" alt="Overwatch" height="26" style="height: 26px; width: auto; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; display: block;">
                    Confirmação de Agendamento
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
            <div style="margin-bottom: 24px;">
              ${messageHtmlWrapped}
            </div>

            <!-- Location Callout -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #090d16; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: top; width: 24px; padding-top: 2px;">
                    📍
                  </td>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                      Local do Teste Presencial
                    </div>
                    <div style="font-size: 13px; color: #334155; margin-top: 2px;">
                      ${addressPt}
                    </div>
                    <div style="margin-top: 6px;">
                      <a href="${mapsUrl}" target="_blank" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: underline;">
                        Ver localização no Google Maps &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Formal Legal & Contact Footer -->
          <div style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
            <strong style="color: #090d16;">Overwatch Moçambique, Lda.</strong><br />
            ${addressPt}<br />
            Telefone / WhatsApp: <a href="https://wa.me/258842870793" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:info@overwatchmoz.com" style="color: #0284c7; text-decoration: none;">info@overwatchmoz.com</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
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
    subject: "Confirmação de Teste de Selecção: Overwatch Moçambique",
    htmlContent: htmlContent,
    textContent: `${processedMessage}\n\nLocal:\n${addressPt}\n\nCom os melhores cumprimentos,\nOverwatch`,
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
