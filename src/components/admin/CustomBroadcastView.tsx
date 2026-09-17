"use client";

import React, { useState, useMemo } from "react";
import {
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  RefreshCw,
  Eye,
  Filter,
  Check,
  ChevronDown,
  Phone,
  ShieldCheck,
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
    name: "Mensagem Livre em Branco",
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

  // Test send state with user-entered custom email
  const [testEmailInput, setTestEmailInput] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Main dispatch state
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter applications by active role and audience cohort
  const targetCandidates = useMemo(() => {
    let pool = activeCampaignRole
      ? applications.filter((a) => a.role === activeCampaignRole)
      : applications;

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

    if (genderFilter !== "all") {
      pool = pool.filter((a) => a.sex === genderFilter);
    }

    // Deduplicate by email address and exclude deactivated candidate
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
    const targetEmail = testEmailInput.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setStatusFeedback({
        type: "error",
        message: t(
          "Please enter a valid email address for the test send.",
          "Por favor introduza um endereço de e-mail válido para o envio de teste."
        ),
      });
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setStatusFeedback({
        type: "error",
        message: t("Please specify a subject and message.", "Por favor preencha o assunto e a mensagem."),
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
          testEmail: targetEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");

      setStatusFeedback({
        type: "success",
        message: t(
          `Test preview dispatched successfully to ${targetEmail}!`,
          `E-mail de teste enviado com sucesso para ${targetEmail}!`
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
          `Official communication successfully dispatched to ${data.sentCount} candidate(s)!`,
          `Comunicação oficial enviada com sucesso para ${data.sentCount} candidato(s)!`
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
      {/* Status Feedback Banner */}
      {statusFeedback && (
        <div
          className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
            statusFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusFeedback.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-semibold">{statusFeedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Template Selector */}
      <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
            {t("Pre-Configured Message Templates", "Modelos de Mensagem Prontos")}
          </h3>
          {activeCampaignRole && (
            <span className="text-[0.68rem] font-medium text-white/50">
              {roleLabel(activeCampaignRole)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tmpl.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-white/30 bg-white/[0.08] text-white"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/60 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{tmpl.name}</span>
                  {isSelected && <Check size={13} className="text-white shrink-0" />}
                </div>
                <p className="text-[0.68rem] text-white/40 line-clamp-1">
                  {tmpl.subject || t("Blank custom message", "Mensagem livre sem modelo")}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Audience Selector */}
          <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Filter size={13} className="text-white/60" />
              {t("Recipient Audience", "Público Alvo")}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                  {t("Audience Filter:", "Filtro de Destinatários:")}
                </label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
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

              <div>
                <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                  {t("Gender:", "Género:")}
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
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

            {/* Audience Summary Box */}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white">
                  {targetCandidates.length} {t("candidates selected", "candidatos seleccionados")}
                </div>
                <div className="text-[0.68rem] text-white/40 mt-0.5">
                  <span className="text-pink-400">♀ {womenCount} {t("women", "mulheres")}</span>
                  {" · "}
                  <span className="text-sky-400">♂ {menCount} {t("men", "homens")}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRecipientList(!showRecipientList)}
                className="text-xs text-white/70 hover:text-white font-medium px-2.5 py-1 rounded border border-white/10 hover:bg-white/[0.05] transition-colors"
              >
                {showRecipientList ? t("Hide", "Ocultar") : t("View list", "Ver lista")}
              </button>
            </div>

            {/* Collapsible Table */}
            {showRecipientList && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/40 text-xs divide-y divide-white/5">
                {targetCandidates.length === 0 ? (
                  <div className="p-3 text-center text-white/40">
                    {t("No candidates match this filter.", "Nenhum candidato corresponde a este filtro.")}
                  </div>
                ) : (
                  targetCandidates.map((c, idx) => (
                    <div
                      key={c.id}
                      className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[0.62rem] text-white/30 font-mono w-4">
                          {idx + 1}.
                        </span>
                        <span className="font-medium text-white truncate">{c.name}</span>
                        <span className="text-white/40 truncate text-[0.68rem]">&lt;{c.email}&gt;</span>
                      </div>
                      <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70 shrink-0">
                        {c.sex === "female" ? "♀ F" : "♂ M"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Message Editor */}
          <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Mail size={13} className="text-white/60" />
              {t("Message Content", "Conteúdo da Comunicação")}
            </h4>

            <div>
              <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                {t("Subject:", "Assunto:")}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("Subject line...", "Assunto do e-mail...")}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-medium"
              />
            </div>

            <div>
              <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                {t("Message Body:", "Corpo da Mensagem:")}
              </label>
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("Write your message here...", "Escreva a mensagem aqui...")}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white focus:outline-none focus:border-white/30 font-sans leading-relaxed resize-y"
              />
            </div>

            {/* CTA Button Settings */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {t("Include Direct Booking Button", "Incluir Botão de Agendamento Directo")}
                  </div>
                  <div className="text-[0.68rem] text-white/40">
                    {t(
                      "Direct link to candidate's personal booking page",
                      "Link directo para o portal de agendamento do candidato"
                    )}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeButton}
                  onChange={(e) => setIncludeButton(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-white cursor-pointer"
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
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. Test Email Sending (Custom Email Input) */}
          <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Eye size={13} className="text-white/60" />
              {t("Send Test Preview", "Envio de Teste Prévio")}
            </h4>
            <p className="text-[0.68rem] text-white/50">
              {t(
                "Enter any email address to receive an exact copy of the official letterhead before broadcasting.",
                "Introduza qualquer endereço de e-mail para receber uma cópia exacta do comunicado antes do disparo geral."
              )}
            </p>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="email"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="exemplo@overwatchmoz.com"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || isSending || !testEmailInput.trim()}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {isSendingTest ? (
                  <RefreshCw size={13} className="animate-spin text-white" />
                ) : (
                  <Send size={13} className="text-white" />
                )}
                <span>{t("Send Test", "Enviar Teste")}</span>
              </button>
            </div>
          </div>

          {/* 4. Primary Dispatch Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSending || isSendingTest || targetCandidates.length === 0 || !subject.trim()}
              className="px-6 py-2.5 rounded-xl bg-white text-[#090d16] hover:bg-white/90 font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSending ? (
                <RefreshCw size={14} className="animate-spin text-[#090d16]" />
              ) : (
                <Send size={14} className="text-[#090d16]" />
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

        {/* Right Column: Authentic Overwatch Letterhead Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Eye size={13} className="text-white/60" />
              {t("Official Letterhead Preview", "Pré-visualização Oficial")}
            </h4>
            <span className="text-[0.62rem] text-white/40">
              {t("Exact Email Layout", "Layout Exacto do E-mail")}
            </span>
          </div>

          {/* Email Frame */}
          <div className="rounded-xl border border-slate-300 bg-[#f1f5f9] p-3 text-slate-800 shadow-xl overflow-hidden text-xs">
            <div className="bg-white rounded-lg border border-[#cbd5e1] overflow-hidden shadow-sm">
              
              {/* Official Letterhead Header (Dark Navy #0b1329) */}
              <div className="bg-[#0b1329] px-4 py-3 border-b-2 border-white/15">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="align-middle">
                        <img
                          src="/logo-white.png"
                          alt="Overwatch"
                          height="20"
                          style={{ height: "20px", width: "auto", display: "block" }}
                        />
                      </td>
                      <td className="align-middle text-right">
                        <span className="inline-block bg-white/10 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-white/20 tracking-wider">
                          REF: COM-2026/MAPUTO
                        </span>
                        <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                          Departamento de Recursos Humanos
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Subheading Bar */}
              <div className="bg-[#f8fafc] px-4 py-2 border-b border-[#e2e8f0] text-[10px] text-slate-600">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="font-bold uppercase tracking-wide text-[#0b1329]">
                        COMUNICAÇÃO OFICIAL · RECRUTAMENTO OVERWATCH
                      </td>
                      <td className="text-right text-slate-500">
                        Maputo, Moçambique
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Body Content */}
              <div className="p-5 bg-white space-y-3.5">
                <div className="font-bold text-slate-900 text-sm">
                  Prezada(o) [Nome do Candidato],
                </div>

                <div className="text-slate-700 leading-relaxed whitespace-pre-line text-xs font-sans">
                  {message || t("Message preview...", "O texto da mensagem aparecerá aqui...")}
                </div>

                {includeButton && (
                  <div className="py-2 text-center">
                    <div className="inline-block bg-[#0b1329] text-white font-bold px-5 py-2.5 rounded-lg shadow-sm text-xs cursor-default">
                      {buttonText || "Confirmar Data do Teste Presencial"} &rarr;
                    </div>
                  </div>
                )}

                {/* Premises & Address Box */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 uppercase text-[10px] block mb-1">
                    📍 Endereço Oficial das Instalações
                  </strong>
                  <strong>Overwatch Moçambique:</strong> Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.<br />
                  <span className="text-[10px] text-slate-500">(Acesso estritamente sujeito a confirmação prévia e apresentação de documento de identificação).</span>
                </div>

                {/* Sign-Off */}
                <div className="pt-2 text-xs text-slate-600 leading-relaxed">
                  Com os melhores cumprimentos,<br />
                  <strong className="text-slate-900">Equipa de Recrutamento</strong><br />
                  Overwatch Moçambique
                </div>
              </div>

              {/* Formal Footer */}
              <div className="bg-[#f8fafc] px-5 py-3.5 border-t border-[#e2e8f0] text-[10px] text-slate-500 leading-relaxed">
                <strong className="text-slate-800">Overwatch Moçambique, Lda.</strong><br />
                Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo, Moçambique<br />
                Telefone / WhatsApp: +258 84 287 0793 · Email: info@overwatchmoz.com
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#121827] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <Send size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {t("Confirm Email Dispatch", "Confirmar Disparo de E-mails")}
                </h4>
                <p className="text-xs text-white/50">
                  {t(
                    `Dispatch this official email to ${targetCandidates.length} candidate(s)?`,
                    `Enviar este comunicado oficial para ${targetCandidates.length} candidato(s)?`
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1">
              <div className="text-white/40">{t("Subject:", "Assunto:")}</div>
              <div className="font-semibold text-white truncate">{subject}</div>
              <div className="text-white/40 mt-2">{t("Audience Breakdown:", "Detalhamento:")}</div>
              <div className="text-white/80 font-medium">
                <span className="text-pink-400">♀ {womenCount} {t("women", "mulheres")}</span>
                {" · "}
                <span className="text-sky-400">♂ {menCount} {t("men", "homens")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-white/70 hover:text-white border border-white/10"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleBroadcastDispatch}
                disabled={isSending}
                className="px-5 py-2 rounded-lg bg-white text-[#090d16] hover:bg-white/90 font-bold text-xs"
              >
                {isSending ? t("Sending...", "A enviar...") : t("Confirm & Send", "Confirmar & Enviar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
