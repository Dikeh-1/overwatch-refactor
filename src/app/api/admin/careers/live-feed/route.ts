import { NextResponse } from "next/server";
import { checkAdminSession } from "@/lib/careers-auth";
import { getApplications } from "@/lib/careers-store";
import { getRoleDefinitions } from "@/lib/careers-campaign-store";

export async function GET(request: Request) {
  const isAuth = await checkAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const roleId = searchParams.get("roleId");

    const [allApps, roles] = await Promise.all([
      getApplications(),
      getRoleDefinitions(),
    ]);

    let filtered = allApps;
    if (roleId && roleId !== "all") {
      filtered = filtered.filter((a) => a.role === roleId);
    }

    const sinceDate = since ? new Date(since).getTime() : 0;
    const newOrUpdated = filtered.filter((a) => {
      const createdTime = new Date(a.createdAt).getTime();
      return createdTime > sinceDate;
    });

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      totalApplications: filtered.length,
      newApplicationsCount: sinceDate > 0 ? newOrUpdated.length : 0,
      recentApplications: newOrUpdated.slice(0, 10),
      openRoles: roles.filter((r) => r.open),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Feed check failed" },
      { status: 500 },
    );
  }
}
