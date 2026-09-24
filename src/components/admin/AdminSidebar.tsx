"use client";

import React from "react";
import {
  Users,
  Calendar,
  Send,
  Briefcase,
  ShieldCheck,
  LogOut,
  Globe,
  Radio,
  X,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { Role } from "@/lib/careers";

export type AdminView = "applications" | "schedule" | "invitations" | "roles";

interface AdminSidebarProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  lang: "pt" | "en";
  onToggleLang: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  roles: Role[];
  activeRole: string | null;
  onSelectRole: (roleId: string | null) => void;
  counts: {
    totalApplications: number;
    confirmedSchedule: number;
    shortlistedUninvited: number;
  };
  onlineCount: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onSelectView,
  lang,
  onToggleLang,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  roles,
  activeRole,
  onSelectRole,
  counts,
  onlineCount,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const navItems = [
    {
      id: "applications" as AdminView,
      label: t("Applications", "Candidaturas"),
      icon: Users,
      badge: counts.totalApplications > 0 ? counts.totalApplications : null,
      badgeColor: "bg-white/10 text-white/80",
    },
    {
      id: "schedule" as AdminView,
      label: t("Schedule & Attendance", "Escala & Presenças"),
      icon: Calendar,
      badge: counts.confirmedSchedule > 0 ? counts.confirmedSchedule : null,
      badgeColor: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    },
    {
      id: "invitations" as AdminView,
      label: t("Invitations & Slots", "Convocatórias & Vagas"),
      icon: Send,
      badge: counts.shortlistedUninvited > 0 ? counts.shortlistedUninvited : null,
      badgeColor: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
    },
    {
      id: "roles" as AdminView,
      label: t("Job Roles", "Vagas & Funções"),
      icon: Briefcase,
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d121f] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header / Brand */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col">
              <span className="text-[0.62rem] font-bold tracking-widest text-slate-400 uppercase font-mono">
                Recruitment Portal
              </span>
              <span className="text-xs font-semibold text-white">Overwatch Maputo</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Campaign Role Switcher */}
        <div className="p-3 border-b border-white/[0.06]">
          <label className="block text-[0.65rem] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1.5">
            {t("Active Campaign", "Concurso Ativo")}
          </label>
          <div className="relative">
            <select
              value={activeRole || "all"}
              onChange={(e) => onSelectRole(e.target.value === "all" ? null : e.target.value)}
              className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-sky-500/50 cursor-pointer pr-8 transition-colors"
            >
              <option value="all" className="bg-[#0f172a] text-white">
                {t("All Roles (Consolidated)", "Todas as Vagas (Geral)")}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#0f172a] text-white">
                  {lang === "pt" ? r.pt : r.en} {r.open ? `(${t("Open", "Aberta")})` : `(${t("Closed", "Fechada")})`}
                </option>
              ))}
            </select>
            <ChevronRight
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90"
            />
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white/[0.1] text-white font-semibold shadow-sm border border-white/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={isActive ? "text-sky-400" : "text-slate-400"}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[0.65rem] font-mono font-medium ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Gate Portal Quick Link */}
        <div className="p-3 border-t border-white/[0.06]">
          <a
            href="/gate"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>{t("Security Gate Portal", "Portal da Portaria")}</span>
            </div>
            <span className="text-[0.65rem] text-slate-400 font-mono group-hover:text-slate-200">
              ↗
            </span>
          </a>
        </div>

        {/* Footer / System Status & Logout */}
        <div className="p-4 border-t border-white/[0.08] space-y-3 bg-black/20">
          <div className="flex items-center justify-between text-[0.7rem] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">
                {t("Online", "Operacional")}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-mono text-[0.68rem] transition-colors cursor-pointer"
              title={t("Switch language", "Mudar idioma")}
            >
              <Globe size={11} />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>{t("Sign Out", "Terminar Sessão")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
