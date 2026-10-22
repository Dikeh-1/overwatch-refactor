import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCareersPool } from "./careers-db";

export type ActivityEvent = {
  id: string; timestamp: string; requestId: string; actor: string;
  section: string; action: string; outcome: "started" | "succeeded" | "failed";
  entityId?: string; roleId?: string; cohortId?: string;
  details?: unknown;
};
type Context = Pick<ActivityEvent, "requestId" | "actor" | "section"> & { roleId?: string; cohortId?: string; entityId?: string; meaningfulChanges?: number };
const context = new AsyncLocalStorage<Context>();
const directory = path.join(process.cwd(), ".careers-data", "activity");
let ready: Promise<void> | undefined;
export function hasActivityRest() {
  return !!((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY));
}
export async function activityRest(endpoint: string, init: RequestInit = {}) {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const headers = new Headers(init.headers);
  headers.set("apikey", key); headers.set("Content-Type", "application/json");
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${base}/rest/v1/${endpoint}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Activity storage unavailable (${response.status})`);
  return response;
}
export function changedValues(before: object, after: object): Record<string, { before: unknown; after: unknown }> {
  const left = before as Record<string, unknown>, right = after as Record<string, unknown>;
  return Object.fromEntries([...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .map(key => [key, { before: left[key] ?? null, after: right[key] ?? null }]));
}

// Never retain credentials, CV binaries, attachment bytes or signed access links.
export function redactActivity(value: unknown): unknown {
  if (typeof value === "string") return value
    .replace(/([?&](?:amp;)?(?:token|otl|key|pin|secret|signature|password|code)=)[^&\s"'<>]+/gi, "$1[REDACTED]")
    .replace(/(\/careers\/next-phase\/)[^/?\s"'<>]+/gi, "$1[REDACTED]")
    .replace(/data:[^;\s]+;base64,[a-z0-9+/=]+/gi, "[BINARY REDACTED]");
  if (Array.isArray(value)) return value.map(redactActivity);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /password|secret|token|authorization|cookie|credential|api.?key|^pin$|signature|cvBuffer|^attachments?$|attachmentContent|attachmentBytes|^cv$|^file$/i.test(key)
      ? "[REDACTED]" : redactActivity(item)]));
  return value;
}
export async function prepareActivityStore() {
  const pool = getCareersPool();
  if (!pool) return;
  if (!ready) ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_activity_events (
      id uuid PRIMARY KEY, timestamp timestamptz NOT NULL, data jsonb NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_activity_time ON admin_activity_events (timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_section_time ON admin_activity_events ((data->>'section'), timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_role_time ON admin_activity_events ((data->>'roleId'), timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_cohort_time ON admin_activity_events ((data->>'cohortId'), timestamp DESC, id DESC);
    CREATE TABLE IF NOT EXISTS admin_communication_templates (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT NOW());
    ALTER TABLE admin_activity_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE admin_communication_templates ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON admin_activity_events FROM PUBLIC;
    REVOKE ALL ON admin_communication_templates FROM PUBLIC;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON admin_activity_events FROM anon; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON admin_activity_events FROM authenticated; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON admin_communication_templates FROM anon; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON admin_communication_templates FROM authenticated; END IF;
    END $$;`);
  })().catch(error => { ready = undefined; throw error; });
  await ready;
}
export function createActivityEvent(input: Pick<ActivityEvent, "action" | "outcome"> & Partial<ActivityEvent>): ActivityEvent {
  const current = context.getStore();
  const event: ActivityEvent = {
    ...current, ...input, id: randomUUID(), timestamp: new Date().toISOString(),
    requestId: current?.requestId || input.requestId || randomUUID(),
    actor: input.actor || current?.actor || "System",
    section: input.section || current?.section || "system",
    details: redactActivity(input.details),
  };
  return event;
}
export async function recordActivity(input: Pick<ActivityEvent, "action" | "outcome"> & Partial<ActivityEvent>): Promise<ActivityEvent> {
  const event = createActivityEvent(input);
  const pool = getCareersPool();
  if (pool) {
    await prepareActivityStore();
    await pool.query("INSERT INTO admin_activity_events (id, timestamp, data) VALUES ($1, $2, $3)", [event.id, event.timestamp, JSON.stringify(event)]);
  } else if (hasActivityRest()) {
    await activityRest("admin_activity_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: event.id, timestamp: event.timestamp, data: event }) });
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for durable activity history");
    await mkdir(directory, { recursive: true });
    // One immutable file per event avoids shared-array overwrites under concurrent requests.
    await writeFile(path.join(directory, `${event.timestamp.replace(/:/g, "-")}_${event.id}.json`), JSON.stringify(event), { flag: "wx" });
  }
  return event;
}
export async function listActivity(filters: { section?: string; roleId?: string; cohortId?: string; entityId?: string; before?: string; limit?: number }) {
  const limit = Math.max(1, Math.min(100, filters.limit || 50));
  const cursor = filters.before ? JSON.parse(Buffer.from(filters.before, "base64url").toString()) as { timestamp: string; id: string } : null;
  if (cursor && (!Number.isFinite(Date.parse(cursor.timestamp)) || !/^[a-f\d-]{36}$/i.test(cursor.id))) throw new Error("Invalid cursor");
  const pool = getCareersPool();
  let events: ActivityEvent[];
  if (pool) {
    await prepareActivityStore();
    const args: unknown[] = [];
    const conditions: string[] = ["data->>'action' <> 'Section viewed'", "data->>'outcome' <> 'started'"];
    for (const key of ["section", "roleId", "cohortId", "entityId"] as const) if (filters[key]) {
      const aliases = key === "roleId" && ["cctv", "cctv_operator"].includes(filters[key]!);
      args.push(aliases ? ["cctv", "cctv_operator"] : filters[key]); conditions.push(aliases ? `data->>'roleId' = ANY($${args.length}::text[])` : key === "section" && filters[key] === "form-builder" ? `(data->>'section' = $${args.length} OR (data->>'section' = 'roles' AND data->>'action' LIKE '%Configuration%'))` : `data->>'${key}' = $${args.length}`);
    }
    if (cursor) { args.push(cursor.timestamp, cursor.id); conditions.push(`(timestamp, id) < ($${args.length - 1}::timestamptz, $${args.length}::uuid)`); }
    args.push(limit + 1);
    const result = await pool.query(`SELECT data - 'details' AS data FROM admin_activity_events ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY timestamp DESC, id DESC LIMIT $${args.length}`, args);
    events = result.rows.map((row: { data: ActivityEvent }) => row.data);
  } else if (hasActivityRest()) {
    const query = new URLSearchParams({ select: "id,timestamp,requestId:data->>requestId,actor:data->>actor,section:data->>section,action:data->>action,outcome:data->>outcome,entityId:data->>entityId,roleId:data->>roleId,cohortId:data->>cohortId", order: "timestamp.desc,id.desc", limit: String(limit + 1) });
    query.set("data->>action", "neq.Section viewed");
    query.set("data->>outcome", "neq.started");
    for (const key of ["roleId", "cohortId", "entityId"] as const) if (filters[key]) query.set(`data->>${key}`, key === "roleId" && ["cctv", "cctv_operator"].includes(filters[key]!) ? "in.(cctv,cctv_operator)" : `eq.${filters[key]}`);
    const groups: string[] = [];
    if (filters.section === "form-builder") groups.push("or(data->>section.eq.form-builder,and(data->>section.eq.roles,data->>action.like.*Configuration*))");
    else if (filters.section) query.set("data->>section", `eq.${filters.section}`);
    if (cursor) groups.push(`or(timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.lt.${cursor.id}))`);
    if (groups.length) query.set("and", `(${groups.join(",")})`);
    events = await (await activityRest(`admin_activity_events?${query}`)).json();
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("Activity history storage is unavailable");
    let names: string[];
    try { names = await readdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; names = []; }
    events = [];
    for (const name of names.filter(name => name.endsWith(".json")).sort().reverse()) {
      const event = JSON.parse(await readFile(path.join(directory, name), "utf8")) as ActivityEvent;
      if (event.action === "Section viewed" || event.outcome === "started") continue;
      if (cursor && (event.timestamp > cursor.timestamp || (event.timestamp === cursor.timestamp && event.id >= cursor.id))) continue;
      if (["section", "roleId", "cohortId", "entityId"].some(key => filters[key as keyof typeof filters] && event[key as keyof ActivityEvent] !== filters[key as keyof typeof filters] && !(key === "section" && filters.section === "form-builder" && event.section === "roles" && event.action.includes("Configuration")) && !(key === "roleId" && ["cctv", "cctv_operator"].includes(filters.roleId || "") && ["cctv", "cctv_operator"].includes(event.roleId || "")))) continue;
      events.push(event); if (events.length > limit) break;
    }
  }
  const hasMore = events.length > limit;
  events = events.slice(0, limit);
  const last = events.at(-1);
  return { events: events.map(event => { const summary = { ...event }; delete summary.details; return summary; }), nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ timestamp: last.timestamp, id: last.id })).toString("base64url") : null };
}
export async function getActivity(id: string): Promise<ActivityEvent | null> {
  if (!/^[a-f\d-]{36}$/i.test(id)) throw new Error("Invalid event ID");
  const pool = getCareersPool();
  if (pool) {
    await prepareActivityStore();
    return (await pool.query("SELECT data FROM admin_activity_events WHERE id = $1", [id])).rows[0]?.data || null;
  }
  if (hasActivityRest()) return (await (await activityRest(`admin_activity_events?select=data&id=eq.${id}&limit=1`)).json())[0]?.data || null;
  if (process.env.NODE_ENV === "production") throw new Error("Activity history storage is unavailable");
  const names = await readdir(directory).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; });
  const name = names.find(name => name.endsWith(`_${id}.json`));
  return name ? JSON.parse(await readFile(path.join(directory, name), "utf8")) : null;
}
export function activitySection(pathname: string) {
  if (/session/.test(pathname)) return "security";
  if (/settings/.test(pathname)) return "settings";
  if (/archive/.test(pathname)) return "archive";
  if (/roles-manager|\/roles$/.test(pathname)) return "roles";
  if (/next-phase/.test(pathname)) return "next-phase";
  if (/test-slots|check-in|test-booking|\/testing/.test(pathname)) return "testing";
  if (/broadcast|invite|email|confirmation|reminder|gate-passes|rebooking|reschedule|address-correction|communications|templates|\/mail(?:\/|$)/.test(pathname)) return "communications";
  if (/form-builder/.test(pathname)) return "form-builder";
  if (/candidates|\/cv$|\/api\/admin\/careers(?:$|\/restore|\/disqualify|\/decline-location)|^\/api\/careers$/.test(pathname)) return "candidates";
  return "overview";
}
// Used by all mutation routes. A durable start record must exist before any side effect.
export async function auditRequest(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const { authenticated } = await import("./careers-auth");
  const { gateAuthorized } = await import("./gate-auth");
  const url = new URL(request.url);
  const admin = await authenticated();
  const gate = !admin && (url.pathname.includes("/gate/") || url.pathname.includes("check-in")) && await gateAuthorized(request);
  const actor = admin ? "Administrator (shared account)" : gate ? "Gate operator (shared account)" : url.pathname.startsWith("/api/careers/") ? "Candidate / public request" : "Unauthenticated request";
  const body = request.headers.get("content-type")?.includes("application/json") ? await request.clone().json().catch(() => null) : null;
  const scope = { requestId: randomUUID(), actor, section: activitySection(url.pathname),
    roleId: typeof body?.roleId === "string" ? body.roleId : typeof body?.role === "string" ? body.role : typeof body?.role?.id === "string" ? body.role.id : undefined,
    cohortId: typeof body?.cohortId === "string" ? body.cohortId : undefined,
    entityId: typeof body?.id === "string" ? body.id : typeof body?.applicationId === "string" ? body.applicationId : typeof body?.candidateId === "string" ? body.candidateId : url.pathname.endsWith("/cv") ? url.searchParams.get("id") || undefined : undefined };
  return context.run(scope, async () => {
    const action = `${request.method} ${url.pathname}${typeof body?.action === "string" ? ` · ${body.action}` : ""}`;
    let start: ActivityEvent;
    try { start = await recordActivity({ action, outcome: "started", details: { request: body } }); }
    catch { return Response.json({ error: "Activity history is unavailable. No action was performed. Please retry later." }, { status: 503 }); }
    try {
      const response = await handler();
      const result = response.headers.get("content-type")?.includes("application/json") ? await response.clone().json().catch(() => null) : { status: response.status };
      try {
        if (!response.ok || !context.getStore()?.meaningfulChanges) await recordActivity({ action, outcome: response.ok ? "succeeded" : "failed",
          actor: response.ok && url.pathname.endsWith("/session") && request.method === "POST" ? url.pathname.includes("/gate/") ? "Gate operator (shared account)" : "Administrator (shared account)" : actor,
          details: { startId: start.id, status: response.status, result } });
      } catch {
        // Never report a successful email/mutation as failed and encourage a duplicate retry.
        response.headers.set("X-Activity-Log-Warning", "Completion record unavailable; see durable start record");
        console.error("Activity completion could not be persisted", scope.requestId);
      }
      return response;
    } catch (error) {
      await recordActivity({ action, outcome: "failed", details: { startId: start.id, error: "Handler failed; inspect server diagnostics using request ID" } }).catch(() => console.error("Activity failure could not be persisted", scope.requestId));
      throw error;
    }
  });
}
export async function auditChange<T>(action: string, details: unknown, change: () => Promise<T>, scope: Partial<ActivityEvent> = {}): Promise<T> {
  const start = await recordActivity({ ...scope, action, outcome: "started", details });
  try {
    const result = await change();
    await recordActivity({ ...scope, action, outcome: "succeeded", details: { startId: start.id } }).catch(() => console.error("Change completion could not be persisted", start.id));
    const parent = context.getStore(); if (parent) parent.meaningfulChanges = (parent.meaningfulChanges || 0) + 1;
    return result;
  } catch (error) {
    await recordActivity({ ...scope, action, outcome: "failed", details: { startId: start.id } }).catch(() => console.error("Change failure could not be persisted", start.id));
    throw error;
  }
}
