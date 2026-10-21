"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Award,
  Mail,
  Briefcase,
  Settings,
  Shield,
  ExternalLink,
  LogOut,
  Globe,
  X,
  ChevronDown,
  Check,
  Plus,
  Archive,
  Layers,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  History,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useActiveRole } from "./ActiveRoleContext";
import { useNavigationLoading } from "./NavigationLoadingContext";

interface AdminSidebarProps {
  lang: "pt" | "en";
  onToggleLang: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  counts?: {
    totalCandidates: number;
    bookedSessions: number;
    nextPhaseCount: number;
  };
}

  const NavLinkItem = ({
    href,
    isNavigating,
    activeTargetHref,
    onNavigate,
    label,
    icon: Icon,
    isActiveMatch,
    badge,
    badgeClass,
  }: {
    href: string;
    isNavigating: boolean;
    activeTargetHref: string | null;
    onNavigate: (label: string, href: string) => void;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    isActiveMatch: boolean;
    badge?: React.ReactNode;
    badgeClass?: string;
  }) => {
    const isTargetNavigating = isNavigating && activeTargetHref === href;
    return (
      <Link
        href={href}
        onClick={() => onNavigate(label, href)}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          isActiveMatch
            ? "bg-white/[0.1] text-white font-semibold"
            : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={15} className={isActiveMatch ? "text-white" : "text-slate-400"} />
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isTargetNavigating && (
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
          {badge !== undefined && badge !== null && (
            <span className={badgeClass || "px-1.5 py-0.2 rounded text-[0.65rem] font-bold bg-white/10 text-slate-200"}>
              {badge}
            </span>
          )}
        </div>
      </Link>
    );
  };


export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  lang,
  onToggleLang,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const { roles, activeRoleId, activeRole, setActiveRoleId, roleStats } = useActiveRole();
  const { isNavigating, activeTargetHref, startNavigating } = useNavigationLoading();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNavClick = (label: string, href: string) => {
    if (`${pathname}${search ? `?${search}` : ""}` !== href) {
      startNavigating(label, href);
    }
    onCloseMobile();
  };

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === "/admin/recruitment" && pathname === "/admin/recruitment") return true;
    if (path !== "/admin/recruitment" && pathname?.startsWith(path)) return true;
    if (path === "/admin" && (pathname === "/admin" || pathname === "/admin/overview")) return true;
    return false;
  };

  const openRoles = roles.filter((role) => role.open);
  const currentRoleStats = activeRole ? roleStats[activeRole.id] : null;
  const stages = activeRole?.pipelineStages || [
    "applications",
    "screening",
    "testing",
    "gate_checkin",
    "next_phase",
    "interview",
    "hired",
  ];


  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1128] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <Link href="/admin" className="flex items-center">
            <Logo variant="light" size="sm" />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 admin-scrollbar">
          {/* Main Overview */}
          <div className="space-y-1">
            <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
              href="/admin"
              label={t("Global Overview", "Visão Geral Global")}
              icon={LayoutDashboard}
              isActiveMatch={
                isActive("/admin") &&
                !pathname?.startsWith("/admin/recruitment") &&
                !pathname?.startsWith("/admin/settings")
              }
            />
          </div>

          {/* ACTIVE ROLE WORKSPACE SELECTOR */}
          <div className="space-y-2 pt-1 border-t border-white/[0.08]" ref={menuRef}>
            <div className="px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("Open Role Workspace", "Vaga aberta")}
              </span>
            </div>

            {/* Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                disabled={!openRoles.length}
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold transition-all text-left shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-[#121c3b] flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/20">
                    <Briefcase size={12} />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white leading-tight">
                      {activeRole
                        ? lang === "en"
                          ? activeRole.en || activeRole.pt
                          : activeRole.pt || activeRole.en
                        : t("No open roles", "Nenhuma vaga aberta")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {activeRole && !activeRole.open ? t("Applications closed · Archive Vault", "Candidaturas encerradas · Arquivo") : currentRoleStats ? `${currentRoleStats.total} ${t("applicants", "candidaturas")}` : t("View closed cycles in Archive Vault", "Consulte os lotes no Arquivo")}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 shrink-0 transition-transform ${
                    roleMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {roleMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-[#0c1326] border border-white/15 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {t("Select Recruitment Role", "Selecionar Vaga de Recrutamento")}
                  </div>

                  {!openRoles.length && <p className="p-2 text-xs text-slate-400">{t("No open roles. View closed cycles in Archive Vault.", "Sem vagas abertas. Consulte os lotes no Arquivo.")}</p>}
                  {openRoles.map((r) => {
                    const isSelected = activeRoleId === r.id;
                    const rTitle = lang === "en" ? r.en || r.pt : r.pt || r.en;
                    const count = roleStats[r.id]?.total || 0;

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActiveRoleId(r.id);
                          setRoleMenuOpen(false);
                          const rolePaths = ["/admin/recruitment", "/admin/recruitment/candidates", "/admin/recruitment/testing", "/admin/recruitment/next-phase", "/admin/recruitment/communications", "/admin/recruitment/form-builder"];
                          const target = `${rolePaths.includes(pathname) ? pathname : "/admin/recruitment"}?role=${encodeURIComponent(r.id)}`;
                          handleNavClick(rTitle, target);
                          router.push(target);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                          isSelected
                            ? "bg-white/15 text-white font-bold"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate">{rTitle}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {count} {t("candidates", "candidatos")}
                          </span>
                        </div>
                        {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}

                  <div className="border-t border-white/10 pt-1 mt-1">
                    <Link
                      href="/admin/recruitment/roles"
                      onClick={() => {
                        setRoleMenuOpen(false);
                        handleNavClick(t("Manage & Add Job Roles", "Gerir & Criar Novas Vagas"), "/admin/recruitment/roles");
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sky-400 hover:bg-white/5 font-semibold transition-colors"
                    >
                      <Plus size={12} />
                      <span>{t("Manage & Add Job Roles", "Gerir & Criar Novas Vagas")}</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Closed cycles are reached exclusively through the Archive Vault. */}
          {activeRole?.open && !pathname?.startsWith("/admin/recruitment/archive") && <div className="space-y-1">
            <div className="px-3 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              {t("Role Pipeline", "Pipeline da Vaga")}
            </div>

            {/* Role Overview */}
            {(() => {
              const href = activeRole ? `/admin/recruitment?role=${activeRole.id}` : "/admin/recruitment";
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Overview & Funnel", "Visão Geral da Vaga")}
                  icon={LayoutDashboard}
                  isActiveMatch={pathname === "/admin/recruitment"}
                />
              );
            })()}

            {/* Candidates */}
            {(() => {
              const href = activeRole ? `/admin/recruitment/candidates?role=${activeRole.id}` : "/admin/recruitment/candidates";
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Candidates Intake", "Candidaturas")}
                  icon={Users}
                  isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/candidates"))}
                  badge={currentRoleStats && currentRoleStats.total > 0 ? currentRoleStats.total : undefined}
                />
              );
            })()}

            {/* Testing Stage (Shown only if role includes testing) */}
            {(stages.includes("testing") || activeRole?.id === "cctv_technical_manager") && (() => {
              const href = activeRole ? `/admin/recruitment/testing?role=${activeRole.id}` : "/admin/recruitment/testing";
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Testing & Attendance", "Escala & Presenças")}
                  icon={CalendarCheck}
                  isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/testing"))}
                  badge={currentRoleStats && currentRoleStats.testing > 0 ? currentRoleStats.testing : undefined}
                  badgeClass="px-1.5 py-0.2 rounded text-[0.65rem] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30"
                />
              );
            })()}

            {/* Next Phase Stage (Shown only if role includes next_phase) */}
            {stages.includes("next_phase") && (() => {
              const href = activeRole ? `/admin/recruitment/next-phase?role=${activeRole.id}` : "/admin/recruitment/next-phase";
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Next Phase Cohort", "Turma Próxima Fase")}
                  icon={Award}
                  isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/next-phase"))}
                  badge={currentRoleStats && currentRoleStats.nextPhase > 0 ? currentRoleStats.nextPhase : undefined}
                  badgeClass="px-1.5 py-0.2 rounded text-[0.65rem] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                />
              );
            })()}

            {/* Communications */}
            {(() => {
              const href = activeRole ? `/admin/recruitment/communications?role=${activeRole.id}` : "/admin/recruitment/communications";
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Communications Studio", "Comunicações & Minutas")}
                  icon={Mail}
                  isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/communications"))}
                />
              );
            })()}

            {/* Application Form Builder Studio */}
            {activeRole && (() => {
              const href = `/admin/recruitment/form-builder?role=${activeRole.id}`;
              return (
                <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
                  href={href}
                  label={t("Application Form Builder", "Construtor de Formulário")}
                  icon={SlidersHorizontal}
                  isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/form-builder"))}
                />
              );
            })()}
          </div>

          }

          {/* ALL ROLES & ARCHIVES SECTION */}
          <div className="space-y-1 pt-1 border-t border-white/[0.08]">
            <div className="px-3 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              {t("Roles & Archives", "Vagas & Histórico")}
            </div>

            <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
              href="/admin/recruitment/roles"
              label={t("All Job Roles", "Todas as Vagas")}
              icon={Briefcase}
              isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/roles"))}
              badge={roles.length}
            />

            <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
              href="/admin/recruitment/archive"
              label={t("Archive Vault", "Cofre de Arquivo")}
              icon={Archive}
              isActiveMatch={Boolean(pathname?.startsWith("/admin/recruitment/archive"))}
            />
          </div>

          {/* System & Utilities */}
          <div className="space-y-1 pt-1 border-t border-white/[0.08]">
            <div className="px-3 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              {t("System & Utilities", "Sistema & Utilitários")}
            </div>

            <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
              href="/admin/activity"
              label={t("Activity Log", "Registo de Atividade")}
              icon={History}
              isActiveMatch={Boolean(pathname?.startsWith("/admin/activity"))}
            />
            <Link
              href="/gate"
              target="_blank"
              onClick={onCloseMobile}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield size={15} className="text-slate-400" />
                <span>{t("Security Gate Portal", "Portal de Portaria")}</span>
              </div>
              <ExternalLink size={12} className="text-slate-500" />
            </Link>

            <NavLinkItem isNavigating={isNavigating} activeTargetHref={activeTargetHref} onNavigate={handleNavClick}
              href="/admin/settings"
              label={t("Settings", "Configurações")}
              icon={Settings}
              isActiveMatch={Boolean(pathname?.startsWith("/admin/settings"))}
            />
          </div>
        </div>

        {/* Footer info & session */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 bg-[#080d20]">
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium tracking-wide">
              Overwatch Console
            </span>
            <button
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1 text-[0.7rem] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Globe size={12} />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white/[0.04] hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>{t("Sign out", "Terminar Sessão")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
