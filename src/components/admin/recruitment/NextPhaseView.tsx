"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Award,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Check,
  X,
  FileText,
  Search,
  Filter,
  UserCheck,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  MessageCircle,
  Monitor,
  Smartphone,
  Copy,
  Edit2,
} from "lucide-react";
import { formatPhoneDisplay } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import Logo from "@/components/ui/Logo";

interface NextPhaseCandidate {
  id: string;
  seedIndex: number;
  approvedName: string;
  name: string;
  score: number;
  email: string;
  phone: string;
  isMatched: boolean;
  matchedId?: string;
  nextPhaseStatus: string;
  invitationStatus: "not_sent" | "sent" | "failed";
  invitationSentAt?: string | null;
  candidateResponse: "awaiting" | "confirmed" | "declined" | null;
  responseDate?: string | null;
  respondedAt?: string | null;
  responseOption?: string | null;
  recruitmentStage?: string;
  token?: string;
}

interface NextPhaseSummary {
  totalSelected: number;
  notSent: number;
  awaiting: number;
  confirmed: number;
  declined: number;
}

interface NextPhaseViewProps {
  lang?: "pt" | "en";
}

export const NextPhaseView: React.FC<NextPhaseViewProps> = ({ lang: propLang }) => {
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [candidates, setCandidates] = useState<NextPhaseCandidate[]>([]);
  const [summary, setSummary] = useState<NextPhaseSummary>({
    totalSelected: 15,
    notSent: 15,
    awaiting: 0,
    confirmed: 0,
    declined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<
    "all" | "not_sent" | "awaiting" | "confirmed" | "declined"
  >("all");
  const [responseFilter, setResponseFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Slide-over drawer state
  const [selectedCandidate, setSelectedCandidate] = useState<NextPhaseCandidate | null>(null);

  // Email template state
  const [emailSubject, setEmailSubject] = useState("Próxima Fase – Processo de Selecção Overwatch");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewSending, setPreviewSending] = useState(false);
  const [previewSuccessMsg, setPreviewSuccessMsg] = useState<string | null>(null);

  // Dispatch Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // Individual Candidate Email Preview Modal State
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState(false);
  const [previewCandidateIndex, setPreviewCandidateIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewLanguage, setPreviewLanguage] = useState<"pt" | "en">("pt");
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Candidate Contact Details Modal State
  const [editContactModalOpen, setEditContactModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<NextPhaseCandidate | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/careers/next-phase");
      const data = await res.json();
      if (res.ok) {
        setCandidates(data.candidates || []);
        if (data.summary) setSummary(data.summary);
      } else {
        setError(data.error || "Failed to load next phase data");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Filtered candidate list based on metric card click + dropdowns + search query
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Metric card click filter
      if (selectedMetricFilter === "not_sent") {
        if (c.invitationStatus !== "not_sent") return false;
      } else if (selectedMetricFilter === "awaiting") {
        if (!(c.invitationStatus === "sent" && c.candidateResponse === "awaiting")) return false;
      } else if (selectedMetricFilter === "confirmed") {
        if (c.candidateResponse !== "confirmed") return false;
      } else if (selectedMetricFilter === "declined") {
        if (c.candidateResponse !== "declined") return false;
      }

      // 2. Response dropdown filter
      if (responseFilter !== "all") {
        if (responseFilter === "awaiting") {
          if (!(c.invitationStatus === "sent" && c.candidateResponse === "awaiting")) return false;
        } else if (responseFilter === "confirmed") {
          if (c.candidateResponse !== "confirmed") return false;
        } else if (responseFilter === "declined") {
          if (c.candidateResponse !== "declined") return false;
        } else if (responseFilter === "not_sent") {
          if (c.invitationStatus !== "not_sent") return false;
        }
      }

      // 3. Delivery status dropdown filter
      if (deliveryFilter !== "all") {
        if (c.invitationStatus !== deliveryFilter) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const rawPhone = (c.phone || "").replace(/\D/g, "");
        const cleanQuery = q.replace(/\D/g, "");
        const matchName =
          (c.name || "").toLowerCase().includes(q) ||
          (c.approvedName || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchPhone = cleanQuery.length > 2 && rawPhone.includes(cleanQuery);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  }, [candidates, selectedMetricFilter, responseFilter, deliveryFilter, searchQuery]);

  const hasActiveFilters =
    selectedMetricFilter !== "all" ||
    responseFilter !== "all" ||
    deliveryFilter !== "all" ||
    searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setSelectedMetricFilter("all");
    setResponseFilter("all");
    setDeliveryFilter("all");
    setSearchQuery("");
  };

  const handleCardClick = (filterKey: "all" | "not_sent" | "awaiting" | "confirmed" | "declined") => {
    setSelectedMetricFilter((prev) => (prev === filterKey ? "all" : filterKey));
  };

  const activeCandidate = useMemo(() => {
    if (!candidates || candidates.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(previewCandidateIndex, candidates.length - 1));
    return candidates[safeIdx];
  }, [candidates, previewCandidateIndex]);

  const handleSendCandidatePreview = async (candidate?: NextPhaseCandidate | null) => {
    if (!previewEmail || !previewEmail.includes("@")) {
      alert(t("Please enter a valid preview email address.", "Por favor insira um email de pré-visualização válido."));
      return;
    }
    const target = candidate || activeCandidate;
    setPreviewSending(true);
    setPreviewSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          previewEmail: previewEmail.trim(),
          subject: emailSubject,
          candidateName: target?.name,
          candidateId: target?.matchedId || target?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const candNameLabel = target?.name ? ` (${target.name})` : "";
        setPreviewSuccessMsg(
          t(
            `Preview email${candNameLabel} successfully sent to ${previewEmail} at ${new Date().toLocaleTimeString(lang === "en" ? "en-US" : "pt-MZ")}.`,
            `Email de pré-visualização${candNameLabel} enviado com sucesso para ${previewEmail} às ${new Date().toLocaleTimeString("pt-MZ")}.`
          )
        );
      } else {
        alert(data.error || "Failed to send preview");
      }
    } catch (err: any) {
      alert(err.message || "Network error sending preview");
    } finally {
      setPreviewSending(false);
    }
  };

  const handleSendPreview = async () => {
    return handleSendCandidatePreview(activeCandidate);
  };

  const handleCopyLink = (url: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleOpenEditContact = (cand: NextPhaseCandidate) => {
    setEditingCandidate(cand);
    setEditName(cand.name);
    setEditEmail(cand.email || "");
    setEditPhone(cand.phone || "");
    setContactError(null);
    setEditContactModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    setSavingContact(true);
    setContactError(null);

    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contact",
          candidateId: editingCandidate.id,
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          score: editingCandidate.score,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === editingCandidate.id
              ? {
                  ...c,
                  name: editName.trim() || c.name,
                  email: editEmail.trim(),
                  phone: editPhone.trim(),
                  isMatched: true,
                  token: data.candidate?.nextPhaseToken || c.token,
                }
              : c
          )
        );
        if (selectedCandidate?.id === editingCandidate.id) {
          setSelectedCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  name: editName.trim() || prev.name,
                  email: editEmail.trim(),
                  phone: editPhone.trim(),
                  isMatched: true,
                  token: data.candidate?.nextPhaseToken || prev.token,
                }
              : null
          );
        }
        setEditContactModalOpen(false);
        loadData();
      } else {
        setContactError(data.error || "Failed to update contact details");
      }
    } catch (err: any) {
      setContactError(err.message || "Network error updating contact");
    } finally {
      setSavingContact(false);
    }
  };

  const handleExecuteDispatch = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispatch",
          subject: emailSubject,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDispatchResult({
          sentCount: data.sentCount,
          failedCount: data.failedCount,
        });
        setConfirmModalOpen(false);
        loadData();
      } else {
        alert(data.error || "Dispatch failed");
      }
    } catch (err: any) {
      alert(err.message || "Network error during dispatch");
    } finally {
      setDispatching(false);
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === "en" ? "en-GB" : "pt-MZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t("Next Phase Candidate Roster", "Próxima Fase – Gestão de Candidatas")}
            </h1>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Operadora de CCO • Recruitment 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Management approved cohort of 15 candidates moving forward to practical training consideration",
              "Turma de 15 candidatas aprovadas pela administração para consideração na fase de formação"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (previewCandidateIndex >= candidates.length) setPreviewCandidateIndex(0);
              setEmailPreviewModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Eye size={13} className="text-sky-600" />
            <span>{t("Preview Candidate Emails (15)", "Pré-visualizar Emails das Candidatas (15)")}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmModalOpen(true)}
            disabled={summary.notSent === 0}
            className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send size={13} />
            <span>
              {t(`Dispatch Invitations (${summary.notSent})`, `Disparar Convocatórias (${summary.notSent})`)}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Operational KPI Summary Bar - Clickable to filter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[0.7rem] text-slate-500 px-0.5">
          <span>{t("Filter roster by clicking metric card:", "Filtre a lista clicando nos cartões de métrica:")}</span>
          {selectedMetricFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedMetricFilter("all")}
              className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer underline"
            >
              {t("Reset Metric Filter", "Repor Filtro de Métricas")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* 1. All Selected */}
          <button
            type="button"
            onClick={() => handleCardClick("all")}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
              selectedMetricFilter === "all"
                ? "bg-sky-50/50 border-sky-500 ring-2 ring-sky-200 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block">
                {t("Total Approved", "Total Aprovadas")}
              </span>
              {selectedMetricFilter === "all" && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {summary.totalSelected}
            </div>
            <div className="text-[0.65rem] text-slate-400 mt-0.5">
              {t("Approved cohort", "Turma aprovada")}
            </div>
          </button>

          {/* 2. Not Dispatched */}
          <button
            type="button"
            onClick={() => handleCardClick("not_sent")}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
              selectedMetricFilter === "not_sent"
                ? "bg-slate-100 border-slate-500 ring-2 ring-slate-300 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block">
                {t("Not Dispatched", "Não Enviadas")}
              </span>
              {selectedMetricFilter === "not_sent" && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-slate-700 mt-1">
              {summary.notSent}
            </div>
            <div className="text-[0.65rem] text-slate-400 mt-0.5">
              {t("Pending dispatch", "Pendente de envio")}
            </div>
          </button>

          {/* 3. Awaiting Response */}
          <button
            type="button"
            onClick={() => handleCardClick("awaiting")}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
              selectedMetricFilter === "awaiting"
                ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-200 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700 block">
                {t("Awaiting Response", "Aguardando Resposta")}
              </span>
              {selectedMetricFilter === "awaiting" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              {summary.awaiting}
            </div>
            <div className="text-[0.65rem] text-amber-600/80 mt-0.5">
              {t("Sent, awaiting decision", "Enviado, a aguardar")}
            </div>
          </button>

          {/* 4. Confirmed Interest */}
          <button
            type="button"
            onClick={() => handleCardClick("confirmed")}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
              selectedMetricFilter === "confirmed"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700 block">
                {t("Confirmed Interest (YES)", "Confirmaram SIM")}
              </span>
              {selectedMetricFilter === "confirmed" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {summary.confirmed}
            </div>
            <div className="text-[0.65rem] text-emerald-600/80 mt-0.5">
              {t("Accepted conditions", "Condições aceites")}
            </div>
          </button>

          {/* 5. Declined */}
          <button
            type="button"
            onClick={() => handleCardClick("declined")}
            className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
              selectedMetricFilter === "declined"
                ? "bg-rose-50/70 border-rose-400 ring-2 ring-rose-200 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block">
                {t("Declined (NO)", "Recusaram NÃO")}
              </span>
              {selectedMetricFilter === "declined" && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-slate-600 mt-1">
              {summary.declined}
            </div>
            <div className="text-[0.65rem] text-slate-400 mt-0.5">
              {t("Declined conditions", "Condições recusadas")}
            </div>
          </button>
        </div>
      </div>

      {/* Two-step Preview & Testing Tool */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Mail size={14} className="text-sky-600" />
            <span>{t("Send Sample Preview to Admin", "Enviar Pré-visualização de Teste")}</span>
          </h3>
          <p className="text-[0.7rem] text-slate-500">
            {t(
              "Review the exact email layout and legal conditions before executing candidate dispatch.",
              "Valide a apresentação do email e termos antes de enviar às candidatas."
            )}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPreview();
          }}
          autoComplete="off"
          className="flex items-center gap-2 flex-1 max-w-md"
        >
          <input
            type="email"
            name="overwatch_admin_preview_recipient"
            id="overwatch_admin_preview_recipient"
            autoComplete="off"
            spellCheck={false}
            placeholder="admin@overwatch.co.mz"
            value={previewEmail}
            onChange={(e) => setPreviewEmail(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={previewSending}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {previewSending ? t("Sending...", "A enviar...") : t("Send Sample", "Enviar Amostra")}
          </button>
        </form>
      </div>

      {previewSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{previewSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px] max-w-xl">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            autoComplete="off"
            className="relative flex-1"
          >
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              name="candidate_search_filter_query"
              id="candidate_search_filter_query"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "Search by candidate name, email or phone...",
                "Pesquisar por nome, email ou telefone..."
              )}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 [::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={t("Clear search", "Limpar pesquisa")}
              >
                <X size={13} />
              </button>
            )}
          </form>

          {/* Response Dropdown */}
          <select
            value={responseFilter}
            onChange={(e) => setResponseFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">{t("All Responses", "Todas as Respostas")}</option>
            <option value="awaiting">{t("Awaiting Response", "Aguardando Resposta")}</option>
            <option value="confirmed">{t("Confirmed (YES)", "Confirmou (SIM)")}</option>
            <option value="declined">{t("Declined (NO)", "Recusou (NÃO)")}</option>
            <option value="not_sent">{t("Not Sent Yet", "Não Enviado")}</option>
          </select>

          {/* Delivery Status Dropdown */}
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">{t("All Delivery Statuses", "Todos os Estados")}</option>
            <option value="sent">{t("Sent", "Enviado")}</option>
            <option value="not_sent">{t("Not Sent", "Não Enviado")}</option>
            <option value="failed">{t("Failed", "Falhou")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500">
            {t(
              `Showing ${filteredCandidates.length} of ${candidates.length} candidates`,
              `A exibir ${filteredCandidates.length} de ${candidates.length} candidatas`
            )}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X size={12} />
              <span>{t("Clear Filters", "Limpar Filtros")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Approved 15 Candidates Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t("Approved Candidate Roster (15)", "Lista de Candidatas Aprovadas (15)")}
            </h2>
            {selectedMetricFilter !== "all" && (
              <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-sky-100 text-sky-800">
                {selectedMetricFilter === "not_sent" && t("Filter: Not Dispatched", "Filtro: Não Enviadas")}
                {selectedMetricFilter === "awaiting" && t("Filter: Awaiting Response", "Filtro: Aguardando Resposta")}
                {selectedMetricFilter === "confirmed" && t("Filter: Confirmed (YES)", "Filtro: Confirmou SIM")}
                {selectedMetricFilter === "declined" && t("Filter: Declined (NO)", "Filtro: Recusou NÃO")}
              </span>
            )}
          </div>
          <span className="text-[0.7rem] text-slate-400">
            {t("Ranked by Written Test Score (≥ 80%)", "Ordenadas por Nota no Teste Escrito (≥ 80%)")}
          </span>
        </div>

        <div className="overflow-x-auto admin-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="w-10 px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">{t("Candidate", "Candidata")}</th>
                <th className="px-4 py-2.5">{t("Score", "Pontuação")}</th>
                <th className="px-4 py-2.5">{t("Contact", "Contacto")}</th>
                <th className="px-4 py-2.5">{t("Delivery Status", "Estado do Envio")}</th>
                <th className="px-4 py-2.5">{t("Candidate Response", "Resposta da Candidata")}</th>
                <th className="px-4 py-2.5">{t("Responded At", "Data da Resposta")}</th>
                <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    {t(
                      "No candidates match the selected filters.",
                      "Nenhuma candidata encontrada com os filtros selecionados."
                    )}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const hasSent = cand.invitationStatus === "sent";
                  const isConfirmed = cand.candidateResponse === "confirmed";
                  const isDeclined = cand.candidateResponse === "declined";
                  const isAwaiting = hasSent && cand.candidateResponse === "awaiting";
                  const rawPhone = (cand.phone || "").replace(/\D/g, "");

                  return (
                    <tr
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        selectedCandidate?.id === cand.id ? "bg-sky-50/40" : ""
                      }`}
                    >
                      {/* Seed Rank */}
                      <td className="px-4 py-3 font-mono text-slate-400 font-semibold text-[0.75rem]">
                        {cand.seedIndex}
                      </td>

                      {/* Candidate Name & Email */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{cand.name}</span>
                          {cand.isMatched && (
                            <span title={t("Linked to live application record", "Ligada ao registo da candidatura")}>
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[0.7rem] text-slate-400 truncate max-w-[220px]">
                          {cand.email || t("No email on file", "Sem email registado")}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[0.75rem]">
                          {cand.score}%
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 font-mono text-[0.75rem] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatPhoneDisplay(cand.phone) || "—"}</span>
                          {rawPhone && (
                            <a
                              href={`https://wa.me/${rawPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={t("Message via WhatsApp", "Enviar mensagem via WhatsApp")}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {cand.invitationStatus === "sent" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t("SENT", "ENVIADO")}
                          </span>
                        ) : cand.invitationStatus === "failed" ? (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-red-50 text-red-700 border border-red-200">
                            {t("FAILED", "FALHOU")}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            {t("NOT SENT", "NÃO ENVIADO")}
                          </span>
                        )}
                      </td>

                      {/* Candidate Response */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isConfirmed ? (
                          <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <Check size={11} className="stroke-[3]" />
                            <span>{t("Confirmed YES", "Confirmou SIM")}</span>
                          </span>
                        ) : isDeclined ? (
                          <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                            <X size={11} className="stroke-[3]" />
                            <span>{t("Declined NO", "Recusou NÃO")}</span>
                          </span>
                        ) : isAwaiting ? (
                          <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <Clock size={11} />
                            <span>{t("Awaiting Response", "Aguardando")}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Responded At */}
                      <td className="px-4 py-3 font-mono text-[0.72rem] text-slate-600 whitespace-nowrap">
                        {formatTimestamp(cand.respondedAt || cand.responseDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const idx = candidates.findIndex((c) => c.id === cand.id);
                              setPreviewCandidateIndex(idx >= 0 ? idx : 0);
                              setEmailPreviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title={t("Preview this candidate's personalized email", "Pré-visualizar email personalizado desta candidata")}
                          >
                            <Eye size={12} className="text-sky-600" />
                            <span>{t("Preview Email", "Pré-visualizar")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(cand)}
                            className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          >
                            {t("View Details", "Ver Detalhes")}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditContact(cand)}
                            className={`px-2 py-1 rounded border text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              !cand.email
                                ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                                : "border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                            title={t("Edit or Add Contact Details", "Editar ou Adicionar Contactos")}
                          >
                            <Edit2 size={11} className={!cand.email ? "text-amber-600" : "text-slate-500"} />
                            <span>{!cand.email ? t("Add Email", "Add Email") : t("Edit", "Editar")}</span>
                          </button>

                          {cand.matchedId && (
                            <Link
                              href={`/admin/recruitment/candidates/${cand.matchedId}`}
                              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                              title={t("Open full candidate profile", "Abrir perfil completo")}
                            >
                              <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Detail Slide-Over Panel */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedCandidate(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
              {/* Slide-over Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("Candidate Next Phase Audit", "Auditoria de Candidata – Próxima Fase")}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded font-mono text-[0.65rem] font-bold bg-slate-200 text-slate-700">
                      #{selectedCandidate.seedIndex}
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-slate-500 mt-0.5">
                    {selectedCandidate.approvedName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Slide-over Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 admin-scrollbar text-xs">
                {/* 1. Candidate Overview */}
                <div className="space-y-3">
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    {t("Candidate Summary", "Resumo da Candidata")}
                  </h4>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Full Name:", "Nome Completo:")}</span>
                      <strong className="text-slate-900 font-semibold text-right">
                        {selectedCandidate.name}
                      </strong>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Written Test Score:", "Nota do Teste Escrito:")}</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 font-mono font-bold">
                          {selectedCandidate.score}%
                        </strong>
                        <span className="px-1.5 py-0.2 rounded text-[0.6rem] font-bold bg-emerald-100 text-emerald-800">
                          {t("PASSED ≥ 80%", "APROVADO ≥ 80%")}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Email:", "Email:")}</span>
                      <a
                        href={`mailto:${selectedCandidate.email}`}
                        className="text-sky-700 hover:underline font-mono text-[0.75rem]"
                      >
                        {selectedCandidate.email || "—"}
                      </a>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("WhatsApp / Phone:", "WhatsApp / Telefone:")}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800">
                          {formatPhoneDisplay(selectedCandidate.phone) || "—"}
                        </span>
                        {selectedCandidate.phone && (
                          <a
                            href={`https://wa.me/${selectedCandidate.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                          >
                            <MessageCircle size={11} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
                      <span className="text-slate-500">{t("Recruitment Stage:", "Fase do Recrutamento:")}</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {selectedCandidate.recruitmentStage?.replace(/_/g, " ") || "Shortlisted"}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenEditContact(selectedCandidate)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit2 size={12} className="text-slate-500" />
                        <span>{t("Edit Contact Details", "Editar Contactos")}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Invitation Dispatch Status */}
                <div className="space-y-3">
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    {t("Invitation Delivery Audit", "Auditoria de Envio da Convocatória")}
                  </h4>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t("Delivery Status:", "Estado do Envio:")}</span>
                      {selectedCandidate.invitationStatus === "sent" ? (
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t("DISPATCHED & DELIVERED", "DISPARADO E ENTREGUE")}
                        </span>
                      ) : selectedCandidate.invitationStatus === "failed" ? (
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-red-50 text-red-700 border border-red-200">
                          {t("DELIVERY FAILED", "FALHA NO ENVIO")}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {t("NOT DISPATCHED YET", "AINDA NÃO ENVIADO")}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Dispatched At:", "Data do Envio:")}</span>
                      <strong className="text-slate-800 font-mono text-[0.75rem]">
                        {selectedCandidate.invitationSentAt
                          ? formatTimestamp(selectedCandidate.invitationSentAt)
                          : t("Pending Dispatch", "Pendente de Envio")}
                      </strong>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Secure Access Token:", "Token de Acesso Seguro:")}</span>
                      <span className="font-mono text-[0.7rem] text-slate-500">
                        {selectedCandidate.token
                          ? `${selectedCandidate.token.slice(0, 10)}••••••••`
                          : t("Generated at dispatch", "Gerado no disparo")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Candidate Response & Selection Declaration */}
                <div className="space-y-3">
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    {t("Candidate Response & Declaration", "Resposta & Declaração da Candidata")}
                  </h4>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t("Response State:", "Estado da Resposta:")}</span>
                      {selectedCandidate.candidateResponse === "confirmed" ? (
                        <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <Check size={11} className="stroke-[3]" />
                          <span>{t("CONFIRMED INTEREST (YES)", "CONFIRMOU INTERESSE (SIM)")}</span>
                        </span>
                      ) : selectedCandidate.candidateResponse === "declined" ? (
                        <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-bold bg-slate-200 text-slate-800 border border-slate-300 inline-flex items-center gap-1">
                          <X size={11} className="stroke-[3]" />
                          <span>{t("DECLINED INTEREST (NO)", "RECUSOU INTERESSE (NÃO)")}</span>
                        </span>
                      ) : selectedCandidate.invitationStatus === "sent" ? (
                        <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                          <Clock size={11} />
                          <span>{t("AWAITING CANDIDATE DECISION", "A AGUARDAR DECISÃO DA CANDIDATA")}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[0.65rem] font-medium bg-slate-100 text-slate-500">
                          {t("INVITATION NOT SENT", "CONVOCATÓRIA NÃO ENVIADA")}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">{t("Responded At Timestamp:", "Data e Hora da Resposta:")}</span>
                      <strong className="text-slate-900 font-mono text-[0.75rem]">
                        {selectedCandidate.respondedAt || selectedCandidate.responseDate
                          ? formatTimestamp(selectedCandidate.respondedAt || selectedCandidate.responseDate)
                          : t("Awaiting candidate submission", "Aguardando submissão")}
                      </strong>
                    </div>

                    {/* Exact Quoted Selection Box */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                        {t("Candidate Selected Option (Original Copy):", "Opção Selecionada pela Candidata (Texto Original):")}
                      </span>

                      {selectedCandidate.candidateResponse === "confirmed" ? (
                        <div className="p-3 rounded-md bg-emerald-50/80 border-l-3 border-emerald-600 text-emerald-950 text-[0.75rem] leading-relaxed italic">
                          "{selectedCandidate.responseOption || "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas."}"
                        </div>
                      ) : selectedCandidate.candidateResponse === "declined" ? (
                        <div className="p-3 rounded-md bg-slate-100 border-l-3 border-slate-500 text-slate-800 text-[0.75rem] leading-relaxed italic">
                          "{selectedCandidate.responseOption || "Não tenho interesse"}"
                        </div>
                      ) : (
                        <div className="p-3 rounded-md bg-amber-50/50 border-l-3 border-amber-400 text-amber-900 text-[0.75rem] leading-relaxed italic">
                          {selectedCandidate.invitationStatus === "sent"
                            ? t(
                                "Candidate has received the notice and has not yet submitted her response via the secure link.",
                                "A candidata recebeu a notificação e ainda não submeteu a sua resposta através do link seguro."
                              )
                            : t(
                                "Invitation has not been dispatched to this candidate yet.",
                                "A convocatória ainda não foi enviada a esta candidata."
                              )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Terms and Conditions Summary */}
                <div className="p-3.5 rounded-lg bg-sky-50/50 border border-sky-100 text-[0.7rem] text-sky-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-sky-950">
                    <ShieldCheck size={13} />
                    <span>{t("Notified Conditions of Consideration", "Termos e Condições Notificados")}</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>{t("10 days of initial training (unpaid)", "10 dias de formação inicial (sem remuneração)")}</li>
                    <li>{t("3 months practical training (9.000 MZN/month if selected)", "3 meses de formação prática (9.000 MZN/mês se selecionada)")}</li>
                    <li>{t("Potential adjustment up to 12.000 MZN/month based on performance", "Remuneração até 12.000 MZN/mês conforme desempenho")}</li>
                    <li>{t("Shift regime: 12h rotation (2 day + 2 night + 2 off)", "Turnos de 12 horas (2 dia + 2 noite + 2 folgas)")}</li>
                  </ul>
                </div>
              </div>

              {/* Slide-over Footer Actions */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t("Close", "Fechar")}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = candidates.findIndex((c) => c.id === selectedCandidate.id);
                      setPreviewCandidateIndex(idx >= 0 ? idx : 0);
                      setEmailPreviewModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-md border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={13} className="text-sky-600" />
                    <span>{t("Preview Email", "Pré-visualizar")}</span>
                  </button>

                  {selectedCandidate.phone && (
                    <a
                      href={`https://wa.me/${selectedCandidate.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {selectedCandidate.matchedId && (
                    <Link
                      href={`/admin/recruitment/candidates/${selectedCandidate.matchedId}`}
                      className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{t("View Full Profile", "Ver Perfil Completo")}</span>
                      <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dispatch Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Send size={16} className="text-sky-600" />
              <span>{t("Confirm Next Phase Dispatch", "Confirmar Envio das Convocatórias")}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `You are about to send the official Next Phase Conditions notice to ${summary.notSent} approved candidates. Each candidate will receive an individual secure link with YES and NO response options.`,
                `Está prestes a enviar a notificação oficial de condições da Próxima Fase para as ${summary.notSent} candidatas aprovadas. Cada mensagem contém um token seguro de utilização única com opções SIM e NÃO.`
              )}
            </p>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t("Approved Recipients:", "Destinatárias Aprovadas:")}</span>
                <strong className="text-slate-900 font-mono">15</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t("Emails to Dispatch:", "Emails a Disparar:")}</span>
                <strong className="text-sky-700 font-mono">{summary.notSent}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                disabled={dispatching}
                className="px-3.5 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {dispatching
                  ? t("Sending...", "A enviar...")
                  : t(`Send ${summary.notSent} Invitations`, `Enviar ${summary.notSent} Convocatórias`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Candidate Email Preview Modal with Realistic Overwatch Letterhead */}
      {emailPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 1. Modal Top Bar */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0b1329] text-white flex items-center justify-center font-bold font-mono text-sm shadow-xs shrink-0">
                  #{activeCandidate?.seedIndex ?? previewCandidateIndex + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeCandidate?.name || t("Candidate Preview", "Pré-visualização da Candidata")}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[0.68rem] font-bold bg-slate-100 text-slate-800 font-mono border border-slate-200">
                      {activeCandidate?.score ?? 80}% SCORE
                    </span>
                    {activeCandidate?.invitationStatus === "sent" ? (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t("INVITATION SENT", "ENVIADO")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {t("NOT SENT YET", "NÃO ENVIADO")}
                      </span>
                    )}
                  </div>
                  <p className="text-[0.7rem] text-slate-500 mt-0.5">
                    {t(
                      "Reviewing personalized next phase invitation before official dispatch",
                      "A validar convocatória personalizada da próxima fase antes do disparo oficial"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Preview Language Switcher: Official PT vs English Preview */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage("pt")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                      previewLanguage === "pt"
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={t("Official Portuguese text sent to candidates", "Texto oficial em Português enviado às candidatas")}
                  >
                    <span>🇲🇿 PT-MZ Oficial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage("en")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                      previewLanguage === "en"
                        ? "bg-[#0b1329] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={t("Accurate English translation with proper 2nd-person pronouns (your/you)", "Tradução em Inglês com pronomes de 2ª pessoa (your/you)")}
                  >
                    <span>🇬🇧 English Preview</span>
                  </button>
                </div>

                {/* Device Switcher */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={t("Desktop preview (600px)", "Pré-visualização desktop (600px)")}
                  >
                    <Monitor size={13} />
                    <span className="hidden sm:inline">{t("Desktop", "Desktop")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2.5 py-1 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={t("Mobile smartphone preview (390px)", "Pré-visualização telemóvel (390px)")}
                  >
                    <Smartphone size={13} />
                    <span className="hidden sm:inline">{t("Mobile", "Telemóvel")}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEmailPreviewModalOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={t("Close preview", "Fechar")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 2. Interactive Candidate Switcher & Quick Navigation Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Prev / Dropdown / Next */}
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewCandidateIndex((prev) => (prev > 0 ? prev - 1 : candidates.length - 1))
                  }
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                  title={t("Previous candidate", "Candidata anterior")}
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="relative flex-1 max-w-md">
                  <select
                    value={previewCandidateIndex}
                    onChange={(e) => setPreviewCandidateIndex(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    {candidates.map((cand, idx) => {
                      const statusTag =
                        cand.invitationStatus === "sent"
                          ? cand.candidateResponse === "confirmed"
                            ? " [✓ Confirmed YES]"
                            : cand.candidateResponse === "declined"
                              ? " [✗ Declined NO]"
                              : " [⏳ Awaiting]"
                          : " [Not Sent]";
                      return (
                        <option key={cand.id || idx} value={idx}>
                          #{cand.seedIndex} · {cand.name} ({cand.score}%){statusTag}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewCandidateIndex((prev) => (prev < candidates.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                  title={t("Next candidate", "Próxima candidata")}
                >
                  <ChevronRight size={15} />
                </button>

                <span className="text-[0.72rem] text-slate-500 font-mono whitespace-nowrap pl-1">
                  {previewCandidateIndex + 1} / {candidates.length || 15}
                </span>
              </div>

              {/* Candidate Info Highlights */}
              <div className="flex items-center gap-2 text-[0.72rem]">
                <div className="text-slate-600 flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  <span className="font-mono text-slate-800 font-semibold truncate max-w-[200px]">
                    {activeCandidate?.email || t("No email configured", "Sem email")}
                  </span>
                </div>

                {activeCandidate?.candidateResponse && (
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-[0.65rem] ${
                      activeCandidate.candidateResponse === "confirmed"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : activeCandidate.candidateResponse === "declined"
                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {activeCandidate.candidateResponse === "confirmed"
                      ? t("Confirmed YES", "Confirmou SIM")
                      : activeCandidate.candidateResponse === "declined"
                        ? t("Declined NO", "Recusou NÃO")
                        : t("Awaiting Response", "Aguardando")}
                  </span>
                )}
              </div>
            </div>

            {/* Warning if candidate has no email */}
            {activeCandidate && !activeCandidate.email && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>
                    {t(
                      `No email address registered for ${activeCandidate.name}. Please add an email address before dispatching official invitations.`,
                      `Nenhum endereço de email registado para ${activeCandidate.name}. Por favor adicione um email antes de enviar a convocatória oficial.`
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditContact(activeCandidate)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Edit2 size={12} />
                  <span>{t("Add Email Now", "Adicionar Email")}</span>
                </button>
              </div>
            )}

            {/* 3. Main Email Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f1f5f9] admin-scrollbar">
              <div
                className={`mx-auto bg-white rounded-xl border border-slate-300 overflow-hidden transition-all duration-200 ${
                  previewDevice === "mobile"
                    ? "max-w-[390px] shadow-lg ring-1 ring-slate-400/20"
                    : "max-w-xl shadow-xs"
                }`}
              >
                {/* Official Letterhead Header (Dark Navy #0b1329) */}
                <div className="bg-[#0b1329] px-6 py-4 border-b-2 border-white/15 flex items-center justify-between">
                  <Logo variant="light" size="sm" />
                  <div className="text-right">
                    <span className="inline-block bg-white/10 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 tracking-wider">
                      REF: CCO-2026/MAPUTO
                    </span>
                    <div className="text-[11px] text-slate-300 font-medium mt-1">
                      Departamento de Recursos Humanos
                    </div>
                  </div>
                </div>

                {/* Subheading Bar */}
                <div className="bg-[#f8fafc] px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">
                    {previewLanguage === "en"
                      ? "OFFICIAL NOTIFICATION · SELECTION PROCESS"
                      : "NOTIFICAÇÃO OFICIAL · PROCESSO DE SELECÇÃO"}
                  </span>
                  <span className="text-slate-500">
                    Maputo, Moçambique
                  </span>
                </div>

                {/* Candidate Personalized Body */}
                {previewLanguage === "pt" ? (
                  <div
                    translate="no"
                    className="notranslate p-6 text-xs text-slate-700 space-y-3.5 leading-relaxed select-text"
                  >
                    <p className="font-semibold text-slate-900 text-sm">
                      Prezada Candidata <span className="text-sky-700 font-bold">{activeCandidate?.name}</span>,
                    </p>

                    <p>
                      Agradecemos a sua participação no processo de selecção para a função de <strong>Operadora de CCO</strong> da Overwatch.
                    </p>

                    <p>
                      O seu resultado no teste (<strong className="text-slate-900">{activeCandidate?.score}% — mais de 80%</strong>) permitiu-lhe avançar para consideração na próxima fase do processo.
                    </p>

                    <p>
                      Antes de prosseguirmos, gostaríamos de assegurar que compreende e aceita as condições previstas para esta etapa:
                    </p>

                    {/* Condition Bullet Points */}
                    <div className="bg-slate-50 border-l-3 border-[#0b1329] p-3.5 rounded-r border border-slate-200 space-y-2 text-[0.72rem] text-slate-800">
                      <div>• <strong>10 dias de formação inicial</strong>, sem remuneração;</div>
                      <div>• Caso seja seleccionada após essa formação, seguirá para um período de <strong>3 meses de formação prática</strong>, com uma remuneração mensal de <strong>9.000 MZN</strong>;</div>
                      <div>• Após a conclusão satisfatória desse período, a remuneração mensal poderá chegar a <strong>12.000 MZN</strong>, de acordo com o desempenho e enquadramento na função;</div>
                      <div>• O regime de trabalho previsto é de <strong>12 horas por turno</strong>, numa rotação de: <span className="font-semibold text-slate-900">2 turnos de dia + 2 turnos de noite + 2 dias de folga</span>.</div>
                    </div>

                    <p className="text-slate-500 text-[0.7rem]">
                      A progressão para cada fase dependerá do desempenho, disciplina, capacidade de aprendizagem, cumprimento dos procedimentos e adequação à função.
                    </p>

                    <p className="font-medium text-slate-900 pt-1">
                      Neste momento, gostaríamos apenas de saber se, tendo conhecimento destas condições, continua interessada em ser considerada para a próxima fase do processo de selecção.
                    </p>

                    <p className="text-slate-600 text-[0.72rem]">
                      Caso tenha interesse, pedimos que indique carregando no botão abaixo:
                    </p>

                    {/* Bulletproof action buttons with candidate's actual dedicated token */}
                    <div className="pt-2 space-y-2">
                      <a
                        href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-3 px-4 rounded-lg bg-[#0b1329] hover:bg-[#111b3a] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas.
                      </a>
                      <div className="text-center pt-1">
                        <a
                          href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=no`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[0.72rem] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Não tenho interesse
                        </a>
                      </div>
                    </div>

                    {/* Direct link box */}
                    <div className="text-center pt-2 text-[0.68rem] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700">Link Dedicado Oficial da Candidata:</span><br />
                      <a
                        href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-700 hover:underline break-all font-medium mt-0.5 inline-block"
                      >
                        /pt/careers/next-phase/{activeCandidate?.token || ""}
                      </a>
                    </div>

                    <p className="text-[0.68rem] text-slate-400 italic pt-2">
                      As candidatas que confirmarem o interesse receberão posteriormente informação sobre datas, horários e organização da formação.
                    </p>

                    <div className="pt-4 border-t border-slate-100 text-xs">
                      <p className="text-slate-500">Com os melhores cumprimentos,</p>
                      <p className="font-bold text-[#090d16] mt-0.5">Equipa de Recrutamento e Selecção</p>
                      <p className="text-slate-600 text-[11px] font-semibold">Overwatch Moçambique</p>
                    </div>
                  </div>
                ) : (
                  /* Candidate Personalized Body - Accurate English Translation with 2nd-person (your/you) */
                  <div className="p-6 text-xs text-slate-700 space-y-3.5 leading-relaxed select-text">
                    <div className="mb-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[0.7rem] flex items-center gap-2">
                      <span className="font-bold">ℹ️</span>
                      <span>
                        <strong>English Management Preview:</strong> Accurate second-person translation ("your / you") for English-speaking administrators. The candidate receives the official Portuguese notification.
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900 text-sm">
                      Dear Candidate <span className="text-sky-700 font-bold">{activeCandidate?.name}</span>,
                    </p>

                    <p>
                      Thank you for participating in the selection process for the <strong>CCO Operator</strong> position at Overwatch.
                    </p>

                    <p>
                      <strong>Your</strong> test score (<strong className="text-slate-900">{activeCandidate?.score}% — more than 80%</strong>) allowed <strong>you</strong> to advance to consideration in the next phase of the process.
                    </p>

                    <p>
                      Before proceeding, we would like to ensure that you understand and accept the conditions scheduled for this stage:
                    </p>

                    {/* Condition Bullet Points */}
                    <div className="bg-slate-50 border-l-3 border-[#0b1329] p-3.5 rounded-r border border-slate-200 space-y-2 text-[0.72rem] text-slate-800">
                      <div>• <strong>10 days of initial training</strong>, unpaid;</div>
                      <div>• If selected after this training, you will proceed to a <strong>3-month practical training period</strong>, with a monthly stipend of <strong>9,000 MZN</strong>;</div>
                      <div>• Following satisfactory completion of this period, monthly remuneration may reach <strong>12,000 MZN</strong>, according to performance and role placement;</div>
                      <div>• The scheduled working regime is <strong>12 hours per shift</strong>, on a rotation of: <span className="font-semibold text-slate-900">2 day shifts + 2 night shifts + 2 days off</span>.</div>
                    </div>

                    <p className="text-slate-500 text-[0.7rem]">
                      Progression to each stage will depend on performance, discipline, learning agility, procedural compliance, and suitability for the role.
                    </p>

                    <p className="font-medium text-slate-900 pt-1">
                      At this stage, we would simply like to know whether, being aware of these conditions, you remain interested in being considered for the next phase of the selection process.
                    </p>

                    <p className="text-slate-600 text-[0.72rem]">
                      If you are interested, please confirm by clicking the button below:
                    </p>

                    {/* Action buttons with candidate's actual dedicated token */}
                    <div className="pt-2 space-y-2">
                      <a
                        href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-3 px-4 rounded-lg bg-[#0b1329] hover:bg-[#111b3a] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Yes, I am interested in continuing in the selection process and am available to fulfill the indicated conditions.
                      </a>
                      <div className="text-center pt-1">
                        <a
                          href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=no`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[0.72rem] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          I am not interested
                        </a>
                      </div>
                    </div>

                    {/* Direct link box */}
                    <div className="text-center pt-2 text-[0.68rem] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700">Candidate Dedicated Live Link:</span><br />
                      <a
                        href={`/pt/careers/next-phase/${activeCandidate?.token || ""}?choice=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-700 hover:underline break-all font-medium mt-0.5 inline-block"
                      >
                        /pt/careers/next-phase/{activeCandidate?.token || ""}
                      </a>
                    </div>

                    <p className="text-[0.68rem] text-slate-400 italic pt-2">
                      Candidates who confirm interest will subsequently receive details regarding dates, schedules, and training arrangements.
                    </p>

                    <div className="pt-4 border-t border-slate-100 text-xs">
                      <p className="text-slate-500">With best regards,</p>
                      <p className="font-bold text-[#090d16] mt-0.5">Selection and Recruitment Team</p>
                      <p className="text-slate-600 text-[11px] font-semibold">Overwatch Mozambique</p>
                    </div>
                  </div>
                )}

                {/* Letterhead Footer */}
                <div className="bg-[#f8fafc] px-6 py-4 border-t border-slate-200 text-[0.72rem] text-slate-500 leading-relaxed">
                  <div className="font-bold text-[#090d16]">Overwatch Moçambique, Lda.</div>
                  <div>Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo, Moçambique</div>
                  <div>Telefone / WhatsApp: <span className="text-sky-700 font-semibold">+258 84 287 0793</span> · Email: info@overwatchmoz.com</div>
                </div>
              </div>
            </div>

            {/* 4. Modal Footer: Live Test Email & Action Controls */}
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Test Sender for This Specific Candidate */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (activeCandidate) handleSendCandidatePreview(activeCandidate);
                }}
                autoComplete="off"
                className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md"
              >
                <input
                  type="email"
                  name="modal_preview_email_address"
                  id="modal_preview_email_address"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="admin@overwatch.co.mz"
                  value={previewEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={previewSending || !activeCandidate}
                  className="px-3 py-1.5 rounded bg-[#0b1329] hover:bg-[#111b3a] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <Mail size={12} />
                  <span>
                    {previewSending
                      ? t("Sending...", "A enviar...")
                      : t(
                          `Send Test (${activeCandidate?.name.split(" ")[0] || "Sample"})`,
                          `Enviar Teste (${activeCandidate?.name.split(" ")[0] || "Amostra"})`
                        )}
                  </span>
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const token = activeCandidate?.token || "";
                    handleCopyLink(`/pt/careers/next-phase/${token}?choice=yes`);
                  }}
                  className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={12} className="text-slate-400" />
                  <span>{copiedLink ? t("Link Copied!", "Link Copiado!") : t("Copy Link", "Copiar Link")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmailPreviewModalOpen(false)}
                  className="px-4 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  {t("Close Preview", "Fechar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Candidate Contact Details Modal */}
      {editContactModalOpen && editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0b1329] text-white flex items-center justify-center font-bold font-mono text-xs">
                  #{editingCandidate.seedIndex}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("Edit Contact Details", "Editar Contactos da Candidata")}
                  </h3>
                  <p className="text-[0.7rem] text-slate-500 font-mono">
                    Score: {editingCandidate.score}%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditContactModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {contactError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{contactError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("Candidate Name", "Nome da Candidata")}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("Email Address", "Endereço de Email")}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  placeholder="candidata@exemplo.com"
                  autoComplete="off"
                />
                <p className="text-[0.68rem] text-slate-500 mt-1">
                  {t(
                    "Official next phase conditions invitations will be dispatched to this email address.",
                    "A convocatória oficial com os termos da próxima fase será enviada para este email."
                  )}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("WhatsApp / Phone Number", "Número WhatsApp / Telefone")}
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  placeholder="+258 84 000 0000"
                />
                <p className="text-[0.68rem] text-slate-500 mt-1">
                  {t(
                    "Optional backup contact for WhatsApp communication or call reminders.",
                    "Contacto telefónico ou WhatsApp para lembretes e confirmações."
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditContactModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t("Cancel", "Cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-4 py-1.5 rounded-lg bg-[#0b1329] hover:bg-[#111b3a] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>{savingContact ? t("Saving...", "A guardar...") : t("Save & Update", "Guardar e Actualizar")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
