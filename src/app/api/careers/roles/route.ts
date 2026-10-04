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
        { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } },
      );
    }

    const legacy = await getRoles().catch(() => null);
    if (legacy && legacy.length > 0) {
      return Response.json({ roles: legacy }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } });
    }

    return Response.json({ roles: fallbackRoles }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ roles: fallbackRoles }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } });
  }
}
