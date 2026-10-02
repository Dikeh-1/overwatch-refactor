import { NextResponse } from "next/server";
import { checkAdminSession } from "@/lib/careers-auth";
import {
  getRoleDefinitions,
  saveRoleDefinition,
  deleteRoleDefinition,
  openRoleCohort,
  closeAndArchiveRoleCohort,
  getAllCohorts,
} from "@/lib/careers-campaign-store";
import { setRole } from "@/lib/careers-store";

export async function GET() {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [roles, cohorts] = await Promise.all([
      getRoleDefinitions(),
      getAllCohorts(),
    ]);

    return NextResponse.json({
      success: true,
      roles,
      cohorts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_or_update_role") {
      const { role } = body;
      if (!role || !role.id || !role.pt) {
        return NextResponse.json({ error: "Invalid role payload" }, { status: 400 });
      }
      const saved = await saveRoleDefinition(role);
      // Sync open state to legacy role store as well
      await setRole(saved.id, saved.open).catch(() => {});
      return NextResponse.json({ success: true, role: saved });
    }

    if (action === "delete_role") {
      const { roleId } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      await deleteRoleDefinition(roleId);
      await setRole(roleId, false).catch(() => {});
      return NextResponse.json({ success: true, deleted: roleId });
    }

    if (action === "open_role") {
      const { roleId, cohortName } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      const res = await openRoleCohort(roleId, cohortName);
      await setRole(roleId, true).catch(() => {});
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "close_role") {
      const { roleId, notes } = body;
      if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });
      const res = await closeAndArchiveRoleCohort(roleId, notes);
      await setRole(roleId, false).catch(() => {});
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
