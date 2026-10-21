import { auditRequest } from "@/lib/admin-activity";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getConfiguredTestSlots, setConfiguredTestSlots, getSystemConfig, setSystemConfig } from "@/lib/careers-config-store";
import { DEFAULT_ADMIN_SETTINGS, validAdminSettings } from "@/lib/admin-settings";
export async function GET() {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [settings, slots] = await Promise.all([getSystemConfig("admin_settings", DEFAULT_ADMIN_SETTINGS), getConfiguredTestSlots()]);
    return Response.json({ ...settings, quota: slots.quota }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to load settings" }, { status: 503 }); }
}
async function handlePOST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const value: unknown = await request.json().catch(() => null);
  if (!validAdminSettings(value)) return Response.json({ error: "Enter a sender name, valid reply-to address and capacity between 1 and 200." }, { status: 400 });
  try {
    const slots = await getConfiguredTestSlots();
    await setConfiguredTestSlots({ ...slots, quota: value.quota });
    await setSystemConfig("admin_settings", { senderName: value.senderName.trim(), replyToEmail: value.replyToEmail.trim() });
    return Response.json({ success: true });
  } catch { return Response.json({ error: "Settings could not be fully saved. Reload and retry." }, { status: 503 }); }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
