"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { LockKeyhole, AlertCircle, RefreshCw, Menu, ShieldCheck, ArrowRight, ExternalLink, X, Clock } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LazyVideo from "@/components/ui/LazyVideo";
import TechGrid from "@/components/ui/TechGrid";
import { IMAGES } from "@/lib/constants";
import Link from "next/link";
import { Application, Role } from "@/lib/careers";
import { AdminLanguageProvider, useAdminLanguage } from "./AdminLanguageContext";
import { ActiveRoleProvider, useActiveRole } from "./ActiveRoleContext";
import { NavigationLoadingProvider, useNavigationLoading } from "./NavigationLoadingContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import { useLiveRecruitmentFeed } from "@/components/admin/hooks/useLiveRecruitmentFeed";
import GlobalCelebrationListener from "@/components/admin/ui/GlobalCelebrationListener";
import { SectionHistoryButton } from "@/components/admin/ActivityHistory";
import { AdminSectionNavigation } from "./AdminSectionNavigation";

interface AdminShellProps {
  children: React.ReactNode;
}

const AdminShellInner: React.FC<AdminShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const { lang, setLang, toggleLang, t } = useAdminLanguage();
  const { isNavigating, navLabel } = useNavigationLoading();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Session Timeout Warning Modal (5-second countdown before automatic logout)
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState(5);
  const [extendingSession, setExtendingSession] = useState(false);
  const warningActiveRef = useRef(false);

  // App metrics for sidebar badges
  const [applications, setApplications] = useState<Application[]>([]);
  const [deletedNextPhase, setDeletedNextPhase] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live real-time radar sync & instant new applicant notification
  const { liveAlert, dismissAlert } = useLiveRecruitmentFeed({
    enabled: Boolean(auth) && !sessionWarningOpen,
    onRefreshData: () => loadSummaryData(),
  });

  const handleToggleLang = () => {
    toggleLang();
  };

  const triggerSessionWarning = useCallback(() => {
    if (warningActiveRef.current) return;
    warningActiveRef.current = true;
    setSessionCountdown(5);
    setSessionWarningOpen(true);
  }, []);

  // Auth check
  const checkSession = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("Session check unavailable");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) throw new Error("Session check unavailable");
      const data = await res.json();
      setAuthError("");
      if (data.authenticated) {
        warningActiveRef.current = false;
        setSessionWarningOpen(false);
        setAuth(true);
        setSessionExpiry(data.expiresAt || null);
      } else {
        setAuth((prev) => {
          if (prev === true && !isInitial) {
            triggerSessionWarning();
            return true;
          }
          return false;
        });
        if (isInitial) setSessionExpiry(null);
      }
    } catch {
      // A temporary connection failure is not evidence that a session expired.
      setAuthError("Unable to check your session. Please retry.");
    }
  }, [triggerSessionWarning]);

  useEffect(() => {
    void checkSession(true);
  }, [checkSession]);

  useEffect(() => {
    if (!auth) return;
    const originalFetch = window.fetch;
    const guardedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith("/api/admin/")) {
        const contentType = response.headers.get("content-type") || "";
        // Protect JSON consumers if Vercel Security Checkpoint or gateway returns an HTML page
        if (contentType.includes("text/html") && !url.pathname.startsWith("/api/admin/cv")) {
          return new Response(
            JSON.stringify({
              error:
                lang === "en"
                  ? "Browser security verification or connection update in progress. Please wait a moment or click Refresh."
                  : "Verificação de segurança do navegador ou atualização de ligação em curso. Aguarde um instante ou clique em Actualizar.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.pathname !== "/api/admin/session" && response.status === 401) {
          triggerSessionWarning();
        }
        if (response.status === 403 && !contentType.includes("text/html")) {
          void originalFetch("/api/admin/session", { cache: "no-store" })
            .then(async (r) => {
              if (r.ok && r.headers.get("content-type")?.includes("application/json") && (await r.json()).authenticated === false) {
                triggerSessionWarning();
              }
            })
            .catch(() => {});
        }
      }
      return response;
    };
    window.fetch = guardedFetch;
    // Prompt 5 seconds before sessionExpiry (or immediately if reached)
    const delayMs = sessionExpiry ? Math.max(0, sessionExpiry - Date.now() - 5000) : undefined;
    const timer = delayMs !== undefined ? window.setTimeout(triggerSessionWarning, delayMs) : undefined;
    const check = () => { if (!document.hidden && !warningActiveRef.current) void checkSession(false); };
    const interval = window.setInterval(check, 60000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
      window.clearTimeout(timer); window.clearInterval(interval);
      window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check);
    };
  }, [auth, sessionExpiry, checkSession, triggerSessionWarning, lang]);

  // 5-second countdown effect when Session Timeout Warning modal is open
  useEffect(() => {
    if (!sessionWarningOpen || extendingSession) return;
    if (sessionCountdown <= 0) {
      warningActiveRef.current = false;
      setSessionWarningOpen(false);
      void fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
      setAuth(false);
      setSessionExpiry(null);
      setApplications([]);
      setDeletedNextPhase([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSessionCountdown((c) => c - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [sessionWarningOpen, sessionCountdown, extendingSession]);

  const handleExtendSession = async () => {
    if (extendingSession) return;
    setExtendingSession(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        warningActiveRef.current = false;
        setSessionWarningOpen(false);
        setSessionCountdown(5);
        setSessionExpiry(data.expiresAt || Date.now() + 8 * 60 * 60 * 1000);
      } else {
        warningActiveRef.current = false;
        setSessionWarningOpen(false);
        setAuth(false);
        setSessionExpiry(null);
      }
    } catch {
      warningActiveRef.current = false;
      setSessionWarningOpen(false);
    } finally {
      setExtendingSession(false);
    }
  };

  // Load summary data for badges
  const loadSummaryData = useCallback(async () => {
    if (!auth) return;
    try {
      const res = await fetch(`/api/admin/careers?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setDeletedNextPhase(data.deletedNextPhase || []);
      }
    } catch {
      // silent
    }
  }, [auth]);

  useEffect(() => {
    loadSummaryData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadSummaryData();
    }, 60000);

    const handleAdminUpdate = () => {
      loadSummaryData();
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadSummaryData();
      }
    };

    window.addEventListener("admin:careers-updated", handleAdminUpdate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("admin:careers-updated", handleAdminUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadSummaryData]);

  const nextPhaseCount = useMemo(() => {
    const deletedSet = new Set(deletedNextPhase);
    return applications.filter((a) => {
      if (deletedSet.has(a.id)) return false;
      const norm = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (deletedSet.has(norm) || deletedSet.has(a.name)) return false;
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
    }).length;
  }, [applications, deletedNextPhase]);

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
      warningActiveRef.current = false;
      setSessionWarningOpen(false);
      setAuth(true);
      if (data.expiresAt) setSessionExpiry(data.expiresAt);
      void checkSession(false);
      loadSummaryData();
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    warningActiveRef.current = false;
    setSessionWarningOpen(false);
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setAuth(false);
    setSessionExpiry(null);
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
              {authLoading ? <OverwatchOrbitLoader size="xs" theme="light" className="shrink-0" /> : null}
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
    if (authError) return <div role="alert" className="min-h-screen flex items-center justify-center gap-3"><p>{authError}</p><button className="underline" onClick={() => void checkSession()}>{t("Retry", "Tentar novamente")}</button></div>;
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <OverwatchOrbitLoader
          label={t("Verifying security clearance...", "A verificar credenciais de segurança...")}
          size="md"
        />
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();

  const sidebarCounts = {
    totalCandidates: applications.length,
    bookedSessions: applications.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length,
    nextPhaseCount,
  };

  return (
    <ActiveRoleProvider applications={applications}>
      {/* Session Timeout Warning Modal with 5-Second Countdown */}
      {sessionWarningOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-timeout-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                  <Clock size={22} />
                </div>
                <div>
                  <h2 id="session-timeout-title" className="text-base font-bold text-slate-900">
                    {t("Session About to Expire", "Sessão Prestes a Expirar")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t("Security timeout protection", "Proteção de tempo limite de segurança")}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono text-sm font-bold">
                {sessionCountdown}s
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t(
                `Your admin session is timing out. Click "Extend Session" below to stay logged in, or you will be automatically logged out in ${sessionCountdown} second(s).`,
                `A sua sessão de administrador está a terminar. Clique em "Prolongar Sessão" abaixo para continuar ligado, ou a sessão será encerrada automaticamente em ${sessionCountdown} segundo(s).`
              )}
            </p>

            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-1000"
                style={{ width: `${Math.max(0, (sessionCountdown / 5) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={extendingSession}
                onClick={() => void handleLogout()}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                {t("Log Out Now", "Terminar Sessão")}
              </button>
              <button
                type="button"
                autoFocus
                disabled={extendingSession}
                onClick={() => void handleExtendSession()}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
              >
                {extendingSession
                  ? t("Extending…", "A prolongar…")
                  : t(`Extend Session (${sessionCountdown}s)`, `Prolongar Sessão (${sessionCountdown}s)`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Route Navigation Floating Heads-Up Pill */}
      {isNavigating && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 right-4 sm:right-6 z-[9999] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0a1128]/95 border border-white/20 shadow-xl text-white text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <span className="inline-flex rounded-full h-2 w-2 bg-white"></span>
          <span className="text-[11px] text-slate-100 font-medium">
            {navLabel || (lang === "pt" ? "A carregar secção..." : "Loading section...")}
          </span>
        </aside>
      )}

      <div data-admin-ui className="min-h-screen bg-[#F7F8FA] text-slate-900 flex">
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
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
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
            <AdminSectionNavigation />
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300">/</span>}
                  {idx === breadcrumbs.length - 1 ? <span className="font-semibold text-slate-900">{b.label}</span> : <Link className="hover:text-sky-700" href={b.href}>{b.label}</Link>}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Header Language Switcher */}
            <SectionHistoryButton />
            <div className="flex items-center rounded-md bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  lang === "en" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("pt")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  lang === "pt" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                PT
              </button>
            </div>

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

      {/* Realtime New Applicant Radar Alert */}
      {liveAlert && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border border-sky-400/40 bg-[#0a1128]/95 p-4 text-white shadow-2xl shadow-sky-950/60 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
          </div>

          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-sky-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>{t("New Candidate Application", "Nova Candidatura Recebida")}</span>
            </div>
            <div className="text-xs font-semibold text-white truncate max-w-xs mt-0.5">
              {liveAlert.name}
            </div>
            <div className="text-[0.68rem] text-slate-400 truncate">
              {liveAlert.role || t("General Pipeline", "Funil Geral")}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-white/10">
            <Link
              href={`/admin/recruitment/candidates/${liveAlert.id}`}
              onClick={dismissAlert}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors shadow-xs"
            >
              {t("Review", "Rever")}
            </Link>
            <button
              onClick={dismissAlert}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t("Dismiss", "Fechar")}
            >
              <X size={14} />
            </button>
          </div>
        </aside>
      )}

      {/* Global Celebratory Confetti Animation Controller */}
      <GlobalCelebrationListener />
      </div>
    </ActiveRoleProvider>
  );
};

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  return (
    <AdminLanguageProvider>
      <NavigationLoadingProvider>
        <AdminShellInner>{children}</AdminShellInner>
      </NavigationLoadingProvider>
    </AdminLanguageProvider>
  );
};
