"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Users,
  Eye,
  SlidersHorizontal,
  Radio,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  X,
  Plus,
  Archive,
  Trash2,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { CareerRoleDefinition, CareerCohort } from "@/lib/careers-models";
import { Application } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import RoleConfigModal from "./RoleConfigModal";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface JobRolesViewProps {
  roleDefs: CareerRoleDefinition[];
  cohorts: CareerCohort[];
  applications: Application[];
  lang?: "pt" | "en";
  onRefresh: () => Promise<void>;
  onSaveRole: (role: CareerRoleDefinition) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onOpenCohort: (roleId: string, cohortName?: string) => Promise<void>;
  onCloseCohort: (roleId: string, notes?: string) => Promise<void>;
}

export const JobRolesView: React.FC<JobRolesViewProps> = ({
  roleDefs,
  cohorts,
  applications,
  lang: propLang,
  onRefresh,
  onSaveRole,
  onDeleteRole,
  onOpenCohort,
  onCloseCohort,
}) => {
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CareerRoleDefinition | null>(null);

  // Archive / Open confirmation modal state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTargetRole, setArchiveTargetRole] = useState<CareerRoleDefinition | null>(null);
  const [archiveNotes, setArchiveNotes] = useState("");

  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [openTargetRole, setOpenTargetRole] = useState<CareerRoleDefinition | null>(null);
  const [newCohortBatchName, setNewCohortBatchName] = useState("");

  // Processing loader state
  const [processingState, setProcessingState] = useState<{
    busy: boolean;
    label: string;
  }>({
    busy: false,
    label: "",
  });

  const filteredRoles = roleDefs.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.en?.toLowerCase().includes(q) ||
      r.pt?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  const getRoleMetrics = (roleId: string, activeCohortId?: string | null) => {
    // If an activeCohortId is assigned, match by cohortId or fallback to role id
    const roleApps = applications.filter(
      (a) =>
        (activeCohortId && a.cohortId === activeCohortId) ||
        (!activeCohortId && (a.role === roleId || (roleId === "cctv" && !a.role))),
    );

    return {
      total: roleApps.length,
      active: roleApps.filter((a) => a.status !== "archived" && a.status !== "rejected").length,
      booked: roleApps.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length,
      hired: roleApps.filter((a) => a.status === "hired").length,
    };
  };

  const handleOpenEdit = (role: CareerRoleDefinition) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const handleSaveFromModal = async (role: CareerRoleDefinition) => {
    setProcessingState({
      busy: true,
      label: t("Saving role & screening rules...", "A guardar vaga e regras de triagem..."),
    });
    try {
      await onSaveRole(role);
      setModalOpen(false);
      await onRefresh();
    } finally {
      setProcessingState({ busy: false, label: "" });
    }
  };

  const handleConfirmCloseAndArchive = async () => {
    if (!archiveTargetRole) return;
    setProcessingState({
      busy: true,
      label: t("Sealing & archiving cohort...", "A selar e arquivar lote no cofre histórico..."),
    });
    try {
      await onCloseCohort(archiveTargetRole.id, archiveNotes);
      setArchiveModalOpen(false);
      setArchiveTargetRole(null);
      setArchiveNotes("");
      await onRefresh();
    } finally {
      setProcessingState({ busy: false, label: "" });
    }
  };

  const handleConfirmOpenCohort = async () => {
    if (!openTargetRole) return;
    setProcessingState({
      busy: true,
      label: t("Opening new recruitment cycle...", "A abrir novo ciclo de candidaturas..."),
    });
    try {
      await onOpenCohort(openTargetRole.id, newCohortBatchName);
      setOpenModalOpen(false);
      setOpenTargetRole(null);
      setNewCohortBatchName("");
      await onRefresh();
    } finally {
      setProcessingState({ busy: false, label: "" });
    }
  };

  const handleDeleteRole = async (roleId: string, roleTitle: string) => {
    const confirmed = window.confirm(
      t(
        `Are you sure you want to permanently delete the role "${roleTitle}"?`,
        `Tem a certeza de que pretende eliminar permanentemente a vaga "${roleTitle}"?`,
      ),
    );
    if (!confirmed) return;

    setProcessingState({
      busy: true,
      label: t("Deleting role configuration...", "A eliminar configuração da vaga..."),
    });
    try {
      await onDeleteRole(roleId);
      await onRefresh();
    } finally {
      setProcessingState({ busy: false, label: "" });
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Universal Overwatch Processing Overlay */}
      {processingState.busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="rounded-2xl border border-sky-500/30 bg-[#0a1128] p-8 shadow-2xl">
            <OverwatchOrbitLoader label={processingState.label} size="lg" />
          </div>
        </div>
      )}

      {/* Header Info with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Job Roles & Workspaces", "Vagas, Funis & Regras")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Manage career recruitment listings, modular pipeline stages, and custom CV screening rules",
              "Gestão de vagas, funis modulares personalizados e regras de triagem de currículos",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/recruitment/archive"
            className="px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Archive size={14} className="text-purple-600" />
            <span>{t("Archive Vault", "Cofre de Arquivo")}</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-lg bg-[#0a1128] hover:bg-[#121c3d] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t("Add New Role", "Nova Vaga")}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search by role title, department, or ID...", "Pesquisar por título, departamento ou ID...")}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title={t("Clear", "Limpar")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filteredRoles.length} {t("roles configured", "vagas configuradas")}
        </div>
      </div>

      {/* Roles Cards / Grid View */}
      <div className="space-y-4">
        {filteredRoles.map((role) => {
          const metrics = getRoleMetrics(role.id, role.activeCohortId);
          const activeCohort = cohorts.find((c) => c.id === role.activeCohortId);
          const stageCount = role.pipelineStages?.length || 4;
          const rulesCount = role.screeningRules?.length || 0;

          return (
            <div
              key={role.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Role Header Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      role.open
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <Briefcase size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {lang === "pt" ? role.pt : role.en}
                      </h2>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${
                          role.open
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${role.open ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
                        />
                        <span>{role.open ? t("OPEN & RECEIVING", "ABERTA & RECEBENDO") : t("CLOSED", "FECHADA")}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[0.68rem] font-medium">
                        {role.department || "Operações"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono text-[0.7rem] text-slate-400">ID: {role.id}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Layers size={13} className="text-sky-600" />
                        <span>{stageCount} {t("stages", "etapas")}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Sliders size={13} className="text-amber-600" />
                        <span>{rulesCount} {t("screening rules", "regras de triagem")}</span>
                      </span>
                      {activeCohort && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-700 font-medium">
                            <Calendar size={13} />
                            <span>{activeCohort.name}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(role)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal size={13} className="text-slate-500" />
                    <span>{t("Configure Pipeline & Rules", "Configurar Etapas & Regras")}</span>
                  </button>

                  {role.open ? (
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveTargetRole(role);
                        setArchiveModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Archive size={13} className="text-amber-700" />
                      <span>{t("Close & Archive Cohort", "Encerrar & Arquivar Lote")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenTargetRole(role);
                        setOpenModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles size={13} className="text-emerald-700" />
                      <span>{t("Open New Cohort Cycle", "Abrir Novo Ciclo")}</span>
                    </button>
                  )}

                  <Link
                    href={`/admin/recruitment/candidates?role=${role.id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#0a1128] hover:bg-[#121c3d] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>{t("Active Pipeline", "Ver Funil")}</span>
                    <ArrowUpRight size={13} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteRole(role.id, lang === "pt" ? role.pt : role.en)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title={t("Delete role", "Eliminar vaga")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
                  <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("Active Cohort Intake", "Candidaturas no Lote")}
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {metrics.total}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
                  <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("Active Pipeline", "No Funil Ativo")}
                  </span>
                  <span className="text-base font-bold text-slate-700 font-mono mt-0.5">
                    {metrics.active}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
                  <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("Tests Booked", "Testes Agendados")}
                  </span>
                  <span className="text-base font-bold text-sky-700 font-mono mt-0.5">
                    {metrics.booked}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
                  <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("Hired to Date", "Contratados")}
                  </span>
                  <span className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                    {metrics.hired}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8 space-y-3">
            <Briefcase size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">
              {t("No job roles found", "Nenhuma vaga encontrada")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t(
                "You can create a new personalized role with customized pipeline stages and screening rules.",
                "Pode criar uma nova vaga personalizada com etapas de funil e regras de triagem sob medida.",
              )}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-lg bg-[#0a1128] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>{t("Add Role Now", "Criar Vaga Agora")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Config Modal (Details, Pipeline Stages, Screening Rules) */}
      <RoleConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roleToEdit={editingRole}
        onSaveRole={handleSaveFromModal}
      />

      {/* Close & Archive Cohort Modal */}
      {archiveModalOpen && archiveTargetRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0c1322] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t("Seal & Archive Recruitment Cohort", "Encerrar & Selar Lote no Cofre Histórico")}
                </h3>
                <p className="text-xs text-slate-400">
                  {archiveTargetRole.pt} ({archiveTargetRole.id})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
              {t(
                "Closing this role will freeze and archive all current applications, interview records, and scores into the Historical Archive Vault. When this role is reopened in the future, it will start with a fresh, clean workspace.",
                "Ao encerrar esta vaga, todas as candidaturas, registos de testes e notas serão selados e preservados no Cofre de Arquivo. Quando a vaga for reaberta, o funil ativo iniciará completamente limpo para não misturar candidatos.",
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t("Archive Notes / Cohort Closure Summary (Optional):", "Notas de Fecho do Lote (Opcional):")}
              </label>
              <textarea
                rows={3}
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                placeholder={t(
                  "e.g. Completed cohort. 12 candidates advanced to technical orientation.",
                  "ex.: Lote concluído. 12 candidatas integradas no centro de comando.",
                )}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalOpen(false);
                  setArchiveTargetRole(null);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseAndArchive}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {t("Confirm Close & Archive", "Confirmar Fecho & Arquivar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open New Cohort Cycle Modal */}
      {openModalOpen && openTargetRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0c1322] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t("Open New Cohort Recruitment Cycle", "Abrir Novo Ciclo de Recrutamento")}
                </h3>
                <p className="text-xs text-slate-400">
                  {openTargetRole.pt} ({openTargetRole.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t(
                "This will set the role to OPEN and start a fresh, isolated workspace for public submissions.",
                "Isto abrirá a vaga e iniciará um lote novo e isolado para as novas candidaturas públicas.",
              )}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t("Cohort Batch Name (Optional):", "Nome do Lote / Turma (Opcional):")}
              </label>
              <input
                type="text"
                value={newCohortBatchName}
                onChange={(e) => setNewCohortBatchName(e.target.value)}
                placeholder={t(
                  `e.g. ${openTargetRole.pt} — Batch 2026`,
                  `ex.: ${openTargetRole.pt} — Turma 2026`,
                )}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpenModalOpen(false);
                  setOpenTargetRole(null);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleConfirmOpenCohort}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {t("Open Recruitment Cycle", "Abrir Ciclo de Recrutamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
