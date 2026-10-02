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
  instructionPt?: string;
  instructionEn?: string;
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
    key: "hikvision",
    labelPt: "Ecossistema Hikvision (iVMS, AcuSense)",
    labelEn: "Hikvision Ecosystem (iVMS, AcuSense)",
    instructionPt: "Possui experiência com o ecossistema Hikvision, iVMS-4200, Hik-Connect ou câmaras AcuSense / ColorVu?",
    instructionEn: "Do you have experience with Hikvision ecosystem, iVMS-4200, Hik-Connect, or AcuSense / ColorVu cameras?",
    group: "CCTV & Engenharia Técnica",
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
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "supervision",
    labelPt: "Supervisão e Liderança de Técnicos em Obra",
    labelEn: "Field Installation Team Supervision",
    instructionPt: "Tem experiência em coordenação de técnicos em obra, planeamento diário e controlo de qualidade?",
    instructionEn: "Do you have experience supervising field technicians, daily planning, and quality control?",
    group: "CCTV & Engenharia Técnica",
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
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "aiAnalytics",
    labelPt: "Analítica Perimetral e Câmaras com IA",
    labelEn: "AI Video Analytics & Perimeter Rules",
    instructionPt: "Já configurou regras analíticas de vídeo inteligente (Tripwire, Linha Virtual, Detecção Humano/Veículo)?",
    instructionEn: "Have you configured smart video analytics rules (Tripwire, Intrusion Zone, Human/Vehicle Detection)?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "boqScopes",
    labelPt: "Elaboração de BoQs e Cadernos de Encargos",
    labelEn: "Preparation of BoQs & Scopes of Work",
    instructionPt: "Sabe realizar levantamentos técnicos no cliente e redigir listas de material (BoQ) e propostas técnicas?",
    instructionEn: "Can you perform site surveys and compile Bills of Quantities (BoQs) and scopes of work?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "structuredCabling",
    labelPt: "Cablagem Estruturada e Fibra Óptica",
    labelEn: "Structured Cabling & Fiber Optics",
    instructionPt: "Possui experiência em conectorização de fibra óptica, esteiramento e organização de bastidores?",
    instructionEn: "Do you have experience with fiber optic termination, cable trays, and rack organization?",
    group: "CCTV & Engenharia Técnica",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "troubleshooting",
    labelPt: "Diagnóstico e Resolução de Falhas de Hardware",
    labelEn: "Hardware Diagnostics & Troubleshooting",
    instructionPt: "Tem capacidade avançada de diagnóstico de loops de terra, interferências de sinal e falhas de fontes?",
    instructionEn: "Do you have advanced capability in diagnosing ground loops, signal noise, and power failures?",
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
    key: "gender",
    labelPt: "Género Feminino (Requisito da Vaga CCO)",
    labelEn: "Female Gender Requirement (CCO Position)",
    instructionPt: "Identifica-se com o género feminino (requisito para este lote afirmativo de CCO)?",
    instructionEn: "Do you identify as female (affirmative cohort requirement for CCO)?",
    group: "Operações & Monitoramento",
    type: "string",
    mandatory: true,
    expectedValue: "female",
  },
  {
    key: "currentLocation",
    labelPt: "Residência no Grande Maputo / Matola",
    labelEn: "Resident in Greater Maputo / Matola",
    instructionPt: "Reside actualmente no perímetro do Grande Maputo ou Município da Matola?",
    instructionEn: "Do you currently reside within Greater Maputo or Matola municipality?",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "experience",
    labelPt: "Experiência Prévia em CCTV ou Vigilância",
    labelEn: "Prior CCTV or Security Experience",
    instructionPt: "Possui experiência profissional prévia comprovada em salas de controlo de CCTV ou vigilância patrimonial?",
    instructionEn: "Do you have prior proven professional experience in CCTV control rooms or surveillance?",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "ai",
    labelPt: "Capacidade de Utilização de Ferramentas de IA",
    labelEn: "Ability to Use Artificial Intelligence Tools",
    instructionPt: "Tem facilidade e interesse em utilizar ferramentas modernas de inteligência artificial na rotina de trabalho?",
    instructionEn: "Are you comfortable and eager to use modern AI tools in daily operations?",
    group: "Operações & Monitoramento",
    type: "boolean",
    mandatory: false,
    expectedValue: "yes",
  },
  {
    key: "computerLiteracy",
    labelPt: "Conhecimentos Básicos de Informática e Digitação",
    labelEn: "Basic Computer & Typing Literacy",
    instructionPt: "Possui conhecimentos de informática na óptica do utilizador e boa velocidade de digitação?",
    instructionEn: "Do you have basic user-level computer literacy and good typing speed?",
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
    instructionPt: "Quantos anos de experiência em chefia e coordenação operacional de segurança possui?",
    instructionEn: "How many years of experience in security operations leadership and coordination do you have?",
    group: "Gestão & Liderança",
    type: "number",
    mandatory: true,
    expectedValue: 3,
  },
  {
    key: "incidentResponse",
    labelPt: "Coordenação de Resposta a Incidentes Críticos",
    labelEn: "Critical Incident Coordination & Response",
    instructionPt: "Tem experiência comprovada na coordenação táctica de resposta a alarmes e incidentes críticos?",
    instructionEn: "Do you have proven experience in tactical incident response coordination?",
    group: "Gestão & Liderança",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "techSupportExp",
    labelPt: "Experiência em Suporte Técnico de Hardware/Redes",
    labelEn: "Technical Hardware & Network Support Experience",
    instructionPt: "Possui experiência no atendimento e resolução remota/presencial de chamados técnicos de TI?",
    instructionEn: "Do you have experience troubleshooting and resolving IT/hardware support tickets?",
    group: "Suporte Técnico",
    type: "boolean",
    mandatory: true,
    expectedValue: "yes",
  },
  {
    key: "b2bExperience",
    labelPt: "Experiência em Vendas B2B de Segurança Eletrónica",
    labelEn: "B2B Electronic Security Systems Sales Experience",
    instructionPt: "Tem experiência comprovada em prospecção e fecho de contratos comerciais B2B de segurança electrónica?",
    instructionEn: "Do you have proven experience prospecting and closing B2B corporate security system deals?",
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
  const [ruleBuilderMode, setRuleBuilderMode] = useState<"preset" | "custom">("preset");
  const [savedCustomCriteria, setSavedCustomCriteria] = useState<CriterionPreset[]>([]);
  const [selectedCriterionPreset, setSelectedCriterionPreset] = useState<string>("");
  const [saveCriterionForFuture, setSaveCriterionForFuture] = useState(true);

  // New Rule form fields
  const [newRuleField, setNewRuleField] = useState("");
  const [newRuleLabelPt, setNewRuleLabelPt] = useState("");
  const [newRuleLabelEn, setNewRuleLabelEn] = useState("");
  const [newRuleInstructionPt, setNewRuleInstructionPt] = useState("");
  const [newRuleInstructionEn, setNewRuleInstructionEn] = useState("");
  const [newRuleEvaluatorGuideline, setNewRuleEvaluatorGuideline] = useState("");
  const [newRuleType, setNewRuleType] = useState<"boolean" | "number" | "string">("boolean");
  const [newRuleMandatory, setNewRuleMandatory] = useState(true);
  const [newRuleValue, setNewRuleValue] = useState("yes");
  const [customFieldEdited, setCustomFieldEdited] = useState(false);

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
          : (roleToEdit.id && (DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id.replace("_operator", "")]))
            ? (DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id.replace("_operator", "")])
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
    setRuleBuilderMode("preset");
    setCustomFieldEdited(false);
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

    if (!key) {
      setNewRuleField("");
      setNewRuleLabelPt("");
      setNewRuleLabelEn("");
      setNewRuleInstructionPt("");
      setNewRuleInstructionEn("");
      setNewRuleType("boolean");
      setNewRuleMandatory(true);
      setNewRuleValue("yes");
      return;
    }

    const allPresets = [...PRESET_CRITERIA, ...savedCustomCriteria];
    const found = allPresets.find((c) => c.key === key);
    if (found) {
      setNewRuleField(found.key);
      setNewRuleLabelPt(found.labelPt);
      setNewRuleLabelEn(found.labelEn || found.labelPt);
      setNewRuleInstructionPt(found.instructionPt || "");
      setNewRuleInstructionEn(found.instructionEn || "");
      setNewRuleType(found.type);
      setNewRuleMandatory(found.mandatory);
      setNewRuleValue(String(found.expectedValue));
    }
  };

  const handleCustomTitleChange = (val: string) => {
    setNewRuleLabelPt(val);
    if (!customFieldEdited) {
      const slug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32);
      setNewRuleField(slug);
    }
  };

  const toggleRuleMandatory = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              mandatory: !r.mandatory,
              weight: !r.mandatory ? undefined : 1,
            }
          : r,
      ),
    );
  };

  const applyRuleTemplate = (tplKey: string) => {
    if (tplKey === "clear") {
      setRules([]);
      return;
    }
    const tpl =
      DEFAULT_SCREENING_RULES_BY_ROLE[tplKey] ||
      DEFAULT_SCREENING_RULES_BY_ROLE[tplKey.replace("_operator", "")] ||
      [];
    if (tpl.length > 0) {
      setRules([...tpl]);
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
          "Please specify the rule title and tied field key.",
          "Preencha o título da regra e o identificador do campo associado.",
        ),
      );
      return;
    }

    const cleanField = newRuleField.trim().replace(/\s+/g, "_");

    // Prevent duplicate field rule
    if (rules.some((r) => r.field === cleanField)) {
      setErrorMsg(
        t(
          `A screening rule for data field "${cleanField}" already exists in this role.`,
          `Já existe uma regra de triagem para o campo de dados "${cleanField}" nesta vaga.`,
        ),
      );
      return;
    }

    const newRule: ScreeningRule = {
      id: `rule_${Date.now()}`,
      field: cleanField,
      labelPt: newRuleLabelPt.trim(),
      labelEn: newRuleLabelEn.trim() || newRuleLabelPt.trim(),
      instructionPt: newRuleInstructionPt.trim() || undefined,
      instructionEn: newRuleInstructionEn.trim() || undefined,
      evaluatorGuideline: newRuleEvaluatorGuideline.trim() || undefined,
      type: newRuleType,
      mandatory: newRuleMandatory,
      expectedValue: newRuleType === "number" ? Number(newRuleValue) || 1 : newRuleValue,
      weight: newRuleMandatory ? undefined : 1,
    };

    // If custom criterion, optionally save for future use in localStorage
    if (ruleBuilderMode === "custom" && saveCriterionForFuture) {
      const newPreset: CriterionPreset = {
        key: cleanField,
        labelPt: newRuleLabelPt.trim(),
        labelEn: newRuleLabelEn.trim() || newRuleLabelPt.trim(),
        instructionPt: newRuleInstructionPt.trim() || undefined,
        instructionEn: newRuleInstructionEn.trim() || undefined,
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
    setNewRuleField("");
    setNewRuleLabelPt("");
    setNewRuleLabelEn("");
    setNewRuleInstructionPt("");
    setNewRuleInstructionEn("");
    setNewRuleEvaluatorGuideline("");
    setNewRuleValue(newRuleType === "number" ? "1" : "yes");
    setCustomFieldEdited(false);
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
              {/* Header and Templates Bar */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {t("Active CV Screening Rules", "Regras Ativas de Triagem Automática")}
                    </h4>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {rules.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Template Loader */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          applyRuleTemplate(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus:border-[#0a1128] focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>
                        {t("Load Template...", "Carregar Modelo / Template...")}
                      </option>
                      <option value="cctv_technical_manager">
                        {t("CCTV Technical Manager Template (10 rules)", "Modelo: Gestor Técnico e Instalação (10 regras)")}
                      </option>
                      <option value="cctv">
                        {t("CCTV Operator Template (4 rules)", "Modelo: Operadora de CCTV CCO (4 regras)")}
                      </option>
                      <option value="operations">
                        {t("Security Operations Template (3 rules)", "Modelo: Gestão de Operações (3 regras)")}
                      </option>
                      <option value="technical">
                        {t("Technical Support Template (2 rules)", "Modelo: Suporte Técnico & Hardware (2 regras)")}
                      </option>
                      <option value="sales">
                        {t("Commercial Sales Template (2 rules)", "Modelo: Vendas B2B de Segurança (2 regras)")}
                      </option>
                      <option value="clear">
                        {t("Clear All Rules (Start Fresh)", "Limpar Todas as Regras (Começar do Zero)")}
                      </option>
                    </select>

                    {roleToEdit?.id && (DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id.replace("_operator", "")]) && (
                      <button
                        type="button"
                        onClick={() => {
                          const def = DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id] || DEFAULT_SCREENING_RULES_BY_ROLE[roleToEdit.id.replace("_operator", "")];
                          if (def) setRules([...def]);
                        }}
                        className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        {t("Restore Role Defaults", "Restaurar Padrão da Vaga")}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  {t(
                    "The system automatically screens incoming applications using these rules. Mandatory rules immediately knockout unqualified candidates, while preferred rules add bonus matching points.",
                    "O sistema avalia cada candidato automaticamente com base nestes critérios. Requisitos obrigatórios desqualificam candidatos que não cumpram, enquanto critérios preferenciais somam pontos de compatibilidade.",
                  )}
                </p>

                {/* Rules List */}
                {rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-xs text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">
                      {t("No screening rules configured for this role.", "Nenhuma regra de triagem configurada para esta vaga.")}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      {t(
                        "All applicant profiles will pass initial screening by default. Use 'Load Template' above or add custom criteria below.",
                        "Todas as candidaturas serão marcadas como aptas por defeito. Utilize 'Carregar Modelo' acima ou adicione regras abaixo.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {rules.map((rule, idx) => (
                      <div
                        key={rule.id || idx}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => toggleRuleMandatory(rule.id)}
                                title={t("Click to toggle Mandatory / Preferred", "Clique para alternar entre Obrigatório e Preferencial")}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-102 ${
                                  rule.mandatory
                                    ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                }`}
                              >
                                {rule.mandatory
                                  ? t("🔴 Mandatory (Knockout)", "🔴 Obrigatório (Pass/Fail)")
                                  : t("🔵 Preferred (Score)", "🔵 Preferencial (Pontuação)")}
                              </button>

                              <span className="text-xs font-bold text-slate-900">
                                {lang === "en" && rule.labelEn ? rule.labelEn : rule.labelPt}
                              </span>
                            </div>

                            {/* Candidate Form Question / Prompt */}
                            {(rule.instructionPt || rule.instructionEn) && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 italic">
                                <strong className="font-semibold not-italic text-slate-700">{t("Form Question:", "Pergunta no Formulário:")}</strong>{" "}
                                “{lang === "en" && rule.instructionEn ? rule.instructionEn : rule.instructionPt}”
                              </p>
                            )}

                            {/* Technical Field Binding Tag */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap pt-0.5">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                {t("Field:", "Campo:")} <strong>{rule.field}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {t("Type:", "Tipo:")} <strong>{rule.type === "number" ? t("Number (Min)", "Número (Mín)") : t("Yes/No", "Sim/Não")}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {t("Passing Condition:", "Condição:")} <strong>{rule.type === "number" ? `>= ${rule.expectedValue}` : `= ${String(rule.expectedValue)}`}</strong>
                              </span>
                              {rule.evaluatorGuideline && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 not-italic font-sans">
                                    {rule.evaluatorGuideline}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                            title={t("Delete rule", "Remover regra")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule Builder */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                {/* Segmented Mode Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Plus size={14} />
                    <span>{t("Add Screening Rule", "Adicionar Regra de Triagem")}</span>
                  </div>

                  <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setRuleBuilderMode("preset");
                        setErrorMsg("");
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        ruleBuilderMode === "preset"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t("Select Form Field", "📋 Selecionar Campo Existente")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRuleBuilderMode("custom");
                        setSelectedCriterionPreset("");
                        setNewRuleField("");
                        setNewRuleLabelPt("");
                        setNewRuleLabelEn("");
                        setNewRuleInstructionPt("");
                        setNewRuleInstructionEn("");
                        setNewRuleEvaluatorGuideline("");
                        setNewRuleType("boolean");
                        setNewRuleMandatory(true);
                        setNewRuleValue("yes");
                        setCustomFieldEdited(false);
                        setErrorMsg("");
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        ruleBuilderMode === "custom"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t("+ Create Custom Rule", "✨ + Criar Regra Personalizada")}
                    </button>
                  </div>
                </div>

                {/* MODE A: SELECT FROM APPLICATION FIELDS */}
                {ruleBuilderMode === "preset" && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        {t("Select Application Form Field / Criterion *", "Selecionar Campo do Formulário / Pergunta da Candidatura *")}
                      </label>
                      <select
                        value={selectedCriterionPreset}
                        onChange={(e) => handleSelectCriterionPreset(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-medium"
                      >
                        <option value="">
                          {t("-- Choose an application criterion from form --", "-- Escolha um critério do formulário de candidatura --")}
                        </option>

                        <optgroup label={t("CCTV & Technical Engineering (Field & Management)", "🛠️ Engenharia Técnica & Instalação CCTV")}>
                          {PRESET_CRITERIA.filter((c) => c.group.includes("CCTV")).map((c) => (
                            <option key={c.key} value={c.key}>
                              {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}] ({c.key})
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label={t("Operations & Monitoring (CCO & Control Room)", "📋 Operações & Sala de Monitoramento")}>
                          {PRESET_CRITERIA.filter((c) => c.group.includes("Operações")).map((c) => (
                            <option key={c.key} value={c.key}>
                              {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}] ({c.key})
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label={t("Management & Commercial Criteria", "🏢 Gestão, Suporte & Comercial")}>
                          {PRESET_CRITERIA.filter((c) => c.group.includes("Gestão") || c.group.includes("Suporte") || c.group.includes("Comercial")).map((c) => (
                            <option key={c.key} value={c.key}>
                              {lang === "en" ? c.labelEn : c.labelPt} [{c.type === "number" ? "Number" : "Yes/No"}] ({c.key})
                            </option>
                          ))}
                        </optgroup>

                        {savedCustomCriteria.length > 0 && (
                          <optgroup label={t("Saved Custom Criteria", "💡 Critérios Personalizados Guardados")}>
                            {savedCustomCriteria.map((c) => (
                              <option key={c.key} value={c.key}>
                                {lang === "en" ? c.labelEn : c.labelPt} ({c.key})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {selectedCriterionPreset && (
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-700 block">
                            {t("Question / Form Instruction to Candidate:", "Pergunta / Instrução ao Candidato no Formulário:")}
                          </span>
                          <p className="text-xs text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 italic font-medium">
                            “{newRuleInstructionPt || newRuleLabelPt}”
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              {t("Tied Data Field Key", "Campo de Dados Associado")}
                            </label>
                            <input
                              type="text"
                              disabled
                              value={newRuleField}
                              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700 font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              {t("Rule Classification *", "Classificação da Regra *")}
                            </label>
                            <select
                              value={newRuleMandatory ? "mandatory" : "preferred"}
                              onChange={(e) => setNewRuleMandatory(e.target.value === "mandatory")}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-semibold"
                            >
                              <option value="mandatory">🔴 {t("Mandatory (Knockout Pass/Fail)", "Obrigatório (Pass/Fail Eliminatório)")}</option>
                              <option value="preferred">🔵 {t("Preferred (Score Bonus)", "Preferencial (Bónus de Pontuação)")}</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              {t("Passing Value *", "Valor para Aprovação *")}
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
                          className="rounded-lg bg-[#0a1128] hover:bg-[#121c3d] px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus size={14} />
                          <span>{t("Add Selected Rule to Role", "Adicionar Regra à Vaga")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE B: CREATE COMPLETELY CUSTOM RULE */}
                {ruleBuilderMode === "custom" && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-3.5 animate-in fade-in duration-150">
                    <p className="text-[11px] text-slate-500">
                      {t(
                        "Define any custom mandatory or preferred screening rule. Specify the candidate form instruction, data field key, and passing condition.",
                        "Adicione qualquer requisito eliminatório ou preferencial à sua medida. Especifique a instrução apresentada ao candidato, o campo de dados e o valor de aprovação.",
                      )}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Rule Title (Portuguese) *", "Título da Regra (Português) *")}
                        </label>
                        <input
                          type="text"
                          value={newRuleLabelPt}
                          onChange={(e) => handleCustomTitleChange(e.target.value)}
                          placeholder="Ex: Certificação de Trabalho em Altura"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Rule Title (English - Optional)", "Título da Regra (Inglês - Opcional)")}
                        </label>
                        <input
                          type="text"
                          value={newRuleLabelEn}
                          onChange={(e) => setNewRuleLabelEn(e.target.value)}
                          placeholder="e.g. Working at Heights Certification"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Candidate Form Question / Prompt */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        {t("Question / Instruction to Candidate on Application Form *", "Pergunta ou Instrução ao Candidato no Formulário *")}
                      </label>
                      <textarea
                        rows={2}
                        value={newRuleInstructionPt}
                        onChange={(e) => setNewRuleInstructionPt(e.target.value)}
                        placeholder="Ex: Possui certificado de segurança válido para trabalhos em altura emitido por entidade acreditada?"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                      />
                    </div>

                    {/* Data Field Key & Answer Controls */}
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Data Field Key *", "Chave do Campo de Dados *")}
                        </label>
                        <input
                          type="text"
                          value={newRuleField}
                          onChange={(e) => {
                            setCustomFieldEdited(true);
                            setNewRuleField(e.target.value);
                          }}
                          placeholder="e.g. trabalho_em_altura"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5 block">{t("Saved in candidate data", "Guardado nos dados do candidato")}</span>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Answer Type *", "Tipo de Resposta *")}
                        </label>
                        <select
                          value={newRuleType}
                          onChange={(e) => {
                            const val = e.target.value as "boolean" | "number" | "string";
                            setNewRuleType(val);
                            setNewRuleValue(val === "number" ? "1" : val === "boolean" ? "yes" : "sim");
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none"
                        >
                          <option value="boolean">{t("Yes / No (Boolean)", "Sim / Não (Booleano)")}</option>
                          <option value="number">{t("Numeric Value (Minimum)", "Valor Numérico (Mínimo)")}</option>
                          <option value="string">{t("Short Text / Response", "Texto / Resposta Livre")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Rule Classification *", "Classificação da Regra *")}
                        </label>
                        <select
                          value={newRuleMandatory ? "mandatory" : "preferred"}
                          onChange={(e) => setNewRuleMandatory(e.target.value === "mandatory")}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0a1128] focus:ring-1 focus:ring-[#0a1128] focus:outline-none font-semibold"
                        >
                          <option value="mandatory">🔴 {t("Mandatory (Knockout)", "Obrigatório (Knockout)")}</option>
                          <option value="preferred">🔵 {t("Preferred (Score Bonus)", "Preferencial (Bónus)")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          {t("Passing Value *", "Valor para Aprovação *")}
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

                    {/* Evaluator Internal Notes */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        {t("Internal Evaluator Guideline (Optional)", "Instruções Internas para o Avaliador (Opcional)")}
                      </label>
                      <input
                        type="text"
                        value={newRuleEvaluatorGuideline}
                        onChange={(e) => setNewRuleEvaluatorGuideline(e.target.value)}
                        placeholder="Ex: Exigir apresentação do documento original antes da entrevista presencial"
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
                      <span>{t("Save this criterion to reuse in future roles", "Guardar este critério na lista rápida para reutilizar noutras vagas")}</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddRule}
                      disabled={!newRuleField.trim() || !newRuleLabelPt.trim()}
                      className="rounded-lg bg-[#0a1128] hover:bg-[#121c3d] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} />
                      <span>{t("Add Custom Rule to Role", "Adicionar Regra Personalizada")}</span>
                    </button>
                  </div>
                )}
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
