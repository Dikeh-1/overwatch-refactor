import { safeEmailDocument } from "@/lib/communication-content";
import { authenticated } from "@/lib/careers-auth";

export const dynamic = "force-dynamic";
const mailbox = "info@overwatchmoz.com";
type ZohoAccount = { primaryEmailAddress?: string; accountId: string; emailAddress?: { mailId?: string; isConfirmed?: boolean }[] };

function addressedToMailbox(data: { toAddress?: string; ccAddress?: string }) {
  return [data.toAddress, data.ccAddress].some(value =>
    (String(value || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).some(
      address => address.toLowerCase() === mailbox
    )
  );
}

function detectImageMime(buf: Buffer, name = ""): string {
  const hex = buf.subarray(0, 4).toString("hex").toLowerCase();
  if (hex === "89504e47") return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex === "47494638") return "image/gif";
  if (hex === "52494646") return "image/webp";
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

let cachedToken: { token: string; expires: number } | undefined;
async function zohoToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  if (process.env.ZOHO_MAIL_REFRESH_TOKEN && process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET) {
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.ZOHO_MAIL_REFRESH_TOKEN,
        client_id: process.env.ZOHO_MAIL_CLIENT_ID,
        client_secret: process.env.ZOHO_MAIL_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw Error("Zoho authorization needs renewal");
    cachedToken = { token: data.access_token, expires: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000 };
    return data.access_token;
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
      const response = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok || data.status?.code !== 200) {
        throw Error("Zoho mailbox could not be read. Check its read-only authorization.");
      }
      return data.data;
    };
    const accounts = await read("https://mail.zoho.com/api/accounts");
    let account = accounts.find((item: ZohoAccount) => item.primaryEmailAddress?.toLowerCase() === mailbox) as ZohoAccount | undefined;
    if (!account) {
      // The owner confirmed info@ is an alias of comercial@. Verify that relationship with Zoho.
      const owner = accounts.find((item: ZohoAccount) => item.primaryEmailAddress?.toLowerCase() === "comercial@overwatchmoz.com") as ZohoAccount | undefined;
      if (owner && /^\d+$/.test(String(owner.accountId))) {
        const details = (await read(`https://mail.zoho.com/api/accounts/${owner.accountId}`)) as ZohoAccount;
        if (details.emailAddress?.some(alias => alias.mailId?.toLowerCase() === mailbox && alias.isConfirmed === true)) account = owner;
      }
    }
    if (!account || !/^\d+$/.test(String(account.accountId))) throw Error("The connected Zoho account does not contain info@overwatchmoz.com");
    const params = new URL(request.url).searchParams;
    if (params.has("messageId")) {
      const messageId = params.get("messageId"),
        folderId = params.get("folderId");
      if (!/^\d+$/.test(messageId || "") || !/^\d+$/.test(folderId || "")) return Response.json({ error: "Invalid message" }, { status: 400 });
      const metadata = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/folders/${folderId}/messages/${messageId}/details`);
      if (!addressedToMailbox(metadata)) return Response.json({ error: "This message is not addressed to info@overwatchmoz.com" }, { status: 404 });
      const message = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/folders/${folderId}/messages/${messageId}/content`);
      let html = String(message.content || "");

      const msgBaseUrl = `https://mail.zoho.com/api/accounts/${account.accountId}/folders/${folderId}/messages/${messageId}`;
      const hasInlineImgTag = /<img\b[^>]*src=/i.test(html);
      const hasAttachmentsFlag = Boolean(metadata.hasInline) || Number(metadata.hasAttachment) > 0;

      if (hasInlineImgTag || hasAttachmentsFlag) {
        try {
          const cidToDataUri = new Map<string, string>();
          const nameToDataUri = new Map<string, string>();
          const standaloneImages: { name: string; dataUri: string }[] = [];

          // 1. Resolve inline CIDs directly referenced in <img> tags
          const imgSrcMatches = [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
          for (const match of imgSrcMatches) {
            const rawSrc = match[1].replace(/&amp;/g, "&");
            const cidMatch = rawSrc.match(/(?:[?&]cid=|^cid:)([^&"'\s>]+)/i);
            const fileMatch = rawSrc.match(/[?&]f=([^&"'\s>]+)/i);
            if (cidMatch?.[1]) {
              const cid = decodeURIComponent(cidMatch[1]);
              if (!cidToDataUri.has(cid)) {
                const binRes = await fetch(`${msgBaseUrl}/inline?contentId=${encodeURIComponent(cid)}`, {
                  headers: { Authorization: `Zoho-oauthtoken ${token}` },
                  cache: "no-store",
                  signal: AbortSignal.timeout(12000),
                }).catch(() => null);
                if (binRes && binRes.ok) {
                  const buf = Buffer.from(await binRes.arrayBuffer());
                  if (buf.length > 0 && buf.length <= 8 * 1024 * 1024) {
                    const mime = detectImageMime(buf, fileMatch?.[1] || "");
                    cidToDataUri.set(cid, `data:${mime};base64,${buf.toString("base64")}`);
                  }
                }
              }
            }
          }

          // 2. Also check attachmentinfo for any inline or regular image attachments
          if (hasAttachmentsFlag || (hasInlineImgTag && cidToDataUri.size === 0)) {
            const attInfo = await read(`${msgBaseUrl}/attachmentinfo?includeInline=true`).catch(() => null);
            const inlineList: { attachmentId?: string; attachmentName?: string; cid?: string }[] = Array.isArray(attInfo?.inline) ? attInfo.inline : [];
            const regularList: { attachmentId?: string; attachmentName?: string; cid?: string }[] = Array.isArray(attInfo?.attachments) ? attInfo.attachments : [];

            for (const att of inlineList) {
              const cid = att.cid ? String(att.cid) : "";
              if (cid && cidToDataUri.has(cid)) continue;
              if (!att.attachmentId) continue;
              const binRes = await fetch(`${msgBaseUrl}/attachments/${encodeURIComponent(att.attachmentId)}`, {
                headers: { Authorization: `Zoho-oauthtoken ${token}` },
                cache: "no-store",
                signal: AbortSignal.timeout(12000),
              }).catch(() => null);
              if (binRes && binRes.ok) {
                const buf = Buffer.from(await binRes.arrayBuffer());
                if (buf.length > 0 && buf.length <= 8 * 1024 * 1024) {
                  const mime = detectImageMime(buf, att.attachmentName || "");
                  const uri = `data:${mime};base64,${buf.toString("base64")}`;
                  if (cid) cidToDataUri.set(cid, uri);
                  if (att.attachmentName) nameToDataUri.set(att.attachmentName, uri);
                }
              }
            }

            for (const att of regularList) {
              const name = String(att.attachmentName || "");
              if (!/\.(png|jpe?g|gif|webp)$/i.test(name) || !att.attachmentId) continue;
              const binRes = await fetch(`${msgBaseUrl}/attachments/${encodeURIComponent(att.attachmentId)}`, {
                headers: { Authorization: `Zoho-oauthtoken ${token}` },
                cache: "no-store",
                signal: AbortSignal.timeout(12000),
              }).catch(() => null);
              if (binRes && binRes.ok) {
                const buf = Buffer.from(await binRes.arrayBuffer());
                if (buf.length > 0 && buf.length <= 8 * 1024 * 1024) {
                  const mime = detectImageMime(buf, name);
                  standaloneImages.push({ name, dataUri: `data:${mime};base64,${buf.toString("base64")}` });
                }
              }
            }
          }

          if (cidToDataUri.size > 0 || nameToDataUri.size > 0) {
            html = html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (full, prefix, rawSrc, suffix) => {
              const unescaped = String(rawSrc).replace(/&amp;/g, "&");
              const cidMatch = unescaped.match(/(?:[?&]cid=|^cid:)([^&"'\s>]+)/i);
              if (cidMatch?.[1]) {
                const cid = decodeURIComponent(cidMatch[1]);
                const uri = cidToDataUri.get(cid);
                if (uri) return `${prefix}${uri}${suffix}`;
              }
              const fileMatch = unescaped.match(/[?&]f=([^&"'\s>]+)/i);
              if (fileMatch?.[1]) {
                const fileName = decodeURIComponent(fileMatch[1]);
                const uri = nameToDataUri.get(fileName);
                if (uri) return `${prefix}${uri}${suffix}`;
              }
              return full;
            });
          }

          if (standaloneImages.length > 0) {
            const appended = standaloneImages
              .map(
                img =>
                  `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0"><p style="font-size:12px;font-weight:700;color:#475569;margin:0 0 8px 0">${img.name.replace(/[<>&"']/g, "")}</p><img src="${img.dataUri}" alt="${img.name.replace(/[<>&"']/g, "")}" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px" /></div>`
              )
              .join("");
            html += appended;
          }
        } catch {
          // Graceful fallback if attachment hydration fails
        }
      }

      return Response.json({ body: safeEmailDocument(html) }, { headers: { "Cache-Control": "no-store" } });
    }
    const search = new URLSearchParams({
      searchKey: `to:${mailbox}::or:cc:${mailbox}`,
      limit: "100",
      includeto: "true",
      receivedTime: String(Date.now()),
    });
    const rows = await read(`https://mail.zoho.com/api/accounts/${account.accountId}/messages/search?${search}`);
    return Response.json(
      {
        connected: true,
        mailbox: "info@overwatchmoz.com",
        items: rows.map(
          (item: { messageId: string; receivedTime: string; subject: string; fromAddress: string; summary: string; folderId: string }) => ({
            id: String(item.messageId),
            updated_at: new Date(Number(item.receivedTime)).toISOString(),
            data: {
              subject: item.subject,
              from: item.fromAddress,
              body: item.summary,
              status: "received",
              messageId: item.messageId,
              folderId: item.folderId,
            },
          })
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 503 });
  }
}
