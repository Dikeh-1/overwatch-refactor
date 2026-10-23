import { auditRequest } from "@/lib/admin-activity";
import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
import { saveCohort, invalidateCampaignStoreCache } from "@/lib/careers-campaign-store";
import { parseSlotComponents } from "@/lib/careers";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getTestSlotConfig, saveTestSlotConfig, invalidateApplicationsCache } from "@/lib/careers-store";
import { sameRole } from "@/lib/careers-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await authenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const params = new URL(request.url).searchParams;
    const workspace = await getRecruitmentWorkspaceData();

    if (params.has("catalog") || params.has("cohortId")) {
      const cohort = workspace.cohorts.find((c) => c.id === params.get("cohortId"));
      if (params.has("cohortId") && !cohort) {
        return Response.json({ error: "Cycle not found" }, { status: 404 });
      }
      return Response.json(
        cohort
          ? { slots: cohort.testSlots || [], quota: cohort.slotQuota || 15, cohortId: cohort.id }
          : {
              roles: workspace.roles.map((r) => ({ id: r.id, en: r.en, pt: r.pt, open: r.open, activeCohortId: r.activeCohortId })),
              cohorts: workspace.cohorts
                .filter((c) => !c.unassigned)
                .map((c) => ({
                  id: c.id,
                  roleId: c.roleId,
                  name: c.name,
                  openedAt: c.openedAt,
                  closedAt: c.closedAt,
                  status: c.status,
                  testSlots: c.testSlots || [],
                  slotQuota: c.slotQuota || 15,
                })),
            },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      );
    }

    // For general /api/admin/careers/test-slots requests, prefer active role cohort schedule if configured
    const activeRole = workspace.roles.find((r) => r.open && r.activeCohortId);
    const activeCohort =
      (activeRole && workspace.cohorts.find((c) => c.id === activeRole.activeCohortId)) ||
      workspace.cohorts.find((c) => !c.unassigned && Array.isArray(c.testSlots) && c.testSlots.length > 0);

    if (activeCohort && Array.isArray(activeCohort.testSlots)) {
      return Response.json(
        {
          slots: activeCohort.testSlots,
          quota: activeCohort.slotQuota || 15,
          cohortId: activeCohort.id,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      );
    }

    const config = await getTestSlotConfig();
    return Response.json(
      { slots: config.slots, quota: config.quota },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Failed to retrieve test slots:", error);
    return Response.json(
      { error: "Falha ao obter turnos de teste." },
      { status: 500 },
    );
  }
}

async function handlePOST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.slots) || (body.slots.length === 0 && !body.cohortId)) {
      return Response.json(
        { error: "Por favor indique pelo menos um turno válido." },
        { status: 400 },
      );
    }

    const cleanSlots: string[] = body.slots
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);

    if (cleanSlots.length === 0 && !body.cohortId) {
      return Response.json(
        { error: "Nenhum turno preenchido." },
        { status: 400 },
      );
    }

    if (body.slots.length > 100 || cleanSlots.length !== body.slots.length) {
      return Response.json({ error: "Invalid slots" }, { status: 400 });
    }
    const quota = body.quota ?? 15;
    if (!Number.isInteger(quota) || quota < 1 || quota > 200 || cleanSlots.some((s: string) => !parseSlotComponents(s))) {
      return Response.json({ error: "Invalid slot dates or quota" }, { status: 400 });
    }

    const uniqueSlots = [...new Set<string>(cleanSlots)];
    const workspace = await getRecruitmentWorkspaceData();

    if (body.cohortId) {
      const cohort = workspace.cohorts.find((c) => c.id === body.cohortId);
      if (!cohort || cohort.unassigned) {
        return Response.json({ error: "Cohort not found or membership needs review" }, { status: 400 });
      }
      await saveCohort({ ...cohort, testSlots: uniqueSlots, slotQuota: quota });
      // Also synchronize global test_slots config when updating an active or primary cohort
      const parentRole = workspace.roles.find((r) => sameRole(r.id, cohort.roleId));
      if (parentRole?.open || parentRole?.activeCohortId === cohort.id || cohort.status === "active") {
        await saveTestSlotConfig({ slots: uniqueSlots, quota }).catch(() => {});
      }
      invalidateCampaignStoreCache();
      invalidateApplicationsCache();
      return Response.json({ success: true, slots: uniqueSlots, quota, cohortId: cohort.id });
    }

    // Saved from global Testing view without cohortId: update global config AND sync active cohort(s)
    const saved = await saveTestSlotConfig({ slots: uniqueSlots, quota });
    const activeRole = workspace.roles.find((r) => r.open && r.activeCohortId);
    const targetCohort =
      (activeRole && workspace.cohorts.find((c) => c.id === activeRole.activeCohortId)) ||
      workspace.cohorts.find((c) => !c.unassigned && Array.isArray(c.testSlots) && c.testSlots.length > 0);
    if (targetCohort && !targetCohort.unassigned) {
      await saveCohort({ ...targetCohort, testSlots: uniqueSlots, slotQuota: quota }).catch(() => {});
    }
    invalidateCampaignStoreCache();
    invalidateApplicationsCache();
    return Response.json({ success: true, slots: saved.slots, quota: saved.quota });
  } catch (error) {
    console.error("Failed to save test slots:", error);
    return Response.json(
      { error: "Falha ao gravar turnos de teste." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
