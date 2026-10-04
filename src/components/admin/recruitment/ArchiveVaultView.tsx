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
} from "lucide-react";
import { Application, Role, roles as defaultRoles, formatPhoneDisplay } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import { CandidateProfileView } from "./CandidateProfileView";
import CohortCommunicationsStudio from "./CohortCommunicationsStudio";
import StickyScrollContainer from "@/components/admin/ui/StickyScrollContainer";
import RichMessageEditor, { AttachmentItem } from "./RichMessageEditor";

interface ArchiveVaultViewProps {
  onBackToActive: () => void;
}

type SectionTab =
  | "all"
  | "screening"
  | "testing"
  | "gate_checkin"
  | "next_phase"
  | "interview"
  | "hired"
  | "archived";

const DEFAULT_INSTRUCTIONS_TEMPLATE = `Prezada Candidata {name},

Acusamos e registamos com agrado a sua confirmação e aceitação das condições para a Próxima Fase do processo de selecção para a função de Operadora de CCO da Overwatch Moçambique.

Vimos por este meio convocar-lhe formalmente para o início do Programa de Formação Inicial e Integração Operacional, que terá lugar de acordo com as seguintes directrizes:

1. LOCAL & PONTO DE ENCONTRO:
- Centro de Comando e Controlo Overwatch (CCO)
- Endereço: Av. do Trabalho, N.º 1948, Maputo, Moçambique
- Ponto de referência: Próximo à Direcção de Transportes

2. HORÁRIO & APRESENTAÇÃO:
- Horário de comparência: 08h30 (pontualidade rigorosa)
- Sessão de abertura e credenciação: 09h00

3. DOCUMENTAÇÃO OBRIGATÓRIA A APRESENTAR NO PRIMEIRO DIA:
- Bilhete de Identidade (BI) ou Cartão de Eleitor (original e 2 cópias);
- Certificado de Habilitações da 12.ª Classe (original e 1 cópia);
- Cartão de NUIT;
- Certificado de Registo Criminal ou comprovativo de pedido;
- Curriculum Vitae impresso e actualizado;
- 2 Fotografias tipo passe recentes.

4. CÓDIGO DE VESTUÁRIO (DRESS CODE):
- Traje formal / executivo sóbrio (calça escura ou saia abaixo do joelho, blusa ou camisa social, calçado fechado e confortável).

5. CANAL DE APOIO & ESCLARECIMENTO DE DÚVIDAS:
- Para qualquer questão de logística ou confirmação prévia, favor contactar a equipa de RH via WhatsApp ou chamada para o número institucional Overwatch: +258 84 287 0793.

Reiteramos os nossos parabéns pela dedicação demonstrada nas provas de selecção e esperamos contar com o seu melhor desempenho nesta fase decisiva.

Com os melhores cumprimentos,
Direcção de Recursos Humanos & Operações
Overwatch Moçambique`;

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

  // View mode switcher: "pipeline" vs "communications"
  const [dossierViewMode, setDossierViewMode] = useState<"pipeline" | "communications">("pipeline");

  // Active section tab & filters inside cohort dossier
  const [activeTab, setActiveTab] = useState<SectionTab>("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [nextPhaseSubFilter, setNextPhaseSubFilter] = useState<"all" | "confirmed" | "awaiting" | "declined">("all");
  const [testingSubFilter, setTestingSubFilter] = useState<"all" | "attended" | "booked" | "unbooked">("all");
  const [screeningSubFilter, setScreeningSubFilter] = useState<"all" | "passed" | "failed">("all");

  // Selection & bulk actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Send Instructions Modal state
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [instructionsSubject, setInstructionsSubject] = useState(
    "Instruções da Próxima Fase – Vaga de Operadora de CCO | Overwatch Moçambique"
  );
  const [instructionsMessage, setInstructionsMessage] = useState(DEFAULT_INSTRUCTIONS_TEMPLATE);
  const [instructionsAttachments, setInstructionsAttachments] = useState<AttachmentItem[]>([]);
  const [instructionsPreviewEmail, setInstructionsPreviewEmail] = useState("");
  const [instructionsSending, setInstructionsSending] = useState(false);
  const [instructionsResult, setInstructionsResult] = useState<{
    sentCount: number;
    failedCount: number;
    results?: any[];
  } | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedWhatsAppSuccess, setCopiedWhatsAppSuccess] = useState(false);

  // Full candidate profile drawer/modal
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
        // If initial cohort is requested via URL params, open it directly
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
    setDossierViewMode("pipeline");
    setAppsLoading(true);
    setSelectedCandidateIds(new Set());
    setActiveTab("all");
    setCandidateSearch("");
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
    setDossierViewMode("pipeline");
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
  const isCandidateNextPhase = (app: Application) => {
    return (
      Boolean(app.nextPhaseStatus) ||
      Boolean(app.nextPhaseInvitedAt) ||
      Boolean(app.nextPhaseResponse) ||
      app.status === "next_phase_selected" ||
      app.status === "next_phase_invited" ||
      app.status === "interest_confirmed" ||
      app.status === "interest_declined" ||
      app.status === "awaiting_response"
    );
  };

  const isCandidateConfirmed = (app: Application) => {
    return (
      app.nextPhaseResponse === "yes" ||
      app.nextPhaseStatus === "confirmed" ||
      app.status === "interest_confirmed"
    );
  };

  const isCandidateAwaiting = (app: Application) => {
    return (
      (Boolean(app.nextPhaseInvitedAt) && !app.nextPhaseResponse) ||
      app.status === "awaiting_response" ||
      app.status === "next_phase_invited"
    );
  };

  const isCandidateDeclined = (app: Application) => {
    return (
      app.nextPhaseResponse === "no" ||
      app.nextPhaseStatus === "declined" ||
      app.status === "interest_declined"
    );
  };

  // Pipeline metrics for selected cohort
  const cohortMetrics = useMemo(() => {
    const total = cohortApps.length;
    const screened = cohortApps.filter(
      (a) =>
        Boolean(a.screeningResult?.passedMandatory) ||
        (typeof a.screeningScore === "number" && a.screeningScore >= 50) ||
        a.status === "shortlisted" ||
        a.status === "screening"
    ).length;
    const tested = cohortApps.filter(
      (a) => Boolean(a.attendedAt) || a.status === "tested" || typeof a.testScore === "number"
    ).length;
    const nextPhaseAll = cohortApps.filter(isCandidateNextPhase);
    const confirmedCount = nextPhaseAll.filter(isCandidateConfirmed).length;
    const awaitingCount = nextPhaseAll.filter(isCandidateAwaiting).length;
    const declinedCount = nextPhaseAll.filter(isCandidateDeclined).length;
    const interviewCount = cohortApps.filter((a) => a.status === "interview").length;
    const hiredCount = cohortApps.filter((a) => a.status === "hired").length;
    const archivedCount = cohortApps.filter((a) => a.status === "archived" || a.status === "rejected").length;

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
      archivedCount,
    };
  }, [cohortApps]);

  // Filter candidates based on active tab and sub-filters
  const filteredSectionApps = useMemo(() => {
    let list = cohortApps;

    // Filter by active stage/section tab
    if (activeTab === "screening") {
      list = list.filter(
        (a) =>
          Boolean(a.screeningResult) ||
          typeof a.screeningScore === "number" ||
          a.status === "screening" ||
          a.status === "shortlisted"
      );
      if (screeningSubFilter === "passed") {
        list = list.filter((a) => a.screeningResult?.passedMandatory !== false);
      } else if (screeningSubFilter === "failed") {
        list = list.filter((a) => a.screeningResult?.passedMandatory === false);
      }
    } else if (activeTab === "testing") {
      list = list.filter(
        (a) => Boolean(a.testSlot) || typeof a.testScore === "number" || Boolean(a.attendedAt) || a.status === "tested"
      );
      if (testingSubFilter === "attended") {
        list = list.filter((a) => Boolean(a.attendedAt));
      } else if (testingSubFilter === "booked") {
        list = list.filter((a) => Boolean(a.testSlot) && !a.attendedAt);
      } else if (testingSubFilter === "unbooked") {
        list = list.filter((a) => !a.testSlot);
      }
    } else if (activeTab === "gate_checkin") {
      list = list.filter((a) => Boolean(a.attendedAt) || Boolean(a.testSlot));
    } else if (activeTab === "next_phase") {
      list = list.filter(isCandidateNextPhase);
      if (nextPhaseSubFilter === "confirmed") {
        list = list.filter(isCandidateConfirmed);
      } else if (nextPhaseSubFilter === "awaiting") {
        list = list.filter(isCandidateAwaiting);
      } else if (nextPhaseSubFilter === "declined") {
        list = list.filter(isCandidateDeclined);
      }
    } else if (activeTab === "interview") {
      list = list.filter((a) => a.status === "interview");
    } else if (activeTab === "hired") {
      list = list.filter((a) => a.status === "hired");
    } else if (activeTab === "archived") {
      list = list.filter((a) => a.status === "archived" || a.status === "rejected" || a.status === "not_advancing");
    }

    // Apply text search
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
  }, [cohortApps, activeTab, nextPhaseSubFilter, testingSubFilter, screeningSubFilter, candidateSearch]);

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.size === filteredSectionApps.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(filteredSectionApps.map((a) => a.id)));
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

  // CSV Export Function (UTF-8 BOM formatted for perfect Excel rendering)
  const downloadDatasetAsCsv = (dataset: Application[], filenamePrefix: string) => {
    const headers = [
      "ID",
      "Nome Completo",
      "Email",
      "WhatsApp / Telefone",
      "Localização",
      "Data de Candidatura",
      "Fase / Estado Actual",
      "Resultado Triagem",
      "Pontuação Triagem",
      "Turno Teste",
      "Presença no Teste",
      "Pontuação Teste (/100)",
      "Próxima Fase Estado",
      "Resposta às Condições",
      "Opção Seleccionada",
      "Data da Resposta",
      "Instruções Enviadas Em",
      "Link Pessoal Próxima Fase",
      "Motivo de Arquivo",
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = dataset.map((a) => {
      const conditionResp = isCandidateConfirmed(a)
        ? "ACEITOU CONDIÇÕES (SIM)"
        : isCandidateDeclined(a)
        ? "RECUSOU (NÃO)"
        : isCandidateAwaiting(a)
        ? "PENDENTE RESPOSTA"
        : "N/A";

      const tokenUrl = a.nextPhaseToken
        ? `https://overwatchmoz.com/pt/careers/next-phase/${a.nextPhaseToken}`
        : "";

      return [
        escapeCsv(a.id),
        escapeCsv(a.name),
        escapeCsv(a.email),
        escapeCsv(a.whatsapp ? `="${a.whatsapp}"` : ""),
        escapeCsv(a.currentLocation || "Maputo"),
        escapeCsv(new Date(a.createdAt).toISOString().slice(0, 10)),
        escapeCsv(a.status),
        escapeCsv(a.screeningResult?.passedMandatory ? "Qualificado" : a.screeningResult ? "Não Qualificado" : "N/A"),
        escapeCsv(a.screeningScore ?? ""),
        escapeCsv(a.testSlot || ""),
        escapeCsv(a.attendedAt ? "Presente" : a.testSlot ? "Aguardando" : "N/A"),
        escapeCsv(a.testScore ?? ""),
        escapeCsv(a.nextPhaseStatus || ""),
        escapeCsv(conditionResp),
        escapeCsv(a.nextPhaseResponseOption || ""),
        escapeCsv(a.nextPhaseRespondedAt ? new Date(a.nextPhaseRespondedAt).toISOString() : ""),
        escapeCsv((a as any).instructionsSentAt ? new Date((a as any).instructionsSentAt).toISOString() : ""),
        escapeCsv(tokenUrl),
        escapeCsv(a.archiveReason || ""),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `${cleanPrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export current section
  const handleExportCurrentSection = () => {
    if (!selectedCohort) return;
    const sectionName =
      activeTab === "all"
        ? "Todos_Candidatos"
        : activeTab === "next_phase"
        ? "Proxima_Fase_Condicoes"
        : activeTab === "testing"
        ? "Testes_Presencas"
        : activeTab === "screening"
        ? "Triagem_Qualificacoes"
        : activeTab;
    const prefix = `${selectedCohort.name || "Cohort"}_${sectionName}`;
    downloadDatasetAsCsv(filteredSectionApps, prefix);
  };

  // Export complete cohort master sheet
  const handleExportCohortMaster = () => {
    if (!selectedCohort) return;
    const prefix = `${selectedCohort.name || "Cohort"}_Dossier_Mestre_Completo`;
    downloadDatasetAsCsv(cohortApps, prefix);
  };

  // Open Communications Studio for target candidates
  const openCommunicationsStudio = (candidates?: Application[]) => {
    if (candidates && candidates.length > 0) {
      setSelectedCandidateIds(new Set(candidates.map((c) => c.id)));
    } else if (selectedCandidateIds.size === 0) {
      const confirmedApps = cohortApps.filter(isCandidateConfirmed);
      if (confirmedApps.length > 0) {
        setSelectedCandidateIds(new Set(confirmedApps.map((c) => c.id)));
      } else {
        setSelectedCandidateIds(new Set(filteredSectionApps.map((c) => c.id)));
      }
    }
    setDossierViewMode("communications");
  };

  // Open send instructions modal for target candidates
  const openInstructionsModal = (candidates?: Application[]) => {
    openCommunicationsStudio(candidates);
  };

  // Dispatch instructions execution
  const handleDispatchInstructions = async (isPreview = false) => {
    const targetIds = Array.from(selectedCandidateIds);
    if (!isPreview && targetIds.length === 0) {
      alert(t("Please select at least one candidate recipient.", "Por favor seleccione pelo menos um candidato destinatário."));
      return;
    }
    if (isPreview && (!instructionsPreviewEmail || !instructionsPreviewEmail.includes("@"))) {
      alert(t("Please enter a valid preview email address.", "Por favor insira um email de teste válido."));
      return;
    }

    setInstructionsSending(true);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_instructions",
          candidateIds: targetIds,
          subject: instructionsSubject.trim(),
          message: instructionsMessage.trim(),
          preview: isPreview,
          previewEmail: instructionsPreviewEmail.trim(),
          attachments: instructionsAttachments,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isPreview) {
          alert(
            t(
              `Preview instructions email successfully sent to ${instructionsPreviewEmail}!`,
              `Email de instruções modelo enviado com sucesso para ${instructionsPreviewEmail}!`
            )
          );
        } else {
          setInstructionsResult({
            sentCount: data.sentCount || targetIds.length,
            failedCount: data.failedCount || 0,
            results: data.results,
          });
          await reloadCohortApps();
        }
      } else {
        alert(data.error || "Failed to dispatch instructions");
      }
    } catch (err: any) {
      alert(err.message || "Network error dispatching instructions");
    } finally {
      setInstructionsSending(false);
    }
  };

  // Copy candidate link helper
  const handleCopyTokenLink = (app: Application) => {
    const token = app.nextPhaseToken;
    if (!token) return;
    const url = `${window.location.origin}/pt/careers/next-phase/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(app.id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  // Copy WhatsApp broadcast text
  const handleCopyWhatsAppBroadcast = () => {
    const text = `*OVERWATCH MOÇAMBIQUE | CONVOCAÇÃO OFICIAL CCO*\n\nPrezada Candidata,\n\nA sua confirmação para a Próxima Fase da vaga de *Operadora de CCO* foi registada com sucesso!\n\n📍 *Local:* Centro de Comando Overwatch (Av. do Trabalho, 1948, Maputo)\n⏰ *Horário:* 08h30 pontual\n📄 *Documentos Obrigatórios:*\n- Cópia do BI / Cartão de Eleitor\n- Certificado da 12ª Classe\n- Cartão NUIT\n- 2 Fotos tipo passe\n\n👔 *Traje:* Formal e discreto (calçado fechado)\nDúvidas ou apoio: Responda a esta mensagem.\n\nDesejamos-lhe muito sucesso!\nEquipa de RH Overwatch`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsAppSuccess(true);
    setTimeout(() => setCopiedWhatsAppSuccess(false), 3000);
  };

  // Advance candidate status right from vault
  const handleAdvanceCandidateStatus = async (candidateId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/careers/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidateId, status: newStatus }),
      });
      if (res.ok) {
        setCohortApps((prev) =>
          prev.map((a) => (a.id === candidateId ? { ...a, status: newStatus as any } : a))
        );
      }
    } catch (err) {
      console.warn("Failed to update candidate status:", err);
    }
  };

  // Cohort list filters
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
          VIEW 1: DETAILED COHORT PIPELINE & OPERATIONAL VAULT DOSSIER
         ========================================================================= */}
      {selectedCohort ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Dossier Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <button
                  onClick={closeDossier}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-2xs shrink-0 cursor-pointer"
                  title={t("Back to Cohort Vault List", "Voltar à Lista de Lotes Arquivados")}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {selectedCohort.department || t("Operations", "Operações")}
                    </span>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <FolderArchive size={11} />
                      {t("Sealed Archive", "Histórico Selado")}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={11} />
                      {t("Operationally Active", "Totalmente Operacional")}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                    {selectedCohort.name}
                  </h2>
                  <p className="text-xs text-slate-500">
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
                      : t("Ongoing Batch", "Lote Concluído")}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Mode Toggle: Pipeline vs Communications Studio */}
                <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDossierViewMode("pipeline")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dossierViewMode === "pipeline"
                        ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Layers size={13} className={dossierViewMode === "pipeline" ? "text-sky-600" : "text-slate-400"} />
                    <span>{t("Pipeline & Candidates", "Funil & Candidaturas")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCommunicationsStudio()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dossierViewMode === "communications"
                        ? "bg-white text-sky-700 shadow-2xs border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Mail size={13} className={dossierViewMode === "communications" ? "text-sky-600" : "text-slate-400"} />
                    <span>{t("Communications Studio", "Estúdio de Comunicações")}</span>
                    {cohortMetrics.confirmedCount > 0 && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                          dossierViewMode === "communications"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {cohortMetrics.confirmedCount}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={reloadCohortApps}
                  disabled={appsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title={t("Refresh data", "Recarregar dados")}
                >
                  <RefreshCw size={13} className={appsLoading ? "animate-spin" : ""} />
                  <span>{t("Refresh", "Actualizar")}</span>
                </button>

                <button
                  onClick={handleExportCohortMaster}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
                  title={t("Export entire cohort spreadsheet across all stages", "Descarregar folha mestra de todo o lote com todas as secções")}
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>{t("Master Sheet (.csv)", "Folha Mestra (.csv)")}</span>
                </button>
              </div>
            </div>

            {/* Pipeline KPI Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-3 border-t border-slate-100">
              {/* Metric 1: Total Ingested */}
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "all" ? "text-sky-700" : "text-slate-400"}`}>
                    {t("Total Ingested", "Total Geral")}
                  </span>
                  <Users size={12} className={activeTab === "all" ? "text-sky-600" : "text-slate-400"} />
                </div>
                <div className="text-xl font-black mt-1 text-slate-900">{cohortMetrics.total}</div>
                <span className="text-[10px] block text-slate-500">
                  {t("All Applications", "Candidaturas")}
                </span>
              </button>

              {/* Metric 2: CV Screened */}
              <button
                type="button"
                onClick={() => setActiveTab("screening")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === "screening"
                    ? "bg-amber-50/70 border-amber-500 text-slate-900 shadow-2xs ring-1 ring-amber-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "screening" ? "text-amber-800" : "text-slate-400"}`}>
                    {t("Screening", "Triagem")}
                  </span>
                  <ListFilter size={12} className={activeTab === "screening" ? "text-amber-600" : "text-slate-400"} />
                </div>
                <div className="text-xl font-black mt-1 text-amber-600">{cohortMetrics.screened}</div>
                <span className="text-[10px] block text-slate-500">
                  {t("Qualified CVs", "Qualificados")}
                </span>
              </button>

              {/* Metric 3: Tested & Attended */}
              <button
                type="button"
                onClick={() => setActiveTab("testing")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === "testing"
                    ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "testing" ? "text-sky-800" : "text-slate-400"}`}>
                    {t("Testing", "Testes")}
                  </span>
                  <CalendarCheck size={12} className={activeTab === "testing" ? "text-sky-600" : "text-slate-400"} />
                </div>
                <div className="text-xl font-black mt-1 text-sky-600">{cohortMetrics.tested}</div>
                <span className="text-[10px] block text-slate-500">
                  {t("Presenças & Escala", "Presenças")}
                </span>
              </button>

              {/* Metric 4: Next Phase Cohort (Special Highlight for CCO) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("next_phase");
                  setNextPhaseSubFilter("all");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer sm:col-span-2 lg:col-span-2 ${
                  activeTab === "next_phase"
                    ? "bg-emerald-50/80 border-emerald-500 text-slate-900 shadow-2xs ring-1 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-emerald-50/20 hover:border-emerald-200 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {t("Next Phase Cohort", "Próxima Fase & Condições")}
                  </span>
                  <Award size={13} className="text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black text-emerald-600">{cohortMetrics.confirmedCount}</span>
                  <span className="text-[11px] font-bold text-emerald-700">{t("Accepted Conditions (YES)", "Aceitaram Condições")}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="text-slate-500">{cohortMetrics.nextPhaseTotal} {t("selected", "selecionadas")}</span>
                  <span>•</span>
                  <span className="text-amber-600 font-semibold">{cohortMetrics.awaitingCount} {t("awaiting", "pendentes")}</span>
                  <span>•</span>
                  <span className="text-rose-600 font-semibold">{cohortMetrics.declinedCount} {t("declined", "recusaram")}</span>
                </div>
              </button>

              {/* Metric 5: Interview */}
              <button
                type="button"
                onClick={() => setActiveTab("interview")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === "interview"
                    ? "bg-indigo-50/70 border-indigo-500 text-slate-900 shadow-2xs ring-1 ring-indigo-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "interview" ? "text-indigo-800" : "text-slate-400"}`}>
                    {t("Interview", "Entrevistas")}
                  </span>
                  <UserCheck size={12} className={activeTab === "interview" ? "text-indigo-600" : "text-slate-400"} />
                </div>
                <div className="text-xl font-black mt-1 text-indigo-600">{cohortMetrics.interviewCount}</div>
                <span className="text-[10px] block text-slate-500">
                  {t("Scheduled", "Agendadas")}
                </span>
              </button>

              {/* Metric 6: Hired */}
              <button
                type="button"
                onClick={() => setActiveTab("hired")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === "hired"
                    ? "bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-2xs ring-1 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "hired" ? "text-emerald-800" : "text-slate-400"}`}>
                    {t("Hired", "Admitidos")}
                  </span>
                  <CheckCircle2 size={12} className={activeTab === "hired" ? "text-emerald-600" : "text-slate-400"} />
                </div>
                <div className="text-xl font-black mt-1 text-emerald-600">{cohortMetrics.hiredCount}</div>
                <span className="text-[10px] block text-slate-500">
                  {t("Final Offers", "Contratados")}
                </span>
              </button>
            </div>
          </div>

          {/* Dossier Body: Either Communications Studio OR Pipeline Table */}
          {dossierViewMode === "communications" ? (
            <CohortCommunicationsStudio
              cohort={selectedCohort}
              applications={cohortApps}
              selectedCandidateIds={selectedCandidateIds}
              onBackToPipeline={() => setDossierViewMode("pipeline")}
              onReloadApps={reloadCohortApps}
            />
          ) : (
            <div className="space-y-6">
              {/* Pipeline Stage Sections Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 admin-scrollbar">
            {[
              { id: "all", labelEn: "All Applications", labelPt: "Todas as Candidaturas", icon: Layers, count: cohortMetrics.total },
              { id: "screening", labelEn: "CV Screening", labelPt: "Triagem & Qualificação", icon: ListFilter, count: cohortMetrics.screened },
              { id: "testing", labelEn: "Testing & Attendance", labelPt: "Escala & Presenças", icon: CalendarCheck, count: cohortMetrics.tested },
              { id: "next_phase", labelEn: "Next Phase & Conditions", labelPt: "Próxima Fase & Condições", icon: Award, count: cohortMetrics.nextPhaseTotal, badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { id: "interview", labelEn: "Interview Stage", labelPt: "Entrevistas", icon: UserCheck, count: cohortMetrics.interviewCount },
              { id: "hired", labelEn: "Hired", labelPt: "Admitidos", icon: CheckCircle2, count: cohortMetrics.hiredCount },
              { id: "archived", labelEn: "Non-Selected / Archived", labelPt: "Não Selecionados", icon: FolderArchive, count: cohortMetrics.archivedCount },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as SectionTab);
                    setSelectedCandidateIds(new Set());
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <TabIcon size={14} className={isActive ? "text-sky-600" : "text-slate-400"} />
                  <span>{lang === "en" ? tab.labelEn : tab.labelPt}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive
                        ? "bg-sky-100 text-sky-800"
                        : tab.badgeColor || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section Action & Filtering Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              {/* Search candidate inside section */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder={t("Filter section by name, email, contact...", "Pesquisar por nome, contacto...")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Sub-filters for Next Phase */}
              {activeTab === "next_phase" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", labelEn: "All Next Phase", labelPt: "Todas", count: cohortMetrics.nextPhaseTotal },
                    { id: "confirmed", labelEn: "Accepted (YES)", labelPt: "Aceitou Condições (SIM)", count: cohortMetrics.confirmedCount, highlight: true },
                    { id: "awaiting", labelEn: "Awaiting", labelPt: "Pendente Resposta", count: cohortMetrics.awaitingCount },
                    { id: "declined", labelEn: "Declined (NO)", labelPt: "Recusou (NÃO)", count: cohortMetrics.declinedCount },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setNextPhaseSubFilter(sub.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        nextPhaseSubFilter === sub.id
                          ? sub.highlight
                            ? "bg-emerald-600 text-white font-bold shadow-xs"
                            : "bg-sky-600 text-white font-bold shadow-xs"
                          : sub.highlight
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{lang === "en" ? sub.labelEn : sub.labelPt}</span>
                      <span className="text-[10px] opacity-80 font-mono">({sub.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-filters for Testing */}
              {activeTab === "testing" && (
                <div className="flex items-center gap-1.5">
                  {[
                    { id: "all", labelEn: "All", labelPt: "Todos" },
                    { id: "attended", labelEn: "Attended", labelPt: "Presentes" },
                    { id: "booked", labelEn: "Booked", labelPt: "Agendados" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setTestingSubFilter(sub.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        testingSubFilter === sub.id
                          ? "bg-sky-600 text-white font-bold shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lang === "en" ? sub.labelEn : sub.labelPt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons: Download Section Sheet & Dispatch Instructions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* DOWNLOAD SECTION SHEET BUTTON (Requested by user) */}
              <button
                onClick={handleExportCurrentSection}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title={t(
                  "Download this section's entire dataset as an Excel-ready CSV spreadsheet",
                  "Descarregar todos os dados desta secção como folha de cálculo CSV/Excel"
                )}
              >
                <Download size={13} className="text-emerald-700" />
                <span>{t("Download Section Sheet (.csv)", "Descarregar Folha da Secção (.csv)")}</span>
              </button>

              {/* COMMUNICATIONS STUDIO TRIGGER */}
              <button
                onClick={() => openCommunicationsStudio()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title={t(
                  "Open Communications Studio to create, customize, and dispatch letters",
                  "Abrir Estúdio de Comunicações para criar, personalizar e enviar cartas oficiais"
                )}
              >
                <Mail size={13} className="text-white" />
                <span>
                  {selectedCandidateIds.size > 0
                    ? t(`Communications Studio (${selectedCandidateIds.size})`, `Estúdio de Comunicações (${selectedCandidateIds.size})`)
                    : t("Communications Studio", "Estúdio de Comunicações")}
                </span>
              </button>
            </div>
          </div>

          {/* Section Candidates Table */}
          {appsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <OverwatchOrbitLoader
                label={t("Loading section data...", "A carregar dados da secção...")}
                size="md"
              />
            </div>
          ) : filteredSectionApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              <AlertCircle size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">
                {t("No candidates found in this section.", "Nenhum candidato encontrado nesta secção.")}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  "Try clearing search filters or switching section tabs above.",
                  "Tente limpar o filtro de pesquisa ou seleccionar outra aba acima."
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Horizontal Scroll Helper Hint Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">
                  {t(
                    `Showing ${filteredSectionApps.length} candidate(s) in this section`,
                    `A mostrar ${filteredSectionApps.length} candidata(s) nesta secção`
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="text-xs">←</span>
                  <span>{t("Scroll horizontally to view all columns, full details & CV downloads", "Deslize horizontalmente para ver todas as colunas, detalhes e download de CV")}</span>
                  <span className="text-xs">→</span>
                </span>
              </div>

              <StickyScrollContainer innerClassName="pb-2">
                <table className="w-full min-w-[1280px] text-left text-xs text-slate-700 whitespace-nowrap">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                    <tr>
                      <th className="px-3.5 py-3.5 w-10 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={
                            filteredSectionApps.length > 0 &&
                            selectedCandidateIds.size === filteredSectionApps.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5 min-w-[200px] whitespace-nowrap">{t("Candidate", "Candidato")}</th>
                      <th className="px-4 py-3.5 min-w-[180px] whitespace-nowrap">{t("Contact", "Contacto")}</th>
                      <th className="px-4 py-3.5 min-w-[130px] whitespace-nowrap">{t("Stage Status", "Estado na Vaga")}</th>

                      {/* Contextual Column: Next Phase Conditions Status & Option */}
                      {activeTab === "next_phase" && (
                        <>
                          <th className="px-4 py-3.5 min-w-[190px] whitespace-nowrap">{t("Conditions Response", "Resposta às Condições")}</th>
                          <th className="px-4 py-3.5 min-w-[280px] whitespace-nowrap">{t("Response Text Option", "Opção de Resposta")}</th>
                          <th className="px-4 py-3.5 min-w-[150px] whitespace-nowrap">{t("Portal Token / Link", "Passe & Link")}</th>
                        </>
                      )}

                      {/* Contextual Column: Testing */}
                      {activeTab === "testing" && (
                        <>
                          <th className="px-4 py-3.5 min-w-[140px] whitespace-nowrap">{t("Test Slot", "Turno Agendado")}</th>
                          <th className="px-4 py-3.5 min-w-[110px] whitespace-nowrap">{t("Attendance", "Presença")}</th>
                          <th className="px-4 py-3.5 min-w-[110px] whitespace-nowrap">{t("Test Score", "Pontuação")}</th>
                        </>
                      )}

                      {/* Contextual Column: Screening */}
                      {activeTab === "screening" && (
                        <>
                          <th className="px-4 py-3.5 min-w-[120px] whitespace-nowrap">{t("Screening Score", "Nota Triagem")}</th>
                          <th className="px-4 py-3.5 min-w-[160px] whitespace-nowrap">{t("Mandatory Criteria", "Critérios Obrigatórios")}</th>
                        </>
                      )}

                      {/* Attached CV */}
                      <th className="px-4 py-3.5 min-w-[130px] text-center whitespace-nowrap">{t("Attached CV", "CV Anexo")}</th>
                      {/* Operational Quick Actions */}
                      <th className="px-4 py-3.5 min-w-[160px] text-right whitespace-nowrap">{t("Actions", "Acções")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                    {filteredSectionApps.map((app) => {
                      const isSelected = selectedCandidateIds.has(app.id);
                      const isConfirmed = isCandidateConfirmed(app);
                      const isDeclined = isCandidateDeclined(app);
                      const isAwaiting = isCandidateAwaiting(app);

                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-sky-50/40" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(app.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                          </td>

                          {/* Candidate Identity */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
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
                                  {app.currentLocation || "Maputo"} •{" "}
                                  {new Date(app.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
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

                          {/* Pipeline Stage Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 inline-block">
                              {app.status || "Arquivado"}
                            </span>
                            {(app as any).instructionsSentAt && (
                              <span className="mt-1 block text-[9px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
                                <Check size={10} />
                                {t("Instructions Dispatched", "Instruções Enviadas")}
                              </span>
                            )}
                          </td>

                          {/* Contextual Next Phase Details */}
                          {activeTab === "next_phase" && (
                            <>
                              <td className="px-4 py-3.5 whitespace-nowrap">
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
                                  <span className="text-[11px] text-slate-400">
                                    {t("Selected for Cohort", "Selecionada p/ Turma")}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 max-w-sm whitespace-nowrap">
                                <div className="text-[11px] text-slate-600 italic truncate max-w-xs" title={app.nextPhaseResponseOption || ""}>
                                  {app.nextPhaseResponseOption ? (
                                    `"${app.nextPhaseResponseOption}"`
                                  ) : isConfirmed ? (
                                    `"Sim, aceitou as condições de formação e remuneração."`
                                  ) : (
                                    <span className="text-slate-400 not-italic">{t("No response recorded yet", "Ainda sem resposta")}</span>
                                  )}
                                </div>
                                {app.nextPhaseRespondedAt && (
                                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                    {new Date(app.nextPhaseRespondedAt).toLocaleString(lang === "en" ? "en-US" : "pt-MZ")}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 font-mono text-[11px] whitespace-nowrap">
                                {app.nextPhaseToken ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 truncate max-w-[100px]">
                                      {app.nextPhaseToken.slice(0, 10)}...
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTokenLink(app)}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                      title={t("Copy verified link", "Copiar link personalizado")}
                                    >
                                      {copiedTokenId === app.id ? (
                                        <Check size={12} className="text-emerald-600" />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Contextual Testing Details */}
                          {activeTab === "testing" && (
                            <>
                              <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                {app.testSlot || t("No slot", "Sem agendamento")}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {app.attendedAt ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {t("Attended", "Presente")}
                                  </span>
                                ) : app.testSlot ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {t("Awaiting", "Aguardando")}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {typeof app.testScore === "number" ? (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-extrabold ${
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
                            </>
                          )}

                          {/* Contextual Screening Details */}
                          {activeTab === "screening" && (
                            <>
                              <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                {typeof app.screeningScore === "number" ? `${app.screeningScore}%` : "N/A"}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {app.screeningResult?.passedMandatory ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {t("Passed", "Aprovado")}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    {t("Knocked Out", "Não Cumpre")}
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Attached CV */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <a
                              href={`/api/admin/cv?id=${app.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition-colors shadow-2xs"
                              title={t("Download candidate CV", "Descarregar CV do candidato")}
                            >
                              <Download size={12} className="text-slate-600" />
                              <span>{t("Download CV", "Baixar CV")}</span>
                            </a>
                          </td>

                          {/* Operational Row Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCommunicationsStudio([app])}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                                title={t("Open Communications Studio for this candidate", "Abrir Estúdio de Comunicações para este candidato")}
                              >
                                <Mail size={12} className="text-sky-600" />
                                <span>{t("Message", "Mensagem")}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setProfileCandidate(app)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                                title={t("View full candidate dossier", "Ver perfil completo")}
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </StickyScrollContainer>
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
        /* =========================================================================
            VIEW 2: ARCHIVED COHORT CARDS DIRECTORY & OVERVIEW
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 uppercase">
                    {t("Sealed Archive", "Histórico Selado")}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t(
                    "Closed recruitment cohorts preserved cleanly with complete pipeline sections, exportable spreadsheets, and operational instructions dispatch.",
                    "Lotes de recrutamento encerrados preservados com secções completas de pipeline, descarregamento de folhas de cálculo e envio de instruções operacionais."
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onBackToActive}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{t("Back to Active Roles", "Voltar às Vagas Ativas")}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "Search archived cohorts by name or role...",
                  "Pesquisar lotes arquivados por nome ou cargo..."
                )}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none shadow-2xs"
              >
                <option value="all">{t("All Roles", "Todas as Vagas")}</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredCohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              <FolderArchive size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">
                {t(
                  "No archived cohorts found in vault.",
                  "Nenhum lote arquivado encontrado no cofre."
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  "When an active role is closed or completed, its cohort pipeline and candidate records will appear here.",
                  "Quando uma vaga activa for encerrada ou concluída, o seu histórico e pipeline completo aparecerão aqui."
                )}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCohorts.map((cohort) => {
                const roleTitle =
                  lang === "en"
                    ? cohort.roleTitleEn || cohort.roleTitlePt
                    : cohort.roleTitlePt || cohort.roleTitleEn;

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

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Total CVs", "Total CVs")}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {cohort.totalApplications || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Tested", "Testados")}
                          </span>
                          <span className="text-sm font-extrabold text-sky-600">
                            {cohort.totalTested || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {t("Hired", "Admitidos")}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-600">
                            {cohort.totalHired || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openCohortDossier(cohort)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Layers size={13} className="text-white" />
                      <span>{t("Open Cohort Pipeline & Vault", "Abrir Pipeline & Cofre do Lote")}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SEND NEXT PHASE INSTRUCTIONS (OPERATIONAL DISPATCH)
         ========================================================================= */}
      {instructionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Send size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("Send Next Phase Operational Instructions", "Enviar Instruções Operacionais da Próxima Fase")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      `Targeting ${selectedCandidateIds.size} recipient(s) in cohort.`,
                      `${selectedCandidateIds.size} candidata(s) seleccionada(s) como destinatárias.`
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInstructionsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 admin-scrollbar">
              {/* Recipient summary banner */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-sky-600 shrink-0" />
                  <span className="text-xs font-semibold text-sky-900">
                    {t(
                      `Ready to dispatch to ${selectedCandidateIds.size} candidate(s) who accepted conditions.`,
                      `Pronto para envio a ${selectedCandidateIds.size} candidata(s) que aceitaram as condições.`
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppBroadcast}
                  className="px-2.5 py-1 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-800 text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  {copiedWhatsAppSuccess ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span>{t("Copied!", "Copiado!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>{t("Copy WhatsApp Template", "Copiar Texto p/ WhatsApp")}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {t("Official Email Subject", "Assunto Oficial do Email")}
                </label>
                <input
                  type="text"
                  value={instructionsSubject}
                  onChange={(e) => setInstructionsSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Instructions Body with Rich Message Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    {t("Official Message Content & Attachments", "Conteúdo Oficial da Mensagem & Anexos")}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {instructionsAttachments.length} {t("attachment(s)", "anexo(s)")}
                  </span>
                </div>
                <RichMessageEditor
                  value={instructionsMessage}
                  onChange={setInstructionsMessage}
                  attachments={instructionsAttachments}
                  onAttachmentsChange={setInstructionsAttachments}
                  lang={lang}
                  placeholder={t("Type official instructions here...", "Escreva as instruções oficiais aqui...")}
                  availableVariables={[
                    { code: "{{name}}", label: t("Candidate Full Name", "Nome Completo") },
                    { code: "{{role}}", label: t("Job Role Title", "Cargo / Função") },
                    { code: "{{slot}}", label: t("Assigned Test Slot", "Turno Agendado") },
                    { code: "{{date}}", label: t("Current Official Date", "Data Oficial") },
                    { code: "{{location}}", label: t("HQ Facility Address", "Endereço das Instalações") },
                    { code: "{{company}}", label: t("Company Name", "Overwatch Moçambique") },
                  ]}
                />
              </div>

              {/* Test Preview Email Input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {t("Send Test Preview First", "Enviar Teste de Pré-Visualização")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t("Verify formatting before mass sending", "Verifique a formatação no seu email")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={instructionsPreviewEmail}
                    onChange={(e) => setInstructionsPreviewEmail(e.target.value)}
                    placeholder="ex: admin@overwatchmoz.com"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={instructionsSending || !instructionsPreviewEmail}
                    onClick={() => handleDispatchInstructions(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {t("Send Preview", "Enviar Teste")}
                  </button>
                </div>
              </div>

              {/* Dispatch Results notification if already sent */}
              {instructionsResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>
                      {t(
                        `Instructions successfully sent to ${instructionsResult.sentCount} candidate(s)!`,
                        `Instruções enviadas com sucesso a ${instructionsResult.sentCount} candidata(s)!`
                      )}
                    </span>
                  </div>
                  {instructionsResult.failedCount > 0 && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      {instructionsResult.failedCount} {t("deliveries failed.", "falharam o envio.")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInstructionsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                {t("Close", "Fechar")}
              </button>

              <button
                type="button"
                disabled={instructionsSending || selectedCandidateIds.size === 0}
                onClick={() => handleDispatchInstructions(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {instructionsSending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>{t("Dispatching...", "A enviar...")}</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{t(`Dispatch to ${selectedCandidateIds.size} Candidates`, `Enviar a ${selectedCandidateIds.size} Candidatas`)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: FULL CANDIDATE DOSSIER DRAWER
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
                onStatusChange={async (id, newStatus) => {
                  await handleAdvanceCandidateStatus(id, newStatus);
                  setProfileCandidate((prev) => (prev ? { ...prev, status: newStatus as any } : null));
                }}
                onArchive={async (id, reason) => {
                  await handleAdvanceCandidateStatus(id, "archived");
                }}
                onDelete={async (id) => {
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
