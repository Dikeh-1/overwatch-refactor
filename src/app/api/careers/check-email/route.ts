import { NextResponse } from "next/server";
import { getApplications } from "@/lib/careers-store";
import { sameRole } from "@/lib/careers-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawEmail = (searchParams.get("email") || "").trim().toLowerCase();
    const role = (searchParams.get("role") || "").trim();

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json(
        { valid: false, available: false, duplicate: false, code: "INVALID_EMAIL" },
        { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      );
    }

    const applications = await getApplications(true);
    const duplicate = applications.some((app) => {
      const appEmail = (app.email || "").trim().toLowerCase();
      if (appEmail !== rawEmail) return false;
      if (role && !sameRole(app.role, role)) return false;
      return true;
    });

    return NextResponse.json(
      {
        valid: true,
        available: !duplicate,
        duplicate,
        ...(duplicate ? { code: "DUPLICATE_EMAIL" } : {}),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Failed to verify applicant email:", error);
    return NextResponse.json(
      { valid: false, available: false, duplicate: false, code: "VERIFICATION_FAILED" },
      { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }
}
