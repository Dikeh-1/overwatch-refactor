"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  UserCheck,
  MessageCircle,
  Save,
  AlertCircle,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { formatPhoneDisplay, isTrainingGroupBookingExpired } from "@/lib/careers";

export interface TrainingGroup {
  id: string;
  name: string;
  schedule: string;
  timeRange: string;
  evaluationTime: string;
  capacity: number;
  enabled: boolean;
  startDate?: string;
}

export interface TrainingConfig {
  title: string;
  location: string;
  groups: TrainingGroup[];
}

export interface CandidateItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  score?: number | null;
  seedIndex?: number;
  candidateResponse?: string | null;
  trainingGroupId?: string | null;
  trainingGroup?: string | null;
  trainingBookedAt?: string | null;
  token?: string;
}

interface Props {
  cohortId?: string;
  roleId?: string;
  candidates?: CandidateItem[];
  onRefresh?: () => Promise<void> | void;
}

export const NextPhaseTrainingGroupsView: React.FC<Props> = ({
  cohortId,
  roleId,
  candidates: propCandidates = [],
  onRefresh,
}) => {
  const { lang, t } = useAdminLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Group config data
  const [config, setConfig] = useState<TrainingConfig>({
    title: "Formação em Consciência Situacional e Identificação de Ameaças através de CCTV",
    location: "Av Paulo Samuel Khankhomba 1948",
    groups: [],
  });
  const [bookedMap, setBookedMap] = useState<
    Record<string, Array<{ id: string; name: string; email: string; bookedAt?: string }>>
  >({});
  const [stats, setStats] = useState<Record<string, number>>({});

  // Cycle / cohort selector state
  const [cohorts, setCohorts] = useState<Array<{ id: string; roleId: string; name: string; status: string }>>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohortId || "");

  // In-place group configuration panel state
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editGroups, setEditGroups] = useState<TrainingGroup[]>([]);

  // Action states
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load training slots data
  const loadData = useCallback(async (targetCohortId?: string) => {
    try {
      setLoading(true);
      setConfigError(null);
      const activeId = targetCohortId || selectedCohortId;
      const url = activeId
        ? `/api/admin/careers/training-slots?cohortId=${encodeURIComponent(activeId)}&t=${Date.now()}`
        : `/api/admin/careers/training-slots?t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (res.ok && !data.error) {
        if (data.cohorts) setCohorts(data.cohorts);
        if (data.selectedCohortId && !targetCohortId && !selectedCohortId) {
          setSelectedCohortId(data.selectedCohortId);
        }
        if (data.config) {
          setConfig(data.config);
          setEditTitle(data.config.title || "");
          setEditLocation(data.config.location || "");
          setEditGroups(data.config.groups || []);
        }
        setBookedMap(data.bookedCandidates || {});
        setStats(data.stats || {});
      } else {
        setConfigError(data.error || "Failed to load training slot configuration");
      }
    } catch (err: any) {
      console.error("Error loading training slot configuration:", err);
      setConfigError("Erro ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, [selectedCohortId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge confirmed candidates from props with bookedMap to have complete live list
  const confirmedCandidates = useMemo(() => {
    return propCandidates.filter((c) => c.candidateResponse === "confirmed");
  }, [propCandidates]);

  // Candidates who confirmed interest but have not chosen a group yet
  const unassignedCandidates = useMemo(() => {
    return confirmedCandidates.filter((c) => !c.trainingGroupId);
  }, [confirmedCandidates]);

  // Copy candidate link helper
  const handleCopyLink = (candidateId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.overwatchmoz.com";
    const url = `${origin}/pt/careers/training-invite/${candidateId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(candidateId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Direct Admin Assignment to group
  const handleAssignGroup = async (candidateId: string, groupId: string) => {
    try {
      setAssigningId(candidateId);
      const res = await fetch("/api/careers/training-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, groupId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to assign candidate to training group");
        return;
      }
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || "Network error assigning training group");
    } finally {
      setAssigningId(null);
    }
  };

  // Direct Admin Clear / Remove from group
  const handleClearGroup = async (candidateId: string) => {
    if (!confirm(t("Remove this candidate from the training group?", "Remover esta candidata do grupo de formação?"))) {
      return;
    }
    try {
      setAssigningId(candidateId);
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "clear_training_group", id: candidateId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to remove candidate from training group");
        return;
      }
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || "Network error clearing training group");
    } finally {
      setAssigningId(null);
    }
  };

  // Save Configuration (groups, capacities, times)
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setConfigNotice(null);
      setConfigError(null);

      const payload = {
        cohortId: selectedCohortId,
        config: {
          title: editTitle,
          location: editLocation,
          groups: editGroups,
        },
      };

      const res = await fetch("/api/admin/careers/training-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setConfigError(data.error || "Falha ao guardar configuração dos grupos");
        return;
      }

      setConfigNotice(t("Training groups updated successfully!", "Configuração dos grupos de formação guardada com sucesso!"));
      setShowConfigEditor(false);
      await loadData();
      if (onRefresh) await onRefresh();
      setTimeout(() => setConfigNotice(null), 4000);
    } catch (err: any) {
      setConfigError(err.message || "Erro de ligação ao guardar grupos");
    } finally {
      setSaving(false);
    }
  };

  // Add a new dynamic group (e.g. Group C, Group D)
  const handleAddGroup = () => {
    const nextLetter = String.fromCharCode(65 + editGroups.length); // A, B, C, D...
    const newGroup: TrainingGroup = {
      id: `group_${Date.now()}`,
      name: `GRUPO ${nextLetter} – ${t("Extra Shift", "Turno Adicional")}`,
      schedule: "Segunda a Sexta-feira",
      timeRange: "18h00 – 21h00",
      evaluationTime: "18h00",
      capacity: 8,
      enabled: true,
      startDate: "2026-10-12",
    };
    setEditGroups([...editGroups, newGroup]);
  };

  // Remove a group from draft
  const handleRemoveGroup = (idx: number) => {
    const next = [...editGroups];
    next.splice(idx, 1);
    setEditGroups(next);
  };

  // Update a single group property
  const handleUpdateGroup = (idx: number, field: keyof TrainingGroup, val: any) => {
    const next = [...editGroups];
    next[idx] = { ...next[idx], [field]: val };
    setEditGroups(next);
  };

  const totalCapacity = useMemo(() => {
    return config.groups.reduce((acc, g) => acc + (g.enabled ? g.capacity : 0), 0);
  }, [config.groups]);

  const totalBooked = useMemo(() => {
    return Object.values(stats).reduce((acc, count) => acc + count, 0);
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Controls: Cycle Selector & In-place Config Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={20} />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {t("Practical Training Groups Roster", "Gestão de Turmas de Formação Prática")}
            </h2>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              {t("Hands-on Phase", "Fase Prática CCO")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              "Organize confirmed candidates into balanced morning/afternoon shifts for practical simulator training.",
              "Distribuição das candidatas que confirmaram interesse nos turnos práticos de formação."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cohorts.length > 1 && (
            <select
              value={selectedCohortId}
              onChange={(e) => {
                setSelectedCohortId(e.target.value);
                loadData(e.target.value);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title={t("Refresh Roster", "Atualizar Lista")}
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>{loading ? t("Refreshing...", "A carregar...") : t("Refresh", "Atualizar")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditTitle(config.title);
              setEditLocation(config.location);
              setEditGroups(config.groups);
              setShowConfigEditor(!showConfigEditor);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showConfigEditor
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Settings size={13} />
            <span>
              {showConfigEditor
                ? t("Close Editor", "Fechar Configuração")
                : t("Configure Groups & Slots", "Configurar Grupos & Vagas")}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {configNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>{configNotice}</span>
          </div>
          <button type="button" onClick={() => setConfigNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {configError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600" />
            <span>{configError}</span>
          </div>
          <button type="button" onClick={() => setConfigError(null)} className="text-red-600 hover:text-red-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* In-place Group Configuration Panel (Drawer/Expandable) */}
      {showConfigEditor && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings size={15} className="text-blue-600" />
                <span>{t("Training Shift Configuration", "Configuração de Turnos e Vagas de Formação")}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  "Define shift timings, venues, and student capacity per group. You can dynamically add Group C, D, etc.",
                  "Adicione novos grupos (Grupo C, D...), altere capacidades e horários dos turnos práticos."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddGroup}
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>{t("Add Group", "Adicionar Grupo")}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? t("Saving...", "A guardar...") : t("Save Configuration", "Guardar Alterações")}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t("Course / Training Module Title", "Designação do Curso de Formação")}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t("Training Venue / Location", "Local de Realização da Formação")}
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Groups Editor Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {t("Configured Shifts & Groups", "Grupos e Turnos Configurados")} ({editGroups.length})
            </h4>

            <div className="space-y-2">
              {editGroups.map((g, idx) => (
                <div
                  key={g.id || idx}
                  className="bg-white border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs shadow-2xs"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[0.65rem] text-slate-500 uppercase font-semibold mb-0.5">
                      {t("Group Name", "Nome do Grupo")}
                    </label>
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => handleUpdateGroup(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[0.65rem] text-slate-500 uppercase font-semibold mb-0.5">
                      {t("Time Range", "Horário")}
                    </label>
                    <input
                      type="text"
                      value={g.timeRange}
                      onChange={(e) => handleUpdateGroup(idx, "timeRange", e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 font-mono text-slate-800"
                      placeholder="08h00 – 12h00"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[0.65rem] text-slate-500 uppercase font-semibold mb-0.5">
                      {t("Days / Schedule", "Dias")}
                    </label>
                    <input
                      type="text"
                      value={g.schedule}
                      onChange={(e) => handleUpdateGroup(idx, "schedule", e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 text-slate-800"
                      placeholder="Segunda a Sexta"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[0.65rem] text-slate-500 uppercase font-semibold mb-0.5">
                      {t("Capacity (Seats)", "Vagas")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={g.capacity}
                      onChange={(e) => handleUpdateGroup(idx, "capacity", parseInt(e.target.value) || 8)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 sm:pt-0">
                    <label className="inline-flex items-center gap-1 cursor-pointer text-[0.7rem] font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={(e) => handleUpdateGroup(idx, "enabled", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{t("Active", "Ativo")}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(idx)}
                      disabled={editGroups.length <= 1}
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                      title={t("Delete Group", "Eliminar Grupo")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block">
            {t("Confirmed Trainees", "Candidatas Confirmadas")}
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {confirmedCandidates.length}
          </div>
          <span className="text-[0.65rem] text-emerald-600 font-medium">
            {t("Accepted Next Phase Terms", "Aceitaram os termos da formação")}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-blue-600 block">
            {t("Enrolled in Groups", "Inscritas nos Turnos")}
          </span>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {totalBooked}
          </div>
          <span className="text-[0.65rem] text-slate-500 font-medium">
            {t("Assigned to Group A / B", "Alocadas a turmas de formação")}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-600 block">
            {t("Pending Group Choice", "Pendente de Escolha")}
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {unassignedCandidates.length}
          </div>
          <span className="text-[0.65rem] text-amber-700/80 font-medium">
            {t("Need slot selection", "Aguardando reserva de turno")}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block">
            {t("Total Capacity Configured", "Capacidade Total")}
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalCapacity}
          </div>
          <span className="text-[0.65rem] text-slate-500 font-medium">
            {totalCapacity - totalBooked} {t("vacant seats remaining", "vagas disponíveis")}
          </span>
        </div>
      </div>

      {/* Main Groups Roster Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t("Practical Training Shift Rosters", "Turmas de Formação por Turno")}
            </h3>
            <p className="text-[0.7rem] text-slate-500 mt-0.5">
              <MapPin size={11} className="inline mr-1 text-slate-400" />
              {config.location} • <Calendar size={11} className="inline mx-1 text-slate-400" />
              {config.title}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {config.groups.length} {t("groups configured", "grupos configurados")}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.groups.map((g) => {
            const bookedList = bookedMap[g.id] || [];
            const count = stats[g.id] || bookedList.length || 0;
            const pct = Math.min(100, Math.round((count / (g.capacity || 1)) * 100));
            const isFull = count >= g.capacity;
            const expired = isTrainingGroupBookingExpired(g);

            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col"
              >
                {/* Group Card Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{g.name}</h4>
                      {isFull && (
                        <span className="px-2 py-0.5 rounded text-[0.6rem] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {t("Full (Esgotado)", "Esgotado")}
                        </span>
                      )}
                      {expired && (
                        <span className="px-2 py-0.5 rounded text-[0.6rem] font-bold bg-slate-200 text-slate-700">
                          {t("Closed / In Session", "Em Curso / Encerrado")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                      <span className="flex items-center gap-1 text-blue-700 font-semibold">
                        <Clock size={12} />
                        {g.timeRange}
                      </span>
                      <span>•</span>
                      <span>{g.schedule}</span>
                    </div>
                  </div>

                  {/* Seat count badge */}
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {count} / {g.capacity}
                    </span>
                    <span className="block text-[0.62rem] text-slate-400 uppercase tracking-wider">
                      {t("Seats Filled", "Ocupadas")}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFull ? "bg-amber-500" : pct > 75 ? "bg-blue-600" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Enrolled Candidate List */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  {bookedList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <Users size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p>{t("No candidates enrolled in this group yet.", "Nenhuma candidata inscrita neste turno ainda.")}</p>
                      <p className="text-[0.68rem] text-slate-400 mt-1">
                        {t(
                          "Candidates can self-select or admin can manually assign below.",
                          "As candidatas podem escolher pelo portal ou ser atribuídas abaixo."
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[0.68rem] uppercase font-bold tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex justify-between">
                        <span>{t("Enrolled Trainee", "Candidata Inscrita")}</span>
                        <span>{t("Actions", "Ações")}</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto admin-scrollbar">
                        {bookedList.map((cand, idx) => (
                          <div key={cand.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">{cand.name}</div>
                              <div className="text-[0.7rem] text-slate-500 font-mono truncate">{cand.email}</div>
                              {cand.bookedAt && (
                                <div className="text-[0.65rem] text-slate-400 font-mono mt-0.5">
                                  {t("Enrolled at:", "Inscrita em:")} {new Date(cand.bookedAt).toLocaleString(lang === "en" ? "en-GB" : "pt-MZ")}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(cand.id)}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                title={t("Copy Dedicated Portal Link", "Copiar Link de Formação")}
                              >
                                {copiedId === cand.id ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                              <a
                                href={`/pt/careers/training-invite/${cand.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded border border-slate-200 text-blue-600 hover:bg-blue-50"
                                title={t("Open Candidate Training Portal", "Abrir Portal de Formação")}
                              >
                                <ExternalLink size={12} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleClearGroup(cand.id)}
                                disabled={assigningId === cand.id}
                                className="p-1.5 rounded border border-slate-200 text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                                title={t("Remove from Group", "Desvincular do Turno")}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Awaiting Group Selection Section (Unassigned Confirmed Candidates) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="text-amber-600" size={17} />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {t(
                  `Pending Shift Allocation (${unassignedCandidates.length})`,
                  `Candidatas Confirmadas a Aguardar Alocação de Turno (${unassignedCandidates.length})`
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                "These candidates confirmed 'SIM' to the next phase terms but have not chosen Group A or B yet. You can assign them directly or copy their dedicated invitation link.",
                "Candidatas que responderam 'SIM', mas ainda não escolheram o turno. Pode atribuí-las diretamente ou copiar o link de escolha de grupo."
              )}
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {unassignedCandidates.length} {t("candidates pending", "candidatas pendentes")}
          </span>
        </div>

        {unassignedCandidates.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
            <p className="font-semibold text-slate-800">
              {t("All confirmed candidates have been assigned to training shifts!", "Todas as candidatas confirmadas já têm turno de formação atribuído!")}
            </p>
            <p className="text-[0.7rem] text-slate-400 mt-0.5">
              {t("Great job! Trainee rosters for Group A and B are ready.", "Excelente! As listas de presença dos turnos estão completas.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[0.68rem] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{t("Candidate Name", "Nome da Candidata")}</th>
                  <th className="py-2.5 px-3">{t("Contact Details", "Contactos")}</th>
                  <th className="py-2.5 px-3">{t("Test Score", "Nota Teste")}</th>
                  <th className="py-2.5 px-3 text-right">{t("Direct Group Assignment", "Atribuição Direta de Turno")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unassignedCandidates.map((cand, idx) => (
                  <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[0.72rem]">
                      #{cand.seedIndex ?? idx + 1}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{cand.name}</div>
                      <div className="text-[0.68rem] text-emerald-700 font-medium inline-flex items-center gap-1">
                        <Check size={10} className="stroke-[3]" />
                        <span>{t("Confirmed YES", "Confirmou SIM")}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-mono text-slate-600 text-[0.72rem]">{cand.email}</div>
                      {cand.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-slate-500 text-[0.7rem]">{formatPhoneDisplay(cand.phone)}</span>
                          <a
                            href={`https://wa.me/${cand.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[0.65rem] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 hover:bg-emerald-100"
                          >
                            <MessageCircle size={10} />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {cand.score !== undefined && cand.score !== null ? `${cand.score}%` : "—"}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(cand.id)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[0.7rem] font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title={t("Copy Personalized Link", "Copiar Link Personalizado de Escolha de Grupo")}
                        >
                          {copiedId === cand.id ? (
                            <>
                              <Check size={11} className="text-emerald-600 stroke-[3]" />
                              <span className="text-emerald-700 font-bold">{t("Copied!", "Copiado!")}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} className="text-slate-500" />
                              <span>{t("Copy Link", "Copiar Link")}</span>
                            </>
                          )}
                        </button>

                        {/* Direct Assignment Dropdown */}
                        <div className="inline-flex items-center gap-1">
                          {config.groups.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              disabled={assigningId === cand.id || (stats[g.id] || 0) >= g.capacity}
                              onClick={() => handleAssignGroup(cand.id, g.id)}
                              className="px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[0.68rem] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              title={t(`Assign directly to ${g.name}`, `Atribuir diretamente a ${g.name}`)}
                            >
                              <ArrowRight size={10} />
                              <span>{g.name.split("–")[0]?.trim() || g.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
