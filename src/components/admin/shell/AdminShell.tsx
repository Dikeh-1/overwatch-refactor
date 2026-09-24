"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { LockKeyhole, Loader2, AlertCircle, RefreshCw, Menu } from "lucide-react";
import Logo from "@/components/ui/Logo";
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
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-lg p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Overwatch Admin
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === "pt" ? "Acesso restrito a operadores autorizados" : "Authorized operational access"}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "pt" ? "Palavra-passe" : "Password"}
              </label>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                />
                <LockKeyhole size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{lang === "pt" ? "A verificar..." : "Verifying..."}</span>
                </>
              ) : (
                <span>{lang === "pt" ? "Entrar" : "Sign In"}</span>
              )}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleToggleLang}
              className="text-[0.7rem] text-slate-500 hover:text-slate-800 transition-colors"
            >
              {lang === "pt" ? "Switch to English" : "Mudar para Português"}
            </button>
          </div>
        </div>
      </div>
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
