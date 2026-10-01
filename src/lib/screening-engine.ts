/**
 * Reusable Screening Engine for Technical and Specialist Roles at Overwatch.
 *
 * Designed to dynamically define screening questions, evaluate mandatory requirements,
 * score preferred competencies, and automatically classify applicants.
 */

import { ScreeningEvaluationResult } from "./careers";

export type ScreeningFieldType =
  | "boolean"      // Yes / No button pair
  | "select"       // Dropdown select
  | "text"         // Short text input
  | "textarea"     // Multi-line detailed text
  | "number";      // Numeric input

export interface ScreeningQuestionOption {
  value: string;
  labelEn: string;
  labelPt: string;
}

export interface ScreeningQuestionConfig {
  id: string;
  labelEn: string;
  labelPt: string;
  type: ScreeningFieldType;
  options?: ScreeningQuestionOption[];
  placeholderEn?: string;
  placeholderPt?: string;
  helpTextEn?: string;
  helpTextPt?: string;
  required: boolean;
  category: "experience" | "core_technical" | "platforms" | "infrastructure" | "management" | "logistics" | "project_details";
}

export interface ScreeningCriterion {
  id: string;
  field: string;
  isMandatory: boolean;
  labelEn: string;
  labelPt: string;
  failureMessageEn?: string;
  failureMessagePt?: string;
  check: (value: any, allValues: Record<string, any>) => boolean;
}

export interface RoleScreeningConfig {
  roleId: string;
  titleEn: string;
  titlePt: string;
  questions: ScreeningQuestionConfig[];
  criteria: ScreeningCriterion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE: CCTV Installation & Technical Manager
// ─────────────────────────────────────────────────────────────────────────────

export const CCTV_TECHNICAL_MANAGER_CONFIG: RoleScreeningConfig = {
  roleId: "cctv_technical_manager",
  titleEn: "CCTV Installation & Technical Manager",
  titlePt: "Gestor Técnico e Instalação de CCTV",
  questions: [
    // 1. Current Location
    {
      id: "currentLocation",
      labelEn: "Current Location / City",
      labelPt: "Localização Actual / Cidade",
      type: "text",
      placeholderEn: "e.g. Maputo, Matola, etc.",
      placeholderPt: "ex.: Maputo, Matola, etc.",
      required: true,
      category: "logistics",
    },
    // 2. Years of CCTV Installation Experience
    {
      id: "yearsCctvExperience",
      labelEn: "Years of CCTV Installation Experience",
      labelPt: "Anos de Experiência em Instalação de CCTV",
      type: "select",
      required: true,
      category: "experience",
      options: [
        { value: "0", labelEn: "No prior CCTV installation experience", labelPt: "Sem experiência prévia em instalação de CCTV" },
        { value: "1-2", labelEn: "1 – 2 years", labelPt: "1 a 2 anos" },
        { value: "3-5", labelEn: "3 – 5 years", labelPt: "3 a 5 anos" },
        { value: "5-8", labelEn: "5 – 8 years", labelPt: "5 a 8 anos" },
        { value: "8+", labelEn: "More than 8 years", labelPt: "Mais de 8 anos" },
      ],
    },
    // 3. Experience with IP CCTV
    {
      id: "ipCctv",
      labelEn: "Hands-on Experience with IP CCTV Systems",
      labelPt: "Experiência Prática com Sistemas de CCTV IP",
      type: "boolean",
      required: true,
      helpTextEn: "Configuration of PoE, IP cameras, ONVIF protocols, stream setup",
      helpTextPt: "Configuração de PoE, câmaras IP, protocolos ONVIF, configuração de streams",
      category: "core_technical",
    },
    // 4. Experience with Analogue CCTV
    {
      id: "analogueCctv",
      labelEn: "Experience with Analogue / HD-TVI / CVI CCTV",
      labelPt: "Experiência com CCTV Analógico / HD-TVI / CVI",
      type: "boolean",
      required: true,
      category: "core_technical",
    },
    // 5. Hikvision Platform Experience
    {
      id: "hikvision",
      labelEn: "Experience with Hikvision Systems (Cameras, NVRs, iVMS, Hik-Connect)",
      labelPt: "Experiência com Plataformas Hikvision (Câmaras, NVRs, iVMS, Hik-Connect)",
      type: "boolean",
      required: true,
      category: "platforms",
    },
    // 6. Dahua Platform Experience
    {
      id: "dahua",
      labelEn: "Experience with Dahua Systems (SmartPSS, DSS, NVRs, TiOC)",
      labelPt: "Experiência com Plataformas Dahua (SmartPSS, DSS, NVRs, TiOC)",
      type: "boolean",
      required: true,
      category: "platforms",
    },
    // 7. NVR / DVR Configuration Experience
    {
      id: "nvrDvr",
      labelEn: "NVR / DVR Storage & System Configuration Experience",
      labelPt: "Experiência em Configuração de NVRs / DVRs e Armazenamento",
      type: "boolean",
      required: true,
      helpTextEn: "HDD sizing, RAID/recording schedules, motion recording, user privileges",
      helpTextPt: "Dimensionamento de discos, agendamentos de gravação, privilégios de utilizador",
      category: "core_technical",
    },
    // 8. Networking / IP Configuration
    {
      id: "networking",
      labelEn: "Networking, IP Addressing, Switches & Routers",
      labelPt: "Redes, Endereçamento IP, Switches e Routers",
      type: "boolean",
      required: true,
      helpTextEn: "Subnetting, static IPs, DHCP reservations, port forwarding, VLAN basics",
      helpTextPt: "Sub-redes, IPs estáticos, encaminhamento de portas, switches e VLANs básicas",
      category: "core_technical",
    },
    // 9. Structured Cabling Experience
    {
      id: "structuredCabling",
      labelEn: "Structured Cabling (Cat6, Patch Panels, RJ45 Termination, Cable Management)",
      labelPt: "Cablagem Estruturada (Cat6, Patch Panels, Terminação RJ45, Calhas)",
      type: "boolean",
      required: true,
      category: "infrastructure",
    },
    // 10. Electrical / UPS Systems
    {
      id: "electricalUps",
      labelEn: "Basic Electrical, Power Supplies & UPS Backup Systems",
      labelPt: "Electricidade Básica, Fontes de Alimentação e Sistemas UPS",
      type: "boolean",
      required: true,
      category: "infrastructure",
    },
    // 11. Maintenance and Fault Diagnosis
    {
      id: "troubleshooting",
      labelEn: "CCTV Preventative Maintenance & Fault Troubleshooting",
      labelPt: "Manutenção Preventiva e Resolução de Avarias de CCTV",
      type: "boolean",
      required: true,
      category: "core_technical",
    },
    // 12. Experience Supervising Technicians
    {
      id: "supervision",
      labelEn: "Experience Supervising or Managing Technical Teams",
      labelPt: "Experiência em Supervisão ou Gestão de Equipas Técnicas",
      type: "boolean",
      required: true,
      category: "management",
    },
    // 13. Driving Licence
    {
      id: "drivingLicence",
      labelEn: "Valid Driving Licence (Carta de Condução)",
      labelPt: "Carta de Condução Válida",
      type: "boolean",
      required: true,
      category: "logistics",
    },
    // 14. AI & Video Analytics Experience
    {
      id: "aiAnalytics",
      labelEn: "Experience with AI-enabled Cameras & Video Analytics",
      labelPt: "Experiência com Câmaras com IA e Analítica de Vídeo",
      type: "boolean",
      required: true,
      helpTextEn: "Perimeter protection, tripwire line crossing, vehicle/human classification",
      helpTextPt: "Protecção perimetral, cruzamento de linhas, classificação de pessoas e veículos",
      category: "platforms",
    },
    // 15. Remote Monitoring Integration Experience
    {
      id: "remoteMonitoring",
      labelEn: "Experience Integrating CCTV with Remote Control Centres",
      labelPt: "Experiência na Integração de CCTV com Centrais de Monitorização Remota",
      type: "boolean",
      required: true,
      category: "platforms",
    },
    // 16. Technical Scopes and BoQ Preparation
    {
      id: "boqScopes",
      labelEn: "Experience Preparing Technical Scopes of Work & Bills of Quantities (BoQs)",
      labelPt: "Experiência na Elaboração de Cadernos de Encargos Técnicos e Listas de Material (BoQs)",
      type: "boolean",
      required: true,
      category: "management",
    },
    // 17. Start Date / Notice Period
    {
      id: "startDate",
      labelEn: "Availability / Start Date",
      labelPt: "Disponibilidade / Data de Início",
      type: "select",
      required: true,
      category: "logistics",
      options: [
        { value: "immediate", labelEn: "Immediate availability", labelPt: "Disponibilidade Imediata" },
        { value: "2_weeks", labelEn: "Within 2 weeks", labelPt: "Dentro de 2 semanas" },
        { value: "1_month", labelEn: "1 month notice", labelPt: "1 mês de aviso prévio" },
        { value: "more_than_month", labelEn: "More than 1 month", labelPt: "Mais de 1 mês" },
      ],
    },
    // 18. Salary Expectation
    {
      id: "salaryExpectation",
      labelEn: "Current / Expected Monthly Salary (MZN)",
      labelPt: "Salário Mensal Actual / Pretendido (MZN)",
      type: "text",
      placeholderEn: "e.g. 50,000 MZN or Negotiable",
      placeholderPt: "ex.: 50.000 MZN ou A negociar",
      required: true,
      category: "logistics",
    },
    // 19. Largest Project Description
    {
      id: "largestProjectDescription",
      labelEn: "Describe the largest CCTV installation you have personally managed or installed, including approximate number of cameras and your responsibilities:",
      labelPt: "Descreva brevemente a maior instalação de CCTV que geriu ou instalou pessoalmente, incluindo o número aproximado de câmaras e as suas responsabilidades:",
      type: "textarea",
      placeholderEn: "Include client type (e.g. commercial, industrial, residential), number of cameras, equipment brands used, networking challenges, and your role in installation/supervision...",
      placeholderPt: "Indique o tipo de cliente (ex.: comercial, industrial, residencial), número de câmaras, marcas de equipamentos, desafios de rede e a sua função na instalação/supervisão...",
      required: true,
      category: "project_details",
    },
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERIA EVALUATION RULES
  // ───────────────────────────────────────────────────────────────────────────
  criteria: [
    // ─── Mandatory 1: Practical CCTV Installation Experience (> 0)
    {
      id: "mand_cctv_experience",
      field: "yearsCctvExperience",
      isMandatory: true,
      labelEn: "Practical CCTV Installation Experience",
      labelPt: "Experiência Prática em Instalação de CCTV",
      failureMessageEn: "Does not possess practical CCTV installation experience",
      failureMessagePt: "Não possui experiência prática em instalação de CCTV",
      check: (val) => {
        const str = String(val || "").trim();
        return str !== "" && str !== "0" && str !== "none";
      },
    },
    // ─── Mandatory 2: IP CCTV Experience
    {
      id: "mand_ip_cctv",
      field: "ipCctv",
      isMandatory: true,
      labelEn: "IP CCTV Installation & Configuration Experience",
      labelPt: "Experiência em Instalação e Configuração de CCTV IP",
      failureMessageEn: "No prior experience with IP CCTV camera systems",
      failureMessagePt: "Sem experiência comprovada com sistemas de CCTV IP",
      check: (val) => val === "yes",
    },
    // ─── Mandatory 3: NVR / DVR Configuration
    {
      id: "mand_nvr_dvr",
      field: "nvrDvr",
      isMandatory: true,
      labelEn: "NVR / DVR Storage & Configuration Experience",
      labelPt: "Experiência em Configuração de NVRs / DVRs",
      failureMessageEn: "No prior experience configuring NVR/DVR storage and recording",
      failureMessagePt: "Sem experiência em configuração e parametrização de NVR/DVR",
      check: (val) => val === "yes",
    },
    // ─── Mandatory 4: Basic Networking / IP Knowledge
    {
      id: "mand_networking",
      field: "networking",
      isMandatory: true,
      labelEn: "Networking, IP Addressing & Switch Configuration",
      labelPt: "Redes, Endereçamento IP e Configuração de Switches",
      failureMessageEn: "Lacks required IP networking and router/switch knowledge",
      failureMessagePt: "Não possui conhecimentos essenciais de redes IP e routers/switches",
      check: (val) => val === "yes",
    },

    // ─── Preferred 1: Hikvision Experience
    {
      id: "pref_hikvision",
      field: "hikvision",
      isMandatory: false,
      labelEn: "Hikvision Platform Experience",
      labelPt: "Experiência com Plataforma Hikvision",
      check: (val) => val === "yes",
    },
    // ─── Preferred 2: Dahua Experience
    {
      id: "pref_dahua",
      field: "dahua",
      isMandatory: false,
      labelEn: "Dahua Platform Experience",
      labelPt: "Experiência com Plataforma Dahua",
      check: (val) => val === "yes",
    },
    // ─── Preferred 3: Supervisory Experience
    {
      id: "pref_supervision",
      field: "supervision",
      isMandatory: false,
      labelEn: "Technical Team Supervision Experience",
      labelPt: "Experiência em Supervisão de Técnicos",
      check: (val) => val === "yes",
    },
    // ─── Preferred 4: Driving Licence
    {
      id: "pref_driving",
      field: "drivingLicence",
      isMandatory: false,
      labelEn: "Valid Driving Licence",
      labelPt: "Carta de Condução Válida",
      check: (val) => val === "yes",
    },
    // ─── Preferred 5: AI / Video Analytics Experience
    {
      id: "pref_ai_analytics",
      field: "aiAnalytics",
      isMandatory: false,
      labelEn: "AI & Video Analytics Camera Setup",
      labelPt: "Configuração de IA e Analítica de Vídeo",
      check: (val) => val === "yes",
    },
    // ─── Preferred 6: Remote Monitoring Integration
    {
      id: "pref_remote_monitoring",
      field: "remoteMonitoring",
      isMandatory: false,
      labelEn: "Remote Monitoring Centre Integration",
      labelPt: "Integração com Centrais de Monitorização Remota",
      check: (val) => val === "yes",
    },
    // ─── Preferred 7: BoQs and Technical Scopes
    {
      id: "pref_boq_scopes",
      field: "boqScopes",
      isMandatory: false,
      labelEn: "Preparation of Technical Scopes & BoQs",
      labelPt: "Elaboração de Cadernos de Encargos e BoQs",
      check: (val) => val === "yes",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY OF CONFIGURABLE ROLES
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIGS: Record<string, RoleScreeningConfig> = {
  cctv_technical_manager: CCTV_TECHNICAL_MANAGER_CONFIG,
};

/**
 * Returns screening configuration for a given role, or null if standard form applies.
 */
export function getRoleScreeningConfig(roleId: string): RoleScreeningConfig | null {
  return ROLE_CONFIGS[roleId] || null;
}

/**
 * Checks whether a role has technical screening questions configured.
 */
export function hasTechnicalScreening(roleId: string): boolean {
  return roleId in ROLE_CONFIGS;
}

/**
 * Retrieves the list of questions for a role.
 */
export function getRoleScreeningQuestions(roleId: string): ScreeningQuestionConfig[] {
  const config = getRoleScreeningConfig(roleId);
  return config ? config.questions : [];
}

/**
 * Evaluates an applicant's submission against mandatory and preferred criteria.
 */
export function evaluateTechnicalScreening(
  roleId: string,
  data: Record<string, any>
): ScreeningEvaluationResult {
  const config = getRoleScreeningConfig(roleId);
  const now = new Date().toISOString();

  // If role does not have specialized criteria, default to passing
  if (!config) {
    return {
      passedMandatory: true,
      failedReasons: [],
      failedReasonsPt: [],
      preferredScore: 0,
      preferredTotal: 0,
      matchPercentage: 100,
      evaluatedAt: now,
      details: [],
    };
  }

  const failedReasonsEn: string[] = [];
  const failedReasonsPt: string[] = [];
  let preferredScore = 0;
  let preferredTotal = 0;
  const details: Array<{ key: string; label: string; passed: boolean; mandatory: boolean }> = [];

  for (const criterion of config.criteria) {
    const val = data[criterion.field];
    const passed = criterion.check(val, data);

    details.push({
      key: criterion.field,
      label: criterion.labelEn,
      passed,
      mandatory: criterion.isMandatory,
    });

    if (criterion.isMandatory) {
      if (!passed) {
        failedReasonsEn.push(criterion.failureMessageEn || `Missing mandatory requirement: ${criterion.labelEn}`);
        failedReasonsPt.push(criterion.failureMessagePt || `Requisito obrigatório não cumprido: ${criterion.labelPt}`);
      }
    } else {
      preferredTotal += 1;
      if (passed) {
        preferredScore += 1;
      }
    }
  }

  const passedMandatory = failedReasonsEn.length === 0;
  const matchPercentage =
    preferredTotal > 0 ? Math.round((preferredScore / preferredTotal) * 100) : 100;

  return {
    passedMandatory,
    failedReasons: failedReasonsEn,
    failedReasonsPt: failedReasonsPt,
    preferredScore,
    preferredTotal,
    matchPercentage,
    evaluatedAt: now,
    details,
  };
}
