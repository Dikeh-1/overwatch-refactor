import { auditRequest } from "@/lib/admin-activity";
import { getRecruitmentWorkspaceData } from "@/lib/careers-workspace-store";
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
    const [workspace, deletedNextPhase] = await Promise.all([getRecruitmentWorkspaceData(), getDeletedNextPhaseIdentifiers()]);
    return Response.json({ applications: workspace.applications, roles: workspace.roles, cohorts: workspace.cohorts, deletedNextPhase }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin recruitment read failed", error);
    return Response.json({ error: "Candidate storage unavailable. Please retry." }, { status: 503 });
  }
}
async function handlePATCH(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request))
    return new Response(null, { status: 403 });
  try {
    const data = await request.json();
    if (
      data.kind === "role" &&
      (await getRoles()).some((r) => r.id === data.id) &&
      typeof data.open === "boolean"
    ) {
      const manager = await import("@/lib/careers-campaign-store");
      if (data.open) await manager.openRoleCohort(data.id);
      else await manager.closeAndArchiveRoleCohort(data.id);
    }
    else if (
      data.kind === "status" &&
      stages.includes(data.status) &&
      typeof data.id === "string" && /^[\w-]{6,64}$/i.test(data.id.trim())
    ) {
      const app = await getApplication(data.id);
      if (!app) return Response.json({ error: "Candidate not found" }, { status: 404 });
      const updates: Record<string, any> = { status: data.status };
      if (data.status === "archived") { updates.statusBeforeArchive = app.status === "archived" ? app.statusBeforeArchive : app.status; updates.archiveReason = data.reason || "Other"; }
      if (data.status === "next_phase_selected" || data.status === "next_phase_invited") {
        updates.nextPhaseStatus = data.status === "next_phase_invited" ? "invited" : "selected";
        if (!app?.nextPhaseToken) {
          updates.nextPhaseToken = crypto.randomBytes(16).toString("hex");
        }
      } else if (data.status === "archived" || data.status === "rejected" || data.status === "not_advancing") {
        updates.nextPhaseStatus = undefined;
      }
      if (data.status === "hired") {
        updates.hiredAt = new Date().toISOString();
      }
      const currentLog = app?.activityLog || [];
      updates.activityLog = [
        ...currentLog,
        {
          action: `Stage Transition: ${data.status}`,
          details: `Candidate stage moved to "${data.status}" via Admin Portal`,
          actor: "Admin Recruiter",
          timestamp: new Date().toISOString(),
        },
      ];
      await updateApplication(data.id, updates);
    }
    else if (
      data.kind === "bulk_status" &&
      stages.includes(data.status) &&
      Array.isArray(data.ids) &&
      data.ids.length > 0
    ) {
      if (data.ids.some((id: unknown) => typeof id !== "string" || !/^[\w-]{6,64}$/i.test(id))) return Response.json({ error: "Invalid candidate IDs" }, { status: 400 });
      for (const id of new Set<string>(data.ids)) {
        if (typeof id === "string" && /^[\w-]{6,64}$/i.test(id.trim())) {
          const app = await getApplication(id);
          if (!app) throw new Error("Candidate not found");
          const updates: Record<string, any> = { status: data.status };
      if (data.status === "archived") { updates.statusBeforeArchive = app.status === "archived" ? app.statusBeforeArchive : app.status; updates.archiveReason = data.reason || "Other"; }
          if (data.status === "next_phase_selected" || data.status === "next_phase_invited") {
            updates.nextPhaseStatus = data.status === "next_phase_invited" ? "invited" : "selected";
            if (!app?.nextPhaseToken) {
              updates.nextPhaseToken = crypto.randomBytes(16).toString("hex");
            }
          } else if (data.status === "archived" || data.status === "rejected" || data.status === "not_advancing") {
            updates.nextPhaseStatus = undefined;
          }
          if (data.status === "hired") {
            updates.hiredAt = new Date().toISOString();
          }
          const currentLog = app?.activityLog || [];
          updates.activityLog = [
            ...currentLog,
            {
              action: `Stage Transition: ${data.status}`,
              details: `Bulk transition to "${data.status}" via Admin Portal`,
              actor: "Admin Recruiter",
              timestamp: new Date().toISOString(),
            },
          ];
          await updateApplication(id, updates);
        }
      }
    }
    else if (
      data.kind === "clear_slot" &&
      typeof data.id === "string" && /^[\w-]{6,64}$/i.test(data.id.trim())
    ) {
      // Clear booked test slot without changing candidate status
      const candidate = await getApplication(data.id);
      if (!candidate) return Response.json({ error: "Candidate not found" }, { status: 404 });
      if (candidate.attendedAt || candidate.testScore !== undefined) return Response.json({ error: "Cannot remove a booking with recorded attendance or results" }, { status: 409 });
      await updateApplication(data.id, { testSlot: undefined, testBookedAt: undefined, ...(candidate.status === "test_booked" ? { status: "test_invited" as const } : {}) });
    }
    else if (
      data.kind === "score" &&
      typeof data.id === "string" && /^[\w-]{6,64}$/i.test(data.id.trim()) &&
      typeof data.score === "number" && Number.isFinite(data.score)
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


  async function handleDELETE(request: Request) {
    if (!(await authenticated()) || !sameOrigin(request)) {
      return new Response(null, { status: 403 });
    }

    try {
      const data = await request.json();
      if (
        data.id &&
        typeof data.id === "string" &&
        /^[\w-]{6,64}$/i.test(data.id.trim())
      ) {
        await deleteApplication(data.id);
        return Response.json({ success: true, count: 1 });
      } else if (
        Array.isArray(data.ids) &&
        data.ids.length > 0
      ) {
        const validIds = data.ids.filter(
          (id: unknown): id is string =>
            typeof id === "string" && /^[\w-]{6,64}$/i.test(id.trim()),
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


export async function PATCH(request: Request) {
  return auditRequest(request, () => handlePATCH(request));
}

export async function DELETE(request: Request) {
  return auditRequest(request, () => handleDELETE(request));
}
