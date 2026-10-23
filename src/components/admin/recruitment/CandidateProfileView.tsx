"use client";
import { evaluateApplicationWithRules, screeningValue } from "@/lib/careers-evaluator";
import { DEFAULT_SCREENING_RULES_BY_ROLE } from "@/lib/careers-models";

import React, { useState, useEffect } from "react";
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

  const [activeTab, setActiveTab] = useState<"overview" | "application" | "test" | "documents" | "communications" | "activity">("overview");
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
    { id: "communications", label: t("Communications", "Comunicações") },
    { id: "activity", label: t("Activity Log", "Histórico de Auditoria") },
  ];

  const backTarget = adminParent(`/admin/recruitment/candidates/${candidate.id}`, new URLSearchParams(searchParams));

  return (
    <div className="space-y-6 [--workspace-sticky-top:100px]">
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

      {/* Sticky Tab Navigation Strip */}
      <div className="sticky top-[48px] z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-2 shadow-sm overflow-x-auto admin-scrollbar">
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

      {/* TAB 5: COMMUNICATIONS */}
      {activeTab === "communications" && (
        <div className="space-y-5">
          <button type="button" onClick={() => setActiveTab("overview")} className="inline-flex items-center gap-1.5 text-xs text-slate-600"><ArrowLeft size={14}/>{t("Back to profile", "Voltar ao perfil")}</button>
          <CommunicationsView key={candidate.id} applications={[candidate]} fixedRecipient={candidate} cohortId={candidate.cohortId} lang={lang} onSent={onRefresh}/>
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t("Communication History", "Histórico de Comunicações")}
          </h2>

          <div className="divide-y divide-slate-100 text-xs">
            {candidate.communications && candidate.communications.length > 0 ? (
              candidate.communications.map((comm, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{comm.subject}</div>
                    <div className="text-[0.7rem] text-slate-500">
                      {t("To:", "Para:")} {comm.recipient} • {t("Type:", "Tipo:")} {comm.type}
                    </div>
                    {comm.bodySnippet && <details className="pt-2"><summary className="cursor-pointer text-sky-700">{t("View message", "Ver mensagem")}</summary><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs text-slate-700">{comm.bodySnippet}</pre></details>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold border ${comm.status === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      {comm.status.toUpperCase()}
                    </span>
                    <div className="text-[0.65rem] text-slate-400 mt-1">
                      {new Date(comm.sentAt).toLocaleString("pt-MZ")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                {t("No communication records logged yet.", "Nenhum registo de comunicação registado.")}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY LOG */}
      {activeTab === "activity" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t("Activity Audit Timeline", "Histórico de Auditoria")}
          </h2>

          <div className="space-y-3">
            {candidate.activityLog && candidate.activityLog.length > 0 ? (
              candidate.activityLog.map((act, idx) => (
                <div key={idx} className="p-3 rounded-md border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{act.action}</div>
                    {act.details && <div className="text-slate-600 mt-0.5">{act.details}</div>}
                    <div className="text-[0.7rem] text-slate-400 mt-1">{t("Actor:", "Operador:")} {act.actor || "System"}</div>
                  </div>
                  <span className="text-[0.65rem] text-slate-400 whitespace-nowrap font-mono shrink-0">
                    {new Date(act.timestamp).toLocaleString("pt-MZ")}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-600">
                <div className="font-semibold text-slate-900">{t("Application Submitted", "Candidatura Submetida")}</div>
                <div className="text-[0.7rem] text-slate-400 mt-1">
                  {new Date(candidate.createdAt).toLocaleString("pt-MZ")}
                </div>
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
                <option value="Duplicate">{t("Duplicate Application", "Candidatura Duplicada")}</option>
                <option value="Recruitment Closed">{t("Recruitment Closed", "Concurso Encerrado")}</option>
                <option value="Other">{t("Other Reason", "Outro Motivo")}</option>
              </select>
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
                    await onArchive(candidate.id, archiveReason);
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
