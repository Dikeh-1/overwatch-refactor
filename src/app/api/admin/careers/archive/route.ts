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

    const archivedCohorts = allCohorts.filter((c) => c.status === "archived");

    if (cohortId) {
      const targetCohort = allCohorts.find((c) => c.id === cohortId);
      const cohortApps = allApps.filter((a: any) => a.cohortId === cohortId);
      return NextResponse.json({
        success: true,
        cohort: targetCohort,
        applications: cohortApps,
      });
    }

    // Return list of archived cohorts with metrics
    const summary = archivedCohorts.map((cohort) => {
      const apps = allApps.filter((a: any) => a.cohortId === cohort.id);
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
        archivedCohorts.some((c) => c.id === a.cohortId),
      ).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load archive data" },
      { status: 500 },
    );
  }
}
