import { getApplications, updateApplication } from "@/lib/careers-store";
import { sendNextPhaseConfirmationEmail, sendNextPhaseClosureEmail } from "@/lib/careers-email";
import crypto from "node:crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  // Support preview tokens
  if (token.startsWith("preview_")) {
    return Response.json({
      valid: true,
      preview: true,
      candidate: {
        name: "Candidata (Exemplo de Pré-visualização)",
        email: "candidata@exemplo.com",
      },
    });
  }

  const applications = await getApplications();
  const candidate = applications.find((a) => a.nextPhaseToken === token);

  if (!candidate) {
    return Response.json({ error: "Token inválido ou não encontrado" }, { status: 404 });
  }

  return Response.json({
    valid: true,
    candidate: {
      name: candidate.name,
      email: candidate.email,
      respondedAt: candidate.nextPhaseRespondedAt || null,
      response: candidate.nextPhaseResponse || null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, choice } = body;

    if (!token || !["yes", "no"].includes(choice)) {
      return Response.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Handle preview tokens gracefully
    if (token.startsWith("preview_")) {
      return Response.json({
        success: true,
        preview: true,
        choice,
        message: choice === "yes" ? "Simulação de aceitação confirmada." : "Simulação de recusa registada.",
      });
    }

    const applications = await getApplications();
    const candidate = applications.find((a) => a.nextPhaseToken === token);

    if (!candidate) {
      return Response.json({ error: "Convite não encontrado ou token inválido" }, { status: 404 });
    }

    // Idempotency: If already responded with same choice, return current state
    if (candidate.nextPhaseRespondedAt && candidate.nextPhaseResponse === choice) {
      return Response.json({
        success: true,
        alreadyProcessed: true,
        choice,
        candidateName: candidate.name,
      });
    }

    const now = new Date().toISOString();
    const communications = candidate.communications || [];
    const activityLog = candidate.activityLog || [];

    if (choice === "yes") {
      // 1. Candidate accepted conditions
      communications.push({
        id: crypto.randomUUID(),
        type: "next_phase_confirmation",
        subject: "Confirmação – Processo de Selecção Overwatch",
        recipient: candidate.email,
        sentAt: now,
        status: "sent",
        sender: "Overwatch Recrutamento",
      });

      activityLog.push({
        id: crypto.randomUUID(),
        timestamp: now,
        action: "Candidate Confirmed Next Phase Interest",
        actor: "Candidate",
        details: "Accepted 10-day initial training & 3-month practical conditions via secure portal link",
      });

      await updateApplication(candidate.id, {
        nextPhaseStatus: "confirmed",
        status: "interest_confirmed",
        nextPhaseResponse: "yes",
        nextPhaseRespondedAt: now,
        communications,
        activityLog,
      });

      // Dispatch official confirmation email
      try {
        await sendNextPhaseConfirmationEmail({
          name: candidate.name,
          email: candidate.email,
        });
      } catch (emailErr) {
        console.error("Failed to send acceptance confirmation email:", emailErr);
      }

      return Response.json({
        success: true,
        choice: "yes",
        candidateName: candidate.name,
      });
    } else {
      // 2. Candidate declined conditions -> Archive candidate with reason
      communications.push({
        id: crypto.randomUUID(),
        type: "next_phase_closure",
        subject: "Processo de Selecção Overwatch",
        recipient: candidate.email,
        sentAt: now,
        status: "sent",
        sender: "Overwatch Recrutamento",
      });

      activityLog.push({
        id: crypto.randomUUID(),
        timestamp: now,
        action: "Candidate Declined Next Phase Interest",
        actor: "Candidate",
        details: "Candidate indicated lack of interest/availability for next phase conditions",
      });

      await updateApplication(candidate.id, {
        nextPhaseStatus: "declined",
        status: "interest_declined",
        nextPhaseResponse: "no",
        nextPhaseRespondedAt: now,
        archiveReason: "Declined Next Phase",
        communications,
        activityLog,
      });

      // Dispatch polite closure email
      try {
        await sendNextPhaseClosureEmail({
          name: candidate.name,
          email: candidate.email,
        });
      } catch (emailErr) {
        console.error("Failed to send closure email:", emailErr);
      }

      return Response.json({
        success: true,
        choice: "no",
        candidateName: candidate.name,
      });
    }
  } catch (err: any) {
    console.error("Next-phase respond error:", err);
    return Response.json({ error: "Erro ao processar resposta" }, { status: 500 });
  }
}
