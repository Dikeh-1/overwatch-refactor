"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Send,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Search,
  Sparkles,
  SlidersHorizontal,
  Clock,
  ShieldCheck,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Application, normalizeSlot, formatSlotDisplay } from "@/lib/careers";

interface InvitationsViewProps {
  applications: Application[];
  lang: "pt" | "en";
  activeRole: string | null;
  broadcastSlots: string[];
  slotQuota: number;
  onSaveSlots: (slots: string[], quota: number) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  searchQuery: string;
}

export const InvitationsView: React.FC<InvitationsViewProps> = ({
  applications,
  lang,
  activeRole,
  broadcastSlots,
  slotQuota,
  onSaveSlots,
  onRefresh,
  searchQuery,
}) => {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const [activeSubTab, setActiveSubTab] = useState<"dispatch" | "slots">("dispatch");

  // --- SLOTS MANAGEMENT STATE ---
  const [currentSlots, setCurrentSlots] = useState<string[]>(broadcastSlots);
  const [currentQuota, setCurrentQuota] = useState<number>(slotQuota || 15);
  const [newSlotInput, setNewSlotInput] = useState("");
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [saveSlotSuccess, setSaveSlotSuccess] = useState(false);

  useEffect(() => {
    setCurrentSlots(broadcastSlots);
  }, [broadcastSlots]);

  useEffect(() => {
    setCurrentQuota(slotQuota || 15);
  }, [slotQuota]);

  // --- INVITATION DISPATCH STATE ---
  const [audienceFilter, setAudienceFilter] = useState<"shortlisted_unbooked" | "all_shortlisted" | "all_pending">("shortlisted_unbooked");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState(
    lang === "pt"
      ? "Convocatória para Teste Presencial — Overwatch Mozambique"
      : "In-Person Test Invitation — Overwatch Mozambique"
  );
  const [emailBody, setEmailBody] = useState(
    lang === "pt"
      ? `Exmo(a) {{candidate_name}},

Temos o prazer de informar que a sua candidatura foi pré-selecionada para a fase de avaliação técnica e operacional da Overwatch Mozambique.

Para garantir a sua participação, é obrigatório selecionar a data da sua sessão de teste presencial através do link abaixo:

{{booking_link}}

Requisitos obrigatórios para o dia do teste:
• Cópia física do Documento de Identificação (BI ou Passaporte);
• Caneta esferográfica preta ou azul;
• Pontualidade rigorosa (apresentar-se 15 minutos antes da hora marcada).

Nota: Apenas os candidatos com sessão previamente agendada e confirmada terão autorização de acesso às instalações.

Com os melhores cumprimentos,
Departamento de Recrutamento & Seleção
Overwatch Mozambique`
      : `Dear {{candidate_name}},

We are pleased to inform you that your application has been shortlisted for the technical assessment phase at Overwatch Mozambique.

To secure your spot, you must schedule your in-person testing session using the link below:

{{booking_link}}

Mandatory requirements on the test day:
• Physical copy of your ID or Passport;
• Black or blue ballpoint pen;
• Strict punctuality (arrive 15 minutes prior to scheduled time).

Note: Only candidates with a confirmed booking will be granted access to the premises.

Best regards,
Recruitment & Selection Team
Overwatch Mozambique`
  );

  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null);

  // Filter candidates according to audience
  const targetCandidates = useMemo(() => {
    let list = applications.filter((a) => a.status !== "archived" && a.status !== "rejected");
    if (activeRole) {
      list = list.filter((a) => a.role === activeRole || (activeRole === "cctv" && !a.role));
    }

    if (audienceFilter === "shortlisted_unbooked") {
      list = list.filter((a) => a.status === "shortlisted" && !a.testSlot);
    } else if (audienceFilter === "all_shortlisted") {
      list = list.filter((a) => a.status === "shortlisted");
    } else if (audienceFilter === "all_pending") {
      list = list.filter((a) => !a.testSlot && a.status !== "rejected");
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
  }, [applications, activeRole, audienceFilter, searchQuery]);

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === targetCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targetCandidates.map((c) => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Dispatch batch emails
  const handleDispatchInvitations = async () => {
    const selectedList = targetCandidates.filter((c) => selectedIds.has(c.id));
    if (selectedList.length === 0) return;

    const confirmMsg = t(
      `Send ${selectedList.length} invitations via email?`,
      `Enviar ${selectedList.length} convocatórias por email?`
    );
    if (!window.confirm(confirmMsg)) return;

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedList.length });
    setSendResult(null);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Chunk or sequential dispatch to ensure high deliverability and avoid SMTP limits
    for (let i = 0; i < selectedList.length; i++) {
      const candidate = selectedList[i];
      setSendProgress({ current: i + 1, total: selectedList.length });

      try {
        const res = await fetch("/api/admin/careers/bulk-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateIds: [candidate.id],
            subject: emailSubject,
            customBody: emailBody,
            roleId: activeRole,
          }),
        });

        if (res.ok) {
          success++;
        } else {
          const errData = await res.json().catch(() => ({}));
          failed++;
          errors.push(`${candidate.name} (${candidate.email}): ${errData.error || "Failed"}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${candidate.name}: ${err.message || "Network error"}`);
      }
    }

    setIsSending(false);
    setSendProgress(null);
    setSendResult({ success, failed, errors });
    setSelectedIds(new Set());
    await onRefresh();
  };

  // Send single preview / test email to admin
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestEmailFeedback(t("Please enter a valid email address.", "Por favor insira um email válido."));
      return;
    }

    setIsSendingTest(true);
    setTestEmailFeedback(null);

    try {
      const res = await fetch("/api/admin/careers/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testOnly: true,
          recipientEmail: testEmailAddress.trim(),
          subject: `[TEST PREVIEW] ${emailSubject}`,
          customBody: emailBody,
        }),
      });

      if (res.ok) {
        setTestEmailFeedback(t("Test email sent successfully! Check your inbox.", "Email de teste enviado com sucesso! Verifique a sua caixa de entrada."));
      } else {
        const err = await res.json().catch(() => ({}));
        setTestEmailFeedback(t(`Error sending test: ${err.error || "Unknown error"}`, `Erro ao enviar teste: ${err.error || "Erro desconhecido"}`));
      }
    } catch (err: any) {
      setTestEmailFeedback(t(`Network error: ${err.message}`, `Erro de rede: ${err.message}`));
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save Slots & Quota
  const handleSaveSlotsConfig = async () => {
    setIsSavingSlots(true);
    setSaveSlotSuccess(false);
    try {
      const success = await onSaveSlots(currentSlots, currentQuota);
      if (success) {
        setSaveSlotSuccess(true);
        setTimeout(() => setSaveSlotSuccess(false), 3000);
      }
    } finally {
      setIsSavingSlots(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    const formatted = newSlotInput.trim();
    if (!currentSlots.includes(formatted)) {
      setCurrentSlots([...currentSlots, formatted]);
    }
    setNewSlotInput("");
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    setCurrentSlots(currentSlots.filter((_, idx) => idx !== indexToRemove));
  };

  // Slot occupancy map
  const slotOccupancy = useMemo(() => {
    const map: Record<string, number> = {};
    applications.forEach((a) => {
      if (a.testSlot && a.status !== "archived" && a.status !== "rejected") {
        const norm = normalizeSlot(a.testSlot);
        map[norm] = (map[norm] || 0) + 1;
      }
    });
    return map;
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation Strip */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("dispatch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "dispatch"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Mail size={15} />
            <span>{t("Dispatch Invitations", "Envio de Convocatórias")}</span>
            {targetCandidates.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-sky-500/20 text-sky-200">
                {targetCandidates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("slots")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "slots"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Calendar size={15} />
            <span>{t("Slot Dates & Quotas", "Configurar Datas & Quotas")}</span>
            <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-white/10 text-slate-300">
              {currentSlots.length}
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: DISPATCH INVITATIONS */}
      {activeSubTab === "dispatch" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Candidate Selection & Filter */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users size={16} className="text-sky-400" />
                    {t("Select Recipients", "Destinatários da Convocatória")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("Choose candidates to receive personalized booking link", "Escolha os candidatos pré-selecionados para envio do link")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 transition-colors cursor-pointer"
                >
                  {selectedIds.size === targetCandidates.length && targetCandidates.length > 0
                    ? t("Deselect All", "Desmarcar Todos")
                    : t("Select All", "Selecionar Todos")}
                </button>
              </div>

              {/* Target filter */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAudienceFilter("shortlisted_unbooked")}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                    audienceFilter === "shortlisted_unbooked"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]"
                  }`}
                >
                  {t("Shortlisted (No Slot)", "Pré-selecionados (Sem Turno)")}
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceFilter("all_shortlisted")}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                    audienceFilter === "all_shortlisted"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]"
                  }`}
                >
                  {t("All Shortlisted", "Todos Pré-selecionados")}
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceFilter("all_pending")}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                    audienceFilter === "all_pending"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]"
                  }`}
                >
                  {t("All Unbooked", "Todos Não Agendados")}
                </button>
              </div>

              {/* Candidate List Box */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {targetCandidates.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    {t("No candidates match this audience criteria.", "Nenhum candidato encontrado com estes critérios.")}
                  </div>
                ) : (
                  targetCandidates.map((candidate) => {
                    const isSelected = selectedIds.has(candidate.id);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleToggleSelectOne(candidate.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-sky-500/10 border-sky-500/30 text-white"
                            : "bg-white/[0.02] border-white/[0.05] text-slate-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected
                                ? "bg-sky-500 border-sky-400 text-black"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {candidate.name}
                            </div>
                            <div className="text-[0.7rem] text-slate-400 truncate">
                              {candidate.email} • {candidate.whatsapp}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {candidate.testSlot ? (
                            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                              {formatSlotDisplay(candidate.testSlot)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              {t("Pending Booking", "Agendamento Pendente")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selection Summary */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <span>
                  {t(
                    `${selectedIds.size} of ${targetCandidates.length} selected`,
                    `${selectedIds.size} de ${targetCandidates.length} selecionados`
                  )}
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  {t("Overwatch SMTP Engine Active", "Motor SMTP Overwatch Ativo")}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Template Customization & Dispatch */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Mail size={16} className="text-emerald-400" />
                {t("Email Invitation Content", "Conteúdo do Email de Convocatória")}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("Email Subject", "Assunto do Email")}
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("Message Body (Supports placeholders)", "Corpo da Mensagem (Suporta tags)")}
                  </label>
                  <textarea
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono leading-relaxed placeholder-slate-500 focus:outline-none focus:border-sky-500/50 custom-scrollbar resize-none"
                  />
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[0.65rem] text-slate-400">
                    <span className="font-semibold text-slate-300">{t("Available tags:", "Tags disponíveis:")}</span>
                    <code className="px-1.5 py-0.5 rounded bg-white/10 text-sky-300">{"{{candidate_name}}"}</code>
                    <code className="px-1.5 py-0.5 rounded bg-white/10 text-sky-300">{"{{booking_link}}"}</code>
                  </div>
                </div>

                {/* Dispatch Progress / Feedback */}
                {sendProgress && (
                  <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-between text-xs text-sky-200 mb-1.5">
                      <span>{t("Sending invitations in progress...", "Envio de convocatórias em curso...")}</span>
                      <span className="font-bold">
                        {sendProgress.current} / {sendProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {sendResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <CheckCircle2 size={16} />
                      <span>
                        {t(
                          `Successfully dispatched: ${sendResult.success} emails sent.`,
                          `Convocatórias enviadas com sucesso: ${sendResult.success} emails.`
                        )}
                      </span>
                    </div>
                    {sendResult.failed > 0 && (
                      <div className="text-rose-400 text-[0.7rem] mt-1">
                        {t(`Failed to send ${sendResult.failed} emails.`, `Falha no envio de ${sendResult.failed} emails.`)}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDispatchInvitations}
                    disabled={selectedIds.size === 0 || isSending}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedIds.size > 0 && !isSending
                        ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-black hover:opacity-95 shadow-lg shadow-sky-500/20"
                        : "bg-white/10 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{t("Dispatching...", "A enviar convocatórias...")}</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>
                          {t(
                            `Send Invitations (${selectedIds.size})`,
                            `Disparar Convocatórias (${selectedIds.size})`
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Email Preview Box */}
            <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-sky-400" />
                {t("Send Test Preview to Admin", "Enviar Teste de Pré-visualização")}
              </h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="admin@overwatch.co.mz"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmailAddress}
                  className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSendingTest ? t("Sending...", "A enviar...") : t("Send Test", "Enviar Teste")}
                </button>
              </div>
              {testEmailFeedback && (
                <p className="text-[0.7rem] text-sky-300 mt-2 font-medium">
                  {testEmailFeedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SLOTS & QUOTAS CONFIGURATION */}
      {activeSubTab === "slots" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Add Slot & Global Quota */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-emerald-400" />
                  {t("Session Quota & Settings", "Configuração de Quotas & Sessões")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("Set maximum capacity per testing session", "Defina o limite máximo de candidatos por turno")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t("Maximum Candidates per Session (Quota)", "Limite de Candidatos por Turno (Quota)")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={currentQuota}
                    onChange={(e) => setCurrentQuota(parseInt(e.target.value) || 15)}
                    className="w-28 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-bold text-white text-center focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-xs text-slate-400">
                    {t("candidates / slot", "candidatos / sessão")}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t("Add New Testing Date / Slot", "Adicionar Nova Data / Turno")}
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. Quarta-feira, 25 de Setembro de 2026 das 09:00 às 13:00"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    disabled={!newSlotInput.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>{t("Add Date Slot to List", "Adicionar Data à Lista")}</span>
                  </button>
                </div>
              </div>

              {/* Save All Changes Button */}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={handleSaveSlotsConfig}
                  disabled={isSavingSlots}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-bold hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSlots ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>{t("Saving Configuration...", "A Guardar Configurações...")}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>{t("Save & Publish Live Slots", "Guardar e Publicar Vagas")}</span>
                    </>
                  )}
                </button>

                {saveSlotSuccess && (
                  <p className="text-center text-xs text-emerald-400 font-semibold">
                    {t("Slots and quotas saved successfully!", "Datas e quotas atualizadas com sucesso!")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Active Slots List & Real-time Occupancy */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#0d121f] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    {t("Active Published Slots", "Turnos Ativos Publicados")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("These are the exact dates visible to candidates on booking link", "Estas são as datas disponíveis no link de agendamento")}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {currentSlots.length} {t("dates", "datas")}
                </span>
              </div>

              <div className="space-y-2.5">
                {currentSlots.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    {t("No test slots configured. Add dates to enable booking.", "Nenhum turno configurado. Adicione datas para permitir agendamentos.")}
                  </div>
                ) : (
                  currentSlots.map((slot, idx) => {
                    const norm = normalizeSlot(slot);
                    const count = slotOccupancy[norm] || 0;
                    const pct = Math.min(100, Math.round((count / currentQuota) * 100));
                    const isFull = count >= currentQuota;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {formatSlotDisplay(slot)}
                            </span>
                            {isFull && (
                              <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {t("FULL", "LOTADO")}
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 bg-black/40 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isFull ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[0.7rem] font-mono text-slate-400 shrink-0">
                              {count} / {currentQuota} ({pct}%)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(idx)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title={t("Remove slot", "Remover turno")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
