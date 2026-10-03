import { NextResponse } from "next/server";
import { checkAdminSession } from "@/lib/careers-auth";
import { getAllCohorts, getRoleDefinitions } from "@/lib/careers-campaign-store";
import { getApplications } from "@/lib/careers-store";
import { APPROVED_NEXT_PHASE_CANDIDATES } from "@/lib/careers";

export async function GET(request: Request) {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohortId");

    const [allCohorts, roles, allApps] = await Promise.all([
      getAllCohorts(),
      getRoleDefinitions(),
      getApplications(),
    ]);

    let archivedCohorts = allCohorts.filter((c) => c.status === "archived");

    // Auto-discover cohorts for closed roles or archived candidates if not yet in cohorts table
    for (const role of roles) {
      const hasMatchingCohort = archivedCohorts.some(
        (c) => c.roleId === role.id || (role.id === "cctv" && c.roleId === "cctv_operator")
      );
      const roleApps = allApps.filter(
        (a: any) =>
          a.role === role.id ||
          (role.id === "cctv" && (!a.role || a.role === "cctv" || a.role === "cctv_operator"))
      );

      // If role is closed OR has archived applicants, ensure a cohort dossier exists in vault
      if (!hasMatchingCohort && (!role.open || roleApps.some((a) => a.status === "archived"))) {
        const syntheticCohort = {
          id: `${role.id}_archived_batch`,
          roleId: role.id,
          name: `${role.pt || role.en} — Lote Concluído`,
          openedAt: role.createdAt || new Date().toISOString(),
          closedAt: role.updatedAt || new Date().toISOString(),
          status: "archived" as const,
          stages: role.pipelineStages || [],
          screeningRules: role.screeningRules || [],
          notes: "Lote de recrutamento anterior preservado no cofre histórico.",
        };
        archivedCohorts.push(syntheticCohort);
      }
    }

    if (cohortId) {
      let targetCohort = allCohorts.find((c) => c.id === cohortId) || archivedCohorts.find((c) => c.id === cohortId);
      if (!targetCohort) {
        const matchedRole = roles.find((r) => cohortId.startsWith(r.id) || (r.id === "cctv" && cohortId.includes("cctv")));
        if (matchedRole) {
          targetCohort = {
            id: cohortId,
            roleId: matchedRole.id,
            name: `${matchedRole.pt || matchedRole.en} — Lote Arquivado`,
            openedAt: matchedRole.createdAt || new Date().toISOString(),
            closedAt: matchedRole.updatedAt || new Date().toISOString(),
            status: "archived" as const,
            stages: matchedRole.pipelineStages || [],
            screeningRules: matchedRole.screeningRules || [],
            notes: "Lote arquivado",
          };
        }
      }
      const cohortApps = allApps.filter(
        (a: any) =>
          a.cohortId === cohortId ||
          (targetCohort && (a.role === targetCohort.roleId || (targetCohort.roleId === "cctv" && (!a.role || a.role === "cctv" || a.role === "cctv_operator")))),
      );

      // Enrich with approved seed candidate scores, tokens, and response defaults
      const enrichedApps = cohortApps.map((a: any) => {
        const seed = APPROVED_NEXT_PHASE_CANDIDATES.find(
          (s) =>
            s.matchedId === a.id ||
            (s.name && a.name && s.name.toLowerCase().trim() === a.name.toLowerCase().trim()),
        );
        const testScore = typeof a.testScore === "number" ? a.testScore : seed?.score;
        const nextPhaseResponseOption =
          a.nextPhaseResponseOption ||
          (a.nextPhaseResponse === "yes"
            ? "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas."
            : a.nextPhaseResponse === "no"
            ? "Não tenho interesse"
            : null);

        return {
          ...a,
          testScore,
          nextPhaseResponseOption,
        };
      });

      return NextResponse.json({
        success: true,
        cohort: targetCohort,
        applications: enrichedApps,
      });
    }

    // Return list of archived cohorts with metrics
    const summary = archivedCohorts.map((cohort) => {
      const apps = allApps.filter(
        (a: any) =>
          a.cohortId === cohort.id ||
          (cohort.roleId === "cctv" && (!a.role || a.role === "cctv" || a.role === "cctv_operator")) ||
          a.role === cohort.roleId,
      );
      const role = roles.find((r) => r.id === cohort.roleId);
      const hiredCount = apps.filter((a) => a.status === "hired").length;
      const testedCount = apps.filter((a) => a.status === "tested" || a.testScore !== undefined).length;

      return {
        ...cohort,
        roleTitlePt: role?.pt || cohort.roleId,
        roleTitleEn: role?.en || cohort.roleId,
        department: role?.department || "Operações",
        totalApplications: apps.length,
        totalHired: hiredCount,
        totalTested: testedCount,
      };
    });

    return NextResponse.json({
      success: true,
      archivedCohorts: summary,
      totalArchivedCohorts: summary.length,
      totalArchivedCandidates: allApps.filter((a: any) =>
        a.status === "archived" || archivedCohorts.some((c) => c.id === a.cohortId),
      ).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load archive data" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, nextPhaseStatus, notes } = body;
    if (!id) {
      return NextResponse.json({ error: "Candidate ID required" }, { status: 400 });
    }

    const { updateApplication, setStatus } = await import("@/lib/careers-store");
    if (status) {
      await setStatus(id, status);
    }
    const updates: Record<string, any> = {};
    if (nextPhaseStatus) updates.nextPhaseStatus = nextPhaseStatus;
    if (notes !== undefined) updates.archiveReason = notes;
    if (Object.keys(updates).length > 0) {
      await updateApplication(id, updates);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update candidate" }, { status: 500 });
  }
}
