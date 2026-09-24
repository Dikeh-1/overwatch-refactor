"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  UserX,
  Archive,
  Send,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  X,
  Award,
} from "lucide-react";
import { Application, Role, stages, formatPhoneDisplay, formatSlotDisplay } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

interface CandidatesTableViewProps {
  applications: Application[];
  roles: Role[];
  lang?: "pt" | "en";
  onBulkStatusChange?: (ids: string[], status: string) => Promise<void>;
  onBulkArchive?: (ids: string[], reason: string) => Promise<void>;
}

export const CandidatesTableView: React.FC<CandidatesTableViewProps> = ({
  applications,
  roles,
  lang: propLang,
  onBulkStatusChange,
  onBulkArchive,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  // Read URL query params or fallback
  const urlSearch = searchParams.get("search") || "";
  const urlView = searchParams.get("view") || "all";
  const urlRole = searchParams.get("role") || "all";
  const urlStage = searchParams.get("stage") || "all";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlPageSize = parseInt(searchParams.get("size") || "25", 10);

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeView, setActiveView] = useState(urlView);
  const [roleFilter, setRoleFilter] = useState(urlRole);
  const [stageFilter, setStageFilter] = useState(urlStage);
  const [sexFilter, setSexFilter] = useState<"all" | "female" | "male">("all");
  const [expFilter, setExpFilter] = useState<"all" | "yes" | "no">("all");
  const [currentPage, setCurrentPage] = useState(isNaN(urlPage) ? 1 : urlPage);
  const [pageSize, setPageSize] = useState(isNaN(urlPageSize) ? 25 : urlPageSize);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<string>("Not Selected for Next Phase");

  // Keep URL search params in sync
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "all" || val === "" || (key === "page" && val === 1) || (key === "size" && val === 25)) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlParams({ search: val, page: 1 });
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setCurrentPage(1);
    updateUrlParams({ view, page: 1 });
  };

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
    updateUrlParams({ role, page: 1 });
  };

  // Saved Views Definitions
  const savedViews = [
    { id: "all", label: t("All Candidates", "Todos") },
    { id: "active", label: t("Active Pipeline", "Funil Ativo") },
    { id: "awaiting_booking", label: t("Awaiting Test Booking", "Pendente Agendamento") },
    { id: "test_booked", label: t("Test Booked", "Teste Agendado") },
    { id: "tested", label: t("Tested", "Testados") },
    { id: "next_phase", label: t("Next Phase", "Próxima Fase") },
    { id: "confirmed", label: t("Confirmed (YES)", "Confirmados (SIM)") },
    { id: "declined", label: t("Declined (NO)", "Recusados (NÃO)") },
    { id: "archived", label: t("Archived", "Arquivados") },
  ];

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return applications.filter((cand) => {
      // 1. Saved view logic
      if (activeView === "active") {
        if (cand.status === "archived" || cand.status === "rejected") return false;
      } else if (activeView === "awaiting_booking") {
        if (cand.status === "archived" || cand.status === "rejected" || cand.testSlot) return false;
      } else if (activeView === "test_booked") {
        if (!cand.testSlot || cand.status === "archived") return false;
      } else if (activeView === "tested") {
        if (!cand.attendedAt || cand.status === "archived") return false;
      } else if (activeView === "next_phase") {
        if (cand.nextPhaseStatus !== "selected" && cand.nextPhaseStatus !== "invited" && cand.nextPhaseStatus !== "confirmed") return false;
      } else if (activeView === "confirmed") {
        if (cand.nextPhaseResponse !== "yes") return false;
      } else if (activeView === "declined") {
        if (cand.nextPhaseResponse !== "no" && cand.nextPhaseStatus !== "declined") return false;
      } else if (activeView === "archived") {
        if (cand.status !== "archived") return false;
      } else if (activeView === "all") {
        // By default on "all", hide archived unless specifically filtered
        if (cand.status === "archived" && stageFilter !== "archived") return false;
      }

      // 2. Role filter
      if (roleFilter !== "all" && cand.role !== roleFilter && !(roleFilter === "cctv" && !cand.role)) {
        return false;
      }

      // 3. Stage filter
      if (stageFilter !== "all" && cand.status !== stageFilter) {
        return false;
      }

      // 4. Sex filter
      if (sexFilter !== "all" && cand.sex !== sexFilter) {
        return false;
      }

      // 5. Experience filter
      if (expFilter !== "all" && cand.experience !== expFilter) {
        return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${cand.name} ${cand.email} ${cand.whatsapp} ${cand.lastProfession || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [applications, activeView, roleFilter, stageFilter, sexFilter, expFilter, searchQuery]);

  // Pagination calculations
  const totalItems = filteredCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + pageSize);

  // Selection handlers
  const isAllOnPageSelected =
    paginatedCandidates.length > 0 &&
    paginatedCandidates.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllOnPageSelected) {
      paginatedCandidates.forEach((c) => next.delete(c.id));
    } else {
      paginatedCandidates.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Stage badge formatting
  const renderStageBadge = (status: string) => {
    switch (status) {
      case "shortlisted":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200">{t("Shortlisted", "Pré-selecionado")}</span>;
      case "test_invited":
      case "invited":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{t("Invited", "Convocado")}</span>;
      case "test_booked":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{t("Booked", "Agendado")}</span>;
      case "interest_confirmed":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">{t("Interest Confirmed", "Interesse Confirmado")}</span>;
      case "interest_declined":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{t("Interest Declined", "Interesse Recusado")}</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-500 border border-slate-200">{t("Archived", "Arquivado")}</span>;
      case "rejected":
      case "disqualified":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-red-50 text-red-700 border border-red-200">{t("Not Selected", "Não Selecionado")}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-50 text-slate-600 border border-slate-200">{t("Under Review", "Em Análise")}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Candidates Pipeline", "Gestão de Candidaturas")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              `${totalItems} candidates matching current filters`,
              `${totalItems} candidaturas no filtro selecionado`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={() => {
              const headers = [
                t("ID", "ID"),
                t("Name", "Nome"),
                t("Email", "Email"),
                t("WhatsApp", "WhatsApp"),
                t("Role", "Cargo"),
                t("Status", "Estado"),
                t("Slot", "Turno"),
                t("Attendance", "Presença"),
                t("Score", "Pontuação"),
              ];
              const rows = filteredCandidates.map((c) => [
                `"${c.id}"`,
                `"${c.name}"`,
                `"${c.email}"`,
                `"${c.whatsapp}"`,
                `"${c.role || "cctv"}"`,
                `"${c.status}"`,
                `"${c.testSlot || ""}"`,
                c.attendedAt ? `"${t("Attended", "Presente")}"` : `"${t("Awaiting", "Aguardado")}"`,
                `"${c.testScore || ""}"`,
              ]);
              const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `overwatch-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>{t("Export CSV", "Exportar CSV")}</span>
          </button>
        </div>
      </div>

      {/* Saved View Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 admin-scrollbar">
        {savedViews.map((sv) => (
          <button
            key={sv.id}
            type="button"
            onClick={() => handleViewChange(sv.id)}
            className={`px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeView === sv.id
                ? "border-sky-600 text-sky-700 font-semibold bg-sky-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {sv.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          autoComplete="off"
          className="relative flex-1 min-w-[240px] max-w-md"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            name="candidate_roster_search_query"
            id="candidate_roster_search_query"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("Search candidates by name, email, phone...", "Pesquisar por nome, email, telefone...")}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 [::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title={t("Clear search", "Limpar pesquisa")}
            >
              <X size={13} />
            </button>
          )}
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">{t("All Roles", "Todas as Vagas")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === "pt" ? r.pt : r.en}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">{t("All Genders", "Todos Géneros")}</option>
            <option value="female">{t("Female Only", "Apenas Mulheres")}</option>
            <option value="male">{t("Male Only", "Apenas Homens")}</option>
          </select>

          {/* Experience Filter */}
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">{t("All Experience", "Qualquer Experiência")}</option>
            <option value="yes">{t("With CCTV Exp", "Com Exp. CCTV")}</option>
            <option value="no">{t("No CCTV Exp", "Sem Exp. CCTV")}</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (when candidates selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold">
              {t(`${selectedIds.size} selected`, `${selectedIds.size} selecionados`)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (onBulkStatusChange) {
                  await onBulkStatusChange(Array.from(selectedIds), "shortlisted");
                  setSelectedIds(new Set());
                }
              }}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              {t("Set Shortlisted", "Marcar Pré-selecionado")}
            </button>

            <button
              type="button"
              onClick={() => setArchiveModalOpen(true)}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Archive size={13} />
              <span>{t("Archive with Reason", "Arquivar")}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-slate-400 hover:text-white"
              title={t("Clear selection", "Limpar seleção")}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto admin-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5">{t("Candidate", "Candidato")}</th>
                <th className="px-4 py-2.5">{t("Role", "Função")}</th>
                <th className="px-4 py-2.5">{t("Contact", "Contacto")}</th>
                <th className="px-4 py-2.5">{t("Date Applied", "Data")}</th>
                <th className="px-4 py-2.5">{t("Stage", "Estado")}</th>
                <th className="px-4 py-2.5">{t("Test Score", "Pontuação")}</th>
                <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    {t("No candidates match the specified criteria.", "Nenhum candidato encontrado com estes critérios.")}
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => {
                  const isSelected = selectedIds.has(candidate.id);
                  const roleObj = roles.find((r) => r.id === candidate.role);
                  const roleLabel = roleObj ? (lang === "pt" ? roleObj.pt : roleObj.en) : (candidate.role || "Operadora de CCTV");

                  return (
                    <tr
                      key={candidate.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-sky-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(candidate.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/recruitment/candidates/${candidate.id}?${searchParams.toString()}`}
                          className="font-semibold text-slate-900 hover:text-sky-700 block truncate max-w-[200px]"
                        >
                          {candidate.name}
                        </Link>
                        <div className="text-[0.7rem] text-slate-400 truncate max-w-[200px]">
                          {candidate.email}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                        {roleLabel}
                      </td>

                      <td className="px-4 py-3 font-mono text-[0.75rem] text-slate-600 whitespace-nowrap">
                        {formatPhoneDisplay(candidate.whatsapp)}
                      </td>

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[0.7rem]">
                        {new Date(candidate.createdAt).toLocaleDateString("pt-MZ")}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStageBadge(candidate.status)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {candidate.testScore ? (
                          <span className="font-bold text-slate-900">{candidate.testScore}%</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/recruitment/candidates/${candidate.id}?${searchParams.toString()}`}
                          className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>{t("Profile", "Perfil")}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span>
              {t("Showing", "A mostrar")}{" "}
              <strong className="text-slate-900 font-medium">
                {totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}
              </strong>{" "}
              {t("of", "de")} <strong className="text-slate-900 font-medium">{totalItems}</strong>
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                const sz = parseInt(e.target.value, 10);
                setPageSize(sz);
                setCurrentPage(1);
                updateUrlParams({ size: sz, page: 1 });
              }}
              className="ml-2 px-2 py-1 border border-slate-200 rounded text-xs text-slate-700 bg-white"
            >
              <option value="25">25 / {t("page", "página")}</option>
              <option value="50">50 / {t("page", "página")}</option>
              <option value="100">100 / {t("page", "página")}</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                setCurrentPage(prev);
                updateUrlParams({ page: prev });
              }}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 text-slate-700 font-medium text-xs">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                const next = Math.min(totalPages, currentPage + 1);
                setCurrentPage(next);
                updateUrlParams({ page: next });
              }}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Archive size={16} className="text-slate-600" />
              <span>{t("Archive Candidate Records", "Arquivar Candidaturas")}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `Select the operational reason for archiving ${selectedIds.size} candidate(s). Candidate records and documents remain preserved and searchable in recruitment archives.`,
                `Indique o motivo operacional do arquivo para as ${selectedIds.size} candidaturas selecionadas. Os registos e documentos permanecem salvaguardados e pesquisáveis no histórico.`
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("Archive Reason", "Motivo do Arquivo")}
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
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
                  if (onBulkArchive) {
                    await onBulkArchive(Array.from(selectedIds), archiveReason);
                    setSelectedIds(new Set());
                    setArchiveModalOpen(false);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer"
              >
                {t("Confirm Archive", "Confirmar Arquivo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
