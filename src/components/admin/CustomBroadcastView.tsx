"use client";

import React, { useState, useMemo } from "react";
import {
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  RefreshCw,
  FileText,
  Eye,
  Filter,
  Check,
  ChevronDown,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";
import type { Application } from "@/lib/careers";

interface CustomBroadcastViewProps {
  applications: Application[];
  activeCampaignRole: string | null;
  roleLabel: (id: string) => string;
  lang: "en" | "pt";
  t: (en: string, pt: string) => string;
  onRefresh: () => Promise<void>;
}

const TEMPLATES = [
  {
    id: "filipa_unconfirmed",
    name: "Aviso de Confirmação Obrigatória (Filipa)",
    audience: "invited_unconfirmed" as const,
    subject: "Aviso Urgente: Confirmação Obrigatória da Data do Teste Presencial — Overwatch",
    includeButton: true,
    buttonText: "Confirmar Data do Teste Presencial",
    body: `Recordamos que a recepção de um convite para o teste presencial não significa que a sua presença esteja automaticamente confirmada.

Para participar no teste, é obrigatório:
1. Responder/confirmar no link abaixo a data em que pretende realizar o teste.
2. Receber a respectiva confirmação.
3. Comparecer apenas na data confirmada.

Candidatas que não tenham confirmado previamente a data não constarão da lista de presença e não serão autorizadas a entrar para realizar o teste.

No dia do teste, é igualmente obrigatório trazer:
• Cópia do documento de identificação;
• Uma caneta.

Quem comparecer sem cópia do documento de identificação ou sem caneta não será autorizado a realizar o teste.

Pedimos que não se desloque às instalações da Overwatch sem ter concluído previamente a confirmação da sua data.

Estas regras aplicam-se a todas as candidatas, sem excepção, para garantir a organização e o bom funcionamento do processo de recrutamento.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch`,
  },
  {
    id: "reminder_documents",
    name: "Lembrete: Documentos & Regras de Acesso",
    audience: "booked_confirmed" as const,
    subject: "Lembrete Importante: Requisitos de Acesso ao Teste Presencial — Overwatch",
    includeButton: false,
    buttonText: "Ver Detalhes do Teste",
    body: `Este é um lembrete relativo ao seu teste presencial agendado nas instalações da Overwatch Moçambique.

Lembramos que o acesso às instalações é estritamente condicionado ao cumprimento das seguintes regras:
• É obrigatório apresentar uma cópia física do documento de identificação (BI ou Passaporte);
• É obrigatório trazer uma caneta esferográfica para realização da prova;
• Apresentar o seu Código QR de acesso (em formato digital no telemóvel ou impresso).

Quem comparecer sem cópia do documento de identificação ou sem caneta não poderá aceder ao recinto.

Endereço das instalações: Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.
Por favor, compareça com 15 minutos de antecedência em relação ao horário marcado.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch`,
  },
  {
    id: "custom_blank",
    name: "Mensagem Personalizada em Branco",
    audience: "all_invited" as const,
    subject: "",
    includeButton: false,
    buttonText: "Aceder ao Portal",
    body: "",
  },
];

export function CustomBroadcastView({
  applications,
  activeCampaignRole,
  roleLabel,
  lang,
  t,
  onRefresh,
}: CustomBroadcastViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("filipa_unconfirmed");
  const [audienceFilter, setAudienceFilter] = useState<
    "invited_unconfirmed" | "booked_confirmed" | "all_invited" | "all_applied" | "disqualified"
  >("invited_unconfirmed");
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [includeButton, setIncludeButton] = useState(TEMPLATES[0].includeButton);
  const [buttonText, setButtonText] = useState(TEMPLATES[0].buttonText);

  const [showRecipientList, setShowRecipientList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter applications by role and selected audience filters
  const targetCandidates = useMemo(() => {
    let pool = activeCampaignRole
      ? applications.filter((a) => a.role === activeCampaignRole)
      : applications;

    // Audience filter
    if (audienceFilter === "invited_unconfirmed") {
      pool = pool.filter(
        (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived"
      );
    } else if (audienceFilter === "booked_confirmed") {
      pool = pool.filter(
        (a) => Boolean(a.testSlot) && a.status !== "archived"
      );
    } else if (audienceFilter === "all_invited") {
      pool = pool.filter(
        (a) => Boolean(a.invitedAt) && a.status !== "archived"
      );
    } else if (audienceFilter === "disqualified") {
      pool = pool.filter((a) => a.status === "archived");
    } else if (audienceFilter === "all_applied") {
      pool = pool.filter((a) => a.status !== "archived");
    }

    // Gender filter
    if (genderFilter !== "all") {
      pool = pool.filter((a) => a.sex === genderFilter);
    }

    // Deduplicate by email and remove Inocio Wilson
    const seen = new Set<string>();
    const result: Application[] = [];
    for (const c of pool) {
      const email = c.email.trim().toLowerCase();
      if (
        email === "inociowilson7@gmail.com" ||
        c.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956"
      ) {
        continue;
      }
      if (!seen.has(email)) {
        seen.add(email);
        result.push(c);
      }
    }
    return result;
  }, [applications, activeCampaignRole, audienceFilter, genderFilter]);

  const womenCount = targetCandidates.filter((c) => c.sex === "female").length;
  const menCount = targetCandidates.filter((c) => c.sex === "male").length;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setAudienceFilter(tmpl.audience);
      setSubject(tmpl.subject);
      setMessage(tmpl.body);
      setIncludeButton(tmpl.includeButton);
      setButtonText(tmpl.buttonText);
      setStatusFeedback(null);
    }
  };

  const handleSendTest = async () => {
    if (!subject.trim() || !message.trim()) {
      setStatusFeedback({
        type: "error",
        message: t("Please specify subject and message.", "Por favor preencha o assunto e a mensagem."),
      });
      return;
    }
    setIsSendingTest(true);
    setStatusFeedback(null);
    try {
      const res = await fetch("/api/admin/careers/custom-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceFilter,
          genderFilter,
          roleId: activeCampaignRole || undefined,
          subject,
          message,
          includeBookingButton: includeButton,
          buttonText,
          testOnly: true,
          testEmail: "ebube.michael@overwatchmoz.com",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");
      setStatusFeedback({
        type: "success",
        message: t(
          "Test preview dispatched successfully to ebube.michael@overwatchmoz.com!",
          "E-mail de teste enviado com sucesso para ebube.michael@overwatchmoz.com!"
        ),
      });
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleBroadcastDispatch = async () => {
    if (!targetCandidates.length) return;
    setIsSending(true);
    setStatusFeedback(null);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/admin/careers/custom-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceFilter,
          genderFilter,
          roleId: activeCampaignRole || undefined,
          subject,
          message,
          includeBookingButton: includeButton,
          buttonText,
          testOnly: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Broadcast dispatch failed");

      setStatusFeedback({
        type: "success",
        message: t(
          `Broadcast successfully sent to ${data.sentCount} of ${data.totalTargeted} candidates!`,
          `Comunicação enviada com sucesso para ${data.sentCount} de ${data.totalTargeted} candidatos!`
        ),
      });
      await onRefresh();
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Top Banner Alert / Feedback */}
      {statusFeedback && (
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
            statusFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusFeedback.type === "success" ? (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-semibold">{statusFeedback.message}</p>
          </div>
          <button
            onClick={() => setStatusFeedback(null)}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Template Selector Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-sky-400" />
              {t("Communication Templates", "Modelos de Comunicação Prontos")}
            </h3>
            <p className="text-xs text-white/50">
              {t(
                "Choose a pre-configured template or compose a customized outreach message",
                "Escolha um modelo pré-formatado ou escreva uma mensagem personalizada"
              )}
            </p>
          </div>
          {activeCampaignRole && (
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-1">
              {roleLabel(activeCampaignRole)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tmpl.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-sky-500/50 bg-sky-500/10 shadow-md ring-1 ring-sky-500/30"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white truncate">{tmpl.name}</span>
                  {isSelected && <Check size={14} className="text-sky-400 shrink-0" />}
                </div>
                <p className="text-[0.68rem] text-white/50 line-clamp-2">
                  {tmpl.subject || t("Blank custom message", "Mensagem livre sem modelo")}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout: Form & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audience & Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Audience Targeter */}
          <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Filter size={13} />
              {t("Target Audience Segment", "Segmento de Destinatários")}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Audience Dropdown */}
              <div>
                <label className="text-[0.68rem] font-semibold text-white/60 block mb-1.5">
                  {t("Audience Group:", "Grupo Alvo:")}
                </label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="invited_unconfirmed" className="bg-[#121827]">
                    {t(
                      "Invited & Unconfirmed (Filipa Audience)",
                      "Convocados que NÃO Confirmaram Data"
                    )}
                  </option>
                  <option value="booked_confirmed" className="bg-[#121827]">
                    {t("Booked / Confirmed Test Date", "Candidatos c/ Data Confirmada")}
                  </option>
                  <option value="all_invited" className="bg-[#121827]">
                    {t("All Invited Candidates", "Todos os Convocados para Teste")}
                  </option>
                  <option value="all_applied" className="bg-[#121827]">
                    {t("All Active Applicants", "Todas as Candidaturas Activas")}
                  </option>
                  <option value="disqualified" className="bg-[#121827]">
                    {t("Disqualified / Archived", "Desqualificados / Arquivados")}
                  </option>
                </select>
              </div>

              {/* Gender Filter Dropdown */}
              <div>
                <label className="text-[0.68rem] font-semibold text-white/60 block mb-1.5">
                  {t("Gender Filter:", "Filtro de Género:")}
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all" className="bg-[#121827]">
                    {t("All Genders (Male & Female)", "Todos os Géneros (Ambos)")}
                  </option>
                  <option value="female" className="bg-[#121827]">
                    {t("Women Only", "Apenas Mulheres (Feminino)")}
                  </option>
                  <option value="male" className="bg-[#121827]">
                    {t("Men Only", "Apenas Homens (Masculino)")}
                  </option>
                </select>
              </div>
            </div>

            {/* Audience Summary Banner */}
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold text-sm">
                  {targetCandidates.length}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {t("Selected Recipients", "Destinatários Seleccionados")}
                  </div>
                  <div className="text-[0.68rem] text-white/50 flex items-center gap-2 mt-0.5">
                    <span className="text-pink-400 font-medium">♀ {womenCount} {t("women", "mulheres")}</span>
                    <span>•</span>
                    <span className="text-sky-400 font-medium">♂ {menCount} {t("men", "homens")}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRecipientList(!showRecipientList)}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
              >
                <span>{showRecipientList ? t("Hide List", "Ocultar Lista") : t("View Candidates", "Ver Candidatos")}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showRecipientList ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Collapsible Candidate List Table */}
            {showRecipientList && (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-black/40 text-xs divide-y divide-white/5">
                {targetCandidates.length === 0 ? (
                  <div className="p-4 text-center text-white/40">
                    {t("No candidates match this criteria.", "Nenhum candidato corresponde a este filtro.")}
                  </div>
                ) : (
                  targetCandidates.map((c, idx) => (
                    <div
                      key={c.id}
                      className="px-3.5 py-2 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[0.65rem] text-white/30 font-mono w-5">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold text-white truncate">{c.name}</span>
                        <span className="text-white/40 truncate text-[0.7rem]">&lt;{c.email}&gt;</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                            c.sex === "female"
                              ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {c.sex === "female" ? "♀ F" : "♂ M"}
                        </span>
                        {c.testSlot ? (
                          <span className="text-[0.65rem] text-emerald-400 font-mono">
                            {c.testSlot.split("–")[0]}
                          </span>
                        ) : (
                          <span className="text-[0.65rem] text-amber-400">
                            {t("Unconfirmed", "Pendente")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Message Composer */}
          <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Mail size={13} />
              {t("Email Composition", "Redacção da Mensagem")}
            </h4>

            {/* Subject */}
            <div>
              <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                {t("Subject Line:", "Assunto do E-mail:")}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("Enter email subject...", "Introduza o assunto do e-mail...")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                {t("Message Body (Supports paragraph breaks & bullet points):", "Corpo da Mensagem (Suporta parágrafos e marcadores):")}
              </label>
              <textarea
                rows={11}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("Write your message here...", "Escreva a mensagem aqui...")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs text-white focus:outline-none focus:border-sky-500 font-sans leading-relaxed resize-y"
              />
            </div>

            {/* Call to Action Button Toggle */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {t("Include Direct Booking Link Button", "Incluir Botão de Agendamento Directo")}
                  </div>
                  <div className="text-[0.68rem] text-white/50">
                    {t(
                      "Inserts a secure 1-click booking button tailored to each candidate's profile",
                      "Insere um botão que leva o candidato directamente ao portal de agendamento"
                    )}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeButton}
                  onChange={(e) => setIncludeButton(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-sky-500 cursor-pointer"
                />
              </div>

              {includeButton && (
                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Button Label:", "Texto do Botão:")}
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || isSending || !subject.trim()}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSendingTest ? (
                  <RefreshCw size={14} className="animate-spin text-sky-400" />
                ) : (
                  <Eye size={14} className="text-sky-400" />
                )}
                <span>{t("Send Test Preview to Ebube", "Enviar Prévia p/ Ebube")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSending || isSendingTest || targetCandidates.length === 0 || !subject.trim()}
                className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <RefreshCw size={14} className="animate-spin text-white" />
                ) : (
                  <Send size={14} className="text-white" />
                )}
                <span>
                  {t(
                    `Dispatch to ${targetCandidates.length} Candidates`,
                    `Disparar para ${targetCandidates.length} Candidatos`
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Email Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Eye size={13} />
              {t("Live Email Letterhead Preview", "Pré-visualização Oficial (Letterhead)")}
            </h4>
            <span className="text-[0.65rem] text-white/40">
              {t("Simulated Candidate View", "Vista do Candidato")}
            </span>
          </div>

          {/* Rendered Email Container (Light Theme Letterhead) */}
          <div className="rounded-2xl border border-white/10 bg-slate-100 text-slate-800 shadow-xl overflow-hidden text-xs">
            {/* Dark Brand Header */}
            <div className="bg-[#0b0f19] p-5 text-center border-b-2 border-sky-600">
              <span className="text-lg font-extrabold tracking-widest text-white uppercase">
                OVERWATCH
              </span>
              <div className="text-[0.62rem] tracking-wider text-sky-400 uppercase font-semibold mt-0.5">
                Direcção de Recursos Humanos & Operações
              </div>
            </div>

            {/* Email Body Content */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="font-bold text-slate-900 text-sm">
                Prezada(o) [Nome do Candidato],
              </div>

              <div className="text-slate-700 leading-relaxed whitespace-pre-line text-xs font-sans">
                {message || t("Message body preview will appear here...", "O texto da mensagem aparecerá aqui...")}
              </div>

              {includeButton && (
                <div className="pt-2 pb-1 text-center">
                  <div className="inline-block bg-sky-600 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm text-xs">
                    {buttonText || "Confirmar Data do Teste Presencial"} &rarr;
                  </div>
                </div>
              )}

              {/* Official Address Box */}
              <div className="bg-slate-50 border-l-4 border-sky-600 p-3 rounded-r-lg text-[0.68rem] text-slate-600 leading-relaxed">
                <div className="font-bold text-slate-900 uppercase text-[0.65rem] mb-0.5">
                  📍 Endereço Oficial das Instalações
                </div>
                <strong>Overwatch Moçambique:</strong> Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.
              </div>
            </div>

            {/* Email Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[0.65rem] text-slate-400">
              Esta é uma comunicação oficial da Equipa de Recrutamento da Overwatch Moçambique.
              <br />© 2026 Overwatch Moçambique. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121827] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Send size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {t("Confirm Email Broadcast", "Confirmar Disparo de E-mails")}
                </h4>
                <p className="text-xs text-white/50">
                  {t(
                    `You are about to dispatch this email to ${targetCandidates.length} candidate(s).`,
                    `Está prestes a enviar este comunicado para ${targetCandidates.length} candidato(s).`
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1.5">
              <div className="text-white/40">{t("Subject:", "Assunto:")}</div>
              <div className="font-semibold text-white truncate">{subject}</div>
              <div className="text-white/40 mt-2">{t("Demographics:", "Demografia:")}</div>
              <div className="flex items-center gap-2 text-white/80 font-medium">
                <span className="text-pink-400">♀ {womenCount} {t("women", "mulheres")}</span>
                <span>•</span>
                <span className="text-sky-400">♂ {menCount} {t("men", "homens")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:text-white border border-white/10"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleBroadcastDispatch}
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20"
              >
                {isSending ? t("Sending...", "A enviar...") : t("Yes, Dispatch Now", "Sim, Disparar Agora")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
