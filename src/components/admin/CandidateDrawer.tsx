"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  Download,
  ExternalLink,
  Copy,
  Check,
  Globe,
  FileText,
  UserX,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Application, stages, formatSlotDisplay } from "@/lib/careers";
import { screenCandidate } from "@/lib/careers-screening";
import DocxViewer from "./DocxViewer";

interface CandidateDrawerProps {
  candidate: Application | null;
  onClose: () => void;
  lang: "pt" | "en";
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onDisqualify: (candidate: Application) => void;
  onDelete: (candidate: Application) => void;
  statusUpdating: boolean;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  candidate,
  onClose,
  lang,
  onStatusChange,
  onDisqualify,
  onDelete,
  statusUpdating,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [translatedCover, setTranslatedCover] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showEnglishCover, setShowEnglishCover] = useState(false);

  if (!candidate) return null;

  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const screening = screenCandidate(candidate);

  const bookingLink = typeof window !== "undefined"
    ? `${window.location.origin}/${lang}/careers/test-invite/${candidate.id}`
    : `https://www.overwatchmoz.com/${lang}/careers/test-invite/${candidate.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleTranslateCoverLetter = async () => {
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
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const stageNames: Record<string, { en: string; pt: string }> = {
    new: { en: "New Application", pt: "Nova Candidatura" },
    reviewing: { en: "In Review", pt: "Em Análise" },
    shortlisted: { en: "Shortlisted", pt: "Pré-seleccionada" },
    interview: { en: "Test / Interview", pt: "Teste Presencial" },
    hired: { en: "Hired", pt: "Contratada" },
    rejected: { en: "Disqualified", pt: "Não Seleccionada" },
    archived: { en: "Archived", pt: "Arquivada" },
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-[#0e1424] border-l border-white/10 shadow-2xl flex flex-col z-10 text-slate-200">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#12192c] flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-white/10 text-white font-mono">
                  {candidate.role.toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    candidate.status === "interview" || candidate.testSlot
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : candidate.status === "shortlisted"
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        : candidate.status === "rejected" || candidate.status === "archived"
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {stageNames[candidate.status]?.[lang] || candidate.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {candidate.name}
              </h2>
              <span className="text-xs text-slate-400">
                {t("Submitted on:", "Submetido em:")}{" "}
                {new Date(candidate.createdAt).toLocaleString(lang === "pt" ? "pt-MZ" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            
            {/* Quick Contact & Action Card */}
            <div className="p-4 rounded-2xl border border-white/10 bg-black/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 transition-colors cursor-pointer"
                >
                  <Phone size={16} />
                  <div className="min-w-0">
                    <span className="text-[0.65rem] uppercase text-emerald-400 font-bold block">WhatsApp</span>
                    <span className="text-xs font-semibold truncate block">{candidate.whatsapp}</span>
                  </div>
                </a>

                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-300 transition-colors cursor-pointer"
                >
                  <Mail size={16} />
                  <div className="min-w-0">
                    <span className="text-[0.65rem] uppercase text-sky-400 font-bold block">Email</span>
                    <span className="text-xs font-semibold truncate block">{candidate.email}</span>
                  </div>
                </a>
              </div>

              {/* Status Selector & Booking Link Row */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">{t("Stage:", "Estado:")}</span>
                  <select
                    value={candidate.status}
                    onChange={(e) => onStatusChange(candidate.id, e.target.value)}
                    disabled={statusUpdating}
                    className="bg-[#182238] border border-white/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {stages.map((st) => (
                      <option key={st} value={st} className="bg-[#0f172a] text-white">
                        {stageNames[st]?.[lang] || st}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedLink ? t("Copied!", "Copiado!") : t("Copy Invite Link", "Copiar Link de Teste")}</span>
                </button>
              </div>
            </div>

            {/* Test Slot Session info if booked */}
            {candidate.testSlot && (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      {t("Confirmed In-Person Test Session", "Turno de Teste Presencial Confirmado")}
                    </span>
                  </div>
                  {candidate.attendedAt && (
                    <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ✓ {t("Attended at Gate", "Presente no Portão")}
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-white">
                  {formatSlotDisplay(candidate.testSlot, lang)}
                </p>
                <div className="flex items-center gap-3 text-xs text-emerald-200/80 pt-1">
                  <span>⏰ 10h00 (Chegada às 09h30)</span>
                  <span>•</span>
                  <span>📍 Av. Paulo Samuel Khankhomba nº 1948</span>
                </div>
              </div>
            )}

            {/* Screening Criteria Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("Qualification Checklist", "Verificação de Requisitos")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-white/10 bg-black/20 text-center">
                  <span className="text-[0.65rem] text-slate-400 block mb-1">{t("12th Grade", "12ª Classe")}</span>
                  <span className={`text-xs font-bold ${candidate.grade12 === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
                    {candidate.grade12 === "yes" ? "✓ " + t("Completed", "Concluído") : "✕ " + t("No", "Não")}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-black/20 text-center">
                  <span className="text-[0.65rem] text-slate-400 block mb-1">{t("Experience", "Experiência")}</span>
                  <span className={`text-xs font-bold ${candidate.experience === "yes" ? "text-emerald-400" : "text-slate-300"}`}>
                    {candidate.experience === "yes" ? "✓ " + t("Yes", "Sim") : t("None", "Sem exp.")}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-black/20 text-center">
                  <span className="text-[0.65rem] text-slate-400 block mb-1">{t("12h Shifts", "Turnos 12h")}</span>
                  <span className={`text-xs font-bold ${candidate.shifts === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
                    {candidate.shifts === "yes" ? "✓ " + t("Available", "Disponível") : "✕ " + t("No", "Não")}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-black/20 text-center">
                  <span className="text-[0.65rem] text-slate-400 block mb-1">{t("Gender", "Género")}</span>
                  <span className="text-xs font-bold text-slate-200 capitalize">
                    {candidate.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                  </span>
                </div>
              </div>
            </div>

            {/* Cover Letter Section */}
            {candidate.coverLetter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("Cover Letter", "Carta de Apresentação")}
                  </h3>
                  <button
                    type="button"
                    onClick={handleTranslateCoverLetter}
                    disabled={translating}
                    className="flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <Globe size={12} />
                    <span>
                      {translating
                        ? t("Translating...", "A traduzir...")
                        : showEnglishCover
                          ? t("Show Original (PT)", "Ver Original (PT)")
                          : t("Translate to English", "Traduzir para Inglês")}
                    </span>
                  </button>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-black/20 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {showEnglishCover && translatedCover ? translatedCover : candidate.coverLetter}
                </div>
              </div>
            )}

            {/* Curriculum Vitae (CV) Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("Curriculum Vitae (CV)", "Curriculum Vitae (CV)")}
                </h3>
                <a
                  href={`/api/admin/cv?id=${candidate.id}`}
                  download={candidate.cvName || `CV-${candidate.name}.pdf`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>{t("Download Original", "Descarregar CV")}</span>
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 min-h-[400px]">
                {candidate.cvType === "application/pdf" || candidate.cvName?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={`/api/admin/cv?id=${candidate.id}#toolbar=0`}
                    className="w-full h-[550px] border-0"
                    title={`CV - ${candidate.name}`}
                  />
                ) : (
                  <div className="p-4">
                    <DocxViewer url={`/api/admin/cv?id=${candidate.id}`} />
                  </div>
                )}
              </div>
            </div>

            {/* Dangerous Actions (Disqualify / Delete) */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onDisqualify(candidate)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserX size={13} />
                <span>{t("Disqualify Candidate", "Desqualificar Candidatura")}</span>
              </button>

              <button
                type="button"
                onClick={() => onDelete(candidate)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{t("Delete Permanently", "Eliminar Registo")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDrawer;
