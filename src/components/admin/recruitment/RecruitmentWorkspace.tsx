"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cycleLabel } from "@/lib/careers-cycle-label";
import { csvCell } from "@/lib/csv";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import type { Application } from "@/lib/careers";
import {
  ALL_PIPELINE_STAGES,
  type CareerCohort,
  type CareerRoleDefinition,
} from "@/lib/careers-models";
import {
  applicationsForCohort,
  hasAttended,
  hasScore,
  hasTested,
  isAwaiting,
  isConfirmed,
  isDeclined,
  isEligibleForTest,
  isNextPhase,
  isQualified,
  recruitmentMetrics,
  sameRole,
} from "@/lib/careers-workflow";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { CohortRoleProvider, useActiveRole } from "../shell/ActiveRoleContext";
import { CandidatesTableView } from "./CandidatesTableView";
import { TestingAttendanceView } from "./TestingAttendanceView";
import { NextPhaseView } from "./NextPhaseView";
import { CommunicationsView } from "./CommunicationsView";
import GateCheckInModal from "../GateCheckInModal";
import OverwatchOrbitLoader from "../ui/OverwatchOrbitLoader";

type WorkspaceData = {
  cohort?: CareerCohort;
  role?: CareerRoleDefinition;
  applications: Application[];
};
export default function RecruitmentWorkspace({
  cohortId,
  roleId,
  initialTab = "overview",
}: {
  cohortId?: string;
  roleId?: string;
  initialTab?: string;
}) {
  const { t, lang } = useAdminLanguage();
  const { setActiveRoleId } = useActiveRole();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [metric, setMetric] = useState("");
  const [snapshotMode, setSnapshotMode] = useState(false);
  const [scanner, setScanner] = useState(false);
  const generation = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (signal?.aborted) return;
      const request = ++generation.current;
      setBusy(true);
      setError("");
      try {
        const response = await fetch(
          cohortId
            ? `/api/admin/careers/archive?cohortId=${encodeURIComponent(cohortId)}`
            : "/api/admin/careers",
          { cache: "no-store", signal },
        );
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Unable to load workspace");
        if (request !== generation.current || signal?.aborted) return;
        if (cohortId) setData(payload);
        else {
          const role = (payload.roles as CareerRoleDefinition[]).find((r) =>
            sameRole(r.id, roleId),
          );
          if (!role) throw new Error("Role not found");
          const catalog: CareerCohort[] = payload.cohorts;
          const cohort =
            catalog.find((c) => c.id === role.activeCohortId) ||
            catalog
              .filter((c) => sameRole(c.roleId, role.id))
              .sort((a, b) =>
                (b.closedAt || b.openedAt).localeCompare(
                  a.closedAt || a.openedAt,
                ),
              )[0];
          setData({
            role,
            cohort,
            applications: cohort
              ? applicationsForCohort(payload.applications, cohort, catalog)
              : payload.applications.filter(
                  (a: Application) => sameRole(a.role, role.id) && !a.cohortId,
                ),
          });
        }
      } catch (e) {
        if (request === generation.current && !signal?.aborted)
          setError(e instanceof Error ? e.message : "Unable to load workspace");
      } finally {
        if (request === generation.current && !signal?.aborted) setBusy(false);
      }
    },
    [cohortId, roleId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    const update = () => {
      void load();
    };
    window.addEventListener("admin:careers-updated", update);
    return () => window.removeEventListener("admin:careers-updated", update);
  }, [load]);
  const apps = useMemo(
    () =>
      snapshotMode
        ? data?.cohort?.closureSnapshot?.applications || []
        : data?.applications || [],
    [data, snapshotMode],
  );
  const metrics = useMemo(() => recruitmentMetrics(apps), [apps]);
  const role = data?.role;
  const cohort = data?.cohort;
  useEffect(() => {
    if (role?.id) setActiveRoleId(role.id);
  }, [role?.id, setActiveRoleId]);
  const savedStages = cohort?.stages ?? role?.pipelineStages ?? [];
  // The technical-manager test step was requested after this legacy cohort was configured.
  const configured =
    role?.id === "cctv_technical_manager" && !savedStages.includes("testing")
      ? [
          ...savedStages.slice(0, 2),
          "testing" as const,
          ...savedStages.slice(2),
        ]
      : savedStages;
  const predicates: Record<string, (a: Application) => boolean> = {
    total: () => true,
    qualified: isQualified,
    eligible: isEligibleForTest,
    invited: (a) => Boolean(a.invitedAt) || a.status === "test_invited",
    booked: (a) => Boolean(a.testSlot),
    attended: hasAttended,
    tested: hasTested,
    scored: hasScore,
    nextPhase: isNextPhase,
    confirmed: isConfirmed,
    awaiting: isAwaiting,
    declined: isDeclined,
    interview: (a) => a.status === "interview",
    training: (a) => a.status === "training",
    hired: (a) => a.status === "hired",
    unresolved: (a) => a.stageSource === "unresolved",
  };
  const visibleApps = metric
    ? apps.filter(predicates[metric] || (() => true))
    : apps;
  const labels: Record<string, string> = {
    total: t("All applications", "Todas as candidaturas"),
    qualified: t("Qualified / review", "Qualificados / revisão"),
    eligible: t("Ready to invite to test", "Elegíveis para convocar"),
    invited: t("Test invitations", "Convites para teste"),
    booked: t("Test booked", "Testes agendados"),
    attended: t("Attendance recorded", "Presenças registadas"),
    tested: t("Test completed / result", "Teste realizado / resultado"),
    scored: t("Scored", "Com nota"),
    nextPhase: t("Next phase selected", "Próxima fase"),
    confirmed: t("Accepted conditions", "Condições aceites"),
    awaiting: t("Awaiting response", "A aguardar resposta"),
    declined: t("Declined conditions", "Condições recusadas"),
    interview: t("Interviews", "Entrevistas"),
    training: t("Training", "Formação"),
    hired: t("Hired", "Contratados"),
    unresolved: t("Historical stage needs review", "Etapa histórica por rever"),
  };
  const exportCsv = () => {
    const rows = [
      [
        "ID",
        "Name",
        "Email",
        "Stage",
        "Stage evidence",
        "Cohort",
        "Test slot",
        "Attendance",
        "Score",
      ],
      ...visibleApps.map((a) => [
        a.id,
        a.name,
        a.email,
        a.status,
        a.stageSource,
        cohort?.id,
        a.testSlot,
        a.attendedAt,
        a.testScore,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `recruitment-${cohort?.id || roleId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const mutate = async (url: string, body: unknown, method = "POST") => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to save changes");
      throw new Error(payload.error || "Unable to save changes");
    }
    await load();
    window.dispatchEvent(new Event("admin:careers-updated"));
    return payload;
  };
  if (!data && busy)
    return (
      <div role="status" aria-live="polite" className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <OverwatchOrbitLoader
          label={t("Loading workspace…", "A carregar área de trabalho…")}
        />
      </div>
    );
  if (!data || !role)
    return (
      <div role="alert" className="rounded-xl border border-red-200 p-6">
        {error || t("Workspace unavailable", "Área indisponível")}{" "}
        <button onClick={() => void load()}>
          {t("Retry", "Tentar novamente")}
        </button>
      </div>
    );
  const workspaceRole = {
    ...role,
    open: cohort?.status === "active",
    pipelineStages: configured,
    screeningRules: cohort?.screeningRules ?? role.screeningRules,
  };
  const metricKeys = [
    "total",
    "qualified",
    ...(configured.includes("testing")
      ? ["eligible", "invited", "booked", "attended", "tested", "scored"]
      : []),
    ...(configured.includes("next_phase")
      ? ["nextPhase", "confirmed", "awaiting", "declined"]
      : []),
    ...configured.filter((s) => ["interview", "training", "hired"].includes(s)),
    ...(metrics.unresolved ? ["unresolved"] : []),
  ];
  return (
    <CohortRoleProvider role={workspaceRole}>
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <Link
            href={
              cohortId
                ? "/admin/recruitment/archive"
                : "/admin/recruitment/roles"
            }
            className="inline-flex gap-2 items-center text-xs text-slate-500"
          >
            <ArrowLeft size={14} />
            {t("All recruitment cycles", "Todos os lotes")}
          </Link>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {cohort?.status === "active"
                  ? t("Applications open", "Candidaturas abertas")
                  : t(
                      "Applications closed · recruitment continues",
                      "Candidaturas encerradas · selecção em curso",
                    )}
              </p>
              <h1 className="text-xl font-bold mt-1">
                {cohort ? cycleLabel(cohort, role, lang) : (lang === "pt" ? role.pt : role.en)}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {t(
                  "Stages, candidates and communications stay in this recruitment cycle.",
                  "Etapas, candidatos e comunicações mantêm-se neste lote.",
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                className="rounded-lg border px-3 py-2 text-xs flex gap-2 items-center"
              >
                <Download size={14} />
                CSV ({visibleApps.length})
              </button>
              <button
                disabled={busy}
                onClick={() => void load()}
                className="rounded-lg border px-3 py-2 text-xs flex gap-2 items-center"
              >
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                {t("Refresh", "Actualizar")}
              </button>
            </div>
          </div>
          {cohort?.unassigned && (
            <p
              role="status"
              className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
            >
              {t(
                "These legacy records have no confirmed cohort. Review membership before making decisions.",
                "Estes registos antigos não têm lote confirmado. Reveja a associação antes de decidir.",
              )}
            </p>
          )}
          {apps.some(
            (a) =>
              a.stageSource === "recovered" || a.stageSource === "unresolved",
          ) && (
            <p className="text-xs text-amber-800">
              {t(
                "Some historical stages were overwritten. Recovered stages use saved evidence; unresolved records require review. Attendance and test completion are separate counts.",
                "Algumas etapas históricas foram substituídas. Etapas recuperadas usam provas guardadas; registos por resolver exigem revisão. Presença e realização do teste são contagens distintas.",
              )}
            </p>
          )}
          {cohort?.closureSnapshot && (
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              onClick={() => {
                setSnapshotMode(!snapshotMode);
                setMetric("");
                setTab("overview");
              }}
            >
              {snapshotMode
                ? t(
                    "Return to current recruitment",
                    "Voltar ao recrutamento actual",
                  )
                : t(
                    "View records at intake closure",
                    "Ver registos no encerramento",
                  )}
            </button>
          )}
          <nav
            style={snapshotMode ? { display: "none" } : undefined}
            aria-label={t("Recruitment stages", "Etapas de recrutamento")}
            className="flex gap-2 overflow-x-auto border-t pt-3"
          >
            {[
              { id: "overview", label: t("Overview", "Visão geral") },
              ...configured.map((s) => ({
                id: s,
                label: (() => {
                  const def = ALL_PIPELINE_STAGES.find((d) => d.key === s);
                  return (lang === "pt" ? def?.labelPt : def?.labelEn) || s;
                })(),
              })),
              {
                id: "communications",
                label: t("Communications", "Comunicações"),
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMetric("");
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${tab === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>
        {snapshotMode && (
          <section className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold">
              {t(
                "Records preserved at intake closure · read only",
                "Registos no encerramento · apenas leitura",
              )}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">{t("Candidate", "Candidato")}</th>
                    <th className="p-2">{t("Stage", "Etapa")}</th>
                    <th className="p-2">{t("Score", "Nota")}</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{a.name}</td>
                      <td className="p-2">{a.status}</td>
                      <td className="p-2">{a.testScore ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {!snapshotMode && metrics.booked > 0 && metrics.attended === 0 && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            {t(
              "Attendance records are missing for this cycle. This does not mean nobody attended. Test-completion totals reflect recorded results only; historical attendance needs reconciliation.",
              "Faltam registos de presença neste lote. Isto não significa que ninguém compareceu. As contagens de testes realizados reflectem os resultados registados; o histórico de presenças precisa de reconciliação.",
            )}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
          >
            {error}
          </p>
        )}
        {!snapshotMode && tab === "overview" && !metric && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metricKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-500"
                >
                  <p className="text-xs text-slate-500">{labels[key]}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {metrics[key as keyof typeof metrics]}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {t(
                "Click a count to inspect its exact candidate list. A booking or attendance alone does not prove completion of a test.",
                "Clique numa contagem para ver os candidatos. Agendamento ou presença não comprovam a realização do teste.",
              )}
            </p>
            {cohort?.closureSnapshot && (
              <details className="rounded-xl border bg-white p-4 text-sm">
                <summary>
                  {t(
                    "Snapshot at application closure",
                    "Registo no encerramento das candidaturas",
                  )}{" "}
                  ·{" "}
                  {new Date(cohort.closureSnapshot.capturedAt).toLocaleString(
                    lang,
                  )}
                </summary>
                <p className="mt-2 text-xs">
                  {cohort.closureSnapshot.applications.length}{" "}
                  {t(
                    "applications preserved. Current operational updates appear above.",
                    "candidaturas preservadas. As actualizações operacionais aparecem acima.",
                  )}
                </p>
              </details>
            )}
          </>
        )}
        {!snapshotMode &&
          (metric ||
            [
              "applications",
              "screening",
              "interview",
              "training",
              "hired",
            ].includes(tab)) && (
            <>
              <div className="flex justify-between text-sm">
                <span>{metric ? labels[metric] : ""}</span>
                {metric && (
                  <button onClick={() => setMetric("")}>
                    {t("Back to overview", "Voltar à visão geral")}
                  </button>
                )}
              </div>
              <CandidatesTableView
                key={`${cohort?.id}-${tab}-${metric}`}
                applications={
                  metric
                    ? visibleApps
                    : tab === "screening"
                      ? apps
                      : ["interview", "training", "hired"].includes(tab)
                        ? apps.filter((a) => a.status === tab)
                        : apps
                }
                roles={[workspaceRole]}
                scopedRoleId={role.id}
                onRefresh={load}
                onBulkStatusChange={async (ids, status) => {
                  await mutate(
                    "/api/admin/careers",
                    { kind: "bulk_status", ids, status },
                    "PATCH",
                  );
                }}
                onBulkArchive={async (ids, reason) => {
                  await mutate(
                    "/api/admin/careers",
                    { kind: "bulk_status", ids, status: "archived", reason },
                    "PATCH",
                  );
                }}
              />
            </>
          )}
        {!snapshotMode && ["testing", "gate_checkin"].includes(tab) && (
          <>
            <TestingAttendanceView
              applications={apps}
              slotQuota={cohort?.slotQuota || 15}
              broadcastSlots={cohort?.testSlots || []}
              onOpenGateScanner={() => setScanner(true)}
              onToggleAttendance={async (id, attended) => {
                await mutate("/api/careers/check-in", {
                  id,
                  action: attended ? "check_in" : "mark_absent",
                  force: true,
                });
              }}
              onDispatchGatePasses={async () => {
                await mutate("/api/admin/careers/dispatch-gate-passes", {
                  candidateIds: apps
                    .filter((a) => a.testSlot && !hasAttended(a))
                    .map((a) => a.id),
                  cohortId: cohort?.id,
                });
              }}
              onSaveSlots={async (slots, quota) => {
                await mutate("/api/admin/careers/test-slots", {
                  slots,
                  quota,
                  cohortId: cohort?.id,
                });
                return true;
              }}
            />
            <GateCheckInModal
              isOpen={scanner}
              onClose={() => setScanner(false)}
              onCheckInSuccess={() => void load()}
            />
          </>
        )}
        {!snapshotMode && tab === "next_phase" && (
          <NextPhaseView cohortId={cohort?.id} roleId={role.id} />
        )}
        {!snapshotMode && tab === "communications" && (
          <CommunicationsView applications={apps} cohortId={cohort?.id} />
        )}
      </div>
    </CohortRoleProvider>
  );
}
