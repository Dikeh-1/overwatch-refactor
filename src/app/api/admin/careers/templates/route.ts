import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { auditRequest, createActivityEvent, auditChange, activityRest, hasActivityRest, prepareActivityStore } from "@/lib/admin-activity";
import { getSystemConfig, setSystemConfig } from "@/lib/careers-config-store";
import { getCareersPool } from "@/lib/careers-db";
import { exclusive } from "@/lib/careers-store";

type Template = {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: string;
  followUpEnabled?: boolean;
  followUpSubject?: string;
  followUpBody?: string;
  attachments?: any[];
};
function validTemplate(value: unknown): value is Template {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const baseValid = ["id", "title", "subject", "body", "createdAt"].every(key => typeof item[key] === "string") &&
    /^[\w-]{1,100}$/.test(item.id as string) && !!(item.title as string).trim() &&
    (item.title as string).length <= 200 && (item.subject as string).length <= 1000 &&
    (item.body as string).length <= 100000 && Number.isFinite(Date.parse(item.createdAt as string));
  if (!baseValid) return false;
  if (item.followUpSubject !== undefined && typeof item.followUpSubject === "string" && item.followUpSubject.length > 1000) return false;
  if (item.followUpBody !== undefined && typeof item.followUpBody === "string" && item.followUpBody.length > 100000) return false;
  return true;
}
async function readTemplates(): Promise<Template[]> {
  const pool = getCareersPool();
  if (pool) { await prepareActivityStore(); return (await pool.query("SELECT data FROM admin_communication_templates ORDER BY updated_at DESC, id DESC")).rows.map((row: { data: Template }) => row.data); }
  if (hasActivityRest()) return (await (await activityRest("admin_communication_templates?select=data&order=updated_at.desc,id.desc")).json()).map((row: { data: Template }) => row.data);
  return getSystemConfig<Template[]>("communication_templates", []);
}
export async function GET() {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ templates: await readTemplates() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Templates could not be loaded" }, { status: 503 }); }
}
async function handlePATCH(request: Request) {
  if (!sameOrigin(request) || !(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!["save", "delete", "import"].includes(data?.action) || !validTemplate(data?.template)) return Response.json({ error: "Invalid template" }, { status: 400 });
  const template: Template = {
    id: data.template.id,
    title: data.template.title,
    subject: data.template.subject,
    body: data.template.body,
    createdAt: data.template.createdAt,
    followUpEnabled: typeof data.template.followUpEnabled === "boolean" ? data.template.followUpEnabled : undefined,
    followUpSubject: typeof data.template.followUpSubject === "string" ? data.template.followUpSubject : undefined,
    followUpBody: typeof data.template.followUpBody === "string" ? data.template.followUpBody : undefined,
    attachments: Array.isArray(data.template.attachments) ? data.template.attachments : undefined,
  };
  const update = (current: Template[]) => data.action === "delete" ? current.filter(item => item.id !== template.id) : data.action === "import" && current.some(item => item.id === template.id) ? current : [template, ...current.filter(item => item.id !== template.id)];
  const pool = getCareersPool();
  try {
    let templates: Template[];
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(724217)");
        const row = await client.query("SELECT data FROM admin_communication_templates WHERE id=$1 FOR UPDATE", [template.id]);
        const before: Template | null = row.rows[0]?.data || null;
        if (data.action === "delete") await client.query("DELETE FROM admin_communication_templates WHERE id=$1", [template.id]);
        else if (data.action !== "import" || !before) await client.query("INSERT INTO admin_communication_templates(id,data,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()", [template.id, JSON.stringify(template)]);
        templates = (await client.query("SELECT data FROM admin_communication_templates ORDER BY updated_at DESC, id DESC")).rows.map((row: { data: Template }) => row.data);
        const event = createActivityEvent({ action: `Communication template ${data.action === "delete" ? "deleted" : data.action === "import" ? "imported from browser storage" : "saved"}`, outcome: "succeeded", section: "communications", entityId: template.id, details: { before, after: templates.find(item => item.id === template.id) || null } });
        await client.query("INSERT INTO admin_activity_events (id,timestamp,data) VALUES($1,$2,$3)", [event.id, event.timestamp, JSON.stringify(event)]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    } else if (hasActivityRest()) {
      const before: Template | null = (await (await activityRest(`admin_communication_templates?select=data&id=eq.${template.id}&limit=1`)).json())[0]?.data || null;
      await auditChange(`Communication template ${data.action === "delete" ? "deleted" : data.action === "import" ? "imported from browser storage" : "saved"}`, { before, after: data.action === "delete" ? null : data.action === "import" && before ? before : template }, async () => {
        if (data.action === "delete") await activityRest(`admin_communication_templates?id=eq.${template.id}`, { method: "DELETE" });
        else await activityRest("admin_communication_templates?on_conflict=id", { method: "POST", headers: { Prefer: `resolution=${data.action === "import" ? "ignore" : "merge"}-duplicates,return=minimal` }, body: JSON.stringify({ id: template.id, data: template, updated_at: new Date().toISOString() }) });
      }, { section: "communications", entityId: template.id });
      templates = await readTemplates();
    } else {
      templates = await exclusive(async () => {
        const next = update(await getSystemConfig<Template[]>("communication_templates", []));
        await setSystemConfig("communication_templates", next);
        return next;
      });
    }
    return Response.json({ success: true, templates });
  } catch { return Response.json({ error: "Template change could not be saved. Please retry." }, { status: 503 }); }
}
export async function PATCH(request: Request) {
  return auditRequest(request, () => handlePATCH(request));
}
