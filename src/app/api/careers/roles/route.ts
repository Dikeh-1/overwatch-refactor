import { getRoleDefinitions } from "@/lib/careers-campaign-store";
import { getRoles } from "@/lib/careers-store";
import { roles as fallbackRoles } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roleDefs = await getRoleDefinitions().catch(() => null);
    if (roleDefs && roleDefs.length > 0) {
      return Response.json(
        {
          roles: roleDefs.map((r) => ({
            id: r.id,
            en: r.en,
            pt: r.pt,
            open: Boolean(r.open),
            department: r.department,
            descriptionEn: r.descriptionEn,
            descriptionPt: r.descriptionPt,
            screeningRules: r.screeningRules,
            pipelineStages: r.pipelineStages,
            activeCohortId: r.activeCohortId,
          })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const legacy = await getRoles().catch(() => null);
    if (legacy && legacy.length > 0) {
      return Response.json({ roles: legacy }, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({ roles: fallbackRoles }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ roles: fallbackRoles }, { headers: { "Cache-Control": "no-store" } });
  }
}
