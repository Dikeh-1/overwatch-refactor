import { safeMailHtml } from "@/lib/communication-content";
import { authenticated } from "@/lib/careers-auth";

export const dynamic = "force-dynamic";
const mailbox = "info@overwatchmoz.com";
type ZohoAccount = { primaryEmailAddress?: string; accountId: string; emailAddress?: { mailId?: string; isConfirmed?: boolean }[] };
function addressedToMailbox(data: { toAddress?: string; ccAddress?: string }) {
  return [data.toAddress, data.ccAddress].some(value => (String(value || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).some(address => address.toLowerCase() === mailbox));
}
let cachedToken: { token: string; expires: number } | undefined;
async function zohoToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  if (process.env.ZOHO_MAIL_REFRESH_TOKEN && process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET) {
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: process.env.ZOHO_MAIL_REFRESH_TOKEN, client_id: process.env.ZOHO_MAIL_CLIENT_ID, client_secret: process.env.ZOHO_MAIL_CLIENT_SECRET }), signal: AbortSignal.timeout(12000), cache: "no-store" });
    const data = await response.json(); if (!response.ok || !data.access_token) throw Error("Zoho authorization needs renewal");
    cachedToken = { token: data.access_token, expires: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000 }; return data.access_token;
  }
  if (process.env.ZOHO_MAIL_ACCESS_TOKEN) return process.env.ZOHO_MAIL_ACCESS_TOKEN;
  return null;
}
export async function GET(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const token = await zohoToken();
    if (!token) return Response.json({ connected: false, items: [], mailbox: "info@overwatchmoz.com" });
    const read = async (url: string) => {
      const response = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
      const data = await response.json(); if (!response.ok || data.status?.code !== 200) throw Error("Zoho mailbox could not be read. Check its read-only authorization."); return data.data;
    };
    const accounts = await read("https://mail.zoho.com/api/accounts");
    let account = accounts.find((item: ZohoAccount) => item.primaryEmailAddress?.toLowerCase() === mailbox) as ZohoAccount | undefined;
    if (!account) {
      // The owner confirmed info@ is an alias of comercial@. Verify that relationship with Zoho.
      const owner = accounts.find((item: ZohoAccount) => item.primaryEmailAddress?.toLowerCase() === "comercial@overwatchmoz.com") as ZohoAccount | undefined;
      if (owner && /^\d+$/.test(String(owner.accountId))) {
        const details = await read(`https://mail.zoho.com/api/accounts/${owner.accountId}`) as ZohoAccount;
        if (details.emailAddress?.some(alias => alias.mailId?.toLowerCase() === mailbox && alias.isConfirmed === true)) account = owner;
      }
    }
    if (!account || !/^\d+$/.test(String(account.accountId))) throw Error("The connected Zoho account does not contain info@overwatchmoz.com");
    const params = new URL(request.url).searchParams;
    if (params.has("messageId")) {
      const messageId = params.get("messageId"), folderId = params.get("folderId");
      if (!/^\d+$/.test(messageId || "") || !/^\d+$/.test(folderId || "")) return Response.json({ error: "Invalid message" }, { status: 400 });
      const metadata = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/folders/${folderId}/messages/${messageId}/details`);
      if (!addressedToMailbox(metadata)) return Response.json({ error: "This message is not addressed to info@overwatchmoz.com" }, { status: 404 });
      const message = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/folders/${folderId}/messages/${messageId}/content`);
      return Response.json({ body: safeMailHtml(message.content || "") }, { headers: { "Cache-Control": "no-store" } });
    }
    const search = new URLSearchParams({ searchKey: `to:${mailbox}::or:cc:${mailbox}`, limit: "100", includeto: "true", receivedTime: String(Date.now()) });
    const rows = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/messages/search?${search}`);
    return Response.json({ connected: true, mailbox: "info@overwatchmoz.com", items: rows.map((item: {messageId: string;receivedTime: string;subject: string;fromAddress: string;summary: string;folderId: string}) => ({ id: String(item.messageId), updated_at: new Date(Number(item.receivedTime)).toISOString(), data: { subject: item.subject, from: item.fromAddress, body: item.summary, status: "received", messageId: item.messageId, folderId: item.folderId } })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: 503 }); }
}
