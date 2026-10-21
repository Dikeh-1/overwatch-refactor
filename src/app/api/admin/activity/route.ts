import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { activitySection, getActivity, listActivity, recordActivity } from "@/lib/admin-activity";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if ([...params.values()].some(value => value.length > 500)) return Response.json({ error: "Invalid filters" }, { status: 400 });
  try {
    const id = params.get("id");
    if (id) {
      if (!/^[a-f\d-]{36}$/i.test(id)) return Response.json({ error: "Invalid event ID" }, { status: 400 });
      const event = await getActivity(id);
      if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
      const startId = (event.details as { startId?: string })?.startId;
      const started = startId ? await getActivity(startId) : null;
      return Response.json({ event, started }, { headers: { "Cache-Control": "no-store" } });
    }
    const before = params.get("before") || undefined;
    if (before) { try { const c = JSON.parse(Buffer.from(before, "base64url").toString()); if (!c || typeof c.timestamp !== "string" || !Number.isFinite(Date.parse(c.timestamp)) || !/^[a-f\d-]{36}$/i.test(c.id)) throw Error(); } catch { return Response.json({ error: "Invalid cursor" }, { status: 400 }); } }
    const data = await listActivity({ section: params.get("section") || undefined, roleId: params.get("roleId") || undefined, cohortId: params.get("cohortId") || undefined, entityId: params.get("entityId") || undefined, before });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Activity history could not be loaded. Please retry." }, { status: 503 }); }
}
// Only navigation telemetry is accepted from the browser. Change records are server-generated.
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const data = await request.json().catch(() => null);
  // Older clients may still send navigation telemetry. It is not an audit event.
  if (data && data.kind === undefined && typeof data.path === "string" && !data.action && !data.outcome) return new Response(null, { status: 204 });
  if (typeof data?.path !== "string" || !/^\/admin(?:\/[a-zA-Z0-9_-]+)*$/.test(data.path) || data.path.length > 250) return Response.json({ error: "Invalid page" }, { status: 400 });
  if (data.kind !== undefined && data.kind !== "export") return Response.json({ error: "Invalid browser event" }, { status: 400 });
  if (data.kind === "export" && (!Number.isInteger(data.count) || data.count < 0 || data.count > 1000000)) return Response.json({ error: "Invalid export count" }, { status: 400 });
  try {
    await recordActivity({ action: data.kind === "export" ? "CSV export requested" : "Section viewed", outcome: "succeeded", actor: "Administrator (shared account)", section: activitySection(data.path), details: { path: data.path, source: data.kind === "export" ? "Browser export request (file save cannot be verified)" : "Browser navigation", ...(data.kind === "export" ? { recordCount: data.count } : {}) },
      roleId: typeof data.roleId === "string" ? data.roleId.slice(0, 100) : undefined,
      cohortId: typeof data.cohortId === "string" ? data.cohortId.slice(0, 100) : undefined });
    return Response.json({ success: true });
  } catch { return Response.json({ error: "Navigation could not be recorded" }, { status: 503 }); }
}
