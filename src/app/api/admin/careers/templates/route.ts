import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { auditRequest, createActivityEvent } from "@/lib/admin-activity";
import { getSystemConfig, setSystemConfig } from "@/lib/careers-config-store";
import { getCareersPool } from "@/lib/careers-db";
import { exclusive } from "@/lib/careers-store";

type Template = { id: string; title: string; subject: string; body: string; createdAt: string };
function validTemplate(value: unknown): value is Template {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["id", "title", "subject", "body", "createdAt"].every(key => typeof item[key] === "string") &&
    /^[\w-]{1,100}$/.test(item.id as string) && !!(item.title as string).trim() &&
    (item.title as string).length <= 200 && (item.subject as string).length <= 1000 &&
    (item.body as string).length <= 100000 && Number.isFinite(Date.parse(item.createdAt as string));
}
export async function GET() {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ templates: await getSystemConfig<Template[]>("communication_templates", []) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Templates could not be loaded" }, { status: 503 }); }
}
async function handlePATCH(request: Request) {
  if (!sameOrigin(request) || !(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!["save", "delete", "import"].includes(data?.action) || !validTemplate(data?.template)) return Response.json({ error: "Invalid template" }, { status: 400 });
  const template: Template = { id: data.template.id, title: data.template.title, subject: data.template.subject, body: data.template.body, createdAt: data.template.createdAt };
  const update = (current: Template[]) => data.action === "delete" ? current.filter(item => item.id !== template.id) : data.action === "import" && current.some(item => item.id === template.id) ? current : [template, ...current.filter(item => item.id !== template.id)];
  const pool = getCareersPool();
  try {
    let templates: Template[];
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(724217)");
        // getSystemConfig maintains this existing configuration table.
        await client.query("CREATE TABLE IF NOT EXISTS system_configs (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT NOW())");
        const row = await client.query("SELECT value FROM system_configs WHERE key = 'communication_templates' FOR UPDATE");
        const current: Template[] = row.rows[0]?.value || [];
        templates = update(current);
        await client.query("INSERT INTO system_configs (key,value,updated_at) VALUES ('communication_templates',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()", [JSON.stringify(templates)]);
        const event = createActivityEvent({ action: `Communication template ${data.action === "delete" ? "deleted" : data.action === "import" ? "imported from browser storage" : "saved"}`, outcome: "succeeded", section: "communications", entityId: template.id, details: { before: current.find(item => item.id === template.id) || null, after: templates.find(item => item.id === template.id) || null } });
        await client.query("INSERT INTO admin_activity_events (id,timestamp,data) VALUES($1,$2,$3)", [event.id, event.timestamp, JSON.stringify(event)]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
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
