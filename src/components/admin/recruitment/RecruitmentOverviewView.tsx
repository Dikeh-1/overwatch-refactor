"use client";

import { RecruitmentMetricPanel } from "./RecruitmentMetricPanel";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArrowRight, Award, CalendarCheck, CheckCircle2, Clock, Plus, Users } from "lucide-react";
import type { Application } from "@/lib/careers";
import type { CareerCohort, CareerRoleDefinition } from "@/lib/careers-models";
import { applicationsForCohort, recruitmentMetrics } from "@/lib/careers-workflow";
import { recruitmentDashboard, type DashboardScope } from "@/lib/recruitment-dashboard";
import { cycleLabel } from "@/lib/careers-cycle-label";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import RoleConfigModal from "./RoleConfigModal";
import { HistoricalTestEvidence } from "./HistoricalTestEvidence";

type Props = {
  applications: Application[];
  roleDefs?: CareerRoleDefinition[];
  cohorts?: CareerCohort[];
  lang?: "pt" | "en";
  onRefresh?: () => Promise<void>;
};
export function RecruitmentOverviewView({ applications, roleDefs = [], cohorts = [], lang: suppliedLang, onRefresh }: Props) {
  const language = useAdminLanguage();
  const lang = suppliedLang || language.lang;
  const t = (en: string, pt: string) => lang === "en" ? en : pt;
  const params = useSearchParams();
  const router = useRouter();
  const scope: DashboardScope = params.get("scope") === "open" ? "open" : "all";
  const setScope = (value: DashboardScope) => router.replace(`/admin/recruitment?scope=${value}`, { scroll: false });
  const [modalOpen, setModalOpen] = useState(false);
  const dashboard = recruitmentDashboard(applications, roleDefs, cohorts, scope);
  const metricCards = [
    { key: "total", label: t("Applications", "Candidaturas"), detail: t("All candidate records in this scope", "Todos os registos neste âmbito"), icon: Users },
    { key: "screened", label: t("Screening assessed", "Candidaturas avaliadas"), detail: t("Evaluated against criteria", "Avaliados pelos critérios"), icon: Users },
    { key: "screeningPassed", label: t("Screening passed", "Requisitos cumpridos"), detail: t("Met mandatory criteria", "Critérios obrigatórios cumpridos"), icon: CheckCircle2 },
    { key: "notAdvancing", label: t("Not advancing / archived", "Não avançam / arquivados"), detail: t("Candidate outcomes, not intake closure", "Resultados, não encerramento da vaga"), icon: Archive },
    { key: "scored", label: t("Results scored", "Com nota"), detail: t("Saved numeric results", "Notas numéricas guardadas"), icon: Award },
    { key: "qualified", label: t("Qualified to continue", "Qualificados para continuar"), detail: t("Selected for the next phase", "Selecionados para a próxima fase"), icon: CheckCircle2 },
    { key: "booked", label: t("Tests booked", "Testes agendados"), detail: t("Recorded bookings", "Agendamentos registados"), icon: CalendarCheck },
    { key: "attended", label: t("Attendance recorded", "Presenças registadas"), detail: t("Recorded check-in or attendance", "Entrada ou presença registada"), icon: CheckCircle2 },
    { key: "tested", label: t("Tests completed", "Testes realizados / resultados"), detail: t("Gate attendance, results or historical confirmation", "Presença, resultado ou confirmação histórica"), icon: Award },
    { key: "nextPhase", label: t("Next-phase candidates", "Candidatos na próxima fase"), detail: t("Recorded progression", "Progressão registada"), icon: Users },
    { key: "awaiting", label: t("Awaiting response", "Aguardam resposta"), detail: t("Invited without a recorded response", "Convite sem resposta registada"), icon: Clock },
    { key: "confirmed", label: t("Confirmed interest", "Interesse confirmado"), detail: t("Recorded positive responses", "Respostas positivas registadas"), icon: CheckCircle2 },
  ];
  const saveRole = async (role: CareerRoleDefinition) => {
    const response = await fetch("/api/admin/careers/roles-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_or_update_role", role }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || t("Unable to save role", "Não foi possível guardar a vaga"));
    }
    window.dispatchEvent(new Event("admin:careers-updated"));
    await onRefresh?.();
    setModalOpen(false);
  };
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">{t("Overwatch · People operations", "Overwatch · Gestão de pessoas")}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("Recruitment overview", "Visão geral do recrutamento")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("Recruitment records across open and closed cycles.", "Registos de recrutamento em lotes abertos e encerrados.")}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/recruitment/archive" className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><Archive size={15}/>{t("Archive Vault", "Cofre de Arquivo")}</Link>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><Plus size={15}/>{t("New role", "Nova vaga")}</button>
      </div>
    </header>
    {!dashboard.openRoles.length && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
      <div><p className="font-semibold">{t("No roles are open for applications", "Não existem vagas abertas para candidaturas")}</p><p className="mt-1 text-xs">{t("Closed cycles and their candidates remain available in Archive Vault. The totals below include those records when All cycles is selected.", "Os lotes encerrados e os seus candidatos continuam disponíveis no Arquivo. As contagens abaixo incluem esses registos ao seleccionar Todos os lotes.")}</p></div>
      <Link href="/admin/recruitment/archive" className="shrink-0 text-xs font-semibold underline">{t("View closed cycles", "Ver lotes encerrados")}</Link>
    </div>}
    <section aria-label={t("Dashboard scope", "Âmbito do painel")} className="sticky top-[48px] z-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "open"] as const).map(value => <button key={value} aria-pressed={scope === value} onClick={() => setScope(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${scope === value ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-600"}`}>{value === "all" ? t("All cycles", "Todos os lotes") : t("Open cycles only", "Apenas lotes abertos")}</button>)}
        </div>
        <p className="text-xs text-slate-500">{dashboard.openRoles.length} {t("open roles", "vagas abertas")} · {dashboard.closedCycles.length} {t("closed cycles", "lotes encerrados")}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">{scope === "all" ? t("All recruitment history, including closed cycles and recorded candidate outcomes.", "Todo o histórico, incluindo lotes encerrados e resultados dos candidatos.") : t("Only candidates belonging to the current open intakes. Closed cycles are excluded.", "Apenas candidatos dos lotes actualmente abertos. Os lotes encerrados são excluídos.")}</p>
    </section>
    {scope === "open" && !dashboard.candidates.length ? <section className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-semibold">{t("No applications in open cycles", "Sem candidaturas em lotes abertos")}</h2><p className="mt-2 text-sm text-slate-500">{t("Select All cycles to review historical totals or open Archive Vault to continue an existing recruitment cycle.", "Seleccione Todos os lotes para consultar o histórico ou abra o Arquivo para continuar um lote existente.")}</p></section> : <section aria-label={t("Recruitment metrics", "Métricas de recrutamento")}>
      <RecruitmentMetricPanel
        highlights={["total", "tested", "nextPhase", "confirmed"].map(key => { const card = metricCards.find(c => c.key === key)!; return { ...card, value: dashboard.metrics[key as keyof typeof dashboard.metrics], href: `/admin/recruitment/candidates?scope=${scope}&metric=${key}` }; })}
        groups={[
          { title: t("Applications & screening", "Candidaturas e avaliação"), keys: ["screened", "screeningPassed", "qualified", "notAdvancing"] },
          { title: t("Testing & attendance", "Testes e presenças"), keys: ["booked", "attended", "scored"] },
          { title: t("Next phase", "Próxima fase"), keys: ["nextPhase", "confirmed", "awaiting"] },
        ].map(group => ({ title: group.title, metrics: group.keys.map(key => { const card = metricCards.find(c => c.key === key)!; return { ...card, value: dashboard.metrics[key as keyof typeof dashboard.metrics], href: `/admin/recruitment/candidates?scope=${scope}&metric=${key}` }; }) }))}
      />
    </section>}
    {dashboard.metrics.booked > 0 && dashboard.metrics.attended === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{t("Historical attendance records are missing. Zero recorded attendance does not mean nobody attended; bookings and test results are separate counts.", "Faltam registos históricos de presença. Zero presenças registadas não significa que ninguém compareceu; agendamentos e resultados são contagens distintas.")}</p>}
    {dashboard.metrics.unresolved > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{t(`${dashboard.metrics.unresolved} applications have no saved recruitment outcome. They are not counted as rejection decisions.`, `${dashboard.metrics.unresolved} candidaturas não têm resultado guardado. Não são contadas como decisões de rejeição.`)} <Link className="underline" href={`/admin/recruitment/candidates?scope=${scope}&metric=unresolved`}>{t("Review records", "Rever registos")}</Link></p>}
      <HistoricalTestEvidence cohorts={scope === "all" ? cohorts : cohorts.filter(c => c.status === "active")} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-bold">{scope === "all" ? t("Roles · all recruitment history", "Vagas · todo o histórico") : t("Roles · open cycles", "Vagas · lotes abertos")}</h2><Link href="/admin/recruitment/roles" className="text-xs font-semibold text-sky-700">{t("Manage roles", "Gerir vagas")} →</Link></div>
        <div className="mt-3 divide-y divide-slate-100">
          {dashboard.roles.map(({ role, metrics, cycles }) => <div key={role.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{lang === "en" ? role.en : role.pt}</h3><p className="mt-1 text-xs text-slate-500">{metrics.total} {t("applications", "candidaturas")} · {metrics.booked} {t("booked", "agendados")} · {metrics.tested} {t("test results / completed", "resultados / testes realizados")}</p></div>
            <div className="flex items-center gap-2"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${role.open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{role.open ? t("OPEN", "ABERTA") : t("CLOSED", "ENCERRADA")}</span>
              <Link href={role.open ? `/admin/recruitment?role=${encodeURIComponent(role.id)}` : cycles.length ? `/admin/recruitment/archive?role=${encodeURIComponent(role.id)}` : "/admin/recruitment/roles"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{role.open ? t("Open workspace", "Abrir área") : cycles.length ? t("View cycles", "Ver lotes") : t("Manage", "Gerir")}</Link>
            </div>
          </div>)}
          {!dashboard.roles.length && <p className="py-6 text-sm text-slate-500">{t("No roles in this scope.", "Sem vagas neste âmbito.")}</p>}
        </div>
      </section>
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold">{t("Closed recruitment cycles", "Lotes de recrutamento encerrados")}</h2><p className="mt-1 text-xs text-slate-500">{t("Continue reviewing each cycle in its own workspace.", "Continue a rever cada lote na sua área original.")}</p>
        <div className="mt-4 space-y-3">{dashboard.closedCycles.map(cohort => {
          const role = cohort.roleSnapshot || roleDefs.find(r => r.id === cohort.roleId) || { en: cohort.roleId, pt: cohort.roleId };
          const metrics = recruitmentMetrics(applicationsForCohort(applications, cohort, cohorts), [cohort]);
          return <Link key={cohort.id} href={`/admin/recruitment/archive?cohortId=${encodeURIComponent(cohort.id)}`} className="block rounded-xl border border-slate-200 p-4 hover:border-sky-300"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{cycleLabel(cohort, role, lang)}</h3><ArrowRight size={16} className="shrink-0"/></div><p className="mt-2 text-xs text-slate-500">{metrics.total} {t("applications", "candidaturas")} · {metrics.booked} {t("booked", "agendados")} · {metrics.tested} {t("test results / completed", "resultados / testes realizados")}</p></Link>;
        })}{!dashboard.closedCycles.length && <p className="py-4 text-sm text-slate-500">{t("No closed cycles yet.", "Ainda não existem lotes encerrados.")}</p>}</div>
      </section>
    </div>
    {modalOpen && <RoleConfigModal isOpen onClose={() => setModalOpen(false)} onSaveRole={saveRole}/>}
  </div>;
}
