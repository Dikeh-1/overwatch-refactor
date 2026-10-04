"use client";

import React, { useState, useMemo } from "react";
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  FileText,
  Clock,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  FolderArchive,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { Application } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import Logo from "@/components/ui/Logo";
import RichMessageEditor, { AttachmentItem } from "./RichMessageEditor";
import { triggerCelebration } from "@/lib/celebration";

interface CohortCommunicationsStudioProps {
  cohort: any;
  applications: Application[];
  selectedCandidateIds: Set<string>;
  onBackToPipeline: () => void;
  onReloadApps: () => Promise<void>;
}

export const DEFAULT_INSTRUCTIONS_TEMPLATE = `Prezada Candidata {name},

Acusamos e registamos com agrado a sua confirmação e aceitação das condições para a Próxima Fase do processo de selecção para a função de Operadora de CCO da Overwatch Moçambique.

Vimos por este meio convocar-lhe formalmente para o início do Programa de Formação Inicial e Integração Operacional, que terá lugar de acordo com as seguintes directrizes:

1. LOCAL & PONTO DE ENCONTRO:
- Centro de Comando e Controlo Overwatch (CCO)
- Endereço: Av. do Trabalho, N.º 1948, Maputo, Moçambique
- Ponto de referência: Próximo à Direcção de Transportes

2. HORÁRIO & APRESENTAÇÃO:
- Horário de comparência: 08h30 (pontualidade rigorosa)
- Sessão de abertura e credenciação: 09h00

3. DOCUMENTAÇÃO OBRIGATÓRIA A APRESENTAR NO PRIMEIRO DIA:
- Bilhete de Identidade (BI) ou Cartão de Eleitor (original e 2 cópias);
- Certificado de Habilitações da 12.ª Classe (original e 1 cópia);
- Cartão de NUIT;
- Certificado de Registo Criminal ou comprovativo de pedido;
- Curriculum Vitae impresso e actualizado;
- 2 Fotografias tipo passe recentes.

4. CÓDIGO DE VESTUÁRIO (DRESS CODE):
- Traje formal / executivo sóbrio (calça escura ou saia abaixo do joelho, blusa ou camisa social, calçado fechado e confortável).

5. CANAL DE APOIO & ESCLARECIMENTO DE DÚVIDAS:
- Para qualquer questão de logística ou confirmação prévia, favor contactar a equipa de RH via WhatsApp ou chamada para o número institucional Overwatch: +258 84 287 0793.

Reiteramos os nossos parabéns pela dedicação demonstrada nas provas de selecção e esperamos contar com o seu melhor desempenho nesta fase decisiva.

Com os melhores cumprimentos,
Direcção de Recursos Humanos & Operações
Overwatch Moçambique`;

const PRESET_TEMPLATES = {
  onboarding: {
    id: "onboarding",
    titlePt: "1. Convocatória / Instruções da Formação Inicial",
    titleEn: "1. Initial Training & Onboarding Convocation",
    subjectPt: "Instruções Oficiais da Próxima Fase – Vaga de Operadora de CCO | Overwatch Moçambique",
    subjectEn: "Official Next Phase Instructions – CCTV Operator Role | Overwatch Mozambique",
    bodyPt: DEFAULT_INSTRUCTIONS_TEMPLATE,
    bodyEn: `Dear Candidate {name},

We are pleased to formally register your acceptance of the terms for the Next Phase of the CCTV Operator recruitment process at Overwatch Mozambique.

You are hereby invited to attend the commencement of the Initial Training and Operational Integration Program under the following guidelines:

1. VENUE & ASSEMBLY POINT:
- Overwatch Command & Control Centre (CCO)
- Address: Av. do Trabalho, No. 1948, Maputo, Mozambique
- Reference point: Near the Transport Directorate

2. SCHEDULE & REPORTING TIME:
- Arrival time: 08:30 AM (strict punctuality)
- Opening session & accreditation: 09:00 AM

3. MANDATORY DOCUMENTS REQUIRED ON DAY ONE:
- Identification Document (BI / Voter Card) (original and 2 copies);
- Grade 12 Certificate (original and 1 copy);
- NUIT Tax Card;
- Police Criminal Record Certificate or request receipt;
- Updated printed CV;
- 2 Recent passport-sized photographs.

4. DRESS CODE:
- Formal / sober executive business attire (dark trousers or below-the-knee skirt, collared shirt/blouse, closed comfortable shoes).

5. SUPPORT & CONTACT CHANNEL:
- For logistics inquiries or questions, contact the HR team via WhatsApp or call: +258 84 287 0793.

Congratulations on your dedication during the selection trials. We look forward to your best performance in this decisive stage.

Best regards,
Human Resources & Operations Directorate
Overwatch Mozambique`,
  },
  conditions: {
    id: "conditions",
    titlePt: "2. Notificação das Condições da Próxima Fase",
    titleEn: "2. Next Phase Conditions & Stipend Notice",
    subjectPt: "Notificação das Condições – Próxima Fase do Processo de Recrutamento | Overwatch",
    subjectEn: "Conditions Notice – Next Phase of Recruitment Process | Overwatch",
    bodyPt: `Prezada Candidata {{name}},

Vimos por este meio comunicar que a sua prova de selecção presencial para a vaga de {{role}} na Overwatch Moçambique obteve avaliação positiva.

Convidamo-la a consultar os termos e directrizes operacionais da fase de formação intensiva:

1. Programa de Formação Intensiva de 10 dias úteis em Maputo;
2. Escala rotativa contínua de 12 horas (2 Dias, 2 Noites, 2 Folgas);
3. Atribuição de subsídio de formação e integração na Central de Comando;
4. Disponibilização de fardamento e equipamento operacional completo.

Favor confirmar a sua disponibilidade e aceitação destas condições para garantia da sua vaga na turma de formação.

Com os melhores cumprimentos,
Direcção de Recursos Humanos & Operações
Overwatch Moçambique`,
    bodyEn: `Dear Candidate {{name}},

We are pleased to inform you that your evaluation for the position of {{role}} at Overwatch Mozambique has met our performance standards.

We invite you to review the operational guidelines for the upcoming intensive training phase:

1. Intensive 10 working days training program in Maputo;
2. Continuous rotating 12-hour shifts (2 Days, 2 Nights, 2 Off);
3. Training stipend provided with direct integration into the Command Centre;
4. Full operational uniform and equipment provided.

Please confirm your availability and acceptance of these conditions to secure your seat.

Best regards,
Human Resources & Operations Directorate
Overwatch Mozambique`,
  },
  conclusion: {
    id: "conclusion",
    titlePt: "3. Notificação de Encerramento do Concurso",
    titleEn: "3. Recruitment Cycle Conclusion Notice",
    subjectPt: "Conclusão do Processo de Recrutamento – Overwatch Moçambique",
    subjectEn: "Recruitment Process Conclusion – Overwatch Mozambique",
    bodyPt: `Prezada Candidata {{name}},

Agradecemos sinceramente o seu interesse e empenho demonstrados ao longo do concurso de recrutamento para a vaga de {{role}} da Overwatch Moçambique.

Informamos que o ciclo de recrutamento deste lote foi formalmente encerrado e o processo selado no nosso arquivo institucional.

O seu perfil profissional permanecerá registado com elevada consideração na nossa base de talentos para futuros concursos e expansões das operações.

Desejamos-lhe os maiores sucessos na sua carreira profissional.

Com os melhores cumprimentos,
Direcção de Recursos Humanos
Overwatch Moçambique`,
    bodyEn: `Dear Candidate {{name}},

We sincerely thank you for your participation and dedication throughout the recruitment process for {{role}} at Overwatch Mozambique.

Please be advised that the recruitment cycle for this cohort has formally concluded and the records archived.

Your credentials remain in our talent database for consideration in upcoming operational cycles and expansions.

We wish you continued success in your professional career.

Best regards,
Human Resources Directorate
Overwatch Mozambique`,
  },
  custom: {
    id: "custom",
    titlePt: "4. Comunicado Geral Personalizado",
    titleEn: "4. Custom Official Announcement",
    subjectPt: "Comunicado Oficial – Overwatch Moçambique",
    subjectEn: "Official Announcement – Overwatch Mozambique",
    bodyPt: `Prezada Candidata {{name}},

Vimos por este meio partilhar uma actualização importante relativamente ao processo de selecção para a vaga de {{role}} na Overwatch Moçambique.

[Insira aqui a sua mensagem oficial personalizada...]

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`,
    bodyEn: `Dear Candidate {{name}},

We are reaching out with an official update regarding the recruitment process for {{role}} at Overwatch Mozambique.

[Insert your custom official announcement here...]

Best regards,
Recruitment Team
Overwatch Mozambique`,
  },
};

export const CohortCommunicationsStudio: React.FC<CohortCommunicationsStudioProps> = ({
  cohort,
  applications,
  selectedCandidateIds,
  onBackToPipeline,
  onReloadApps,
}) => {
  const { lang, t } = useAdminLanguage();

  // Candidate status helpers
  const isCandidateConfirmed = (a: Application) => {
    return (
      a.nextPhaseResponse === "yes" ||
      a.status === "interest_confirmed" ||
      a.nextPhaseStatus === "confirmed"
    );
  };

  const isCandidateDeclined = (a: Application) => {
    return (
      a.nextPhaseResponse === "no" ||
      a.status === "interest_declined" ||
      a.nextPhaseStatus === "declined"
    );
  };

  const isCandidateAwaiting = (a: Application) => {
    return (
      (a.status === "next_phase_invited" || a.nextPhaseStatus === "invited") &&
      !a.nextPhaseResponse
    );
  };

  // Studio states
  const [audienceFilter, setAudienceFilter] = useState<string>(
    selectedCandidateIds.size > 0 ? "selected" : "confirmed"
  );
  const [activeTemplateKey, setActiveTemplateKey] = useState<keyof typeof PRESET_TEMPLATES>("onboarding");
  const [canvasTab, setCanvasTab] = useState<"edit" | "preview">("edit");
  const [subject, setSubject] = useState(
    lang === "en" ? PRESET_TEMPLATES.onboarding.subjectEn : PRESET_TEMPLATES.onboarding.subjectPt
  );
  const [message, setMessage] = useState(
    lang === "en" ? PRESET_TEMPLATES.onboarding.bodyEn : PRESET_TEMPLATES.onboarding.bodyPt
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedPreviewCandidateId, setSelectedPreviewCandidateId] = useState<string>("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    sentCount: number;
    failedCount: number;
    results?: any[];
  } | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Audience counts
  const audienceCounts = useMemo(() => {
    const confirmed = applications.filter(isCandidateConfirmed).length;
    const awaiting = applications.filter(isCandidateAwaiting).length;
    const declined = applications.filter(isCandidateDeclined).length;
    const tested = applications.filter((a) => Boolean(a.attendedAt)).length;
    const hired = applications.filter((a) => a.status === "hired").length;
    const total = applications.length;
    const selected = selectedCandidateIds.size;
    const archived = applications.filter((a) => a.status === "archived" || a.status === "rejected").length;
    return { confirmed, awaiting, declined, tested, hired, total, selected, archived };
  }, [applications, selectedCandidateIds]);

  // Target candidates according to audience
  const targetCandidates = useMemo(() => {
    switch (audienceFilter) {
      case "confirmed":
        return applications.filter(isCandidateConfirmed);
      case "selected":
        return applications.filter((a) => selectedCandidateIds.has(a.id));
      case "awaiting":
        return applications.filter(isCandidateAwaiting);
      case "declined":
        return applications.filter(isCandidateDeclined);
      case "tested":
        return applications.filter((a) => Boolean(a.attendedAt));
      case "hired":
        return applications.filter((a) => a.status === "hired");
      case "archived":
        return applications.filter((a) => a.status === "archived" || a.status === "rejected");
      case "all":
      default:
        return applications;
    }
  }, [audienceFilter, applications, selectedCandidateIds]);

  // Template switch handler
  const handleSelectTemplate = (key: keyof typeof PRESET_TEMPLATES) => {
    setActiveTemplateKey(key);
    const tpl = PRESET_TEMPLATES[key];
    setSubject(lang === "en" ? tpl.subjectEn : tpl.subjectPt);
    setMessage(lang === "en" ? tpl.bodyEn : tpl.bodyPt);
    setDispatchResult(null);
  };

  // Variable chip insertion
  const handleInsertVariable = (varCode: string) => {
    setMessage((prev) => `${prev} ${varCode}`);
  };

  // Dynamic candidate selected for preview simulation
  const sampleCandidate = useMemo(() => {
    if (selectedPreviewCandidateId) {
      const found = targetCandidates.find((c) => c.id === selectedPreviewCandidateId);
      if (found) return found;
    }
    return targetCandidates[0] || applications[0] || {
      id: "preview-id",
      name: "Palmira João mordinho",
      role: cohort.roleId || "cctv",
      email: "palmira.mordinho@exemplo.com",
      testSlot: "Turma A (08:30 - 11:30)",
    };
  }, [selectedPreviewCandidateId, targetCandidates, applications, cohort.roleId]);

  const roleTitleDisplay =
    lang === "en"
      ? cohort.roleTitleEn || cohort.roleTitlePt || "CCTV Operator"
      : cohort.roleTitlePt || cohort.roleTitleEn || "Operadora de CCO";

  // Formatted preview text with universal placeholder substitution
  const renderedPreviewText = useMemo(() => {
    let text = message;
    const vars: Record<string, string> = {
      name: sampleCandidate.name,
      candidate_name: sampleCandidate.name,
      role: roleTitleDisplay,
      role_title: roleTitleDisplay,
      slot: sampleCandidate.testSlot || "Turma A (08:30 - 11:30)",
      date: new Date().toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ"),
      location: "Av. do Trabalho, N.º 1948, Maputo",
      company: "Overwatch Moçambique",
      email: sampleCandidate.email || "",
    };

    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}\\}?`, "gi");
      text = text.replace(regex, val);
    }
    return text;
  }, [message, sampleCandidate, roleTitleDisplay, lang]);

  const isHtmlPreview = useMemo(() => {
    return /<[a-z][\s\S]*>/i.test(renderedPreviewText);
  }, [renderedPreviewText]);

  // WhatsApp template copy
  const handleCopyWhatsApp = () => {
    const plainText = renderedPreviewText.replace(/<[^>]*>/g, "");
    const text = `*OVERWATCH MOÇAMBIQUE | ${subject.toUpperCase()}*\n\nPrezada ${sampleCandidate.name},\n\n${plainText}\n\n📍 *Suporte & Dúvidas:* Responda directamente a esta mensagem ou contacte a equipa de RH: +258 84 287 0793.\n\nEquipa de Recursos Humanos & Operações\nOverwatch Moçambique`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Dispatch handler
  const handleDispatch = async (isPreview = false) => {
    const targetIds = targetCandidates.map((a) => a.id);
    if (!isPreview && targetIds.length === 0) {
      alert(t("No candidates found in the selected target audience.", "Nenhum candidato encontrado no público-alvo seleccionado."));
      return;
    }
    if (isPreview && (!previewEmail || !previewEmail.includes("@"))) {
      alert(t("Please enter a valid preview email address.", "Por favor insira um email de teste válido."));
      return;
    }

    setIsSending(true);
    setDispatchResult(null);
    try {
      const res = await fetch("/api/admin/careers/next-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_instructions",
          candidateIds: targetIds,
          subject: subject.trim(),
          message: message.trim(),
          preview: isPreview,
          previewEmail: previewEmail.trim(),
          attachments: attachments.map((a) => ({
            name: a.name,
            content: a.content,
            size: a.size,
            type: a.type,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isPreview) {
          alert(
            t(
              `Live preview test email sent successfully to ${previewEmail}!`,
              `Email de teste modelo enviado com sucesso para ${previewEmail}!`
            )
          );
        } else {
          setDispatchResult({
            sentCount: data.sentCount || targetIds.length,
            failedCount: data.failedCount || 0,
            results: data.results,
          });

          // Trigger confetti explosion across the admin portal!
          triggerCelebration({
            variant: "next_phase",
            title: t("Instructions Successfully Dispatched!", "Instruções Enviadas com Sucesso!"),
            subtitle: t(
              `Dispatched official letterhead instructions to ${data.sentCount || targetIds.length} candidate(s).`,
              `Instruções em papel timbrado oficial enviadas para ${data.sentCount || targetIds.length} candidata(s).`
            ),
            roleName: roleTitleDisplay,
          });

          await onReloadApps();
        }
      } else {
        alert(data.error || "Failed to dispatch communications");
      }
    } catch (err: any) {
      alert(err.message || "Network error dispatching communications");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Studio Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {cohort.department || t("Operations", "Operações")}
                </span>
                <span className="rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Mail size={11} />
                  {t("Communications Studio", "Estúdio de Comunicações")}
                </span>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <FolderArchive size={11} />
                  {cohort.name}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {t("Cohort Communications Studio", "Estúdio de Comunicações do Lote")}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "Draft, preview in authentic letterhead, and dispatch official onboarding instructions, conditions notices, and cohort broadcasts.",
                  "Personalize, pré-visualize em papel timbrado oficial e envie instruções de formação, termos e comunicados deste lote."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onBackToPipeline}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>{t("Back to Pipeline Table", "Voltar à Tabela do Funil")}</span>
            </button>
          </div>
        </div>

        {/* Audience Target Selector Strip */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-sky-600" />
              <span>{t("1. Target Recipient Audience", "1. Público-Alvo Destinatário")}:</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {targetCandidates.length} {t("candidates targeted", "candidatas seleccionadas")}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {/* Audience 1: Confirmed Conditions */}
            <button
              type="button"
              onClick={() => setAudienceFilter("confirmed")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "confirmed"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "confirmed" ? "text-sky-800" : "text-slate-400"}`}>
                {t("Accepted Conditions", "Aceitaram Termos")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.confirmed}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "confirmed" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Primary CCO Group", "Grupo Finalista CCO")}
              </span>
            </button>

            {/* Audience 2: Selected from Table */}
            {selectedCandidateIds.size > 0 && (
              <button
                type="button"
                onClick={() => setAudienceFilter("selected")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  audienceFilter === "selected"
                    ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                    : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "selected" ? "text-sky-800" : "text-sky-600"}`}>
                  {t("Selected from Table", "Marcadas na Tabela")}
                </div>
                <div className="text-base font-extrabold mt-0.5 text-slate-900">
                  {audienceCounts.selected}
                </div>
                <span className={`text-[9px] block ${audienceFilter === "selected" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                  {t("Custom Checklist", "Selecção Manual")}
                </span>
              </button>
            )}

            {/* Audience 3: Awaiting Response */}
            <button
              type="button"
              onClick={() => setAudienceFilter("awaiting")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "awaiting"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "awaiting" ? "text-sky-800" : "text-slate-400"}`}>
                {t("Awaiting Response", "Aguardam Resposta")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.awaiting}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "awaiting" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Pending Next Phase", "Pendente Aceitação")}
              </span>
            </button>

            {/* Audience 4: Attended Physical Test */}
            <button
              type="button"
              onClick={() => setAudienceFilter("tested")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "tested"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "tested" ? "text-sky-800" : "text-slate-400"}`}>
                {t("Attended Test", "Fizeram Prova")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.tested}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "tested" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Verified Gate Check", "Presença no Portão")}
              </span>
            </button>

            {/* Audience 5: Hired Finalists */}
            <button
              type="button"
              onClick={() => setAudienceFilter("hired")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "hired"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "hired" ? "text-sky-800" : "text-slate-400"}`}>
                {t("Hired Offers", "Admitidos")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.hired}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "hired" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Final Offers", "Contratos Finais")}
              </span>
            </button>

            {/* Audience 6: Entire Cohort */}
            <button
              type="button"
              onClick={() => setAudienceFilter("all")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "all"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "all" ? "text-sky-800" : "text-slate-400"}`}>
                {t("All Applications", "Todo o Lote")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.total}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "all" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Master Cohort Pool", "Base Completa")}
              </span>
            </button>

            {/* Audience 7: Non-Selected / Archived */}
            <button
              type="button"
              onClick={() => setAudienceFilter("archived")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                audienceFilter === "archived"
                  ? "bg-sky-50/70 border-sky-500 text-slate-900 shadow-2xs ring-1 ring-sky-500/20"
                  : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs"
              }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${audienceFilter === "archived" ? "text-sky-800" : "text-slate-400"}`}>
                {t("Not Advancing", "Não Seleccionados")}
              </div>
              <div className="text-base font-extrabold mt-0.5 text-slate-900">
                {audienceCounts.archived}
              </div>
              <span className={`text-[9px] block ${audienceFilter === "archived" ? "text-sky-600 font-medium" : "text-slate-400"}`}>
                {t("Concluded Candidates", "Concurso Concluído")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Templates Palette */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <span>{t("2. Select Official Template", "2. Seleccionar Modelo Oficial")}:</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {t("Click any template to load its official wording", "Clique num modelo para carregar o texto correspondente")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(PRESET_TEMPLATES) as Array<keyof typeof PRESET_TEMPLATES>).map((key) => {
            const tpl = PRESET_TEMPLATES[key];
            const isSelected = activeTemplateKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectTemplate(key)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                  isSelected
                    ? "bg-sky-50/70 border-sky-500 text-slate-900 ring-1 ring-sky-500/20 shadow-2xs"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold line-clamp-1 ${isSelected ? "text-sky-950 font-extrabold" : "text-slate-900"}`}>
                      {lang === "en" ? tpl.titleEn : tpl.titlePt}
                    </span>
                    {isSelected && <Check size={14} className="text-sky-600 shrink-0" />}
                  </div>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? "text-slate-600" : "text-slate-500"}`}>
                    {lang === "en" ? tpl.subjectEn : tpl.subjectPt}
                  </p>
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-wider block ${isSelected ? "text-sky-700 font-bold" : "text-slate-400"}`}>
                  {key === "onboarding" ? t("Induction Briefing", "Convocatória Presencial") : key === "conditions" ? t("Terms & Stipend", "Termos & Subsídio") : key === "conclusion" ? t("Talent Bank", "Arquivo & Reserva") : t("Custom Draft", "Texto Livre")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Canvas: Edit vs Preview Mode */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Canvas Mode Header Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setCanvasTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canvasTab === "edit"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} className={canvasTab === "edit" ? "text-sky-600" : "text-slate-400"} />
              <span>{t("Message Editor", "Editor da Mensagem")}</span>
            </button>

            <button
              type="button"
              onClick={() => setCanvasTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canvasTab === "preview"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye size={13} className={canvasTab === "preview" ? "text-sky-600" : "text-slate-400"} />
              <span>{t("Live Official Letterhead Preview", "Pré-visualização em Papel Timbrado")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title={t("Copy formatted broadcast copy for WhatsApp", "Copiar texto formatado para WhatsApp")}
            >
              {copiedWhatsApp ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-700 font-bold">{t("Copied!", "Copiado!")}</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>{t("Copy for WhatsApp", "Copiar p/ WhatsApp")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Editor Canvas */}
        <div style={{ display: canvasTab === "edit" ? "block" : "none" }} className="p-6 space-y-5">
          {/* Subject Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800">
                {t("Official Email Subject Line", "Assunto Oficial do Email")}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {subject.length} {t("characters", "caracteres")}
              </span>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("Subject line...", "Assunto da comunicação...")}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs text-slate-900 font-medium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Standard Professional Rich Message Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800">
                {t("Official Message Content & Attachments", "Conteúdo Oficial da Mensagem & Anexos")}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {attachments.length} {t("attachment(s)", "anexo(s)")}
              </span>
            </div>
            <RichMessageEditor
              value={message}
              onChange={setMessage}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              lang={lang}
              placeholder={t("Type official instructions here...", "Escreva as instruções oficiais aqui...")}
              availableVariables={[
                { code: "{{name}}", label: t("Candidate Full Name", "Nome Completo") },
                { code: "{{role}}", label: t("Job Role Title", "Cargo / Função") },
                { code: "{{slot}}", label: t("Assigned Test Slot", "Turno Agendado") },
                { code: "{{date}}", label: t("Current Official Date", "Data Oficial") },
                { code: "{{location}}", label: t("HQ Facility Address", "Endereço das Instalações") },
                { code: "{{company}}", label: t("Company Name", "Overwatch Moçambique") },
              ]}
            />
          </div>
        </div>

        {/* Tab 2: Live Official Branded Letterhead Preview */}
        <div style={{ display: canvasTab === "preview" ? "flex" : "none" }} className="p-8 bg-slate-100/60 flex-col items-center space-y-4">
            {/* Dynamic Personalization Guarantee Banner */}
            <div className="w-full max-w-2xl rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 shadow-2xs flex items-start gap-3 text-xs text-sky-950">
              <ShieldCheck className="text-sky-600 shrink-0 mt-0.5" size={17} />
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{t("Dynamic Personalization Guarantee", "Garantia de Personalização Dinâmica")}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-200/60 text-sky-900 font-bold uppercase">
                    {t("Automatic", "Automático")}
                  </span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  {t(
                    "Each candidate automatically receives their own individual name, role, and schedule dynamically upon dispatch. Use the simulator below to inspect how this template formats for any specific recipient.",
                    "Cada candidata receberá automaticamente o seu próprio nome, função e horário dinamicamente no envio oficial. Use o simulador abaixo para conferir a substituição com os dados reais de qualquer candidata deste lote."
                  )}
                </p>
              </div>
            </div>

            {/* Recipient Simulation Selector */}
            {targetCandidates.length > 0 && (
              <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {t("Previewing Recipient Data:", "Simular com Dados da Candidata:")}
                  </span>
                  <select
                    value={sampleCandidate.id}
                    onChange={(e) => setSelectedPreviewCandidateId(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    {targetCandidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} ({cand.email || cand.whatsapp})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {t(`Audience: ${targetCandidates.length} candidate(s)`, `Público: ${targetCandidates.length} candidata(s)`)}
                </span>
              </div>
            )}

            {/* THE AUTHENTIC OFFICIAL LETTERHEAD SHEET */}
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden">
              {/* LETTERHEAD BRAND HEADER (Official Dark Navy #0b1329) */}
              <div className="bg-[#0b1329] px-6 py-4.5 border-b-2 border-white/10 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Logo variant="light" size="sm" />
                </div>

                <div className="text-right">
                  <span className="inline-block bg-white/10 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border border-white/15 tracking-wider">
                    REF: OW-INSTR/2026/MAPUTO
                  </span>
                  <span className="block text-[10px] text-slate-300 font-medium mt-0.5">
                    {t("Recruitment & Operations Directorate", "Direcção de Recursos Humanos & Operações")}
                  </span>
                </div>
              </div>

              {/* OFFICIAL LETTERHEAD SUB-BAR */}
              <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span className="font-bold text-slate-900 tracking-wider uppercase text-[10px]">
                  {t("Official Communication · Selection Process", "Comunicação Oficial · Processo de Selecção")}
                </span>
                <span>Maputo, Moçambique</span>
              </div>

              {/* Celebratory Looping Confetti Animation Banner */}
              {(activeTemplateKey === "onboarding" || activeTemplateKey === "conditions") && (
                <div className="w-full bg-[#090d16] border-b border-slate-800 text-center overflow-hidden">
                  <img
                    src="/animations/confetti-celebration.gif"
                    alt="Celebração Confetti"
                    className="w-full max-h-56 object-cover mx-auto block"
                  />
                </div>
              )}

              {/* Recipient Details Block */}
              <div className="p-6 pb-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {t("Recipient Candidate", "Destinatário(a)")}
                  </span>
                  <strong className="text-slate-900 text-sm font-bold block truncate mt-0.5">
                    {sampleCandidate.name}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {sampleCandidate.email || sampleCandidate.whatsapp}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {t("Job Role / Position", "Função / Vaga")}
                  </span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {roleTitleDisplay}
                  </strong>
                  <span className="text-[11px] text-slate-500 block">
                    {sampleCandidate.testSlot || t("Cohort Session", "Turma Presencial")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {t("Official Date", "Data Oficial")}
                  </span>
                  <span className="font-mono text-slate-800 text-xs font-semibold block mt-0.5">
                    {new Date().toLocaleDateString(lang === "en" ? "en-US" : "pt-MZ")}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={12} /> {t("Verified Dispatch Format", "Formato Homologado")}
                  </span>
                </div>
              </div>

              {/* Letter Body Preview */}
              <div className="p-6 pt-4 text-xs text-slate-800 leading-relaxed font-sans space-y-3">
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    {t("Subject", "Assunto")}:
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {subject}
                  </h3>
                </div>

                {isHtmlPreview ? (
                  <div
                    className="rich-html-preview leading-relaxed space-y-3 pt-2 text-slate-800"
                    dangerouslySetInnerHTML={{ __html: renderedPreviewText }}
                  />
                ) : (
                  <div className="whitespace-pre-line leading-relaxed space-y-3 pt-2 text-slate-800">
                    {renderedPreviewText}
                  </div>
                )}

                {/* Official Attachments Display */}
                {attachments.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Paperclip size={13} className="text-slate-500" />
                      <span>
                        {t(
                          `Official Attached Documents (${attachments.length})`,
                          `Documentos Oficiais Anexados (${attachments.length})`
                        )}:
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                        >
                          <FileText size={15} className="text-sky-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-auto">
                            {Math.round(att.size / 1024)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Letterhead Signature Footer */}
                <div className="border-t border-slate-200 pt-6 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
                  <div>
                    <div className="font-bold text-slate-900">
                      Direcção de Recursos Humanos & Operações
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Overwatch Security Solutions, Lda.
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Av. do Trabalho, 1948, Maputo • Moçambique
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>{t("Verified Official Dispatch", "Envio Oficial Verificado")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Action & Dispatch Footer Bar */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Test Email Input */}
          <div className="flex items-center gap-2 max-w-sm w-full">
            <input
              type="email"
              value={previewEmail}
              onChange={(e) => setPreviewEmail(e.target.value)}
              placeholder={t("Admin test email (e.g. your email)...", "Email de teste (ex: seu email)...")}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white shadow-2xs"
            />
            <button
              type="button"
              disabled={isSending}
              onClick={() => handleDispatch(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              title={t("Send single live test email to verify formatting", "Enviar teste para verificar formatação")}
            >
              <span>{t("Send Test", "Enviar Teste")}</span>
            </button>
          </div>

          {/* Mass Dispatch Button */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {t(`Audience: ${targetCandidates.length} candidate(s)`, `Destinatários: ${targetCandidates.length} candidatas`)}
            </span>

            <button
              type="button"
              disabled={isSending || targetCandidates.length === 0}
              onClick={() => {
                if (
                  confirm(
                    t(
                      `Are you sure you want to dispatch this official communication to all ${targetCandidates.length} candidates in the selected audience?`,
                      `Tem a certeza de que deseja enviar esta comunicação oficial para as ${targetCandidates.length} candidatas do público seleccionado?`
                    )
                  )
                ) {
                  handleDispatch(false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <OverwatchOrbitLoader size="xs" theme="light" className="shrink-0" />
                  <span>{t("Dispatching (rate-limited)...", "A enviar com controlo de débito...")}</span>
                </>
              ) : (
                <>
                  <Send size={14} className="text-white" />
                  <span>
                    {t(
                      `Dispatch to ${targetCandidates.length} Candidates`,
                      `Enviar para ${targetCandidates.length} Candidatas`
                    )}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dispatch Success Result Modal */}
      {dispatchResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <h4 className="font-bold text-sm text-emerald-900">
                {t("Official Communication Dispatched Successfully!", "Comunicação Oficial Enviada com Sucesso!")}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setDispatchResult(null)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              {t("Dismiss", "Fechar")}
            </button>
          </div>

          <p className="text-xs text-emerald-800">
            {t(
              `Successfully delivered to ${dispatchResult.sentCount} candidate(s). All correspondence logged in candidate records.`,
              `Entregue com sucesso a ${dispatchResult.sentCount} candidata(s). Todas as comunicações foram arquivadas no histórico das candidatas.`
            )}
            {dispatchResult.failedCount > 0 && ` (${dispatchResult.failedCount} failed)`}
          </p>
        </div>
      )}
    </div>
  );
};

export default CohortCommunicationsStudio;
