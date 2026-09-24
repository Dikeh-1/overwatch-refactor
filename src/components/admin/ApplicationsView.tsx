"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  ExternalLink,
  UserX,
  Archive,
  Send,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
} from "lucide-react";
import { Application, stages, formatSlotDisplay } from "@/lib/careers";
import { screenCandidate } from "@/lib/careers-screening";

interface ApplicationsViewProps {
  applications: Application[];
  lang: "pt" | "en";
  searchQuery: string;
  onSelectCandidate: (candidate: Application) => void;
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onBulkStatusChange: (ids: string[], newStatus: string) => Promise<void>;
  onOpenBulkInvite: (selectedCandidates: Application[]) => void;
  onOpenDisqualifyModal: (candidates: Application[]) => void;
  onDeleteCandidate: (candidate: Application) => void;
  activeRole: string | null;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  lang,
  searchQuery,
  onSelectCandidate,
  onStatusChange,
  onBulkStatusChange,
  onOpenBulkInvite,
  onOpenDisqualifyModal,
  onDeleteCandidate,
  activeRole,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  // Filter States
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sexFilter, setSexFilter] = useState<"all" | "female" | "male">("all");
  const [expFilter, setExpFilter] = useState<"all" | "yes" | "no">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtered dataset
  const roleFiltered = useMemo(() => {
    if (!activeRole) return applications;
    return applications.filter((a) => a.role === activeRole);
  }, [applications, activeRole]);

  const filteredApplications = useMemo(() => {
    return roleFiltered.filter((a) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesEmail = a.email.toLowerCase().includes(q);
        const matchesPhone = a.whatsapp.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const matchesSlot = a.testSlot ? a.testSlot.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesSlot) return false;
      }

      // 2. Stage Filter
      if (stageFilter === "booked") {
        if (!a.testSlot || a.status === "archived" || a.status === "rejected") return false;
      } else if (stageFilter !== "all" && a.status !== stageFilter) {
        return false;
      }

      // 3. Gender Filter
      if (sexFilter !== "all" && a.sex !== sexFilter) return false;

      // 4. Experience Filter
      if (expFilter !== "all" && a.experience !== expFilter) return false;

      return true;
    });
  }, [roleFiltered, searchQuery, stageFilter, sexFilter, expFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = roleFiltered.length;
    const shortlisted = roleFiltered.filter((a) => a.status === "shortlisted").length;
    const booked = roleFiltered.filter((a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected").length;
    const attended = roleFiltered.filter((a) => Boolean(a.attendedAt)).length;
    return { total, shortlisted, booked, attended };
  }, [roleFiltered]);

  // Selection helpers
  const isAllPageSelected = paginatedApplications.length > 0 && paginatedApplications.every((a) => selectedIds.includes(a.id));
  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedApplications.map((a) => a.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...paginatedApplications.map((a) => a.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedCandidates = useMemo(() => {
    return applications.filter((a) => selectedIds.includes(a.id));
  }, [applications, selectedIds]);

  const stageTabs = [
    { id: "all", label: t("All Candidates", "Todas as Candidaturas"), count: roleFiltered.length },
    { id: "reviewing", label: t("In Review", "Em Análise"), count: roleFiltered.filter((a) => a.status === "reviewing" || a.status === "new").length },
    { id: "shortlisted", label: t("Shortlisted", "Pré-seleccionadas"), count: roleFiltered.filter((a) => a.status === "shortlisted").length },
    { id: "booked", label: t("Booked Sessions", "Com Turno Agendado"), count: metrics.booked },
    { id: "rejected", label: t("Disqualified", "Não Seleccionadas"), count: roleFiltered.filter((a) => a.status === "rejected").length },
    { id: "archived", label: t("Archived", "Arquivadas"), count: roleFiltered.filter((a) => a.status === "archived").length },
  ];

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0f1524] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">{t("Total Applications", "Total de Candidaturas")}</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">{metrics.total}</div>
          <span className="text-[0.7rem] text-slate-400 mt-1 block">{t("100% active database", "Base de dados ativa")}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-sky-500/20 bg-[#0f1524] shadow-sm">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">{t("Shortlisted", "Pré-seleccionadas")}</span>
            <CheckCircle2 size={16} className="text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">{metrics.shortlisted}</div>
          <span className="text-[0.7rem] text-sky-300/70 mt-1 block">
            {metrics.total > 0 ? `${Math.round((metrics.shortlisted / metrics.total) * 100)}% ${t("of total", "do total")}` : "0%"}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-[#0f1524] shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">{t("Booked Tests", "Turnos Confirmados")}</span>
            <Calendar size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">{metrics.booked}</div>
          <span className="text-[0.7rem] text-emerald-300/70 mt-1 block">{t("In-person test slots", "Vagas presenciais")}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/20 bg-[#0f1524] shadow-sm">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">{t("Gate Attendance", "Presentes no Portão")}</span>
            <ShieldCheck size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono">{metrics.attended}</div>
          <span className="text-[0.7rem] text-purple-300/70 mt-1 block">
            {metrics.booked > 0 ? `${Math.round((metrics.attended / metrics.booked) * 100)}% ${t("attendance rate", "taxa de comparência")}` : "0%"}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d121f] overflow-hidden shadow-sm">
        
        {/* Stage Filter Navigation Tabs */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0">
            {stageTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStageFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  stageFilter === tab.id
                    ? "bg-white/[0.12] text-white border border-white/10 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[0.65rem] font-mono ${
                    stageFilter === tab.id ? "bg-white/20 text-white font-bold" : "bg-white/[0.06] text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Filters (Gender & Experience) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <select
              value={sexFilter}
              onChange={(e) => {
                setSexFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0f172a]">{t("All Genders", "Todos os Géneros")}</option>
              <option value="female" className="bg-[#0f172a]">{t("Female Only", "Apenas Feminino")}</option>
              <option value="male" className="bg-[#0f172a]">{t("Male Only", "Apenas Masculino")}</option>
            </select>

            <select
              value={expFilter}
              onChange={(e) => {
                setExpFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0f172a]">{t("All Experience", "Toda Experiência")}</option>
              <option value="yes" className="bg-[#0f172a]">{t("With Experience", "Com Experiência")}</option>
              <option value="no" className="bg-[#0f172a]">{t("No Experience", "Sem Experiência")}</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (Appears when candidates are checked) */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-3 bg-sky-500/10 border-b border-sky-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-sky-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>
                {selectedIds.length} {t("candidate(s) selected", "candidata(s) seleccionada(s)")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenBulkInvite(selectedCandidates)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Send size={13} />
                <span>{t("Send Test Invites", "Enviar Convocatórias")} ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDisqualifyModal(selectedCandidates)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition-colors cursor-pointer"
              >
                <UserX size={13} />
                <span>{t("Disqualify", "Desqualificar")}</span>
              </button>

              <button
                type="button"
                onClick={() => onBulkStatusChange(selectedIds, "archived")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
              >
                <Archive size={13} />
                <span>{t("Archive", "Arquivar")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs cursor-pointer"
              >
                {t("Clear", "Limpar")}
              </button>
            </div>
          </div>
        )}

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/20 text-slate-400 text-[0.68rem] font-bold uppercase tracking-wider">
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="rounded border-white/20 bg-black/40 text-sky-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">{t("Candidate", "Candidata")}</th>
                <th className="px-4 py-3.5">{t("WhatsApp Contact", "Contacto WhatsApp")}</th>
                <th className="px-4 py-3.5">{t("Qualifications", "Requisitos")}</th>
                <th className="px-4 py-3.5">{t("Test Booking Slot", "Turno de Teste")}</th>
                <th className="px-4 py-3.5">{t("Stage", "Estado")}</th>
                <th className="px-4 py-3.5 text-right">{t("Action", "Ação")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-2">
                    <Users size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-white">
                      {t("No candidates found", "Nenhuma candidatura encontrada")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("Try changing your search query or filters.", "Tente ajustar os filtros ou termo de pesquisa.")}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((candidate) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  const screening = screenCandidate(candidate);

                  return (
                    <tr
                      key={candidate.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-sky-500/[0.04]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(candidate.id)}
                          className="rounded border-white/20 bg-black/40 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Candidate Name & Email */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(candidate)}
                          className="text-left group cursor-pointer block"
                        >
                          <span className="font-semibold text-white group-hover:text-sky-300 transition-colors block text-xs">
                            {candidate.name}
                          </span>
                          <span className="text-[0.68rem] text-slate-400 block truncate max-w-[220px]">
                            {candidate.email}
                          </span>
                        </button>
                      </td>

                      {/* WhatsApp Contact */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 font-medium text-xs transition-colors"
                        >
                          <Phone size={12} className="text-emerald-400" />
                          <span>{candidate.whatsapp}</span>
                        </a>
                      </td>

                      {/* Qualifications */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[0.68rem]">
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              candidate.grade12 === "yes"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            12ª {candidate.grade12 === "yes" ? "✓" : "✕"}
                          </span>
                          {candidate.experience === "yes" && (
                            <span className="px-2 py-0.5 rounded font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {t("Exp", "Exp")} ✓
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Test Booking Slot */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {candidate.testSlot ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                              <Calendar size={11} className="text-emerald-400" />
                              <span>{formatSlotDisplay(candidate.testSlot, lang)}</span>
                            </span>
                            {candidate.attendedAt && (
                              <span className="text-[0.62rem] font-bold text-emerald-400 block">
                                ✓ {t("Present at Gate", "Presente no Portão")}
                              </span>
                            )}
                          </div>
                        ) : candidate.invitedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock size={10} />
                            <span>{t("Awaiting Booking", "Aguardando Escolha")}</span>
                          </span>
                        ) : (
                          <span className="text-[0.7rem] text-slate-500">—</span>
                        )}
                      </td>

                      {/* Stage Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[0.68rem] font-semibold inline-block ${
                            candidate.status === "interview" || candidate.testSlot
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                              : candidate.status === "shortlisted"
                                ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
                                : candidate.status === "rejected" || candidate.status === "archived"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/25"
                                  : "bg-white/[0.06] text-slate-300 border border-white/10"
                          }`}
                        >
                          {candidate.status === "interview"
                            ? t("Interview / Test", "Teste Presencial")
                            : candidate.status === "shortlisted"
                              ? t("Shortlisted", "Pré-seleccionada")
                              : candidate.status === "reviewing"
                                ? t("In Review", "Em Análise")
                                : candidate.status === "rejected"
                                  ? t("Disqualified", "Não Seleccionada")
                                  : candidate.status === "archived"
                                    ? t("Archived", "Arquivada")
                                    : candidate.status}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(candidate)}
                          className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          {t("View Profile", "Ver Perfil")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-black/20 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            {t("Showing", "A mostrar")}{" "}
            <span className="font-semibold text-white">
              {filteredApplications.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-white">
              {Math.min(currentPage * pageSize, filteredApplications.length)}
            </span>{" "}
            {t("of", "de")} <span className="font-semibold text-white">{filteredApplications.length}</span>{" "}
            {t("candidates", "candidatas")}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono font-medium text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsView;
