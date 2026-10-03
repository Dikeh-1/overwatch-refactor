"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  Award,
  Clock,
  ThumbsUp,
  ArrowRight,
  Briefcase,
  TrendingUp,
  Plus,
  Archive,
  Layers,
  SlidersHorizontal,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import { Application, Role } from "@/lib/careers";
import type { CareerRoleDefinition, CareerCohort } from "@/lib/careers-models";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { useActiveRole } from "../shell/ActiveRoleContext";
import RoleConfigModal from "./RoleConfigModal";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface RecruitmentOverviewProps {
  applications: Application[];
  roles: Role[];
  roleDefs?: CareerRoleDefinition[];
  cohorts?: CareerCohort[];
  lang?: "pt" | "en";
  onRefresh?: () => Promise<void>;
}

export const RecruitmentOverviewView: React.FC<RecruitmentOverviewProps> = ({
  applications,
  roles,
  roleDefs = [],
  cohorts = [],
  lang: propLang,
  onRefresh,
}) => {
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const { activeRoleId, activeRole, setActiveRoleId } = useActiveRole();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(activeRoleId || "all");
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeRoleId) {
      setSelectedRoleFilter(activeRoleId);
    }
  }, [activeRoleId]);

  // Filter applications by active role workspace if selected (excluding archived candidates)
  const activeApplications = useMemo(() => {
    const list = selectedRoleFilter === "all"
      ? applications
      : applications.filter(
          (a) => a.role === selectedRoleFilter || (selectedRoleFilter === "cctv" && !a.role),
        );
    return list.filter((a) => a.status !== "archived");
  }, [applications, selectedRoleFilter]);

  // Active role definition and stage capabilities
  const activeRoleDef = roleDefs.find((r) => r.id === selectedRoleFilter) || (selectedRoleFilter === "all" ? null : activeRole);
  const stages = activeRoleDef?.pipelineStages || (selectedRoleFilter === "all" ? ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"] : ["applications", "screening", "interview", "hired"]);
  const hasTesting = stages.includes("testing");
  const hasNextPhase = stages.includes("next_phase");

  // Exact database calculations
  const totalApps = activeApplications.length;
  const testsBooked = activeApplications.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length;
  const testsCompleted = activeApplications.filter((a) => Boolean(a.attendedAt)).length;

  const cvScreenedCount = activeApplications.filter(
    (a) =>
      a.status !== "archived" &&
      a.status !== "rejected" &&
      (Boolean(a.screeningResult?.passedMandatory) ||
        (typeof a.screeningScore === "number" && a.screeningScore >= 50) ||
        a.status === "shortlisted" ||
        a.status === "screening" ||
        a.status === "interview" ||
        a.status === "hired")
  ).length;

  const inReviewCount = activeApplications.filter(
    (a) =>
      a.status !== "archived" &&
      a.status !== "rejected" &&
      a.status !== "interview" &&
      a.status !== "hired" &&
      (!a.screeningResult || !a.screeningResult.passedMandatory)
  ).length;

  const interviewCount = activeApplications.filter(
    (a) => a.status === "interview"
  ).length;

  const hiredCount = activeApplications.filter(
    (a) => a.status === "hired"
  ).length;

  const archivedCount = activeApplications.filter(
    (a) => a.status === "archived" || a.status === "rejected"
  ).length;

  // Dynamic next phase cohort metrics derived from DB applications & roster
  const nextPhaseStats = useMemo(() => {
    const nextPhaseApps = activeApplications.filter((a) => {
      if (a.status === "archived" || a.status === "rejected") return false;
      return (
        a.status === "next_phase_selected" ||
        a.status === "next_phase_invited" ||
        a.status === "awaiting_response" ||
        a.status === "interest_confirmed" ||
        a.status === "interest_declined" ||
        a.nextPhaseStatus === "selected" ||
        a.nextPhaseStatus === "invited" ||
        a.nextPhaseStatus === "confirmed" ||
        a.nextPhaseStatus === "declined"
      );
    });

    const scores = nextPhaseApps
      .map((a) => a.testScore)
      .filter((s): s is number => typeof s === "number");

    const totalCount = nextPhaseApps.length;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 100;

    return { totalCount, minScore, maxScore };
  }, [activeApplications]);

  const nextPhaseSelected = nextPhaseStats.totalCount;
  const awaitingResponse = activeApplications.filter((a) => a.nextPhaseInvitedAt && !a.nextPhaseResponse).length;
  const confirmedInterest = activeApplications.filter((a) => a.nextPhaseResponse === "yes").length;

  const metrics = useMemo(() => {
    // 1. Role has physical testing & next phase (e.g. CCO)
    if (hasTesting && hasNextPhase) {
      return [
        {
          label: t("Total Applications", "Total de Candidaturas"),
          value: totalApps,
          sub: t("In current workspace", "No funil selecionado"),
          href: selectedRoleFilter === "all" ? "/admin/recruitment/candidates?view=all" : `/admin/recruitment/candidates?role=${selectedRoleFilter}`,
          icon: Users,
        },
        {
          label: t("Tests Booked", "Testes Agendados"),
          value: testsBooked,
          sub: t("Confirmed in-person slots", "Turnos com presença marcada"),
          href: `/admin/recruitment/testing?role=${selectedRoleFilter}`,
          icon: CalendarCheck,
        },
        {
          label: t("Tests Completed", "Testes Realizados"),
          value: testsCompleted,
          sub: t("Verified gate attendance", "Presença confirmada no portão"),
          href: `/admin/recruitment/testing?role=${selectedRoleFilter}`,
          icon: CheckCircle2,
        },
        {
          label: t("Next Phase Approved", "Aprovados Próx. Fase"),
          value: nextPhaseSelected,
          sub: t("Approved cohort roster", "Lista aprovada pela administração"),
          href: `/admin/recruitment/next-phase?role=${selectedRoleFilter}`,
          icon: Award,
        },
        {
          label: t("Awaiting Response", "Aguardando Resposta"),
          value: awaitingResponse,
          sub: t("Sent conditions notice", "Notificação de condições enviada"),
          href: `/admin/recruitment/next-phase?role=${selectedRoleFilter}`,
          icon: Clock,
        },
        {
          label: t("Confirmed Interest", "Interesse Confirmado"),
          value: confirmedInterest,
          sub: t("Accepted terms", "Aceitaram termos"),
          href: `/admin/recruitment/next-phase?role=${selectedRoleFilter}`,
          icon: ThumbsUp,
        },
      ];
    }

    // 2. Global View ("all")
    if (selectedRoleFilter === "all") {
      return [
        {
          label: t("Total Applications", "Total de Candidaturas"),
          value: totalApps,
          sub: t("Across all active positions", "Todas as vagas ativas"),
          href: "/admin/recruitment/candidates?view=all",
          icon: Users,
        },
        {
          label: t("CV Screened / Qualified", "Triagem / Qualificados"),
          value: cvScreenedCount,
          sub: t("Met criteria across roles", "Critérios validados"),
          href: "/admin/recruitment/candidates?stage=shortlisted",
          icon: CheckCircle2,
        },
        {
          label: t("Tests Booked (CCO)", "Testes Agendados (CCO)"),
          value: testsBooked,
          sub: t("Confirmed test sessions", "Sessões agendadas"),
          href: "/admin/recruitment/testing",
          icon: CalendarCheck,
        },
        {
          label: t("Next Phase Roster (CCO)", "Turma Próx. Fase (CCO)"),
          value: nextPhaseSelected,
          sub: t("Approved finalists", "Finalistas aprovadas"),
          href: "/admin/recruitment/next-phase",
          icon: Award,
        },
        {
          label: t("Interviews", "Entrevistas"),
          value: interviewCount,
          sub: t("Under panel review", "Em avaliação técnica"),
          href: "/admin/recruitment/candidates?stage=interview",
          icon: Clock,
        },
        {
          label: t("Hired & Admitted", "Contratados"),
          value: hiredCount,
          sub: t("Admitted into Overwatch", "Admitidos na equipa"),
          href: "/admin/recruitment/candidates?stage=hired",
          icon: Award,
        },
      ];
    }

    // 3. Direct Professional Pipeline without testing (like CCTV Technical Manager)
    return [
      {
        label: t("Total Applications", "Total de Candidaturas"),
        value: totalApps,
        sub: t("Received for this role", "Recebidas para esta vaga"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}`,
        icon: Users,
      },
      {
        label: t("CV Screened / Qualified", "Triagem / Qualificados"),
        value: cvScreenedCount,
        sub: t("Met technical criteria", "Cumprem requisitos técnicos"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}&view=screened`,
        icon: CheckCircle2,
      },
      {
        label: t("Pending Review", "Pendente Avaliação"),
        value: inReviewCount,
        sub: t("Awaiting recruiter action", "Aguardando triagem técnica"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}&view=active`,
        icon: Clock,
      },
      {
        label: t("Technical Interview", "Entrevista Técnica"),
        value: interviewCount,
        sub: t("In-person panel review", "Painel com direção técnica"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}&view=interview`,
        icon: CalendarCheck,
      },
      {
        label: t("Hired & Admitted", "Contratados"),
        value: hiredCount,
        sub: t("Successful offers", "Admissão confirmada"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}&view=hired`,
        icon: Award,
      },
      {
        label: t("Archived / Closed", "Arquivados"),
        value: archivedCount,
        sub: t("Not advancing in cycle", "Fora do processo activo"),
        href: `/admin/recruitment/candidates?role=${selectedRoleFilter}&view=archived`,
        icon: Archive,
      },
    ];
  }, [
    hasTesting,
    hasNextPhase,
    selectedRoleFilter,
    totalApps,
    testsBooked,
    testsCompleted,
    nextPhaseSelected,
    awaitingResponse,
    confirmedInterest,
    cvScreenedCount,
    inReviewCount,
    interviewCount,
    hiredCount,
    archivedCount,
    lang,
  ]);

  const handleSaveRole = async (newRole: CareerRoleDefinition) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/careers/roles-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_or_update_role", role: newRole }),
      });
      if (res.ok && onRefresh) {
        await onRefresh();
      }
      setModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Recruitment Operations Overview", "Visão Geral do Recrutamento")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Operational pipeline metrics, modular stage tracking, and cohort management",
              "Métricas operacionais, funis modulares e acompanhamento de lotes de recrutamento",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/recruitment/archive"
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Archive size={14} className="text-slate-600" />
            <span>{t("Archive Vault", "Cofre de Arquivo")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} className="text-sky-600" />
            <span>{t("New Role", "Nova Vaga")}</span>
          </button>

          <Link
            href="/admin/recruitment/candidates"
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>{t("View All Candidates", "Ver Candidaturas")}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Role Pipeline Workspace Selector Pills */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto admin-scrollbar pb-1 text-xs">
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1.5 pl-1">
            {t("Active Workspace:", "Funil Ativo:")}
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedRoleFilter("all");
              setActiveRoleId("all");
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
              selectedRoleFilter === "all"
                ? "bg-sky-50 text-sky-700 border border-sky-300 font-semibold shadow-2xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{t("All Active Roles", "Todas as Vagas")}</span>
            <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[0.65rem] ${selectedRoleFilter === "all" ? "bg-sky-200/60 text-sky-800" : "bg-slate-100 text-slate-600"}`}>
              {applications.filter((a) => a.status !== "archived").length}
            </span>
          </button>

          {roles.map((r) => {
            const count = applications.filter((a) => (a.role === r.id || (r.id === "cctv" && !a.role)) && a.status !== "archived").length;
            const isSelected = selectedRoleFilter === r.id;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRoleFilter(r.id);
                  setActiveRoleId(r.id);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-sky-50 text-sky-700 border border-sky-300 font-semibold shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{lang === "pt" ? r.pt : r.en}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[0.65rem] font-mono ${
                    isSelected ? "bg-sky-200/60 text-sky-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
                {r.open && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Operational Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Link
              key={idx}
              href={m.href}
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {m.label}
                </span>
                <Icon size={14} className="text-slate-400 shrink-0" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                  {m.value}
                </div>
                <div className="text-[0.65rem] text-slate-400 mt-1 truncate">
                  {m.sub}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Active Roles Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Roles Summary */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t("Job Positions & Modular Pipelines", "Resumo das Vagas & Funis Modulares")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("Applications and customized stages per recruitment opening", "Candidaturas e etapas configuradas por função")}
              </p>
            </div>
            <Link
              href="/admin/recruitment/roles"
              className="text-xs font-semibold text-sky-700 hover:text-sky-800"
            >
              {t("Manage Roles & Rules →", "Gerir Vagas & Regras →")}
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {roles.map((role) => {
              const roleApps = applications.filter((a) => a.role === role.id || (role.id === "cctv" && !a.role));
              const booked = roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length;
              const def = roleDefs.find((d) => d.id === role.id);
              const stagesCount = def?.pipelineStages?.length || 4;
              const rulesCount = def?.screeningRules?.length || 0;

              return (
                <div key={role.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Briefcase size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {lang === "pt" ? role.pt : role.en}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-slate-500">
                        <span>{roleApps.length} {t("applications", "candidaturas")}</span>
                        <span>•</span>
                        <span>{booked} {t("scheduled", "agendados")}</span>
                        <span>•</span>
                        <span className="text-sky-600">{stagesCount} {t("stages", "etapas")}</span>
                        {rulesCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600">{rulesCount} {t("rules", "regras")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold ${
                        role.open
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {role.open ? t("OPEN", "ABERTA") : t("CLOSED", "FECHADA")}
                    </span>

                    <Link
                      href={`/admin/recruitment/candidates?role=${role.id}`}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {t("View", "Ver")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Next Phase Cohort or Active Role Pipeline Summary */}
        {hasNextPhase ? (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                <Award size={16} className="text-sky-600" />
                <span>{t("Next Phase Cohort (CCO)", "Turma da Próxima Fase (CCO)")}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(
                  `Management has approved ${nextPhaseStats.totalCount} candidates for the CCO practical training pipeline (Scores: ${nextPhaseStats.minScore}% - ${nextPhaseStats.maxScore}%).`,
                  `A administração aprovou ${nextPhaseStats.totalCount} candidatas para a formação prática de CCO (Pontuações: ${nextPhaseStats.minScore}% - ${nextPhaseStats.maxScore}%).`
                )}
              </p>

              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>{t("Approved Candidates:", "Candidatas Aprovadas:")}</span>
                  <strong className="text-slate-900 font-mono">{nextPhaseStats.totalCount}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Confirmed YES:", "Confirmaram SIM:")}</span>
                  <strong className="text-emerald-700 font-mono">{confirmedInterest}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Awaiting Response:", "Aguardando Resposta:")}</span>
                  <strong className="text-amber-700 font-mono">{awaitingResponse}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/admin/recruitment/next-phase"
                className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>{t("Open Next Phase Workflow", "Abrir Fluxo da Próxima Fase")}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>
                  {activeRoleDef ? (lang === "pt" ? activeRoleDef.pt : activeRoleDef.en) : t("Technical Pipeline", "Funil Técnico")}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(
                  "Direct operational pipeline without physical aptitude test booking. Screened on technical qualifications and direct interview panels.",
                  "Fluxo de recrutamento directo sem convocatórias de testes físicos. Filtrado por critérios técnicos comprovados e entrevistas com a direção."
                )}
              </p>

              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>{t("Total In Intake:", "Total de Candidaturas:")}</span>
                  <strong className="text-slate-900 font-mono">{totalApps}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Qualified / Screened:", "Qualificados na Triagem:")}</span>
                  <strong className="text-emerald-700 font-mono">{cvScreenedCount}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("In Interview Stage:", "Em Entrevista Técnica:")}</span>
                  <strong className="text-sky-700 font-mono">{interviewCount}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Admitted / Hired:", "Admitidos na Equipa:")}</span>
                  <strong className="text-purple-700 font-mono">{hiredCount}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
              <Link
                href={`/admin/recruitment/candidates?role=${selectedRoleFilter}`}
                className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>{t("Review Role Candidates", "Rever Candidatos da Vaga")}</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                href="/admin/recruitment/roles"
                className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <span>{t("Configure Screening Rules", "Configurar Regras de Triagem")}</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Role Config Modal */}
      {modalOpen && (
        <RoleConfigModal
          key="new-role"
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaveRole={handleSaveRole}
        />
      )}
    </div>
  );
};
