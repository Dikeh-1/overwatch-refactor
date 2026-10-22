import "server-only";
import { getCareersPool } from "./careers-db";
import { activityRest, hasActivityRest } from "./admin-activity";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// Persisted JSON supports versioned draft, delivery and automation payloads; each API validates its own input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MailItem = { id: string; kind: "draft" | "outbox" | "automation" | "incoming" | "attachment"; scope: string; version: number; updated_at: string; data: Record<string, any> };
const directory = path.join(process.cwd(), ".careers-data", "mail");
let ready: Promise<void> | undefined;
export async function prepareMailStore() {
  const pool = getCareersPool();
  if (!pool) return;
  if (!ready) ready = pool.query(`CREATE TABLE IF NOT EXISTS admin_mail_items (
    id text PRIMARY KEY, kind text NOT NULL, scope text NOT NULL, version integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT NOW(), data jsonb NOT NULL
  );
  CREATE INDEX IF NOT EXISTS admin_mail_scope_time ON admin_mail_items(scope, updated_at DESC);
  ALTER TABLE admin_mail_items ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON admin_mail_items FROM PUBLIC;
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON admin_mail_items FROM anon; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON admin_mail_items FROM authenticated; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT ALL ON admin_mail_items TO service_role; END IF;
  END $$;
  NOTIFY pgrst, 'reload schema';`).then(() => {}).catch(error => { ready = undefined; throw error; });
  await ready;
}
export async function listMail(scope?: string, kind?: string, status?: string): Promise<MailItem[]> {
  const pool = getCareersPool();
  if (pool) {
    await prepareMailStore();
    return (await pool.query("SELECT * FROM admin_mail_items WHERE kind <> 'attachment' AND ($1::text IS NULL OR scope=$1) AND ($2::text IS NULL OR kind=$2) AND ($3::text IS NULL OR data->>'status'=$3) ORDER BY updated_at DESC LIMIT 500", [scope || null, kind || null, status || null])).rows;
  }
  if (hasActivityRest()) return (await activityRest(`admin_mail_items?select=*&kind=neq.attachment&order=updated_at.desc&limit=500${scope ? `&scope=eq.${encodeURIComponent(scope)}` : ""}${kind ? `&kind=eq.${encodeURIComponent(kind)}` : ""}${status ? `&data->>status=eq.${encodeURIComponent(status)}` : ""}`)).json();
  if (process.env.NODE_ENV === "production") throw new Error("Mail storage is not configured");
  await mkdir(directory, { recursive: true });
  const rows = await Promise.all((await readdir(directory)).filter(name => name.endsWith(".json")).map(async name => JSON.parse(await readFile(path.join(directory, name), "utf8")) as MailItem));
  return rows.filter(row => row.kind !== "attachment" && (!scope || row.scope === scope) && (!kind || row.kind === kind) && (!status || row.data.status === status)).sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,500);
}
export async function getMail(id: string): Promise<MailItem | null> {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) throw new Error("Invalid mail ID");
  const pool = getCareersPool();
  if (pool) { await prepareMailStore(); return (await pool.query("SELECT * FROM admin_mail_items WHERE id=$1", [id])).rows[0] || null; }
  if (hasActivityRest()) return (await (await activityRest(`admin_mail_items?select=*&id=eq.${id}&limit=1`)).json())[0] || null;
  if (process.env.NODE_ENV === "production") throw new Error("Mail storage is not configured");
  try { return JSON.parse(await readFile(path.join(directory, `${id}.json`), "utf8")); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
/** Compare-and-swap prevents stale tabs overwriting drafts and concurrent sends claiming one item twice. */
export async function putMail(item: Omit<MailItem, "version" | "updated_at">, expectedVersion: number): Promise<MailItem> {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(item.id)) throw new Error("Invalid mail ID");
  const row: MailItem = { ...item, version: expectedVersion + 1, updated_at: new Date().toISOString() };
  const pool = getCareersPool();
  if (pool) {
    await prepareMailStore();
    const result = expectedVersion === 0
      ? await pool.query("INSERT INTO admin_mail_items(id,kind,scope,version,updated_at,data) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *", [row.id,row.kind,row.scope,row.version,row.updated_at,JSON.stringify(row.data)])
      : await pool.query("UPDATE admin_mail_items SET data=$2, version=$3,updated_at=$4 WHERE id=$1 AND version=$5 AND scope=$6 AND kind=$7 RETURNING *", [row.id,JSON.stringify(row.data),row.version,row.updated_at,expectedVersion,row.scope,row.kind]);
    if (!result.rows[0]) throw new Error("MAIL_CONFLICT"); return result.rows[0];
  }
  if (hasActivityRest()) {
    const response = expectedVersion === 0
      ? await activityRest("admin_mail_items?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(row) })
      : await activityRest(`admin_mail_items?id=eq.${row.id}&version=eq.${expectedVersion}&scope=eq.${encodeURIComponent(row.scope)}&kind=eq.${row.kind}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ data: row.data, version: row.version, updated_at: row.updated_at }) });
    const rows = await response.json(); if (!rows[0]) throw new Error("MAIL_CONFLICT"); return rows[0];
  }
  // Serialize local development writes without allowing a stale version to replace newer work.
  const previous = localWrite;
  let release!: () => void; localWrite = new Promise(resolve => { release = resolve; });
  await previous;
  try {
    const current = await getMail(row.id); if ((current?.version || 0) !== expectedVersion) throw new Error("MAIL_CONFLICT");
    await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, `${row.id}.json`), JSON.stringify(row)); return row;
  } finally { release(); }
}
let localWrite = Promise.resolve();

export async function insertMailBatch(items: Omit<MailItem, "version" | "updated_at">[]) {
  const rows = items.map(item => ({ ...item, version: 1, updated_at: new Date().toISOString() }));
  const pool = getCareersPool();
  if (pool) {
    await prepareMailStore();
    await pool.query("INSERT INTO admin_mail_items(id,kind,scope,version,updated_at,data) SELECT id,kind,scope,version,updated_at,data FROM jsonb_to_recordset($1::jsonb) AS x(id text,kind text,scope text,version integer,updated_at timestamptz,data jsonb) ON CONFLICT DO NOTHING", [JSON.stringify(rows)]); return;
  }
  if (hasActivityRest()) { await activityRest("admin_mail_items?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(rows) }); return; }
  for (const item of items) { try { await putMail(item,0); } catch (error) { if ((error as Error).message !== "MAIL_CONFLICT") throw error; } }
}

export type MailAttachment = { id?: string; name: string; size?: number; type?: string; content: string };
/** Attachments are written once; typing in a draft never reuploads their bytes. */
export async function storeMailAttachments(attachments: MailAttachment[], scope: string) {
  if (!Array.isArray(attachments) || attachments.length > 15) throw Error("Invalid attachments");
  let total = 0;
  const rows = attachments.map(attachment => {
    if (typeof attachment.name !== "string" || attachment.name.length > 250 || typeof attachment.content !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.content)) throw Error("Invalid attachment");
    total += attachment.content.length; if (total > 24000000) throw Error("Attachments exceed the draft size limit");
    const id = createHash("sha256").update(scope).update(attachment.content).digest("hex");
    return { id, kind: "attachment" as const, scope, data: { name: attachment.name, size: attachment.size || Math.floor(attachment.content.length * 0.75), type: attachment.type || "application/octet-stream", content: attachment.content } };
  });
  if (rows.length) await insertMailBatch(rows);
  return rows.map(row => ({ id: row.id, name: row.data.name, size: row.data.size, type: row.data.type }));
}
export async function hydrateMailAttachments(attachments: Partial<MailAttachment>[] = [], scope: string) {
  return Promise.all(attachments.map(async attachment => {
    if (attachment.content) return attachment;
    const item = await getMail(attachment.id || "");
    if (!item || item.kind !== "attachment" || item.scope !== scope) throw Error("A saved attachment is unavailable; delivery was stopped.");
    return { ...item.data, name: attachment.name, type: attachment.type };
  }));
}
