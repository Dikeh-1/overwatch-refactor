import { auditRequest } from "@/lib/admin-activity";
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
      let cohort = cohorts.find((c) => c.id === cohortId);
      if (!cohort) {
        const matchingRole = roles.find(
          (r) =>
            r.activeCohortId === cohortId ||
            sameRole(r.id, cohortId.replace(/_initial_cohort$/, "")) ||
            cohortId.startsWith(r.id)
        );
        if (matchingRole) {
          cohort = {
            id: cohortId,
            roleId: matchingRole.id,
            name: `${matchingRole.pt} — ${cohortId}`,
            openedAt: matchingRole.createdAt || new Date().toISOString(),
            closedAt: matchingRole.updatedAt || new Date().toISOString(),
            status: "closed" as const,
            stages: matchingRole.pipelineStages,
            screeningRules: matchingRole.screeningRules,
            legacy: true,
          };
        }
      }
      if (!cohort)
        return Response.json({ error: "Cohort not found" }, { status: 404 });
      const role =
        cohort.roleSnapshot ||
        roles.find((r) => sameRole(r.id, cohort.roleId)) || {
          id: cohort.roleId,
          en: cohort.name,
          pt: cohort.name,
          department: "Operações",
          open: cohort.status === "active",
          pipelineStages: cohort.stages || ["applications", "screening", "interview", "hired"],
          screeningRules: cohort.screeningRules || [],
          createdAt: cohort.openedAt || new Date().toISOString(),
          updatedAt: cohort.closedAt || new Date().toISOString(),
        };
      const members = applicationsForCohort(applications, cohort, cohorts);
      return Response.json(
        {
          success: true,
          cohort,
          role,
          applications: members,
          metrics: recruitmentMetrics(members, [cohort]),
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
          applicationsForCohort(applications, c, cohorts), [c],
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
async function handlePATCH(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request))
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { cohortId, notes, action, expectedBookingCount, overrideRecordedAbsences, historicalTestResults } = await request.json();
    if (action === "import_historical_test_results") {
      const workspace = await getRecruitmentWorkspaceData();
      const cohort = workspace.cohorts.find(c => c.id === cohortId);
      if (!cohort || cohort.status === "active" || cohort.unassigned) return Response.json({ error: "A closed cycle is required" }, { status: 400 });
      const rows = historicalTestResults?.results;
      if (!Array.isArray(rows) || !rows.length || rows.length > 1000 || typeof historicalTestResults.sourceUrl !== "string" || !/^https:\/\/drive\.google\.com\//.test(historicalTestResults.sourceUrl)) return Response.json({ error: "Invalid source document" }, { status: 400 });
      const members = applicationsForCohort(workspace.raw, cohort, workspace.cohorts);
      const ids = new Set<string>(), names = new Set<string>();
      for (const row of rows) {
        if (!row || typeof row.sourceName !== "string" || !row.sourceName.trim() || row.sourceName.length > 200 || !Number.isFinite(row.score) || row.score < 0 || row.score > 100 || names.has(row.sourceName.trim().toLowerCase()) || (row.applicationId && (ids.has(row.applicationId) || !members.some(a => a.id === row.applicationId)))) return Response.json({ error: "Duplicate, invalid or out-of-scope test result" }, { status: 400 });
        names.add(row.sourceName.trim().toLowerCase()); if (row.applicationId) ids.add(row.applicationId);
      }
      const evidence = { sourceUrl: historicalTestResults.sourceUrl, importedAt: new Date().toISOString(), results: rows.map(row => ({ sourceName: row.sourceName.trim(), score: row.score, ...(row.applicationId ? { applicationId: row.applicationId } : {}) })) };
      await saveCohort({ ...cohort, historicalTestResults: evidence });
      return Response.json({ success: true, documentedTests: rows.length, linked: ids.size, unlinked: rows.length - ids.size });
    }
    if (action === "confirm_historical_attendance") {
      if (typeof cohortId !== "string" || !Number.isInteger(expectedBookingCount) || expectedBookingCount < 1) return Response.json({ error: "Invalid attendance confirmation" }, { status: 400 });
      const workspace = await getRecruitmentWorkspaceData();
      const cohort = workspace.cohorts.find(c => c.id === cohortId);
      if (!cohort || cohort.status === "active" || cohort.unassigned) return Response.json({ error: "A closed, confirmed recruitment cycle is required" }, { status: 400 });
      if (cohort.historicalAttendance) return Response.json({ success: true, confirmedCount: cohort.historicalAttendance.applicationIds.length, alreadyConfirmed: true });
      const booked = applicationsForCohort(workspace.applications, cohort, workspace.cohorts).filter(a => a.testSlot);
      if (booked.length !== expectedBookingCount || (booked.some(a => a.attendanceStatus === "absent") && overrideRecordedAbsences !== true)) return Response.json({ error: "Booking count or absence records conflict with the confirmation. Review this cycle first." }, { status: 409 });
      const historicalAttendance = { applicationIds: booked.map(a => a.id), confirmedAt: new Date().toISOString(), basis: "admin_confirmed_booked_attendees" as const, previousAbsenceIds: booked.filter(a => a.attendanceStatus === "absent").map(a => a.id) };
      await saveCohort({ ...cohort, historicalAttendance });
      return Response.json({ success: true, confirmedCount: booked.length });
    }
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

export async function PATCH(request: Request) {
  return auditRequest(request, () => handlePATCH(request));
}
