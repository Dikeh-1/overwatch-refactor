"use client";

import React from "react";
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
} from "lucide-react";
import { Application, Role } from "@/lib/careers";

interface RecruitmentOverviewProps {
  applications: Application[];
  roles: Role[];
  lang: "pt" | "en";
}

export const RecruitmentOverviewView: React.FC<RecruitmentOverviewProps> = ({
  applications,
  roles,
  lang,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  // Exact database calculations
  const totalApps = applications.length;
  const testsBooked = applications.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length;
  const testsCompleted = applications.filter((a) => Boolean(a.attendedAt)).length;
  const nextPhaseSelected = 15;
  const awaitingResponse = applications.filter((a) => a.nextPhaseInvitedAt && !a.nextPhaseResponse).length;
  const confirmedInterest = applications.filter((a) => a.nextPhaseResponse === "yes").length;

  const metrics = [
    {
      label: t("Total Applications", "Total de Candidaturas"),
      value: totalApps,
      sub: t("All received submissions", "Candidaturas submetidas no portal"),
      href: "/admin/recruitment/candidates?view=all",
      icon: Users,
    },
    {
      label: t("Tests Booked", "Testes Agendados"),
      value: testsBooked,
      sub: t("Confirmed in-person slots", "Turnos com presença marcada"),
      href: "/admin/recruitment/testing",
      icon: CalendarCheck,
    },
    {
      label: t("Tests Completed", "Testes Realizados"),
      value: testsCompleted,
      sub: t("Verified gate attendance", "Presença confirmada no portão"),
      href: "/admin/recruitment/testing",
      icon: CheckCircle2,
    },
    {
      label: t("Next Phase Approved", "Aprovados Próx. Fase"),
      value: nextPhaseSelected,
      sub: t("Management approved cohort", "Lista aprovada pela administração"),
      href: "/admin/recruitment/next-phase",
      icon: Award,
    },
    {
      label: t("Awaiting Response", "Aguardando Resposta"),
      value: awaitingResponse,
      sub: t("Sent conditions notice", "Notificação de condições enviada"),
      href: "/admin/recruitment/next-phase",
      icon: Clock,
    },
    {
      label: t("Confirmed Interest", "Interesse Confirmado"),
      value: confirmedInterest,
      sub: t("Accepted training terms", "Aceitaram termos de formação"),
      href: "/admin/recruitment/next-phase",
      icon: ThumbsUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Recruitment Overview", "Visão Geral do Recrutamento")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Operational pipeline metrics and cohort tracking for active campaigns",
              "Métricas operacionais e acompanhamento do funil de recrutamento"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/recruitment/candidates"
            className="px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>{t("View All Candidates", "Ver Todas as Candidaturas")}</span>
            <ArrowRight size={13} />
          </Link>
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
              className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
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
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t("Job Positions Summary", "Resumo das Vagas de Recrutamento")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("Applications distributed across career positions", "Distribuição das candidaturas por função")}
              </p>
            </div>
            <Link
              href="/admin/recruitment/roles"
              className="text-xs font-semibold text-sky-700 hover:text-sky-800"
            >
              {t("Manage Roles →", "Gerir Vagas →")}
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {roles.map((role) => {
              const roleApps = applications.filter((a) => a.role === role.id || (role.id === "cctv" && !a.role));
              const booked = roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length;

              return (
                <div key={role.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {lang === "pt" ? role.pt : role.en}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-slate-500">
                        <span>{roleApps.length} {t("applications", "candidaturas")}</span>
                        <span>•</span>
                        <span>{booked} {t("scheduled", "agendados")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
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
                      className="px-2.5 py-1 rounded border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {t("View", "Ver")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Next Phase Cohort Quick Access */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
              <Award size={16} className="text-sky-600" />
              <span>{t("Next Phase Cohort", "Turma da Próxima Fase")}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t(
                "Management has approved 15 candidates for the CCO practical training pipeline (Scores: 81% - 93%).",
                "A administração aprovou 15 candidatas para a formação prática de CCO (Pontuações: 81% - 93%)."
              )}
            </p>

            <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>{t("Approved Candidates:", "Candidatas Aprovadas:")}</span>
                <strong className="text-slate-900 font-mono">15</strong>
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
              className="w-full py-2 px-3 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{t("Open Next Phase Workflow", "Abrir Fluxo da Próxima Fase")}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
