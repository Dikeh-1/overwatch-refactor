"use client";

import { recordExportRequest } from "@/lib/admin-browser-activity";
import { csvCell } from "@/lib/csv";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { candidateProfileTarget } from "@/lib/admin-navigation";
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
import { hasAttended, isTerminal } from "@/lib/careers-workflow";
import { getQuotaForSlot } from "@/lib/careers-booking-rules";
import { Application, normalizeSlot, formatSlotDisplay, formatPhoneDisplay } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { useActiveRole } from "../shell/ActiveRoleContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import StickyScrollContainer from "@/components/admin/ui/StickyScrollContainer";

interface TestingAttendanceViewProps {
  applications: Application[];
  lang?: "pt" | "en";
  slotQuota: number;
  slotQuotas?: Record<string, number>;
  broadcastSlots: string[];
  onToggleAttendance: (candidateId: string, attended: boolean) => Promise<void>;
  onOpenGateScanner: () => void;
  onDispatchGatePasses: () => Promise<void>;
  onSaveSlots: (slots: string[], quota: number) => Promise<boolean>;
}

export const TestingAttendanceView: React.FC<TestingAttendanceViewProps> = ({
  applications,
  lang: propLang,
  slotQuota,
  slotQuotas,
  broadcastSlots,
  onToggleAttendance,
  onOpenGateScanner,
  onDispatchGatePasses,
  onSaveSlots,
}) => {
  const pathname = usePathname(), params = useSearchParams();
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [selectedSlot, setSelectedSlot] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingSlots, setEditingSlots] = useState<string[]>(broadcastSlots);
  const [editingQuota, setEditingQuota] = useState<number>(slotQuota || 15);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("10:00");
  const [newSlotText, setNewSlotText] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [togglingAttendanceId, setTogglingAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    setEditingSlots(broadcastSlots);
  }, [broadcastSlots]);

  useEffect(() => {
    setEditingQuota(slotQuota || 15);
  }, [slotQuota]);

  const handleToggleAttendanceWithFeedback = async (candidateId: string, attended: boolean) => {
    setTogglingAttendanceId(candidateId);
    try {
      await onToggleAttendance(candidateId, attended);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin:careers-updated"));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update attendance");
    } finally {
      setTogglingAttendanceId(null);
    }
  };

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

  const { activeRole, activeRoleId, roles: roleDefs } = useActiveRole();
  const currentRoleDef = roleDefs?.find((r) => r.id === activeRoleId) || activeRole;

  // Candidates in active session filtered by active role workspace
  const bookedCandidates = useMemo(() => {
    return applications.filter((a) => {
      if (!a.testSlot || isTerminal(a)) return false;
      if (!activeRoleId || activeRoleId === "all") return true;
      if (activeRoleId === "cctv" || activeRoleId === "cctv_operator") {
        return !a.role || a.role === "cctv" || a.role === "cctv_operator";
      }
      return a.role === activeRoleId;
    });
  }, [applications, activeRoleId]);

  const slotCandidates = useMemo(() => {
    let list = bookedCandidates;
    if (selectedSlot !== "all") {
      list = list.filter((a) => normalizeSlot(a.testSlot) === normalizeSlot(selectedSlot));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.startsWith("#") ? q.slice(1).trim() : q;
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.whatsapp.includes(q) ||
          a.id.toLowerCase().includes(cleanQ) ||
          a.id.slice(0, 8).toLowerCase().includes(cleanQ)
      );
    }
    return list;
  }, [bookedCandidates, selectedSlot, searchQuery]);

  const attendedCount = slotCandidates.filter(hasAttended).length;
  const currentSlotOccupancy = slotCandidates.length;
  const selectedSlotQuota = selectedSlot !== "all" ? getQuotaForSlot(selectedSlot, slotQuota, slotQuotas) : slotQuota;
  const isOverCapacity = selectedSlot !== "all" && currentSlotOccupancy > selectedSlotQuota;
  const overCount = selectedSlot !== "all" ? Math.max(0, currentSlotOccupancy - selectedSlotQuota) : 0;

  // Export CSV
  const handleExportAttendanceCSV = async () => {
    if (!(await recordExportRequest(slotCandidates.length))) return;
    const headers = lang === "en"
      ? ["Name", "Email", "WhatsApp", "Session Slot", "Attendance", "Check-in Time"]
      : ["Nome", "Email", "WhatsApp", "Turno", "Presença", "Hora de Entrada"];
    const rows = slotCandidates.map(c => [c.name, c.email, c.whatsapp, c.testSlot || "", hasAttended(c) ? t("Present", "Presente") : t("Not recorded", "Não registada"), c.attendedAt || ""]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
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
          {/* Session Confirmation Dispatch */}
          <button
            type="button"
            onClick={onDispatchGatePasses}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={13} />
            <span>{t("Send Session Confirmations", "Enviar Confirmações de Sessão")}</span>
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

      {/* Sticky Session Navigation & Search Toolbar */}
      <div className="sticky top-[102px] z-20 bg-[#F7F8FA] pt-1 pb-2 space-y-2.5">
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
          const thisSlotQuota = getQuotaForSlot(slot, slotQuota, slotQuotas);
          const remaining = Math.max(0, thisSlotQuota - count);
          const isOver = count > thisSlotQuota;

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
              <span>{formatSlotDisplay(slot, lang)}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold ${
                  isOver
                    ? "bg-amber-100 text-amber-800"
                    : remaining === 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
                title={t(`${remaining} available slots remaining (${count} / ${thisSlotQuota} booked)`, `${remaining} vagas disponíveis (${count} / ${thisSlotQuota} inscritos)`)}
              >
                {count}/{thisSlotQuota} · {remaining} {t("avail", "disp.")}
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
                `This session has ${currentSlotOccupancy} confirmed candidates against a target quota of ${selectedSlotQuota} (+${overCount} over limit).`,
                `Esta sessão conta com ${currentSlotOccupancy} candidatas confirmadas face ao limite de ${selectedSlotQuota} (+${overCount} acima da quota).`
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
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          autoComplete="off"
          className="relative flex-1 min-w-[240px] max-w-md"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            name="testing_attendance_search_query"
            id="testing_attendance_search_query"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search candidate in session...", "Pesquisar candidata nesta sessão...")}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 [::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title={t("Clear search", "Limpar pesquisa")}
            >
              <X size={13} />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {selectedSlot !== "all" && (
              <span className="mr-3">
                {t("Available Remaining:", "Vagas Disponíveis:")}{" "}
                <strong className={selectedSlotQuota - currentSlotOccupancy > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                  {Math.max(0, selectedSlotQuota - currentSlotOccupancy)}
                </strong>{" "}
                ({currentSlotOccupancy}/{selectedSlotQuota}) ·
              </span>
            )}
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
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <StickyScrollContainer>
          <table className="w-full text-left border-collapse min-w-[700px]">
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
                        href={candidateProfileTarget(candidate.id, pathname, new URLSearchParams(params))}
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
                      {formatSlotDisplay(candidate.testSlot || "", lang)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={togglingAttendanceId === candidate.id}
                        onClick={() => handleToggleAttendanceWithFeedback(candidate.id, !isPresent)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {togglingAttendanceId === candidate.id ? (
                          <>
                            <OverwatchOrbitLoader size="xs" theme="light" className="shrink-0" />
                            <span>{t("Saving...", "A guardar...")}</span>
                          </>
                        ) : isPresent ? (
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
                        href={candidateProfileTarget(candidate.id, pathname, new URLSearchParams(params))}
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
        </StickyScrollContainer>
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
                    <span className="font-medium text-slate-800 truncate">{formatSlotDisplay(s, lang)}</span>
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

              <div className="flex flex-wrap items-end gap-2 pt-2">
                <label className="text-[11px] font-medium text-slate-600">
                  {t("Date", "Data")}
                  <input
                    type="date"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="mt-0.5 block px-2.5 py-1.5 text-xs rounded border border-slate-300"
                  />
                </label>
                <label className="text-[11px] font-medium text-slate-600">
                  {t("Time (Maputo)", "Hora (Maputo)")}
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="mt-0.5 block px-2.5 py-1.5 text-xs rounded border border-slate-300"
                  />
                </label>
                <button
                  type="button"
                  disabled={!newSlotDate || !newSlotTime}
                  onClick={() => {
                    if (newSlotDate && newSlotTime) {
                      const slot = `${newSlotDate} - ${newSlotTime}`;
                      setEditingSlots((prev) => [...new Set([...prev, slot])]);
                      setNewSlotDate("");
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {t("+ Add Date", "+ Adicionar Data")}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. 2026-10-31 - 10:00"
                  value={newSlotText}
                  onChange={(e) => setNewSlotText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 placeholder-slate-400"
                />
                <button
                  type="button"
                  disabled={!newSlotText.trim()}
                  onClick={() => {
                    if (newSlotText.trim()) {
                      setEditingSlots([...new Set([...editingSlots, newSlotText.trim()])]);
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
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
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
