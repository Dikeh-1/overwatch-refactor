"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  ShieldCheck,
  Phone,
  QrCode,
  Users,
  Search,
  Check,
  X,
  Send,
  AlertTriangle,
  SlidersHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Application, normalizeSlot, formatSlotDisplay, formatPhoneDisplay } from "@/lib/careers";

interface TestingAttendanceViewProps {
  applications: Application[];
  lang: "pt" | "en";
  slotQuota: number;
  broadcastSlots: string[];
  onToggleAttendance: (candidateId: string, attended: boolean) => Promise<void>;
  onOpenGateScanner: () => void;
  onDispatchGatePasses: () => Promise<void>;
  onSaveSlots: (slots: string[], quota: number) => Promise<boolean>;
}

export const TestingAttendanceView: React.FC<TestingAttendanceViewProps> = ({
  applications,
  lang,
  slotQuota,
  broadcastSlots,
  onToggleAttendance,
  onOpenGateScanner,
  onDispatchGatePasses,
  onSaveSlots,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [selectedSlot, setSelectedSlot] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingSlots, setEditingSlots] = useState<string[]>(broadcastSlots);
  const [editingQuota, setEditingQuota] = useState<number>(slotQuota || 15);
  const [newSlotText, setNewSlotText] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Collect all distinct confirmed slots
  const allSlots = useMemo(() => {
    const set = new Set<string>();
    broadcastSlots.forEach((s) => set.add(normalizeSlot(s)));
    applications.forEach((a) => {
      if (a.testSlot && a.status !== "archived" && a.status !== "rejected") {
        set.add(normalizeSlot(a.testSlot));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [broadcastSlots, applications]);

  // Candidates in active session
  const bookedCandidates = useMemo(() => {
    return applications.filter(
      (a) => Boolean(a.testSlot) && a.status !== "archived" && a.status !== "rejected"
    );
  }, [applications]);

  const slotCandidates = useMemo(() => {
    let list = bookedCandidates;
    if (selectedSlot !== "all") {
      list = list.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(selectedSlot));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.whatsapp.includes(q)
      );
    }
    return list;
  }, [bookedCandidates, selectedSlot, searchQuery]);

  const attendedCount = slotCandidates.filter((c) => Boolean(c.attendedAt)).length;
  const currentSlotOccupancy = slotCandidates.length;
  const isOverCapacity = selectedSlot !== "all" && currentSlotOccupancy > slotQuota;
  const overCount = selectedSlot !== "all" ? Math.max(0, currentSlotOccupancy - slotQuota) : 0;

  // Export CSV
  const handleExportAttendanceCSV = () => {
    const headers = ["Nome", "Email", "WhatsApp", "Turno", "Presença", "Hora de Entrada"];
    const rows = slotCandidates.map((c) => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.whatsapp}"`,
      `"${c.testSlot || ""}"`,
      c.attendedAt ? '"PRESENTE"' : '"AGUARDADO"',
      c.attendedAt ? `"${new Date(c.attendedAt).toLocaleTimeString("pt-MZ")}"` : '""',
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-roster-${selectedSlot === "all" ? "all-sessions" : "session"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const ok = await onSaveSlots(editingSlots, editingQuota);
      if (ok) setConfigModalOpen(false);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("Testing Schedule & Attendance", "Escala de Testes & Presenças")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Session rosters, gate access verification and real-time attendance",
              "Gestão de turnos presenciais, controlo de portaria e presença em tempo real"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gate Pass Dispatch */}
          <button
            type="button"
            onClick={onDispatchGatePasses}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={13} />
            <span>{t("Dispatch Gate Passes", "Disparar Passes QR")}</span>
          </button>

          {/* QR Scanner Trigger */}
          <button
            type="button"
            onClick={onOpenGateScanner}
            className="px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode size={13} />
            <span>{t("Open QR Scanner", "Scanner de Portaria")}</span>
          </button>

          {/* Settings / Config */}
          <button
            type="button"
            onClick={() => {
              setEditingSlots(broadcastSlots);
              setEditingQuota(slotQuota);
              setConfigModalOpen(true);
            }}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title={t("Configure slots and quotas", "Configurar turnos e limites")}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Session Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 admin-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedSlot("all")}
          className={`px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
            selectedSlot === "all"
              ? "border-sky-600 text-sky-700 font-semibold bg-sky-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          {t("All Sessions (Consolidated)", "Todas as Sessões")} ({bookedCandidates.length})
        </button>

        {allSlots.map((slot, idx) => {
          const count = bookedCandidates.filter((c) => normalizeSlot(c.testSlot) === normalizeSlot(slot)).length;
          const isOver = count > slotQuota;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                selectedSlot === slot
                  ? "border-sky-600 text-sky-700 font-semibold bg-sky-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span>{formatSlotDisplay(slot)}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[0.65rem] font-bold ${
                  isOver
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}/{slotQuota}
              </span>
            </button>
          );
        })}
      </div>

      {/* Capacity Alert (if overbooked) */}
      {isOverCapacity && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>{t("Over capacity:", "Capacidade excedida:")}</strong>{" "}
              {t(
                `This session has ${currentSlotOccupancy} confirmed candidates against a target quota of ${slotQuota} (+${overCount} over limit).`,
                `Esta sessão conta com ${currentSlotOccupancy} candidatas confirmadas face ao limite de ${slotQuota} (+${overCount} acima da quota).`
              )}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-amber-200 text-amber-900 shrink-0">
            Over capacity · +{overCount}
          </span>
        </div>
      )}

      {/* Search & Export Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search candidate in session...", "Pesquisar candidata nesta sessão...")}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {t("Present:", "Presentes:")} <strong className="text-emerald-700 font-bold">{attendedCount}</strong> / {slotCandidates.length}
          </div>

          <button
            type="button"
            onClick={handleExportAttendanceCSV}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>{t("Export Roster CSV", "Exportar Lista CSV")}</span>
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-2.5">{t("Candidate", "Candidata")}</th>
              <th className="px-4 py-2.5">{t("Phone", "WhatsApp")}</th>
              <th className="px-4 py-2.5">{t("Confirmed Slot", "Turno Confirmado")}</th>
              <th className="px-4 py-2.5">{t("Gate Presence", "Presença no Portão")}</th>
              <th className="px-4 py-2.5">{t("Arrival Time", "Hora de Chegada")}</th>
              <th className="px-4 py-2.5 text-right">{t("Action", "Ação")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {slotCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                  {t("No candidates scheduled for this session.", "Nenhum candidato agendado para esta sessão.")}
                </td>
              </tr>
            ) : (
              slotCandidates.map((candidate) => {
                const isPresent = Boolean(candidate.attendedAt);

                return (
                  <tr key={candidate.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/recruitment/candidates/${candidate.id}`}
                        className="font-semibold text-slate-900 hover:text-sky-700 block truncate max-w-[220px]"
                      >
                        {candidate.name}
                      </Link>
                      <div className="text-[0.7rem] text-slate-400 truncate max-w-[220px]">
                        {candidate.email}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-[0.75rem] text-slate-600 whitespace-nowrap">
                      {formatPhoneDisplay(candidate.whatsapp)}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                      {formatSlotDisplay(candidate.testSlot || "")}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleAttendance(candidate.id, !isPresent)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>{t("Present", "Presente")}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} className="text-slate-400" />
                            <span>{t("Awaiting", "Aguardado")}</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[0.7rem]">
                      {candidate.attendedAt
                        ? new Date(candidate.attendedAt).toLocaleTimeString("pt-MZ")
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/recruitment/candidates/${candidate.id}`}
                        className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                      >
                        {t("View Profile", "Ver Perfil")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Config Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {t("Configure Slots & Quotas", "Configurar Turnos & Quotas")}
              </h3>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t("Default Session Quota (Capacity)", "Limite Padrão por Sessão (Quota)")}
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={editingQuota}
                onChange={(e) => setEditingQuota(parseInt(e.target.value, 10) || 15)}
                className="w-24 px-3 py-1.5 text-xs rounded border border-slate-300 font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {t("Active Published Slots", "Datas e Turnos Publicados")}
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 admin-scrollbar">
                {editingSlots.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-medium text-slate-800 truncate">{formatSlotDisplay(s)}</span>
                    <button
                      type="button"
                      onClick={() => setEditingSlots(editingSlots.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g. Quarta-feira, 25 de Setembro - 10h00"
                  value={newSlotText}
                  onChange={(e) => setNewSlotText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 placeholder-slate-400"
                />
                <button
                  type="button"
                  disabled={!newSlotText.trim()}
                  onClick={() => {
                    if (newSlotText.trim()) {
                      setEditingSlots([...editingSlots, newSlotText.trim()]);
                      setNewSlotText("");
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="px-3 py-1.5 rounded bg-[#0a1128] hover:bg-[#101b3d] text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {savingConfig ? t("Saving...", "A guardar...") : t("Save Changes", "Guardar Alterações")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
