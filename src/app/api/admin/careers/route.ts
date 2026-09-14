import { authenticated, sameOrigin } from "@/lib/careers-auth";
import {
  getApplications,
  getRoles,
  setRole,
  setStatus,
} from "@/lib/careers-store";
import { roles, stages } from "@/lib/careers";
export async function GET() {
  if (!(await authenticated())) return new Response(null, { status: 401 });
  try {
    return Response.json(
      { applications: await getApplications(), roles: await getRoles() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Admin careers GET error:", err);
    return Response.json(
      {
        error: "Storage unavailable. Check the Supabase connection.",
        details: (err as Error)?.message || String(err),
      },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request))
    return new Response(null, { status: 403 });
  try {
    const data = await request.json();
    if (
      data.kind === "role" &&
      roles.some((r) => r.id === data.id) &&
      typeof data.open === "boolean"
    )
      await setRole(data.id, data.open);
    else if (
      data.kind === "status" &&
      stages.includes(data.status) &&
      /^[\da-f-]{36}$/.test(data.id)
    )
      await setStatus(data.id, data.status);
    else if (
      data.kind === "bulk_status" &&
      stages.includes(data.status) &&
      Array.isArray(data.ids) &&
      data.ids.length > 0
    ) {
      for (const id of data.ids) {
        if (/^[\da-f-]{36}$/.test(id)) {
          await setStatus(id, data.status);
        }
      }
    }
    else return new Response(null, { status: 400 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Could not save changes." }, { status: 503 });
  }
}
