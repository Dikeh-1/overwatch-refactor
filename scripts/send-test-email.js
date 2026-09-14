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
  const logoUrl = `${origin}/logo.png`;
  const addressPt = 'Rua de Kassuende, 210, Polana Cimento B, Maputo, Moçambique';
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(addressPt)}`;

  const slots = [
    'Terça-feira, 15 de Setembro – 10h00',
    'Quarta-feira, 16 de Setembro – 10h00',
    'Quinta-feira, 17 de Setembro – 10h00',
    'Sexta-feira, 18 de Setembro – 10h00'
  ];

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
        </tr>`
    )
    .join('');

  const subject = "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique";
  const candidateName = "Ebube Junior Michael";

  const messageText = `Boa tarde ${candidateName},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`;

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
${messageText}
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
                • <strong>Local:</strong> Sede da Overwatch — ${addressPt}
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
            ${addressPt}<br />
            Telefone / WhatsApp: <a href="https://wa.me/258842870793" style="color: #0284c7; text-decoration: none; font-weight: 600;">+258 84 287 0793</a> · Email: <a href="mailto:contact@overwatchmoz.com" style="color: #0284c7; text-decoration: none;">contact@overwatchmoz.com</a> · Website: <a href="${origin}" style="color: #64748b; text-decoration: none;">www.overwatchmoz.com</a>
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
    textContent: `${messageText}\n\nEscolha a data do teste no seguinte link:\n${bookingUrl}\n\nLocal do Teste:\n${addressPt}\n\nCom os melhores cumprimentos,\nEquipa de Recrutamento\nOverwatch Moçambique`,
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
