import { safeEmailDocument } from "@/lib/communication-content";
import { authenticated } from "@/lib/careers-auth";
import { getMail } from "@/lib/communication-mail-store";
import { getApplication } from "@/lib/careers-store";
import { readProviderMessage } from "@/lib/communication-provider-history";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams, id = params.get("id") || "", scope = params.get("scope");
  if (!/^[\w-]{1,120}$/.test(id)) return Response.json({ error: "Invalid message" }, { status: 400 });
  try {
    const item = await getMail(id);
    let record;
    if (item?.kind === "outbox" && item.scope === scope && item.data.status === "sent") record = { recipient: item.data.recipient, subject: item.data.subject, sentAt: item.data.sentAt, providerMessageId: item.data.providerMessageId };
    else if (params.get("candidateId")) {
      const application = await getApplication(params.get("candidateId")!);
      const historical = application?.communications?.find(row => row.id === id && ["sent", "delivered"].includes(row.status));
      if (historical) record = { recipient: historical.recipient || application!.email, subject: historical.subject, sentAt: historical.sentAt };
    }
    if (!record) return Response.json({ error: "Message not found" }, { status: 404 });
    const evidence = await readProviderMessage(record);
    return Response.json({ ...evidence, htmlContent: (item?.data.htmlContent || evidence.htmlContent) ? safeEmailDocument(item?.data.htmlContent || evidence.htmlContent || "") : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Provider history is temporarily unavailable. The message has not been resent." }, { status: 503 }); }
}
