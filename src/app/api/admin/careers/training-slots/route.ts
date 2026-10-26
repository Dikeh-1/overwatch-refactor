import { auditRequest } from "@/lib/admin-activity";
import { verifyAdminAuthorization } from "@/lib/careers-auth";
import { getApplications } from "@/lib/careers-store";
import {
  getConfiguredTrainingSlots,
  setConfiguredTrainingSlots,
  type TrainingSlotConfig,
} from "@/lib/careers-config-store";
import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
import { saveCohort } from "@/lib/careers-campaign-store";
import { isTerminal } from "@/lib/careers-workflow";

export const dynamic = "force-dynamic";

async function handleGET(request: Request) {
  if (!(await verifyAdminAuthorization(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const cohortId = params.get("cohortId");
    const roleId = params.get("roleId");

    const workspace = await getRecruitmentWorkspaceData();
    const roles = workspace.roles.map((r) => ({
      id: r.id,
      en: r.en,
      pt: r.pt,
      open: r.open,
      activeCohortId: r.activeCohortId,
    }));
    const cohorts = workspace.cohorts
      .filter((c) => !c.unassigned)
      .map((c) => ({
        id: c.id,
        roleId: c.roleId,
        name: c.name,
        openedAt: c.openedAt,
        closedAt: c.closedAt,
        status: c.status,
      }));

    const selectedCohort = cohortId
      ? workspace.cohorts.find((c) => c.id === cohortId)
      : roleId
      ? workspace.cohorts.find((c) => c.roleId === roleId)
      : workspace.cohorts.find((c) => c.trainingSlots && c.trainingSlots.groups?.length > 0) ||
        workspace.cohorts.find((c) => c.status === "active") ||
        workspace.cohorts[0];

    const activeCohortId = selectedCohort?.id || cohortId || null;
    const config = await getConfiguredTrainingSlots(activeCohortId);
    const applications = await getApplications();

    // Calculate booked counts per group for this cohort/role
    const stats: Record<string, number> = {};
    const bookedCandidates: Record<string, Array<{ id: string; name: string; email: string; bookedAt?: string }>> = {};

    config.groups.forEach((g) => {
      stats[g.id] = 0;
      bookedCandidates[g.id] = [];
    });

    const relevantApps = activeCohortId
      ? applications.filter((a) => a.cohortId === activeCohortId || (selectedCohort && a.role === selectedCohort.roleId))
      : applications;

    relevantApps.forEach((a) => {
      if (a.trainingGroupId && !isTerminal(a)) {
        stats[a.trainingGroupId] = (stats[a.trainingGroupId] || 0) + 1;
        if (!bookedCandidates[a.trainingGroupId]) bookedCandidates[a.trainingGroupId] = [];
        bookedCandidates[a.trainingGroupId].push({
          id: a.id,
          name: a.name,
          email: a.email,
          bookedAt: a.trainingBookedAt,
        });
      }
    });

    return Response.json(
      {
        roles,
        cohorts,
        selectedCohortId: activeCohortId,
        config,
        stats,
        bookedCandidates,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("GET training-slots error:", err);
    return Response.json({ error: "Failed to load training slots" }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  if (!(await verifyAdminAuthorization(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { groups, title, location, roleId, cohortId } = body;

    if (!Array.isArray(groups) || groups.length === 0) {
      return Response.json({ error: "Pelo menos um grupo de formação deve ser configurado." }, { status: 400 });
    }

    const cleanGroups = groups.map((g: any, index: number) => {
      const id = g.id && String(g.id).trim() ? String(g.id).trim() : `group_${String.fromCharCode(97 + index)}`;
      const name = g.name && String(g.name).trim() ? String(g.name).trim() : `GRUPO ${String.fromCharCode(65 + index)}`;
      const capacity = typeof g.capacity === "number" && g.capacity > 0 ? g.capacity : 8;
      const schedule = g.schedule ? String(g.schedule).trim() : "";
      const timeRange = g.timeRange ? String(g.timeRange).trim() : "08h00–12h00";
      const evaluationTime = g.evaluationTime ? String(g.evaluationTime).trim() : "09h00–11h00";
      const enabled = g.enabled !== false;

      return {
        id,
        name,
        schedule,
        timeRange,
        evaluationTime,
        capacity,
        enabled,
      };
    });

    const newConfig: TrainingSlotConfig = {
      roleId: roleId || "cctv",
      title: title || "Formação em Consciência Situacional e Identificação de Ameaças através de CCTV",
      location: location || "Av Paulo Samuel Khankhomba 1948",
      groups: cleanGroups,
    };

    if (cohortId) {
      try {
        const workspace = await getRecruitmentWorkspaceData();
        const cohort = workspace.cohorts.find((c) => c.id === cohortId);
        if (cohort) {
          await saveCohort({ ...cohort, trainingSlots: newConfig });
        }
      } catch (err) {
        console.warn("Could not attach trainingSlots to cohort:", err);
      }
    }

    const saved = await setConfiguredTrainingSlots(newConfig, cohortId);

    return Response.json({
      success: true,
      config: saved,
      cohortId: cohortId || null,
    });
  } catch (err: any) {
    console.error("POST training-slots error:", err);
    return Response.json({ error: "Failed to save training slots" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleGET(request);
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
