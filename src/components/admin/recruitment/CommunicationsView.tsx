"use client";

import Link from "next/link";
import { useCommunicationDraft } from "../hooks/useCommunicationDraft";
import { StudioMailbox, type StudioFolder } from "./StudioMailbox";
import { DeliveryProgress } from "./DeliveryProgress";
import { BOOKING_TOKEN, candidateVariables, renderStudioMessage, messageBlocks, moveBookingToken, studioScope, escapeMailText } from "@/lib/communication-content";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Upload,
  X,
  Plus,
  Trash2,
  Eye,
  Clock,
  Users,
  Briefcase,
  Copy,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  Shield,
  ShieldCheck,
  Check,
  FileUp,
  Image as ImageIcon,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import { isNextPhase, isQualified, isTerminal, sameRole, canReceiveTestInvitation, hasSentCommunication, hasTested } from "@/lib/careers-workflow";
import { Application, formatSlotDisplay, normalizeSlot } from "@/lib/careers";
import Logo from "@/components/ui/Logo";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { useActiveRole } from "../shell/ActiveRoleContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";
import CelebrationOverlay from "@/components/admin/ui/CelebrationOverlay";
import RichMessageEditor, { AttachmentItem, type RichMessageEditorHandle } from "./RichMessageEditor";
import { triggerCelebration } from "@/lib/celebration";

interface CommunicationsViewProps {
  applications: Application[];
  fixedRecipient?: Application;
  onSent?: () => Promise<void>;
  cohortId?: string;
  lang?: "pt" | "en";
}

interface CommAttachment {
  name: string;
  size: number;
  type: string;
  content: string; // base64
}

interface CustomTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: string;
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  applications,
  fixedRecipient,
  onSent,
  cohortId,
  lang: propLang,
}) => {
  const { lang: contextLang } = useAdminLanguage();
  const lang = propLang ?? contextLang;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  const { activeRoleId, activeRole, roles } = useActiveRole();

  const [emailLang, setEmailLang] = useState<"pt" | "en">("pt");
  const [deliveryCampaign, setDeliveryCampaign] = useState<string | null>(null);
  const [includeBookingButton, setIncludeBookingButton] = useState(false);

  // Audience Target State
  const [selectedRole, setSelectedRole] = useState<string>(fixedRecipient?.role || activeRoleId || "cctv");
  const [targetAudience, setTargetAudience] = useState<string>(fixedRecipient ? "individual" : "all_role");
  const [individualSearch, setIndividualSearch] = useState("");
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>(fixedRecipient?.id || "");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Role capability flags for active selection
  const currentRoleDef = useMemo(() => {
    return roles.find((r) => r.id === selectedRole) || (selectedRole === "all" ? null : activeRole);
  }, [roles, selectedRole, activeRole]);

  const pipelineStages = useMemo(() => {
    return currentRoleDef?.pipelineStages || (selectedRole === "all" ? ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"] : ["applications", "screening", "interview", "hired"]);
  }, [currentRoleDef, selectedRole]);

  const roleHasTesting = pipelineStages.includes("testing") || selectedRole === "cctv_technical_manager";
  const roleHasNextPhase = pipelineStages.includes("next_phase");

  // Letterhead State
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // File Attachments State
  const [attachments, setAttachments] = useState<CommAttachment[]>([]);
  const [customRsvpModalOpen, setCustomRsvpModalOpen] = useState(false);
  const [customRsvpLabel, setCustomRsvpLabel] = useState("");
  const [customRsvpAction, setCustomRsvpAction] = useState<"confirm" | "decline" | "portal">("confirm");
  const [customRsvpStyle, setCustomRsvpStyle] = useState<"navy" | "emerald" | "outline">("navy");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Studio Mode: Edit vs Live Letterhead Preview
  const [canvasTab, setCanvasTab] = useState<"edit" | "preview">("edit");
  const [arrangingBooking, setArrangingBooking] = useState(false);
  const [selectedPreviewCandidateId, setSelectedPreviewCandidateId] = useState<string>("");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Drag and drop state over letterhead
  const [isDragOverLetterhead, setIsDragOverLetterhead] = useState(false);

  // Custom User Templates (localStorage synced)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const templateMutation = useRef(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Quick Test Email State
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testNotification, setTestNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Broadcast Dispatch State
  const [confirmDispatchOpen, setConfirmDispatchOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [dispatchResultCount, setDispatchResultCount] = useState(0);
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);

  // Auto-dismiss delivery notice after 5 seconds
  useEffect(() => {
    if (!deliveryNotice) return;
    const timer = setTimeout(() => {
      setDeliveryNotice(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [deliveryNotice]);

  // Delivery History Drawer
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const editorHandle = useRef<RichMessageEditorHandle>(null);
  const followUpHandle = useRef<RichMessageEditorHandle>(null);
  const lastEditor = useRef<"main" | "followup">("main");
  const [folder, setFolder] = useState<StudioFolder>("compose");
  const [openingDraft, setOpeningDraft] = useState(false);
  const newDraftLock = useRef(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpBody, setFollowUpBody] = useState("");
  const scope = studioScope(cohortId, selectedRole, fixedRecipient?.id || (targetAudience === "individual" ? selectedIndividualId || undefined : undefined));
  const draft = useCommunicationDraft(scope, { emailLang, subject, messageBody, attachments, includeBookingButton, targetAudience, selectedIndividualId, selectedSlot, followUpEnabled, followUpSubject, followUpBody }, data => {
    setEmailLang(data.emailLang === "en" ? "en" : "pt");
    setSubject(data.subject || ""); setMessageBody(data.messageBody || ""); setAttachments(data.attachments || []);
    setIncludeBookingButton(Boolean(data.includeBookingButton && (data.messageBody?.includes(BOOKING_TOKEN) || data.targetAudience === "shortlisted_unbooked"))); setFollowUpEnabled(Boolean(data.followUpEnabled));
    setFollowUpSubject(data.followUpSubject || ""); setFollowUpBody(data.followUpBody || "");
    if (!fixedRecipient && data.targetAudience) setTargetAudience(data.targetAudience);
    if (!fixedRecipient && data.selectedIndividualId !== undefined) setSelectedIndividualId(data.selectedIndividualId);
    if (data.selectedSlot !== undefined) setSelectedSlot(data.selectedSlot);
  });

  // Sync role change with active role
  useEffect(() => {
    if (fixedRecipient) return;
    if (activeRoleId) {
      setSelectedRole(activeRoleId);
      const def = roles.find((r) => r.id === activeRoleId);
      const st = def?.pipelineStages || [];
      if (!st.includes("next_phase")) {
        setTargetAudience((prev) => (prev === "next_phase" ? "all_role" : prev));
      }
    }
  }, [activeRoleId, roles, fixedRecipient]);

  // Import browser-only templates once, then use the audited shared store.
  useEffect(() => {
    let cancelled = false;
    const loadTemplates = async () => {
      try {
        const response = await fetch("/api/admin/careers/templates", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        let templates: CustomTemplate[] = data.templates;
        let cached: CustomTemplate[] = [];
        try { if (!localStorage.getItem("overwatch_templates_migrated")) cached = JSON.parse(localStorage.getItem("overwatch_custom_templates") || "[]"); } catch { /* Browser storage is optional. */ }
        for (const template of cached) {
          const imported = await fetch("/api/admin/careers/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", template }) });
          const result = await imported.json(); if (!imported.ok) throw Error(result.error);
          templates = result.templates;
        }
        if (!cancelled) setCustomTemplates(templates);
        try { localStorage.setItem("overwatch_templates_migrated", "1"); localStorage.setItem("overwatch_custom_templates", JSON.stringify(templates)); } catch { /* Server persistence is authoritative. */ }
      } catch {
        if (!cancelled) setTestNotification({ type: "error", text: lang === "en" ? "Saved templates could not be loaded. Please refresh to retry." : "Não foi possível carregar modelos. Atualize para tentar novamente." });
      }
    };
    void loadTemplates();
    return () => { cancelled = true; };
  }, [lang]);

  const persistTemplate = async (action: "save" | "delete", template: CustomTemplate) => {
    if (templateMutation.current) return false;
    templateMutation.current = true; setSavingTemplate(true);
    try {
      const response = await fetch("/api/admin/careers/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, template, roleId: selectedRole, cohortId }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setCustomTemplates(data.templates);
      try { localStorage.setItem("overwatch_custom_templates", JSON.stringify(data.templates)); } catch { /* Server persistence is authoritative. */ }
      return true;
    } catch {
      setTestNotification({ type: "error", text: t("Template change could not be saved. Please retry.", "Não foi possível guardar a alteração. Tente novamente.") });
      return false;
    } finally { templateMutation.current = false; setSavingTemplate(false); }
  };
  const saveCustomTemplate = async () => {
    if (!newTemplateTitle.trim()) return;
    const newTpl: CustomTemplate = { id: `tpl_${crypto.randomUUID()}`, title: newTemplateTitle.trim(), subject, body: messageBody, createdAt: new Date().toISOString() };
    if (await persistTemplate("save", newTpl)) { setNewTemplateTitle(""); setSaveTemplateModalOpen(false); }
  };
  const deleteCustomTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = customTemplates.find(item => item.id === id);
    if (template) await persistTemplate("delete", template);
  };

  // Pre-configured Built-in Templates
  const builtInTemplates = [
    {
      id: "interview_convocation",
      name: t("Technical Interview Convocation", "Convocatória Entrevista Técnica"),
      badge: "ENTREVISTA",
      subject:
        emailLang === "en"
          ? "Technical Interview Convocation — Overwatch"
          : "Convocatória para Entrevista Técnica — Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

Following our screening of your application for the position of {{role_title}}, we are pleased to invite you to an in-person technical interview with our engineering and operations leadership.

Location: Overwatch Headquarters, Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.
Requirements: Original Identification (BI/Passport), proof of technical certifications, and updated CV.

Please arrive 15 minutes before your scheduled interview appointment.`
          : `Prezado(a) {{candidate_name}},

Na sequência da triagem da sua candidatura para a posição de {{role_title}}, temos a satisfação de convocá-lo(a) para a entrevista técnica presencial com a direção técnica e de operações da Overwatch.

Local: Sede Overwatch Moçambique, Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.
Requisitos: Documento de identificação original (BI/Passaporte), certificados de habilitações técnicas e CV impresso.

Solicitamos a comparência com 15 minutos de antecedência.`,
    },
    {
      id: "screening_passed",
      name: t("Screening Qualified Notice", "Qualificação na Triagem Técnica"),
      badge: "TRIAGEM",
      subject:
        emailLang === "en"
          ? "Application Screening Update — Overwatch"
          : "Actualização da Triagem de Candidatura — Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

We have reviewed your application for the position of {{role_title}} and are pleased to inform you that your profile meets our technical criteria.

Our recruitment team is currently finalizing interview schedules and will contact you shortly with your confirmed appointment slot.`
          : `Prezado(a) {{candidate_name}},

Analisámos a sua candidatura para a posição de {{role_title}} e informamos que o seu perfil preenche os requisitos técnicos obrigatórios estipulados para esta função.

A nossa equipa de recrutamento está a consolidar o cronograma de avaliações e entrará em contacto brevemente com os detalhes da etapa seguinte.`,
    },
    {
      id: "next_phase",
      name: t("Next Phase Convocation", "Convocatória Próxima Fase"),
      badge: "FASE 2",
      subject:
        emailLang === "en"
          ? "Next Phase – Overwatch Selection Process"
          : "Próxima Fase – Processo de Selecção Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

Following your evaluation for {{role_title}}, we are pleased to inform you that you have been selected to advance to the Next Phase of our selection program.

Please find all preparatory instructions and documentation attached. Ensure you arrive promptly with original identification documents.`
          : `Prezada {{candidate_name}},

Após a avaliação da sua candidatura para {{role_title}}, temos a honra de informar que foi seleccionada para a Próxima Fase do programa de selecção Overwatch.

Em anexo disponibilizamos o guia de preparação e cronograma de acolhimento. Lembramos da obrigatoriedade do documento de identificação original.`,
    },
    {
      id: "test_convocation",
      name: t("Physical Test & Gate Pass", "Convocatória Teste & Gate Pass"),
      badge: "TESTE",
      subject:
        emailLang === "en"
          ? "In-Person Test Convocation — Overwatch"
          : "Convocatória para Teste Presencial — Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

You are officially convoked to attend the in-person assessment for {{role_title}} at Overwatch Mozambique Headquarters.

Scheduled Slot: {{test_slot}}
Location: Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.
Requirements: Original BI/Passport, clean formal attire, arrival 15 minutes prior to your slot.`
          : `Prezada {{candidate_name}},

Fica formalmente convocada para a realização do teste presencial para a posição de {{role_title}} na sede da Overwatch Moçambique.

Sessão Agendada: {{test_slot}}
Morada: Av. Paulo Samuel Kankhomba, N.º 1948, Maputo.
Requisitos: BI/Passaporte original, vestuário formal e apresentação com 15 minutos de antecedência.`,
    },
    {
      id: "confirmation_receipt",
      name: t("Attendance Confirmation", "Confirmação de Presença"),
      badge: "RECIBO",
      subject:
        emailLang === "en"
          ? "Confirmation – Overwatch Selection Process"
          : "Confirmação – Processo de Selecção Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

This confirms receipt of your response. Your participation in the scheduled induction program for {{role_title}} has been registered.

Our operations team will verify your access pass at the gate upon arrival. Please retain this email for check-in.`
          : `Prezada {{candidate_name}},

Confirmamos a recepção da sua resposta. A sua vaga na sessão de formação para {{role_title}} encontra-se devidamente registada.

A equipa de segurança validará o seu acesso na portaria principal no dia marcado. Guarde esta comunicação oficial.`,
    },
    {
      id: "closure_notice",
      name: t("Application Closure Notice", "Actualização & Encerramento"),
      badge: "ARQUIVO",
      subject:
        emailLang === "en"
          ? "Overwatch Selection Process Update"
          : "Processo de Selecção Overwatch",
      body:
        emailLang === "en"
          ? `Dear {{candidate_name}},

Thank you for your interest and the time dedicated to participating in our recruitment process for {{role_title}}.

While we are not advancing your application for this specific intake, your profile has been retained in our talent database for upcoming opportunities.`
          : `Prezada {{candidate_name}},

Agradecemos o seu interesse e o tempo dedicado ao processo de selecção para a posição de {{role_title}}.

Informamos que, para este ciclo específico, não daremos seguimento à sua candidatura. O seu perfil permanecerá activo na nossa base de talentos para futuras oportunidades.`,
    },
    {
      id: "blank_slate",
      name: t("Blank Custom Letterhead", "Minuta em Branco"),
      badge: "LIVRE",
      subject: "",
      body: "",
    },
  ];

  // Load a template into the letterhead editor
  const handleLoadTemplate = (tpl: { subject: string; body: string }) => {
    setSubject(tpl.subject);
    setMessageBody(tpl.body);
  };

  // Drag and drop template handlers
  const handleDragStartTemplate = (e: React.DragEvent, tpl: { subject: string; body: string }) => {
    e.dataTransfer.setData("application/json", JSON.stringify(tpl));
  };

  const handleDropOnLetterhead = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLetterhead(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (dataStr) {
        const tpl = JSON.parse(dataStr);
        if (tpl.subject !== undefined) setSubject(tpl.subject);
        if (tpl.body !== undefined) setMessageBody(tpl.body);
      }
    } catch {
      // ignore
    }
  };

  // Insert Variable at cursor or append
  const handleInsertTag = (tag: string) => {
    if (lastEditor.current === "followup") followUpHandle.current?.insertText(tag);
    else editorHandle.current?.insertText(tag);
  };

  // Handle File Uploads (PDF / Images)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Max 5MB per file
      if (file.size > 5 * 1024 * 1024) {
        alert(t("File exceeds 5MB limit:", "O ficheiro excede o limite de 5MB:") + ` ${file.name}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            content: base64Data,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Target Recipients (deduplicated by email address to match dispatch engine)
  const deduplicateByEmail = (list: Application[]) => {
    const seen = new Set<string>();
    const out: Application[] = [];
    // Prefer rows that have already been booked or contacted so primary identity is preserved
    const sorted = [...list].sort(
      (a, b) =>
        Number(Boolean(b.testSlot)) - Number(Boolean(a.testSlot)) ||
        Number(hasSentCommunication(b)) - Number(hasSentCommunication(a)),
    );
    for (const app of sorted) {
      const key = app.email.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(app);
      }
    }
    return out;
  };

  const targetCandidates = useMemo(() => {
    if (fixedRecipient) return applications.filter(a => a.id === fixedRecipient.id && (!includeBookingButton || canReceiveTestInvitation(a)));
    if (targetAudience === "individual") {
      if (!selectedIndividualId) return [];
      return applications.filter(a => a.id === selectedIndividualId && (!includeBookingButton || canReceiveTestInvitation(a)));
    }

    const roleApps = applications.filter(a => !selectedRole || selectedRole === "all" || sameRole(a.role, selectedRole));
    const contactedEmails = new Set(roleApps.filter(hasSentCommunication).map(a => a.email.trim().toLowerCase()));
    const bookedEmails = new Set(roleApps.filter(a => Boolean(a.testSlot) && a.status !== "archived").map(a => a.email.trim().toLowerCase()));

    let pool = includeBookingButton ? roleApps.filter(canReceiveTestInvitation) : roleApps;
    pool = deduplicateByEmail(pool);

    if (targetAudience === "next_phase") return pool.filter(isNextPhase);
    if (targetAudience === "screened") return pool.filter(isQualified);
    if (targetAudience === "tested") return pool.filter((a) => hasTested(a) && !isTerminal(a));
    if (targetAudience === "interview") return pool.filter((a) => a.status === "interview");
    if (targetAudience === "hired") return pool.filter((a) => a.status === "hired");

    if (targetAudience === "shortlisted_unbooked") {
      return pool.filter((a) => !a.testSlot && !bookedEmails.has(a.email.trim().toLowerCase()) && !isTerminal(a));
    }

    if (targetAudience === "booked_confirmed") {
      if (selectedSlot) {
        return pool.filter((a) => a.testSlot && normalizeSlot(a.testSlot) === normalizeSlot(selectedSlot));
      }
      return pool.filter((a) => Boolean(a.testSlot) && a.status !== "archived");
    }

    return pool.filter((a) => a.status !== "archived" && !isTerminal(a) && !hasSentCommunication(a) && !contactedEmails.has(a.email.trim().toLowerCase()));
  }, [applications, fixedRecipient, targetAudience, selectedRole, selectedIndividualId, selectedSlot, includeBookingButton]);

  // Distinct test slots for slot filter
  const distinctSlots = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.testSlot && a.status !== "archived") set.add(normalizeSlot(a.testSlot));
    });
    return Array.from(set).filter(Boolean);
  }, [applications]);

  // Quick Test Email Send
  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestNotification({
        type: "error",
        text: t("Please enter a valid email address.", "Indique um endereço de email válido."),
      });
      return;
    }

    setIsSendingTest(true);
    setTestNotification(null);

    try {
      const res = await fetch("/api/admin/careers/custom-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId,
          locale: emailLang,
          includeBookingButton,
          testOnly: true,
          testEmail: testEmail.trim(),
          roleId: selectedRole,
          subject,
          message: messageBody,
          attachments,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestNotification({
          type: "success",
          text: t(
            `Test letterhead dispatched to ${testEmail} with ${attachments.length} attachment(s).`,
            `Minuta de teste enviada para ${testEmail} com ${attachments.length} anexo(s).`
          ),
        });
      } else {
        setTestNotification({
          type: "error",
          text: data.error || t("Failed to send test email.", "Falha ao enviar email de teste."),
        });
      }
    } catch (err: any) {
      setTestNotification({
        type: "error",
        text: err.message || t("Network error during test dispatch.", "Erro de rede no envio de teste."),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Execute Real Broadcast Dispatch
  const handleExecuteBroadcast = async () => {
    if (!subject.trim() || !messageBody.trim()) {
      alert(t("Subject and message are required.", "Assunto e mensagem são obrigatórios."));
      return;
    }

    if (targetCandidates.length === 0) {
      alert(t("No candidates match your audience selection.", "Nenhum candidato selecionado."));
      return;
    }

    if (followUpEnabled && (!followUpSubject.trim() || !followUpBody.trim())) {
      alert(t("A follow-up email requires both a subject and message.", "O seguimento precisa de assunto e mensagem.")); return;
    }
    setIsDispatching(true);
    setConfirmDispatchOpen(false);

    try {
      const draftId = await draft.flush();
      let payload: any = {
        draftId,
        followUp: followUpEnabled ? { trigger: includeBookingButton ? "booking_confirmed" : "response_confirmed", subject: followUpSubject, message: followUpBody } : undefined,
        locale: emailLang,
        subject,
        message: messageBody,
        roleId: selectedRole,
        includeBookingButton,
        attachments,
      };

      if (fixedRecipient || (targetAudience === "individual" && selectedIndividualId)) {
        payload.audienceFilter = "individual";
        payload.candidateId = fixedRecipient?.id || selectedIndividualId;
        payload.roleId = fixedRecipient?.role || selectedRole;
      } else if (targetAudience === "next_phase") {
        payload.audienceFilter = "next_phase";
      } else if (targetAudience === "shortlisted_unbooked") {
        payload.audienceFilter = "invited_unconfirmed";
      } else if (targetAudience === "booked_confirmed") {
        payload.audienceFilter = "booked_confirmed";
      } else {
        payload.audienceFilter = "all_applied";
      }

      const res = await fetch("/api/admin/careers/custom-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, cohortId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.queued) {
          setDeliveryCampaign(data.campaignId);
          draft.sent(true);
          setDeliveryNotice(t(`${data.totalTargeted} emails queued. Delivery continues on the server; follow progress in Outbox and Sent.`, `${data.totalTargeted} emails em fila. O envio continua no servidor; acompanhe na Caixa de saída e Enviados.`));
          return;
        }
        draft.sent();
        window.dispatchEvent(new Event("admin:careers-updated"));
        await onSent?.().catch(() => {});
        if (data.failedCount) throw new Error(t(`${data.sentCount || 0} sent; ${data.failedCount} failed. Review delivery history before retrying.`, `${data.sentCount || 0} enviados; ${data.failedCount} falharam. Consulte o histórico antes de repetir.`));
        const count = data.sentCount ?? 0;
        setDispatchResultCount(count);
        if (data.historyWarnings?.length) alert(t("Email delivery succeeded, but the profile history could not be updated. Check the section History before sending again.", "O email foi enviado, mas não foi possível atualizar o histórico do perfil. Consulte o Histórico antes de repetir o envio."));
        if (fixedRecipient) {
          setDeliveryNotice(t(`Email sent to ${fixedRecipient.email}.`, `Email enviado para ${fixedRecipient.email}.`));
          setSubject(""); setMessageBody(""); setAttachments([]);
        } else { setCelebrationOpen(true);
        triggerCelebration({
          title: t("Official Broadcast Dispatched!", "Comunicação Oficial Enviada!"),
          variant: "next_phase",
        }); }
      } else {
        alert(data.error || t("Broadcast failed.", "Falha no envio da comunicação."));
      }
    } catch (err: any) {
      alert(err.message || t("Network error executing broadcast.", "Erro de rede ao enviar."));
    } finally {
      setIsDispatching(false);
    }
  };

  // Recipient Display Name in Letterhead
  const letterheadRecipientDisplay = useMemo(() => {
    if (targetAudience === "individual") {
      const match = applications.find((a) => a.id === selectedIndividualId);
      if (match) return `${match.name} <${match.email}>`;
      return t("Individual Candidate", "Candidato Individual");
    }
    if (targetAudience === "next_phase") {
      return `${targetCandidates.length} ${t("Candidates Selected for Next Phase", "Candidatas Seleccionadas para a Próxima Fase")}`;
    }
    if (targetAudience === "tested") {
      return `${targetCandidates.length} ${t("Candidates who Completed Physical Test", "Candidatos que Realizaram o Teste Físico")}`;
    }
    if (targetAudience === "interview") {
      return `${targetCandidates.length} ${t("Candidates in Interview Stage", "Candidatos em Fase de Entrevista")}`;
    }
    if (targetAudience === "hired") {
      return `${targetCandidates.length} ${t("Hired Candidates", "Candidatos Contratados")}`;
    }
    if (targetAudience === "booked_confirmed") {
      return `${targetCandidates.length} ${t("Candidates with Confirmed Test Booking", "Candidatos com Presença Confirmada")}`;
    }
    if (targetAudience === "shortlisted_unbooked") {
      return `${targetCandidates.length} ${t("Shortlisted Candidates (Pending Booking)", "Candidatos Triados (Pendente Agendamento)")}`;
    }
    return `${targetCandidates.length} ${t("Candidates in Role Cohort", "Candidatos na Vaga")}`;
  }, [targetAudience, selectedIndividualId, applications, targetCandidates, t]);

  const activeRoleTitle = useMemo(() => {
    const r = roles.find((item) => item.id === selectedRole) || activeRole;
    if (!r) return emailLang === "en" ? "CCTV Operator" : "Operadora de CCTV";
    return emailLang === "en" ? r.en || r.pt : r.pt || r.en;
  }, [selectedRole, roles, activeRole, emailLang]);

  // Dynamic sample candidate for preview simulation
  const sampleCandidate = useMemo(() => {
    if (selectedPreviewCandidateId) {
      const match = targetCandidates.find((c) => c.id === selectedPreviewCandidateId);
      if (match) return match;
    }
    return targetCandidates[0] || applications[0] || {
      id: "preview-sample",
      name: "Palmira João Mordinho",
      email: "palmira.mordinho@exemplo.com",
      whatsapp: "+258 84 123 4567",
      role: activeRoleTitle,
      testSlot: undefined,
    };
  }, [selectedPreviewCandidateId, targetCandidates, applications, activeRoleTitle]);

  // Formatted preview text with universal placeholder substitution and HTML preservation
  const previewRole = roles.find(role => role.id === sampleCandidate.role);
  const previewRoleTitle = previewRole ? (emailLang === "en" ? previewRole.en : previewRole.pt) : activeRoleTitle;
  const previewMessage = includeBookingButton && !messageBody.includes(BOOKING_TOKEN) ? `${messageBody}\n\n${BOOKING_TOKEN}` : messageBody;
  const renderedPreviewText = useMemo(() => renderStudioMessage(previewMessage, sampleCandidate, previewRoleTitle, emailLang, includeBookingButton, true), [previewMessage, sampleCandidate, previewRoleTitle, emailLang, includeBookingButton]);
  const previewBlocks = messageBlocks(previewMessage);
  const dropBooking = (event: React.DragEvent, index: number) => {
    if (event.dataTransfer.getData("application/overwatch-booking") !== "move") return;
    event.preventDefault(); event.stopPropagation(); setMessageBody(previous => moveBookingToken(previous, index));
  };

  const handleCopyWhatsApp = () => {
    const plainText = renderedPreviewText.replace(/<[^>]*>/g, "");
    const text = `*OVERWATCH MOÇAMBIQUE | ${subject.toUpperCase()}*\n\nPrezado(a) ${sampleCandidate.name},\n\n${plainText}\n\n📍 *Suporte & Dúvidas:* Responda directamente a esta mensagem ou contacte a equipa de RH: +258 84 287 0793.\n\nEquipa de Recursos Humanos & Operações\nOverwatch Moçambique`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const insertCustomRsvpButton = useCallback((label: string, action: "confirm" | "decline" | "portal" | "dual", style: "navy" | "emerald" | "outline" = "navy") => {
    const cleanLabel = (label || "").trim();
    if (!cleanLabel && action !== "dual") return;

    let buttonHtml = "";
    if (action === "dual") {
      const yesUrl = `{{next_phase_link}}?choice=yes`;
      const noUrl = `{{next_phase_link}}?choice=no`;
      const yesBtn = `<a data-action-button="true" href="${yesUrl}" target="_blank" style="display:inline-block;background-color:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin-right:12px;">${emailLang === "en" ? "Yes, Confirm Attendance" : "Sim, Confirmar Presença"} →</a>`;
      const noBtn = `<a data-action-button="true" href="${noUrl}" target="_blank" style="display:inline-block;background-color:#ffffff;color:#475569;border:1px solid #cbd5e1;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">${emailLang === "en" ? "Decline / Unavailable" : "Declinar / Indisponível"}</a>`;
      buttonHtml = `<p style="margin:16px 0;">${yesBtn}${noBtn}</p>`;
    } else {
      const bg = style === "emerald" ? "#059669" : style === "navy" ? "#0b1329" : "#ffffff";
      const text = style === "outline" ? "#334155" : "#ffffff";
      const border = style === "outline" ? "border:1px solid #cbd5e1;" : "";
      const choice = action === "decline" ? "no" : "yes";
      const href = action === "portal"
        ? "{{next_phase_link}}"
        : `{{next_phase_link}}?choice=${choice}&responseOption=${encodeURIComponent(cleanLabel)}`;

      buttonHtml = `<p style="margin:16px 0;"><a data-action-button="true" href="${href}" target="_blank" style="display:inline-block;background-color:${bg};color:${text};${border}padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">${escapeMailText(cleanLabel)}</a></p>`;
    }

    if (canvasTab === "edit" && editorHandle.current?.insertHtml) {
      editorHandle.current.insertHtml(buttonHtml);
    } else {
      setMessageBody(prev => prev ? `${prev}\n\n${buttonHtml}` : buttonHtml);
    }

    setDeliveryNotice(t(`Inserted "${cleanLabel || "RSVP Buttons"}" into email draft`, `Botão "${cleanLabel || "Botões RSVP"}" inserido na minuta do email`));
  }, [canvasTab, emailLang, t]);

  const advisorDiagnostics = useMemo(() => {
    const diagnostics: Array<{
      type: "warning" | "info" | "success";
      title: string;
      message: string;
      actions?: Array<{ label: string; onClick: () => void }>;
    }> = [];

    const hasNextPhaseLink = messageBody.includes("{{next_phase_link}}") ||
      messageBody.includes("{{confirm_button}}") ||
      messageBody.includes("{{response_buttons}}") ||
      messageBody.includes("{{yes_button}}") ||
      messageBody.includes("{{no_button}}") ||
      messageBody.includes("data-action-button");

    const hasBookingLink = messageBody.includes(BOOKING_TOKEN) || includeBookingButton;

    // Diagnostic 1: Next phase links in pre-test audience
    if (hasNextPhaseLink && (targetAudience === "shortlisted_unbooked" || targetAudience === "all_role" || targetAudience === "screened")) {
      diagnostics.push({
        type: "warning",
        title: t(
          "Link Safeguard: Next Phase Links in Pre-Test Audience",
          "Proteção de Links: Links da Próxima Fase em Público Pré-Teste"
        ),
        message: t(
          "Your selected audience contains applicants who have not yet taken or passed the test. Next Phase tokens only activate for approved candidates. If clicked, applicants will be safely directed to their test-booking schedule instead of the advanced portal.",
          "O público selecionado contém candidatos que ainda não realizaram ou foram aprovados no teste. Os links da Próxima Fase só devem ser enviados a candidatos aprovados. Ao clicar, o candidato será encaminhado com segurança para o agendamento de teste."
        ),
        actions: [
          {
            label: t("Change Audience to Next Phase", "Alterar Público para Próxima Fase"),
            onClick: () => setTargetAudience("next_phase"),
          },
          {
            label: t("Replace with Test Booking Link", "Substituir por Botão de Agendamento"),
            onClick: () => {
              setIncludeBookingButton(true);
              setMessageBody(prev => {
                let updated = prev
                  .replace(/{{next_phase_link}}/g, BOOKING_TOKEN)
                  .replace(/{{confirm_button}}/g, BOOKING_TOKEN)
                  .replace(/{{response_buttons}}/g, BOOKING_TOKEN);
                if (!updated.includes(BOOKING_TOKEN)) updated += `\n\n${BOOKING_TOKEN}`;
                return updated;
              });
            },
          },
        ],
      });
    }

    // Diagnostic 2: Test Booking link in post-test audience
    if (hasBookingLink && (targetAudience === "next_phase" || targetAudience === "tested" || targetAudience === "interview" || targetAudience === "hired")) {
      diagnostics.push({
        type: "info",
        title: t(
          "Link Safeguard: Booking Button in Post-Test Audience",
          "Proteção de Links: Botão de Agendamento em Público Pós-Teste"
        ),
        message: t(
          "These applicants have already completed their screening tests. They do not need to book another test slot. For this audience, consider using Next Phase links or RSVP buttons instead.",
          "Estes candidatos já concluíram os testes de selecção. Não necessitam de novo agendamento de teste. Recomendamos o uso de links da Próxima Fase ou botões RSVP."
        ),
        actions: [
          {
            label: t("Remove Booking Link", "Remover Botão de Agendamento"),
            onClick: () => {
              setIncludeBookingButton(false);
              setMessageBody(prev => prev.replaceAll(BOOKING_TOKEN, ""));
            },
          },
        ],
      });
    }

    // Diagnostic 3: Score variable in unscreened audience
    if (messageBody.includes("{{score}}") && (targetAudience === "shortlisted_unbooked" || targetAudience === "screened" || targetAudience === "all_role")) {
      diagnostics.push({
        type: "info",
        title: t("Dynamic Variable Notice: {{score}}", "Aviso de Variável: {{score}}"),
        message: t(
          "{{score}} will automatically remain blank for applicants who have not yet taken a test.",
          "{{score}} permanecerá automaticamente em branco para candidatos sem teste registado."
        ),
      });
    }

    return diagnostics;
  }, [messageBody, includeBookingButton, targetAudience, t]);

  // All past communication logs for history drawer
  const allLogs = useMemo(() => {
    const list: {
      id: string;
      candidateName: string;
      recipient: string;
      subject: string;
      sentAt: string;
      type: string;
    }[] = [];

    applications.forEach((app) => {
      if (app.communications) {
        app.communications.forEach((comm) => {
          list.push({
            id: comm.id,
            candidateName: app.name,
            recipient: comm.recipient || app.email,
            subject: comm.subject,
            sentAt: comm.sentAt,
            type: comm.type,
          });
        });
      }
      if (app.invitedAt && !(app.communications || []).some(comm => Math.abs(new Date(comm.sentAt).getTime() - new Date(app.invitedAt!).getTime()) < 60000)) {
        list.push({
          id: `conv_${app.id}`,
          candidateName: app.name,
          recipient: app.email,
          subject: "Convocatória para Teste Presencial — Overwatch",
          sentAt: app.invitedAt,
          type: "convocation",
        });
      }
    });

    return list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [applications]);

  const filteredLogs = useMemo(() => {
    if (!historySearch.trim()) return allLogs;
    const q = historySearch.toLowerCase().trim();
    return allLogs.filter(
      (l) =>
        l.candidateName.toLowerCase().includes(q) ||
        l.recipient.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q)
    );
  }, [allLogs, historySearch]);

  return (
    <div className="space-y-6 relative">
      {deliveryCampaign && <DeliveryProgress scope={scope} campaignId={deliveryCampaign} applications={applications} onClose={() => setDeliveryCampaign(null)} onViewSent={() => { setDeliveryCampaign(null); setFolder("sent"); }} onComplete={() => { setDeliveryNotice(t("Official correspondence dispatched successfully. Delivered messages are in your Sent folder.", "Correspondência oficial enviada com sucesso. As mensagens entregues encontram-se na pasta Enviados.")); window.dispatchEvent(new Event("admin:careers-updated")); void onSent?.().catch(() => {}); }} />}
      {/* Universal Overwatch Processing Animation */}
      {isDispatching && (
        <OverwatchOrbitLoader
          label={
            lang === "en"
              ? "Dispatching Official Overwatch Correspondence..."
              : "A emitir e despachar correspondência oficial Overwatch..."
          }
          size="lg"
          fullscreen
        />
      )}

      {/* Confetti Celebration Modal on Success */}
      <CelebrationOverlay
        show={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        title={t("Official Letterhead Successfully Dispatched!", "Minuta Oficial Despachada com Sucesso!")}
        subtitle={t(
          `Official Overwatch letterhead successfully transmitted to ${dispatchResultCount} recipients with all attached dossiers.`,
          `Correspondência oficial transmitida para ${dispatchResultCount} destinatários com todos os dossiers anexados.`
        )}
        variant="next_phase"
      />

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>{t("Communications & Letterhead Studio", "Estúdio de Comunicações & Minutas")}</span>
            <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              STUDIO
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Compose, customize, attach PDF/image files, and broadcast official Overwatch correspondence",
              "Edição direta em papel timbrado, upload de anexos (PDF/imagens) e envio em massa para candidatos"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Clock size={14} className="text-slate-500" />
            <span>{t("Delivery History", "Histórico de Envios")} ({allLogs.length})</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><label className="text-xs font-semibold">{t("Email language", "Idioma do email")}<select aria-label={t("Email language", "Idioma do email")} value={emailLang} onChange={event => setEmailLang(event.target.value as "pt" | "en")} className="ml-3 rounded-lg border px-3 py-2"><option value="pt">Português</option><option value="en">English</option></select></label><span className="text-xs text-slate-500">{t("Controls templates, role names, booking buttons and the letterhead. The admin interface can stay in English.", "Controla os modelos, nomes de vagas, botões de agendamento e o timbre.")}</span></div>
      <div className="sticky top-[102px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <nav aria-label={t("Mailbox folders", "Pastas de correio")} className="flex flex-wrap gap-1">{([
          ["compose", t("Compose", "Escrever")],
          ["drafts", t("Drafts", "Rascunhos")],
          ["incoming", t("Incoming", "Recebidos")],
          ["sent", t("Sent", "Enviados")],
          ["outbox", t("Outbox", "Caixa de saída")],
          ["scheduled", t("Scheduled Auto Follow-Ups", "Seguimentos Automáticos")],
        ] as const).map(([key,label]) => <button key={key} type="button" aria-pressed={folder === key} onClick={() => setFolder(key)} className={`rounded-lg px-3 py-2 text-xs font-medium ${folder === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</nav>
        <div className="flex items-center gap-3">
          <span role="status" className="max-w-sm text-xs text-slate-500">{draft.status}</span>
          <button
            type="button"
            disabled={!draft.ready || isDispatching || openingDraft}
            onClick={() => {
              if (newDraftLock.current) return;
              newDraftLock.current = true;
              setOpeningDraft(true);
              void draft.newDraft().then(() => setFolder("compose")).catch(error => setDeliveryNotice(error.message)).finally(() => {
                newDraftLock.current = false;
                setOpeningDraft(false);
              });
            }}
            className="rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {openingDraft ? t("Creating draft…", "A criar rascunho…") : t("New draft", "Novo rascunho")}
          </button>
        </div>
      </div>
      {folder !== "compose" && <StudioMailbox scope={scope} folder={folder} applications={applications} onOpenDraft={async id => { await draft.open(id); setFolder("compose"); }} onOpenProgress={campaignId => setDeliveryCampaign(campaignId)} />}
      {/* MAIN 2-COLUMN STUDIO LAYOUT */}
      {deliveryNotice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <span>{deliveryNotice}</span>
          <button
            type="button"
            onClick={() => setDeliveryNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded transition-colors cursor-pointer shrink-0"
            title={t("Dismiss", "Fechar")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div hidden={folder !== "compose"} inert={!draft.ready || isDispatching} className={folder !== "compose" ? "hidden" : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"}>
        {/* ========================================================================= */}
        {/* LEFT COLUMN: COMPOSER PALETTE & DISPATCH CONTROLS (5 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* CARD 1: TARGET AUDIENCE */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Users size={14} className="text-slate-600" />
                <span>{t("1. Target Audience", "1. Destinatários")}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[0.68rem] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {targetCandidates.length} {t("targeted", "destinatários")}
              </span>
            </div>

            {/* Role Filter */}
            {fixedRecipient ? <div className="rounded-lg bg-sky-50 p-3 text-sm"><p className="font-semibold">{fixedRecipient.name}</p><p className="break-all text-slate-600">{fixedRecipient.email}</p><p className="mt-2 text-xs text-slate-500">{t("Individual email · only this candidate will receive this message.", "Email individual · apenas este candidato recebe esta mensagem.")}</p></div> : <><div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                {t("Role Campaign:", "Vaga de Recrutamento:")}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setSelectedRole(newRole);
                  const def = roles.find((r) => r.id === newRole);
                  const st = def?.pipelineStages || [];
                  if (!st.includes("next_phase") && targetAudience === "next_phase") {
                    setTargetAudience((prev) => (prev === "next_phase" ? "all_role" : prev));
                  }
                  if (!st.includes("testing") && (targetAudience === "shortlisted_unbooked" || targetAudience === "booked_confirmed")) {
                    setTargetAudience((prev) => (prev === "next_phase" ? "all_role" : prev));
                  }
                }}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">{t("All Roles / Global", "Todas as Vagas / Global")}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === "en" ? r.en || r.pt : r.pt || r.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Audience Cohort Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                {t("Recipient Group:", "Grupo Alvo:")}
              </label>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {(() => {
                  const rawRolePool = applications.filter((a) => selectedRole === "all" || sameRole(a.role, selectedRole));
                  const contactedEmails = new Set(rawRolePool.filter(hasSentCommunication).map((a) => a.email.trim().toLowerCase()));
                  const bookedEmails = new Set(rawRolePool.filter((a) => Boolean(a.testSlot) && a.status !== "archived").map((a) => a.email.trim().toLowerCase()));
                  const rolePool = deduplicateByEmail(
                    (includeBookingButton ? applications.filter(canReceiveTestInvitation) : applications).filter((a) => selectedRole === "all" || sameRole(a.role, selectedRole))
                  );
                  const uncontactedCount = rolePool.filter((a) => a.status !== "archived" && !isTerminal(a) && !hasSentCommunication(a) && !contactedEmails.has(a.email.trim().toLowerCase())).length;
                  const unbookedCount = rolePool.filter((a) => !a.testSlot && !bookedEmails.has(a.email.trim().toLowerCase()) && !isTerminal(a)).length;
                  const bookedCount = rolePool.filter((a) => Boolean(a.testSlot) && a.status !== "archived").length;
                  const testedCount = rolePool.filter((a) => hasTested(a) && !isTerminal(a)).length;
                  const nextPhaseCount = applications.filter((a) => isNextPhase(a) && (selectedRole === "all" || sameRole(a.role, selectedRole))).length;
                  const interviewCount = rolePool.filter((a) => a.status === "interview").length;
                  const hiredCount = rolePool.filter((a) => a.status === "hired").length;
                  const list: { id: string; label: string }[] = [];

                  list.push({
                    id: "all_role",
                    label: t(`All Applicants in this Role · Uncontacted (${uncontactedCount})`, `Todas as Candidaturas desta Vaga · Por Contactar (${uncontactedCount})`),
                  });

                  list.push(
                    {
                      id: "shortlisted_unbooked",
                      label: t(`Shortlisted (Awaiting Booking) (${unbookedCount})`, `Convocadas (Pendente Agendamento) (${unbookedCount})`),
                    },
                    {
                      id: "booked_confirmed",
                      label: t(`Booked Test Sessions (Escala) (${bookedCount})`, `Testes Agendados (Escala Confirmada) (${bookedCount})`),
                    },
                    {
                      id: "tested",
                      label: t(`Tested / Test Completed (${testedCount})`, `Testes Concluídos (${testedCount})`),
                    },
                    {
                      id: "next_phase",
                      label: t(`Selected for Next Phase (${nextPhaseCount})`, `Selecionados Próxima Fase (${nextPhaseCount})`),
                    },
                    {
                      id: "interview",
                      label: t(`In Interview Stage (${interviewCount})`, `Em Fase de Entrevista (${interviewCount})`),
                    },
                    {
                      id: "hired",
                      label: t(`Hired & Admitted (${hiredCount})`, `Contratados & Admitidos (${hiredCount})`),
                    }
                  );

                  list.push({
                    id: "individual",
                    label: t("Individual Specific Applicant", "Candidato Específico (Individual)"),
                  });

                  return list;
                })().map((aud) => (
                  <label
                    key={aud.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      targetAudience === aud.id
                        ? "border-sky-500 bg-sky-50/70 font-semibold text-sky-950 ring-1 ring-sky-500/20"
                        : "border-slate-200 hover:bg-slate-50/50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audienceGroup"
                      value={aud.id}
                      checked={targetAudience === aud.id}
                      onChange={() => setTargetAudience(aud.id)}
                      className="accent-sky-600"
                    />
                    <span className="text-[11px]">{aud.label}</span>
                  </label>
                ))}
              </div>
            </div>

            </>}
            {/* Slot selector if booked_confirmed */}
            {targetAudience === "booked_confirmed" && distinctSlots.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {t("Filter by Slot (Optional):", "Filtrar por Turno (Opcional):")}
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  <option value="">{t("All Scheduled Slots", "Todos os Turnos Agendados")}</option>
                  {distinctSlots.map((s) => (
                    <option key={s} value={s}>
                      {formatSlotDisplay(s)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Searchable Individual Applicant Picker */}
            {!fixedRecipient && targetAudience === "individual" && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {t("Select Applicant:", "Escolher Candidata:")}
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder={t("Filter by candidate name...", "Filtrar por nome...")}
                    value={individualSearch}
                    onChange={(e) => setIndividualSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-1 space-y-1 bg-slate-50">
                  {applications
                    .filter((a) => {
                      if (!individualSearch.trim()) return true;
                      return (
                        a.name.toLowerCase().includes(individualSearch.toLowerCase()) ||
                        a.email.toLowerCase().includes(individualSearch.toLowerCase())
                      );
                    })
                    .slice(0, 20)
                    .map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedIndividualId(app.id)}
                        className={`w-full text-left p-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                          selectedIndividualId === app.id
                            ? "bg-sky-600 text-white font-semibold shadow-2xs"
                            : "hover:bg-white text-slate-800"
                        }`}
                      >
                        <span className="truncate">{app.name}</span>
                        <span className="text-[10px] opacity-75 font-mono ml-2 shrink-0">
                          {app.email || app.whatsapp}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: OFFICIAL TEMPLATES PALETTE (DRAGGABLE / CLICKABLE) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={14} className="text-slate-600" />
                <span>{t("2. Template Palette", "2. Modelos & Minutas")}</span>
              </span>
              <button
                type="button"
                onClick={() => setSaveTemplateModalOpen(true)}
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus size={13} />
                <span>{t("+ Save Current", "+ Guardar Modelo")}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              {t(
                "Click to load or drag any template directly onto the letterhead canvas to edit its text.",
                "Clique para carregar ou arraste qualquer modelo diretamente para a minuta para editar."
              )}
            </p>

            {/* Template Cards List */}
            <div className="space-y-1.5">
              {builtInTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  draggable
                  onDragStart={(e) => handleDragStartTemplate(e, tpl)}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group bg-white"
                  title={t("Drag or click to load into letterhead", "Arraste ou clique para carregar")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 group-hover:bg-sky-100 group-hover:text-sky-800 text-slate-600 transition-colors">
                      {tpl.badge}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {tpl.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] font-bold text-sky-600 group-hover:text-sky-800 shrink-0"
                  >
                    {t("Load", "Carregar")} &rarr;
                  </button>
                </div>
              ))}

              {/* User Saved Custom Templates */}
              {customTemplates.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    {t("Custom Saved Templates", "Modelos Guardados pelo Utilizador")}
                  </span>
                  {customTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      draggable
                      onDragStart={(e) => handleDragStartTemplate(e, tpl)}
                      onClick={() => handleLoadTemplate(tpl)}
                      className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/30 hover:border-purple-600 transition-all flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700">
                          {t("CUSTOM", "CUSTOM")}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {tpl.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900"
                        >
                          {t("Load", "Carregar")}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteCustomTemplate(tpl.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title={t("Delete template", "Eliminar modelo")}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: DYNAMIC VARIABLES & NEXT PHASE RSVP BUTTONS */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <SlidersHorizontal size={14} className="text-slate-600" />
                <span>{t("3. Next Phase Options & Variables", "3. Opções da Próxima Fase & Variáveis")}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomRsvpLabel("");
                  setCustomRsvpAction("confirm");
                  setCustomRsvpStyle("navy");
                  setCustomRsvpModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={t("Create and insert custom RSVP buttons into your email", "Criar e inserir botões RSVP personalizados no email")}
              >
                <Plus size={13} />
                <span>{t("Create Custom RSVP", "Criar Botão RSVP")}</span>
              </button>
            </div>

            {/* Interactive RSVP Action Buttons Section */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {t("Interactive Candidate Response Buttons", "Botões Interativos de Resposta (RSVP)")}
                </span>
                <span className="text-[10px] text-slate-500">
                  {t("Click any button below to embed it into the email at your cursor position:", "Clique para inserir o botão diretamente na mensagem:")}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => insertCustomRsvpButton(t("Confirm Attendance", "Confirmar Presença"), "confirm", "emerald")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  title={t("Inserts a green confirmation button. Automatically records confirmation when clicked.", "Insere botão de confirmação. Regista confirmação automaticamente.")}
                >
                  <Check size={13} />
                  <span>{t("Confirm Attendance", "Confirmar Presença")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => insertCustomRsvpButton(t("Confirm In-Person Interview", "Confirmar Entrevista Presencial"), "confirm", "navy")}
                  className="px-3 py-1.5 rounded-lg bg-[#0b1329] hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title={t("Inserts an interview RSVP button", "Insere botão de confirmação de entrevista")}
                >
                  {t("Confirm Interview", "Confirmar Entrevista")}
                </button>

                <button
                  type="button"
                  onClick={() => insertCustomRsvpButton(t("Accept Training Terms", "Aceitar Termos da Formação"), "confirm", "navy")}
                  className="px-3 py-1.5 rounded-lg bg-[#0b1329] hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title={t("Inserts training acceptance button", "Insere botão de aceitação de formação")}
                >
                  {t("Accept Training", "Aceitar Formação")}
                </button>

                <button
                  type="button"
                  onClick={() => insertCustomRsvpButton("", "dual")}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  title={t("Inserts two side-by-side buttons: Yes (Confirm) and Decline", "Insere par de botões lado a lado: Sim (Confirmar) e Recusar")}
                >
                  <span>{t("Dual Choice (Yes / No)", "Botões Duplos (Sim / Não)")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => insertCustomRsvpButton(t("Decline / Unavailable", "Declinar / Indisponível"), "decline", "outline")}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
                  title={t("Inserts subtle decline option", "Insere opção discreta de recusa")}
                >
                  {t("Decline", "Declinar")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomRsvpLabel("");
                    setCustomRsvpAction("confirm");
                    setCustomRsvpStyle("navy");
                    setCustomRsvpModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-dashed border-sky-400 bg-sky-50/60 hover:bg-sky-100 text-sky-800 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                  title={t("Build custom RSVP button with your own wording", "Criar botão RSVP com texto personalizado")}
                >
                  <Plus size={12} />
                  <span>{t("Custom...", "Personalizado...")}</span>
                </button>
              </div>
            </div>

            {/* Standard Variable Chips Section */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-700 block">
                {t("Standard Personalized Candidate Tokens:", "Campos Dinâmicos do Candidato:")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{{candidate_name}}", label: t("Applicant Name", "Nome Candidato") },
                  { tag: "{{booking_link}}", label: t("Test Booking Button", "Botão de Agendamento") },
                  { tag: "{{role_title}}", label: t("Job Role Title", "Título da Vaga") },
                  { tag: "{{confirm_button}}", label: t("Confirm Button (Single-Click)", "Botão Confirmar") },
                  { tag: "{{response_buttons}}", label: t("Accept / Decline Buttons", "Botões Aceitar / Recusar") },
                  { tag: "{{yes_button}}", label: t("Accept Button", "Botão Aceitar") },
                  { tag: "{{no_button}}", label: t("Decline Button", "Botão Recusar") },
                  { tag: "{{next_phase_link}}", label: t("Next Phase Portal Link", "Link Próxima Fase") },
                  { tag: "{{score}}", label: t("Test Score %", "Nota do Teste %") },
                  { tag: "{{test_slot}}", label: t("Scheduled Test Slot", "Turno Agendado") },
                  { tag: "{{location}}", label: t("Candidate Location", "Localização") },
                  { tag: "{{company_name}}", label: t("Company Name", "Overwatch") },
                  { tag: "{{date}}", label: t("Current Date", "Data Atual") },
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => handleInsertTag(v.tag)}
                    className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 hover:border-sky-400 hover:text-sky-700 text-slate-700 text-[10px] font-mono font-medium border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                    title={v.label}
                  >
                    {v.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
            <input type="checkbox" aria-label={t("Include test booking button", "Incluir botão de agendamento")} checked={includeBookingButton} onChange={event => {
              const checked = event.target.checked; setIncludeBookingButton(checked);
              if (checked && !messageBody.includes(BOOKING_TOKEN)) {
                if (canvasTab === "edit") editorHandle.current?.insertText(BOOKING_TOKEN);
                else setMessageBody(previous => moveBookingToken(previous, messageBlocks(previous).length));
              } else if (!checked) { setMessageBody(previous => previous.replaceAll(BOOKING_TOKEN,"")); setFollowUpEnabled(false); }
            }} />
            <span>{t("Include a test-booking link. Only eligible candidates in this cycle will receive this invitation.", "Incluir ligação de agendamento. Apenas candidatos elegíveis deste lote receberão a convocatória.")}</span>
          </label>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
            <Link href={`/admin/settings?roleId=${encodeURIComponent(selectedRole)}${cohortId ? `&cohortId=${encodeURIComponent(cohortId)}` : ""}#test-slots`} className="font-semibold text-sky-700">{t("Configure this role's test dates, times & capacity →", "Configurar datas, horas e capacidade desta vaga →")}</Link>
            <p className="leading-relaxed text-slate-500">{t("Test slot shows the applicant's actual booking. Before booking, the email asks them to choose a time. The booking button opens their personal cycle schedule.", "O turno mostra o agendamento real. Antes de agendar, o email pede a escolha de um turno. O botão abre o horário pessoal do lote.")}</p>
            {includeBookingButton && (
              <p className="text-slate-500">{t("Drag the booking button between paragraphs in Preview, or move its {{booking_link}} token in the editor.", "Arraste o botão entre parágrafos na pré-visualização ou mova {{booking_link}} no editor.")}</p>
            )}
          </div>

          {/* Automated Follow-Up Email (Decoupled & Available for Any Broadcast) */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={followUpEnabled}
                onChange={event => setFollowUpEnabled(event.target.checked)}
              />
              <span>{t("Send an automatic follow-up message", "Enviar seguimento automático")}</span>
            </label>
            {followUpEnabled && (
              <div className="space-y-3 border-t border-slate-100 pt-3" onFocusCapture={() => { lastEditor.current = "followup"; }}>
                <p className="text-slate-500">
                  {t(
                    "When candidates confirm, book, or advance, send this message automatically. It appears in Sent / Outbox.",
                    "Quando os candidatos confirmarem ou agendarem, envie esta mensagem automaticamente. Fica registada em Enviados."
                  )}
                </p>
                <div>
                  <label htmlFor="studio-followup-subject" className="block font-medium">
                    {t("Follow-up subject", "Assunto do seguimento")}
                  </label>
                  <input
                    id="studio-followup-subject"
                    name="followUpSubject"
                    type="text"
                    autoComplete="on"
                    aria-label={t("Follow-up subject", "Assunto do seguimento")}
                    value={followUpSubject}
                    onChange={event => setFollowUpSubject(event.target.value)}
                    className="mt-1 w-full rounded-lg border p-2"
                  />
                </div>
                <RichMessageEditor
                  ariaLabel={t("Follow-up message", "Mensagem de seguimento")}
                  ref={followUpHandle}
                  value={followUpBody}
                  onChange={setFollowUpBody}
                  lang={lang}
                  availableVariables={[
                    { code: "{{candidate_name}}", label: t("Candidate Full Name", "Nome Completo") },
                    { code: "{{name}}", label: t("Candidate Name (Short)", "Nome Candidato") },
                    { code: "{{role_title}}", label: t("Job Role Title", "Cargo / Função") },
                    { code: "{{booking_link}}", label: t("Test Booking Button", "Botão de Agendamento") },
                    { code: "{{confirm_button}}", label: t("Confirm Button (Single RSVP)", "Botão Confirmar Presença") },
                    { code: "{{response_buttons}}", label: t("Dual Response Buttons (Yes / No)", "Botões Sim / Não") },
                    { code: "{{yes_button}}", label: t("Acceptance Button", "Botão Sim (Aceitar)") },
                    { code: "{{no_button}}", label: t("Decline Button", "Botão Não (Recusar)") },
                    { code: "{{next_phase_link}}", label: t("Confirmation Portal Link", "Link do Portal de Confirmação") },
                    { code: "{{score}}", label: t("Test Score %", "Nota do Teste %") },
                    { code: "{{test_slot}}", label: t("Assigned / Booked Test Slot", "Turno Agendado") },
                    { code: "{{location}}", label: t("HQ Facility Address", "Endereço das Instalações") },
                    { code: "{{company_name}}", label: t("Company Name", "Overwatch Moçambique") },
                    { code: "{{date}}", label: t("Current Official Date", "Data Oficial") },
                  ]}
                />
                {(!followUpSubject.trim() || !followUpBody.trim()) && (
                  <p className="rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-800">
                    {t(
                      "Note: Please fill in both the follow-up subject and message above, or uncheck automatic follow-up before dispatching.",
                      "Nota: Preencha o assunto e a mensagem de seguimento acima, ou desmarque o seguimento automático antes de enviar."
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CARD 4: FILE ATTACHMENTS (PDF / IMAGE) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Paperclip size={14} className="text-slate-600" />
                <span>{t("4. Attachments (PDF / Image)", "4. Anexos Oficiais (PDF / Imagem)")}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {attachments.length} {t("files", "ficheiro(s)")}
              </span>
            </div>

            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Dropzone Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-3.5 text-center transition-colors bg-slate-50/50 hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <FileUp size={20} className="text-slate-500" />
              <div className="text-xs font-semibold text-slate-800">
                {t("Upload PDF or Image", "Carregar Documento PDF ou Imagem")}
              </div>
              <div className="text-[10px] text-slate-400">
                {t("Attach manual, road map, briefing guidelines (Max 5MB each)", "Anexar regulamento, mapa de localização, cronograma (Máx 5MB)")}
              </div>
            </button>

            {/* Uploaded Files List */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {file.type.includes("pdf") ? (
                        <FileText size={14} className="text-rose-600 shrink-0" />
                      ) : (
                        <ImageIcon size={14} className="text-sky-600 shrink-0" />
                      )}
                      <span className="truncate font-medium text-slate-900">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title={t("Remove file", "Remover anexo")}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: THE OFFICIAL OVERWATCH COMMUNICATIONS STUDIO CANVAS (7 cols) */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-7 space-y-4 lg:sticky ${fixedRecipient ? "lg:top-[164px]" : "lg:top-[158px]"} self-start lg:max-h-[calc(100vh-175px)] lg:overflow-y-auto admin-scrollbar`}>
          {/* Main Studio Canvas Container */}
          <div
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("application/json")) return;
              e.preventDefault();
              setIsDragOverLetterhead(true);
            }}
            onDragLeave={() => setIsDragOverLetterhead(false)}
            onDrop={handleDropOnLetterhead}
            className={`rounded-2xl border transition-all shadow-xl relative bg-white ${
              isDragOverLetterhead
                ? "border-sky-500 ring-4 ring-sky-100"
                : "border-slate-300"
            }`}
          >
            {/* Drag Over Visual Hint Banner */}
            {isDragOverLetterhead && (
              <div className="pointer-events-none absolute inset-0 z-40 rounded-2xl bg-sky-950/70 backdrop-blur-xs flex items-center justify-center p-6 text-center text-white">
                <div className="p-4 rounded-xl bg-sky-900 border border-sky-400 shadow-xl flex flex-col items-center gap-2">
                  <FileText size={32} className="text-sky-300" />
                  <span className="text-sm font-bold">
                    {t("Drop template to load into editor", "Solte o modelo para carregar no editor")}
                  </span>
                </div>
              </div>
            )}

            {/* Studio Canvas Mode Header Tabs */}
            <div className="rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
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

            {/* Tab 1: Professional Rich Message Editor */}
            <div style={{ display: canvasTab === "edit" ? "block" : "none" }} className="p-6 space-y-5">
              {/* Intelligent Link & Audience Safeguard Advisor Banner */}
              {advisorDiagnostics.length > 0 && (
                <div className="space-y-2">
                  {advisorDiagnostics.map((diag, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        diag.type === "warning"
                          ? "bg-amber-50/90 border-amber-300 text-amber-900"
                          : "bg-sky-50/90 border-sky-300 text-sky-900"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle
                          size={16}
                          className={`mt-0.5 shrink-0 ${
                            diag.type === "warning" ? "text-amber-600" : "text-sky-600"
                          }`}
                        />
                        <div className="flex-1 space-y-1">
                          <h4 className="font-bold text-xs">{diag.title}</h4>
                          <p className="text-[11px] leading-relaxed text-slate-700">{diag.message}</p>
                        </div>
                      </div>
                      {diag.actions && diag.actions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 pl-6">
                          {diag.actions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              type="button"
                              onClick={act.onClick}
                              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                              {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Official Email Subject Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="studio-email-subject" className="font-bold text-slate-800">
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
                  id="studio-email-subject"
                  name="subject"
                  autoComplete="on"
                  placeholder={t("Enter email subject...", "Assunto da comunicação oficial...")}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Standard Professional Rich Message Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="studio-email-subject" className="font-bold text-slate-800">
                    {t("Official Message Content & Attachments", "Conteúdo Oficial da Mensagem & Anexos")}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {attachments.length} {t("attachment(s)", "anexo(s)")}
                  </span>
                </div>
                <div onFocusCapture={() => { lastEditor.current = "main"; }}><RichMessageEditor
                  ref={editorHandle}
                  value={messageBody}
                  onChange={setMessageBody}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  lang={lang}
                  placeholder={t(
                    "Type your official letter here, edit the loaded template, or drag a template directly into this space...",
                    "Escreva a mensagem aqui, personalize o modelo carregado ou arraste um modelo para esta área..."
                  )}
                  availableVariables={[
                    { code: "{{candidate_name}}", label: t("Candidate Full Name", "Nome Completo") },
                    { code: "{{name}}", label: t("Candidate Name (Short)", "Nome Candidato") },
                    { code: "{{role_title}}", label: t("Job Role Title", "Cargo / Função") },
                    { code: "{{booking_link}}", label: t("Test Booking Button", "Botão de Agendamento") },
                    { code: "{{confirm_button}}", label: t("Confirm Button (Single RSVP)", "Botão Confirmar Presença") },
                    { code: "{{response_buttons}}", label: t("Dual Response Buttons (Yes / No)", "Botões Sim / Não") },
                    { code: "{{yes_button}}", label: t("Acceptance Button", "Botão Sim (Aceitar)") },
                    { code: "{{no_button}}", label: t("Decline Button", "Botão Não (Recusar)") },
                    { code: "{{next_phase_link}}", label: t("Confirmation Portal Link", "Link do Portal de Confirmação") },
                    { code: "{{score}}", label: t("Test Score %", "Nota do Teste %") },
                    { code: "{{test_slot}}", label: t("Assigned Test Slot", "Turno Agendado") },
                    { code: "{{date}}", label: t("Current Official Date", "Data Oficial") },
                    { code: "{{location}}", label: t("HQ Facility Address", "Endereço das Instalações") },
                    { code: "{{company_name}}", label: t("Company Name", "Overwatch Moçambique") },
                  ]}
                /></div>
              </div>
            </div>

            {/* Tab 2: Live Official Branded Letterhead Preview */}
            <div style={{ display: canvasTab === "preview" ? "flex" : "none" }} className="p-6 sm:p-8 bg-slate-100/60 flex-col items-center space-y-4">
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
                        "Cada candidato receberá automaticamente o seu próprio nome, função e horário dinamicamente no envio oficial. Use o simulador abaixo para conferir a substituição com os dados reais de qualquer candidato deste grupo."
                      )}
                    </p>
                  </div>
                </div>

                {/* Recipient Simulation Selector */}
                {targetCandidates.length > 0 && (
                  <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {t("Previewing Recipient Data:", "Simular com Dados do Candidato:")}
                      </span>
                      <select
                        value={sampleCandidate.id}
                        onChange={(e) => setSelectedPreviewCandidateId(e.target.value)}
                        className="text-xs rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        {targetCandidates.slice(0, 50).map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            {cand.name} ({cand.email || cand.whatsapp})
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {targetCandidates.length} {t("candidates targeted", "candidatos no grupo")}
                    </span>
                  </div>
                )}

                {includeBookingButton && <button type="button" aria-pressed={arrangingBooking} onClick={() => setArrangingBooking(value => !value)} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700">{arrangingBooking ? t("Done positioning", "Concluir posicionamento") : t("Position booking button", "Posicionar botão de agendamento")}</button>}

                {/* The Actual Official Letterhead Sheet */}
                <div className="w-full max-w-2xl rounded-2xl border border-slate-300 bg-white shadow-xl overflow-hidden text-left">
                  {/* Navy Header Band #0a1128 */}
                  <div className="bg-[#0a1128] px-6 py-4.5 border-b-2 border-white/10 flex items-center justify-between text-white">
                    <Logo variant="light" size="sm" />
                    <div className="text-right">
                      <span className="inline-block bg-white/10 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/15 tracking-wider">
                        REF: COM-{new Date().getFullYear()}/MAPUTO
                      </span>
                      <span className="block text-[10px] text-slate-300 font-medium mt-0.5">
                        {emailLang === "en" ? "Human Resources Department" : "Departamento de Recursos Humanos"}
                      </span>
                    </div>
                  </div>

                  {/* Sub-bar */}
                  <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span className="font-bold text-slate-900 tracking-wider uppercase text-[10px]">
                      {emailLang === "en" ? "OFFICIAL COMMUNICATION · RECRUITMENT PROCESS" : "COMUNICAÇÃO OFICIAL · PROCESSO DE RECRUTAMENTO"}
                    </span>
                    <span>Maputo, Moçambique</span>
                  </div>

                  {/* Metadata Bar */}
                  <div className="p-6 pb-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {emailLang === "en" ? "To / Recipient:" : "Para / Destinatário:"}
                      </span>
                      <span className="font-bold text-slate-900 truncate block mt-0.5">
                        {sampleCandidate.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {emailLang === "en" ? "Position / Role:" : "Vaga / Função:"}
                      </span>
                      <span className="font-semibold text-slate-800 truncate block mt-0.5">
                        {previewRoleTitle}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {emailLang === "en" ? "Date:" : "Data de Emissão:"}
                      </span>
                      <span className="font-mono text-slate-700 block mt-0.5">
                        {new Date().toLocaleDateString(emailLang === "en" ? "en-US" : "pt-PT", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Letter Body Rendered */}
                  <div className="p-6 bg-white space-y-4">
                    <div onClick={event => { if ((event.target as Element).closest("[data-booking-button]")) event.preventDefault(); }} onDragStart={event => { if ((event.target as Element).closest("[data-booking-button]")) { setArrangingBooking(true); event.stopPropagation(); event.dataTransfer.setData("application/overwatch-booking", "move"); event.dataTransfer.effectAllowed = "move"; } }} className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1 [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic">
                      {previewBlocks.map((block,index) => <React.Fragment key={index}>{includeBookingButton && arrangingBooking && <div onDragOver={event => { event.preventDefault(); event.stopPropagation(); }} onDrop={event => dropBooking(event,index)} className="my-1 min-h-4 rounded border border-dashed border-sky-200 px-2 py-1 text-center text-[10px] text-sky-600">{t("Drop booking button here", "Largar botão aqui")}<button className="ml-2 underline" type="button" onClick={() => setMessageBody(previous => moveBookingToken(previous,index))}>{t("Move here", "Mover aqui")}</button></div>}<div dangerouslySetInnerHTML={{__html:renderStudioMessage(block,sampleCandidate,previewRoleTitle,emailLang,includeBookingButton,true)}}/></React.Fragment>)}
                      {includeBookingButton && arrangingBooking && <div onDragOver={event => {event.preventDefault();event.stopPropagation();}} onDrop={event => dropBooking(event,previewBlocks.length)} className="min-h-5 border-t border-dashed border-sky-200 pt-2 text-center text-[10px] text-sky-600"><button type="button" className="underline" onClick={() => setMessageBody(previous => moveBookingToken(previous,previewBlocks.length))}>{t("Move booking button to the end", "Mover botão para o fim")}</button></div>}
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Paperclip size={13} />
                          <span>{t("Official Attachments Transmitted with Letter:", "Documentos Oficiais Anexados:")}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((att, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-800 shadow-2xs"
                            >
                              {att.type.includes("pdf") ? (
                                <FileText size={12} className="text-rose-600" />
                              ) : (
                                <ImageIcon size={12} className="text-sky-600" />
                              )}
                              <span>{att.name}</span>
                              <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Official Sign-off block */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs text-slate-600">
                      <div>
                        <span className="block">{emailLang === "en" ? "Kind regards," : "Com os melhores cumprimentos,"}</span>
                        <span className="font-bold text-slate-900 block mt-1">
                          {emailLang === "en" ? "Recruitment team" : "Equipa de Recrutamento"}
                        </span>
                        <span className="font-semibold text-slate-700 block">Overwatch Moçambique, Lda.</span>
                      </div>

                      <div className="text-left sm:text-right text-[11px] text-slate-500 font-mono">
                        <span>Av. Paulo Samuel Kankhomba, 1948</span>
                        <span className="block">Maputo, Moçambique</span>
                        <span className="block text-slate-700 font-semibold">info@overwatchmoz.com</span>
                      </div>
                    </div>
                  </div>

                  {/* Security & Confidentiality Footer */}
                  <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>{emailLang === "en" ? "Official Confidential Communication · Overwatch Moçambique" : "Comunicação Oficial Confidencial · Overwatch Moçambique"}</span>

                  </div>
                </div>
              </div>
            </div>

          {/* DISPATCH CONTROLS & TEST EMAIL STRIP */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            {/* Quick Test Send Area */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  {t("Test Email Preview:", "Testar no Email:")}
                </span>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  id="studio-test-email"
                  name="testEmail"
                  autoComplete="email"
                  placeholder="admin@overwatchmoz.com"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900"
                />
              </div>

              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTest}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
                <span>{t("Send Live Proof", "Enviar Teste de Prova")}</span>
              </button>
            </div>

            {/* Test Notification Banner */}
            {testNotification && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testNotification.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {testNotification.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{testNotification.text}</span>
              </div>
            )}

            {/* BIG PRIMARY DISPATCH BROADCAST BUTTON */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{targetCandidates.length}</span>{" "}
                {t("candidates selected in target audience", "candidatos seleccionados no grupo alvo")}
                {attachments.length > 0 && ` · ${attachments.length} ${t("attachment(s)", "anexo(s)")}`}
              </div>

              <button
                type="button"
                disabled={!draft.ready || isDispatching || targetCandidates.length === 0 || !subject.trim() || !messageBody.trim()}
                onClick={() => setConfirmDispatchOpen(true)}
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Send size={15} />
                <span>
                  {t(
                    `Dispatch Official Letter to ${targetCandidates.length} Recipients`,
                    `Despachar Minuta Oficial para ${targetCandidates.length} Candidatos`
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM OFFICIAL BROADCAST DISPATCH */}
      {/* ========================================================================= */}
      {confirmDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t("Confirm Official Letterhead Dispatch", "Confirmar Despacho Oficial")}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("Verify audience and attachments before transmitting", "Confirme os destinatários e anexos")}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("Target Audience:", "Destinatários:")}</span>
                <span className="font-bold text-slate-900">{letterheadRecipientDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("Total Recipients:", "Total de Candidatos:")}</span>
                <span className="font-mono font-bold text-sky-700">{targetCandidates.length}</span>
              </div>
              {fixedRecipient && <p className="break-all font-semibold text-slate-800">{fixedRecipient.email}</p>}
              <div className="flex justify-between">
                <span className="text-slate-500">{t("Subject:", "Assunto:")}</span>
                <span className="font-semibold text-slate-800 truncate max-w-xs">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("Attachments:", "Anexos:")}</span>
                <span className="font-mono text-slate-800">
                  {attachments.length > 0
                    ? attachments.map((a) => a.name).join(", ")
                    : t("None", "Nenhum")}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                "This action will generate official branded emails with the specified letterhead and dispatch them to the selected candidates. A confirmation will be recorded in the candidate audit timeline.",
                "Esta ação enviará a minuta oficial personalizada com o papel timbrado Overwatch para todos os candidatos selecionados. O histórico ficará registado na ficha de cada candidato."
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDispatchOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleExecuteBroadcast}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                {t("Confirm & Dispatch Now", "Confirmar & Despachar Agora")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAVE AS NEW REUSABLE TEMPLATE */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* CUSTOM RSVP BUTTON CREATOR MODAL */}
      {/* ========================================================================= */}
      {customRsvpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-sky-600" />
                  <span>{t("Create Custom RSVP Button", "Criar Botão RSVP Personalizado")}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    "Insert personalized action buttons that automatically record candidate choices in their profile.",
                    "Insira botões de ação que registam automaticamente a escolha do candidato no seu perfil."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomRsvpModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Field 1: Button Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t("Button Label / Wording *", "Texto do Botão *")}
              </label>
              <input
                type="text"
                value={customRsvpLabel}
                onChange={(e) => setCustomRsvpLabel(e.target.value)}
                placeholder={t("e.g. Confirm Presence, Confirmar Entrevista, Accept Training Terms", "Ex: Confirmar Presença, Confirmar Entrevista, Aceitar Formação")}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-slate-400 self-center mr-1">{t("Suggestions:", "Sugestões:")}</span>
                {[
                  { label: t("Confirm Presence", "Confirmar Presença"), action: "confirm" as const, style: "emerald" as const },
                  { label: t("Confirm In-Person Interview", "Confirmar Entrevista Presencial"), action: "confirm" as const, style: "navy" as const },
                  { label: t("Accept Training Terms", "Aceitar Termos da Formação"), action: "confirm" as const, style: "navy" as const },
                  { label: t("Decline / Reschedule", "Declinar / Outro Horário"), action: "decline" as const, style: "outline" as const },
                  { label: t("Review Details in Portal", "Ver Detalhes no Portal"), action: "portal" as const, style: "navy" as const },
                ].map((sug) => (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => {
                      setCustomRsvpLabel(sug.label);
                      setCustomRsvpAction(sug.action);
                      setCustomRsvpStyle(sug.style);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Response Category / Ação Registada */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t("Candidate Action / Category", "Ação Registada / Categoria")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "confirm" as const,
                    title: t("Accept / Confirm", "Confirmar / Aceitar"),
                    desc: t("Marks as Confirmed", "Marca como Confirmado"),
                    color: "border-emerald-300 bg-emerald-50 text-emerald-900",
                  },
                  {
                    id: "decline" as const,
                    title: t("Decline", "Declinar / Recusar"),
                    desc: t("Marks as Declined", "Marca como Recusado"),
                    color: "border-rose-300 bg-rose-50 text-rose-900",
                  },
                  {
                    id: "portal" as const,
                    title: t("Portal Review", "Apenas Portal"),
                    desc: t("Opens Decision Portal", "Abre Portal de Revisão"),
                    color: "border-sky-300 bg-sky-50 text-sky-900",
                  },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setCustomRsvpAction(act.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      customRsvpAction === act.id ? act.color + " ring-2 ring-offset-1 ring-sky-500 font-semibold" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">{act.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Button Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t("Button Style", "Estilo Visual do Botão")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "navy" as const, label: t("Overwatch Navy", "Overwatch Navy"), preview: "bg-[#0b1329] text-white" },
                  { id: "emerald" as const, label: t("Emerald Green", "Verde Esmeralda"), preview: "bg-[#059669] text-white" },
                  { id: "outline" as const, label: t("Subtle Outline", "Contorno Discreto"), preview: "bg-white text-slate-800 border border-slate-300" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCustomRsvpStyle(st.id)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      customRsvpStyle === st.id ? "border-sky-500 ring-2 ring-offset-1 ring-sky-500 font-bold bg-sky-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="text-xs">{st.label}</div>
                    <div className={`mt-1.5 mx-auto px-2 py-0.5 rounded text-[10px] w-fit ${st.preview}`}>
                      Preview
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("Live Candidate View Preview:", "Pré-visualização do Candidato:")}
              </span>
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-center min-h-[50px]">
                <span
                  style={{
                    display: "inline-block",
                    backgroundColor: customRsvpStyle === "emerald" ? "#059669" : customRsvpStyle === "navy" ? "#0b1329" : "#ffffff",
                    color: customRsvpStyle === "outline" ? "#334155" : "#ffffff",
                    border: customRsvpStyle === "outline" ? "1px solid #cbd5e1" : "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  {customRsvpLabel.trim() || t("Button Label", "Texto do Botão")}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {t(
                  "When the candidate clicks this in their email, /api/careers/next-phase/respond logs their choice with this exact label and updates their recruitment status.",
                  "Quando o candidato clicar no email, o sistema regista a escolha com este texto e atualiza o estado no processo de recrutamento."
                )}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomRsvpModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={!customRsvpLabel.trim()}
                onClick={() => {
                  insertCustomRsvpButton(customRsvpLabel.trim(), customRsvpAction, customRsvpStyle);
                  setCustomRsvpModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-sky-600 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {t("Insert into Email", "Inserir no Email")}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus size={16} className="text-slate-600" />
                <span>{t("Save as New Template", "Guardar como Novo Modelo")}</span>
              </h3>
              <button
                onClick={() => setSaveTemplateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                {t("Template Name / Title *", "Nome / Título do Modelo *")}
              </label>
              <input
                type="text"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder={t("e.g. Technical Interview Schedule", "Ex: Convocatória para Prova Técnica")}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">{t("Subject:", "Assunto:")}</span>
              <span className="block font-semibold text-slate-800">{subject || t("Untitled", "Sem Assunto")}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSaveTemplateModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                {t("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={!newTemplateTitle.trim() || savingTemplate}
                onClick={saveCustomTemplate}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {t("Save Template", "Guardar Modelo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: DELIVERY & ACTIVITY AUDIT LOGS */}
      {/* ========================================================================= */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-slate-600" />
                  <span>{t("Communications Audit History", "Histórico de Auditoria de Envios")}</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {allLogs.length} {t("dispatches recorded", "registos de envio")}
                </span>
              </div>
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Search Filter */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={t("Filter by candidate name, email, or subject...", "Filtrar por nome, email ou assunto...")}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {t("No communication records found.", "Nenhum registo de envio encontrado.")}
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">{log.candidateName}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(log.sentAt).toLocaleDateString(lang === "en" ? "en-US" : "pt-PT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 font-semibold truncate">
                      {log.subject}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-mono truncate">{log.recipient}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold uppercase">
                        {t("DELIVERED", "ENTREGUE")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationsView;
