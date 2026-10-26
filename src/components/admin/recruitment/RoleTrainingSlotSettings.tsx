"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

export interface TrainingSlotGroupItem {
  id: string;
  name: string;
  schedule: string;
  timeRange: string;
  evaluationTime: string;
  capacity: number;
  enabled: boolean;
}

export function RoleTrainingSlotSettings() {
  const { t } = useAdminLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("Formação em Consciência Situacional e Identificação de Ameaças através de CCTV");
  const [location, setLocation] = useState("Av Paulo Samuel Khankhomba 1948");
  const [groups, setGroups] = useState<TrainingSlotGroupItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [bookedCandidates, setBookedCandidates] = useState<Record<string, Array<{ id: string; name: string; email: string; bookedAt?: string }>>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/careers/training-slots", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to load training slot configuration");
        return;
      }

      if (data.config) {
        setTitle(data.config.title || "");
        setLocation(data.config.location || "");
        setGroups(data.config.groups || []);
      }
      setStats(data.stats || {});
      setBookedCandidates(data.bookedCandidates || {});
    } catch (err: any) {
      console.error("Error loading training slots:", err);
      setError("Erro ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddGroup = () => {
    const nextLetter = String.fromCharCode(65 + groups.length); // A, B, C, D...
    const newGroup: TrainingSlotGroupItem = {
      id: `group_${nextLetter.toLowerCase()}`,
      name: `GRUPO ${nextLetter} — NOVO`,
      schedule: "Segunda a Quarta: 08h00–12h00 | Avaliação: Quinta-feira: 09h00–11h00",
      timeRange: "08h00–12h00",
      evaluationTime: "09h00–11h00",
      capacity: 8,
      enabled: true,
    };
    setGroups([...groups, newGroup]);
  };

  const handleRemoveGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleGroupChange = (index: number, field: keyof TrainingSlotGroupItem, val: any) => {
    const updated = [...groups];
    updated[index] = { ...updated[index], [field]: val };
    setGroups(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/admin/careers/training-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          location,
          groups,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Erro ao guardar configuração dos grupos de formação.");
        return;
      }

      setNotice(t("Training groups and slot quotas successfully saved.", "Grupos de formação e quotas de vagas guardados com sucesso."));
      if (data.config?.groups) {
        setGroups(data.config.groups);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError("Erro ao guardar dados.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 border border-sky-200">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>{t("Training Booking Slots & Groups Configuration", "Configuração de Grupos e Vagas de Formação")}</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                {groups.length} {t("Groups", "Grupos")}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {t(
                "Configure group schedules (Group A, Group B, Group C...) and individual slot capacities for 2nd Phase Training & Practical Evaluation.",
                "Configure os grupos (Grupo A, Grupo B, Grupo C...), horários e lotação para a Formação e Avaliação Prática."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddGroup}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>{t("+ Add Group", "+ Adicionar Grupo")}</span>
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Save size={13} />
            <span>{saving ? t("Saving…", "A guardar…") : t("Save Changes", "Guardar Alterações")}</span>
          </button>
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="p-4 sm:p-5 space-y-5">
        {/* Global Training Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {t("Training Title / Course Name:", "Título do Curso / Formação:")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {t("Physical Location / Venue:", "Local da Formação (Morada):")}
            </label>
            <div className="relative">
              <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Groups Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              {t("Configured Training Groups & Capacities", "Grupos de Formação e Quotas de Inscrição")}
            </h4>
            <span className="text-[11px] text-slate-500">
              {t("Candidates pick from active enabled groups.", "Candidatas escolhem entre os grupos activos.")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {groups.map((group, idx) => {
              const booked = stats[group.id] || 0;
              const attendees = bookedCandidates[group.id] || [];

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border p-4 transition-all ${
                    group.enabled
                      ? "border-slate-200 bg-slate-50/50"
                      : "border-slate-200 bg-slate-100/60 opacity-60"
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                    {/* Group Title & ID */}
                    <div className="lg:col-span-4 space-y-2">
                      <div>
                        <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                          {t("Group Name / Label:", "Nome do Grupo:")}
                        </label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => handleGroupChange(idx, "name", e.target.value)}
                          className="w-full text-xs font-bold text-slate-900 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={group.enabled}
                            onChange={(e) => handleGroupChange(idx, "enabled", e.target.checked)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                          />
                          <span>{t("Active for booking", "Activo para inscrição")}</span>
                        </label>
                      </div>
                    </div>

                    {/* Schedule & Hours */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                            {t("Training Hours:", "Horário da Formação:")}
                          </label>
                          <input
                            type="text"
                            placeholder="ex: 08h00–12h00"
                            value={group.timeRange}
                            onChange={(e) => handleGroupChange(idx, "timeRange", e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                            {t("Evaluation Hours:", "Horário da Avaliação:")}
                          </label>
                          <input
                            type="text"
                            placeholder="ex: 09h00–11h00"
                            value={group.evaluationTime}
                            onChange={(e) => handleGroupChange(idx, "evaluationTime", e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                          {t("Full Schedule Description:", "Descrição Completa das Datas:")}
                        </label>
                        <input
                          type="text"
                          value={group.schedule}
                          onChange={(e) => handleGroupChange(idx, "schedule", e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
                          placeholder="ex: Segunda a Quarta (9, 10 e 11 de Nov): 08h00–12h00 | Avaliação: Quinta (12 de Nov): 09h00–11h00"
                        />
                      </div>
                    </div>

                    {/* Capacity & Live Bookings */}
                    <div className="lg:col-span-2 space-y-2">
                      <div>
                        <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                          {t("Slot Capacity:", "Lotação (Vagas):")}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={group.capacity}
                            onChange={(e) => handleGroupChange(idx, "capacity", parseInt(e.target.value, 10) || 8)}
                            className="w-20 text-xs font-bold text-slate-900 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center"
                          />
                          <span className="text-xs text-slate-500 font-semibold">{t("slots", "vagas")}</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          booked >= group.capacity
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          <Users size={11} />
                          <span>{booked} / {group.capacity} {t("booked", "inscritos")}</span>
                        </span>
                      </div>
                    </div>

                    {/* Remove Action */}
                    <div className="lg:col-span-1 flex items-center justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(idx)}
                        disabled={groups.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 cursor-pointer"
                        title={t("Remove Group", "Remover Grupo")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Registered Attendees Peek */}
                  {attendees.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
                        {t("Registered Candidates:", "Candidatas Inscritas:")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {attendees.map((cand) => (
                          <span
                            key={cand.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 text-[11px]"
                          >
                            <span className="font-semibold">{cand.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({cand.email})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
