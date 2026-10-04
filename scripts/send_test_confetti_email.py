import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

def send_test_email():
    # Read credentials from .env.local
    env_vars = {}
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()

    smtp_user = env_vars.get("FALLBACK_SMTP_USER", "ebubemichael033@gmail.com")
    smtp_pass = env_vars.get("FALLBACK_SMTP_PASS", "")
    to_email = "ebubemichael033@gmail.com"

    print(f"Connecting to Gmail SMTP with {smtp_user}...")

    msg = MIMEMultipart("related")
    msg["Subject"] = "Overwatch Celebração – Próxima Fase Aprovada (Teste Confetti)"
    msg["From"] = f"Overwatch Recrutamento <{smtp_user}>"
    msg["To"] = to_email

    # HTML Email with official letterhead and looping confetti animation
    html = f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Overwatch Celebração</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f1f5f9; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); overflow: hidden;">
      
      <!-- Official Letterhead Header (Dark Navy #0b1329) -->
      <div style="background-color: #0b1329; padding: 18px 24px; border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: 0.12em; color: #ffffff; text-transform: uppercase;">
                OVERWATCH
              </span>
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.04em;">
                REF: OW-INSTR/2026/MAPUTO
              </span>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                Departamento de Recursos Humanos &amp; Operações
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Official Subheading Bar -->
      <div style="background-color: #f8fafc; padding: 10px 24px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0b1329;">
              NOTIFICAÇÃO OFICIAL · PROCESSO DE SELECÇÃO (FASE CONCLUÍDA)
            </td>
            <td style="text-align: right; color: #64748b; font-size: 11px;">
              Maputo, Moçambique
            </td>
          </tr>
        </table>
      </div>

      <!-- Celebratory Looping Confetti Animation Banner -->
      <div style="background-color: #090d16; text-align: center; border-bottom: 1px solid #1e293b; line-height: 0;">
        <img src="cid:confetti_animation" alt="Overwatch Celebração Confetti" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border: 0;" />
      </div>

      <!-- Official Recipient Metadata Block -->
      <div style="padding: 14px 24px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px;">DESTINATÁRIO(A)</div>
              <strong style="color: #0f172a; font-size: 13px;">Ebube Michael</strong>
              <div style="font-size: 11px; color: #64748b;">Administrador de Recrutamento / Operadora de CCO</div>
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px;">DATA OFICIAL</div>
              <span style="font-family: monospace; color: #334155; font-size: 12px;">04/10/2026</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body Content -->
      <div style="padding: 28px 24px; background-color: #ffffff;">
        <p style="font-size: 15px; margin-top: 0; color: #0f172a; font-weight: 700;">
          Prezado(a) Ebube Michael,
        </p>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 14px;">
          Parabéns! Confirmamos que a sua candidatura foi aprovada para a <strong>Próxima Fase</strong> do Processo de Recrutamento e Integração da Overwatch Moçambique.
        </p>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 14px;">
          Esta mensagem demonstra o papel timbrado oficial da Overwatch, incorporando o <strong>banner de animação confetti em loop contínuo</strong> e o anexo oficial da celebração.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong style="color: #166534; font-size: 13px; display: block; margin-bottom: 4px;">
            ✓ Detalhes da Convocatória:
          </strong>
          <div style="font-size: 13px; color: #15803d; line-height: 1.5;">
            • <strong>Local:</strong> Sede Overwatch – Av. do Trabalho, N.º 1948, Maputo<br />
            • <strong>Horário:</strong> 08h30 (Sessão de Abertura às 09h00)<br />
            • <strong>Documentos:</strong> BI / Cartão de Eleitor original e certificados
          </div>
        </div>

        <div style="margin-top: 24px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.04em;">
            Documentos Oficiais Anexados (1):
          </div>
          <div style="font-size: 12px; color: #0284c7; font-weight: 600;">
            📎 celebracao_overwatch.gif (Animação Confetti em Loop)
          </div>
        </div>

        <!-- Official Sign-off -->
        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
          <strong>Equipa de Recrutamento &amp; Operações</strong><br />
          Overwatch Moçambique<br />
          Email: info@overwatchmoz.com · Tel: +258 84 287 0793
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""
    msg_html = MIMEText(html, "html", "utf-8")
    msg.attach(msg_html)

    # Attach the confetti animation with Content-ID for inline display and as attachment
    gif_path = "public/animations/confetti-celebration.gif"
    if os.path.exists(gif_path):
        with open(gif_path, "rb") as f:
            img_data = f.read()
            
        part = MIMEBase("image", "gif")
        part.set_payload(img_data)
        encoders.encode_base64(part)
        part.add_header("Content-ID", "<confetti_animation>")
        part.add_header("Content-Disposition", 'inline; filename="celebracao_overwatch.gif"')
        msg.attach(part)
        print("Attached confetti animation GIF!")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [to_email], msg.as_string())
        
    print(f"SUCCESS: Test email carrying confetti animation successfully delivered to {to_email}!")

if __name__ == "__main__":
    send_test_email()
