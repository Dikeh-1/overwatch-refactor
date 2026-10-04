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
    const [rawApplications, roles, deletedNextPhase] = await Promise.all([
      getApplications(),
      getRoles(),
      getDeletedNextPhaseIdentifiers(),
    ]);

    // Auto-heal screening evaluation for applications affected by the string-range NaN bug
    const applications = rawApplications.map((app) => {
      if (app.role === "cctv_technical_manager" || app.role === "cctv_technician") {
        const meetsCctv = Boolean(
          app.yearsCctvExperience &&
          app.yearsCctvExperience !== "0" &&
          app.yearsCctvExperience !== "none"
        );
        const meetsIp = app.ipCctv === "yes";
        const meetsNvr = app.nvrDvr === "yes";
        const meetsNet = app.networking === "yes";
        const allMandatoryMet = meetsCctv && meetsIp && meetsNvr && meetsNet;

        const mandPassed = [meetsCctv, meetsIp, meetsNvr, meetsNet].filter(Boolean).length;
        const mandTotal = 4;

        const curScreening = app.screeningResult;
        const prefCount = [
          app.hikvision === "yes",
          app.dahua === "yes",
          app.supervision === "yes",
          app.drivingLicence === "yes",
          app.aiAnalytics === "yes",
          app.remoteMonitoring === "yes",
          app.boqScopes === "yes",
        ].filter(Boolean).length;

        const prefScore =
          curScreening?.preferredScore && curScreening.preferredScore > 0
            ? curScreening.preferredScore
            : prefCount;
        const prefTotal =
          curScreening?.preferredTotal && curScreening.preferredTotal >= 6
            ? curScreening.preferredTotal
            : 7;

        // Heavy mandatory weighting: 70% mandatory, 30% preferred
        const mandRatio = mandTotal > 0 ? mandPassed / mandTotal : 1;
        const prefRatio = prefTotal > 0 ? prefScore / prefTotal : 1;
        const weightedMatch = Math.round((mandRatio * 70) + (prefRatio * 30));

        const failedReasonsEn: string[] = [];
        const failedReasonsPt: string[] = [];
        if (!meetsCctv) {
          failedReasonsEn.push("Missing mandatory requirement: Hands-on CCTV Experience (min 1 year)");
          failedReasonsPt.push("Requisito obrigatório em falta: Experiência Prática em CCTV (mínimo 1 ano)");
        }
        if (!meetsIp) {
          failedReasonsEn.push("Missing mandatory requirement: IP CCTV & Network Camera Protocols");
          failedReasonsPt.push("Requisito obrigatório em falta: Sistemas CCTV IP e Protocolos Digitais");
        }
        if (!meetsNvr) {
          failedReasonsEn.push("Missing mandatory requirement: NVR/DVR Setup & Storage Sizing");
          failedReasonsPt.push("Requisito obrigatório em falta: Configuração de NVRs/DVRs e Armazenamento");
        }
        if (!meetsNet) {
          failedReasonsEn.push("Missing mandatory requirement: IP Networking (Switches, VLANs, Routers)");
          failedReasonsPt.push("Requisito obrigatório em falta: Redes IP (Switches, VLANs, Routers)");
        }

        const healedScreening = {
          ...(curScreening || {}),
          passedMandatory: allMandatoryMet,
          failedReasons: failedReasonsEn,
          failedReasonsPt: failedReasonsPt,
          mandatoryScore: mandPassed,
          mandatoryTotal: mandTotal,
          preferredScore: prefScore,
          preferredTotal: prefTotal,
          matchPercentage: weightedMatch,
          evaluatedAt: curScreening?.evaluatedAt || new Date().toISOString(),
        };

        let newStatus = app.status;
        if (!allMandatoryMet) {
          if (!app.status || app.status === "shortlisted" || app.status === "screening") {
            newStatus = "not_advancing";
          }
        } else {
          if (!app.status || app.status === "not_advancing" || app.status === "screening") {
            newStatus = "shortlisted";
          }
        }

        return {
          ...app,
          status: newStatus,
          screeningResult: healedScreening,
        };
      }
      return app;
    });

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
      typeof data.id === "string" && /^[\w-]{6,64}$/i.test(data.id.trim())
    ) {
      await setStatus(data.id, data.status);
      const app = await getApplication(data.id);
      const updates: Record<string, any> = {};
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
      for (const id of data.ids) {
        if (typeof id === "string" && /^[\w-]{6,64}$/i.test(id.trim())) {
          await setStatus(id, data.status);
          const app = await getApplication(id);
          const updates: Record<string, any> = {};
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
      await updateApplication(data.id, { testSlot: undefined, testBookedAt: undefined });
    }
    else if (
      data.kind === "score" &&
      typeof data.id === "string" && /^[\w-]{6,64}$/i.test(data.id.trim()) &&
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

