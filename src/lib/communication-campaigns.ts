import "server-only";
import { getMail, putMail, type MailItem } from "./communication-mail-store";

/** A campaign is complete only when every frozen recipient has a final record. */
export function campaignStatus(campaign: MailItem, rows: MailItem[]): string {
  if (campaign.kind !== "draft" || campaign.data.status !== "queued" || !Array.isArray(campaign.data.queuedItems) || !campaign.data.queuedItems.length) return campaign.data.status;
  const byId = new Map(rows.map(row => [row.id, row]));
  const children: (MailItem | undefined)[] = campaign.data.queuedItems.map((item: MailItem) => byId.get(item.id));
  if (children.some(row => !row || row.kind !== "outbox" || row.scope !== campaign.scope || row.data.campaignId !== campaign.id || !["sent", "failed", "skipped", "deleted", "needs_verification"].includes(row.data.status))) return "queued";
  return children.every(row => row?.data.status === "sent") ? "sent" : "completed";
}

/** Cancel recovery first, then tombstone unclaimed recipients. Sent/in-flight evidence remains. */
export async function cancelCampaign(campaign: MailItem) {
  if (campaign.kind !== "draft" || campaign.data.status !== "queued") throw Error("CAMPAIGN_NOT_QUEUED");
  await putMail({ ...campaign, data: { ...campaign.data, status: "cancelled", cancelledAt: new Date().toISOString() } }, campaign.version);
  const frozen = Array.isArray(campaign.data.queuedItems) ? campaign.data.queuedItems as MailItem[] : [];
  for (let offset = 0; offset < frozen.length; offset += 5) {
    await Promise.all(frozen.slice(offset, offset + 5).map(async entry => {
      if (!/^[\w-]{1,120}$/.test(entry.id) || entry.kind !== "outbox" || entry.scope !== campaign.scope || entry.data.campaignId !== campaign.id) return;
      const row = await getMail(entry.id);
      if (row && (row.kind !== "outbox" || row.scope !== campaign.scope || row.data.campaignId !== campaign.id || !["queued", "failed", "skipped"].includes(row.data.status))) return;
      const target = row || entry;
      try { await putMail({ ...target, data: { ...target.data, status: "deleted", deletedAt: new Date().toISOString() } }, row?.version || 0); }
      catch (error) { if ((error as Error).message !== "MAIL_CONFLICT") throw error; }
    }));
  }
}
