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
  instructionPt?: string; // Form Question or candidate instruction prompt
  instructionEn?: string;
  evaluatorGuideline?: string; // Internal notes for recruiters
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
      instructionPt: "Quantos anos de experiência prática comprovada possui na instalação e manutenção de sistemas CCTV?",
      instructionEn: "How many years of proven hands-on experience do you have in CCTV installation and maintenance?",
      type: "number",
      mandatory: true,
      expectedValue: 1,
    },
    {
      id: "ip_cctv",
      field: "ipCctv",
      labelPt: "Sistemas CCTV IP e Protocolos Digitais",
      labelEn: "IP CCTV & Network Camera Protocols",
      instructionPt: "Possui experiência prática comprovada em câmaras IP, endereçamento de rede e protocolos ONVIF/RTSP?",
      instructionEn: "Do you have proven practical experience with IP cameras, network addressing and ONVIF/RTSP protocols?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "nvr_dvr",
      field: "nvrDvr",
      labelPt: "Configuração de NVRs/DVRs e Armazenamento",
      labelEn: "NVR/DVR Setup & Storage Sizing",
      instructionPt: "Sabe dimensionar armazenamento RAID e configurar NVRs e DVRs multi-canal?",
      instructionEn: "Can you size RAID storage and configure multi-channel NVRs and DVRs?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "networking",
      field: "networking",
      labelPt: "Redes IP (Switches, VLANs, Routers)",
      labelEn: "IP Networking (Switches, VLANs, Routers)",
      instructionPt: "Tem domínio prático de configuração de switches geridos, criação de VLANs de segurança e routers?",
      instructionEn: "Are you proficient in configuring managed switches, creating security VLANs, and routers?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "hikvision",
      field: "hikvision",
      labelPt: "Ecossistema Hikvision (iVMS, AcuSense)",
      labelEn: "Hikvision Ecosystem (iVMS, AcuSense)",
      instructionPt: "Possui experiência com o ecossistema Hikvision, iVMS-4200, Hik-Connect ou câmaras AcuSense / ColorVu?",
      instructionEn: "Do you have experience with Hikvision ecosystem, iVMS-4200, Hik-Connect, or AcuSense / ColorVu cameras?",
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
      instructionPt: "Possui experiência prática na instalação e configuração de plataformas Dahua (SmartPSS, DSS Express)?",
      instructionEn: "Do you have practical experience configuring Dahua platforms (SmartPSS, DSS Express)?",
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
      instructionPt: "Tem experiência em coordenação de técnicos em obra, planeamento diário e controlo de qualidade?",
      instructionEn: "Do you have experience supervising field technicians, daily planning, and quality control?",
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
      instructionPt: "Possui carta de condução válida e disponibilidade para conduzir viaturas técnicas da empresa?",
      instructionEn: "Do you have a valid driving licence and willingness to drive company technical vehicles?",
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
      instructionPt: "Já configurou regras analíticas de vídeo inteligente (Tripwire, Linha Virtual, Detecção Humano/Veículo)?",
      instructionEn: "Have you configured smart video analytics rules (Tripwire, Intrusion Zone, Human/Vehicle Detection)?",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
    {
      id: "remote_monitoring",
      field: "remoteMonitoring",
      labelPt: "Integração com Centrais de Monitorização Remota",
      labelEn: "Remote Monitoring Centre Integration",
      instructionPt: "Possui experiência na integração de CCTV com centrais de monitorização remota ou centros de comando?",
      instructionEn: "Do you have experience integrating CCTV with remote control rooms or command centres?",
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
      instructionPt: "Sabe realizar levantamentos técnicos no cliente e redigir listas de material (BoQ) e propostas técnicas?",
      instructionEn: "Can you perform site surveys and compile Bills of Quantities (BoQs) and scopes of work?",
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
      instructionPt: "Tem a 12ª Classe concluída com certificado escolar comprovativo?",
      instructionEn: "Have you completed Grade 12 with a valid completion certificate?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "shifts",
      field: "shifts",
      labelPt: "Disponibilidade para Escala de Turnos 12h (2D/2N/2F)",
      labelEn: "Shift Schedule Availability 12h (2D/2N/2O)",
      instructionPt: "Tem disponibilidade total para cumprir escala rotativa contínua de 12 horas (2 Dias, 2 Noites, 2 Folgas)?",
      instructionEn: "Are you fully available for continuous 12-hour rotating shifts (2 Days, 2 Nights, 2 Off)?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "experience",
      field: "experience",
      labelPt: "Experiência Prévia em CCTV ou Vigilância",
      labelEn: "Prior CCTV or Security Experience",
      instructionPt: "Possui experiência profissional prévia comprovada em salas de controlo de CCTV ou segurança patrimonial?",
      instructionEn: "Do you have prior proven professional experience in CCTV control rooms or physical security?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "ai_usage",
      field: "ai",
      labelPt: "Capacidade de Utilização de Inteligência Artificial",
      labelEn: "Ability to Use Artificial Intelligence Tools",
      instructionPt: "Tem facilidade e interesse em utilizar ferramentas modernas de inteligência artificial na rotina de trabalho?",
      instructionEn: "Are you comfortable and eager to use modern AI surveillance tools in daily operations?",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
  ],
  cctv_operator: [
    {
      id: "grade12",
      field: "grade12",
      labelPt: "Conclusão da 12.ª Classe",
      labelEn: "Grade 12 High School Completion",
      instructionPt: "Tem a 12ª Classe concluída com certificado escolar comprovativo?",
      instructionEn: "Have you completed Grade 12 with a valid completion certificate?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "shifts",
      field: "shifts",
      labelPt: "Disponibilidade para Escala de Turnos 12h (2D/2N/2F)",
      labelEn: "Shift Schedule Availability 12h (2D/2N/2O)",
      instructionPt: "Tem disponibilidade total para cumprir escala rotativa contínua de 12 horas (2 Dias, 2 Noites, 2 Folgas)?",
      instructionEn: "Are you fully available for continuous 12-hour rotating shifts (2 Days, 2 Nights, 2 Off)?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "experience",
      field: "experience",
      labelPt: "Experiência Prévia em CCTV ou Vigilância",
      labelEn: "Prior CCTV or Security Experience",
      instructionPt: "Possui experiência profissional prévia comprovada em salas de controlo de CCTV ou segurança patrimonial?",
      instructionEn: "Do you have prior proven professional experience in CCTV control rooms or physical security?",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "ai_usage",
      field: "ai",
      labelPt: "Capacidade de Utilização de Inteligência Artificial",
      labelEn: "Ability to Use Artificial Intelligence Tools",
      instructionPt: "Tem facilidade e interesse em utilizar ferramentas modernas de inteligência artificial na rotina de trabalho?",
      instructionEn: "Are you comfortable and eager to use modern AI surveillance tools in daily operations?",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
  ],
  operations: [
    {
      id: "management_exp",
      field: "managementExperience",
      labelPt: "Experiência em Gestão Operacional de Segurança (mínimo 3 anos)",
      labelEn: "Security Operations Management Experience (min 3 years)",
      type: "number",
      mandatory: true,
      expectedValue: 3,
    },
    {
      id: "incident_resp",
      field: "incidentResponse",
      labelPt: "Coordenação de Resposta a Incidentes Críticos",
      labelEn: "Critical Incident Response Coordination",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
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
  ],
  technical: [
    {
      id: "tech_support_exp",
      field: "techSupportExp",
      labelPt: "Experiência em Suporte Técnico de Hardware e Redes",
      labelEn: "Technical Hardware & Network Support Experience",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "troubleshooting",
      field: "troubleshooting",
      labelPt: "Diagnóstico Avançado de Falhas e Resolução de Problemas",
      labelEn: "Advanced Diagnostic Troubleshooting",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
  ],
  sales: [
    {
      id: "b2b_sales",
      field: "b2bExperience",
      labelPt: "Experiência em Vendas B2B de Segurança Eletrónica",
      labelEn: "B2B Electronic Security Systems Sales Experience",
      type: "boolean",
      mandatory: true,
      expectedValue: "yes",
    },
    {
      id: "boq",
      field: "boqScopes",
      labelPt: "Capacidade de Elaboração de Propostas Comerciais",
      labelEn: "Commercial Proposals & Scopes of Work",
      type: "boolean",
      mandatory: false,
      expectedValue: "yes",
      weight: 1,
    },
  ],
};
