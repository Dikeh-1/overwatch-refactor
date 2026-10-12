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
    const existingCohortIds = new Set(archivedCohorts.map((c) => c.id));

    // 1. Auto-discover all distinct cohortIds present on existing applications (e.g. cctv_cohort)
    const appCohortIds = Array.from(new Set(allApps.map((a: any) => a.cohortId).filter(Boolean)));
    for (const cId of appCohortIds) {
      if (existingCohortIds.has(cId)) continue;
      const matchingApps = allApps.filter((a: any) => a.cohortId === cId);
      const isArchived = matchingApps.some((a: any) => a.status === "archived") || cId.includes("cohort") || cId.includes("archived");
      if (isArchived) {
        const sampleApp = matchingApps[0];
        const roleId = sampleApp?.role || (cId.includes("cctv") ? "cctv" : "cctv_operator");
        const matchedRole = roles.find((r) => r.id === roleId || (roleId === "cctv" && r.id === "cctv_operator"));
        const cohortName =
          cId === "cctv_cohort"
            ? "Operadora de CCTV (CCO) — Lote Setembro 2026"
            : `${matchedRole?.pt || roleId} — Lote Arquivado (${cId})`;

        archivedCohorts.push({
          id: cId,
          roleId,
          name: cohortName,
          openedAt: matchingApps[matchingApps.length - 1]?.createdAt || new Date().toISOString(),
          closedAt: matchingApps[0]?.createdAt || new Date().toISOString(),
          status: "archived" as const,
          stages: matchedRole?.pipelineStages || [
            "applications",
            "screening",
            "testing",
            "gate_checkin",
            "next_phase",
            "interview",
            "hired",
          ],
          screeningRules: matchedRole?.screeningRules || [],
          notes: "Lote de recrutamento anterior preservado no cofre histórico.",
        });
        existingCohortIds.add(cId);
      }
    }

    // 2. Auto-discover cohorts for closed roles or roles with archived candidates
    for (const role of roles) {
      const hasMatchingCohort = archivedCohorts.some(
        (c) => c.roleId === role.id || (role.id === "cctv" && c.roleId === "cctv_operator")
      );
      const roleApps = allApps.filter(
        (a: any) =>
          a.role === role.id ||
          (role.id === "cctv" && (!a.role || a.role === "cctv" || a.role === "cctv_operator"))
      );

      if (!hasMatchingCohort && (!role.open || roleApps.some((a) => a.status === "archived"))) {
        const synthId = `${role.id}_archived_batch`;
        archivedCohorts.push({
          id: synthId,
          roleId: role.id,
          name: `${role.pt || role.en} — Lote Concluído`,
          openedAt: roleApps[roleApps.length - 1]?.createdAt || role.createdAt || new Date().toISOString(),
          closedAt: role.updatedAt || new Date().toISOString(),
          status: "archived" as const,
          stages: role.pipelineStages || [],
          screeningRules: role.screeningRules || [],
          notes: "Lote de recrutamento anterior preservado no cofre histórico.",
        });
        existingCohortIds.add(synthId);
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

      const cohortApps = allApps.filter((a: any) => {
        if (a.cohortId === cohortId) return true;
        if (targetCohort && targetCohort.status === "archived") {
          const isThisRole =
            a.role === targetCohort.roleId ||
            ((targetCohort.roleId === "cctv" || targetCohort.roleId === "cctv_operator") &&
              (!a.role || a.role === "cctv" || a.role === "cctv_operator"));
          if (isThisRole && (a.status === "archived" || !a.cohortId || a.cohortId === targetCohort.id)) {
            return true;
          }
        }
        return false;
      });

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
      const apps = allApps.filter((a: any) => {
        if (a.cohortId === cohort.id) return true;
        const isThisRole =
          a.role === cohort.roleId ||
          ((cohort.roleId === "cctv" || cohort.roleId === "cctv_operator") &&
            (!a.role || a.role === "cctv" || a.role === "cctv_operator"));
        if (isThisRole && (a.status === "archived" || !a.cohortId || a.cohortId === cohort.id)) {
          return true;
        }
        return false;
      });

      const role = roles.find((r) => r.id === cohort.roleId || (cohort.roleId === "cctv" && r.id === "cctv_operator"));
      const hiredCount = apps.filter((a) => a.status === "hired").length;
      const testedCount = apps.filter((a) => a.status === "tested" || a.testScore !== undefined || Boolean(a.attendedAt)).length;

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
    const { cohortId, notes } = body;
    if (!cohortId) {
      return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
    }

    const allCohorts = await getAllCohorts();
    const target = allCohorts.find((c) => c.id === cohortId);
    if (!target) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    const updated = {
      ...target,
      notes: notes !== undefined ? notes : target.notes,
    };
    const { saveCohort } = await import("@/lib/careers-campaign-store");
    await saveCohort(updated);

    return NextResponse.json({ success: true, cohort: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update cohort" },
      { status: 500 },
    );
  }
}
