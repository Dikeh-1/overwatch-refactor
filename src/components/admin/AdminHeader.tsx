"use client";

import React from "react";
import {
  Menu,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import { AdminView } from "./AdminSidebar";
import { Role } from "@/lib/careers";

interface AdminHeaderProps {
  currentView: AdminView;
  onOpenMobileSidebar: () => void;
  lang: "pt" | "en";
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeRole: string | null;
  roles: Role[];
  mozambiqueTime: string;
  greetingText: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentView,
  onOpenMobileSidebar,
  lang,
  searchQuery,
  onSearchChange,
  isRefreshing,
  onRefresh,
  activeRole,
  roles,
  mozambiqueTime,
  greetingText,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const getTitle = () => {
    switch (currentView) {
      case "applications":
        return {
          title: t("Candidates Pipeline", "Gestão de Candidaturas"),
          subtitle: t("Review, shortlist, and track applicant stages", "Avalie currículos, pré-seleccione e acompanhe o funil de seleção"),
        };
      case "schedule":
        return {
          title: t("In-Person Testing Schedule", "Escala de Testes Presenciais"),
          subtitle: t("Monitor confirmed testing dates, capacity, and gate attendance", "Acompanhe presenças por turno, capacidade e registo de portaria"),
        };
      case "invitations":
        return {
          title: t("Test Invitations & Slot Setup", "Convocatórias & Configuração de Vagas"),
          subtitle: t("Dispatch test booking emails and configure available dates & quotas", "Envie links de agendamento e configure os turnos e limites por sessão"),
        };
      case "roles":
        return {
          title: t("Job Openings & Roles", "Vagas & Posições Abertas"),
          subtitle: t("Open or close active career recruitment listings", "Abra ou feche vagas para receção de novas candidaturas no website"),
        };
    }
  };

  const { title, subtitle } = getTitle();
  const activeRoleObj = roles.find((r) => r.id === activeRole);
  const activeRoleLabel = activeRoleObj ? (lang === "pt" ? activeRoleObj.pt : activeRoleObj.en) : null;

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] lg:hidden cursor-pointer shrink-0"
            title={t("Open menu", "Abrir menu")}
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {title}
              </h1>
              {activeRoleLabel && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300 truncate max-w-[200px]">
                  {activeRoleLabel}
                </span>
              )}
            </div>
            <p className="hidden sm:block text-xs text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search + Refresh + Time */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Search */}
          <div className="relative w-44 sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder={t("Search candidate...", "Pesquisar candidato...")}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8.5 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
            title={t("Refresh data", "Atualizar dados")}
          >
            <RefreshCw
              size={13}
              className={`text-slate-400 ${isRefreshing ? "animate-spin text-sky-400" : ""}`}
            />
            <span className="hidden md:inline">{t("Refresh", "Atualizar")}</span>
          </button>

          {/* Mozambique Clock */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-300 text-xs font-mono">
            <Clock size={12} className="text-sky-400 shrink-0" />
            <span>Maputo {mozambiqueTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
