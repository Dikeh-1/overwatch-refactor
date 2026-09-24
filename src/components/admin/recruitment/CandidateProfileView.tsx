"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Application, Role, stages, formatPhoneDisplay, formatSlotDisplay, ArchiveReason } from "@/lib/careers";
import { screenCandidate } from "@/lib/careers-screening";
import DocxViewer from "../DocxViewer";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

interface CandidateProfileViewProps {
  candidate: Application;
  roles: Role[];
  lang?: "pt" | "en";
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onArchive: (id: string, reason: ArchiveReason) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  candidate,
  roles,
  lang: propLang,
  onStatusChange,
  onArchive,
  onDelete,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [activeTab, setActiveTab] = useState<"overview" | "application" | "test" | "documents" | "communications" | "activity">("overview");
  const [translatedCover, setTranslatedCover] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showEnglishCover, setShowEnglishCover] = useState(false);

  // Modals
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>("Not Selected for Next Phase");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const roleObj = roles.find((r) => r.id === candidate.role);
  const roleLabel = roleObj ? (lang === "pt" ? roleObj.pt : roleObj.en) : (candidate.role || "Operadora de CCTV");

  // Screening analysis
  const screening = screenCandidate(candidate);

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
    try {
      await onStatusChange(candidate.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const tabs = [
    { id: "overview", label: t("Overview", "Visão Geral") },
    { id: "application", label: t("Application & Questionnaire", "Candidatura & Respostas") },
    { id: "test", label: t("Test & Scores", "Teste Presencial") },
    { id: "documents", label: t("Documents & CV", "Documentos & CV") },
    { id: "communications", label: t("Communications", "Comunicações") },
    { id: "activity", label: t("Activity Log", "Histórico de Auditoria") },
  ];

  const returnQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/admin/recruitment/candidates${returnQuery}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t("Back to Candidates", "Voltar à Lista de Candidaturas")}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">{t("Stage:", "Estado:")}</span>
            <select
              value={candidate.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleStatusSelect(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
            <div className="w-12 h-12 rounded-lg bg-[#0a1128] text-white flex items-center justify-center font-bold text-lg shrink-0">
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
                {candidate.testScore && (
                  <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-slate-900 text-white">
                    Score: {candidate.testScore}%
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
              className="px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <Phone size={13} />
              <span>{t("Open WhatsApp", "Contactar WhatsApp")}</span>
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-5 pt-3 overflow-x-auto admin-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
              {t("Qualification Checklist", "Verificação de Qualificações")}
            </h2>

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
                  <strong className={candidate.attendedAt ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    {candidate.attendedAt ? `${t("Present", "Presente")} (${new Date(candidate.attendedAt).toLocaleTimeString(lang === "en" ? "en-GB" : "pt-MZ")})` : t("Awaiting", "Aguardado")}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t("Recorded Score:", "Nota Registada:")}</span>
                  <strong className="text-slate-900 font-bold">
                    {candidate.testScore ? `${candidate.testScore}%` : "—"}
                  </strong>
                </div>
              </div>

              {candidate.nextPhaseStatus && (
                <div className="p-3.5 rounded-md bg-sky-50/70 border border-sky-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                      <Award size={14} />
                      <span>{t("Next Phase Cohort Status", "Estado na Turma da Próxima Fase")}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-white border border-sky-200 text-sky-800">
                      {candidate.nextPhaseStatus}
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
                        ? t("Confirmed Interest (YES)", "Confirmou SIM")
                        : candidate.nextPhaseResponse === "no"
                          ? t("Declined Interest (NO)", "Recusou NÃO")
                          : t("Awaiting Candidate Decision", "Aguardando Resposta")}
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
                        "{candidate.nextPhaseResponseOption || (candidate.nextPhaseResponse === "yes" ? "Sim, tenho interesse em continuar no processo de selecção e estou disponível para cumprir as condições indicadas." : "Não tenho interesse")}"
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATION & COVER LETTER */}
      {activeTab === "application" && (
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
                {candidate.attendedAt ? (
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
              className="px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                onClick={() => setArchiveModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onArchive(candidate.id, archiveReason);
                  setArchiveModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer"
              >
                {t("Confirm Archive", "Confirmar Arquivo")}
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
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete(candidate.id);
                  router.push(`/admin/recruitment/candidates${returnQuery}`);
                }}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-xs font-semibold text-white cursor-pointer"
              >
                {t("Delete Permanently", "Eliminar Definitivamente")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
