import { auditRequest } from "@/lib/admin-activity";
import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplications, updateApplication } from "@/lib/careers-store";
import { type Application } from "@/lib/careers";
import { sameRole, isTerminal } from "@/lib/careers-workflow";
import { parseScoresFile, matchScoresToCandidates } from "@/lib/test-score-parser";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

async function handlePOST(request: Request): Promise<Response> {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const roleId = (formData.get("roleId") as string | null) || undefined;
    const cohortId = (formData.get("cohortId") as string | null) || undefined;
    const commit = formData.get("commit") === "true";
    const advanceIdsJson = formData.get("advanceIds") as string | null;

    let advanceIds: string[] = [];
    if (advanceIdsJson) {
      try {
        const parsed = JSON.parse(advanceIdsJson);
        if (Array.isArray(parsed)) advanceIds = parsed;
      } catch (_) {}
    }

    if (!file) {
      return Response.json({ error: "Nenhum ficheiro enviado (No file uploaded)." }, { status: 400 });
    }

    const fileName = file.name || "scores.xlsx";
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return Response.json({ error: "O ficheiro enviado está vazio." }, { status: 400 });
    }

    // 1. Parse file records
    const records = await parseScoresFile(buffer, fileName);
    if (records.length === 0) {
      return Response.json(
        {
          error:
            "Nenhum registo ou nota válida encontrada no ficheiro. Certifique-se de que o ficheiro contém colunas de Nome/Email e Nota.",
        },
        { status: 422 }
      );
    }

    // 2. Fetch fresh candidates strictly scoped by cohort and role
    const allApps = await getApplications(true);
    let targetCandidates = allApps;

    if (cohortId && cohortId !== "all") {
      targetCandidates = allApps.filter(
        (a) => a.cohortId === cohortId || a.workspaceCohortId === cohortId
      );
      if (roleId && roleId !== "all") {
        targetCandidates = targetCandidates.filter((a) => sameRole(a.role, roleId));
      }
    } else if (roleId && roleId !== "all") {
      targetCandidates = allApps.filter((a) => sameRole(a.role, roleId));
    }

    // Prioritize active & booked/invited candidates within the scoped cycle/cohort/role
    const { matched, unmatched } = matchScoresToCandidates(records, targetCandidates);

    // 3. Dry-run preview mode
    if (!commit) {
      return Response.json({
        preview: true,
        fileName,
        totalRecords: records.length,
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        matched: matched.map((m) => ({
          candidateId: m.candidate.id,
          candidateName: m.candidate.name,
          candidateEmail: m.candidate.email,
          candidatePhone: m.candidate.whatsapp,
          currentScore: m.candidate.testScore ?? null,
          currentStatus: m.candidate.status,
          newScore: m.score,
          documentNextPhase: m.nextPhaseSelected,
          decisionRaw: m.record.decisionRaw,
          matchType: m.matchType,
        })),
        unmatched: unmatched.map((u) => ({
          name: u.record.name,
          email: u.record.email,
          score: u.record.score,
          reason: u.reason,
        })),
      });
    }

    // 4. Commit mode: Apply scores to candidates
    const updatedCandidates: Array<{
      id: string;
      name: string;
      score: number;
      advanced: boolean;
      alreadyAdvanced: boolean;
    }> = [];

    for (const m of matched) {
      const candidate = m.candidate;
      const documentSelected = Boolean(m.nextPhaseSelected);
      const userSelected = advanceIds.includes(candidate.id);
      const shouldAdvance = (documentSelected || userSelected) && !isTerminal(candidate);

      const updates: Partial<Application> = {
        testScore: m.score,
        attendanceStatus: "present",
        attendedAt: candidate.attendedAt || new Date().toISOString(),
      };

      // Safeguard against demotion: Preserve higher-order statuses
      const alreadyAdvanced =
        candidate.status === "next_phase_selected" ||
        candidate.status === "training" ||
        candidate.status === "interview" ||
        candidate.status === "hired";

      if (shouldAdvance && !alreadyAdvanced) {
        updates.status = "next_phase_selected";
        updates.nextPhaseStatus = "selected";
        if (!candidate.nextPhaseToken) {
          updates.nextPhaseToken = crypto.randomBytes(16).toString("hex");
        }
      } else if (!alreadyAdvanced) {
        // If candidate was in test_booked or test_invited, transition them to tested
        if (candidate.status === "test_booked" || candidate.status === "test_invited") {
          updates.status = "tested";
        }
      }

      // Activity log audit trail
      const log = candidate.activityLog || [];
      const reasonDetail = documentSelected
        ? "Marcado como selecionado no documento"
        : userSelected
        ? "Selecionado manualmente para avanço"
        : "";

      updates.activityLog = [
        ...log,
        {
          id: crypto.randomUUID(),
          action: "Test Result Recorded",
          details: `Nota de teste ${m.score}% registada via importação de ficheiro (${fileName})${
            shouldAdvance || alreadyAdvanced
              ? ` · Candidato na Próxima Fase${reasonDetail ? ` (${reasonDetail})` : ""}`
              : ""
          }`,
          actor: "Admin Recruiter",
          timestamp: new Date().toISOString(),
        },
      ];

      await updateApplication(candidate.id, updates);

      updatedCandidates.push({
        id: candidate.id,
        name: candidate.name,
        score: m.score,
        advanced: shouldAdvance || alreadyAdvanced,
        alreadyAdvanced,
      });
    }

    return Response.json({
      success: true,
      fileName,
      totalProcessed: records.length,
      updatedCount: updatedCandidates.length,
      unmatchedCount: unmatched.length,
      candidates: updatedCandidates,
      unmatched: unmatched.map((u) => ({
        name: u.record.name,
        email: u.record.email,
        score: u.record.score,
        reason: u.reason,
      })),
    });
  } catch (err) {
    console.error("Upload test scores error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro ao processar ficheiro de resultados." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
