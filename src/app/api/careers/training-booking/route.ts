import { auditRequest } from "@/lib/admin-activity";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { getConfiguredTrainingSlots } from "@/lib/careers-config-store";
import { isTerminal } from "@/lib/careers-workflow";
import { isTrainingGroupBookingExpired } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const candidateId = url.searchParams.get("candidateId") || url.searchParams.get("id");
    const token = url.searchParams.get("token");

    const applications = await getApplications();
    let candidate = null;
    if (candidateId) {
      candidate = applications.find(
        (a) => a.id === candidateId || a.nextPhaseToken === candidateId
      );
    } else if (token) {
      candidate = applications.find(
        (a) => a.nextPhaseToken === token || a.id === token
      );
    }

    if (!candidate && (candidateId || token)) {
      return Response.json({ error: "Candidata não encontrada ou link inválido." }, { status: 404 });
    }

    const config = await getConfiguredTrainingSlots(candidate?.cohortId);

    // Tally real-time bookings per group
    const stats: Record<string, number> = {};
    config.groups.forEach((g) => {
      stats[g.id] = 0;
    });

    applications.forEach((a) => {
      const matchesCohort = !candidate?.cohortId || a.cohortId === candidate.cohortId || (candidate?.role && a.role === candidate.role);
      if (matchesCohort && a.trainingGroupId && !isTerminal(a)) {
        stats[a.trainingGroupId] = (stats[a.trainingGroupId] || 0) + 1;
      }
    });

    const groupsWithAvailability = config.groups.map((g) => {
      const booked = stats[g.id] || 0;
      const isCandidateBookedHere = candidate?.trainingGroupId === g.id;
      const isExpired = isTrainingGroupBookingExpired(g);
      return {
        id: g.id,
        name: g.name,
        schedule: g.schedule,
        timeRange: g.timeRange,
        evaluationTime: g.evaluationTime,
        capacity: g.capacity,
        startDate: g.startDate,
        bookedCount: booked,
        availableSlots: Math.max(0, g.capacity - booked),
        isFull: (booked >= g.capacity || isExpired) && !isCandidateBookedHere,
        isExpired,
        enabled: g.enabled && (!isExpired || isCandidateBookedHere),
        isSelectedByCandidate: isCandidateBookedHere,
      };
    });

    return Response.json(
      {
        candidate: candidate
          ? {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              role: candidate.role,
              trainingGroupId: candidate.trainingGroupId || null,
              trainingGroup: candidate.trainingGroup || null,
              trainingBookedAt: candidate.trainingBookedAt || null,
            }
          : null,
        title: config.title,
        location: config.location,
        groups: groupsWithAvailability,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("GET training-booking error:", err);
    return Response.json({ error: "Erro ao carregar dados de formação." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { candidateId, token, groupId } = body;

    const identifier = candidateId || token;
    if (!identifier || !groupId) {
      return Response.json({ error: "Identificador da candidata e grupo são obrigatórios." }, { status: 400 });
    }

    const applications = await getApplications(true);
    const candidate = applications.find(
      (a) => a.id === identifier || a.nextPhaseToken === identifier
    );

    if (!candidate) {
      return Response.json({ error: "Candidata não encontrada ou convite expirado." }, { status: 404 });
    }

    const config = await getConfiguredTrainingSlots(candidate.cohortId);
    const group = config.groups.find((g) => g.id === groupId);

    if (!group) {
      return Response.json({ error: "Grupo de formação não encontrado." }, { status: 404 });
    }

    if (!group.enabled) {
      return Response.json({ error: "Este grupo não se encontra activo para inscrições." }, { status: 400 });
    }

    if (isTrainingGroupBookingExpired(group)) {
      return Response.json(
        {
          error: `As inscrições para o ${group.name} encerraram automaticamente às 23:59 do dia anterior ao seu início.`,
          isExpired: true,
        },
        { status: 400 }
      );
    }

    // Concurrency / Capacity check scoped to cohort/role
    const currentBookedCount = applications.filter(
      (a) =>
        a.id !== candidate.id &&
        a.trainingGroupId === group.id &&
        (!candidate.cohortId || a.cohortId === candidate.cohortId || a.role === candidate.role) &&
        !isTerminal(a)
    ).length;

    if (currentBookedCount >= group.capacity) {
      return Response.json(
        {
          error: `O ${group.name} já atingiu a lotação máxima de ${group.capacity} vagas. Por favor seleccione outro grupo com vagas disponíveis.`,
          isFull: true,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const activityLog = candidate.activityLog || [];
    activityLog.push({
      id: crypto.randomUUID(),
      timestamp: now,
      action: "Candidate Booked Training Group",
      actor: "Candidate",
      details: `Inscrição confirmada no ${group.name} (${group.schedule || group.timeRange})`,
    });

    const communications = candidate.communications || [];
    communications.push({
      id: crypto.randomUUID(),
      type: "custom",
      subject: `Confirmação de Inscrição: Formação e Avaliação Prática – ${group.name}`,
      recipient: candidate.email,
      sentAt: now,
      status: "sent",
      sender: "Overwatch Recrutamento",
    });

    const updated = await updateApplication(candidate.id, {
      trainingGroupId: group.id,
      trainingGroup: group.name,
      trainingBookedAt: now,
      trainingStatus: "booked",
      activityLog,
      communications,
    });

    try {
      const { bookingFollowUp } = await import("@/lib/communication-delivery");
      await bookingFollowUp(updated);
    } catch (e) {
      console.error("Training follow-up error:", e);
    }

    return Response.json({
      success: true,
      candidate: {
        id: updated.id,
        name: updated.name,
        trainingGroupId: updated.trainingGroupId,
        trainingGroup: updated.trainingGroup,
        trainingBookedAt: updated.trainingBookedAt,
      },
      group,
    });
  } catch (err: any) {
    console.error("POST training-booking error:", err);
    return Response.json({ error: "Erro ao registar inscrição no grupo de formação." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
