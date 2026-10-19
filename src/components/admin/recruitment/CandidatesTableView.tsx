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
  CalendarCheck,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
} from "lucide-react";
import { Application, Role, stages, formatPhoneDisplay, formatSlotDisplay } from "@/lib/careers";
import { classifyCandidateLocation, LocationFilterValue } from "@/lib/location-utils";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { useActiveRole } from "../shell/ActiveRoleContext";
import CelebrationOverlay from "@/components/admin/ui/CelebrationOverlay";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import StickyScrollContainer from "@/components/admin/ui/StickyScrollContainer";

interface CandidatesTableViewProps {
  applications: Application[];
  roles: Role[];
  lang?: "pt" | "en";
  onBulkStatusChange?: (ids: string[], status: string) => Promise<void>;
  onBulkArchive?: (ids: string[], reason: string) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
}

export const CandidatesTableView: React.FC<CandidatesTableViewProps> = ({
  applications,
  roles,
  lang: propLang,
  onBulkStatusChange,
  onBulkArchive,
  onRefresh,
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
  const urlLoc = (searchParams.get("loc") as LocationFilterValue) || "all";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlPageSize = parseInt(searchParams.get("size") || "25", 10);

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeView, setActiveView] = useState(urlView);
  const [roleFilter, setRoleFilter] = useState(urlRole);
  const [stageFilter, setStageFilter] = useState(urlStage);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(urlLoc);
  const [sexFilter, setSexFilter] = useState<"all" | "female" | "male">("all");
  const [expFilter, setExpFilter] = useState<"all" | "yes" | "no">("all");
  const [currentPage, setCurrentPage] = useState(isNaN(urlPage) ? 1 : urlPage);
  const [pageSize, setPageSize] = useState(isNaN(urlPageSize) ? 25 : urlPageSize);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<string>("Not Selected for Next Phase");
  const [declineLocationModalOpen, setDeclineLocationModalOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("");
  const [isPreviewSending, setIsPreviewSending] = useState(false);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [declineLocationBusy, setDeclineLocationBusy] = useState(false);
  const [celebrationState, setCelebrationState] = useState<{
    show: boolean;
    variant: "next_phase" | "hired" | "shortlisted";
    title?: string;
    subtitle?: string;
  }>({ show: false, variant: "next_phase" });

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

  const handleLocationChange = (loc: LocationFilterValue) => {
    setLocationFilter(loc);
    setCurrentPage(1);
    updateUrlParams({ loc, page: 1 });
  };

  useEffect(() => {
    const r = searchParams.get("role") || "all";
    setRoleFilter(r);
    const l = (searchParams.get("loc") as LocationFilterValue) || "all";
    setLocationFilter(l);
  }, [searchParams]);

  const { activeRole, roles: roleDefs } = useActiveRole();

  // Find active role capabilities
  const currentRoleDef = roleDefs.find((r) => r.id === roleFilter) || (roleFilter === "all" ? null : activeRole);
  const pipelineStages = currentRoleDef?.pipelineStages || (roleFilter === "all" ? ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"] : ["applications", "screening", "interview", "hired"]);
  const hasTesting = pipelineStages.includes("testing");
  const hasNextPhase = pipelineStages.includes("next_phase");

  // Saved Views Definitions dynamically tailored to role
  const savedViews = useMemo(() => {
    const list = [
      { id: "all", label: t("All Candidates", "Todos") },
      { id: "active", label: t("Active Pipeline", "Funil Ativo") },
    ];

    if (hasTesting) {
      list.push(
        { id: "awaiting_booking", label: t("Awaiting Test Booking", "Pendente Agendamento") },
        { id: "test_booked", label: t("Test Booked", "Teste Agendado") },
        { id: "tested", label: t("Tested", "Testados") }
      );
    } else {
      list.push(
        { id: "screened", label: t("CV Screened / Qualified", "Triagem / Qualificados") },
        { id: "interview", label: t("Interview Stage", "Em Entrevista") }
      );
    }

    if (hasNextPhase) {
      list.push(
        { id: "next_phase", label: t("Next Phase Cohort", "Turma Próxima Fase") },
        { id: "confirmed", label: t("Confirmed (YES)", "Confirmados (SIM)") },
        { id: "declined", label: t("Declined (NO)", "Recusados (NÃO)") }
      );
    } else {
      list.push(
        { id: "hired", label: t("Hired & Admitted", "Contratados") }
      );
    }

    list.push({ id: "archived", label: t("Archived", "Arquivados") });
    return list;
  }, [hasTesting, hasNextPhase, lang]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return applications.filter((cand) => {
      // 1. Saved view logic
      if (activeView === "active") {
        if (cand.status === "archived" || cand.status === "rejected") return false;
      } else if (activeView === "screened") {
        if (cand.status === "archived" || cand.status === "rejected") return false;
        const isScreened =
          Boolean(cand.screeningResult?.passedMandatory) ||
          (typeof cand.screeningScore === "number" && cand.screeningScore >= 50) ||
          cand.status === "shortlisted" ||
          cand.status === "screening" ||
          cand.status === "interview" ||
          cand.status === "hired";
        if (!isScreened) return false;
      } else if (activeView === "interview") {
        if (cand.status !== "interview") return false;
      } else if (activeView === "hired") {
        if (cand.status !== "hired") return false;
      } else if (activeView === "awaiting_booking") {
        if (cand.status === "archived" || cand.status === "rejected" || cand.testSlot) return false;
      } else if (activeView === "test_booked") {
        if (!cand.testSlot || cand.status === "archived") return false;
      } else if (activeView === "tested") {
        if (!cand.attendedAt || cand.status === "archived") return false;
      } else if (activeView === "next_phase") {
        const isNp =
          cand.nextPhaseStatus === "selected" ||
          cand.nextPhaseStatus === "invited" ||
          cand.nextPhaseStatus === "confirmed" ||
          cand.status === "next_phase_selected" ||
          cand.status === "next_phase_invited" ||
          cand.status === "interest_confirmed" ||
          Boolean(cand.nextPhaseToken);
        if (!isNp) return false;
      } else if (activeView === "confirmed") {
        const isConf =
          cand.nextPhaseResponse === "yes" ||
          cand.nextPhaseStatus === "confirmed" ||
          cand.status === "interest_confirmed";
        if (!isConf) return false;
      } else if (activeView === "declined") {
        const isDecl =
          cand.nextPhaseResponse === "no" ||
          cand.nextPhaseStatus === "declined" ||
          cand.status === "interest_declined";
        if (!isDecl) return false;
      } else if (activeView === "archived") {
        if (cand.status !== "archived") return false;
      } else if (activeView === "all") {
        // If user is actively searching, search across all candidates including archived
        if (!searchQuery.trim() && cand.status === "archived" && stageFilter !== "archived") return false;
      }

      // 2. Role filter (robustly normalize CCTV operator aliases)
      if (roleFilter !== "all") {
        const isCandCctv = !cand.role || cand.role === "cctv" || cand.role === "cctv_operator";
        const isFilterCctv = roleFilter === "cctv" || roleFilter === "cctv_operator";
        if (isFilterCctv && !isCandCctv) return false;
        if (!isFilterCctv && cand.role !== roleFilter) return false;
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

      // 6. Location filter (Mozambique vs Outside Mozambique)
      if (locationFilter !== "all") {
        const locInfo = classifyCandidateLocation(cand);
        if (locInfo.group !== locationFilter) return false;
      }

      // 7. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${cand.id} ${cand.id.slice(0, 8)} ${cand.name} ${cand.email} ${cand.whatsapp} ${cand.nextPhaseToken || ""} ${cand.lastProfession || ""} ${cand.currentLocation || ""} ${cand.yearsCctvExperience || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [applications, activeView, roleFilter, stageFilter, sexFilter, expFilter, locationFilter, searchQuery]);

  // True Gestor Técnico outside-MZ count (always from full list, role-independent)
  const gestorTecnicoOutsideMzCount = useMemo(() =>
    applications.filter(
      (a) =>
        (a.role === "cctv_technical_manager" || a.role === "technical") &&
        classifyCandidateLocation(a).group === "outside_mozambique"
    ).length,
    [applications]
  );

  // When the Outside MZ filter is active but role = "all", the banner count
  // will be the full filtered list (may include other roles). Compute the
  // role-scoped count to display in the banner instead.
  const bannerOutsideCount =
    roleFilter === "cctv_technical_manager" || roleFilter === "technical"
      ? filteredCandidates.length
      : gestorTecnicoOutsideMzCount;

  const bannerShowsAllRoles =
    locationFilter === "outside_mozambique" &&
    roleFilter === "all";

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
  const renderStageBadge = (cand: Application) => {
    if (cand.nextPhaseResponse === "yes" || cand.nextPhaseStatus === "confirmed") {
      return (
        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
          ✓ {t("Confirmed YES", "Confirmou SIM")}
        </span>
      );
    }
    if (cand.nextPhaseResponse === "no" || cand.nextPhaseStatus === "declined") {
      return (
        <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          ✕ {t("Declined NO", "Recusou NÃO")}
        </span>
      );
    }
    if (cand.nextPhaseInvitedAt || cand.nextPhaseStatus === "invited") {
      return (
        <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {t("Next Phase Invited", "Convocada Próx. Fase")}
        </span>
      );
    }
    switch (cand.status) {
      case "shortlisted":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200">{t("Shortlisted", "Pré-selecionado")}</span>;
      case "test_invited":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{t("Invited", "Convocado")}</span>;
      case "test_booked":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{t("Booked", "Agendado")}</span>;
      case "interest_confirmed":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">{t("Interest Confirmed", "Interesse Confirmado")}</span>;
      case "interest_declined":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{t("Interest Declined", "Interesse Recusado")}</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-slate-100 text-slate-500 border border-slate-200">{t("Archived", "Arquivado")}</span>;
      case "not_advancing":
        return <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-red-50 text-red-700 border border-red-200">{t("Not Advancing", "Não Avança")}</span>;
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
                t("Technical Match", "Match Técnico"),
                t("Test Score", "Pontuação Teste"),
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
                `"${c.screeningResult ? (c.screeningResult.passedMandatory ? `${c.screeningResult.matchPercentage}%` : `Not Qualified (${c.screeningResult.matchPercentage}%)`) : ""}"`,
                `"${typeof c.testScore === "number" ? `${c.testScore}%` : ""}"`,
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
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          >
            <option value="all">{t("All Roles", "Todas as Vagas")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === "pt" ? r.pt : r.en}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => handleLocationChange(e.target.value as LocationFilterValue)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
            title={t("Filter by geographical location", "Filtrar por localização geográfica")}
          >
            <option value="all">{t("All Locations", "Todas as Localizações")}</option>
            <option value="mozambique">{t("🇲🇿 Based in Mozambique", "🇲🇿 Em Moçambique (Nacional)")}</option>
            <option value="outside_mozambique">{t("🌐 Outside Mozambique", "🌐 Fora de Moçambique (Internacional)")}</option>
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
              disabled={bulkActionBusy}
              onClick={async () => {
                if (onBulkStatusChange) {
                  setBulkActionBusy(true);
                  try {
                    await onBulkStatusChange(Array.from(selectedIds), "shortlisted");
                    setCelebrationState({
                      show: true,
                      variant: "shortlisted",
                      title: t(
                        `${selectedIds.size} Candidates Shortlisted!`,
                        `${selectedIds.size} Candidatos Pré-selecionados!`,
                      ),
                      subtitle: t(
                        "Candidates are placed in the shortlisted queue for test scheduling and assessment.",
                        "Os candidatos foram colocados na lista de convocatória para agendamento de provas.",
                      ),
                    });
                    setSelectedIds(new Set());
                  } finally {
                    setBulkActionBusy(false);
                  }
                }
              }}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {bulkActionBusy ? (
                <>
                  <OverwatchOrbitLoader size="xs" theme="dark" className="shrink-0" />
                  <span>{t("Processing...", "A processar...")}</span>
                </>
              ) : (
                <span>{t("Set Shortlisted", "Marcar Pré-selecionado")}</span>
              )}
            </button>

            {hasNextPhase ? (
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={async () => {
                  if (onBulkStatusChange) {
                    setBulkActionBusy(true);
                    try {
                      await onBulkStatusChange(Array.from(selectedIds), "next_phase_selected");
                      setCelebrationState({
                        show: true,
                        variant: "next_phase",
                        title: t(
                          `${selectedIds.size} Candidates Advanced to Next Phase!`,
                          `${selectedIds.size} Candidatos Avançados para a Próxima Fase!`,
                        ),
                        subtitle: t(
                          "Candidates are now selected and approved for next-phase training and assessment.",
                          "Os candidatos foram selecionados e aprovados para a convocatória da próxima fase.",
                        ),
                      });
                      setSelectedIds(new Set());
                    } finally {
                      setBulkActionBusy(false);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Award size={13} />
                <span>{t("Advance to Next Phase", "Avançar p/ Próx. Fase")}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={async () => {
                  if (onBulkStatusChange) {
                    setBulkActionBusy(true);
                    try {
                      await onBulkStatusChange(Array.from(selectedIds), "interview");
                      setCelebrationState({
                        show: true,
                        variant: "next_phase",
                        title: t(
                          `${selectedIds.size} Candidates Advanced to Interview!`,
                          `${selectedIds.size} Candidatos Convocados para Entrevista!`,
                        ),
                        subtitle: t(
                          "Candidates are now placed in the interview pipeline for technical evaluation.",
                          "Os candidatos estão agora na etapa de entrevistas presenciais para avaliação técnica.",
                        ),
                      });
                      setSelectedIds(new Set());
                    } finally {
                      setBulkActionBusy(false);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <CalendarCheck size={13} />
                <span>{t("Advance to Interview", "Convocar para Entrevista")}</span>
              </button>
            )}

            {/* Mark as Hired */}
            <button
              type="button"
              disabled={bulkActionBusy}
              onClick={async () => {
                if (onBulkStatusChange) {
                  setBulkActionBusy(true);
                  try {
                    await onBulkStatusChange(Array.from(selectedIds), "hired");
                    setCelebrationState({
                      show: true,
                      variant: "hired",
                      title: t(
                        `${selectedIds.size} Candidates Successfully Hired!`,
                        `${selectedIds.size} Candidatos Contratados com Sucesso!`
                      ),
                      subtitle: t(
                        "Candidates are officially confirmed as hired and ready for onboarding.",
                        "Os candidatos foram oficializados como admitidos e prontos para integração."
                      ),
                    });
                    setSelectedIds(new Set());
                  } finally {
                    setBulkActionBusy(false);
                  }
                }
              }}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 size={13} />
              <span>{t("Mark Hired", "Admitir / Contratar")}</span>
            </button>

            {/* Direct Stage Selector Dropdown */}
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <select
                disabled={bulkActionBusy}
                defaultValue=""
                onChange={async (e) => {
                  const targetStatus = e.target.value;
                  if (!targetStatus || !onBulkStatusChange) return;
                  setBulkActionBusy(true);
                  try {
                    await onBulkStatusChange(Array.from(selectedIds), targetStatus);
                    if (targetStatus === "next_phase_selected" || targetStatus === "next_phase_invited") {
                      setCelebrationState({
                        show: true,
                        variant: "next_phase",
                        title: t(
                          `${selectedIds.size} Candidates Advanced to Next Phase!`,
                          `${selectedIds.size} Candidatos Avançados para a Próxima Fase!`
                        ),
                        subtitle: t(
                          "Candidates are now selected and approved for next-phase training and assessment.",
                          "Os candidatos foram selecionados e aprovados para a convocatória da próxima fase."
                        ),
                      });
                    } else if (targetStatus === "hired") {
                      setCelebrationState({
                        show: true,
                        variant: "hired",
                        title: t(
                          `${selectedIds.size} Candidates Successfully Hired!`,
                          `${selectedIds.size} Candidatos Contratados com Sucesso!`
                        ),
                        subtitle: t(
                          "Candidates are officially confirmed as hired and ready for onboarding.",
                          "Os candidatos foram oficializados como admitidos e prontos para integração."
                        ),
                      });
                    }
                    setSelectedIds(new Set());
                  } finally {
                    setBulkActionBusy(false);
                    e.target.value = "";
                  }
                }}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="" disabled>{t("Move to Stage...", "Mover para Etapa...")}</option>
                {stages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Decline Candidates Outside Mozambique */}
            <button
              type="button"
              disabled={bulkActionBusy}
              onClick={() => setDeclineLocationModalOpen(true)}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={t("Decline selected candidates based outside Mozambique", "Recusar candidatos selecionados com base fora de Moçambique")}
            >
              <Globe size={13} />
              <span>{t("Decline Outside MZ", "Recusar Fora de Moçambique")}</span>
            </button>

            <button
              type="button"
              onClick={() => setArchiveModalOpen(true)}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Archive size={13} />
              <span>{t("Archive with Reason", "Arquivar")}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title={t("Clear selection", "Limpar seleção")}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Outside Mozambique Notice & Quick Action Banner */}
      {locationFilter === "outside_mozambique" && (
        <div className="space-y-2">
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Globe size={16} />
              </div>
              <div>
                <div className="font-semibold text-amber-950">
                  {bannerShowsAllRoles
                    ? t(
                        `Gestor Técnico: ${bannerOutsideCount} candidate(s) outside Mozambique (showing all roles: ${filteredCandidates.length} total)`,
                        `Gestor Técnico: ${bannerOutsideCount} candidato(s) fora de Moçambique (a mostrar todos os cargos: ${filteredCandidates.length} total)`
                      )
                    : t(
                        `Displaying ${filteredCandidates.length} candidate(s) based outside Mozambique`,
                        `A visualizar ${filteredCandidates.length} candidato(s) residentes fora de Moçambique`
                      )}
                </div>
                <div className="text-[11px] text-amber-800">
                  {bannerShowsAllRoles
                    ? t(
                        "⚠ Filter by 'Gestor Técnico' role above before using Decline All.",
                        "⚠ Filtre pelo cargo 'Gestor Técnico' antes de usar Recusar Todos."
                      )
                    : t(
                        "Leadership policy: Gestor Técnico role requires immediate physical availability on-site in Mozambique.",
                        "Directriz da Direcção: a função de Gestor Técnico requer disponibilidade física presencial em Moçambique."
                      )}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={bannerShowsAllRoles}
              onClick={() => {
                setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
                setDeclineLocationModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-xs shrink-0 cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
              title={bannerShowsAllRoles ? t("Filter by Gestor Técnico role first", "Filtre pelo cargo Gestor Técnico primeiro") : undefined}
            >
              <UserX size={13} />
              <span>{t(`Review & Decline All (${bannerOutsideCount})`, `Rever e Recusar Todos (${bannerOutsideCount})`)}</span>
            </button>
          </div>
          {bannerShowsAllRoles && (
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-800">
              <AlertCircle size={13} className="shrink-0 text-sky-600" />
              <span>
                {t(
                  `The table shows ${filteredCandidates.length} candidates outside Mozambique across all roles. The decline action targets Gestor Técnico only (${bannerOutsideCount} candidates). Select "Gestor Técnico" in the Role filter above to enable the Decline All button.`,
                  `A tabela mostra ${filteredCandidates.length} candidatos fora de Moçambique em todos os cargos. A acção de recusa aplica-se apenas ao Gestor Técnico (${bannerOutsideCount} candidatos). Seleccione "Gestor Técnico" no filtro de cargo acima para activar o botão.`
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <StickyScrollContainer>
          <table className="w-full min-w-[980px] text-left border-collapse">
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
                <th className="px-4 py-2.5">{t("Technical Match", "Match Técnico")}</th>
                {hasTesting && (
                  <th className="px-4 py-2.5">{t("Test Score", "Pontuação Teste")}</th>
                )}
                <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={hasTesting ? 9 : 8} className="text-center py-12 text-slate-400 text-xs">
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
                          className="block group"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 hover:text-sky-700 truncate max-w-[180px]">
                              {candidate.name}
                            </span>
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[0.62rem] font-mono font-bold text-slate-600">
                              #{candidate.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5 text-[0.7rem] text-slate-400 truncate max-w-[220px]">
                          <span className="truncate">{candidate.email}</span>
                          {candidate.currentLocation ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[0.62rem] font-medium shrink-0 ${
                                classifyCandidateLocation(candidate).group === "outside_mozambique"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-slate-50 text-slate-600 border border-slate-200"
                              }`}
                              title={candidate.currentLocation}
                            >
                              {classifyCandidateLocation(candidate).group === "outside_mozambique" ? "🌐" : "🇲🇿"} {candidate.currentLocation}
                            </span>
                          ) : null}
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
                        {renderStageBadge(candidate)}
                      </td>

                      {/* Technical Application Screening Match */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {candidate.screeningResult ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[0.68rem] font-bold ${
                              candidate.screeningResult.passedMandatory
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {candidate.screeningResult.passedMandatory
                              ? `${candidate.screeningResult.matchPercentage}% ${t("Match", "Score")}`
                              : `${t("Not Qualified", "Não Qualif.")} (${candidate.screeningResult.matchPercentage}%)`}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Testing Stage Test Score (Exam / Practical) */}
                      {hasTesting && (
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          {typeof candidate.testScore === "number" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.68rem] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {candidate.testScore}%
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {candidate.nextPhaseToken && (
                            <a
                              href={`/pt/careers/next-phase/${candidate.nextPhaseToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title={t("Open Dedicated Next Phase Link", "Abrir Link Dedicado da Próxima Fase")}
                            >
                              <ExternalLink size={11} className="text-emerald-600" />
                              <span>{t("Portal", "Portal")}</span>
                            </a>
                          )}
                          <Link
                            href={`/admin/recruitment/candidates/${candidate.id}?${searchParams.toString()}`}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye size={12} className="text-slate-500" />
                            <span>{t("Profile", "Perfil")}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </StickyScrollContainer>

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
                <option value="Outside Mozambique">{t("Outside Mozambique (Presencial Requirement)", "Não Reside em Moçambique (Requisito Presencial)")}</option>
                <option value="Duplicate">{t("Duplicate Application", "Candidatura Duplicada")}</option>
                <option value="Recruitment Closed">{t("Recruitment Closed", "Concurso Encerrado")}</option>
                <option value="Other">{t("Other Reason", "Outro Motivo")}</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={() => setArchiveModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={async () => {
                  if (onBulkArchive) {
                    setBulkActionBusy(true);
                    try {
                      await onBulkArchive(Array.from(selectedIds), archiveReason);
                      setSelectedIds(new Set());
                      setArchiveModalOpen(false);
                      if (onRefresh) await onRefresh();
                    } finally {
                      setBulkActionBusy(false);
                    }
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {bulkActionBusy ? (
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

      {/* Decline Outside Mozambique Confirmation Modal */}
      {declineLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <div>{t("Decline Candidates Outside Mozambique", "Recusar Candidatos Fora de Moçambique")}</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    {t("Official Leadership Template · Gestor Técnico", "Modelo Oficial da Direcção · Gestor Técnico")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeclineLocationModalOpen(false);
                  setPreviewResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <div className="font-semibold text-slate-800 mb-1">
                {t(
                  `Target Audience: ${
                    selectedIds.size > 0
                      ? `${selectedIds.size} selected candidate(s)`
                      : `${applications.filter((a) => (a.role === "technical" || a.role === "cctv_technical_manager") && classifyCandidateLocation(a).group === "outside_mozambique").length} candidate(s) detected outside Mozambique`
                  }`,
                  `Público-Alvo: ${
                    selectedIds.size > 0
                      ? `${selectedIds.size} candidato(s) selecionado(s)`
                      : `${applications.filter((a) => (a.role === "technical" || a.role === "cctv_technical_manager") && classifyCandidateLocation(a).group === "outside_mozambique").length} candidato(s) detectados fora de Moçambique`
                  }`
                )}
              </div>
              <div className="text-slate-600 text-[11px] leading-relaxed">
                {t(
                  "All selected candidates based outside Mozambique will be moved to 'Not Advancing' (Declined) with the formal notification email sent via Brevo.",
                  "Todos os candidatos selecionados com residência fora de Moçambique serão movidos para 'Não Selecionado' com envio do email oficial de notificação via Brevo."
                )}
              </div>
            </div>

            {/* Official Message Template Preview */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-amber-50/40 text-xs space-y-2">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-amber-900 flex items-center justify-between">
                <span>{t("Approved Rejection Email Copy", "Texto do Email Aprovado pela Direcção")}</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">PT-MZ</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-3.5 text-slate-700 text-[12px] leading-relaxed font-sans space-y-2 shadow-2xs">
                <p className="font-semibold text-slate-900">Prezado(a) Candidato(a),</p>
                <p>Agradecemos o seu interesse em integrar a equipa da Overwatch e o tempo dedicado à sua candidatura à posição de Gestor Técnico.</p>
                <p>Após análise da sua candidatura, informamos que, nesta fase, estamos a dar prioridade a candidatos que se encontram actualmente em Moçambique, devido às necessidades operacionais e de disponibilidade presencial associadas à função.</p>
                <p>Por este motivo, não será possível dar seguimento à sua candidatura neste processo de recrutamento.</p>
                <p>Agradecemos novamente o seu interesse e desejamos-lhe sucesso no seu percurso profissional.</p>
                <div className="text-slate-600 pt-2 border-t border-slate-100 text-[11px]">
                  Com os melhores cumprimentos,<br />
                  <strong className="text-slate-900">Equipa de Recrutamento</strong><br />
                  <span>Overwatch Moçambique</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-amber-100/60 px-2 py-1 rounded">
                <strong>Assunto:</strong> Overwatch | Candidatura à Vaga de Gestor Técnico
              </div>
            </div>

            {/* Test Preview Email Option */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                {t("Send Live Test Preview (Optional)", "Enviar Teste de Modelo (Opcional)")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={previewEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="flex-1 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  disabled={isPreviewSending || !previewEmail.includes("@")}
                  onClick={async () => {
                    setIsPreviewSending(true);
                    setPreviewResult(null);
                    try {
                      const res = await fetch("/api/admin/careers/decline-location", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ preview: true, previewEmail }),
                      });
                      const d = await res.json();
                      if (res.ok) {
                        setPreviewResult(t("Live test email sent successfully!", "Email de teste enviado com sucesso!"));
                      } else {
                        setPreviewResult(d.error || "Erro ao enviar teste.");
                      }
                    } catch {
                      setPreviewResult("Falha na comunicação.");
                    } finally {
                      setIsPreviewSending(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                >
                  {isPreviewSending ? <OverwatchOrbitLoader size="xs" theme="dark" /> : <Send size={12} />}
                  <span>{t("Send Test", "Enviar Teste")}</span>
                </button>
              </div>
              {previewResult && (
                <div className="text-[11px] text-emerald-700 font-medium">
                  {previewResult}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={declineLocationBusy}
                onClick={() => {
                  setDeclineLocationModalOpen(false);
                  setPreviewResult(null);
                }}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>

              <button
                type="button"
                disabled={declineLocationBusy}
                onClick={async () => {
                  const targetIds = selectedIds.size > 0 
                    ? Array.from(selectedIds) 
                    : applications
                        .filter((a) => (a.role === "technical" || a.role === "cctv_technical_manager") && classifyCandidateLocation(a).group === "outside_mozambique")
                        .map((a) => a.id);

                  if (targetIds.length === 0) {
                    alert(t("No candidates found outside Mozambique.", "Nenhum candidato encontrado fora de Moçambique."));
                    return;
                  }

                  setDeclineLocationBusy(true);
                  try {
                    const res = await fetch("/api/admin/careers/decline-location", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: targetIds, sendEmail: true }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setCelebrationState({
                        show: true,
                        variant: "shortlisted",
                        title: t(
                          `${data.count} Candidates Successfully Declined!`,
                          `${data.count} Candidaturas Recusadas com Sucesso!`
                        ),
                        subtitle: t(
                          "Rejection notices were dispatched and candidate records updated.",
                          "As notificações foram enviadas e os registos dos candidatos actualizados."
                        ),
                      });
                      setSelectedIds(new Set());
                      setDeclineLocationModalOpen(false);
                      if (onRefresh) await onRefresh();
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("admin:careers-updated"));
                      }
                    } else {
                      alert(data.error || "Erro ao declinar candidatos.");
                    }
                  } catch {
                    alert("Erro ao comunicar com o servidor.");
                  } finally {
                    setDeclineLocationBusy(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
              >
                {declineLocationBusy ? (
                  <>
                    <OverwatchOrbitLoader size="xs" theme="dark" className="shrink-0" />
                    <span>{t("Processing & Sending...", "A enviar notificações...")}</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{t("Confirm & Send Decline Notice", "Confirmar e Enviar Notificações")}</span>
                  </>
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
        title={celebrationState.title}
        subtitle={celebrationState.subtitle}
        variant={celebrationState.variant}
      />
    </div>
  );
};
