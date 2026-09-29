import { authenticated, sameOrigin } from "@/lib/careers-auth";
import {
  getApplications,
  getApplication,
  getRoles,
  setRole,
  setStatus,
  deleteApplication,
  deleteApplications,
  updateApplication,
  getDeletedNextPhaseIdentifiers,
} from "@/lib/careers-store";
import { roles, stages } from "@/lib/careers";
import crypto from "node:crypto";
export async function GET() {
  if (!(await authenticated())) return new Response(null, { status: 401 });
  try {
    const [applications, roles, deletedNextPhase] = await Promise.all([
      getApplications(),
      getRoles(),
      getDeletedNextPhaseIdentifiers(),
    ]);
    return Response.json(
      { applications, roles, deletedNextPhase },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Admin careers GET error:", err);
    return Response.json(
      {
        error: "Storage unavailable. Check the Supabase connection.",
        details: (err as Error)?.message || String(err),
      },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request))
    return new Response(null, { status: 403 });
  try {
    const data = await request.json();
    if (
      data.kind === "role" &&
      roles.some((r) => r.id === data.id) &&
      typeof data.open === "boolean"
    )
      await setRole(data.id, data.open);
    else if (
      data.kind === "status" &&
      stages.includes(data.status) &&
      /^[\da-f-]{36}$/.test(data.id)
    ) {
      await setStatus(data.id, data.status);
      if (data.status === "next_phase_selected" || data.status === "next_phase_invited") {
        const app = await getApplication(data.id);
        const updates: Record<string, any> = {
          nextPhaseStatus: data.status === "next_phase_invited" ? "invited" : "selected",
        };
        if (!app?.nextPhaseToken) {
          updates.nextPhaseToken = crypto.randomBytes(16).toString("hex");
        }
        await updateApplication(data.id, updates);
      } else if (data.status === "archived" || data.status === "rejected" || data.status === "not_advancing") {
        await updateApplication(data.id, { nextPhaseStatus: undefined });
      }
    }
    else if (
      data.kind === "bulk_status" &&
      stages.includes(data.status) &&
      Array.isArray(data.ids) &&
      data.ids.length > 0
    ) {
      for (const id of data.ids) {
        if (/^[\da-f-]{36}$/.test(id)) {
          await setStatus(id, data.status);
          if (data.status === "next_phase_selected" || data.status === "next_phase_invited") {
            const app = await getApplication(id);
            const updates: Record<string, any> = {
              nextPhaseStatus: data.status === "next_phase_invited" ? "invited" : "selected",
            };
            if (!app?.nextPhaseToken) {
              updates.nextPhaseToken = crypto.randomBytes(16).toString("hex");
            }
            await updateApplication(id, updates);
          } else if (data.status === "archived" || data.status === "rejected" || data.status === "not_advancing") {
            await updateApplication(id, { nextPhaseStatus: undefined });
          }
        }
      }
    }
    else if (
      data.kind === "clear_slot" &&
      /^[\da-f-]{36}$/.test(data.id)
    ) {
      // Clear booked test slot without changing candidate status
      await updateApplication(data.id, { testSlot: undefined, testBookedAt: undefined });
    }
    else if (
      data.kind === "score" &&
      /^[\da-f-]{36}$/.test(data.id) &&
      typeof data.score === "number"
    ) {
      const sanitizedScore = Math.max(0, Math.min(100, Math.round(data.score)));
      await updateApplication(data.id, { testScore: sanitizedScore });
    }
    else {
      return new Response(null, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("Admin careers PATCH error:", err);
    return Response.json({ error: "Could not save changes." }, { status: 503 });
  }
}


  export async function DELETE(request: Request) {
    if (!(await authenticated()) || !sameOrigin(request)) {
      return new Response(null, { status: 403 });
    }

    try {
      const data = await request.json();
      if (
        data.id &&
        typeof data.id === "string" &&
        /^[\da-f-]{36}$/i.test(data.id)
      ) {
        await deleteApplication(data.id);
        return Response.json({ success: true, count: 1 });
      } else if (
        Array.isArray(data.ids) &&
        data.ids.length > 0
      ) {
        const validIds = data.ids.filter(
          (id: unknown): id is string =>
            typeof id === "string" && /^[\da-f-]{36}$/i.test(id),
        );
        if (!validIds.length) {
          return Response.json(
            { error: "No valid application IDs provided." },
            { status: 400 },
          );
        }
        await deleteApplications(validIds);
        return Response.json({ success: true, count: validIds.length });
      } else {
        return Response.json({ error: "Invalid delete payload." }, { status: 400 });
      }
    } catch (err) {
      console.error("Admin careers DELETE error:", err);
      return Response.json(
        { error: "Could not delete application(s)." },
        { status: 503 },
      );
    }
  }

