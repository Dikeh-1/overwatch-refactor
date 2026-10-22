import { after } from "next/server";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { auditRequest } from "@/lib/admin-activity";
import { processStudioQueue } from "@/lib/communication-delivery";

export const maxDuration = 300;
async function handlePOST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return Response.json({ error: "Unauthorized" }, { status: 403 });
  {
    const body = await request.json().catch(() => null);
    if (typeof body?.scope !== "string" || body.scope.length > 250) return Response.json({ error: "Invalid mailbox" }, { status: 400 });
    after(async () => { await processStudioQueue(body.scope); });
    return Response.json({ success: true });
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
