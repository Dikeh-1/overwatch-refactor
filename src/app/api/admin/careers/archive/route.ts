import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getAllCohorts, saveCohort } from "@/lib/careers-campaign-store";
import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
import {
  applicationsForCohort,
  recruitmentMetrics,
  sameRole,
} from "@/lib/careers-workflow";

export async function GET(request: Request) {
  if (!(await authenticated()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { roles, cohorts, applications } =
      await getRecruitmentWorkspaceData();
    const cohortId = new URL(request.url).searchParams.get("cohortId");
    if (cohortId) {
      const cohort = cohorts.find((c) => c.id === cohortId);
      if (!cohort)
        return Response.json({ error: "Cohort not found" }, { status: 404 });
      const role =
        cohort.roleSnapshot || roles.find((r) => sameRole(r.id, cohort.roleId));
      const members = applicationsForCohort(applications, cohort, cohorts);
      return Response.json(
        {
          success: true,
          cohort,
          role,
          applications: members,
          metrics: recruitmentMetrics(members),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const archivedCohorts = cohorts
      .filter((c) => c.status !== "active")
      .map((c) => {
        const role =
          c.roleSnapshot || roles.find((r) => sameRole(r.id, c.roleId));
        const metrics = recruitmentMetrics(
          applicationsForCohort(applications, c, cohorts),
        );
        const { closureSnapshot, ...summary } = c;
        return {
          ...summary,
          roleTitlePt: role?.pt || c.roleId,
          roleTitleEn: role?.en || c.roleId,
          metrics,
          snapshotCapturedAt: closureSnapshot?.capturedAt,
        };
      });
    return Response.json(
      { success: true, archivedCohorts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Archive read failed", error);
    return Response.json(
      { error: "Unable to load recruitment records. Please retry." },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request))
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { cohortId, notes } = await request.json();
    if (
      typeof cohortId !== "string" ||
      typeof notes !== "string" ||
      notes.length > 10000
    )
      return Response.json({ error: "Invalid cohort notes" }, { status: 400 });
    const target = (await getAllCohorts(true)).find((c) => c.id === cohortId);
    if (!target)
      return Response.json({ error: "Cohort not found" }, { status: 404 });
    return Response.json({
      success: true,
      cohort: await saveCohort({ ...target, notes }),
    });
  } catch {
    return Response.json({ error: "Unable to save notes" }, { status: 503 });
  }
}
