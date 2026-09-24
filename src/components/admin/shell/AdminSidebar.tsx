"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Radio,
  X,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

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

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | null;
  highlight?: boolean;
  external?: boolean;
}

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  lang,
  onToggleLang,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  counts,
}) => {
  const pathname = usePathname();
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const isActive = (path: string) => {
    if (path === "/admin/recruitment" && pathname === "/admin/recruitment") return true;
    if (path !== "/admin/recruitment" && pathname?.startsWith(path)) return true;
    if (path === "/admin" && (pathname === "/admin" || pathname === "/admin/overview")) return true;
    return false;
  };

  const navGroups: NavGroup[] = [
    {
      title: null,
      items: [
        {
          href: "/admin",
          label: t("Overview", "Visão Geral"),
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: t("Recruitment", "Recrutamento"),
      items: [
        {
          href: "/admin/recruitment",
          label: t("Recruitment Overview", "Visão Geral do Módulo"),
          icon: LayoutDashboard,
          badge: null,
        },
        {
          href: "/admin/recruitment/candidates",
          label: t("Candidates", "Candidaturas"),
          icon: Users,
          badge: counts?.totalCandidates ? String(counts.totalCandidates) : null,
        },
        {
          href: "/admin/recruitment/testing",
          label: t("Testing & Attendance", "Escala & Presenças"),
          icon: CalendarCheck,
          badge: counts?.bookedSessions ? String(counts.bookedSessions) : null,
        },
        {
          href: "/admin/recruitment/next-phase",
          label: t("Next Phase", "Próxima Fase"),
          icon: Award,
          badge: counts?.nextPhaseCount ? String(counts.nextPhaseCount) : "15",
          highlight: true,
        },
        {
          href: "/admin/recruitment/communications",
          label: t("Communications", "Comunicações"),
          icon: Mail,
          badge: null,
        },
        {
          href: "/admin/recruitment/roles",
          label: t("Job Roles", "Vagas & Funções"),
          icon: Briefcase,
          badge: null,
        },
      ],
    },
    {
      title: t("System & Utilities", "Sistema & Utilitários"),
      items: [
        {
          href: "/gate",
          label: t("Security Gate Portal", "Portal de Portaria"),
          icon: Shield,
          external: true,
        },
        {
          href: "/admin/settings",
          label: t("Settings", "Configurações"),
          icon: Settings,
        },
      ],
    },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 bg-[#0a1128] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo variant="light" size="xs" />
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                Overwatch
              </span>
              <span className="text-xs font-bold text-white tracking-tight">
                Admin
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 admin-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <div className="px-3 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
              )}
              {group.items.map((item, iIdx) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={iIdx}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? "bg-white/[0.1] text-white font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={active ? "text-sky-400" : "text-slate-400"}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[0.65rem] font-bold ${
                            item.highlight
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.external && (
                        <ExternalLink size={12} className="text-slate-500" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer info & session */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 bg-[#080d20]">
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-slate-300 font-medium text-[0.7rem]">
                {t("Operational", "Operacional")}
              </span>
            </div>
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
