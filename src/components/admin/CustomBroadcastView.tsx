"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Languages,
  ChevronLeft,
  ChevronRight,
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

interface TemplateDef {
  id: string;
  name: { en: string; pt: string };
  description: { en: string; pt: string };
  audience: "invited_unconfirmed" | "booked_confirmed" | "all_invited" | "all_applied" | "disqualified";
  subject: { en: string; pt: string };
  includeButton: boolean;
  buttonText: { en: string; pt: string };
  body: { en: string; pt: string };
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "filipa_unconfirmed",
    name: {
      en: "Mandatory Test Confirmation Notice (Filipa)",
      pt: "Aviso de Confirmação Obrigatória (Filipa)",
    },
    description: {
      en: "Notice for invited candidates who must confirm test date to enter premises",
      pt: "Aviso urgente para convocados que têm de confirmar data para aceder às instalações",
    },
    audience: "invited_unconfirmed",
    subject: {
      en: "Urgent Notice: Mandatory Confirmation of Technical Test Date — Overwatch",
      pt: "Aviso Urgente: Confirmação Obrigatória da Data do Teste Presencial — Overwatch",
    },
    includeButton: true,
    buttonText: {
      en: "Confirm In-Person Test Date",
      pt: "Confirmar Data do Teste Presencial",
    },
    body: {
      en: `Please be reminded that receiving an invitation for the in-person test does not mean that your attendance is automatically confirmed.

To participate in the test, it is mandatory to:
1. Respond and confirm your intended test date via the link below.
2. Receive the respective confirmation.
3. Attend only on the confirmed date.

Candidates who have not previously confirmed their date will not appear on the attendance roster and will not be permitted to enter to take the test.

On the test day, it is equally mandatory to bring:
• A physical copy of your identification document (ID or Passport);
• A ballpoint pen.

Anyone arriving without a copy of their ID or without a pen will not be authorized to take the test.

Please do not travel to the Overwatch premises without having previously completed your date confirmation.

These rules apply to all candidates, without exception, to ensure organization and fairness in the recruitment process.

Kind regards,
Recruitment Team
Overwatch Mozambique`,
      pt: `Recordamos que a recepção de um convite para o teste presencial não significa que a sua presença esteja automaticamente confirmada.

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
Overwatch Moçambique`,
    },
  },
  {
    id: "reminder_documents",
    name: {
      en: "Reminder: Required Documents & Access Rules",
      pt: "Lembrete: Documentos & Regras de Acesso",
    },
    description: {
      en: "Instructions for booked candidates regarding physical ID, pen, and QR code",
      pt: "Instruções para candidatos com data confirmada sobre BI físico, caneta e QR code",
    },
    audience: "booked_confirmed",
    subject: {
      en: "Important Reminder: Access Requirements for In-Person Test — Overwatch",
      pt: "Lembrete Importante: Requisitos de Acesso ao Teste Presencial — Overwatch",
    },
    includeButton: false,
    buttonText: {
      en: "View Test Details",
      pt: "Ver Detalhes do Teste",
    },
    body: {
      en: `This is a reminder regarding your scheduled in-person test at the Overwatch Mozambique premises.

Please note that entry to the premises is strictly conditional upon complying with the following rules:
• You must present a physical copy of your identification document (ID or Passport);
• You must bring a ballpoint pen to write the test;
• Present your access QR Code (digitally on your mobile phone or printed).

Anyone arriving without a copy of their identification document or without a pen will not be authorized to enter the premises.

Premises Address: Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.
Please arrive 15 minutes before your scheduled test time.

Kind regards,
Recruitment Team
Overwatch Mozambique`,
      pt: `Este é um lembrete relativo ao seu teste presencial agendado nas instalações da Overwatch Moçambique.

Lembramos que o acesso às instalações é estritamente condicionado ao cumprimento das seguintes regras:
• É obrigatório apresentar uma cópia física do documento de identificação (BI ou Passaporte);
• É obrigatório trazer uma caneta esferográfica para realização da prova;
• Apresentar o seu Código QR de acesso (em formato digital no telemóvel ou impresso).

Quem comparecer sem cópia do documento de identificação ou sem caneta não poderá aceder ao recinto.

Endereço das instalações: Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo.
Por favor, compareça com 15 minutos de antecedência em relação ao horário marcado.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`,
    },
  },
  {
    id: "custom_blank",
    name: {
      en: "Blank Custom Message",
      pt: "Mensagem Livre em Branco",
    },
    description: {
      en: "Write an official communication from scratch",
      pt: "Escrever uma comunicação oficial a partir do zero",
    },
    audience: "all_invited",
    subject: {
      en: "",
      pt: "",
    },
    includeButton: false,
    buttonText: {
      en: "Access Careers Portal",
      pt: "Aceder ao Portal",
    },
    body: {
      en: "",
      pt: "",
    },
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

  // Default to English text if admin preferred language is 'en', otherwise 'pt'
  const initialTmpl = TEMPLATES[0];
  const [subject, setSubject] = useState(lang === "en" ? initialTmpl.subject.en : initialTmpl.subject.pt);
  const [message, setMessage] = useState(lang === "en" ? initialTmpl.body.en : initialTmpl.body.pt);
  const [includeButton, setIncludeButton] = useState(initialTmpl.includeButton);
  const [buttonText, setButtonText] = useState(lang === "en" ? initialTmpl.buttonText.en : initialTmpl.buttonText.pt);

  // Preview index to cycle through real candidates
  const [previewIndex, setPreviewIndex] = useState(0);

  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);

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

  // Safe current preview candidate
  const safeIndex = targetCandidates.length > 0 ? Math.min(previewIndex, targetCandidates.length - 1) : 0;
  const currentPreviewCandidate = targetCandidates[safeIndex] || null;
  const sampleCandidateName = currentPreviewCandidate?.name || "Arminda Martins Guambe";
  const isFemaleCandidate = currentPreviewCandidate ? currentPreviewCandidate.sex === "female" : true;

  // Detect whether current composed message is in English or Portuguese
  const isEnglishMessage = useMemo(() => {
    return (
      /Dears+/i.test(message) ||
      /Kind regards/i.test(message) ||
      /Please be reminded/i.test(message) ||
      /recruitment process/i.test(message) ||
      (lang === "en" && !/Prezada|Prezado|Agradecemos/i.test(message))
    );
  }, [message, lang]);

  // Preview greeting: dynamic with actual candidate name
  const previewGreeting = useMemo(() => {
    if (isEnglishMessage) {
      return `Dear ${sampleCandidateName},`;
    }
    if (isFemaleCandidate) {
      return `Prezada ${sampleCandidateName},`;
    }
    if (currentPreviewCandidate?.sex === "male") {
      return `Prezado ${sampleCandidateName},`;
    }
    return `Prezada(o) ${sampleCandidateName},`;
  }, [isEnglishMessage, isFemaleCandidate, currentPreviewCandidate, sampleCandidateName]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setAudienceFilter(tmpl.audience);
      const isEn = lang === "en";
      setSubject(isEn ? tmpl.subject.en : tmpl.subject.pt);
      setMessage(isEn ? tmpl.body.en : tmpl.body.pt);
      setIncludeButton(tmpl.includeButton);
      setButtonText(isEn ? tmpl.buttonText.en : tmpl.buttonText.pt);
      setStatusFeedback(null);
    }
  };

  // 1-Click Translation via /api/admin/translate
  const handleTranslate = async (toLang: "en" | "pt") => {
    if (!subject.trim() && !message.trim()) return;
    setIsTranslating(true);
    setStatusFeedback(null);

    try {
      const fromLang = toLang === "en" ? "pt" : "en";
      let translatedSub = subject;
      let translatedMsg = message;

      if (subject.trim()) {
        const resSub = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subject, from: fromLang, to: toLang }),
        });
        const dataSub = await resSub.json();
        if (dataSub?.translated) translatedSub = dataSub.translated;
      }

      if (message.trim()) {
        const resMsg = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message, from: fromLang, to: toLang }),
        });
        const dataMsg = await resMsg.json();
        if (dataMsg?.translated) translatedMsg = dataMsg.translated;
      }

      setSubject(translatedSub);
      setMessage(translatedMsg);

      if (toLang === "en" && buttonText.includes("Confirmar")) {
        setButtonText("Confirm In-Person Test Date");
      } else if (toLang === "pt" && buttonText.includes("Confirm")) {
        setButtonText("Confirmar Data do Teste Presencial");
      }

      setStatusFeedback({
        type: "success",
        message:
          toLang === "en"
            ? t("Message successfully translated to English!", "Mensagem traduzida para Inglês com sucesso!")
            : t("Message successfully translated to Portuguese!", "Mensagem traduzida para Português com sucesso!"),
      });
    } catch (err) {
      setStatusFeedback({
        type: "error",
        message: (err as Error).message || "Translation service error.",
      });
    } finally {
      setIsTranslating(false);
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
          `Test preview dispatched successfully to ${targetEmail}! Check your inbox.`,
          `E-mail de teste enviado com sucesso para ${targetEmail}! Verifique a sua caixa de entrada.`
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
          `Official communication successfully dispatched to ${data.sentCount} candidate(s)! Each email addressed personally by name.`,
          `Comunicação oficial enviada com sucesso para ${data.sentCount} candidato(s)! Cada e-mail personalizado com o nome real.`
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

      {/* Template Selector Banner with Language Indicator */}
      <div className="rounded-2xl border border-white/10 bg-[#121827] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail size={16} className="text-white/80" />
              <span>{t("Select Communication Template", "Seleccionar Modelo de Comunicação")}</span>
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              {t(
                "Choose an official pre-approved template or draft your custom message.",
                "Escolha um modelo oficial pré-aprovado ou redija a sua mensagem personalizada."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] text-white/40 flex items-center gap-1">
              <Languages size={12} className="text-sky-400" />
              {lang === "en" ? "Templates in English" : "Modelos em Português"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            const tmplTitle = lang === "en" ? tmpl.name.en : tmpl.name.pt;
            const tmplDesc = lang === "en" ? tmpl.description.en : tmpl.description.pt;

            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tmpl.id)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-white/40 bg-white/[0.08] shadow-md"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-white">{tmplTitle}</span>
                  {isSelected && (
                    <span className="h-4 w-4 rounded-full bg-white text-[#090d16] flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[0.68rem] text-white/50 line-clamp-2 leading-relaxed">
                  {tmplDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form, Audience, Translation Bar & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Audience Selector */}
          <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Filter size={13} className="text-white/60" />
              {t("Recipient Audience Filter", "Filtro de Destinatários")}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                  {t("Audience Cohort:", "Coorte de Candidatos:")}
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
                  {t("Gender Filter:", "Filtro de Género:")}
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
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>{targetCandidates.length} {t("candidates selected", "candidatos seleccionados")}</span>
                  <span className="text-white/30 font-normal">|</span>
                  <span className="text-[0.68rem] text-white/50">
                    {t("Real name personalized per recipient", "Nome real personalizado por destinatário")}
                  </span>
                </div>
                <div className="text-[0.68rem] text-white/40 mt-0.5">
                  <span className="text-pink-400 font-medium">♀ {womenCount} {t("women", "mulheres")}</span>
                  {" · "}
                  <span className="text-sky-400 font-medium">♂ {menCount} {t("men", "homens")}</span>
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

          {/* 2. Message Editor with 1-Click Translation Toolbar */}
          <div className="rounded-xl border border-white/10 bg-[#121827] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Mail size={13} className="text-white/60" />
                {t("Message Content", "Conteúdo da Comunicação")}
              </h4>

              {/* Translation Toolbar */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-lg border border-white/10">
                <span className="text-[0.65rem] font-semibold text-white/50 px-1.5 flex items-center gap-1">
                  <Languages size={11} className="text-sky-400" />
                  {t("Translation:", "Tradução:")}
                </span>
                <button
                  type="button"
                  onClick={() => handleTranslate("en")}
                  disabled={isTranslating}
                  title="Translate current message to English so you can read and edit comfortably"
                  className="px-2 py-0.5 rounded text-[0.68rem] font-medium border border-white/10 bg-white/[0.06] hover:bg-white/[0.15] text-white transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {isTranslating ? <RefreshCw size={10} className="animate-spin" /> : null}
                  <span>&rarr; EN (English)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTranslate("pt")}
                  disabled={isTranslating}
                  title="Translate current message to Portuguese for Mozambican candidates"
                  className="px-2 py-0.5 rounded text-[0.68rem] font-medium border border-white/10 bg-white/[0.06] hover:bg-white/[0.15] text-white transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {isTranslating ? <RefreshCw size={10} className="animate-spin" /> : null}
                  <span>&rarr; PT (Português)</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[0.68rem] font-semibold text-white/60">
                  {t("Subject:", "Assunto:")}
                </label>
                <span className="text-[0.62rem] text-white/40">
                  {isEnglishMessage ? "Language: English" : "Idioma: Português"}
                </span>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("Subject line...", "Assunto do e-mail...")}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[0.68rem] font-semibold text-white/60">
                  {t("Message Body:", "Corpo da Mensagem:")}
                </label>
                <span className="text-[0.62rem] text-emerald-400 font-mono">
                  {t("Personal greeting automatically injected", "Saudação pessoal injectada automaticamente")}
                </span>
              </div>
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

        {/* Right Column: Authentic Overwatch Letterhead Preview with Dynamic Candidate Name (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Eye size={13} className="text-white/60" />
              {t("Official Letterhead Preview", "Pré-visualização Oficial")}
            </h4>
            <span className="text-[0.62rem] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {t("Dynamic Personalization Active", "Personalização Dinâmica Activa")}
            </span>
          </div>

          {/* Candidate Pager in Preview */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 flex items-center justify-between text-xs">
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-[0.68rem] text-white/50">{t("Viewing Candidate:", "Candidato:")}</span>
              <strong className="text-white font-semibold truncate text-[0.72rem]">
                {sampleCandidateName}
              </strong>
              {targetCandidates.length > 0 && (
                <span className="text-[0.62rem] text-white/40 font-mono">
                  ({safeIndex + 1}/{targetCandidates.length})
                </span>
              )}
            </div>

            {targetCandidates.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={safeIndex <= 0}
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  title={t("Previous candidate", "Candidato anterior")}
                  className="p-1 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  disabled={safeIndex >= targetCandidates.length - 1}
                  onClick={() => setPreviewIndex((i) => Math.min(targetCandidates.length - 1, i + 1))}
                  title={t("Next candidate", "Próximo candidato")}
                  className="p-1 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
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

              {/* Body Content with Dynamic Candidate Greeting */}
              <div className="p-5 bg-white space-y-3.5">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    {previewGreeting}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                    <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                    <span>
                      {t(
                        `Automatically personalized with recipient's real name`,
                        `Personalizado automaticamente com o nome real do candidato`
                      )}
                    </span>
                  </div>
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
                  {t("Confirm Broadcast Dispatch", "Confirmar Disparo Geral")}
                </h4>
                <p className="text-xs text-white/50">
                  {t(
                    `You are about to dispatch this official communication to ${targetCandidates.length} candidate(s).`,
                    `Está prestes a enviar este comunicado oficial a ${targetCandidates.length} candidato(s).`
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-white/70">
                <span>{t("Total Recipients:", "Total de Destinatários:")}</span>
                <strong className="text-white">{targetCandidates.length}</strong>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{t("Audience Cohort:", "Coorte de Público:")}</span>
                <span className="text-white capitalize">{audienceFilter.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{t("Gender Distribution:", "Distribuição por Género:")}</span>
                <span className="text-white">♀ {womenCount} / ♂ {menCount}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{t("Subject:", "Assunto:")}</span>
                <span className="text-white truncate max-w-[200px] font-medium">{subject}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium pt-1 border-t border-white/10">
                <span>{t("Personalization:", "Personalização:")}</span>
                <span>{t("Each recipient addressed by real name", "Cada candidato tratado pelo nome real")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleBroadcastDispatch}
                disabled={isSending}
                className="px-5 py-2 rounded-lg bg-white text-[#090d16] hover:bg-white/90 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSending ? (
                  <RefreshCw size={13} className="animate-spin text-[#090d16]" />
                ) : (
                  <Send size={13} className="text-[#090d16]" />
                )}
                <span>{t("Confirm & Dispatch Now", "Confirmar e Disparar Agora")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
