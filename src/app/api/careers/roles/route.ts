import { getRoles } from "@/lib/careers-store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      { roles: await getRoles() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
}
