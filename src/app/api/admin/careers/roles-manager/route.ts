import { auditRequest } from "@/lib/admin-activity";
import { applicationsForCohort, buildCohortCatalog, sameRole } from "@/lib/careers-workflow";
import { ALL_PIPELINE_STAGES } from "@/lib/careers-models";
import { NextResponse } from "next/server";
import { sameOrigin, checkAdminSession } from "@/lib/careers-auth";
import {
  getRoleDefinitions,
  saveRoleDefinition,
  persistRoleDefinition,
  deleteRoleDefinition,
  openRoleCohort,
  closeAndArchiveRoleCohort,
  getAllCohorts,
  saveCohort,
} from "@/lib/careers-campaign-store";
import { getApplications, setRole } from "@/lib/careers-store";

export async function GET() {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [roles, cohorts, rawApps] = await Promise.all([
      getRoleDefinitions(true),
      getAllCohorts(true),
      getApplications(true).catch(() => []),
    ]);

    const catalog = buildCohortCatalog(cohorts, roles, rawApps);
    const applicationCounts: Record<string, number> = {};
    for (const c of catalog) {
      applicationCounts[c.id] = applicationsForCohort(rawApps, c, catalog).length;
    }
    for (const r of roles) {
      const activeCohort =
        catalog.find((c) => r.activeCohortId && c.id === r.activeCohortId) ||
        catalog.find((c) => sameRole(c.roleId, r.id) && c.status === "active") ||
        catalog.find((c) => sameRole(c.roleId, r.id) && !c.unassigned);
      applicationCounts[`role:${r.id}`] = activeCohort
        ? applicationCounts[activeCohort.id] ?? 0
        : rawApps.filter((a) => sameRole(a.role, r.id)).length;
    }

    return NextResponse.json({
      success: true,
      roles,
      cohorts: catalog,
      applicationCounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load roles" },
      { status: 500 },
    );
  }
}

async function handlePOST(request: Request) {
  const isAuth = await checkAdminSession();
  if (!isAuth || !sameOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;
    if (body.roleId && (typeof body.roleId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(body.roleId))) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

    if (action === "set_application_quota") {
      const { roleId, cohortId, applicationQuota } = body;
      if (!roleId || typeof roleId !== "string") {
        return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      }
      const normalizedQuota =
        applicationQuota === null || applicationQuota === "" || applicationQuota === 0 || applicationQuota === "0"
          ? null
          : Number(applicationQuota);
      if (normalizedQuota !== null && (!Number.isInteger(normalizedQuota) || normalizedQuota < 1 || normalizedQuota > 50000)) {
        return NextResponse.json({ error: "Enter a valid application quota between 1 and 50,000 (or 0 for unlimited)." }, { status: 400 });
      }

      const [roles, cohorts, rawApps] = await Promise.all([
        getRoleDefinitions(true),
        getAllCohorts(true),
        getApplications(true).catch(() => []),
      ]);
      const role = roles.find((r) => sameRole(r.id, roleId));
      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      const catalog = buildCohortCatalog(cohorts, roles, rawApps);
      const targetCohort =
        (cohortId ? catalog.find((c) => c.id === cohortId) : undefined) ||
        catalog.find((c) => role.activeCohortId && c.id === role.activeCohortId) ||
        catalog.find((c) => sameRole(c.roleId, role.id) && c.status === "active");

      const isCurrentActiveCycle =
        !targetCohort ||
        targetCohort.status === "active" ||
        (role.activeCohortId && targetCohort.id === role.activeCohortId);

      let updatedRole = role;
      if (isCurrentActiveCycle) {
        updatedRole = await persistRoleDefinition({
          ...role,
          applicationQuota: normalizedQuota,
        });
      }

      let updatedCohort = targetCohort;
      if (targetCohort && !targetCohort.unassigned) {
        updatedCohort = await saveCohort({
          ...targetCohort,
          applicationQuota: normalizedQuota,
        });
      }

      const receivedCount = targetCohort
        ? applicationsForCohort(rawApps, targetCohort, catalog).length
        : rawApps.filter((a) => sameRole(a.role, role.id)).length;

      let autoClosed = false;
      if (
        isCurrentActiveCycle &&
        updatedRole.open &&
        normalizedQuota !== null &&
        receivedCount >= normalizedQuota
      ) {
        const closedRes = await closeAndArchiveRoleCohort(
          updatedRole.id,
          `Auto-closed & archived: Application quota (${normalizedQuota}) reached (${receivedCount} applications received).`,
        );
        updatedRole = closedRes.role;
        updatedCohort = closedRes.archivedCohort;
        autoClosed = true;
      }

      return NextResponse.json({
        success: true,
        role: updatedRole,
        cohort: updatedCohort,
        applicationQuota: normalizedQuota,
        receivedCount,
        autoClosed,
      });
    }

    if (action === "create_or_update_role") {
      const { role } = body;
      if (!role || typeof role.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(role.id) || typeof role.pt !== "string" || !role.pt.trim() || typeof role.open !== "boolean" || !Array.isArray(role.pipelineStages) || !Array.isArray(role.screeningRules)) {
        return NextResponse.json({ error: "Invalid role payload" }, { status: 400 });
      }
      if (typeof role.en !== "string" || !role.en.trim() || role.en.length > 200 || role.pt.length > 200 || role.pipelineStages.some((stage: unknown) => !ALL_PIPELINE_STAGES.some(s => s.key === stage)) || new Set(role.pipelineStages).size !== role.pipelineStages.length) return NextResponse.json({ error: "Invalid role titles or pipeline stages" }, { status: 400 });
      const saved = await saveRoleDefinition(role);
      // Sync open state to legacy role store as well
      await setRole(saved.id, saved.open).catch(() => {});
      if (saved.id === "cctv" || saved.id === "cctv_operator") {
        await setRole("cctv", saved.open).catch(() => {});
        await setRole("cctv_operator", saved.open).catch(() => {});
      }
      return NextResponse.json({ success: true, role: saved });
    }

    if (action === "delete_role") {
      const { roleId } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      await deleteRoleDefinition(roleId);
      await setRole(roleId, false).catch(() => {});
      if (roleId === "cctv" || roleId === "cctv_operator") {
        await setRole("cctv", false).catch(() => {});
        await setRole("cctv_operator", false).catch(() => {});
      }
      return NextResponse.json({ success: true, deleted: roleId });
    }

    if (action === "open_role") {
      const { roleId, cohortName } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      if (cohortName !== undefined && (typeof cohortName !== "string" || cohortName.length > 200)) return NextResponse.json({ error: "Invalid cycle name" }, { status: 400 });
      const res = await openRoleCohort(roleId, cohortName);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "close_role") {
      const { roleId, notes } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      if (notes !== undefined && (typeof notes !== "string" || notes.length > 10000)) return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
      const res = await closeAndArchiveRoleCohort(roleId, notes);
      return NextResponse.json({ success: true, ...res });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Action failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
