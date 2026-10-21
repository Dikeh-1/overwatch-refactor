"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Search,
  Users,
  CheckCircle2,
  Download,
  Clock,
  ArrowLeft,
  FileText,
  Filter,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
  Send,
  Check,
  X,
  Eye,
  Phone,
  Mail,
  ChevronRight,
  Award,
  CalendarCheck,
  ShieldCheck,
  Copy,
  ExternalLink,
  HelpCircle,
  UserCheck,
  MessageSquare,
  SlidersHorizontal,
  ListFilter,
  FileSpreadsheet,
  XCircle,
  AlertTriangle,
  FolderArchive,
  Layers,
  ChevronDown,
  Globe,
  Calendar,
  Sparkles,
  MapPin,
  TrendingUp,
} from "lucide-react";
import {
  Application,
  Role,
  roles as defaultRoles,
  formatPhoneDisplay,
  normalizeSlot,
  formatSlotDisplay,
} from "@/lib/careers";
import { classifyCandidateLocation, LocationFilterValue } from "@/lib/location-utils";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import { CandidateProfileView } from "./CandidateProfileView";
import CohortCommunicationsStudio from "./CohortCommunicationsStudio";
import StickyScrollContainer from "@/components/admin/ui/StickyScrollContainer";
import RichMessageEditor, { AttachmentItem } from "./RichMessageEditor";

interface ArchiveVaultViewProps {
  onBackToActive: () => void;
}

type WorkspaceTab = "overview" | "candidates" | "testing" | "next_phase" | "communications";

export default function ArchiveVaultView({ onBackToActive }: ArchiveVaultViewProps) {
  const { lang, t } = useAdminLanguage();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams?.get("role") || "all";
  const initialCohortParam = searchParams?.get("cohortId");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archivedCohorts, setArchivedCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any | null>(null);
  const [cohortApps, setCohortApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState(initialRoleParam);

  // Active top-level workspace tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  // Candidates Intake sub-filters
  const [candidateSearch, setCandidateSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>("all");

  // Testing & Attendance sub-filters
  const [selectedTestSlot, setSelectedTestSlot] = useState<string>("all");
  const [testSearch, setTestSearch] = useState("");
  const [testAttendanceFilter, setTestAttendanceFilter] = useState<"all" | "attended" | "awaiting">("all");

  // Next Phase sub-filters
  const [nextPhaseResponseFilter, setNextPhaseResponseFilter] = useState<"all" | "confirmed" | "awaiting" | "declined">("all");
  const [nextPhaseSearch, setNextPhaseSearch] = useState("");
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Selection & profile drawer
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [profileCandidate, setProfileCandidate] = useState<Application | null>(null);

  // Load summary of archived cohorts
  const loadArchiveSummary = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/careers/archive");
      if (!res.ok) {
        throw new Error(`Archive API error (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.archivedCohorts)) {
        setArchivedCohorts(data.archivedCohorts);
        if (initialCohortParam) {
          const matched = data.archivedCohorts.find((c: any) => c.id === initialCohortParam);
          if (matched) {
            openCohortDossier(matched);
          }
        }
      } else {
        setArchivedCohorts([]);
      }
    } catch (err: any) {
      console.warn("Failed to load archive:", err);
      setLoadError(err?.message || "Failed to load archive data");
    } finally {
      setLoading(false);
    }
  }, [initialCohortParam]);

  useEffect(() => {
    loadArchiveSummary();
  }, [loadArchiveSummary]);

  useEffect(() => {
    if (initialRoleParam && initialRoleParam !== "all") {
      setFilterRole(initialRoleParam);
    }
  }, [initialRoleParam]);

  const openCohortDossier = async (cohort: any) => {
    setSelectedCohort(cohort);
    setActiveTab("overview");
    setAppsLoading(true);
    setSelectedCandidateIds(new Set());
    setCandidateSearch("");
    setStageFilter("all");
    setLocationFilter("all");
    setSelectedTestSlot("all");
    setNextPhaseResponseFilter("all");
    try {
      const res = await fetch(`/api/admin/careers/archive?cohortId=${encodeURIComponent(cohort.id)}`);
      const data = await res.json();
      if (data.success) {
        setCohortApps(data.applications || []);
      }
    } catch (err) {
      console.warn("Failed to load cohort applications:", err);
    } finally {
      setAppsLoading(false);
    }
  };

  const closeDossier = () => {
    setSelectedCohort(null);
    setActiveTab("overview");
    setCohortApps([]);
    setSelectedCandidateIds(new Set());
    setProfileCandidate(null);
  };

  const reloadCohortApps = async () => {
    if (!selectedCohort) return;
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/admin/careers/archive?cohortId=${encodeURIComponent(selectedCohort.id)}`);
      const data = await res.json();
      if (data.success) {
        setCohortApps(data.applications || []);
      }
    } catch (err) {
      console.warn("Failed to reload cohort apps:", err);
    } finally {
      setAppsLoading(false);
    }
  };

  // Helper checks for pipeline stages
  const isCandidateNextPhase = useCallback((app: Application) => {
    return (
      Boolean(app.nextPhaseStatus) ||
      Boolean(app.nextPhaseInvitedAt) ||
      Boolean(app.nextPhaseResponse) ||
      Boolean(app.nextPhaseToken) ||
      app.status === "next_phase_selected" ||
      app.status === "next_phase_invited" ||
      app.status === "interest_confirmed" ||
      app.status === "interest_declined" ||
      app.status === "awaiting_response"
    );
  }, []);

  const isCandidateConfirmed = useCallback((app: Application) => {
    return (
      app.nextPhaseResponse === "yes" ||
      app.nextPhaseStatus === "confirmed" ||
      app.status === "interest_confirmed"
    );
  }, []);

  const isCandidateAwaiting = useCallback((app: Application) => {
    return (
      (Boolean(app.nextPhaseInvitedAt || app.nextPhaseToken) && !app.nextPhaseResponse) ||
      app.status === "awaiting_response" ||
      app.status === "next_phase_invited" ||
      (app.nextPhaseStatus === "selected" && !app.nextPhaseResponse)
    );
  }, []);

  const isCandidateDeclined = useCallback((app: Application) => {
    return (
      app.nextPhaseResponse === "no" ||
      app.nextPhaseStatus === "declined" ||
      app.status === "interest_declined"
    );
  }, []);

  const isCandidateTested = useCallback((app: Application) => {
    return (
      Boolean(app.testSlot) ||
      Boolean(app.testBookedAt) ||
      Boolean(app.attendedAt) ||
      app.status === "tested" ||
      app.status === "test_booked" ||
      app.status === "test_invited" ||
      typeof app.testScore === "number"
    );
  }, []);

  const isCandidateScreened = useCallback((app: Application) => {
    return (
      Boolean(app.screeningResult?.passedMandatory) ||
      (typeof app.screeningScore === "number" && app.screeningScore >= 50) ||
      app.status === "shortlisted" ||
      app.status === "screening" ||
      (app.grade12 === "yes" && app.shifts === "yes")
    );
  }, []);

  // Pipeline metrics for selected cohort
  const cohortMetrics = useMemo(() => {
    const total = cohortApps.length;
    const screened = cohortApps.filter(isCandidateScreened).length;
    const tested = cohortApps.filter(isCandidateTested).length;
    const nextPhaseAll = cohortApps.filter(isCandidateNextPhase);
    const confirmedCount = nextPhaseAll.filter(isCandidateConfirmed).length;
    const awaitingCount = nextPhaseAll.filter(isCandidateAwaiting).length;
    const declinedCount = nextPhaseAll.filter(isCandidateDeclined).length;
    const interviewCount = cohortApps.filter((a) => a.status === "interview").length;
    const hiredCount = cohortApps.filter((a) => a.status === "hired").length;
    const nonSelectedCount = cohortApps.filter(
      (a) =>
        a.status === "not_advancing" ||
        a.status === "rejected" ||
        (a.screeningResult && !a.screeningResult.passedMandatory) ||
        a.grade12 === "no" ||
        a.shifts === "no"
    ).length;

    return {
      total,
      screened,
      tested,
      nextPhaseTotal: nextPhaseAll.length,
      confirmedCount,
      awaitingCount,
      declinedCount,
      interviewCount,
      hiredCount,
      nonSelectedCount,
    };
  }, [cohortApps, isCandidateScreened, isCandidateTested, isCandidateNextPhase, isCandidateConfirmed, isCandidateAwaiting, isCandidateDeclined]);

  // Breakdown of test slots
  const testSlotsSummary = useMemo(() => {
    const slotsMap = new Map<string, Application[]>();
    cohortApps.forEach((a) => {
      if (a.testSlot) {
        const slotKey = normalizeSlot(a.testSlot);
        if (!slotsMap.has(slotKey)) {
          slotsMap.set(slotKey, []);
        }
        slotsMap.get(slotKey)!.push(a);
      }
    });

    const entries = Array.from(slotsMap.entries()).map(([slot, apps]) => ({
      slot,
      displayName: formatSlotDisplay(slot),
      count: apps.length,
      attendedCount: apps.filter((a) => Boolean(a.attendedAt)).length,
      apps,
    }));

    // Sort chronologically if possible
    entries.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return entries;
  }, [cohortApps]);

  // Filter candidates in Testing & Attendance Tab
  const filteredTestingCandidates = useMemo(() => {
    let list = cohortApps.filter(isCandidateTested);

    if (selectedTestSlot !== "all") {
      list = list.filter((a) => a.testSlot && normalizeSlot(a.testSlot) === selectedTestSlot);
    }

    if (testAttendanceFilter === "attended") {
      list = list.filter((a) => Boolean(a.attendedAt));
    } else if (testAttendanceFilter === "awaiting") {
      list = list.filter((a) => !a.attendedAt);
    }

    if (testSearch.trim()) {
      const q = testSearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.whatsapp && a.whatsapp.toLowerCase().includes(q))
      );
    }

    return list;
  }, [cohortApps, isCandidateTested, selectedTestSlot, testAttendanceFilter, testSearch]);

  // Filter candidates in Next Phase Tab
  const filteredNextPhaseCandidates = useMemo(() => {
    let list = cohortApps.filter(isCandidateNextPhase);

    if (nextPhaseResponseFilter === "confirmed") {
      list = list.filter(isCandidateConfirmed);
    } else if (nextPhaseResponseFilter === "awaiting") {
      list = list.filter(isCandidateAwaiting);
    } else if (nextPhaseResponseFilter === "declined") {
      list = list.filter(isCandidateDeclined);
    }

    if (nextPhaseSearch.trim()) {
      const q = nextPhaseSearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.whatsapp && a.whatsapp.toLowerCase().includes(q))
      );
    }

    // Sort by test score descending
    return list.sort((a, b) => (Number(b.testScore) || 0) - (Number(a.testScore) || 0));
  }, [cohortApps, isCandidateNextPhase, nextPhaseResponseFilter, nextPhaseSearch, isCandidateConfirmed, isCandidateAwaiting, isCandidateDeclined]);

  // Filter candidates in Candidates Intake Tab
  const filteredCandidates = useMemo(() => {
    let list = cohortApps;

    if (stageFilter === "screening") {
      list = list.filter(isCandidateScreened);
    } else if (stageFilter === "testing") {
      list = list.filter(isCandidateTested);
    } else if (stageFilter === "next_phase") {
      list = list.filter(isCandidateNextPhase);
    } else if (stageFilter === "confirmed") {
      list = list.filter(isCandidateConfirmed);
    } else if (stageFilter === "not_selected") {
      list = list.filter(
        (a) =>
          a.status === "not_advancing" ||
          a.status === "rejected" ||
          (a.screeningResult && !a.screeningResult.passedMandatory) ||
          a.grade12 === "no" ||
          a.shifts === "no"
      );
    }

    if (locationFilter !== "all") {
      list = list.filter((a) => classifyCandidateLocation(a).group === locationFilter);
    }

    if (candidateSearch.trim()) {
      const q = candidateSearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.whatsapp && a.whatsapp.toLowerCase().includes(q)) ||
          (a.currentLocation && a.currentLocation.toLowerCase().includes(q))
      );
    }

    return list;
  }, [cohortApps, stageFilter, locationFilter, candidateSearch, isCandidateScreened, isCandidateTested, isCandidateNextPhase, isCandidateConfirmed]);

  // Selection helpers
  const handleToggleSelectAll = (list: Application[]) => {
    if (selectedCandidateIds.size === list.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(list.map((a) => a.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy candidate portal token link
  const handleCopyTokenLink = (app: Application) => {
    const token = app.nextPhaseToken;
    if (!token) return;
    const url = `${window.location.origin}/pt/careers/next-phase/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(app.id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  // CSV Export Function (UTF-8 BOM formatted)
  const downloadDatasetAsCsv = (dataset: Application[], filenamePrefix: string) => {
    const headers = [
      "ID",
      "Nome Completo",
      "Email",
      "WhatsApp / Telefone",
      "Localização Declarada",
      "Região / Grupo",
      "12ª Classe",
      "Disponibilidade Turnos",
      "Turno de Teste",
      "Presença no Teste",
      "Nota do Teste",
      "Estado na Próxima Fase",
      "Resposta às Condições",
      "Opção de Resposta Selecionada",
      "Passe Token Próxima Fase",
      "Estado no Funil",
      "Data de Candidatura",
    ];

    const rows = dataset.map((a) => {
      const locClass = classifyCandidateLocation(a);
      const isConfirmed = isCandidateConfirmed(a);
      const isDeclined = isCandidateDeclined(a);
      const isAwaiting = isCandidateAwaiting(a);
      const conditionResp = isConfirmed
        ? "ACEITOU CONDIÇÕES (SIM)"
        : isDeclined
        ? "RECUSOU (NÃO)"
        : isAwaiting
        ? "AGUARDANDO RESPOSTA"
        : "NÃO SELECIONADO";

      return [
        `"${a.id}"`,
        `"${(a.name || "").replace(/"/g, '""')}"`,
        `"${(a.email || "").replace(/"/g, '""')}"`,
        `"${(a.whatsapp || "").replace(/"/g, '""')}"`,
        `"${(a.currentLocation || "").replace(/"/g, '""')}"`,
        `"${locClass.isMozambique ? (locClass.isMaputoRegion ? "Grande Maputo" : "Moçambique (Outras Províncias)") : "Fora de Moçambique"}"`,
        `"${a.grade12 === "yes" ? "Sim" : "Não"}"`,
        `"${a.shifts === "yes" ? "Sim" : "Não"}"`,
        `"${(a.testSlot || "").replace(/"/g, '""')}"`,
        `"${a.attendedAt ? "Presente" : a.testSlot ? "Aguardando" : "N/A"}"`,
        `"${typeof a.testScore === "number" ? a.testScore : ""}"`,
        `"${(a.nextPhaseStatus || "").replace(/"/g, '""')}"`,
        `"${conditionResp}"`,
        `"${(a.nextPhaseResponseOption || "").replace(/"/g, '""')}"`,
        `"${(a.nextPhaseToken || "").replace(/"/g, '""')}"`,
        `"${(a.status || a.historicalStage || "archived").replace(/"/g, '""')}"`,
        `"${a.createdAt ? new Date(a.createdAt).toISOString() : ""}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCohortMaster = () => {
    if (!selectedCohort || cohortApps.length === 0) return;
    const sanitizedName = selectedCohort.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    downloadDatasetAsCsv(cohortApps, `lote_arquivado_${sanitizedName}_mestre`);
  };

  // Stage Badge Renderer
  const renderStageBadge = (app: Application) => {
    const isConfirmed = isCandidateConfirmed(app);
    const isDeclined = isCandidateDeclined(app);
    const isAwaiting = isCandidateAwaiting(app);

    if (app.status === "hired") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={11} className="text-emerald-600" />
          <span>{t("Hired", "Admitido")}</span>
        </span>
      );
    }
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={11} className="text-emerald-600" />
          <span>{t("Accepted Conditions", "Aceitou Condições (SIM)")}</span>
        </span>
      );
    }
    if (isDeclined) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={11} className="text-rose-600" />
          <span>{t("Declined", "Recusou (NÃO)")}</span>
        </span>
      );
    }
    if (isAwaiting) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={11} className="text-amber-600" />
          <span>{t("Next Phase: Awaiting", "Próxima Fase: Aguardando")}</span>
        </span>
      );
    }
    if (isCandidateNextPhase(app)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Award size={11} className="text-indigo-600" />
          <span>{t("Next Phase Selected", "Selecionada Próxima Fase")}</span>
        </span>
      );
    }
    if (app.attendedAt || typeof app.testScore === "number") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <CalendarCheck size={11} className="text-sky-600" />
          <span>{t("Tested", "Teste Realizado")}</span>
          {typeof app.testScore === "number" && <span className="font-mono font-bold">({app.testScore}/100)</span>}
        </span>
      );
    }
    if (app.testSlot) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Calendar size={11} className="text-blue-600" />
          <span>{t("Slot Booked", "Agendado para Teste")}</span>
        </span>
      );
    }
    if (isCandidateScreened(app)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <ListFilter size={11} className="text-amber-600" />
          <span>{t("Screening Passed", "Triagem / Qualificado")}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <span>{t("Non-Selected", "Não Selecionado")}</span>
      </span>
    );
  };

  // Cohort list filters for View 2
  const filteredCohorts = archivedCohorts.filter((c) => {
    const title = lang === "en" ? (c.roleTitleEn || c.roleTitlePt || "") : (c.roleTitlePt || c.roleTitleEn || "");
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || c.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(archivedCohorts.map((c) => c.roleId)));

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <OverwatchOrbitLoader
          label={t("Accessing Archive Vault...", "A aceder ao Cofre Histórico...")}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW 1: DETAILED COHORT RECRUITMENT WORKSPACE (EXACT OPENED ROLE WORKSPACE)
         ========================================================================= */}
      {selectedCohort ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Sealed Dossier Navigation Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <button
                  onClick={closeDossier}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5 font-bold text-xs"
                  title={t("Back to Cohort Vault List", "Voltar à Lista de Lotes Arquivados")}
                >
                  <ArrowLeft size={16} />
                  <span>{t("Back to Vault", "Voltar aos Lotes")}</span>
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {selectedCohort.department || t("Operations", "Operações")}
                    </span>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <FolderArchive size={11} />
                      {t("Sealed Archive", "Histórico Selado & Preservado")}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={11} />
                      {t("Audit Verified", "100% Auditável")}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                    {selectedCohort.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "en"
                      ? selectedCohort.roleTitleEn || selectedCohort.roleTitlePt
                      : selectedCohort.roleTitlePt || selectedCohort.roleTitleEn}
                    {" • "}
                    {t("Opened:", "Aberto em:")}{" "}
                    {new Date(selectedCohort.openedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")}
                    {" • "}
                    {t("Closed / Archived:", "Encerrado / Arquivado em:")}{" "}
                    {selectedCohort.closedAt
                      ? new Date(selectedCohort.closedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")
                      : t("Concluded Cohort", "Lote Concluído")}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={reloadCohortApps}
                  disabled={appsLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title={t("Refresh data", "Recarregar dados")}
                >
                  <RefreshCw size={13} className={appsLoading ? "animate-spin" : ""} />
                  <span>{t("Refresh", "Actualizar")}</span>
                </button>

                <button
                  onClick={handleExportCohortMaster}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition-colors shadow-2xs cursor-pointer"
                  title={t("Export entire cohort master spreadsheet (.csv)", "Descarregar folha mestra de todo o lote (.csv)")}
                >
                  <FileSpreadsheet size={14} className="text-emerald-700" />
                  <span>{t("Master Sheet (.csv)", "Folha Mestra (.csv)")}</span>
                </button>
              </div>
            </div>

            {/* Top Workspace Navigation Tabs (Identical to Open Role Workspace) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-slate-100 admin-scrollbar">
              {[
                { id: "overview", labelEn: "Overview & Funnel", labelPt: "Visão Geral & Funil", icon: Layers },
                {
                  id: "candidates",
                  labelEn: "Candidates Intake",
                  labelPt: "Candidaturas",
                  icon: Users,
                  count: cohortMetrics.total,
                },
                {
                  id: "testing",
                  labelEn: "Testing & Attendance",
                  labelPt: "Escala & Presenças",
                  icon: CalendarCheck,
                  count: cohortMetrics.tested,
                  badgeColor: "bg-sky-100 text-sky-800",
                },
                {
                  id: "next_phase",
                  labelEn: "Next Phase Cohort",
                  labelPt: "Turma Próxima Fase",
                  icon: Award,
                  count: cohortMetrics.nextPhaseTotal,
                  badgeColor: "bg-emerald-100 text-emerald-800",
                },
                {
                  id: "communications",
                  labelEn: "Communications Studio",
                  labelPt: "Estúdio de Comunicações",
                  icon: Mail,
                },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as WorkspaceTab);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <TabIcon size={14} className={isActive ? "text-sky-400" : "text-slate-400"} />
                    <span>{lang === "en" ? tab.labelEn : tab.labelPt}</span>
                    {typeof tab.count === "number" && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? "bg-slate-800 text-slate-200"
                            : tab.badgeColor || "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =======================================================================
              TAB 1: VISÃO GERAL & FUNIL (OVERVIEW & FUNNEL)
             ======================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Executive Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Total Applications", "Total Geral")}</span>
                    <Users size={14} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{cohortMetrics.total}</div>
                  <span className="text-[11px] text-slate-500">{t("Submissions received", "Candidaturas recebidas")}</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Screening Passed", "Triagem / Qualificados")}</span>
                    <ListFilter size={14} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">{cohortMetrics.screened}</div>
                  <span className="text-[11px] text-slate-500">
                    {cohortMetrics.total > 0 ? `${((cohortMetrics.screened / cohortMetrics.total) * 100).toFixed(1)}%` : "0%"} {t("qualify rate", "taxa de qualificação")}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Tested Attendees", "Convocados / Testados")}</span>
                    <CalendarCheck size={14} className="text-sky-600" />
                  </div>
                  <div className="text-2xl font-black text-sky-600">{cohortMetrics.tested}</div>
                  <span className="text-[11px] text-slate-500">{t("7 Test Sessions", "7 Sessões de Teste")}</span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Next Phase Selected", "Próxima Fase")}</span>
                    <Award size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{cohortMetrics.nextPhaseTotal}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">{t("Approved Candidates", "Candidatas Selecionadas")}</span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Accepted Conditions", "Aceitaram Condições")}</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{cohortMetrics.confirmedCount}</div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {cohortMetrics.nextPhaseTotal > 0 ? `${((cohortMetrics.confirmedCount / cohortMetrics.nextPhaseTotal) * 100).toFixed(0)}%` : "0%"} {t("confirmed (SIM)", "confirmadas (SIM)")}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Hired", "Admitidos")}</span>
                    <ShieldCheck size={14} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{cohortMetrics.hiredCount}</div>
                  <span className="text-[11px] text-slate-500">{t("Final Employment", "Ofertas Finais")}</span>
                </div>
              </div>

              {/* Complete Recruitment Pipeline Funnel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={16} className="text-sky-600" />
                      <span>{t("Recruitment Funnel & Conversion Stages", "Funil de Recrutamento & Taxas de Conversão")}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("Historical drop-off and qualification rates across all stages of this cohort.", "Taxas históricas de passagem e desistência em cada etapa deste lote.")}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {t("Preserved at cohort closure", "Preservado no encerramento da vaga")}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                  {/* Stage 1: Applications */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 relative">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. {t("Intake", "Candidaturas")}</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{cohortMetrics.total}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{t("100% of received pool", "100% da base recebida")}</div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-slate-700 h-full rounded-full w-full" />
                    </div>
                  </div>

                  {/* Stage 2: Screening */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 relative">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">2. {t("CV Screening", "Triagem de CVs")}</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{cohortMetrics.screened}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {cohortMetrics.total > 0 ? `${((cohortMetrics.screened / cohortMetrics.total) * 100).toFixed(1)}%` : "0%"} {t("passed criteria", "cumpriram critérios")}
                    </div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${cohortMetrics.total > 0 ? (cohortMetrics.screened / cohortMetrics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 3: Testing */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 relative">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">3. {t("Testing Roster", "Escala de Testes")}</div>
                    <div className="text-2xl font-black text-sky-600 mt-1">{cohortMetrics.tested}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {cohortMetrics.total > 0 ? `${((cohortMetrics.tested / cohortMetrics.total) * 100).toFixed(1)}%` : "0%"} {t("booked & attended", "agendados & testados")}
                    </div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: `${cohortMetrics.total > 0 ? (cohortMetrics.tested / cohortMetrics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 4: Next Phase */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 relative">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">4. {t("Next Phase", "Próxima Fase")}</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">{cohortMetrics.nextPhaseTotal}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {cohortMetrics.tested > 0 ? `${((cohortMetrics.nextPhaseTotal / cohortMetrics.tested) * 100).toFixed(1)}%` : "0%"} {t("of test attendees", "dos testados")}
                    </div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${cohortMetrics.total > 0 ? (cohortMetrics.nextPhaseTotal / cohortMetrics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 5: Confirmed */}
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 relative">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">5. {t("Confirmed (SIM)", "Aceitaram (SIM)")}</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{cohortMetrics.confirmedCount}</div>
                    <div className="text-[11px] text-emerald-700 font-bold mt-1">
                      {cohortMetrics.nextPhaseTotal > 0 ? `${((cohortMetrics.confirmedCount / cohortMetrics.nextPhaseTotal) * 100).toFixed(0)}%` : "0%"} {t("acceptance rate", "taxa de aceitação")}
                    </div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${cohortMetrics.total > 0 ? (cohortMetrics.confirmedCount / cohortMetrics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Access Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Testing sessions overview */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <CalendarCheck size={15} className="text-sky-600" />
                      <span>{t("Testing Attendance by Session", "Sessões de Testes & Presenças")}</span>
                    </h4>
                    <button
                      onClick={() => setActiveTab("testing")}
                      className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t("View All (104)", "Ver Todos (104)")}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {testSlotsSummary.map((s) => (
                      <div
                        key={s.slot}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs"
                      >
                        <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                          {s.displayName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono font-bold text-[11px]">
                            {s.count} {t("candidates", "candidatos")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next phase cohort preview */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Award size={15} className="text-emerald-600" />
                      <span>{t("Next Phase Roster & Conditions", "Turma Próxima Fase & Condições")}</span>
                    </h4>
                    <button
                      onClick={() => setActiveTab("next_phase")}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t("View Roster (21)", "Ver Turma (21)")}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900">{t("Accepted Conditions (YES):", "Aceitaram Condições (SIM):")}</span>
                      <span className="font-mono font-black text-emerald-700">{cohortMetrics.confirmedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900">{t("Awaiting Response:", "Aguardando Resposta:")}</span>
                      <span className="font-mono font-black text-amber-700">{cohortMetrics.awaitingCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-900">{t("Declined (NO):", "Recusaram (NÃO):")}</span>
                      <span className="font-mono font-black text-rose-700">{cohortMetrics.declinedCount}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab("communications")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Mail size={13} />
                      <span>{t("Open Communications Studio", "Abrir Estúdio de Comunicações")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================================
              TAB 2: CANDIDATURAS (FULL INTAKE TABLE & CANDIDATE DOSSIERS)
             ======================================================================= */}
          {activeTab === "candidates" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Filter Controls Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder={t("Search by name, email, phone, location...", "Pesquisar por nome, email, telefone, localização...")}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors"
                    />
                    {candidateSearch && (
                      <button
                        onClick={() => setCandidateSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Stage Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("Stage:", "Fase:")}</span>
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 focus:outline-none"
                    >
                      <option value="all">{t(`All Stages (${cohortMetrics.total})`, `Todas as Fases (${cohortMetrics.total})`)}</option>
                      <option value="screening">{t(`Screened (${cohortMetrics.screened})`, `Triagem / Qualificados (${cohortMetrics.screened})`)}</option>
                      <option value="testing">{t(`Testing Roster (${cohortMetrics.tested})`, `Agendados p/ Testes (${cohortMetrics.tested})`)}</option>
                      <option value="next_phase">{t(`Next Phase (${cohortMetrics.nextPhaseTotal})`, `Próxima Fase (${cohortMetrics.nextPhaseTotal})`)}</option>
                      <option value="confirmed">{t(`Accepted Conditions (${cohortMetrics.confirmedCount})`, `Aceitaram Condições (${cohortMetrics.confirmedCount})`)}</option>
                      <option value="not_selected">{t(`Non-Selected (${cohortMetrics.nonSelectedCount})`, `Não Selecionados (${cohortMetrics.nonSelectedCount})`)}</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="flex items-center gap-1.5">
                    <Globe size={13} className="text-slate-400 shrink-0" />
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value as LocationFilterValue)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 focus:outline-none"
                    >
                      <option value="all">{t("All Locations", "Todas as Regiões")}</option>
                      <option value="maputo_region">{t("Maputo Metro Area", "Grande Maputo (Maputo/Matola)")}</option>
                      <option value="mozambique_other">{t("Other Mozambique", "Outras Províncias")}</option>
                      <option value="outside_mozambique">{t("Outside Mozambique", "Fora de Moçambique")}</option>
                    </select>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadDatasetAsCsv(filteredCandidates, "candidaturas_filtradas")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{t("Export Filtered (.csv)", "Exportar (.csv)")}</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              {appsLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <OverwatchOrbitLoader label={t("Loading candidates...", "A carregar candidatos...")} size="md" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
                  <AlertCircle size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-700">{t("No candidates found.", "Nenhum candidato encontrado.")}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>
                      {t(`Showing ${filteredCandidates.length} candidate(s)`, `A mostrar ${filteredCandidates.length} candidata(s)`)}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {t("Click any candidate to open full profile & documents", "Clique no nome para abrir o perfil e documentos")}
                    </span>
                  </div>

                  <StickyScrollContainer innerClassName="pb-2">
                    <table className="w-full min-w-[1100px] text-left text-xs text-slate-700 whitespace-nowrap">
                      <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-4 py-3.5 min-w-[220px]">{t("Candidate", "Candidato")}</th>
                          <th className="px-4 py-3.5 min-w-[190px]">{t("Contact Details", "Contactos")}</th>
                          <th className="px-4 py-3.5 min-w-[140px]">{t("Location", "Localização")}</th>
                          <th className="px-4 py-3.5 min-w-[180px]">{t("Pipeline Stage", "Estado no Funil")}</th>
                          <th className="px-4 py-3.5 min-w-[130px]">{t("Test Slot / Score", "Turno / Nota")}</th>
                          <th className="px-4 py-3.5 min-w-[120px] text-center">{t("Attached CV", "CV Anexo")}</th>
                          <th className="px-4 py-3.5 min-w-[120px] text-right">{t("Actions", "Acções")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCandidates.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {app.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setProfileCandidate(app)}
                                    className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-left block truncate cursor-pointer"
                                  >
                                    {app.name}
                                  </button>
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    ID: {app.id.slice(0, 8)} • {new Date(app.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <a
                                  href={`mailto:${app.email}`}
                                  className="text-slate-700 hover:text-sky-600 flex items-center gap-1.5 truncate transition-colors"
                                >
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{app.email}</span>
                                </a>
                                {app.whatsapp && (
                                  <a
                                    href={`https://wa.me/${app.whatsapp.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors font-mono text-[11px]"
                                  >
                                    <Phone size={12} className="text-slate-400 shrink-0" />
                                    <span>{formatPhoneDisplay(app.whatsapp)}</span>
                                  </a>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="text-slate-700 font-medium block truncate max-w-[140px]">
                                {app.currentLocation || "Maputo"}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {classifyCandidateLocation(app).isMaputoRegion
                                  ? "Grande Maputo"
                                  : classifyCandidateLocation(app).isMozambique
                                  ? "Moçambique"
                                  : "Fora de Moçambique"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              {renderStageBadge(app)}
                            </td>

                            <td className="px-4 py-3.5 font-mono text-[11px]">
                              {typeof app.testScore === "number" ? (
                                <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                  {app.testScore}/100
                                </span>
                              ) : app.testSlot ? (
                                <span className="text-slate-600 truncate block max-w-[130px]" title={app.testSlot}>
                                  {app.testSlot.split("–")[0] || app.testSlot}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              <a
                                href={`/api/admin/cv?id=${app.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition-colors shadow-2xs"
                                title={t("Download candidate CV", "Baixar CV do candidato")}
                              >
                                <Download size={12} className="text-slate-600" />
                                <span>{t("Download CV", "Baixar CV")}</span>
                              </a>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setProfileCandidate(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                              >
                                <Eye size={12} />
                                <span>{t("Profile", "Perfil")}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </StickyScrollContainer>
                </div>
              )}
            </div>
          )}

          {/* =======================================================================
              TAB 3: ESCALA & PRESENÇAS (TESTING & ATTENDANCE - 104 CANDIDATES)
             ======================================================================= */}
          {activeTab === "testing" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Top Slot Breakdown Navigation Cards */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CalendarCheck size={16} className="text-sky-600" />
                      <span>{t("Testing Attendance & Session Quotas (104 Booked)", "Escala de Testes Presenciais (104 Convocados)")}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("Breakdown of all candidates across testing sessions with presence status and test scores.", "Distribuição dos candidatos pelas sessões de avaliação com estado de presença e notas.")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-sky-100 text-sky-800 font-bold px-3 py-1 text-xs">
                      {cohortMetrics.tested} {t("Candidates Total", "Candidatos no Total")}
                    </span>
                  </div>
                </div>

                {/* Session Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTestSlot("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTestSlot === "all"
                        ? "bg-sky-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t("All Sessions", "Todas as Sessões")} ({cohortMetrics.tested})
                  </button>
                  {testSlotsSummary.map((s) => (
                    <button
                      key={s.slot}
                      type="button"
                      onClick={() => setSelectedTestSlot(s.slot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedTestSlot === s.slot
                          ? "bg-sky-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{s.displayName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          selectedTestSlot === s.slot ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {s.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-filter controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    placeholder={t("Filter by name, email, or phone...", "Filtrar por nome, email ou telefone...")}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={testAttendanceFilter}
                    onChange={(e) => setTestAttendanceFilter(e.target.value as any)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">{t("All Attendance Status", "Todos os Estados")}</option>
                    <option value="attended">{t("Attended (Present)", "Presente")}</option>
                    <option value="awaiting">{t("Awaiting / Booked", "Aguardando")}</option>
                  </select>

                  <button
                    onClick={() => downloadDatasetAsCsv(filteredTestingCandidates, "escala_testes")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{t("Export (.csv)", "Exportar (.csv)")}</span>
                  </button>
                </div>
              </div>

              {/* Candidates in testing roster table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  {t(
                    `Showing ${filteredTestingCandidates.length} candidate(s) in selected session`,
                    `A mostrar ${filteredTestingCandidates.length} candidato(s) no turno selecionado`
                  )}
                </div>

                <StickyScrollContainer innerClassName="pb-2">
                  <table className="w-full min-w-[1000px] text-left text-xs text-slate-700 whitespace-nowrap">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-4 py-3.5 min-w-[220px]">{t("Candidate", "Candidato")}</th>
                        <th className="px-4 py-3.5 min-w-[190px]">{t("Contact", "Contacto")}</th>
                        <th className="px-4 py-3.5 min-w-[240px]">{t("Assigned Test Slot", "Turno Agendado")}</th>
                        <th className="px-4 py-3.5 min-w-[120px]">{t("Attendance", "Presença")}</th>
                        <th className="px-4 py-3.5 min-w-[120px]">{t("Test Score", "Pontuação")}</th>
                        <th className="px-4 py-3.5 min-w-[120px] text-center">{t("CV", "CV")}</th>
                        <th className="px-4 py-3.5 min-w-[100px] text-right">{t("Action", "Acção")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTestingCandidates.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => setProfileCandidate(app)}
                              className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-left block truncate cursor-pointer"
                            >
                              {app.name}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              {app.currentLocation || "Maputo"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <span className="text-slate-700 block truncate">{app.email}</span>
                              {app.whatsapp && (
                                <span className="text-slate-500 font-mono text-[11px] block">
                                  {formatPhoneDisplay(app.whatsapp)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-slate-800">
                            {app.testSlot || t("No slot assigned", "Sem turno atribuído")}
                          </td>

                          <td className="px-4 py-3.5">
                            {app.attendedAt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check size={11} className="text-emerald-600" />
                                <span>{t("Attended", "Presente")}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={11} className="text-amber-600" />
                                <span>{t("Awaiting", "Aguardando")}</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {typeof app.testScore === "number" ? (
                              <span
                                className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-black ${
                                  app.testScore >= 80
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {app.testScore}/100
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <a
                              href={`/api/admin/cv?id=${app.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 inline-block"
                              title={t("Download CV", "Baixar CV")}
                            >
                              <Download size={13} />
                            </a>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setProfileCandidate(app)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                              title={t("View profile", "Ver perfil")}
                            >
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyScrollContainer>
              </div>
            </div>
          )}

          {/* =======================================================================
              TAB 4: TURMA PRÓXIMA FASE (NEXT PHASE COHORT - 21 SELECTED)
             ======================================================================= */}
          {activeTab === "next_phase" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setNextPhaseResponseFilter("all")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    nextPhaseResponseFilter === "all"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${nextPhaseResponseFilter === "all" ? "text-slate-300" : "text-slate-400"}`}>
                    {t("Selected Class", "Total Turma")}
                  </span>
                  <div className="text-2xl font-black mt-1">{cohortMetrics.nextPhaseTotal}</div>
                  <span className={`text-[11px] block mt-0.5 ${nextPhaseResponseFilter === "all" ? "text-slate-300" : "text-slate-500"}`}>
                    {t("Approved in Testing", "Aprovadas no Teste")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNextPhaseResponseFilter("confirmed")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    nextPhaseResponseFilter === "confirmed"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white border-emerald-200 text-slate-900 hover:bg-emerald-50/30"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${nextPhaseResponseFilter === "confirmed" ? "text-emerald-100" : "text-emerald-800"}`}>
                    {t("Accepted Conditions", "Aceitaram Condições (SIM)")}
                  </span>
                  <div className={`text-2xl font-black mt-1 ${nextPhaseResponseFilter === "confirmed" ? "text-white" : "text-emerald-600"}`}>
                    {cohortMetrics.confirmedCount}
                  </div>
                  <span className={`text-[11px] block mt-0.5 ${nextPhaseResponseFilter === "confirmed" ? "text-emerald-100" : "text-emerald-700 font-semibold"}`}>
                    {cohortMetrics.nextPhaseTotal > 0 ? `${((cohortMetrics.confirmedCount / cohortMetrics.nextPhaseTotal) * 100).toFixed(0)}%` : "0%"} {t("confirmed", "confirmadas")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNextPhaseResponseFilter("awaiting")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    nextPhaseResponseFilter === "awaiting"
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-white border-amber-200 text-slate-900 hover:bg-amber-50/30"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${nextPhaseResponseFilter === "awaiting" ? "text-amber-100" : "text-amber-800"}`}>
                    {t("Awaiting Response", "Aguardando Resposta")}
                  </span>
                  <div className={`text-2xl font-black mt-1 ${nextPhaseResponseFilter === "awaiting" ? "text-white" : "text-amber-600"}`}>
                    {cohortMetrics.awaitingCount}
                  </div>
                  <span className={`text-[11px] block mt-0.5 ${nextPhaseResponseFilter === "awaiting" ? "text-amber-100" : "text-amber-700"}`}>
                    {t("Pending confirmation", "Confirmação pendente")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNextPhaseResponseFilter("declined")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    nextPhaseResponseFilter === "declined"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white border-rose-200 text-slate-900 hover:bg-rose-50/30"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${nextPhaseResponseFilter === "declined" ? "text-rose-100" : "text-rose-800"}`}>
                    {t("Declined", "Recusaram (NÃO)")}
                  </span>
                  <div className={`text-2xl font-black mt-1 ${nextPhaseResponseFilter === "declined" ? "text-white" : "text-rose-600"}`}>
                    {cohortMetrics.declinedCount}
                  </div>
                  <span className={`text-[11px] block mt-0.5 ${nextPhaseResponseFilter === "declined" ? "text-rose-100" : "text-rose-700"}`}>
                    {t("Unavailable for shift", "Indisponível p/ turnos")}
                  </span>
                </button>
              </div>

              {/* Sub-filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={nextPhaseSearch}
                    onChange={(e) => setNextPhaseSearch(e.target.value)}
                    placeholder={t("Search approved candidate...", "Pesquisar candidata aprovada...")}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("communications")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Mail size={13} />
                    <span>{t("Dispatch Official Instructions", "Enviar Instruções de Integração")}</span>
                  </button>

                  <button
                    onClick={() => downloadDatasetAsCsv(filteredNextPhaseCandidates, "turma_proxima_fase")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{t("Export (.csv)", "Exportar (.csv)")}</span>
                  </button>
                </div>
              </div>

              {/* Next phase candidate table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  {t(
                    `Showing ${filteredNextPhaseCandidates.length} approved candidate(s) ranked by test performance`,
                    `A mostrar ${filteredNextPhaseCandidates.length} candidata(s) aprovada(s) ordenadas por pontuação`
                  )}
                </div>

                <StickyScrollContainer innerClassName="pb-2">
                  <table className="w-full min-w-[1100px] text-left text-xs text-slate-700 whitespace-nowrap">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-3.5 py-3.5 w-12 text-center">#</th>
                        <th className="px-4 py-3.5 min-w-[200px]">{t("Candidate", "Candidata")}</th>
                        <th className="px-4 py-3.5 min-w-[180px]">{t("Contact", "Contacto")}</th>
                        <th className="px-4 py-3.5 min-w-[100px]">{t("Score", "Nota")}</th>
                        <th className="px-4 py-3.5 min-w-[180px]">{t("Conditions Status", "Resposta às Condições")}</th>
                        <th className="px-4 py-3.5 min-w-[280px]">{t("Official Selected Option", "Opção de Resposta")}</th>
                        <th className="px-4 py-3.5 min-w-[140px]">{t("Portal Pass & Link", "Passe & Link")}</th>
                        <th className="px-4 py-3.5 min-w-[100px] text-right">{t("Action", "Acção")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredNextPhaseCandidates.map((app, index) => {
                        const isConfirmed = isCandidateConfirmed(app);
                        const isDeclined = isCandidateDeclined(app);
                        const isAwaiting = isCandidateAwaiting(app);

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3.5 py-3.5 text-center font-mono font-bold text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() => setProfileCandidate(app)}
                                className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-left block truncate cursor-pointer"
                              >
                                {app.name}
                              </button>
                              <span className="text-[11px] text-slate-400">
                                {app.currentLocation || "Maputo"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <span className="text-slate-700 block truncate">{app.email}</span>
                                {app.whatsapp && (
                                  <span className="text-slate-500 font-mono text-[11px] block">
                                    {formatPhoneDisplay(app.whatsapp)}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              {typeof app.testScore === "number" ? (
                                <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                  {app.testScore}/100
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {isConfirmed ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>{t("ACCEPTED CONDITIONS (YES)", "ACEITOU CONDIÇÕES (SIM)")}</span>
                                </span>
                              ) : isDeclined ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle size={11} className="text-rose-600" />
                                  <span>{t("DECLINED (NO)", "RECUSOU (NÃO)")}</span>
                                </span>
                              ) : isAwaiting ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={11} className="text-amber-600" />
                                  <span>{t("AWAITING RESPONSE", "PENDENTE RESPOSTA")}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">{t("Selected", "Selecionada")}</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 max-w-sm">
                              <div
                                className="text-[11px] text-slate-600 italic truncate max-w-xs"
                                title={app.nextPhaseResponseOption || ""}
                              >
                                {app.nextPhaseResponseOption ? (
                                  `"${app.nextPhaseResponseOption}"`
                                ) : isConfirmed ? (
                                  `"Sim, aceitou as condições de formação e remuneração."`
                                ) : (
                                  <span className="text-slate-400 not-italic">{t("No response recorded yet", "Ainda sem resposta")}</span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 font-mono text-[11px]">
                              {app.nextPhaseToken ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 truncate max-w-[80px]">
                                    {app.nextPhaseToken.slice(0, 8)}...
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyTokenLink(app)}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    title={t("Copy verified portal link", "Copiar link personalizado")}
                                  >
                                    {copiedTokenId === app.id ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                  <a
                                    href={`/pt/careers/next-phase/${app.nextPhaseToken}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-sky-600 transition-colors"
                                    title={t("Open candidate portal page", "Abrir página do candidato")}
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setProfileCandidate(app)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                                title={t("View full candidate details", "Ver detalhes")}
                              >
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </StickyScrollContainer>
              </div>
            </div>
          )}

          {/* =======================================================================
              TAB 5: ESTÚDIO DE COMUNICAÇÕES (COMMUNICATIONS STUDIO)
             ======================================================================= */}
          {activeTab === "communications" && (
            <CohortCommunicationsStudio
              cohort={selectedCohort}
              applications={cohortApps}
              selectedCandidateIds={selectedCandidateIds}
              onBackToPipeline={() => setActiveTab("overview")}
              onReloadApps={reloadCohortApps}
            />
          )}
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: ARCHIVED COHORT CARDS DIRECTORY & OVERVIEW (VAULT CATALOG)
           ========================================================================= */
        <div className="space-y-6">
          {/* Top Banner Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs">
                <Archive size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {t("Recruitment Archive Vault", "Cofre de Arquivo de Recrutamento")}
                  </h2>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {archivedCohorts.length} {t("Cohorts", "Lotes")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    "All historical recruitment batches preserved with full funnel stages, scores, attendance rosters, and candidate dossiers.",
                    "Todos os lotes de recrutamento anteriores preservados com funil completo, notas, escalas de presença e perfis de candidatos."
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onBackToActive}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>{t("Active Recruitment Workspace", "Recrutamento Activo")}</span>
              </button>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search by role title, cohort name...", "Pesquisar por cargo, lote...")}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">{t("All Roles", "Todos os Cargos")}</option>
                {uniqueRoles.map((rId) => (
                  <option key={rId} value={rId}>
                    {rId}
                  </option>
                ))}
              </select>

              <button
                onClick={loadArchiveSummary}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                title={t("Refresh list", "Actualizar lista")}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Cohort Cards Grid */}
          {filteredCohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              <Archive size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">
                {t("No archived cohorts match your filters.", "Nenhum lote arquivado corresponde aos filtros.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCohorts.map((cohort) => {
                const roleTitle = lang === "en" ? (cohort.roleTitleEn || cohort.roleTitlePt) : (cohort.roleTitlePt || cohort.roleTitleEn);

                return (
                  <div
                    key={cohort.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                          {cohort.department || t("Operations", "Operações")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {cohort.closedAt
                            ? new Date(cohort.closedAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")
                            : t("Archived", "Arquivado")}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{cohort.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{roleTitle}</p>

                      <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-slate-100 pt-3 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                            {t("Total CVs", "Total")}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {cohort.totalApplications || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                            {t("Tested", "Testados")}
                          </span>
                          <span className="text-sm font-black text-sky-600">
                            {cohort.totalTested || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                            {t("Next Phase", "Próx. Fase")}
                          </span>
                          <span className="text-sm font-black text-emerald-600">
                            {cohort.totalNextPhase || (cohort.id === "cctv_cohort" ? 21 : 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                            {t("Confirmed", "Aceitaram")}
                          </span>
                          <span className="text-sm font-black text-emerald-700">
                            {cohort.totalConfirmed || (cohort.id === "cctv_cohort" ? 17 : 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openCohortDossier(cohort)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Layers size={13} className="text-white" />
                      <span>{t("Open Cohort Workspace", "Abrir Workspace do Lote")}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: FULL CANDIDATE PROFILE & DOSSIER DRAWER
         ========================================================================= */}
      {profileCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs">
                  {profileCandidate.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{profileCandidate.name}</h3>
                  <p className="text-xs text-slate-500">
                    {profileCandidate.email} • {profileCandidate.whatsapp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileCandidate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 admin-scrollbar">
              <CandidateProfileView
                candidate={profileCandidate}
                roles={defaultRoles}
                lang={lang}
                onStatusChange={async () => {}}
                onArchive={async () => {}}
                onDelete={async () => {
                  alert(t("Deletion not permitted on sealed archives.", "Eliminação não permitida em histórico selado."));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
