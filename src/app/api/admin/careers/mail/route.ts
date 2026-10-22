import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getMail, listMail, putMail, storeMailAttachments, hydrateMailAttachments } from "@/lib/communication-mail-store";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") || undefined;
    const items = await listMail(scope);
    // Attachment bytes stay in persisted drafts, but never inflate mailbox listings.
    return Response.json({ items: items.map(item => ({ ...item, data: { ...item.data, attachments: undefined } })), incomingConnected: Boolean(process.env.ZOHO_MAIL_ACCOUNT_ID && (process.env.ZOHO_MAIL_ACCESS_TOKEN || process.env.ZOHO_MAIL_REFRESH_TOKEN)) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Mailbox unavailable. Your draft has not been discarded." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return Response.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    if (!/^[\w-]{1,120}$/.test(body.id || "") || typeof body.scope !== "string" || body.scope.length > 250) return Response.json({ error: "Invalid draft" }, { status: 400 });
    const current = await getMail(body.id);
    if (body.action === "load") {
      if (current?.kind !== "draft" || current.scope !== body.scope) return Response.json({ error: "Draft not found" }, { status: 404 });
      return Response.json({ item: { ...current, data: { ...current.data, attachments: await hydrateMailAttachments(current.data.attachments, current.scope) } } });
    }
    if (!Number.isInteger(body.version) || body.version < 0 || !body.data || typeof body.data.subject !== "string" || typeof body.data.messageBody !== "string" || body.data.subject.length > 1000 || body.data.messageBody.length > 100000 || JSON.stringify(body.data).length > 25000000) return Response.json({ error: "Draft exceeds supported limits" }, { status: 400 });
    if (current && (current.kind !== "draft" || current.scope !== body.scope || current.data.status !== "draft")) return Response.json({ error: "This draft is no longer editable. Start a new draft." }, { status: 409 });
    const attachments = body.data.attachments === undefined ? current?.data.attachments || [] : await storeMailAttachments(body.data.attachments, body.scope);
    const item = await putMail({ id: body.id, kind: "draft", scope: body.scope, data: { ...body.data, attachments, status: "draft" } }, body.version);
    return Response.json({ item: { ...item, data: { ...item.data, attachments: undefined } } });
  } catch (error) { return Response.json({ error: (error as Error).message === "MAIL_CONFLICT" ? "This draft changed in another tab. Reload it before editing; your local recovery copy is preserved." : "Draft could not be saved. Keep this page open and retry." }, { status: (error as Error).message === "MAIL_CONFLICT" ? 409 : 503 }); }
}
