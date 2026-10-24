"use client";
import { evaluateApplicationWithRules, screeningValue } from "@/lib/careers-evaluator";
import { DEFAULT_SCREENING_RULES_BY_ROLE } from "@/lib/careers-models";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Download,
  FileText,
  UserX,
  Archive,
  CheckCircle2,
  Clock,
  Award,
  Globe,
  Trash2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Check,
  X,
  Copy,
  History as HistoryIcon,
} from "lucide-react";
import { Application, Role, stages, formatPhoneDisplay, formatSlotDisplay, ArchiveReason } from "@/lib/careers";
import { classifyCandidateLocation } from "@/lib/location-utils";
import { hasAttended, hasScore } from "@/lib/careers-workflow";
import { adminParent } from "@/lib/admin-navigation";
import { CommunicationsView } from "./CommunicationsView";
import DocxViewer from "../DocxViewer";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import CelebrationOverlay from "@/components/admin/ui/CelebrationOverlay";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface CandidateProfileViewProps {
  candidate: Application;
  roles: Role[];
  lang?: "pt" | "en";
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onArchive: (id: string, reason: ArchiveReason) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  candidate,
  roles,
  lang: propLang,
  onStatusChange,
  onArchive,
  onDelete,
  onRefresh,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [activeTab, setActiveTab] = useState<"overview" | "application" | "test" | "documents" | "communications" | "history" | "activity">("overview");
  const [refCopied, setRefCopied] = useState(false);
  useEffect(() => {
    const back = (event: Event) => { if (activeTab !== "overview") { event.preventDefault(); setActiveTab("overview"); } };
    window.addEventListener("admin:back", back);
    return () => window.removeEventListener("admin:back", back);
  }, [activeTab]);
  const [translatedCover, setTranslatedCover] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showEnglishCover, setShowEnglishCover] = useState(false);

  // Modals & Action States
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>("Not Selected for Next Phase");
  const [customArchiveReason, setCustomArchiveReason] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState<string | null>(null);
  const [statusErrorMsg, setStatusErrorMsg] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [celebrationState, setCelebrationState] = useState<{
    show: boolean;
    variant: "next_phase" | "hired" | "shortlisted";
    candidateName?: string;
  }>({ show: false, variant: "next_phase" });

  // Dynamic test score state
  const [savedScore, setSavedScore] = useState<number | undefined>(candidate.testScore);
  const [currentScore, setCurrentScore] = useState<string>(
    typeof candidate.testScore === "number" ? String(candidate.testScore) : ""
  );
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoreSuccessMsg, setScoreSuccessMsg] = useState<string | null>(null);
  const [scoreErrorMsg, setScoreErrorMsg] = useState<string | null>(null);

  const [copiedLinkType, setCopiedLinkType] = useState<"next_phase" | "invite" | null>(null);
  const [candidateToken, setCandidateToken] = useState<string | undefined>(candidate.nextPhaseToken);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const handleCopyLink = (url: string, type: "next_phase" | "invite") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLinkType(type);
      setTimeout(() => setCopiedLinkType(null), 2500);
    }
  };

  const handleGenerateNextPhaseToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_token", candidateId: candidate.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCandidateToken(data.token);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin:careers-updated"));
        }
      } else {
        alert(data.error || "Failed to generate token");
      }
    } catch (err: any) {
      alert(err.message || "Network error generating token");
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleSaveScore = async () => {
    const num = parseFloat(currentScore);
    if (isNaN(num) || num < 0 || num > 100) {
      setScoreErrorMsg(t("Score must be between 0 and 100", "A pontuação deve estar entre 0 e 100"));
      setTimeout(() => setScoreErrorMsg(null), 3000);
      return;
    }

    setIsSavingScore(true);
    setScoreSuccessMsg(null);
    setScoreErrorMsg(null);
    try {
      const sanitized = Math.round(num);
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "score",
          id: candidate.id,
          score: sanitized,
        }),
      });
      if (!res.ok) throw new Error("Failed to save score");
      setSavedScore(sanitized);
      setScoreSuccessMsg(t("Score saved successfully", "Pontuação gravada com sucesso"));
      window.dispatchEvent(new CustomEvent("admin:careers-updated"));
      setTimeout(() => setScoreSuccessMsg(null), 3000);
    } catch (err: any) {
      setScoreErrorMsg(err.message || t("Error saving score", "Erro ao gravar pontuação"));
      setTimeout(() => setScoreErrorMsg(null), 3000);
    } finally {
      setIsSavingScore(false);
    }
  };

  const roleObj = roles.find((r) => r.id === candidate.role);
  const roleLabel = roleObj ? (lang === "pt" ? roleObj.pt : roleObj.en) : (candidate.role || "Operadora de CCTV");
  const isTechnicalRole = candidate.role === "cctv_technical_manager";

  // Handle Cover Letter Translation
  const handleTranslateCover = async () => {
    if (!candidate.coverLetter) return;
    if (translatedCover) {
      setShowEnglishCover(!showEnglishCover);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: candidate.coverLetter, from: "pt", to: "en" }),
      });
      const data = await res.json();
      if (data?.translated) {
        setTranslatedCover(data.translated);
        setShowEnglishCover(true);
      }
    } catch (err) {
      console.error("Cover translation failed:", err);
    } finally {
      setTranslating(false);
    }
  };

  const handleStatusSelect = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    setStatusSuccessMsg(null);
    setStatusErrorMsg(null);
    try {
      await onStatusChange(candidate.id, newStatus);
      setStatusSuccessMsg(t("Stage updated", "Estado actualizado"));

      // Trigger celebration moments
      if (newStatus === "next_phase_selected" || newStatus === "next_phase_invited") {
        setCelebrationState({ show: true, variant: "next_phase", candidateName: candidate.name });
      } else if (newStatus === "hired") {
        setCelebrationState({ show: true, variant: "hired", candidateName: candidate.name });
      } else if (newStatus === "shortlisted") {
        setCelebrationState({ show: true, variant: "shortlisted", candidateName: candidate.name });
      }

      setTimeout(() => setStatusSuccessMsg(null), 3000);
    } catch (err: any) {
      setStatusErrorMsg(t("Update failed", "Falha na actualização"));
      setTimeout(() => setStatusErrorMsg(null), 4000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const tabs = [
    { id: "overview", label: t("Overview", "Visão Geral") },
    { id: "application", label: t("Application & Questionnaire", "Candidatura & Respostas") },
    ...(isTechnicalRole ? [] : [{ id: "test", label: t("Test & Scores", "Teste Presencial") }]),
    { id: "documents", label: t("Documents & CV", "Documentos & CV") },
    { id: "communications", label: t("Communications Studio", "Comunicações") },
    { id: "history", label: t("Communication History", "Histórico de Comunicações") },
    { id: "activity", label: t("Activity Log", "Histórico de Auditoria") },
  ];

    // Synthesized Full Audit Timeline capturing all candidate actions, bookings, communications, and evaluations
  const synthesizedAuditTimeline = useMemo(() => {
    type TimelineItem = {
      id: string;
      action: string;
      details?: string;
      actor: string;
      timestamp: string;
      badgeColor: string;
      category: "email" | "booking" | "attendance" | "score" | "nextphase" | "submission" | "archive" | "general";
    };

    const items: TimelineItem[] = [];

    // 1. Explicit activityLog items from candidate record
    if (candidate.activityLog) {
      candidate.activityLog.forEach((act, idx) => {
        const lower = act.action.toLowerCase();
        items.push({
          id: act.id || `act-${idx}`,
          action: act.action,
          details: act.details,
          actor: act.actor || "System",
          timestamp: act.timestamp,
          category: lower.includes("decline") || lower.includes("disqualif")
            ? "archive"
            : lower.includes("confirm") || lower.includes("pass")
            ? "nextphase"
            : lower.includes("score") || lower.includes("test")
            ? "score"
            : "general",
          badgeColor: lower.includes("decline") || lower.includes("disqualif")
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : lower.includes("confirm") || lower.includes("pass")
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-800",
        });
      });
    }

    // 2. All communications dispatched
    if (candidate.communications) {
      candidate.communications.forEach((comm, idx) => {
        items.push({
          id: comm.id || `comm-${idx}`,
          action: t("Official Email Dispatched", "Email Oficial Enviado"),
          details: `${comm.subject} • ${t("Recipient:", "Destinatário:")} ${comm.recipient} (${(comm.status || "SENT").toUpperCase()})`,
          actor: comm.sender || "Admin Recruiter",
          timestamp: comm.sentAt,
          category: "email",
          badgeColor: comm.status === "failed"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-sky-200 bg-sky-50 text-sky-800",
        });
      });
    }

    // 3. Application Submission
    if (candidate.createdAt) {
      items.push({
        id: `created-${candidate.id}`,
        action: t("Application Submitted", "Candidatura Submetida"),
        details: t("Candidate completed online application questionnaire with CV and documentation", "Candidato submeteu a candidatura online com CV e questionário"),
        actor: "Candidate",
        timestamp: candidate.createdAt,
        category: "submission",
        badgeColor: "border-slate-200 bg-slate-50 text-slate-800",
      });
    }

    // 4. Test Invitation Dispatched
    if (candidate.invitedAt) {
      items.push({
        id: `invite-${candidate.id}`,
        action: t("Test Invitation Issued", "Convocatória para Teste Emitida"),
        details: t("Invitation dispatched with personalized booking link and instructions", "Convocatória enviada com ligação pessoal para escolha de data do teste"),
        actor: "System / Recruitment Admin",
        timestamp: candidate.invitedAt,
        category: "email",
        badgeColor: "border-sky-200 bg-sky-50 text-sky-800",
      });
    }

    // 5. Booking link opened
    if (candidate.bookingLinkOpenedAt) {
      items.push({
        id: `open-${candidate.id}`,
        action: t("Booking Link Opened", "Link de Convocatória Acedido"),
        details: t("Candidate accessed their personal session selection schedule", "Candidato acedeu à plataforma de agendamento de testes presenciais"),
        actor: "Candidate",
        timestamp: candidate.bookingLinkOpenedAt,
        category: "booking",
        badgeColor: "border-blue-200 bg-blue-50 text-blue-800",
      });
    }

    // 6. Test Slot Booked
    if (candidate.testBookedAt && candidate.testSlot) {
      items.push({
        id: `booked-${candidate.id}`,
        action: t("Test Slot Booked & Confirmed", "Turno de Teste Agendado"),
        details: `${t("Confirmed session slot:", "Turno confirmado:")} ${formatSlotDisplay(candidate.testSlot, lang)}`,
        actor: "Candidate",
        timestamp: candidate.testBookedAt,
        category: "booking",
        badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-800",
      });
    }

    // 7. Gate Attendance / Check-In
    if (candidate.attendedAt) {
      items.push({
        id: `attended-${candidate.id}`,
        action: t("Gate Attendance Verified", "Presença Registada na Portaria"),
        details: `${t("Physical check-in at Maputo HQ", "Entrada física validada nas instalações de Maputo")}${candidate.attendanceStatus ? ` (${candidate.attendanceStatus})` : ""}`,
        actor: "Gate Security / Reception",
        timestamp: candidate.attendedAt,
        category: "attendance",
        badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-800",
      });
    }

    // 8. Test Score Recorded (if not duplicate of activityLog)
    const scoreVal = typeof candidate.testScore === "number" ? candidate.testScore : typeof candidate.score === "number" ? candidate.score : null;
    const hasScoreInLog = items.some(it => it.action.toLowerCase().includes("test result") || it.action.toLowerCase().includes("score") || it.action.toLowerCase().includes("nota"));
    if (scoreVal !== null && !hasScoreInLog) {
      items.push({
        id: `score-${candidate.id}`,
        action: t("Test Score Recorded", "Nota do Teste Registada"),
        details: `${t("Evaluated score:", "Nota atribuída:")} ${scoreVal}%`,
        actor: "Recruitment Admin",
        timestamp: candidate.attendedAt || candidate.createdAt,
        category: "score",
        badgeColor: "border-purple-200 bg-purple-50 text-purple-800",
      });
    }

    // 9. Next Phase Decision / Response
    if (candidate.nextPhaseRespondedAt) {
      const isYes = candidate.nextPhaseResponse === "yes";
      items.push({
        id: `nextphase-${candidate.id}`,
        action: isYes ? t("Next Phase Confirmed", "Próxima Fase Confirmada") : t("Next Phase Declined", "Próxima Fase Declinada"),
        details: candidate.nextPhaseResponseOption || (isYes ? t("Candidate accepted terms & conditions", "Candidato aceitou os termos e condições") : t("Candidate declined", "Candidato recusou")),
        actor: "Candidate (via Portal)",
        timestamp: candidate.nextPhaseRespondedAt,
        category: "nextphase",
        badgeColor: isYes ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
      });
    }

    // 10. Archived / Disqualified
    if (candidate.status === "archived") {
      items.push({
        id: `archived-${candidate.id}`,
        action: t("Candidate Archived", "Candidatura Arquivada"),
        details: candidate.archiveReason || t("Archived from active funnel", "Arquivado do funil ativo"),
        actor: "Recruitment Admin",
        timestamp: candidate.archivedAt || new Date().toISOString(),
        category: "archive",
        badgeColor: "border-slate-200 bg-slate-100 text-slate-800",
      });
    }

    // Deduplicate items with similar action within 5-second window
    const seen = new Set<string>();
    const uniqueItems: TimelineItem[] = [];

    // Sort newest first
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const it of items) {
      const timeBucket = Math.round(new Date(it.timestamp).getTime() / 5000);
      const key = `${it.action.toLowerCase().slice(0, 15)}_${timeBucket}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(it);
      }
    }

    return uniqueItems;
  }, [candidate, t, lang]);

const backTarget = adminParent(`/admin/recruitment/candidates/${candidate.id}`, new URLSearchParams(searchParams));

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backTarget}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{backTarget.startsWith("/admin/recruitment/archive") ? t("Back to archive", "Voltar ao arquivo") : t("Back to Candidates", "Voltar à Lista de Candidaturas")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveTab("communications")} className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700"><Mail size={14}/>{t("Send email", "Enviar email")}</button>
          {/* Status Dropdown with Live Processing State */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">{t("Stage:", "Estado:")}</span>
            <div className="relative inline-flex items-center">
              <select
                value={candidate.status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusSelect(e.target.value)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors cursor-pointer ${
                  isUpdatingStatus ? "opacity-60 cursor-wait border-sky-400 bg-sky-50/40" : "border-slate-300"
                }`}
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Processing State */}
            {isUpdatingStatus && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.68rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <OverwatchOrbitLoader size="xs" theme="light" className="shrink-0" />
                <span>{t("Processing update...", "A processar alteração...")}</span>
              </span>
            )}

            {/* Visual Success Confirmation Badge */}
            {statusSuccessMsg && !isUpdatingStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in duration-150">
                <Check size={12} className="text-emerald-600" />
                <span>{statusSuccessMsg}</span>
              </span>
            )}

            {/* Visual Error Badge */}
            {statusErrorMsg && !isUpdatingStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-bold bg-red-50 text-red-700 border border-red-200">
                <X size={12} className="text-red-600" />
                <span>{statusErrorMsg}</span>
              </span>
            )}
          </div>

          {/* Archive Button */}
          <button
            type="button"
            onClick={() => setArchiveModalOpen(true)}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Archive size={13} />
            <span>{t("Archive", "Arquivar")}</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            title={t("Permanently delete", "Eliminar definitivamente")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {candidate.name}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`#${candidate.id.slice(0, 8).toUpperCase()}`);
                    setRefCopied(true);
                    setTimeout(() => setRefCopied(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded text-[0.7rem] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                  title={t("Click to copy reference number", "Clique para copiar número de referência")}
                >
                  <span>#{candidate.id.slice(0, 8).toUpperCase()}</span>
                  {refCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-slate-400" />}
                </button>
                <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  {roleLabel}
                </span>
                {typeof savedScore === "number" && (
                  <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                    Score: {savedScore}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-600 flex-wrap">
                <a
                  href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline font-mono"
                >
                  <Phone size={12} />
                  <span>{formatPhoneDisplay(candidate.whatsapp)}</span>
                </a>
                <a
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:underline"
                >
                  <Mail size={12} />
                  <span>{candidate.email}</span>
                </a>
                <span className="text-slate-400">
                  {t("Applied:", "Submetido a:")} {new Date(candidate.createdAt).toLocaleDateString("pt-MZ")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Phone size={13} />
              <span>{t("Open WhatsApp", "Contactar WhatsApp")}</span>
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation Strip with solid non-transparent background */}
      <div className="sticky top-[48px] z-25 -mx-6 px-6 py-2 bg-[#F7F8FA]">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm overflow-x-auto admin-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Qualifications & Screening */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              {isTechnicalRole
                ? t("Technical Screening & Competencies", "Triagem Técnica & Competências")
                : t("Qualification Checklist", "Verificação de Qualificações")}
            </h2>

            {isTechnicalRole ? (() => {
              const rules = candidate.screeningRulesApplied ?? roleObj?.screeningRules ?? DEFAULT_SCREENING_RULES_BY_ROLE.cctv_technical_manager;
              const result = evaluateApplicationWithRules(candidate, rules);
              const mandatory = result.details?.filter(detail => detail.mandatory) || [];
              const preferred = result.details?.filter(detail => !detail.mandatory) || [];
              const missing = mandatory.filter(detail => !detail.passed);
              const label = (key: string, fallback: string) => { const rule = rules.find(rule => rule.field === key); return rule ? (lang === "en" ? rule.labelEn : rule.labelPt) : fallback; };
              const years = String(screeningValue(candidate, "yearsCctvExperience") ?? "—");
              return <div className="space-y-4 text-xs">
                <div className={`rounded-lg border p-3.5 ${result.passedMandatory ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>{result.passedMandatory ? t("✓ Screening criteria met", "✓ Critérios de avaliação cumpridos") : t("✕ Mandatory requirements missing", "✕ Requisitos obrigatórios em falta")}</span><span className="rounded border border-current bg-white px-2 py-0.5">{result.matchPercentage}% · {result.passedMandatory ? t("Match", "Compatibilidade") : t("Criteria not met", "Critérios não cumpridos")}</span></div>
                  <p className="mt-2 leading-relaxed">{result.passedMandatory ? t(`All ${mandatory.length} mandatory requirements met. Preferred criteria: ${result.preferredScore}/${result.preferredTotal} weighted points.`, `Todos os ${mandatory.length} requisitos obrigatórios cumpridos. Critérios preferenciais: ${result.preferredScore}/${result.preferredTotal} pontos ponderados.`) : t(`${missing.length} mandatory requirement(s) missing. The checklist and score use the same rules for this recruitment cycle.`, `${missing.length} requisito(s) obrigatório(s) em falta. A lista e a pontuação usam as mesmas regras deste lote.`)}</p>
                  {missing.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">{missing.map(detail => <li key={detail.key}>{label(detail.key,detail.label)}</li>)}</ul>}
                  <p className="mt-2 text-[11px] opacity-80">{t("Screening is separate from the recorded recruitment decision and next-phase selection.", "A avaliação é distinta da decisão de recrutamento e selecção para a próxima fase.")}</p>
                </div>
                <dl className="divide-y divide-slate-100">{[
                  [t("Location", "Localização"), String(screeningValue(candidate,"currentLocation") || "—")],
                  [t("CCTV experience", "Experiência CCTV"), years.replace(/[_–—]/g,"-")],
                  [t("Availability / start", "Disponibilidade / início"), String(screeningValue(candidate,"startDate") || "—")],
                  [t("Expected salary", "Salário pretendido"), String(screeningValue(candidate,"salaryExpectation") || "—")]
                ].map(([title,value]) => <div key={title} className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-500">{title}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
                {[{title:t("Mandatory criteria", "Critérios obrigatórios"),details:mandatory},{title:t("Preferred competencies", "Competências preferenciais"),details:preferred}].map(group => <section key={group.title}><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.title}</h3><div className="space-y-2">{group.details.map(detail => <div key={detail.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5"><span>{label(detail.key,detail.label)}</span><span className={`shrink-0 rounded border px-2 py-0.5 font-semibold ${detail.passed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{detail.passed ? t("✓ Met", "✓ Cumprido") : t("✕ Not met", "✕ Não cumprido")}</span></div>)}</div></section>)}
                {Boolean(screeningValue(candidate,"largestProjectDescription")) && <div className="whitespace-pre-wrap rounded-lg border bg-slate-50 p-3">{String(screeningValue(candidate,"largestProjectDescription"))}</div>}
              </div>;
            })() : candidate.screeningResult?.details && candidate.screeningResult.details.length > 0 ? (
              <div className="space-y-2 text-xs">
                {candidate.sex && (
                  <div className="py-2 flex items-center justify-between border-b border-slate-100">
                    <span className="text-slate-500">{t("Gender", "Género")}</span>
                    <span className="font-semibold text-slate-900">
                      {candidate.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                    </span>
                  </div>
                )}
                <div className="space-y-1.5 pt-1">
                  {candidate.screeningResult.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-700 font-medium">{(() => { const rule = roleObj?.screeningRules?.find(rule => rule.field === detail.key); return rule ? (lang === "en" ? rule.labelEn : rule.labelPt) : detail.label; })()}</span>
                        {detail.mandatory && (
                          <span className="text-[0.6rem] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            {t("Mandatory", "Obrigatório")}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${
                          detail.passed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {detail.passed ? "✓ PASS" : "✕ FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("Gender", "Género")}</span>
                  <span className="font-semibold text-slate-900">
                    {candidate.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("12th Grade Completed", "12.ª Classe Concluída")}</span>
                  <span className={`font-semibold ${candidate.grade12 === "yes" ? "text-emerald-700" : "text-slate-700"}`}>
                    {candidate.grade12 === "yes" ? t("Yes, completed", "Sim, concluída") : t("No", "Não")}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("CCTV / Security Experience", "Experiência CCTV / Segurança")}</span>
                  <span className={`font-semibold ${candidate.experience === "yes" ? "text-emerald-700" : "text-slate-700"}`}>
                    {candidate.experience === "yes" ? t("Yes, verified", "Sim, comprovada") : t("No prior experience", "Sem experiência prévia")}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("AI Familiarity", "Conhecimento de IA")}</span>
                  <span className="font-semibold text-slate-900">
                    {candidate.ai === "yes" ? t("Yes", "Sim, utiliza") : t("No", "Não")}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("Shift Availability (2D/2N/2F)", "Disponibilidade de Turnos (2D/2N/2F)")}</span>
                  <span className={`font-semibold ${candidate.shifts === "yes" ? "text-emerald-700" : "text-red-700"}`}>
                    {candidate.shifts === "yes" ? t("Yes, full availability", "Sim, total") : t("No", "Não")}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t("Last Profession", "Última Profissão")}</span>
                  <span className="font-semibold text-slate-900">{candidate.lastProfession || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Test & Next Phase Summary */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              {t("Testing & Next Phase Status", "Estado do Teste & Próxima Fase")}
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>{t("Scheduled In-Person Slot:", "Turno de Teste Presencial:")}</span>
                  <strong className="text-slate-900">
                    {candidate.testSlot ? formatSlotDisplay(candidate.testSlot) : t("Not Booked", "Não Agendado")}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Gate Attendance:", "Presença no Portão:")}</span>
                  <strong className={hasAttended(candidate) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    {hasAttended(candidate) ? candidate.attendedAt ? `${t("Present", "Presente")} (${new Date(candidate.attendedAt).toLocaleTimeString(lang === "en" ? "en-GB" : "pt-MZ")})` : t("Present (documented)", "Presente (documentado)") : candidate.attendanceStatus === "absent" ? t("Absent", "Ausente") : t("Not recorded", "Não registado")}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Recorded Score:", "Nota Registada:")}</span>
                  <strong className="text-slate-900 font-bold">
                    {hasScore(candidate) ? `${candidate.testScore}%` : "—"}
                  </strong>
                </div>
              </div>

              {(candidate.nextPhaseStatus || candidateToken) && (
                <div className="p-4 rounded-md bg-sky-50/70 border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                      <Award size={15} />
                      <span>{t("Next Phase Cohort Status & Portal", "Estado na Turma da Próxima Fase & Portal")}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-white border border-sky-200 text-sky-800">
                      {candidate.nextPhaseStatus || "selected"}
                    </span>
                  </div>

                  {candidate.nextPhaseInvitedAt && (
                    <div className="flex justify-between text-xs text-sky-900">
                      <span>{t("Invitation Sent:", "Convocatória Enviada:")}</span>
                      <strong className="font-mono text-[0.72rem]">
                        {new Date(candidate.nextPhaseInvitedAt).toLocaleString(lang === "en" ? "en-GB" : "pt-MZ")}
                      </strong>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-sky-900">
                    <span>{t("Candidate Decision:", "Decisão da Candidata:")}</span>
                    <strong className={candidate.nextPhaseResponse === "yes" ? "text-emerald-700 font-bold" : candidate.nextPhaseResponse === "no" ? "text-slate-700 font-bold" : "text-amber-700 font-semibold"}>
                      {candidate.nextPhaseResponse === "yes"
                        ? t("✓ Confirmed Interest (YES)", "✓ Confirmou Interesse (SIM)")
                        : candidate.nextPhaseResponse === "no"
                          ? t("✕ Declined Interest (NO)", "✕ Recusou Interesse (NÃO)")
                          : t("⏳ Awaiting Candidate Decision", "⏳ A Aguardar Resposta da Candidata")}
                    </strong>
                  </div>

                  {candidate.nextPhaseRespondedAt && (
                    <div className="flex justify-between text-xs text-sky-900">
                      <span>{t("Responded At:", "Data da Resposta:")}</span>
                      <strong className="font-mono text-[0.72rem]">
                        {new Date(candidate.nextPhaseRespondedAt).toLocaleString(lang === "en" ? "en-GB" : "pt-MZ")}
                      </strong>
                    </div>
                  )}

                  {candidate.nextPhaseResponse && (
                    <div className="pt-2 border-t border-sky-200/70 text-xs">
                      <span className="text-[0.65rem] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                        {t("Selected Response Option (PT-MZ):", "Opção de Resposta Selecionada (PT-MZ):")}
                      </span>
                      <div className="p-2.5 rounded bg-white border border-sky-200 text-slate-800 italic text-[0.72rem]">
                        &quot;{candidate.nextPhaseResponseOption || (candidate.nextPhaseResponse === "yes" ? "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas." : "Não tenho interesse")}&quot;
                      </div>
                    </div>
                  )}

                  {/* Dedicated Candidate Decision Link Card */}
                  <div className="pt-2 border-t border-sky-200/70 space-y-2">
                    <span className="text-[0.65rem] font-bold text-sky-900 uppercase tracking-wider block">
                      {t("Dedicated Decision Portal Link:", "Link Dedicado do Portal de Decisão:")}
                    </span>
                    {candidateToken ? (
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[0.7rem] text-slate-700 break-all select-all">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/pt/careers/next-phase/${candidateToken}`
                            : `https://www.overwatchmoz.com/pt/careers/next-phase/${candidateToken}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
                              handleCopyLink(`${origin}/pt/careers/next-phase/${candidateToken}`, "next_phase");
                            }}
                            className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            {copiedLinkType === "next_phase" ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700 font-bold">{t("Link Copiado!", "Link Copiado!")}</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="text-slate-600" />
                                <span>{t("Copy decision link", "Copiar Link Dedicado")}</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`/pt/careers/next-phase/${candidateToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <ExternalLink size={12} className="text-emerald-600" />
                            <span>{t("Open decision portal", "Abrir Portal de Decisão")}</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 p-2 rounded bg-amber-50 border border-amber-200">
                        <span className="text-[0.7rem] text-amber-800 font-medium">
                          {t("No token generated yet.", "Nenhum token gerado ainda.")}
                        </span>
                        <button
                          type="button"
                          disabled={isGeneratingToken}
                          onClick={handleGenerateNextPhaseToken}
                          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                        >
                          {isGeneratingToken ? t("Gerando...", "Gerando...") : t("Gerar Token Dedicado", "Gerar Token Dedicado")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATION & COVER LETTER */}
      {activeTab === "application" && (
        <div className="space-y-6">
          {candidate.largestProjectDescription && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {t(
                    "Largest CCTV Project Managed or Installed",
                    "Maior Projecto de CCTV Pessoalmente Gerido ou Instalado"
                  )}
                </h2>
                <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  {t("Technical Showcase", "Portfólio Prático")}
                </span>
              </div>
              <p className="text-[0.7rem] text-slate-500">
                {t(
                  "Approximate number of cameras, equipment brands used, and applicant's technical responsibilities:",
                  "Número aproximado de câmaras, marcas de equipamentos e responsabilidades técnicas relatadas:"
                )}
              </p>
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {candidate.largestProjectDescription}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {t("Cover Letter / Submission Note", "Carta de Apresentação")}
              </h2>

              <button
                type="button"
                onClick={handleTranslateCover}
                disabled={translating || !candidate.coverLetter}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Globe size={13} />
                <span>
                  {translating
                    ? t("Translating...", "A traduzir...")
                    : showEnglishCover
                      ? t("Show Original (PT)", "Ver Original (PT)")
                      : t("Translate to English", "Traduzir para Inglês")}
                </span>
              </button>
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
              {showEnglishCover && translatedCover
                ? translatedCover
                : candidate.coverLetter || t("No cover letter provided with this submission.", "Nenhuma carta de apresentação submetida.")}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEST & SCORES */}
      {activeTab === "test" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t("Test Session Details", "Detalhes da Sessão de Teste")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-md border border-slate-200 space-y-2">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 block">
                {t("Scheduled Date", "Data do Turno")}
              </span>
              <div className="text-sm font-bold text-slate-900">
                {candidate.testSlot ? formatSlotDisplay(candidate.testSlot) : t("No slot scheduled", "Nenhum turno agendado")}
              </div>
              <div className="text-slate-500 text-[0.7rem]">
                {t("Arrival time: 09:30 AM (Gates close strictly at 09:50 AM)", "Hora de chegada: 09h30 (Portão encerra às 09h50)")}
              </div>
            </div>

            <div className="p-4 rounded-md border border-slate-200 space-y-2">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 block">
                {t("Gate Presence Verification", "Registo de Presença no Portão")}
              </span>
              <div className="text-sm font-bold text-slate-900">
                {hasAttended(candidate) ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={16} />
                    <span>{t("Verified Present", "Presença Confirmada")}</span>
                  </span>
                ) : (
                  <span className="text-slate-500">{t("Awaiting Arrival", "Aguardando Chegada")}</span>
                )}
              </div>
              {candidate.attendedAt && (
                <div className="text-slate-500 text-[0.7rem]">
                  {t("Timestamp:", "Hora de Entrada:")} {new Date(candidate.attendedAt).toLocaleString("pt-MZ")}
                </div>
              )}
            </div>

            {/* Dynamic Assessment Score Card */}
            <div className="p-4 rounded-md border border-slate-200 space-y-3 md:col-span-2 bg-slate-50/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 block">
                    {t("Written Assessment Test Score", "Pontuação do Teste Escrito de Avaliação")}
                  </span>
                  <div className="text-[0.68rem] text-slate-500 mt-0.5">
                    {t("Official Benchmarks: Pass ≥ 75% (15/20) · Grace 70%–74% (14/20) · Fail < 70%", "Métricas Oficiais: Aprovado ≥ 75% (15/20) · Margem Tolerância 70%–74% (14/20) · Reprovado < 70%")}
                  </div>
                </div>
                {typeof savedScore === "number" && (
                  <span
                    className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${
                      savedScore >= 75
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : savedScore >= 70
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {savedScore >= 75
                      ? t(`Passed (≥75%) — Score: ${savedScore}%`, `Aprovada (≥75%) — Nota: ${savedScore}%`)
                      : savedScore >= 70
                        ? t(`Grace Token Eligible (70%–74%) — Score: ${savedScore}%`, `Margem de Tolerância (70%–74%) — Nota: ${savedScore}%`)
                        : t(`Below Benchmark (<70%) — Score: ${savedScore}%`, `Abaixo do Mínimo (<70%) — Nota: ${savedScore}%`)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-32">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentScore}
                    onChange={(e) => setCurrentScore(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveScore}
                  disabled={isSavingScore || currentScore === ""}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isSavingScore ? (
                    <>
                      <OverwatchOrbitLoader size="xs" theme="dark" className="shrink-0" />
                      <span>{t("Saving...", "A gravar...")}</span>
                    </>
                  ) : (
                    <span>{t("Save Test Score", "Gravar Nota")}</span>
                  )}
                </button>

                {scoreSuccessMsg && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check size={13} className="text-emerald-600" />
                    <span>{scoreSuccessMsg}</span>
                  </span>
                )}

                {scoreErrorMsg && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <X size={13} className="text-red-600" />
                    <span>{scoreErrorMsg}</span>
                  </span>
                )}
              </div>

              {/* Dedicated Tracking Links Card */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Test Invite Link */}
                <div className="p-3 rounded-md bg-white border border-slate-200 space-y-1.5">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 block">
                    {t("In-Person Test Booking Link", "Link de Agendamento do Teste")}
                  </span>
                  <div className="p-1.5 rounded bg-slate-50 border border-slate-200 font-mono text-[0.68rem] text-slate-700 break-all select-all">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/pt/careers/test-invite/${candidate.id}`
                      : `https://www.overwatchmoz.com/pt/careers/test-invite/${candidate.id}`}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
                        handleCopyLink(`${origin}/pt/careers/test-invite/${candidate.id}`, "invite");
                      }}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedLinkType === "invite" ? (
                        <>
                          <Check size={11} className="text-emerald-600" />
                          <span className="text-emerald-700 font-bold">{t("Copiado!", "Copiado!")}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} className="text-slate-600" />
                          <span>{t("Copy link", "Copiar Link")}</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`/pt/careers/test-invite/${candidate.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <ExternalLink size={11} className="text-slate-600" />
                      <span>{t("Abrir Link", "Abrir Link")}</span>
                    </a>
                  </div>
                </div>

                {/* 2. Next Phase Portal Link */}
                <div className="p-3 rounded-md bg-white border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 block">
                      {t("Next Phase Conditions Decision Link", "Link de Decisão da Próxima Fase")}
                    </span>
                    {candidateToken && (
                      <span className="text-[0.62rem] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {candidate.nextPhaseResponse === "yes"
                          ? t("CONFIRMED", "CONFIRMOU")
                          : candidate.nextPhaseResponse === "no"
                            ? t("DECLINED", "RECUSOU")
                            : t("PENDING", "PENDENTE")}
                      </span>
                    )}
                  </div>

                  {candidateToken ? (
                    <>
                      <div className="p-1.5 rounded bg-slate-50 border border-slate-200 font-mono text-[0.68rem] text-slate-700 break-all select-all">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/pt/careers/next-phase/${candidateToken}`
                          : `https://www.overwatchmoz.com/pt/careers/next-phase/${candidateToken}`}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
                            handleCopyLink(`${origin}/pt/careers/next-phase/${candidateToken}`, "next_phase");
                          }}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          {copiedLinkType === "next_phase" ? (
                            <>
                              <Check size={11} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">{t("Copiado!", "Copiado!")}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} className="text-slate-600" />
                              <span>{t("Copy link", "Copiar Link")}</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`/pt/careers/next-phase/${candidateToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <ExternalLink size={11} className="text-emerald-600" />
                          <span>{t("Open portal", "Abrir Portal")}</span>
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[0.7rem] text-slate-500">
                        {t("No token generated yet.", "Nenhum token gerado ainda.")}
                      </span>
                      <button
                        type="button"
                        disabled={isGeneratingToken}
                        onClick={handleGenerateNextPhaseToken}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        {isGeneratingToken ? t("Gerando...", "Gerando...") : t("Gerar Token Dedicado", "Gerar Token Dedicado")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS & CV (CRITICAL FIX: NO AUTO-DOWNLOAD) */}
      {activeTab === "documents" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t("Curriculum Vitae (CV)", "Currículo (CV)")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {candidate.cvName} ({Math.round(candidate.cvSize / 1024)} KB)
              </p>
            </div>

            {/* Explicit Download Button (only fires on click) */}
            <a
              href={`/api/admin/cv?id=${candidate.id}&download=1`}
              download={candidate.cvName}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>{t("Download CV File", "Descarregar Ficheiro")}</span>
            </a>
          </div>

          {/* Secure Inline Document Viewer */}
          <div className="rounded-md border border-slate-200 overflow-hidden bg-slate-50 min-h-[500px]">
            {candidate.cvType === "application/pdf" || candidate.cvName?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={`/api/admin/cv?id=${candidate.id}`}
                className="w-full h-[650px] border-0 bg-white"
                title={`CV - ${candidate.name}`}
              />
            ) : (
              <div className="p-4">
                <DocxViewer url={`/api/admin/cv?id=${candidate.id}`} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: COMMUNICATIONS STUDIO (COMPOSE & INDIVIDUAL TOOLS) */}
      {activeTab === "communications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <button type="button" onClick={() => setActiveTab("overview")} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft size={14}/>
              <span>{t("Back to profile", "Voltar ao perfil")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HistoryIcon size={13} />
              <span>{t("View sent communication history →", "Ver histórico de comunicações enviadas →")}</span>
            </button>
          </div>
          <CommunicationsView key={candidate.id} applications={[candidate]} fixedRecipient={candidate} cohortId={candidate.cohortId} lang={lang} onSent={onRefresh}/>
        </div>
      )}

      {/* TAB 6: COMMUNICATION HISTORY (DEDICATED LOG BEFORE ACTIVITY LOG) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail size={16} className="text-sky-600" />
                  <span>{t("Communication History", "Histórico de Comunicações")}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {t(
                    "All official emails, convocations, and updates sent to this candidate.",
                    "Todos os emails oficiais, convites e actualizações enviados a este candidato."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                  {(candidate.communications || []).length} {t("sent", "enviados")}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("communications")}
                  className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t("+ New Message", "+ Nova Mensagem")}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {candidate.communications && candidate.communications.length > 0 ? (
                candidate.communications.map((comm, idx) => (
                  <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">{comm.subject}</div>
                      <div className="text-[0.72rem] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{t("To:", "Para:")} <span className="font-medium text-slate-700">{comm.recipient}</span></span>
                        <span>•</span>
                        <span>{t("Type:", "Tipo:")} <span className="font-mono uppercase">{comm.type}</span></span>
                        {comm.sender && (
                          <>
                            <span>•</span>
                            <span>{t("Sender:", "Remetente:")} {comm.sender}</span>
                          </>
                        )}
                      </div>
                      {comm.bodySnippet && (
                        <details className="pt-1.5 group">
                          <summary className="cursor-pointer text-sky-700 font-medium hover:underline text-xs inline-flex items-center gap-1">
                            <span>{t("View message content", "Ver conteúdo da mensagem")}</span>
                            <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200/80 whitespace-pre-wrap break-words font-sans text-xs text-slate-800 leading-relaxed max-h-80 overflow-y-auto">
                            {comm.bodySnippet}
                          </div>
                        </details>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-0.5 rounded text-[0.65rem] font-bold border tracking-wide uppercase ${
                        comm.status === "failed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : comm.status === "delivered" || comm.status === "sent"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                      }`}>
                        {(comm.status || "SENT").toUpperCase()}
                      </span>
                      <div className="text-[0.68rem] text-slate-400 font-mono mt-1.5">
                        {new Date(comm.sentAt).toLocaleString("pt-MZ")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Mail size={24} className="mx-auto text-slate-300" />
                  <p>{t("No communication records logged yet.", "Nenhum registo de comunicação registado.")}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("communications")}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition-colors"
                  >
                    {t("Send first message →", "Enviar primeira mensagem →")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ACTIVITY AUDIT LOG (COMPREHENSIVE FULL TIMELINE) */}
      {activeTab === "activity" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-700" />
                <span>{t("Activity Audit Timeline", "Histórico Completo de Auditoria")}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "Chronological audit trail of all candidate submissions, communications, bookings, gate attendance, scores, and status updates.",
                  "Registo cronológico de todas as submissões, comunicações, agendamentos, presença física, notas e decisões."
                )}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
              {synthesizedAuditTimeline.length} {t("events logged", "eventos registados")}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {synthesizedAuditTimeline.length > 0 ? (
              synthesizedAuditTimeline.map((item: { id: string; action: string; details?: string; actor: string; timestamp: string; badgeColor: string; category: string }) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 text-xs shadow-2xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.action}</span>
                      <span className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold border ${item.badgeColor}`}>
                        {item.category.toUpperCase()}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-slate-600 leading-relaxed text-xs break-words">{item.details}</p>
                    )}
                    <div className="text-[0.7rem] text-slate-400 font-medium pt-0.5">
                      {t("Actor:", "Operador:")} <span className="font-semibold text-slate-700">{item.actor}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[0.68rem] text-slate-500 font-mono bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs whitespace-nowrap block">
                      {new Date(item.timestamp).toLocaleString("pt-MZ")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <Clock size={20} className="mx-auto text-slate-300 mb-1" />
                <p className="font-medium text-slate-600">{t("No audit activities recorded.", "Nenhuma atividade de auditoria registada.")}</p>
                <p className="text-[11px] text-slate-400">{t("Candidate submission details will appear here as actions occur.", "Os detalhes aparecerão aqui à medida que as ações ocorrerem.")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Archive size={16} className="text-slate-600" />
              <span>{t("Archive Candidate", "Arquivar Candidatura")}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `Archive "${candidate.name}" from the active pipeline. All documents, test data, and communication records remain safely preserved.`,
                `Arquivar "${candidate.name}" do funil ativo. Todos os dados, CV e comunicações permanecem salvaguardados no arquivo.`
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("Archive Reason", "Motivo do Arquivo")}
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="Below Test Threshold">{t("Below Test Threshold (< 80%)", "Abaixo da Nota de Teste (< 80%)")}</option>
                <option value="Not Selected for Next Phase">{t("Not Selected for Next Phase", "Não Selecionado para a Próxima Fase")}</option>
                <option value="No Show">{t("No Show (Absent from Test)", "Faltou ao Teste Presencial")}</option>
                <option value="Candidate Withdrew">{t("Candidate Withdrew", "Candidato Desistiu do Processo")}</option>
                <option value="Declined Next Phase">{t("Declined Next Phase Conditions", "Recusou Condições da Próxima Fase")}</option>
                <option value="Outside Mozambique">{t("Outside Mozambique", "Não Reside em Moçambique")}</option>
                <option value="Outside Maputo Region">{t("Outside Maputo Region", "Fora da Região de Maputo")}</option>
                <option value="Duplicate">{t("Duplicate Application", "Candidatura Duplicada")}</option>
                <option value="Recruitment Closed">{t("Recruitment Closed", "Concurso Encerrado")}</option>
                <option value="Other">{t("Other Reason (Custom)", "Outro Motivo (Personalizado)")}</option>
              </select>

              {archiveReason === "Other" && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customArchiveReason}
                    onChange={(e) => setCustomArchiveReason(e.target.value)}
                    placeholder={t("Enter custom archive reason...", "Indique o motivo personalizado do arquivo...")}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setArchiveModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={async () => {
                  setIsArchiving(true);
                  try {
                    const finalReason = archiveReason === "Other" && customArchiveReason.trim()
                      ? customArchiveReason.trim()
                      : archiveReason;
                    await onArchive(candidate.id, finalReason);
                    setArchiveModalOpen(false);
                  } finally {
                    setIsArchiving(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isArchiving ? (
                  <>
                    <OverwatchOrbitLoader size="xs" theme="dark" className="shrink-0" />
                    <span>{t("Archiving...", "A arquivar...")}</span>
                  </>
                ) : (
                  <span>{t("Confirm Archive", "Confirmar Arquivo")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-red-200 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <Trash2 size={16} />
              <span>{t("Permanently Delete Candidate", "Eliminar Candidatura Permanentemente")}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `Are you sure you want to permanently delete the entire record for "${candidate.name}"? This action cannot be undone.`,
                `Tem a certeza de que deseja eliminar permanentemente todos os registos e CV de "${candidate.name}"? Esta ação é irreversível.`
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete(candidate.id);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <OverwatchOrbitLoader size="xs" theme="dark" className="shrink-0" />
                    <span>{t("Deleting...", "A eliminar...")}</span>
                  </>
                ) : (
                  <span>{t("Delete Permanently", "Eliminar Definitivamente")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Confetti Pop Overlay */}
      <CelebrationOverlay
        show={celebrationState.show}
        onClose={() => setCelebrationState((prev) => ({ ...prev, show: false }))}
        candidateName={candidate.name}
        roleName={candidate.role}
        variant={celebrationState.variant}
      />
    </div>
  );
};
