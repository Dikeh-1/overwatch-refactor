const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const supabaseUrl = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';

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

async function getOrCreateCandidateId() {
  const targetEmail = 'ebubemichael033@gmail.com';
  const targetName = 'Ebube Junior Michael';

  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      };
      if (supabaseKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${supabaseKey}`;
      }

      // Check if candidate already exists
      const searchRes = await fetch(`${supabaseUrl}/rest/v1/applications?email=eq.${encodeURIComponent(targetEmail)}&select=id,name,email`, {
        headers,
      });

      if (searchRes.ok) {
        const rows = await searchRes.json();
        if (rows && rows.length > 0) {
          console.log(`Found existing applicant in database with ID: ${rows[0].id}`);
          return rows[0].id;
        }
      }

      // Create application in database so booking link functions 100%
      const newId = crypto.randomUUID();
      const newApp = {
        id: newId,
        name: targetName,
        email: targetEmail,
        whatsapp: '+258 84 287 0793',
        role: 'cctv-operator',
        locale: 'pt',
        grade12: 'yes',
        experience: 'yes',
        shifts: 'yes',
        sex: 'male',
        ai: 'yes',
        cvName: 'Curriculo_Ebube_Michael.pdf',
        cvSize: 45000,
        status: 'shortlisted',
        invitedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/applications`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(newApp),
      });

      if (insertRes.ok) {
        console.log(`Created applicant record in Supabase database with ID: ${newId}`);
        return newId;
      } else {
        const errText = await insertRes.text();
        console.warn(`Could not insert applicant into database (${insertRes.status}): ${errText}`);
      }
    } catch (e) {
      console.warn("Database lookup error:", e.message);
    }
  }

  return 'ebube-test-' + Date.now();
}

async function run() {
  console.log("Preparing test email dispatch for: ebubemichael033@gmail.com...");
  const candidateId = await getOrCreateCandidateId();

  const origin = (env.NEXT_PUBLIC_SITE_URL || 'https://www.overwatchmoz.com').replace(/\/+$/, '');
  const bookingUrl = `${origin}/pt/careers/test-invite/${candidateId}`;
  const logoWhiteUrl = 'https://raw.githubusercontent.com/horuswave/overwatch-refactor/main/public/logo-white.png';
  const addressPt = 'Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo';
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent('Av. Paulo Samuel Khankhomba nº 1948, Maputo')}`;

  const greetingPt = getMozambiqueGreeting();
  console.log(`Current Mozambique greeting: ${greetingPt}`);

  const slots = [
    'Terça-feira, 15 de Setembro – 10h00',
    'Quarta-feira, 16 de Setembro – 10h00',
    'Quinta-feira, 17 de Setembro – 10h00',
    'Sexta-feira, 18 de Setembro – 10h00'
  ];

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
        </tr>`
    )
    .join('');

  const subject = "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique";
  const candidateName = "Ebube Junior Michael";

  const plainTextMessage = `${greetingPt} ${candidateName},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do botão abaixo. A sua vaga fica automaticamente confirmada no nosso sistema.`;

  const messageHtmlWrapped = `
    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">${greetingPt} ${candidateName},</p>
    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.</p>
    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: <strong>teste de selecção presencial</strong>.</p>
    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do botão abaixo. A sua vaga fica automaticamente confirmada no nosso sistema.</p>
  `;

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
            </div>

            <!-- Security & Location Notice Box -->
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #713f12; line-height: 1.55; margin-top: 24px;">
              <strong style="display: block; margin-bottom: 6px; color: #854d0e; font-size: 12px;">Nota de Segurança &amp; Requisitos do Teste:</strong>
              <div style="margin-bottom: 5px;">
                • <strong>Local:</strong> Overwatch — ${addressPt}
                (<a href="${mapsUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600;">Ver no Google Maps &rarr;</a>)
              </div>
              <div style="margin-bottom: 5px;">
                • <strong>Horário &amp; Tolerância:</strong> O teste inicia pontualmente às 10h00. Pedimos a comparência às 09h30. Por motivos de organização e segurança, o portão encerra impreterivelmente às 09h50.
              </div>
              <div>
                • <strong>Documentos Obrigatórios:</strong> Apresentação de documento de identificação original e válido com fotografia (BI, Passaporte ou DIRE) e caneta esferográfica.
              </div>
            </div>

            <!-- Link Fallback -->
            <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; word-break: break-all;">
              Em caso de dificuldade com o botão, copie este link:<br />
              <a href="${bookingUrl}" style="color: #0284c7; text-decoration: underline;">${bookingUrl}</a>
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
    to: [{ email: "ebubemichael033@gmail.com", name: candidateName }],
    subject: subject,
    htmlContent: htmlContent,
    textContent: `${plainTextMessage}\n\nEscolha a data do teste no seguinte link:\n${bookingUrl}\n\nLocal do Teste:\n${addressPt}\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento · Overwatch Moçambique`,
  };

  console.log("Sending email payload to Brevo API...");
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
    console.log("\n SUCCESS! Email dispatched directly to ebubemichael033@gmail.com.");
    console.log("Personal booking URL in email:", bookingUrl);
  } else {
    console.error("\n FAILED to dispatch email via Brevo.");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
