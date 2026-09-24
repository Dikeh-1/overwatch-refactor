"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import {
  LockKeyhole,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  UserX,
  X,
  Sparkles,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { AdminSidebar, AdminView } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ApplicationsView } from "@/components/admin/ApplicationsView";
import { ScheduleView } from "@/components/admin/ScheduleView";
import { InvitationsView } from "@/components/admin/InvitationsView";
import { RolesView } from "@/components/admin/RolesView";
import { CandidateDrawer } from "@/components/admin/CandidateDrawer";
import GateCheckInModal from "@/components/admin/GateCheckInModal";
import { Application, Role, DEFAULT_TEST_SLOTS } from "@/lib/careers";
import "./admin.css";

export default function AdminPage() {
  // --- CORE STATE ---
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [auth, setAuth] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [currentView, setCurrentView] = useState<AdminView>("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Slots & Quotas
  const [broadcastSlots, setBroadcastSlots] = useState<string[]>([...DEFAULT_TEST_SLOTS]);
  const [slotQuota, setSlotQuota] = useState<number>(15);

  // Selected Candidate for Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Modals
  const [gateScannerOpen, setGateScannerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [disqualifyModal, setDisqualifyModal] = useState<{ open: boolean; candidates: Application[] }>({
    open: false,
    candidates: [],
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; candidate: Application | null }>({
    open: false,
    candidate: null,
  });

  // Heartbeat & Online Presence
  const [onlineCount, setOnlineCount] = useState(1);

  // Real-time Event Toast
  const [liveToast, setLiveToast] = useState<{ title: string; subtitle: string } | null>(null);
  const prevAppIds = useRef<Set<string> | null>(null);
  const prevBookedMap = useRef<Map<string, string> | null>(null);

  // Mozambique Clock & Greeting
  const [mozambiqueTime, setMozambiqueTime] = useState("");
  const [greetingText, setGreetingText] = useState("");

  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("overwatch_admin_lang") as "pt" | "en" | null;
    if (saved === "pt" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const handleToggleLang = () => {
    const next = lang === "pt" ? "en" : "pt";
    setLang(next);
    localStorage.setItem("overwatch_admin_lang", next);
  };

  // Clock & Greeting update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("pt-MZ", {
        timeZone: "Africa/Maputo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setMozambiqueTime(timeStr);

      const h = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Maputo" })).getHours();
      if (h >= 5 && h < 12) setGreetingText(lang === "pt" ? "Bom dia" : "Good morning");
      else if (h >= 12 && h < 18) setGreetingText(lang === "pt" ? "Boa tarde" : "Good afternoon");
      else setGreetingText(lang === "pt" ? "Boa noite" : "Good evening");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  // Session Check
  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuth(Boolean(d.authenticated)))
      .catch(() => setAuth(false));
  }, []);

  // Data Loading
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/careers?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.status === 401) {
        setAuth(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Could not retrieve careers database.");
      }

      const data = await res.json();
      const newApps: Application[] = data.applications || [];
      const newRoles: Role[] = data.roles || [];

      // Real-time Detection
      if (prevAppIds.current !== null) {
        const brandNew = newApps.filter((a) => !prevAppIds.current!.has(a.id));
        if (brandNew.length > 0) {
          setLiveToast({
            title: lang === "pt" ? "Nova Candidatura Recebida!" : "New Application Received!",
            subtitle: `${brandNew[0].name} (${brandNew[0].role})`,
          });
        } else if (prevBookedMap.current !== null) {
          const newlyBooked = newApps.find(
            (a) => a.testSlot && prevBookedMap.current!.get(a.id) !== a.testSlot
          );
          if (newlyBooked) {
            setLiveToast({
              title: lang === "pt" ? "Novo Agendamento Confirmado!" : "New Test Booking!",
              subtitle: `${newlyBooked.name} — ${newlyBooked.testSlot}`,
            });
          }
        }
      }

      prevAppIds.current = new Set(newApps.map((a) => a.id));
      const nextBooked = new Map<string, string>();
      newApps.forEach((a) => {
        if (a.testSlot) nextBooked.set(a.id, a.testSlot);
      });
      prevBookedMap.current = nextBooked;

      setApplications(newApps);
      setRoles(newRoles);

      // Keep selectedCandidate synced if open
      if (selectedCandidate) {
        const fresh = newApps.find((a) => a.id === selectedCandidate.id);
        if (fresh) setSelectedCandidate(fresh);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load data.");
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [lang, selectedCandidate]);

  // Load Test Slots & Quotas
  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch("/api/admin/careers/test-slots");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.slots) && data.slots.length > 0) {
            setBroadcastSlots(data.slots);
          }
          if (typeof data.quota === "number" && data.quota > 0) {
            setSlotQuota(data.quota);
          }
        }
      } catch (err) {
        console.error("Failed to load test slots config:", err);
      }
    }
    if (auth) {
      loadSlots();
    }
  }, [auth]);

  // Polling loop (every 4s when tab is active)
  useEffect(() => {
    if (!auth) return;
    loadData(false);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadData(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [auth, loadData]);

  // Presence Heartbeat
  useEffect(() => {
    if (!auth) return;
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/admin/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: "admin_user", name: "Admin" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.onlineCount === "number") {
            setOnlineCount(Math.max(1, data.onlineCount));
          }
        }
      } catch {
        // silent
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(interval);
  }, [auth]);

  // Auto-dismiss live toast
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 5000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // --- ACTIONS ---

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
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
      if (!res.ok) throw new Error(data.error || "Invalid password");
      setAuth(true);
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setAuth(false);
  };

  const handleCandidateStatusChange = async (id: string, newStatus: string) => {
    setStatusUpdating(true);
    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
    );
    if (selectedCandidate && selectedCandidate.id === id) {
      setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus as any } : null));
    }

    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "status", id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update status");
      await loadData();
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleBulkStatusChange = async (ids: string[], newStatus: string) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "bulk_status", ids, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update batch status");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update batch status");
    }
  };

  const handleToggleAttendance = async (candidateId: string, attended: boolean) => {
    try {
      const res = await fetch("/api/careers/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: candidateId,
          action: attended ? "check_in" : "mark_absent",
          force: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to update attendance");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update attendance");
    }
  };

  const handleDispatchAllGatePasses = async () => {
    const confirm = window.confirm(
      t(
        "Send official gate access passes with QR codes to scheduled candidates for upcoming sessions?",
        "Enviar passes de acesso ao portão com código QR para os candidatos agendados?"
      )
    );
    if (!confirm) return;

    try {
      const res = await fetch("/api/admin/careers/dispatch-gate-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch passes");
      alert(
        t(
          `Gate passes dispatched: ${data.count || 0} emails sent successfully.`,
          `Passes enviados: ${data.count || 0} emails disparados com sucesso.`
        )
      );
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error dispatching gate passes");
    }
  };

  const handleSaveSlotsConfig = async (slots: string[], quota: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/careers/test-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, quota }),
      });
      if (!res.ok) throw new Error("Failed to save slots");
      const data = await res.json();
      if (Array.isArray(data.slots)) setBroadcastSlots(data.slots);
      if (typeof data.quota === "number") setSlotQuota(data.quota);
      return true;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save slots");
      return false;
    }
  };

  const handleToggleRole = async (roleId: string, open: boolean) => {
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "role", id: roleId, open }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update role");
    }
  };

  const handleExecuteDisqualify = async (candidates: Application[]) => {
    try {
      const ids = candidates.map((c) => c.id);
      const res = await fetch("/api/admin/careers/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, sendEmail: true }),
      });
      if (!res.ok) throw new Error("Disqualification failed");
      setDisqualifyModal({ open: false, candidates: [] });
      if (selectedCandidate && ids.includes(selectedCandidate.id)) {
        setSelectedCandidate(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to disqualify");
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteModal.candidate) return;
    try {
      const res = await fetch("/api/admin/careers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [deleteModal.candidate.id] }),
      });
      if (!res.ok) throw new Error("Delete failed");
      if (selectedCandidate && selectedCandidate.id === deleteModal.candidate.id) {
        setSelectedCandidate(null);
      }
      setDeleteModal({ open: false, candidate: null });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  // Badge Counts for Sidebar
  const sidebarCounts = useMemo(() => {
    return {
      totalApplications: applications.length,
      confirmedSchedule: applications.filter(
        (a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected"
      ).length,
      shortlistedUninvited: applications.filter(
        (a) => a.status === "shortlisted" && !a.testSlot
      ).length,
    };
  }, [applications]);

  // --- LOGIN SCREEN ---
  if (auth === false) {
    return (
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0d121f] border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {lang === "pt" ? "Portal Administrativo" : "Admin Portal"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {lang === "pt"
                ? "Gestão Segura de Candidaturas & Operações"
                : "Secure Applicant Pipeline & Operations"}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="relative z-10 space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {lang === "pt" ? "Palavra-passe de Acesso" : "Access Password"}
              </label>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500/50"
                />
                <LockKeyhole
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-black font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{lang === "pt" ? "A verificar..." : "Verifying..."}</span>
                </>
              ) : (
                <span>{lang === "pt" ? "Entrar no Sistema" : "Access Dashboard"}</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <button
              type="button"
              onClick={handleToggleLang}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {lang === "pt" ? "English version" : "Versão em Português"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTH LOADING STATE ---
  if (auth === null) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sky-400" />
      </div>
    );
  }

  // --- MAIN DASHBOARD LAYOUT ---
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        lang={lang}
        onToggleLang={handleToggleLang}
        onLogout={handleLogout}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        roles={roles}
        activeRole={activeRole}
        onSelectRole={(r) => setActiveRole(r)}
        counts={sidebarCounts}
        onlineCount={onlineCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <AdminHeader
          currentView={currentView}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          lang={lang}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          isRefreshing={isRefreshing}
          onRefresh={() => loadData(true)}
          activeRole={activeRole}
          roles={roles}
          mozambiqueTime={mozambiqueTime}
          greetingText={greetingText}
        />

        {/* View Routing */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {currentView === "applications" && (
            <ApplicationsView
              applications={applications}
              lang={lang}
              searchQuery={searchQuery}
              onSelectCandidate={(c) => setSelectedCandidate(c)}
              onStatusChange={handleCandidateStatusChange}
              onBulkStatusChange={handleBulkStatusChange}
              onOpenBulkInvite={() => setCurrentView("invitations")}
              onOpenDisqualifyModal={(cands) => setDisqualifyModal({ open: true, candidates: cands })}
              onDeleteCandidate={(cand) => setDeleteModal({ open: true, candidate: cand })}
              activeRole={activeRole}
            />
          )}

          {currentView === "schedule" && (
            <ScheduleView
              applications={applications}
              lang={lang}
              searchQuery={searchQuery}
              onSelectCandidate={(c) => setSelectedCandidate(c)}
              onToggleAttendance={handleToggleAttendance}
              onOpenGateScanner={() => setGateScannerOpen(true)}
              onDispatchGatePasses={handleDispatchAllGatePasses}
              slotQuota={slotQuota}
              broadcastSlots={broadcastSlots}
            />
          )}

          {currentView === "invitations" && (
            <InvitationsView
              applications={applications}
              lang={lang}
              activeRole={activeRole}
              broadcastSlots={broadcastSlots}
              slotQuota={slotQuota}
              onSaveSlots={handleSaveSlotsConfig}
              onRefresh={() => loadData(true)}
              searchQuery={searchQuery}
            />
          )}

          {currentView === "roles" && (
            <RolesView
              roles={roles}
              applications={applications}
              lang={lang}
              onToggleRole={handleToggleRole}
              onSelectRoleFilter={(roleId) => {
                setActiveRole(roleId);
                setCurrentView("applications");
              }}
            />
          )}
        </main>
      </div>

      {/* Candidate Slide-over Detail Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        lang={lang}
        onStatusChange={handleCandidateStatusChange}
        onDisqualify={(c) => setDisqualifyModal({ open: true, candidates: [c] })}
        onDelete={(c) => setDeleteModal({ open: true, candidate: c })}
        statusUpdating={statusUpdating}
      />

      {/* Gate QR Scanner Modal */}
      <GateCheckInModal
        isOpen={gateScannerOpen}
        onClose={() => setGateScannerOpen(false)}
        onCheckInSuccess={(cand) => {
          loadData(true);
        }}
        lang={lang}
      />

      {/* Disqualification Confirmation Modal */}
      {disqualifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d121f] border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <UserX size={24} />
              <h3 className="text-base font-bold text-white">
                {t("Confirm Disqualification", "Confirmar Desclassificação")}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t(
                `Are you sure you want to disqualify ${disqualifyModal.candidates.length} candidate(s)? This will archive their file and cancel any booked test session. An official non-selection notification will be dispatched.`,
                `Tem a certeza de que deseja desclassificar ${disqualifyModal.candidates.length} candidato(s)? O processo será arquivado e eventuais turnos agendados serão cancelados.`
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisqualifyModal({ open: false, candidates: [] })}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDisqualify(disqualifyModal.candidates)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {t("Confirm & Disqualify", "Confirmar Desclassificação")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d121f] border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <Trash2 size={24} />
              <h3 className="text-base font-bold text-white">
                {t("Permanently Delete Candidate", "Eliminar Candidatura Permanentemente")}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t(
                `Permanently delete record for "${deleteModal.candidate.name}"? This action is irreversible and will remove their CV and history.`,
                `Pretende eliminar definitivamente a candidatura de "${deleteModal.candidate.name}"? Esta ação é irreversível.`
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, candidate: null })}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {t("Delete Permanently", "Eliminar Definitivamente")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Event Toast */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#0d121f]/95 border border-sky-500/40 text-white rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{liveToast.title}</div>
            <div className="text-[0.7rem] text-slate-300 truncate max-w-[240px]">{liveToast.subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
