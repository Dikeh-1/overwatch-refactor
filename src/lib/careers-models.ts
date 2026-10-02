export type PipelineStageKey =
  | "applications"      // Initial CV review
  | "screening"         // Technical criteria screening
  | "testing"           // Aptitude test slot booking & results
  | "gate_checkin"      // Physical gate pass check-in
  | "next_phase"        // Next Phase candidate selection & confirmation
  | "interview"         // In-person interview
  | "hired";            // Final offer & hired

export interface PipelineStageConfig {
  key: PipelineStageKey;
  labelPt: string;
  labelEn: string;
  descriptionPt: string;
  descriptionEn: string;
  enabled: boolean;
  order: number;
}

export interface ScreeningRule {
  id: string;
  field: string;
  labelPt: string;
  labelEn: string;
  type: "boolean" | "number" | "string";
  mandatory: boolean; // true = hard knockout (pass/fail); false = preferred criteria score
  expectedValue: any; // "yes", min number, etc.
  weight?: number;
}

export interface CareerRoleDefinition {
  id: string;
  en: string;
  pt: string;
  department: string;
  descriptionEn?: string;
  descriptionPt?: string;
  open: boolean;
  activeCohortId?: string | null;
  pipelineStages: PipelineStageKey[];
  screeningRules: ScreeningRule[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerCohort {
  id: string;
  roleId: string;
  name: string;
  openedAt: string;
  closedAt?: string | null;
  status: "active" | "closed" | "archived";
  stages: PipelineStageKey[];
  screeningRules: ScreeningRule[];
  notes?: string;
}

export const ALL_PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    key: "applications",
    labelPt: "Recepção de CVs",
    labelEn: "Applications Received",
    descriptionPt: "Triagem inicial de candidaturas e download de currículos.",
    descriptionEn: "Initial applicant intake and CV review.",
    enabled: true,
    order: 1,
  },
  {
    key: "screening",
    labelPt: "Triagem Técnica",
    labelEn: "Technical Screening",
    descriptionPt: "Verificação automática dos critérios obrigatórios e preferenciais.",
    descriptionEn: "Automated scoring of mandatory and preferred criteria.",
    enabled: true,
    order: 2,
  },
  {
    key: "testing",
    labelPt: "Testes Teóricos / Práticos",
    labelEn: "Aptitude & Skills Testing",
    descriptionPt: "Convocatórias, agendamento de turnos e registo de notas.",
    descriptionEn: "Test slot booking, attendance tracking and test scoring.",
    enabled: true,
    order: 3,
  },
  {
    key: "gate_checkin",
    labelPt: "Validação na Portaria",
    labelEn: "Gate Pass Check-In",
    descriptionPt: "Controlo de acessos com leitura de QR Code no portão da Overwatch.",
    descriptionEn: "On-site security reception and gate-pass QR validation.",
    enabled: true,
    order: 4,
  },
  {
    key: "next_phase",
    labelPt: "Próxima Fase / Convocatória",
    labelEn: "Next Phase Selection",
    descriptionPt: "Seleção para fase seguinte, convite oficial e confirmação de interesse.",
    descriptionEn: "Candidate selection, official invites, and availability confirmation.",
    enabled: true,
    order: 5,
  },
  {
    key: "interview",
    labelPt: "Entrevistas Presenciais",
    labelEn: "Interviews",
    descriptionPt: "Painel de entrevistas com direção técnica e operações.",
    descriptionEn: "In-person panel interviews with management.",
    enabled: true,
    order: 6,
  },
  {
    key: "hired",
    labelPt: "Contratados",
    labelEn: "Hired & Admitted",
    descriptionPt: "Candidatos selecionados e admitidos na equipa.",
    descriptionEn: "Successful applicants admitted into Overwatch.",
    enabled: true,
    order: 7,
  },
];

export const DEFAULT_SCREENING_RULES_BY_ROLE: Record<string, ScreeningRule[]> = {
  cctv_technical_manager: [
    {
      id: "cctv_exp",
      field: "yearsCctvExperience",
      labelPt: "Experiência Prática em CCTV (mínimo 1 ano)",
      labelEn: "Hands-on CCTV Experience (min 1 year)",
      type: "number",
      mandatory: true,
      expectedValue: 1,
    },
    {
      id: "ip_cctv",
      field: "ipCctv",
      labelPt: "Sistemas CCTV IP e Protocolos Digitais",
      labelEn: "IP CCTV & Network Camera Protocols",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "nvr_dvr",
      field: "nvrDvr",
      labelPt: "Configuração de NVRs/DVRs e Armazenamento",
      labelEn: "NVR/DVR Setup & Storage Sizing",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "networking",
      field: "networking",
      labelPt: "Redes IP (Switches, VLANs, Routers)",
      labelEn: "IP Networking (Switches, VLANs, Routers)",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "hikvision",
      field: "hikvision",
      labelPt: "Ecossistema Hikvision (iVMS, AcuSense)",
      labelEn: "Hikvision Ecosystem (iVMS, AcuSense)",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "dahua",
      field: "dahua",
      labelPt: "Plataformas Dahua (DSS, SmartPSS)",
      labelEn: "Dahua Platforms (DSS, SmartPSS)",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "supervision",
      field: "supervision",
      labelPt: "Supervisão e Liderança de Técnicos",
      labelEn: "Supervision of Field Installation Teams",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "driving",
      field: "drivingLicence",
      labelPt: "Carta de Condução Válida",
      labelEn: "Valid Driving Licence",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "ai_analytics",
      field: "aiAnalytics",
      labelPt: "Analítica Perimetral e Câmaras com IA",
      labelEn: "AI Video Analytics & Tripwire",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "boq",
      field: "boqScopes",
      labelPt: "Elaboração de BoQs e Cadernos de Encargos",
      labelEn: "Preparation of BoQs & Scopes of Work",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
  ],
  cctv: [
    {
      id: "grade12",
      field: "grade12",
      labelPt: "Conclusão da 12.ª Classe",
      labelEn: "Grade 12 High School Completion",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "shifts",
      field: "shifts",
      labelPt: "Disponibilidade para Escala de Turnos (2D/2N/2F)",
      labelEn: "Shift Schedule Availability (2D/2N/2O)",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "experience",
      field: "experience",
      labelPt: "Experiência Prévia em CCTV ou Segurança",
      labelEn: "Prior CCTV or Security Experience",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "ai_usage",
      field: "ai",
      labelPt: "Capacidade de Utilização de Inteligência Artificial",
      labelEn: "Ability to Use Artificial Intelligence Tools",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
  ],
};
