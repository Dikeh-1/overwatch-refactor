"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import RecruitmentWorkspace from "@/components/admin/recruitment/RecruitmentWorkspace";
import { CandidatesTableView } from "@/components/admin/recruitment/CandidatesTableView";
import { useAdminLanguage } from "@/components/admin/shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import type { Application } from "@/lib/careers";
import type { CareerCohort, CareerRoleDefinition } from "@/lib/careers-models";
import { dashboardCandidates, dashboardPredicates, isDashboardRoster } from "@/lib/recruitment-dashboard";
import { sameRole } from "@/lib/careers-workflow";
import { HistoricalTestEvidence } from "@/components/admin/recruitment/HistoricalTestEvidence";

type Data = { applications: Application[]; roles: CareerRoleDefinition[]; cohorts: CareerCohort[] };
function GlobalCandidates() {
  const { t } = useAdminLanguage();
  const params = useSearchParams();
  const scope = params.get("scope") === "open" ? "open" : "all";
  const metric = params.get("metric") || "total";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const request = ++generation.current;
    try {
      const response = await fetch("/api/admin/careers", { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load candidates");
      if (request === generation.current && !signal?.aborted) { setData(payload); setError(""); }
    } catch(e) { if (request === generation.current && !signal?.aborted) setError(e instanceof Error ? e.message : "Unable to load candidates"); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load]);
  const mutate = async (ids: string[], status: string, reason?: string) => {
    const response = await fetch("/api/admin/careers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bulk_status", ids, status, reason }) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || "Unable to save candidate changes"); }
    await load();
    window.dispatchEvent(new Event("admin:careers-updated"));
  };
  if (error) return <div role="alert" className="rounded-xl border border-red-200 p-6">{error} <button className="underline" onClick={() => void load()}>{t("Retry", "Tentar novamente")}</button></div>;
  if (!data) return <div role="status" className="flex min-h-[60vh] items-center justify-center"><OverwatchOrbitLoader label={t("Loading candidates…", "A carregar candidatos…")}/></div>;
  if (!Object.hasOwn(dashboardPredicates, metric)) return <div role="alert">{t("Unknown dashboard filter", "Filtro desconhecido")} <Link href="/admin/recruitment">{t("Back to overview", "Voltar à visão geral")}</Link></div>;
  const roleFilter = params.get("role");
  const applications = dashboardCandidates(data.applications, data.roles, data.cohorts, scope, metric).filter(a => !roleFilter || roleFilter === "all" || sameRole(a.role, roleFilter));
  const metricLabels: Record<string, string> = { unresolved: t("Outcome needs review", "Resultado por rever"), screened: t("Screening assessed", "Candidaturas avaliadas"), screeningPassed: t("Screening passed", "Requisitos cumpridos"), notAdvancing: t("Not advancing / archived", "Não avançam / arquivados"), scored: t("Results scored", "Com nota"), total: t("Applications", "Candidaturas"), qualified: t("Qualified to continue", "Qualificados para continuar"), booked: t("Tests booked", "Testes agendados"), attended: t("Attendance recorded", "Presenças registadas"), tested: t("Tests completed", "Testes realizados / resultados"), nextPhase: t("Next-phase candidates", "Candidatos na próxima fase"), awaiting: t("Awaiting response", "Aguardam resposta"), confirmed: t("Confirmed interest", "Interesse confirmado") };
  return <div className="space-y-4">
    {["tested", "attended", "scored"].includes(metric) && <HistoricalTestEvidence cohorts={data.cohorts.filter(c => (scope === "all" || c.status === "active") && (!roleFilter || roleFilter === "all" || sameRole(c.roleId, roleFilter)))} />}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"><span><strong>{metricLabels[metric]}</strong> · {scope === "all" ? t("All cycles", "Todos os lotes") : t("Open cycles only", "Apenas lotes abertos")} · {applications.length} {t("matching records", "registos correspondentes")}</span><Link href={`/admin/recruitment?scope=${scope}`} className="text-xs font-semibold text-sky-700">{t("Back to overview", "Voltar à visão geral")} →</Link></div>
    <CandidatesTableView key={`${scope}-${metric}`} applications={applications} roles={data.roles} onBulkStatusChange={(ids,status) => mutate(ids,status)} onBulkArchive={(ids,reason) => mutate(ids,"archived",reason)} onRefresh={load}/>
  </div>;
}
export default function CandidatesPage() {
  const params = useSearchParams();
  const roleId = params.get("role");
  const dashboardRoster = isDashboardRoster(params);
  return roleId && roleId !== "all" && !dashboardRoster ? <RecruitmentWorkspace key={roleId} roleId={roleId} initialTab="applications"/> : <GlobalCandidates/>;
}
