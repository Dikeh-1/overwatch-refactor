import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getMail, listMail, putMail, storeMailAttachments, hydrateMailAttachments } from "@/lib/communication-mail-store";
import { campaignStatus, cancelCampaign } from "@/lib/communication-campaigns";
import { recordActivity } from "@/lib/admin-activity";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") || undefined;
    const items = await listMail(scope);
    // Attachment bytes stay in persisted drafts, but never inflate mailbox listings.
    return Response.json({ items: items.map(item => ({ ...item, data: { ...item.data, status: campaignStatus(item, items), attachments: undefined } })), incomingConnected: Boolean(process.env.ZOHO_MAIL_ACCESS_TOKEN || (process.env.ZOHO_MAIL_REFRESH_TOKEN && process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET)) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Mailbox unavailable. Your draft has not been discarded." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return Response.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action === "delete") {
      if (typeof body.scope !== "string" || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 500 || body.ids.some((id: unknown) => typeof id !== "string" || !/^[\w-]{1,120}$/.test(id))) return Response.json({ error: "Invalid message selection" }, { status: 400 });
      const deleted: string[] = [], blocked: string[] = [];
      for (const id of [...new Set<string>(body.ids)]) {
        const item = await getMail(id);
        if (item?.kind === "draft" && item.scope === body.scope && item.data.status === "queued") {
          try { await cancelCampaign(item); deleted.push(id); } catch { blocked.push(id); }
          continue;
        }
        if (!item || item.scope !== body.scope || !["outbox", "automation"].includes(item.kind) || !["queued", "failed", "skipped", "waiting_for_booking", "needs_attention", "deleted"].includes(item.data.status)) { blocked.push(id); continue; }
        try {
          await putMail({ ...item, data: { ...item.data, status: "deleted", deletedAt: new Date().toISOString() } }, item.version);
          deleted.push(id);
        } catch { blocked.push(id); }
      }
      if (deleted.length) await recordActivity({ action: "Outbox messages cancelled", section: "communications", outcome: "succeeded", details: { scope: body.scope, messageIds: deleted } }).catch(() => console.error("Outbox cancellation history could not be saved"));
      return Response.json({ deleted, blocked });
    }
    if (!/^[\w-]{1,120}$/.test(body.id || "") || typeof body.scope !== "string" || body.scope.length > 250) return Response.json({ error: "Invalid draft" }, { status: 400 });
    const current = await getMail(body.id);
    if (body.action === "retry") {
      const safeFailure = /attachment is missing|^This applicant is no longer eligible for a booking invitation\.$/.test(current?.data.error || "");
      if (current?.kind !== "outbox" || current.scope !== body.scope || current.data.status !== "failed" || !safeFailure) return Response.json({ error: "This delivery cannot be safely retried. Verify its provider history first." }, { status: 409 });
      await putMail({ ...current, data: { ...current.data, status: "queued", error: undefined } }, current.version);
      await recordActivity({ action: "Failed email requeued", section: "communications", outcome: "succeeded", details: { messageId: current.id, scope: current.scope } }).catch(() => {});
      return Response.json({ success: true });
    }
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
