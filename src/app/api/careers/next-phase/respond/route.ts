import { auditRequest } from "@/lib/admin-activity";
import { isNextPhase, resolveApplication } from "@/lib/careers-workflow";
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
        name: "Maria Exemplo",
        email: "candidata@exemplo.com",
      },
    });
  }

  const applications = await getApplications();
  let candidate = applications.find((a) => a.nextPhaseToken === token);
  if (!candidate) {
    candidate = applications.find((a) => a.id === token || (a.email && a.email.toLowerCase() === token.toLowerCase()));
  }

  if (!candidate) {
    return Response.json({ error: "Token inválido ou não encontrado" }, { status: 404 });
  }

  const effective = resolveApplication(candidate);
  const isTechManager =
    candidate.role === "cctv_technical_manager" ||
    candidate.role === "technical" ||
    Boolean(candidate.cohortId && candidate.cohortId.includes("cctv_technical_manager"));

  const roleTitle = isTechManager
    ? "Gestor Técnico e Instalação de CCTV"
    : candidate.role === "cctv"
    ? "Operadora de CCO"
    : candidate.role || "Candidato";

  if (!isNextPhase(effective)) {
    return Response.json({
      valid: true,
      stageMismatch: true,
      stage: effective.status,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        roleTitle,
        isTechManager,
        testScore: candidate.testScore ?? null,
        testSlot: candidate.testSlot || null,
      },
      bookingUrl: `/careers/test-invite/${candidate.id}`,
      checkStatusUrl: `/careers/check-status`,
    });
  }

  if (!candidate.nextPhaseToken) {
    const genToken = crypto.randomUUID();
    candidate.nextPhaseToken = genToken;
    await updateApplication(candidate.id, { nextPhaseToken: genToken });
  }

  return Response.json({
    valid: true,
    candidate: {
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
      roleTitle,
      isTechManager,
      testScore: candidate.testScore ?? null,
      respondedAt: candidate.nextPhaseRespondedAt || null,
      response: candidate.nextPhaseResponse || null,
    },
  });
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { token, choice, responseOption: customOption, customAction } = body;
    const activeCustomOption = customOption || customAction;

    const rawChoice = (choice || "").toString().trim();
    const lowerChoice = rawChoice.toLowerCase();

    const isAffirmative =
      ["yes", "confirm", "confirmed", "accept", "accepted", "agree", "sim", "aceitar", "confirmar", "attended"].includes(lowerChoice) ||
      lowerChoice.startsWith("confirm") ||
      lowerChoice.startsWith("sim");

    const isNegative =
      ["no", "declined", "decline", "reject", "rejected", "recusar", "nao", "não", "withdrawn"].includes(lowerChoice) ||
      lowerChoice.startsWith("recus") ||
      lowerChoice.startsWith("não") ||
      lowerChoice.startsWith("nao");

    if (!token || (!isAffirmative && !isNegative && !rawChoice)) {
      return Response.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const effectiveChoice: "yes" | "no" = isNegative ? "no" : "yes";

    // Handle preview tokens gracefully
    if (token.startsWith("preview_")) {
      return Response.json({
        success: true,
        preview: true,
        choice: effectiveChoice,
        message: effectiveChoice === "yes" ? "Simulação de aceitação confirmada." : "Simulação de recusa registada.",
      });
    }

    const applications = await getApplications();
    let candidate = applications.find((a) => a.nextPhaseToken === token);
    if (!candidate) {
      candidate = applications.find((a) => a.id === token || (a.email && a.email.toLowerCase() === token.toLowerCase()));
    }

    if (!candidate) {
      return Response.json({ error: "Convite não encontrado ou token inválido" }, { status: 404 });
    }

    const effective = resolveApplication(candidate);
    if (!isNextPhase(effective) || ["hired", "training", "interview"].includes(effective.status)) return Response.json({ error: "Contact the recruitment team to update this decision." }, { status: 409 });

    // Idempotency: If already responded with same choice, return current state
    if (candidate.nextPhaseRespondedAt && candidate.nextPhaseResponse === effectiveChoice) {
      return Response.json({
        success: true,
        alreadyProcessed: true,
        choice: effectiveChoice,
        candidateName: candidate.name,
      });
    }

    const now = new Date().toISOString();
    const communications = candidate.communications || [];
    const activityLog = candidate.activityLog || [];

    if (effectiveChoice === "yes") {
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

      const responseOption = activeCustomOption || (rawChoice && rawChoice !== "yes" ? rawChoice : "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.");

      await updateApplication(candidate.id, {
        nextPhaseStatus: "confirmed",
        status: "interest_confirmed",
        nextPhaseResponse: "yes",
        nextPhaseResponseOption: responseOption,
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

      const responseOption = activeCustomOption || (rawChoice && rawChoice !== "no" ? rawChoice : "Não tenho interesse");

      await updateApplication(candidate.id, {
        nextPhaseStatus: "declined",
        status: "interest_declined",
        nextPhaseResponse: "no",
        nextPhaseResponseOption: responseOption,
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

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
