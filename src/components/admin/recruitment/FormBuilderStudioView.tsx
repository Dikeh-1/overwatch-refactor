"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Briefcase,
  ShieldCheck,
  FileText,
  Smartphone,
  Monitor,
  ExternalLink,
  X,
  ListFilter,
  Save,
  HelpCircle,
  Copy,
  Info,
} from "lucide-react";
import type { CareerRoleDefinition, CareerCohort, ScreeningRule } from "@/lib/careers-models";
import { DEFAULT_SCREENING_RULES_BY_ROLE } from "@/lib/careers-models";
import { Application, roles as defaultRoles } from "@/lib/careers";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { useActiveRole } from "../shell/ActiveRoleContext";
import Logo from "@/components/ui/Logo";

interface FormBuilderStudioViewProps {
  initialRoles: CareerRoleDefinition[];
  cohorts: CareerCohort[];
  applications: Application[];
  onSaveRole: (role: CareerRoleDefinition) => Promise<void>;
  onRefresh: () => Promise<void>;
}

// Preset screening questions library
const PRESET_SCREENING_QUESTIONS: Array<{
  key: string;
  labelPt: string;
  labelEn: string;
  instructionPt: string;
  instructionEn: string;
  group: string;
  type: "boolean" | "number" | "string";
  mandatory: boolean;
  expectedValue: any;
}> = [
  {
    key: "yearsCctvExperience",
    labelPt: "Experiência Prática em CCTV (mínimo 1 ano)",
    labelEn: "Hands-on CCTV Experience (min 1 year)",
    instructionPt: "Quantos anos de experiência prática comprovada possui na instalação e manutenção de sistemas CCTV?",
    instructionEn: "How many years of proven hands-on experience do you have in CCTV installation and maintenance?",
    group: "CCTV & Engenharia Técnica",
    type: "number",
    mandatory: true,
    expectedValue: 1,
  },
  {
    key: "ipCctv",
    labelPt: "Sistemas CCTV IP e Protocolos Digitais",
    labelEn: "IP CCTV Systems & Network Protocols",
    instructionPt: "Possui experiência prática comprovada em câmaras IP, endereçamento de rede e protocolos ONVIF/RTSP?",
    instructionEn: "Do you have proven practical experience with IP cameras, network addressing and ONVIF/RTSP protocols?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "nvrDvr",
    labelPt: "Configuração de NVRs/DVRs e Armazenamento",
    labelEn: "NVR/DVR Setup & Storage Sizing",
    instructionPt: "Sabe dimensionar armazenamento RAID e configurar NVRs e DVRs multi-canal?",
    instructionEn: "Can you size RAID storage and configure multi-channel NVRs and DVRs?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "networking",
    labelPt: "Redes IP (Switches, VLANs, Routers)",
    labelEn: "IP Networking (Switches, VLANs, Routers)",
    instructionPt: "Tem domínio prático de configuração de switches geridos, criação de VLANs de segurança e routers?",
    instructionEn: "Are you proficient in configuring managed switches, creating security VLANs, and routers?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "grade12",
    labelPt: "Conclusão da 12.ª Classe",
    labelEn: "Grade 12 High School Completion",
    instructionPt: "Tem a 12ª Classe concluída com certificado escolar comprovativo?",
    instructionEn: "Have you completed Grade 12 with a valid completion certificate?",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "shifts",
    labelPt: "Disponibilidade para Escala de Turnos 12h (2D/2N/2F)",
    labelEn: "Shift Schedule Availability 12h (2D/2N/2O)",
    instructionPt: "Tem disponibilidade total para cumprir escala rotativa contínua de 12 horas (2 Dias, 2 Noites, 2 Folgas)?",
    instructionEn: "Are you fully available for continuous 12-hour rotating shifts (2 Days, 2 Nights, 2 Off)?",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "aiAnalytics",
    labelPt: "Analítica Perimetral e Câmaras com IA",
    labelEn: "AI Video Analytics & Perimeter Rules",
    instructionPt: "Já configurou regras analíticas de vídeo inteligente (Tripwire, Linha Virtual, Detecção Humano/Veículo)?",
    instructionEn: "Have you configured smart video analytics rules (Tripwire, Intrusion Zone, Human/Vehicle Detection)?",
    group: "Tecnologia & IA",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "drivingLicence",
    labelPt: "Carta de Condução Válida",
    labelEn: "Valid Driving Licence",
    instructionPt: "Possui carta de condução válida e disponibilidade para conduzir viaturas técnicas da empresa?",
    instructionEn: "Do you have a valid driving licence and willingness to drive company technical vehicles?",
    group: "Operações de Campo",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "dahua",
    labelPt: "Plataformas Dahua (DSS, SmartPSS)",
    labelEn: "Dahua Platforms (DSS, SmartPSS)",
    instructionPt: "Possui experiência prática na instalação e configuração de plataformas Dahua (SmartPSS, DSS Express)?",
    instructionEn: "Do you have practical experience configuring Dahua platforms (SmartPSS, DSS Express)?",
    group: "Fabricantes & Ecossistemas",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "hikvision",
    labelPt: "Ecossistema Hikvision (iVMS, AcuSense)",
    labelEn: "Hikvision Ecosystem (iVMS, AcuSense)",
    instructionPt: "Possui experiência com o ecossistema Hikvision, iVMS-4200, Hik-Connect ou câmaras AcuSense / ColorVu?",
    instructionEn: "Do you have experience with Hikvision ecosystem, iVMS-4200, Hik-Connect, or AcuSense / ColorVu cameras?",
    group: "Fabricantes & Ecossistemas",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
];

export const FormBuilderStudioView: React.FC<FormBuilderStudioViewProps> = ({
  initialRoles,
  cohorts,
  applications,
  onSaveRole,
  onRefresh,
}) => {
  const { lang: adminLang } = useAdminLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlRole = searchParams.get("role");

  const { activeRoleId, setActiveRoleId } = useActiveRole();

  const allRoles: CareerRoleDefinition[] = useMemo(() => {
    if (initialRoles && initialRoles.length > 0) return initialRoles;
    return defaultRoles.map((dr) => ({
      id: dr.id,
      pt: dr.pt,
      en: dr.en,
      department: dr.id.includes("manager") ? "Technical Engineering" : "Security Operations",
      descriptionEn: "",
      descriptionPt: "",
      open: true,
      activeCohortId: null,
      pipelineStages: ["applications", "screening", "interview", "hired"],
      screeningRules: DEFAULT_SCREENING_RULES_BY_ROLE[dr.id] || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }, [initialRoles]);

  // Selected Role ID
  const selectedRoleId = useMemo(() => {
    if (urlRole && allRoles.some((r) => r.id === urlRole)) return urlRole;
    if (activeRoleId && allRoles.some((r) => r.id === activeRoleId)) return activeRoleId;
    return allRoles[0]?.id || "cctv_technical_manager";
  }, [urlRole, activeRoleId, allRoles]);

  const currentRole = useMemo(() => {
    return allRoles.find((r) => r.id === selectedRoleId) || allRoles[0];
  }, [allRoles, selectedRoleId]);

  // Working Screening Rules State for the currently selected role
  const [workingRules, setWorkingRules] = useState<ScreeningRule[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Preview Settings
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewLang, setPreviewLang] = useState<"en" | "pt">(adminLang);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  // Add / Edit Question Modal State
  const [modalMode, setModalMode] = useState<"none" | "add" | "edit" | "presets">("none");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Question Form Fields
  const [qField, setQField] = useState("");
  const [qLabelPt, setQLabelPt] = useState("");
  const [qLabelEn, setQLabelEn] = useState("");
  const [qInstructionPt, setQInstructionPt] = useState("");
  const [qInstructionEn, setQInstructionEn] = useState("");
  const [qEvaluatorGuideline, setQEvaluatorGuideline] = useState("");
  const [qType, setQType] = useState<"boolean" | "number" | "string">("boolean");
  const [qMandatory, setQMandatory] = useState(true);
  const [qExpectedValue, setQExpectedValue] = useState("yes");

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync working rules whenever role changes
  useEffect(() => {
    if (currentRole) {
      const initialRules =
        currentRole.screeningRules && currentRole.screeningRules.length > 0
          ? currentRole.screeningRules
          : DEFAULT_SCREENING_RULES_BY_ROLE[currentRole.id] || [];
      setWorkingRules(initialRules);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg("");
      setSaveErrorMsg("");
    }
  }, [currentRole]);

  // Sync preview language with admin language when admin language changes
  useEffect(() => {
    setPreviewLang(adminLang);
  }, [adminLang]);

  // Switch role handler
  const handleSelectRole = (newRoleId: string) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        adminLang === "en"
          ? "You have unsaved changes in the form builder. Discard and switch role?"
          : "Tem alterações não gravadas no formulário. Deseja descartar e mudar de vaga?"
      );
      if (!confirmLeave) return;
    }
    setActiveRoleId(newRoleId);
    router.push(`/admin/recruitment/form-builder?role=${newRoleId}`);
  };

  // Reorder Rules
  const handleMoveRule = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workingRules.length) return;
    const newRules = [...workingRules];
    const [moved] = newRules.splice(index, 1);
    newRules.splice(targetIndex, 0, moved);
    setWorkingRules(newRules);
    setHasUnsavedChanges(true);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newRules = [...workingRules];
    const [moved] = newRules.splice(draggedIndex, 1);
    newRules.splice(targetIndex, 0, moved);
    setWorkingRules(newRules);
    setDraggedIndex(null);
    setHasUnsavedChanges(true);
  };

  // Toggle Mandatory / Knockout
  const handleToggleMandatory = (ruleId: string) => {
    setWorkingRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              mandatory: !r.mandatory,
              weight: !r.mandatory ? undefined : 1,
            }
          : r
      )
    );
    setHasUnsavedChanges(true);
  };

  // Delete Rule
  const handleDeleteRule = (ruleId: string) => {
    setWorkingRules((prev) => prev.filter((r) => r.id !== ruleId));
    setHasUnsavedChanges(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rule: ScreeningRule) => {
    setEditingRuleId(rule.id);
    setQField(rule.field);
    setQLabelPt(rule.labelPt);
    setQLabelEn(rule.labelEn || rule.labelPt);
    setQInstructionPt(rule.instructionPt || "");
    setQInstructionEn(rule.instructionEn || "");
    setQEvaluatorGuideline(rule.evaluatorGuideline || "");
    setQType(rule.type);
    setQMandatory(rule.mandatory);
    setQExpectedValue(String(rule.expectedValue ?? "yes"));
    setModalMode("edit");
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingRuleId(null);
    setQField("");
    setQLabelPt("");
    setQLabelEn("");
    setQInstructionPt("");
    setQInstructionEn("");
    setQEvaluatorGuideline("");
    setQType("boolean");
    setQMandatory(true);
    setQExpectedValue("yes");
    setModalMode("add");
  };

  // Auto-generate field slug from label
  const handleLabelPtChange = (val: string) => {
    setQLabelPt(val);
    if (!qField || modalMode === "add") {
      const slug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32);
      if (slug) setQField(slug);
    }
  };

  // Save Modal question
  const handleSaveQuestionModal = () => {
    if (!qLabelPt.trim() && !qLabelEn.trim()) {
      alert(
        adminLang === "en"
          ? "Please provide at least a title for the question."
          : "Por favor, indique pelo menos um título para a pergunta."
      );
      return;
    }

    const fieldKey =
      qField.trim() ||
      (qLabelEn || qLabelPt)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 24);

    let parsedExpected: any = qExpectedValue;
    if (qType === "number") {
      parsedExpected = Number(qExpectedValue) || 1;
    } else if (qType === "boolean") {
      parsedExpected = qExpectedValue === "no" ? "no" : "yes";
    }

    const newRule: ScreeningRule = {
      id: editingRuleId || `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      field: fieldKey,
      labelPt: qLabelPt.trim() || qLabelEn.trim(),
      labelEn: qLabelEn.trim() || qLabelPt.trim(),
      instructionPt: qInstructionPt.trim() || undefined,
      instructionEn: qInstructionEn.trim() || undefined,
      evaluatorGuideline: qEvaluatorGuideline.trim() || undefined,
      type: qType,
      mandatory: qMandatory,
      expectedValue: parsedExpected,
      weight: qMandatory ? undefined : 1,
    };

    if (modalMode === "edit" && editingRuleId) {
      setWorkingRules((prev) =>
        prev.map((r) => (r.id === editingRuleId ? newRule : r))
      );
    } else {
      setWorkingRules((prev) => [...prev, newRule]);
    }

    setModalMode("none");
    setHasUnsavedChanges(true);
  };

  // Add from Preset
  const handleAddPreset = (preset: typeof PRESET_SCREENING_QUESTIONS[0]) => {
    const newRule: ScreeningRule = {
      id: `preset_${Date.now()}_${preset.key}`,
      field: preset.key,
      labelPt: preset.labelPt,
      labelEn: preset.labelEn,
      instructionPt: preset.instructionPt,
      instructionEn: preset.instructionEn,
      type: preset.type,
      mandatory: preset.mandatory,
      expectedValue: preset.expectedValue,
      weight: preset.mandatory ? undefined : 1,
    };
    setWorkingRules((prev) => [...prev, newRule]);
    setHasUnsavedChanges(true);
    setModalMode("none");
  };

  // Reset to default rules for this role
  const handleResetToDefaults = () => {
    const confirmReset = window.confirm(
      adminLang === "en"
        ? "Reset screening rules to default templates for this role?"
        : "Repor as regras de triagem para os valores padrão desta vaga?"
    );
    if (!confirmReset) return;

    const defaults =
      DEFAULT_SCREENING_RULES_BY_ROLE[currentRole.id] ||
      DEFAULT_SCREENING_RULES_BY_ROLE[currentRole.id.replace("_operator", "")] ||
      [];
    setWorkingRules(defaults);
    setHasUnsavedChanges(true);
  };

  // Save to Backend
  const handleSaveAll = async () => {
    if (!currentRole) return;
    setIsSaving(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const updatedRole: CareerRoleDefinition = {
      ...currentRole,
      screeningRules: workingRules,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveRole(updatedRole);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(
        adminLang === "en"
          ? "Form & screening questions successfully saved!"
          : "Formulário e regras de triagem gravadas com sucesso!"
      );
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err: any) {
      setSaveErrorMsg(
        err.message ||
          (adminLang === "en"
            ? "Failed to save form configuration."
            : "Falha ao gravar configurações do formulário.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Title strings
  const roleTitleAdmin =
    adminLang === "en"
      ? currentRole?.en || currentRole?.pt
      : currentRole?.pt || currentRole?.en;

  const roleTitlePreview =
    previewLang === "en"
      ? currentRole?.en || currentRole?.pt
      : currentRole?.pt || currentRole?.en;

  const roleDescPreview =
    previewLang === "en"
      ? currentRole?.descriptionEn || currentRole?.descriptionPt || "Submit your application and complete the screening qualifications below."
      : currentRole?.descriptionPt || currentRole?.descriptionEn || "Submeta a sua candidatura e responda às perguntas de qualificação abaixo.";

  const activeCohort = cohorts.find((c) => c.id === currentRole?.activeCohortId);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP STUDIO HEADER (Patterned after Communications Studio)
         ========================================================================= */}
      <div className="bg-[#0a1128] rounded-2xl p-6 text-white border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {adminLang === "en" ? "Form Builder Studio" : "Estúdio de Formulário"}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-xs text-white/70 font-mono">
                {currentRole?.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <SlidersHorizontal className="text-amber-400" size={24} />
              <span>
                {adminLang === "en"
                  ? "Public Application Form & Screening Studio"
                  : "Estúdio de Formulário & Triagem de Candidaturas"}
              </span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              {adminLang === "en"
                ? "Configure candidate identity inputs, drag-and-drop screening questions, and preview the live public application form in English and Portuguese."
                : "Configure campos de identificação civil, arraste e solte perguntas de triagem e visualize o formulário público em tempo real."}
            </p>
          </div>

          {/* Role Selector & Save Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Unsaved indicator */}
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{adminLang === "en" ? "Unsaved Changes" : "Não Gravado"}</span>
              </span>
            )}

            {saveSuccessMsg && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>{saveSuccessMsg}</span>
              </span>
            )}

            {saveErrorMsg && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                <AlertCircle size={14} />
                <span>{saveErrorMsg}</span>
              </span>
            )}

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={adminLang === "en" ? "Reset to role default rules" : "Repor regras padrão"}
            >
              <RefreshCw size={13} className="text-slate-400" />
              <span>{adminLang === "en" ? "Defaults" : "Padrões"}</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              disabled={isSaving || !hasUnsavedChanges}
              onClick={handleSaveAll}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                hasUnsavedChanges
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
                  : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-slate-900" />
                  <span>{adminLang === "en" ? "Saving..." : "A gravar..."}</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{adminLang === "en" ? "Save Form Configuration" : "Gravar Formulário"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Role Workspace Bar */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 font-semibold">
              {adminLang === "en" ? "Selected Role Workspace:" : "Vaga em Edição:"}
            </span>

            {/* Role Switcher Select */}
            <div className="relative">
              <select
                value={selectedRoleId}
                onChange={(e) => handleSelectRole(e.target.value)}
                className="appearance-none bg-[#111c3d] text-white font-bold text-xs pl-3 pr-8 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {allRoles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0a1128] text-white">
                    {adminLang === "en" ? r.en || r.pt : r.pt || r.en} ({r.id})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60"
              />
            </div>

            {/* Role Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                currentRole?.open
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-700/50 text-slate-300 border border-slate-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentRole?.open ? "bg-emerald-400" : "bg-slate-400"
                }`}
              />
              <span>
                {currentRole?.open
                  ? adminLang === "en"
                    ? "Open for Applications"
                    : "Aberta para Candidaturas"
                  : adminLang === "en"
                  ? "Closed / Archived"
                  : "Encerrada / Arquivada"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/careers?role=${currentRole?.id}`}
              target="_blank"
              className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1 font-semibold transition-colors"
            >
              <span>{adminLang === "en" ? "Open Public Careers URL" : "Ver Página Pública"}</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN TWO-COLUMN STUDIO LAYOUT
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =======================================================================
            LEFT COLUMN (7 cols): FORM QUESTIONS BUILDER & QUALIFICATION LOGIC
           ======================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Core Standard Candidate Identity Fields */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-sky-600" />
                  <span>
                    {adminLang === "en"
                      ? "Standard Core Candidate Fields (Fixed)"
                      : "Campos Fixos de Identificação Civil"}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {adminLang === "en"
                    ? "Standardized across all Overwatch careers. Always collected before qualification questions."
                    : "Campos padrão obrigatórios em todas as candidaturas da Overwatch."}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                5 {adminLang === "en" ? "Fields" : "Campos"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: "name",
                  label: adminLang === "en" ? "Full Legal Name" : "Nome Completo",
                  type: adminLang === "en" ? "Text • Mandatory" : "Texto • Obrigatório",
                  hint: adminLang === "en" ? "Official ID verification" : "Identificação civil",
                },
                {
                  id: "email",
                  label: adminLang === "en" ? "Email Address" : "Email de Contacto",
                  type: adminLang === "en" ? "Email • Mandatory" : "Email • Obrigatório",
                  hint: adminLang === "en" ? "Official notifications" : "Convocatórias oficiais",
                },
                {
                  id: "phone",
                  label: adminLang === "en" ? "Phone / WhatsApp" : "Telefone / WhatsApp",
                  type: adminLang === "en" ? "Tel • Mandatory" : "Contacto • Obrigatório",
                  hint: adminLang === "en" ? "Direct recruiter SMS & calls" : "Contacto operacional",
                },
                {
                  id: "location",
                  label: adminLang === "en" ? "City & Province" : "Cidade & Província",
                  type: adminLang === "en" ? "Text • Mandatory" : "Texto • Obrigatório",
                  hint: adminLang === "en" ? "Geographic proximity check" : "Residência geográfica",
                },
                {
                  id: "cv",
                  label: adminLang === "en" ? "Curriculum Vitae (CV)" : "Curriculum Vitae (CV)",
                  type: adminLang === "en" ? "PDF / Word • Mandatory" : "Ficheiro • Obrigatório",
                  hint: adminLang === "en" ? "Professional credential proof" : "Comprovativo profissional",
                  colSpan: true,
                },
              ].map((f) => (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between ${
                    f.colSpan ? "sm:col-span-2" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{f.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({f.hint})</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {f.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Dynamic Role Screening Questions (Drag and Drop & Reorder) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ListFilter size={16} className="text-amber-500" />
                  <span>
                    {adminLang === "en"
                      ? "Screening & Qualification Questions"
                      : "Perguntas de Triagem & Qualificação"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {workingRules.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {adminLang === "en"
                    ? "Drag or use arrows to reorder questions. Toggle Mandatory Knockout to auto-reject non-qualifying applicants."
                    : "Arraste ou use as setas para reordenar. Defina critérios eliminatórios para triagem automática."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode("presets")}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={13} className="text-slate-500" />
                  <span>{adminLang === "en" ? "Library Presets" : "Modelos Prontos"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0a1128] hover:bg-[#121c3d] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{adminLang === "en" ? "Add Question" : "Nova Pergunta"}</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {workingRules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700">
                    {adminLang === "en"
                      ? "No qualification questions configured"
                      : "Nenhuma pergunta configurada"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    {adminLang === "en"
                      ? "Add custom questions or choose from the Overwatch question presets."
                      : "Adicione perguntas personalizadas ou use os modelos prontos da Overwatch."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalMode("presets")}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {adminLang === "en" ? "Add from Library" : "Adicionar da Biblioteca"}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-3 py-1.5 rounded-lg bg-[#0a1128] text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    {adminLang === "en" ? "+ Create Custom" : "+ Criar Pergunta"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {workingRules.map((rule, idx) => {
                  const title =
                    adminLang === "en"
                      ? rule.labelEn || rule.labelPt
                      : rule.labelPt || rule.labelEn;

                  const subtitle =
                    adminLang === "en"
                      ? rule.labelPt !== rule.labelEn
                        ? rule.labelPt
                        : null
                      : rule.labelEn !== rule.labelPt
                      ? rule.labelEn
                      : null;

                  return (
                    <div
                      key={rule.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        draggedIndex === idx
                          ? "border-sky-400 bg-sky-50/50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {/* Left: Drag Handle, Reorder Arrows, Question Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Drag Handle & Up/Down Arrows */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveRule(idx, "up")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title={adminLang === "en" ? "Move up" : "Mover para cima"}
                          >
                            <ChevronUp size={13} />
                          </button>

                          <div
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
                            title={adminLang === "en" ? "Drag to reorder" : "Arraste para reordenar"}
                          >
                            <GripVertical size={14} />
                          </div>

                          <button
                            type="button"
                            disabled={idx === workingRules.length - 1}
                            onClick={() => handleMoveRule(idx, "down")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title={adminLang === "en" ? "Move down" : "Mover para baixo"}
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>

                        {/* Question Content */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              Q{idx + 1}
                            </span>
                            <h3 className="text-xs font-bold text-slate-900 leading-tight">
                              {title}
                            </h3>

                            {/* Knockout criteria badge (clickable toggle) */}
                            <button
                              type="button"
                              onClick={() => handleToggleMandatory(rule.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                rule.mandatory
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              }`}
                              title={
                                adminLang === "en"
                                  ? "Click to toggle Knockout / Preferred"
                                  : "Clique para alternar Eliminatório / Bónus"
                              }
                            >
                              {rule.mandatory
                                ? adminLang === "en"
                                  ? "Mandatory Knockout"
                                  : "Critério Eliminatório"
                                : adminLang === "en"
                                ? "Scoring Bonus"
                                : "Pontuação Bónus"}
                            </button>

                            {/* Type Pill */}
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                              {rule.type === "boolean"
                                ? adminLang === "en"
                                  ? "Yes / No"
                                  : "Sim / Não"
                                : rule.type === "number"
                                ? adminLang === "en"
                                  ? "Numeric"
                                  : "Numérico"
                                : adminLang === "en"
                                ? "Text"
                                : "Texto"}
                            </span>
                          </div>

                          {subtitle && (
                            <p className="text-[11px] text-slate-500 italic">
                              {subtitle}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span>field: {rule.field}</span>
                            <span>•</span>
                            <span>
                              {adminLang === "en" ? "expected:" : "esperado:"}{" "}
                              {String(rule.expectedValue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          title={adminLang === "en" ? "Edit question" : "Editar pergunta"}
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={adminLang === "en" ? "Delete question" : "Remover pergunta"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =======================================================================
            RIGHT COLUMN (5 cols): LIVE PUBLIC CAREERS APPLICATION PREVIEW
           ======================================================================= */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            {/* Header: Device view & Preview Language Toggle */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {adminLang === "en" ? "Live Public Form Preview" : "Pré-visualização Pública"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher Toggle */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewLang("en")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      previewLang === "en"
                        ? "bg-[#0a1128] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLang("pt")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      previewLang === "pt"
                        ? "bg-[#0a1128] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    PT
                  </button>
                </div>

                {/* Device viewport toggle */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Language Note Callout */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span>
                {previewLang === "en"
                  ? "Showing English candidate application interface."
                  : "A apresentar formulário em Língua Portuguesa."}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {previewLang.toUpperCase()}
              </span>
            </div>

            {/* PUBLIC FORM CONTAINER (Exact Public Careers Dark Theme Frame) */}
            <div
              className={`mx-auto rounded-2xl border border-slate-800 bg-[#070b14] text-white shadow-2xl overflow-hidden transition-all duration-200 ${
                previewDevice === "mobile" ? "max-w-xs" : "w-full"
              }`}
            >
              {/* Public Form Brand Header */}
              <div className="bg-[#0b1224] p-5 border-b border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
                    OVERWATCH CAREERS
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      currentRole?.open
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-700 text-slate-400 border border-slate-600"
                    }`}
                  >
                    {currentRole?.open
                      ? previewLang === "en"
                        ? "Open"
                        : "Aberta"
                      : previewLang === "en"
                      ? "Closed"
                      : "Encerrada"}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white leading-snug">
                    {roleTitlePreview}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {roleDescPreview}
                  </p>
                </div>
              </div>

              {/* Public Form Fields Preview */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Section 1: Candidate Basic Info */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    {previewLang === "en"
                      ? "1. Candidate Information"
                      : "1. Dados do Candidato"}
                  </span>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1">
                        {previewLang === "en" ? "Full Name" : "Nome Completo"}{" "}
                        <span className="text-rose-400">*</span>
                      </label>
                      <input
                        disabled
                        placeholder={
                          previewLang === "en"
                            ? "e.g. John Doe"
                            : "ex. Inácio António Wilson"
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">
                          {previewLang === "en" ? "Email" : "Email"}{" "}
                          <span className="text-rose-400">*</span>
                        </label>
                        <input
                          disabled
                          placeholder="candidate@domain.com"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">
                          {previewLang === "en"
                            ? "Phone / WhatsApp"
                            : "Telefone / WhatsApp"}{" "}
                          <span className="text-rose-400">*</span>
                        </label>
                        <input
                          disabled
                          placeholder="+258 84 000 0000"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Dynamic Qualification Questions */}
                {workingRules.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                      {previewLang === "en"
                        ? `2. Role Qualifications (${workingRules.length})`
                        : `2. Qualificações da Vaga (${workingRules.length})`}
                    </span>

                    <div className="space-y-3">
                      {workingRules.map((rule, idx) => {
                        const qTitle =
                          previewLang === "en"
                            ? rule.instructionEn || rule.labelEn || rule.labelPt
                            : rule.instructionPt || rule.labelPt || rule.labelEn;

                        const isAnsweredYes = previewAnswers[rule.field] === "yes";
                        const isAnsweredNo = previewAnswers[rule.field] === "no";

                        return (
                          <div
                            key={rule.id}
                            className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2"
                          >
                            <label className="text-xs font-semibold text-white block leading-snug">
                              {idx + 1}. {qTitle}{" "}
                              {rule.mandatory ? (
                                <span className="text-rose-400 font-bold">*</span>
                              ) : (
                                <span className="text-slate-400 font-normal text-[10px]">
                                  {previewLang === "en"
                                    ? "(Preferred)"
                                    : "(Preferencial)"}
                                </span>
                              )}
                            </label>

                            {rule.type === "boolean" ? (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewAnswers((prev) => ({
                                      ...prev,
                                      [rule.field]: "yes",
                                    }))
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isAnsweredYes
                                      ? "bg-emerald-500 text-slate-950 shadow-xs"
                                      : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                                  }`}
                                >
                                  {previewLang === "en" ? "Yes" : "Sim"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewAnswers((prev) => ({
                                      ...prev,
                                      [rule.field]: "no",
                                    }))
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isAnsweredNo
                                      ? "bg-rose-500 text-white shadow-xs"
                                      : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                                  }`}
                                >
                                  {previewLang === "en" ? "No" : "Não"}
                                </button>
                              </div>
                            ) : rule.type === "number" ? (
                              <div className="pt-1">
                                <input
                                  type="number"
                                  placeholder={
                                    previewLang === "en"
                                      ? "Enter numeric value (e.g. 2)..."
                                      : "Indique o valor numérico (ex. 2)..."
                                  }
                                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
                                />
                              </div>
                            ) : (
                              <div className="pt-1">
                                <input
                                  type="text"
                                  placeholder={
                                    previewLang === "en"
                                      ? "Your response..."
                                      : "Sua resposta..."
                                  }
                                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: CV Upload */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <label className="text-[11px] font-semibold text-white/80 block">
                    {previewLang === "en"
                      ? "3. Curriculum Vitae (CV)"
                      : "3. Curriculum Vitae (CV)"}{" "}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="p-4 rounded-xl border border-dashed border-white/20 bg-white/5 text-center text-xs text-slate-400 space-y-1">
                    <FileText size={20} className="mx-auto text-sky-400" />
                    <p>
                      {previewLang === "en"
                        ? "Drag and drop your PDF / Word CV document here"
                        : "Arraste e solte o ficheiro PDF ou Word aqui"}
                    </p>
                  </div>
                </div>

                {/* Section 4: Submit Button */}
                <div className="pt-2">
                  <div className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#070b14] text-xs font-bold text-center shadow-lg transition-colors cursor-pointer">
                    {previewLang === "en"
                      ? "Submit Application →"
                      : "Submeter Candidatura →"}
                  </div>
                  <p className="text-[10px] text-center text-slate-500 mt-2">
                    {previewLang === "en"
                      ? "Submissions are reviewed instantly against qualification rules."
                      : "A sua candidatura será avaliada de acordo com as regras de triagem."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ADD / EDIT QUESTION MODAL
         ========================================================================= */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0a1128] text-white flex items-center justify-center">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalMode === "edit"
                      ? adminLang === "en"
                        ? "Edit Qualification Question"
                        : "Editar Pergunta de Triagem"
                      : adminLang === "en"
                      ? "Add Custom Qualification Question"
                      : "Criar Nova Pergunta de Triagem"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {adminLang === "en"
                      ? "Configure bilingual prompt, field type, and knockout criteria."
                      : "Configure o enunciado bilíngue, tipo de campo e critérios de eliminação."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Question Titles (PT & EN) */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en"
                      ? "Question Title (Portuguese)"
                      : "Título da Pergunta (Português)"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={qLabelPt}
                    onChange={(e) => handleLabelPtChange(e.target.value)}
                    placeholder="ex. Experiência Prática em CCTV (mínimo 1 ano)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en"
                      ? "Question Title (English)"
                      : "Título da Pergunta (Inglês)"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={qLabelEn}
                    onChange={(e) => setQLabelEn(e.target.value)}
                    placeholder="e.g. Hands-on CCTV Experience (min 1 year)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  />
                </div>
              </div>

              {/* Detailed Candidate Instruction (Optional) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {adminLang === "en"
                      ? "Candidate Instruction Prompt (Portuguese)"
                      : "Instrução ao Candidato no Formulário (Português)"}
                  </label>
                  <textarea
                    rows={2}
                    value={qInstructionPt}
                    onChange={(e) => setQInstructionPt(e.target.value)}
                    placeholder="ex. Quantos anos de experiência prática comprovada possui na instalação de CCTV?"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {adminLang === "en"
                      ? "Candidate Instruction Prompt (English)"
                      : "Instrução ao Candidato no Formulário (Inglês)"}
                  </label>
                  <textarea
                    rows={2}
                    value={qInstructionEn}
                    onChange={(e) => setQInstructionEn(e.target.value)}
                    placeholder="e.g. How many years of proven hands-on experience do you have in CCTV installation?"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  />
                </div>
              </div>

              {/* Type, Field, Mandatory, Expected Value */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en" ? "Response Type" : "Tipo de Resposta"}
                  </label>
                  <select
                    value={qType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setQType(t);
                      if (t === "boolean") setQExpectedValue("yes");
                      if (t === "number") setQExpectedValue("1");
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  >
                    <option value="boolean">
                      {adminLang === "en" ? "Yes / No Choice (Boolean)" : "Opção Sim / Não"}
                    </option>
                    <option value="number">
                      {adminLang === "en" ? "Numeric / Years (Number)" : "Valor Numérico / Anos"}
                    </option>
                    <option value="string">
                      {adminLang === "en" ? "Custom Text (String)" : "Texto Livre"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en" ? "Field Key Identifier" : "Identificador do Campo"}
                  </label>
                  <input
                    type="text"
                    value={qField}
                    onChange={(e) => setQField(e.target.value)}
                    placeholder="e.g. cctv_experience"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0a1128]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en" ? "Knockout Criteria" : "Critério de Avaliação"}
                  </label>
                  <select
                    value={qMandatory ? "mandatory" : "preferred"}
                    onChange={(e) => setQMandatory(e.target.value === "mandatory")}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                  >
                    <option value="mandatory">
                      {adminLang === "en"
                        ? "Mandatory Knockout (Pass/Fail)"
                        : "Eliminatório (Aprova / Reprova)"}
                    </option>
                    <option value="preferred">
                      {adminLang === "en"
                        ? "Preferred (Scoring Bonus)"
                        : "Preferencial (Pontuação Bónus)"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {adminLang === "en" ? "Expected Value to Pass" : "Valor Esperado para Aprovar"}
                  </label>
                  {qType === "boolean" ? (
                    <select
                      value={qExpectedValue}
                      onChange={(e) => setQExpectedValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                    >
                      <option value="yes">{adminLang === "en" ? "Yes (Must answer Yes)" : "Sim (Exige resposta Sim)"}</option>
                      <option value="no">{adminLang === "en" ? "No (Must answer No)" : "Não (Exige resposta Não)"}</option>
                    </select>
                  ) : qType === "number" ? (
                    <input
                      type="number"
                      value={qExpectedValue}
                      onChange={(e) => setQExpectedValue(e.target.value)}
                      placeholder="e.g. 1 (minimum threshold)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={qExpectedValue}
                      onChange={(e) => setQExpectedValue(e.target.value)}
                      placeholder="e.g. required keyword"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a1128]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {adminLang === "en" ? "Cancel" : "Cancelar"}
              </button>

              <button
                type="button"
                onClick={handleSaveQuestionModal}
                className="px-5 py-2 rounded-xl bg-[#0a1128] hover:bg-[#121c3d] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                {modalMode === "edit"
                  ? adminLang === "en"
                    ? "Update Question"
                    : "Guardar Alterações"
                  : adminLang === "en"
                  ? "Add Question to Form"
                  : "Adicionar ao Formulário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRESET QUESTIONS LIBRARY MODAL
         ========================================================================= */}
      {modalMode === "presets" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Copy size={16} className="text-sky-600" />
                  <span>
                    {adminLang === "en"
                      ? "Overwatch Screening Question Presets"
                      : "Biblioteca de Perguntas Predefinidas"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {adminLang === "en"
                    ? "Select a pre-configured screening criteria to add directly into this role's application form."
                    : "Selecione uma pergunta pronta para adicionar diretamente ao formulário desta vaga."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {PRESET_SCREENING_QUESTIONS.map((preset) => {
                const isAlreadyAdded = workingRules.some(
                  (r) => r.field === preset.key
                );

                return (
                  <div
                    key={preset.key}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {preset.group}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {adminLang === "en" ? preset.labelEn : preset.labelPt}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {adminLang === "en"
                          ? preset.instructionEn
                          : preset.instructionPt}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => handleAddPreset(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                        isAlreadyAdded
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-[#0a1128] hover:bg-[#121c3d] text-white shadow-2xs"
                      }`}
                    >
                      {isAlreadyAdded
                        ? adminLang === "en"
                          ? "Already Added"
                          : "Já Adicionado"
                        : adminLang === "en"
                        ? "+ Add"
                        : "+ Adicionar"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {adminLang === "en" ? "Close" : "Fechar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
