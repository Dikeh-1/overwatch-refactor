"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Camera,
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
} from "lucide-react";
import { Application, normalizeSlot, formatSlotDisplay } from "@/lib/careers";
import { siteContact } from "@/lib/site-config";

interface ScheduleViewProps {
  applications: Application[];
  lang: "pt" | "en";
  searchQuery: string;
  onSelectCandidate: (candidate: Application) => void;
  onToggleAttendance: (candidateId: string, attended: boolean) => Promise<void>;
  onOpenGateScanner: () => void;
  onDispatchGatePasses: () => void;
  slotQuota: number;
  broadcastSlots: string[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  applications,
  lang,
  searchQuery,
  onSelectCandidate,
  onToggleAttendance,
  onOpenGateScanner,
  onDispatchGatePasses,
  slotQuota,
  broadcastSlots,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

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

  const [selectedSlot, setSelectedSlot] = useState<string>("all");

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
          a.whatsapp.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    }
    return list;
  }, [bookedCandidates, selectedSlot, searchQuery]);

  const attendedCount = slotCandidates.filter((c) => Boolean(c.attendedAt)).length;
  const isFull = selectedSlot !== "all" && slotCandidates.length >= slotQuota;
  const spotsFree = selectedSlot !== "all" ? Math.max(0, slotQuota - slotCandidates.length) : null;

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = ["Nome", "Email", "WhatsApp", "Turno", "Presença", "Hora de Chegada"];
    const rows = slotCandidates.map((c) => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.whatsapp}"`,
      `"${c.testSlot || ""}"`,
      c.attendedAt ? '"PRESENTE"' : '"AGUARDADO"',
      c.attendedAt ? `"${new Date(c.attendedAt).toLocaleTimeString("pt-MZ")}"` : '""',
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Overwatch_Escala_${selectedSlot === "all" ? "Geral" : selectedSlot.slice(0, 15)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Date Navigation & Selector Strip */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d121f] p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {t("Select Test Session", "Seleccionar Sessão de Teste")}
            </h2>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGateScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Camera size={13} />
              <span>{t("Gate QR Scanner", "Leitor QR Portaria")}</span>
            </button>

            <button
              type="button"
              onClick={onDispatchGatePasses}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <QrCode size={13} />
              <span>{t("Dispatch QR Passes", "Disparar Passes QR")}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={slotCandidates.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download size={13} />
              <span>{t("Export CSV", "Exportar CSV")}</span>
            </button>
          </div>
        </div>

        {/* Slot Pills Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSlot("all")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSlot === "all"
                ? "bg-white/[0.12] text-white border border-white/15 shadow-sm"
                : "text-slate-400 hover:text-white bg-black/30 border border-white/[0.06]"
            }`}
          >
            <span>{t("All Sessions (Consolidated)", "Todos os Turnos (Consolidado)")}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[0.65rem] font-mono ${
                selectedSlot === "all" ? "bg-white/20 text-white font-bold" : "bg-white/[0.06] text-slate-400"
              }`}
            >
              {bookedCandidates.length}
            </span>
          </button>

          {allSlots.map((slot) => {
            const count = bookedCandidates.filter((a) => normalizeSlot(a.testSlot) === slot).length;
            const isSelected = selectedSlot === slot;
            const isSlotFull = count >= slotQuota;

            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white/[0.12] text-white border border-white/15 shadow-sm"
                    : "text-slate-400 hover:text-white bg-black/30 border border-white/[0.06]"
                }`}
              >
                <span>{formatSlotDisplay(slot, lang)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[0.65rem] font-mono font-medium ${
                    isSlotFull
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : count > 0
                        ? isSelected
                          ? "bg-white/25 text-white font-bold"
                          : "bg-white/10 text-slate-300"
                        : "bg-white/[0.04] text-slate-500"
                  }`}
                >
                  {count} {slotQuota ? `/ ${slotQuota}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Session Overview Banner */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0d121f] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              {selectedSlot === "all"
                ? t("Consolidated Roster · All Dates", "Escala Consolidada · Todas as Datas")
                : formatSlotDisplay(selectedSlot, lang)}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold border ${
                isFull
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {slotCandidates.length} {t("candidates confirmed", "candidatas confirmadas")}
              {spotsFree !== null && !isFull ? ` (${spotsFree} ${t("spots free", "vagas livres")})` : ""}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {t("Present at Gate:", "Presentes no Portão:")} {attendedCount} / {slotCandidates.length}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-sky-400" />
              <span>{t("Arrival: 09:30 · Test: 10:00 · Gates lock at 09:50", "Chegada: 09h30 · Teste: 10h00 · Portão encerra às 09h50")}</span>
            </span>
            <span>•</span>
            <span>{siteContact.address.pt}</span>
          </div>
        </div>
      </div>

      {/* Candidates Attendance Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d121f] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/20 text-slate-400 text-[0.68rem] font-bold uppercase tracking-wider">
                <th className="px-4 py-3.5">{t("Candidate", "Candidata")}</th>
                <th className="px-4 py-3.5">{t("WhatsApp Contact", "Contacto WhatsApp")}</th>
                <th className="px-4 py-3.5">{t("Assigned Session", "Turno Atribuído")}</th>
                <th className="px-4 py-3.5">{t("Gate Attendance Status", "Estado na Portaria")}</th>
                <th className="px-4 py-3.5 text-right">{t("Profile", "Perfil")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {slotCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 space-y-2">
                    <Calendar size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-white">
                      {t("No candidates scheduled for this session", "Nenhuma candidata agendada para esta sessão")}
                    </p>
                  </td>
                </tr>
              ) : (
                slotCandidates.map((candidate) => {
                  const isPresent = Boolean(candidate.attendedAt);

                  return (
                    <tr key={candidate.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Candidate */}
                      <td className="px-4 py-3.5">
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
                      <td className="px-4 py-3.5 whitespace-nowrap">
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

                      {/* Session */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-300 font-medium">
                        {formatSlotDisplay(candidate.testSlot || "", lang)}
                      </td>

                      {/* Presence Toggle Button */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isPresent ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                              <Check size={12} />
                              <span>{t("Present", "Presente")}</span>
                            </span>
                            <span className="text-[0.65rem] text-slate-400 font-mono">
                              {new Date(candidate.attendedAt!).toLocaleTimeString("pt-MZ", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Africa/Maputo",
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggleAttendance(candidate.id, false)}
                              className="text-[0.65rem] text-slate-500 hover:text-rose-400 underline cursor-pointer ml-1"
                            >
                              {t("Undo", "Desfazer")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleAttendance(candidate.id, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-emerald-500/15 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 border border-white/10 transition-colors cursor-pointer"
                          >
                            <Clock size={11} className="text-slate-400" />
                            <span>{t("Mark Present", "Marcar Presença")}</span>
                          </button>
                        )}
                      </td>

                      {/* Profile Button */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
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
      </div>
    </div>
  );
};

export default ScheduleView;
