import { NextResponse } from "next/server";
import { checkAdminSession } from "@/lib/careers-auth";
import { getAllCohorts, getRoleDefinitions } from "@/lib/careers-campaign-store";
import { getApplications } from "@/lib/careers-store";

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
      return NextResponse.json({
        success: true,
        cohort: targetCohort,
        applications: cohortApps,
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
