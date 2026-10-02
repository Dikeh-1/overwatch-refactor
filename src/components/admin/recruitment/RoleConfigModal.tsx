"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Layers,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";
import type {
  CareerRoleDefinition,
  PipelineStageKey,
  ScreeningRule,
} from "@/lib/careers-models";
import { ALL_PIPELINE_STAGES, DEFAULT_SCREENING_RULES_BY_ROLE } from "@/lib/careers-models";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import OverwatchOrbitLoader from "@/components/admin/ui/OverwatchOrbitLoader";

interface RoleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: CareerRoleDefinition | null;
  onSaveRole: (role: CareerRoleDefinition) => Promise<void>;
}

interface CriterionPreset {
  key: string;
  labelPt: string;
  labelEn: string;
  group: string;
  type: "boolean" | "number" | "string";
  mandatory: boolean;
  expectedValue: any;
}

const DEFAULT_DEPARTMENTS = [
  { pt: "Engenharia Técnica", en: "Technical Engineering" },
  { pt: "Operações de Segurança", en: "Security Operations" },
  { pt: "Suporte Técnico", en: "Technical Support" },
  { pt: "Comercial & Vendas", en: "Commercial & Sales" },
  { pt: "Direção & Gestão", en: "Management & Leadership" },
];

const PRESET_CRITERIA: CriterionPreset[] = [
  // CCTV & Technical Engineering
  {
    key: "yearsCctvExperience",
    labelPt: "Experiência Prática em CCTV (mínimo 1 ano)",
    labelEn: "Hands-on CCTV Experience (min 1 year)",
    group: "CCTV & Engenharia Técnica",
    type: "number",
    mandatory: true,
    expectedValue: 1,
  },
  {
    key: "ipCctv",
    labelPt: "Sistemas CCTV IP e Protocolos Digitais",
    labelEn: "IP CCTV Systems & Network Protocols",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "nvrDvr",
    labelPt: "Configuração de NVRs/DVRs e Armazenamento",
    labelEn: "NVR/DVR Setup & Storage Sizing",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "networking",
    labelPt: "Redes IP (Switches, VLANs, Routers)",
    labelEn: "IP Networking (Switches, VLANs, Routers)",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "hikvision",
    labelPt: "Ecossistema Hikvision (iVMS, AcuSense)",
    labelEn: "Hikvision Ecosystem (iVMS, AcuSense)",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "dahua",
    labelPt: "Plataformas Dahua (DSS, SmartPSS)",
    labelEn: "Dahua Platforms (DSS, SmartPSS)",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "supervision",
    labelPt: "Supervisão e Liderança de Técnicos em Obra",
    labelEn: "Field Installation Team Supervision",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "drivingLicence",
    labelPt: "Carta de Condução Válida",
    labelEn: "Valid Driving Licence",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "aiAnalytics",
    labelPt: "Analítica Perimetral e Câmaras com IA",
    labelEn: "AI Video Analytics & Perimeter Rules",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "boqScopes",
    labelPt: "Elaboração de BoQs e Cadernos de Encargos",
    labelEn: "Preparation of BoQs & Scopes of Work",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "structuredCabling",
    labelPt: "Cablagem Estruturada e Fibra Óptica",
    labelEn: "Structured Cabling & Fiber Optics",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "troubleshooting",
    labelPt: "Diagnóstico e Resolução de Falhas de Hardware",
    labelEn: "Hardware Diagnostics & Troubleshooting",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },

  // Operations & Control Room
  {
    key: "grade12",
    labelPt: "Conclusão da 12.ª Classe",
    labelEn: "Grade 12 High School Completion",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "shifts",
    labelPt: "Disponibilidade para Escala de Turnos 12h (2D/2N/2F)",
    labelEn: "Shift Schedule Availability 12h (2D/2N/2O)",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "gender",
    labelPt: "Género Feminino (Requisito da Vaga CCO)",
    labelEn: "Female Gender Requirement (CCO Position)",
    group: "Operações & Monitoramento",
    type: "string",
    mandatory: true,
    expectedValue: "female",
  },
  {
    key: "currentLocation",
    labelPt: "Residência no Grande Maputo / Matola",
    labelEn: "Resident in Greater Maputo / Matola",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "experience",
    labelPt: "Experiência Prévia em CCTV ou Vigilância",
    labelEn: "Prior CCTV or Security Experience",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "ai",
    labelPt: "Capacidade de Utilização de Ferramentas de IA",
    labelEn: "Ability to Use Artificial Intelligence Tools",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "computerLiteracy",
    labelPt: "Conhecimentos Básicos de Informática e Digitação",
    labelEn: "Basic Computer & Typing Literacy",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },

  // Management & Support
  {
    key: "managementExperience",
    labelPt: "Experiência em Gestão Operacional de Segurança (mínimo 3 anos)",
    labelEn: "Security Operations Management (min 3 years)",
    group: "Gestão & Liderança",
    type: "number",
    mandatory: true,
    expectedValue: 3,
  },
  {
    key: "incidentResponse",
    labelPt: "Coordenação de Resposta a Incidentes Críticos",
    labelEn: "Critical Incident Coordination & Response",
    group: "Gestão & Liderança",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "techSupportExp",
    labelPt: "Experiência em Suporte Técnico de Hardware/Redes",
    labelEn: "Technical Hardware & Network Support Experience",
    group: "Suporte Técnico",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "b2bExperience",
    labelPt: "Experiência em Vendas B2B de Segurança Eletrónica",
    labelEn: "B2B Electronic Security Systems Sales Experience",
    group: "Comercial & Vendas",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
];

export default function RoleConfigModal({
  isOpen,
  onClose,
  roleToEdit,
  onSaveRole,
}: RoleConfigModalProps) {
  const { lang, t } = useAdminLanguage();
  const isEditing = Boolean(roleToEdit);

  const [id, setId] = useState(roleToEdit?.id || "");
  const [pt, setPt] = useState(roleToEdit?.pt || "");
  const [en, setEn] = useState(roleToEdit?.en || "");
  const [department, setDepartment] = useState(
    roleToEdit?.department || (lang === "en" ? "Technical Engineering" : "Engenharia Técnica"),
  );
  const [descriptionPt, setDescriptionPt] = useState(roleToEdit?.descriptionPt || "");
  const [open, setOpen] = useState(roleToEdit?.open ?? true);

  // Custom Department State
  const [savedCustomDepts, setSavedCustomDepts] = useState<string[]>([]);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState("");

  const [stages, setStages] = useState<PipelineStageKey[]>(
    roleToEdit?.pipelineStages || [
      "applications",
      "screening",
      "interview",
      "hired",
    ],
  );

  const [rules, setRules] = useState<ScreeningRule[]>(
    roleToEdit?.screeningRules && roleToEdit.screeningRules.length > 0
      ? roleToEdit.screeningRules
      : (roleToEdit?.id ? (DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || []) : []),
  );

  // Screening Criteria Presets & Custom Criteria State
  const [savedCustomCriteria, setSavedCustomCriteria] = useState<CriterionPreset[]>([]);
  const [selectedCriterionPreset, setSelectedCriterionPreset] = useState<string>("");
  const [isCustomCriterion, setIsCustomCriterion] = useState(false);
  const [saveCriterionForFuture, setSaveCriterionForFuture] = useState(true);

  // New Rule form fields
  const [newRuleField, setNewRuleField] = useState("");
  const [newRuleLabelPt, setNewRuleLabelPt] = useState("");
  const [newRuleLabelEn, setNewRuleLabelEn] = useState("");
  const [newRuleType, setNewRuleType] = useState<"boolean" | "number" | "string">("boolean");
  const [newRuleMandatory, setNewRuleMandatory] = useState(true);
  const [newRuleValue, setNewRuleValue] = useState("yes");

  const [activeTab, setActiveTab] = useState<"details" | "pipeline" | "screening">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load custom departments and criteria presets from localStorage
  useEffect(() => {
    try {
      const storedDepts = localStorage.getItem("overwatch_custom_departments");
      if (storedDepts) setSavedCustomDepts(JSON.parse(storedDepts));

      const storedCrit = localStorage.getItem("overwatch_custom_criteria_presets");
      if (storedCrit) setSavedCustomCriteria(JSON.parse(storedCrit));
    } catch {
      // silent
    }
  }, []);

  // Synchronize state whenever roleToEdit or isOpen changes
  useEffect(() => {
    if (!isOpen) return;
    if (roleToEdit) {
      setId(roleToEdit.id || "");
      setPt(roleToEdit.pt || "");
      setEn(roleToEdit.en || "");
      
      const roleDept = roleToEdit.department || (lang === "en" ? "Technical Engineering" : "Engenharia Técnica");
      setDepartment(roleDept);
      const isKnown = DEFAULT_DEPARTMENTS.some((d) => d.pt === roleDept || d.en === roleDept);
      setIsCustomDept(!isKnown);
      if (!isKnown) setCustomDeptInput(roleDept);

      setDescriptionPt(roleToEdit.descriptionPt || "");
      setOpen(roleToEdit.open ?? true);
      setStages(
        roleToEdit.pipelineStages && roleToEdit.pipelineStages.length > 0
          ? roleToEdit.pipelineStages
          : ["applications", "screening", "interview", "hired"],
      );
      
      const initialRules =
        roleToEdit.screeningRules && roleToEdit.screeningRules.length > 0
          ? roleToEdit.screeningRules
          : (roleToEdit.id && DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id])
            ? DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id]
            : [];
      setRules(initialRules);
    } else {
      setId("");
      setPt("");
      setEn("");
      setDepartment(lang === "en" ? "Technical Engineering" : "Engenharia Técnica");
      setIsCustomDept(false);
      setCustomDeptInput("");
      setDescriptionPt("");
      setOpen(true);
      setStages(["applications", "screening", "interview", "hired"]);
      setRules([]);
    }
    setErrorMsg("");
    setActiveTab("details");
    setSelectedCriterionPreset("");
    setIsCustomCriterion(false);
  }, [roleToEdit, isOpen, lang]);

  if (!isOpen) return null;

  const toggleStage = (stageKey: PipelineStageKey) => {
    if (stageKey === "applications" || stageKey === "hired") return;
    if (stages.includes(stageKey)) {
      setStages(stages.filter((s) => s !== stageKey));
    } else {
      setStages([...stages, stageKey]);
    }
  };

  const handleSelectCriterionPreset = (key: string) => {
    setSelectedCriterionPreset(key);
    setErrorMsg("");

    if (key === "__custom__") {
      setIsCustomCriterion(true);
      setNewRuleField("");
      setNewRuleLabelPt("");
      setNewRuleLabelEn("");
      setNewRuleType("boolean");
      setNewRuleMandatory(true);
      setNewRuleValue("yes");
      return;
    }

    const allPresets = [...PRESET_CRITERIA, ...savedCustomCriteria];
    const found = allPresets.find((c) => c.key === key);
    if (found) {
      setIsCustomCriterion(false);
      setNewRuleField(found.key);
      setNewRuleLabelPt(found.labelPt);
      setNewRuleLabelEn(found.labelEn || found.labelPt);
      setNewRuleType(found.type);
      setNewRuleMandatory(found.mandatory);
      setNewRuleValue(String(found.expectedValue));
    } else {
      setIsCustomCriterion(false);
      setNewRuleField("");
      setNewRuleLabelPt("");
      setNewRuleLabelEn("");
      setNewRuleValue("yes");
    }
  };

  const handleSaveCustomDept = () => {
    if (!customDeptInput.trim()) return;
    const trimmed = customDeptInput.trim();
    setDepartment(trimmed);
    if (!savedCustomDepts.includes(trimmed)) {
      const updated = [...savedCustomDepts, trimmed];
      setSavedCustomDepts(updated);
      try {
        localStorage.setItem("overwatch_custom_departments", JSON.stringify(updated));
      } catch {}
    }
  };

  const handleAddRule = () => {
    if (!newRuleField.trim() || !newRuleLabelPt.trim()) {
      setErrorMsg(
        t(
          "Please specify the form field key and rule label.",
          "Preencha o identificador do campo e o título da regra.",
        ),
      );
      return;
    }

    const cleanField = newRuleField.trim().replace(/\s+/g, "_");

    // Prevent duplicate field rule
    if (rules.some((r) => r.field === cleanField)) {
      setErrorMsg(
        t(
          `A rule for field "${cleanField}" already exists.`,
          `Já existe uma regra para o campo "${cleanField}".`,
        ),
      );
      return;
    }

    const newRule: ScreeningRule = {
      id: `rule_${Date.now()}`,
      field: cleanField,
      labelPt: newRuleLabelPt.trim(),
      labelEn: newRuleLabelEn.trim() || newRuleLabelPt.trim(),
      type: newRuleType,
      mandatory: newRuleMandatory,
      expectedValue: newRuleType === "number" ? Number(newRuleValue) || 1 : newRuleValue,
      weight: newRuleMandatory ? undefined : 1,
    };

    // If custom criterion, optionally save for future use in localStorage
    if (isCustomCriterion && saveCriterionForFuture) {
      const newPreset: CriterionPreset = {
        key: cleanField,
        labelPt: newRuleLabelPt.trim(),
        labelEn: newRuleLabelEn.trim() || newRuleLabelPt.trim(),
        group: "Critérios Personalizados",
        type: newRuleType,
        mandatory: newRuleMandatory,
        expectedValue: newRuleValue,
      };
      const updatedPresets = [...savedCustomCriteria.filter((p) => p.key !== cleanField), newPreset];
      setSavedCustomCriteria(updatedPresets);
      try {
        localStorage.setItem("overwatch_custom_criteria_presets", JSON.stringify(updatedPresets));
      } catch {}
    }

    setRules([...rules, newRule]);
    setSelectedCriterionPreset("");
    setIsCustomCriterion(false);
    setNewRuleField("");
    setNewRuleLabelPt("");
    setNewRuleLabelEn("");
    setNewRuleValue(newRuleType === "number" ? "1" : "yes");
    setErrorMsg("");
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleSave = async () => {
    if (!pt.trim()) {
      setErrorMsg(
        t(
          "The job role title in Portuguese is required.",
          "O título da vaga em Português é obrigatório.",
        ),
      );
      return;
    }

    const finalDept = isCustomDept && customDeptInput.trim() ? customDeptInput.trim() : department;

    // Save custom department to storage if newly entered
    if (isCustomDept && customDeptInput.trim()) {
      handleSaveCustomDept();
    }

    const slug = id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
      : pt.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const payload: CareerRoleDefinition = {
      id: slug,
      pt: pt.trim(),
      en: en.trim() || pt.trim(),
      department: finalDept,
      descriptionPt: descriptionPt.trim(),
      open,
      activeCohortId: roleToEdit?.activeCohortId || null,
      pipelineStages: stages,
      screeningRules: rules,
      createdAt: roleToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setErrorMsg("");

    try {
      await onSaveRole(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t("Failed to save role configuration.", "Falha ao gravar configurações da vaga."));
    } finally {
      setIsSaving(false);
    }
  };

  const currentRoleTitle = lang === "en" ? (en || pt || roleToEdit?.en || roleToEdit?.pt || id) : (pt || en || roleToEdit?.pt || roleToEdit?.en || id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-[#0a1128]">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing
                  ? `${t("Configure Role:", "Configurar Vaga:")} ${currentRoleTitle}`
                  : t("Create New Recruitment Role", "Criar Nova Vaga de Recrutamento")}
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  "Customize role pipeline stages and automated CV screening rules.",
                  "Personalize o pipeline de fases e as regras de triagem automática de currículos.",
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={t("Close", "Fechar")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "details"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>{t("1. Role Details", "1. Informações da Vaga")}</span>
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "pipeline"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers size={14} />
            <span>
              {t("2. Pipeline Stages", "2. Pipeline & Fases")} ({stages.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("screening")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "screening"
                ? "border-[#0a1128] text-[#0a1128]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck size={14} />
            <span>
              {t("3. CV Screening Rules", "3. Regras de Triagem CV")} ({rules.length})
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Job Title (Portuguese) *", "Título da Vaga (Português) *")}
                  </label>
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => setPt(e.target.value)}
                    placeholder={t("e.g. CCTV Technical Operator", "Ex: Gestor de Segurança e Acessos")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Job Title (English)", "Título da Vaga (Inglês)")}
                  </label>
                  <input
                    type="text"
                    value={en}
                    onChange={(e) => setEn(e.target.value)}
                    placeholder={t("e.g. Access Control & Security Manager", "Ex: Access Control & Security Manager")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("System Identifier / Slug", "Identificador / Slug do Sistema")}
                  </label>
                  <input
                    type="text"
                    value={id}
                    disabled={isEditing}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="cctv_security_lead"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-75 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {t("Auto-generated if left empty", "Automático se vazio")}
                  </span>
                </div>
                
                {/* Department Dropdown with Custom Add Option */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t("Department / Division", "Departamento / Área")}
                  </label>
                  <select
                    value={isCustomDept ? "__custom__" : department}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomDept(true);
                      } else {
                        setIsCustomDept(false);
                        setDepartment(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                  >
                    {DEFAULT_DEPARTMENTS.map((d) => (
                      <option key={d.pt} value={d.pt}>
                        {lang === "en" ? d.en : d.pt}
                      </option>
                    ))}
                    {savedCustomDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="__custom__">
                      {t("+ Other (Enter Manually...)", "+ Outro (Inserir Manualmente...)")}
                    </option>
                  </select>

                  {isCustomDept && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={customDeptInput}
                        onChange={(e) => {
                          setCustomDeptInput(e.target.value);
                          setDepartment(e.target.value);
                        }}
                        placeholder={t("e.g. Information Technology & Telecoms", "Ex: TI & Telecomunicações")}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomDept}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                      >
                        {t("Save", "Guardar")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  {t("Role Summary & Scope", "Resumo da Vaga & Responsabilidades")}
                </label>
                <textarea
                  value={descriptionPt}
                  onChange={(e) => setDescriptionPt(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "Key duties, technical skills, and scope of responsibilities...",
                    "Descrição técnica das principais atividades e escopo da posição...",
                  )}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none resize-none"
                />
              </div>

              {/* Open/Closed Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {t("Initial Role Status", "Estado Inicial da Vaga")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {t(
                      "Defines if this role is currently open for public applications on the website.",
                      "Define se a vaga está aberta a novas candidaturas no portal público.",
                    )}
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={(e) => setOpen(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE STAGES */}
          {activeTab === "pipeline" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  {t("Configure Pipeline Stages", "Configurar Fases do Funil")}
                </h4>
                <p className="text-xs text-slate-500">
                  {t(
                    "Toggle the stages required for this job role. Candidates will advance step-by-step through enabled stages.",
                    "Ative ou desative as etapas necessárias para esta vaga. Candidatos avançam apenas pelas fases selecionadas.",
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {ALL_PIPELINE_STAGES.map((stage) => {
                  const isEnabled = stages.includes(stage.key);
                  const isLocked = stage.key === "applications" || stage.key === "hired";

                  return (
                    <div
                      key={stage.key}
                      onClick={() => !isLocked && toggleStage(stage.key)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isLocked
                          ? "cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-80"
                          : "cursor-pointer hover:border-slate-300"
                      } ${isEnabled ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/40 text-slate-400"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold ${
                            isEnabled
                              ? "border-[#0a1128] bg-[#0a1128] text-white"
                              : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {isEnabled ? <Check size={14} /> : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {lang === "en" ? stage.labelEn : stage.labelPt}
                            </span>
                            {isLocked && (
                              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase">
                                {t("Required", "Obrigatório")}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 block mt-0.5">
                            {lang === "en" ? stage.descriptionEn : stage.descriptionPt}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                        {stage.key}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM SCREENING RULES */}
          {activeTab === "screening" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {t("Active CV Screening Rules", "Regras Ativas de Triagem Automática")}
                  </h4>
                  {roleToEdit?.id && DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] && (
                    <button
                      type="button"
                      onClick={() => setRules(DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || [])}
                      className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      {t("Restore Role Defaults", "Restaurar Padrão da Vaga")}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  {t(
                    "The system automatically screens incoming applications using these rules. Mandatory rules immediately flag unqualified candidates.",
                    "O sistema avalia cada candidato automaticamente com base nestes critérios. Requisitos mandatórios causam exclusão direta caso não sejam cumpridos.",
                  )}
                </p>

                {rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    {t(
                      "No screening rules configured. All applicants will pass screening by default.",
                      "Nenhuma regra configurada. Todas as candidaturas serão marcadas como aptas por padrão.",
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div
                        key={rule.id || idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              rule.mandatory
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {rule.mandatory
                              ? t("Mandatory (Pass/Fail)", "Obrigatório (Pass/Fail)")
                              : t("Preferred (Score)", "Preferencial (Pontuação)")}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {lang === "en" && rule.labelEn ? rule.labelEn : rule.labelPt}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {t("Field:", "Campo:")} {rule.field} = {String(rule.expectedValue)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title={t("Delete rule", "Remover regra")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule Form with Smart Dropdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Plus size={14} />
                    <span>{t("Add New Screening Rule", "Adicionar Nova Regra de Triagem")}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {t("Select from known form fields or create custom", "Selecione campos do formulário ou crie personalizados")}
                  </span>
                </div>

                {/* Primary Criterion Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    {t("Select Form Field / Evaluation Criterion *", "Selecionar Critério de Triagem / Campo *")}
                  </label>
                  <select
                    value={isCustomCriterion ? "__custom__" : selectedCriterionPreset}
                    onChange={(e) => handleSelectCriterionPreset(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-medium"
                  >
                    <option value="">
                      {t("-- Choose an evaluation criterion from form --", "-- Escolha um critério de avaliação do formulário --")}
                    </option>

                    <optgroup label={t("CCTV & Technical Engineering Criteria", "Critérios de CCTV & Engenharia Técnica")}>
                      {PRESET_CRITERIA.filter((c) => c.group.includes("CCTV")).map((c) => (
                        <option key={c.key} value={c.key}>
                          {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}]
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label={t("Operations & Monitoring Criteria", "Critérios de Operações & Monitoramento")}>
                      {PRESET_CRITERIA.filter((c) => c.group.includes("Operações")).map((c) => (
                        <option key={c.key} value={c.key}>
                          {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}]
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label={t("Management & Commercial Criteria", "Critérios de Gestão & Comercial")}>
                      {PRESET_CRITERIA.filter((c) => c.group.includes("Gestão") || c.group.includes("Suporte") || c.group.includes("Comercial")).map((c) => (
                        <option key={c.key} value={c.key}>
                          {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}]
                        </option>
                      ))}
                    </optgroup>

                    {savedCustomCriteria.length > 0 && (
                      <optgroup label={t("Saved Custom Criteria", "Critérios Personalizados Guardados")}>
                        {savedCustomCriteria.map((c) => (
                          <option key={c.key} value={c.key}>
                            {lang === "en" ? c.labelEn : c.labelPt} ({c.key})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option value="__custom__">
                      {t("+ Other (Enter Custom Field & Title Manually...)", "+ Outro (Inserir Campo e Título Manualmente...)")}
                    </option>
                  </select>
                </div>

                {/* If custom criterion chosen, or for manual editing */}
                {isCustomCriterion && (
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-3 animate-in fade-in duration-150">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Form Field Key *", "Identificador do Campo (Formulário) *")}
                        </label>
                        <input
                          type="text"
                          value={newRuleField}
                          onChange={(e) => setNewRuleField(e.target.value)}
                          placeholder="e.g. fiberSplicing, accessControl"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Rule Title (Portuguese) *", "Título da Regra (Português) *")}
                        </label>
                        <input
                          type="text"
                          value={newRuleLabelPt}
                          onChange={(e) => setNewRuleLabelPt(e.target.value)}
                          placeholder="Ex: Fusão de Fibra Óptica"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        {t("Rule Title (English - Optional)", "Título da Regra (Inglês - Opcional)")}
                      </label>
                      <input
                        type="text"
                        value={newRuleLabelEn}
                        onChange={(e) => setNewRuleLabelEn(e.target.value)}
                        placeholder="e.g. Fiber Optic Splicing"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        checked={saveCriterionForFuture}
                        onChange={(e) => setSaveCriterionForFuture(e.target.checked)}
                        className="rounded border-slate-300 accent-[#0a1128]"
                      />
                      <span>{t("Save this criterion to reuse in future roles", "Guardar este critério para reutilizar noutras vagas")}</span>
                    </label>
                  </div>
                )}

                {/* Verification classification, type, and expected value */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Verification Type", "Tipo de Verificação")}
                    </label>
                    <select
                      value={newRuleType}
                      onChange={(e) => {
                        const val = e.target.value as "boolean" | "number";
                        setNewRuleType(val);
                        setNewRuleValue(val === "number" ? "1" : "yes");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    >
                      <option value="boolean">{t("Yes / No (Boolean)", "Sim / Não (Booleano)")}</option>
                      <option value="number">{t("Numeric Value (Minimum)", "Valor Numérico (Mínimo)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Rule Classification", "Classificação da Regra")}
                    </label>
                    <select
                      value={newRuleMandatory ? "mandatory" : "preferred"}
                      onChange={(e) => setNewRuleMandatory(e.target.value === "mandatory")}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    >
                      <option value="mandatory">{t("Mandatory (Pass / Fail)", "Obrigatório (Pass / Fail)")}</option>
                      <option value="preferred">{t("Preferred (Score Bonus)", "Preferencial (Bónus / Score)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {t("Expected Value", "Valor Esperado")}
                    </label>
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={newRuleType === "number" ? "1" : "yes"}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!newRuleField.trim()}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{t("Add Rule to Pipeline", "Adicionar Regra à Vaga")}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t("Cancel", "Cancelar")}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-[#0a1128] hover:bg-[#121c3d] px-5 py-2 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <OverwatchOrbitLoader size="sm" label={t("Saving...", "A gravar...")} />
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>{t("Save Changes", "Gravar Alterações")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
