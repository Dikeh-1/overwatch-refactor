"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { LockKeyhole, Loader2, AlertCircle, RefreshCw, Menu, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LazyVideo from "@/components/ui/LazyVideo";
import TechGrid from "@/components/ui/TechGrid";
import { IMAGES } from "@/lib/constants";
import Link from "next/link";
import { Application, Role } from "@/lib/careers";

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [auth, setAuth] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // App metrics for sidebar badges
  const [applications, setApplications] = useState<Application[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  useEffect(() => {
    const saved = localStorage.getItem("overwatch_admin_lang") as "pt" | "en" | null;
    if (saved === "pt" || saved === "en") setLang(saved);
  }, []);

  const handleToggleLang = () => {
    const next = lang === "pt" ? "en" : "pt";
    setLang(next);
    localStorage.setItem("overwatch_admin_lang", next);
  };

  // Auth check
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      const data = await res.json();
      setAuth(Boolean(data.authenticated));
    } catch {
      setAuth(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Load summary data for badges
  const loadSummaryData = useCallback(async () => {
    if (!auth) return;
    try {
      const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch {
      // silent
    }
  }, [auth]);

  useEffect(() => {
    loadSummaryData();
    const interval = setInterval(loadSummaryData, 10000);
    return () => clearInterval(interval);
  }, [loadSummaryData]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const password = new FormData(e.currentTarget).get("password") as string;
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password incorrect");
      setAuth(true);
      loadSummaryData();
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setAuth(false);
  };

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const parts = [{ label: "Overwatch Admin", href: "/admin" }];
    if (pathname?.includes("/recruitment")) {
      parts.push({ label: t("Recruitment", "Recrutamento"), href: "/admin/recruitment" });
    }
    if (pathname?.includes("/candidates")) {
      parts.push({ label: t("Candidates", "Candidaturas"), href: "/admin/recruitment/candidates" });
    } else if (pathname?.includes("/testing")) {
      parts.push({ label: t("Testing & Attendance", "Escala & Presenças"), href: "/admin/recruitment/testing" });
    } else if (pathname?.includes("/next-phase")) {
      parts.push({ label: t("Next Phase", "Próxima Fase"), href: "/admin/recruitment/next-phase" });
    } else if (pathname?.includes("/communications")) {
      parts.push({ label: t("Communications", "Comunicações"), href: "/admin/recruitment/communications" });
    } else if (pathname?.includes("/roles")) {
      parts.push({ label: t("Job Roles", "Vagas & Funções"), href: "/admin/recruitment/roles" });
    } else if (pathname?.includes("/settings")) {
      parts.push({ label: t("Settings", "Configurações"), href: "/admin/settings" });
    }
    return parts;
  };

  // Login view
  if (auth === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white relative isolate overflow-hidden px-4 py-12">
        {/* Soft Background Video */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <LazyVideo
            className="h-full w-full object-cover mix-blend-luminosity"
            poster={IMAGES.videoPoster}
            rootMargin="700px"
            src={IMAGES.videoSrc}
          />
        </div>
        {/* Soft dark dimming overlay to keep it soft, not too bright, matching Overwatch theme */}
        <div className="absolute inset-0 bg-[#090d16]/80 z-0 pointer-events-none" />
        <TechGrid className="absolute inset-0 opacity-35 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Top Language Toggle */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center rounded-xl bg-white/[0.06] border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLang("en");
                  localStorage.setItem("overwatch_admin_lang", "en");
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  setLang("pt");
                  localStorage.setItem("overwatch_admin_lang", "pt");
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
            </div>
          </div>

          <div className="text-center pb-6 border-b border-white/10">
            <div className="flex justify-center mb-4">
              <Logo size="md" variant="light" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/80">
              <ShieldCheck size={13} />
              {t("Talent Operations Portal", "Portal de Operações de Recrutamento")}
            </span>
            <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
              {t("Recruitment Workspace", "Área de Recrutamento")}
            </h1>
            <p className="mt-1 text-xs text-white/60">
              {t(
                "Sign in with your administrator key to review applications and manage candidates.",
                "Inicie sessão com a sua chave de administração para rever candidaturas e gerir vagas.",
              )}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-semibold text-white/80">
                {t("Admin password", "Palavra-passe de administrador")}
              </span>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  placeholder={t("Enter administrator password", "Introduza a palavra-passe")}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors"
                />
              </div>
            </label>

            {authError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/30 transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
              <span>{authLoading ? t("Authenticating…", "A autenticar…") : t("Enter Workspace", "Entrar no Portal")}</span>
              {!authLoading && <ArrowRight size={16} />}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-white/50">
              <span className="flex items-center gap-1">
                <LockKeyhole size={12} /> {t("Confidential access", "Acesso reservado")}
              </span>
              <Link
                href="/careers"
                target="_blank"
                className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                {t("View Careers Page", "Ver Página de Carreiras")} <ExternalLink size={12} />
              </Link>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (auth === null) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();
  const sidebarCounts = {
    totalCandidates: applications.length,
    bookedSessions: applications.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length,
    nextPhaseCount: 15,
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex">
      {/* Sidebar */}
      <AdminSidebar
        lang={lang}
        onToggleLang={handleToggleLang}
        onLogout={handleLogout}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        counts={sidebarCounts}
      />

      {/* Main Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300">/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? "font-semibold text-slate-900" : "text-slate-500"}>
                    {b.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                loadSummaryData().finally(() => setIsRefreshing(false));
              }}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title={t("Refresh data", "Atualizar dados")}
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
