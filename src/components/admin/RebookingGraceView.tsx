"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  RotateCcw,
  Search,
  Send,
  Copy,
  Check,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  Sparkles,
  Users,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { Application } from "@/lib/careers";
import { formatSlotDisplay } from "@/lib/careers";
import { siteContact } from "@/lib/site-config";

interface RebookingGraceViewProps {
  applications: Application[];
  lang: "en" | "pt";
  t: (en: string, pt: string) => string;
  onRefresh: () => Promise<void>;
}

function isPastDateSlot(slot: string): boolean {
  if (!slot) return false;
  return (
    slot.includes("16 de Setembro") ||
    slot.includes("17 de Setembro") ||
    slot.includes("18 de Setembro")
  );
}

export default function RebookingGraceView({
  applications,
  lang,
  t,
  onRefresh,
}: RebookingGraceViewProps) {
  const isPt = lang === "pt";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "missed" | "active_grace" | "rebooked" | "all_booked" | "all"
  >("missed");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewCandidate, setPreviewCandidate] = useState<Application | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss notification after 5s
  useEffect(() => {
    if (statusFeedback) {
      const timer = setTimeout(() => setStatusFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [statusFeedback]);

  // Exclude archived/rejected/Inocio from general lists
  const validApplications = useMemo(() => {
    return applications.filter((a) => {
      if (a.status === "archived" || a.status === "rejected") return false;
      if (
        a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
        a.email?.toLowerCase() === "inociowilson7@gmail.com"
      ) {
        return false;
      }
      return true;
    });
  }, [applications]);

  // Candidates who missed their past scheduled test (and haven't used rebooking yet)
  const missedCandidates = useMemo(() => {
    return validApplications.filter((a) => {
      const wasPast = a.testSlot && isPastDateSlot(a.testSlot);
      const notAttended = !a.attendedAt;
      const graceNotUsed = !a.rebookingGrace?.usedAt;
      return (wasPast && notAttended) || (Boolean(a.rebookingGrace) && graceNotUsed);
    });
  }, [validApplications]);

  // Candidates currently with active OTL issued but pending booking
  const activeGraceCandidates = useMemo(() => {
    return validApplications.filter(
      (a) => a.rebookingGrace && !a.rebookingGrace.usedAt
    );
  }, [validApplications]);

  // Candidates who successfully re-booked through grace OTL
  const rebookedCandidates = useMemo(() => {
    return validApplications.filter(
      (a) => a.rebookingGrace && Boolean(a.rebookingGrace.usedAt)
    );
  }, [validApplications]);

  // All candidates with any testSlot booked
  const allBookedCandidates = useMemo(() => {
    return validApplications.filter((a) => Boolean(a.testSlot));
  }, [validApplications]);

  // Base list depending on activeTab
  const tabCandidates = useMemo(() => {
    switch (activeTab) {
      case "missed":
        return missedCandidates;
      case "active_grace":
        return activeGraceCandidates;
      case "rebooked":
        return rebookedCandidates;
      case "all_booked":
        return allBookedCandidates;
      case "all":
        return validApplications;
      default:
        return missedCandidates;
    }
  }, [
    activeTab,
    missedCandidates,
    activeGraceCandidates,
    rebookedCandidates,
    allBookedCandidates,
    validApplications,
  ]);

  // Filter tab candidates by manual search query
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return tabCandidates;
    const q = searchQuery.toLowerCase().trim();
    return tabCandidates.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const emailMatch = c.email?.toLowerCase().includes(q);
      const phoneMatch = c.whatsapp?.toLowerCase().includes(q);
      const slotMatch = c.testSlot?.toLowerCase().includes(q);
      const prevSlotMatch = c.previousTestSlot?.toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch || slotMatch || prevSlotMatch;
    });
  }, [tabCandidates, searchQuery]);

  // Multi-select handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map((c) => c.id));
    }
  };

  // Build origin-based OTL link
  const getOtlUrl = (candidate: Application, token?: string) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.overwatchmoz.com";
    const tok = token || candidate.rebookingGrace?.token;
    return tok
      ? `${origin}/pt/careers/test-invite/${candidate.id}?otl=${encodeURIComponent(tok)}`
      : `${origin}/pt/careers/test-invite/${candidate.id}`;
  };

  // Copy OTL link to clipboard
  const handleCopyLink = async (candidate: Application) => {
    let url = getOtlUrl(candidate);

    // If candidate doesn't have an active token yet, grant one first silently
    if (!candidate.rebookingGrace?.token) {
      try {
        setBusyCandidateId(candidate.id);
        const res = await fetch("/api/admin/careers/rebooking-grace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "grant_single",
            candidateId: candidate.id,
            sendEmail: false,
            reason: "Link gerado manualmente para envio directo",
          }),
        });
        const data = await res.json();
        if (data.success && data.otlUrl) {
          url = data.otlUrl;
          await onRefresh();
        }
      } catch (err) {
        console.error("Error generating token:", err);
      } finally {
        setBusyCandidateId(null);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(candidate.id);
      setTimeout(() => setCopiedId(null), 3000);
      setStatusFeedback({
        type: "success",
        message: t(
          `Copied personal OTL link for ${candidate.name} to clipboard!`,
          `Link OTL de ${candidate.name} copiado para a área de transferência!`
        ),
      });
    } catch {
      setStatusFeedback({
        type: "error",
        message: t("Failed to copy to clipboard.", "Falha ao copiar para a área de transferência."),
      });
    }
  };

  // Open pre-drafted WhatsApp chat with candidate
  const handleOpenWhatsApp = (candidate: Application) => {
    const url = getOtlUrl(candidate);
    const phoneDigits = candidate.whatsapp.replace(/\D/g, "");
    const msg = isPt
      ? `Olá ${candidate.name}, daqui é dos Recursos Humanos da Overwatch Moçambique. Em virtude das dificuldades reportadas na localização das nossas instalações ou deslocação para o seu teste presencial anterior, foi-lhe concedida uma autorização excepcional para reagendar o seu teste para uma das vagas abertas na próxima semana.\n\nAceda ao seu link de uso único para escolher a sua nova data:\n${url}\n\nEndereço exacto: Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.\nQualquer dúvida estamos à disposição.`
      : `Hello ${candidate.name}, this is Overwatch Mozambique HR. Due to reported transit or building location difficulties on your previous test date, an exceptional rebooking window has been granted for next week's open sessions.\n\nSelect your new date using your single-use link:\n${url}\n\nExact Address: Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.`;

    window.open(
      `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  // Grant Grace & Send Official Email (Single)
  const handleGrantSingle = async (candidate: Application) => {
    try {
      setBusyCandidateId(candidate.id);
      const res = await fetch("/api/admin/careers/rebooking-grace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_single",
          candidateId: candidate.id,
          sendEmail: true,
          reason: "Dificuldade de localização do edifício / constrangimento de deslocação",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to grant grace.");
      }

      await onRefresh();
      setStatusFeedback({
        type: "success",
        message: data.emailSent
          ? t(
              `✓ Rebooking Grace & OTL email successfully sent to ${candidate.name} (${candidate.email})!`,
              `✓ Concessão de Graça e email OTL enviados com sucesso para ${candidate.name} (${candidate.email})!`
            )
          : t(
              `✓ OTL generated for ${candidate.name} (email queued/mocked).`,
              `✓ OTL gerado para ${candidate.name}.`
            ),
      });
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message || "Error granting rebooking grace.",
      });
    } finally {
      setBusyCandidateId(null);
    }
  };

  // Bulk Grant Grace to all selected candidates
  const handleBulkGrant = async () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = isPt
      ? `Tem a certeza de que deseja conceder o Período de Graça e enviar o email com link OTL a ${selectedIds.length} candidatos seleccionados?`
      : `Are you sure you want to grant Rebooking Grace and dispatch OTL emails to ${selectedIds.length} selected candidates?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setBulkBusy(true);
      const res = await fetch("/api/admin/careers/rebooking-grace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_bulk",
          candidateIds: selectedIds,
          sendEmail: true,
          reason: "Concessão excepcional em lote - Período de Graça",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk action failed.");
      }

      await onRefresh();
      setSelectedIds([]);
      setStatusFeedback({
        type: "success",
        message: t(
          `✓ Rebooking Grace & OTL emails dispatched to ${data.processed} of ${data.total} candidates!`,
          `✓ Emails com link OTL de Período de Graça enviados com sucesso para ${data.processed} de ${data.total} candidatos!`
        ),
      });
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message || "Failed to process bulk grant.",
      });
    } finally {
      setBulkBusy(false);
    }
  };

  // Revoke grace
  const handleRevokeGrace = async (candidate: Application) => {
    const confirmRevoke = isPt
      ? `Revogar a autorização de reagendamento para ${candidate.name}?`
      : `Revoke rebooking grace authorization for ${candidate.name}?`;
    if (!window.confirm(confirmRevoke)) return;

    try {
      setBusyCandidateId(candidate.id);
      const res = await fetch("/api/admin/careers/rebooking-grace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          candidateId: candidate.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke.");
      }
      await onRefresh();
      setStatusFeedback({
        type: "success",
        message: t(
          `Grace rebooking revoked for ${candidate.name}.`,
          `Autorização de reagendamento revogada para ${candidate.name}.`
        ),
      });
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message || "Error revoking grace.",
      });
    } finally {
      setBusyCandidateId(null);
    }
  };

  return (
    <section className="space-y-5">
      {/* ─── FEEDBACK BANNER ────────────────────────────────────────── */}
      {statusFeedback && (
        <div
          className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between border shadow-lg transition-all animate-in fade-in duration-200 ${
            statusFeedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
              : "bg-red-500/15 border-red-500/35 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusFeedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span>{statusFeedback.message}</span>
          </div>
          <button
            onClick={() => setStatusFeedback(null)}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── HEADER & EXPLANATION BAR ───────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <RotateCcw size={17} />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {t(
                  "Rebooking Grace & One-Time Links (OTL)",
                  "Reagendamento Excepcional & Período de Graça (OTL)"
                )}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold uppercase">
                {t("Grace Period", "Período de Graça")}
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              {t(
                "Manage candidates who missed their scheduled selection test (due to trouble locating building N.º 1948 or transport issues). Generate tamper-proof single-use links (OTL) and dispatch official letterhead invitations allowing them to pick from remaining open dates.",
                "Gestão de candidatos que não compareceram ao teste presencial (devido a dificuldades na localização do edifício N.º 1948 ou transporte). Gere links de utilização única (OTL) e envie convocações oficiais permitindo escolher uma das datas ainda abertas."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefresh()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>{t("Refresh Roster", "Atualizar Lista")}</span>
            </button>
          </div>
        </div>

        {/* ─── METRICS STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/10">
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-300 font-bold">
              {t("Missed Sessions", "Faltaram ao Teste")}
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {missedCandidates.length}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {t("Scheduled on past dates", "Agendados para dias anteriores")}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              {t("Active Grace OTLs", "Links OTL Emitidos")}
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {activeGraceCandidates.length}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {t("Awaiting candidate choice", "A aguardar nova escolha")}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
              {t("Successfully Re-booked", "Reagendados com Sucesso")}
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {rebookedCandidates.length}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {t("OTL consumed & pass issued", "Link utilizado & novo passe emitido")}
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold">
              {t("Open Slots Target", "Turnos Abertos (Próx. Semana)")}
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              5 {t("days", "dias")}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5 font-mono">
              21 – 25 {t("Sept (10h00)", "Setembro (10h00)")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & TABS BAR ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "Search applicant by name, WhatsApp phone (+258…), or email…",
                "Pesquisar por nome do candidato, WhatsApp (+258…), ou email…"
              )}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Select-All button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0
                ? t("Deselect All", "Desmarcar Todos")
                : t("Select All Filtered", "Seleccionar Todos")}
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => {
              setActiveTab("missed");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === "missed"
                ? "bg-red-500 text-white shadow-sm"
                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{t("Missed Test (Absent)", "Faltaram ao Teste (Ausentes)")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "missed" ? "bg-black/20 text-white" : "bg-white/10 text-white/70"
              }`}
            >
              {missedCandidates.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("active_grace");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === "active_grace"
                ? "bg-amber-500 text-black font-bold shadow-sm"
                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{t("Active OTL Links", "Links OTL Emitidos")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "active_grace" ? "bg-black/20 text-black" : "bg-white/10 text-white/70"
              }`}
            >
              {activeGraceCandidates.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("rebooked");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === "rebooked"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{t("Successfully Re-booked", "Reagendados com Sucesso")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "rebooked" ? "bg-black/20 text-black" : "bg-white/10 text-white/70"
              }`}
            >
              {rebookedCandidates.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("all_booked");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === "all_booked"
                ? "bg-white/20 text-white shadow-sm"
                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{t("All Booked Candidates", "Todos os Agendados")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "all_booked" ? "bg-black/20 text-white" : "bg-white/10 text-white/70"
              }`}
            >
              {allBookedCandidates.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("all");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === "all"
                ? "bg-white/20 text-white shadow-sm"
                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{t("Entire Applicant Pool", "Toda a Base (220+)")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "all" ? "bg-black/20 text-white" : "bg-white/10 text-white/70"
              }`}
            >
              {validApplications.length}
            </span>
          </button>
        </div>
      </div>

      {/* ─── BULK ACTION FLOATING TOOLBAR ───────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 rounded-xl bg-gradient-to-r from-[#0b1329] to-[#121827] border-2 border-amber-500/40 p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-white">
              {selectedIds.length} {t("candidates selected", "candidatos seleccionados")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {t("Clear", "Limpar")}
            </button>
            <button
              onClick={handleBulkGrant}
              disabled={bulkBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {bulkBusy ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              <span>
                {t("Grant Grace & Dispatch OTL Emails", "Conceder Graça & Enviar Emails OTL")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── CANDIDATES LIST TABLE / CARDS ──────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#121827]/95 overflow-hidden shadow-sm">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/40">
              <RotateCcw size={22} />
            </div>
            <p className="text-sm font-semibold text-white">
              {t("No candidates match this filter.", "Nenhum candidato corresponde a este filtro.")}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {searchQuery
                ? t("Try searching for another name or WhatsApp number.", "Tente pesquisar por outro nome ou número de telefone.")
                : t("All candidates in this category are up to date.", "Todos os candidatos desta categoria estão atualizados.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredCandidates.length &&
                        filteredCandidates.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">{t("Candidate", "Candidato")}</th>
                  <th className="py-3 px-4">{t("Contact Info", "Contacto")}</th>
                  <th className="py-3 px-4">{t("Scheduled Slot", "Turno Agendado")}</th>
                  <th className="py-3 px-4">{t("Grace / OTL Status", "Estado da Graça / OTL")}</th>
                  <th className="py-3 px-4 text-right">{t("Actions", "Acções")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCandidates.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const isBusy = busyCandidateId === c.id;
                  const isCopied = copiedId === c.id;
                  const hasGrace = Boolean(c.rebookingGrace);
                  const isUsed = Boolean(c.rebookingGrace?.usedAt);
                  const isMissed = Boolean(c.testSlot && isPastDateSlot(c.testSlot) && !c.attendedAt);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isSelected ? "bg-amber-500/[0.07]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c.id)}
                          className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Candidate Name & Gender */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm leading-tight flex items-center gap-2">
                          <span>{c.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                              c.sex === "female"
                                ? "bg-pink-500/15 text-pink-300 border border-pink-500/25"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                            }`}
                          >
                            {c.sex === "female" ? "F" : "M"}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-0.5">
                          REF: {c.id.slice(0, 8).toUpperCase()}
                        </div>
                      </td>

                      {/* Contact Info (WhatsApp + Email) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <a
                            href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors font-mono text-[11px]"
                          >
                            <Phone size={11} />
                            <span>{c.whatsapp}</span>
                          </a>
                          <div className="flex items-center gap-1.5 text-white/50 text-[11px] truncate max-w-[220px]">
                            <Mail size={11} className="shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Slot */}
                      <td className="py-3.5 px-4">
                        {c.testSlot ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-white/90">
                              <Calendar size={12} className="text-white/40 shrink-0" />
                              <span>{formatSlotDisplay(c.testSlot.split("–")[0].trim(), lang)}</span>
                            </div>
                            {c.attendedAt ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                                <CheckCircle2 size={10} />
                                <span>{t("Attended test", "Presente no teste")}</span>
                              </span>
                            ) : isPastDateSlot(c.testSlot) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-0.5">
                                <AlertCircle size={10} />
                                <span>{t("Missed past session", "Faltou / Não compareceu")}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-sky-300 font-medium mt-0.5">
                                <Clock size={10} />
                                <span>{t("Upcoming session", "Turno agendado")}</span>
                              </span>
                            )}
                          </div>
                        ) : c.previousTestSlot ? (
                          <div>
                            <span className="text-[11px] text-white/40 line-through font-mono">
                              {c.previousTestSlot}
                            </span>
                            <div className="text-[10px] text-amber-300 font-semibold">
                              {t("Awaiting new slot choice", "A aguardar nova escolha")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/30 text-[11px]">
                            {t("Never booked", "Nunca agendou")}
                          </span>
                        )}
                      </td>

                      {/* Grace / OTL Status */}
                      <td className="py-3.5 px-4">
                        {hasGrace ? (
                          isUsed ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase">
                                <Check size={11} />
                                <span>{t("Re-booked", "Reagendado")}</span>
                              </span>
                              <div className="text-[10px] text-white/40 font-mono">
                                {new Date(c.rebookingGrace!.usedAt!).toLocaleDateString(isPt ? "pt-MZ" : "en-GB")}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] uppercase">
                                <Clock size={11} />
                                <span>{t("OTL Active · Pending", "OTL Activo · Pendente")}</span>
                              </span>
                              {c.rebookingGrace?.emailSentAt && (
                                <div className="text-[10px] text-white/40 flex items-center gap-1">
                                  <Mail size={10} />
                                  <span>{t("Email sent", "Email enviado")}</span>
                                </div>
                              )}
                            </div>
                          )
                        ) : isMissed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-bold text-[10px] uppercase">
                            {t("Needs Grace Link", "Precisa de Graça")}
                          </span>
                        ) : (
                          <span className="text-white/30 text-[11px]">
                            {t("No exception needed", "Sem excepção")}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send / Re-send Grace Email Button */}
                          <button
                            type="button"
                            onClick={() => handleGrantSingle(c)}
                            disabled={isBusy}
                            title={t("Grant Rebooking Grace & Send Email", "Conceder Graça & Enviar Email OTL")}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              hasGrace && !isUsed
                                ? "bg-white/[0.06] hover:bg-white/15 text-white/90 border border-white/10"
                                : isUsed
                                  ? "bg-white/[0.04] text-white/40 border border-white/5 cursor-not-allowed"
                                  : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow"
                            }`}
                          >
                            {isBusy ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                            <span className="hidden sm:inline">
                              {hasGrace && !isUsed
                                ? t("Re-send Email", "Reenviar Email")
                                : isUsed
                                  ? t("Completed", "Concluído")
                                  : t("Grant Grace & Email", "Conceder Graça")}
                            </span>
                          </button>

                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(c)}
                            disabled={isBusy}
                            title={t("Copy Personal OTL Link", "Copiar Link OTL Pessoal")}
                            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>

                          {/* WhatsApp Chat Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(c)}
                            title={t("Share via WhatsApp", "Partilhar via WhatsApp")}
                            className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          >
                            <Phone size={13} />
                          </button>

                          {/* Preview Email Letterhead Modal */}
                          <button
                            type="button"
                            onClick={() => setPreviewCandidate(c)}
                            title={t("Preview Letterhead Email", "Pré-visualizar Carta do Email")}
                            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Revoke Grace (if active & not used) */}
                          {hasGrace && !isUsed && (
                            <button
                              type="button"
                              onClick={() => handleRevokeGrace(c)}
                              disabled={isBusy}
                              title={t("Revoke Grace", "Revogar Graça")}
                              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── LIVE EMAIL PREVIEW MODAL ───────────────────────────────── */}
      {previewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-2xl w-full bg-[#121827] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-[#0b1329] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Eye size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("Email Preview · Authentic Letterhead", "Pré-visualização do Email · Papel Timbrado Oficial")}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {previewCandidate.name} ({previewCandidate.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCandidate(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Email Letterhead Body */}
            <div className="p-6 overflow-y-auto bg-[#f1f5f9] text-[#1e293b] font-sans">
              <div className="max-w-xl mx-auto bg-white rounded-xl border border-[#cbd5e1] shadow-md overflow-hidden text-xs leading-relaxed">
                {/* Dark Navy Letterhead */}
                <div className="bg-[#0b1329] p-4 text-white flex items-center justify-between border-b-2 border-white/15">
                  <img
                    src="/logo-white.png"
                    alt="Overwatch"
                    className="h-5 w-auto"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="font-mono text-[9px] bg-white/10 px-2 py-0.5 rounded border border-white/20 uppercase font-bold tracking-wider">
                    REF: CCO-2026/OTL-GRACA
                  </span>
                </div>

                <div className="bg-[#f8fafc] px-4 py-2 border-b border-[#e2e8f0] text-[10px] font-bold text-[#0b1329] uppercase flex justify-between">
                  <span>PERÍODO DE GRAÇA · REAGENDAMENTO DE TESTE</span>
                  <span className="text-[#64748b]">Maputo, Moçambique</span>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <h4 className="text-sm font-bold text-[#090d16]">
                    Prezada(o) {previewCandidate.name},
                  </h4>
                  <p className="text-gray-600">
                    Tomámos conhecimento de que não lhe foi possível comparecer ao seu teste técnico presencial{" "}
                    {previewCandidate.testSlot ? `agendado para ${previewCandidate.testSlot}` : "anteriormente agendado"}
                    , devido a constrangimentos de deslocação ou dificuldades na localização exacta do edifício sede da Overwatch em Maputo.
                  </p>
                  <p className="text-gray-600">
                    Reconhecendo o seu manifesto interesse e o esforço de candidatura à vaga de <strong>Operadora de CCO</strong>, a Direcção de Recursos Humanos decidiu conceder-lhe, em regime excepcional, uma <strong>oportunidade final de reagendamento (Período de Graça)</strong> para os dias de teste que ainda dispõem de vagas abertas.
                  </p>

                  {/* Formal Decision Directive Box (Executive Slate) */}
                  <div className="p-3.5 bg-[#f8fafc] border border-[#cbd5e1] border-l-4 border-l-[#0b1329] rounded">
                    <strong className="text-[#0b1329] text-[10px] block uppercase tracking-wider font-bold mb-1">
                      DELIBERAÇÃO DA DIRECÇÃO DE RECURSOS HUMANOS · CONCESSÃO EXCEPCIONAL
                    </strong>
                    <p className="text-[#334155] text-[11px] leading-relaxed m-0">
                      Nos termos deliberados pela Direcção, foi emitida uma <strong>autorização pessoal de utilização única (One-Time Link)</strong> para a sua candidatura. Esta credencial faculta o acesso exclusivo para marcação de uma nova data presencial entre as vagas ainda abertas.
                    </p>
                  </div>

                  {/* Official Location Specifications (Clean Table Block) */}
                  <div className="p-3.5 bg-white border border-[#e2e8f0] rounded">
                    <strong className="text-[#0b1329] text-[10px] block uppercase tracking-wider font-bold mb-2 pb-1 border-b border-[#e2e8f0]">
                      LOCALIZAÇÃO OFICIAL DAS INSTALAÇÕES
                    </strong>
                    <table className="w-full text-[11px] text-[#334155]">
                      <tbody>
                        <tr>
                          <td className="py-1 font-semibold text-[#64748b] w-24">Edifício:</td>
                          <td className="py-1 font-bold text-[#0f172a]">Overwatch Moçambique — Sede Operacional</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold text-[#64748b]">Endereço:</td>
                          <td className="py-1 font-bold text-[#0f172a]">Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold text-[#64748b] align-top">Referência:</td>
                          <td className="py-1 text-[#64748b]">Entre a Av. Vladimir Lenine e a Av. Salvador Allende (antes do cruzamento com a Av. Filipe Samuel Magaia).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Formal Call to Action */}
                  <div className="text-center py-2.5">
                    <div className="inline-block bg-[#0b1329] text-white px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider shadow-sm">
                      Seleccionar Nova Data de Teste &rarr;
                    </div>
                    <div className="text-[10px] text-[#64748b] mt-1.5 font-medium">
                      Credencial pessoal e intransmissível · Válida para um único acesso
                    </div>
                  </div>

                  {/* Clean Link Fallback Box */}
                  <div className="p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[10px]">
                    <div className="text-[#64748b] mb-1 font-medium">
                      Endereço seguro associado ao link de utilização única (OTL):
                    </div>
                    <div className="font-mono text-[#334155] break-all select-all bg-white p-1.5 border border-[#e2e8f0] rounded text-[9.5px]">
                      {getOtlUrl(previewCandidate)}
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-4 border-t border-[#e2e8f0] text-[10px] text-gray-500 leading-normal">
                  <strong>Overwatch Moçambique, Lda.</strong><br />
                  Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo · WhatsApp: +258 84 287 0793
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#0b1329] border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleCopyLink(previewCandidate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Copy size={13} />
                <span>{t("Copy OTL Link", "Copiar Link OTL")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewCandidate(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white"
                >
                  {t("Close", "Fechar")}
                </button>
                <button
                  onClick={async () => {
                    await handleGrantSingle(previewCandidate);
                    setPreviewCandidate(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Send size={13} />
                  <span>{t("Send This Email Now", "Enviar Este Email Agora")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
