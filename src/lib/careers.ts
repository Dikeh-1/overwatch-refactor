export const roles = [
  { id: "cctv", en: "CCTV Operator", pt: "Operadora de CCTV", open: true },
  {
    id: "operations",
    en: "Security Operations Manager",
    pt: "Gestor de Operações de Segurança",
    open: false,
  },
  {
    id: "technical",
    en: "Technical Support Specialist",
    pt: "Especialista de Suporte Técnico",
    open: false,
  },
  {
    id: "sales",
    en: "Sales & Business Development",
    pt: "Vendas e Desenvolvimento de Negócios",
    open: false,
  },
];
export type Role = (typeof roles)[number];
export const stages = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
] as const;
export type Application = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  whatsapp: string;
  role: string;
  locale: "en" | "pt";
  grade12: "yes" | "no";
  sex: "female" | "male";
  ai: "yes" | "no";
  experience: "yes" | "no";
  lastProfession: string;
  shifts: "yes" | "no";
  coverLetter?: string;
  cvName: string;
  cvType: string;
  cvSize: number;
  status: (typeof stages)[number];
  invitedAt?: string;
  testSlot?: string;
  testBookedAt?: string;
};
export const MAX_CV = 3 * 1024 * 1024;

export const DEFAULT_TEST_SLOTS = [
  "Quarta-feira, 16 de Setembro – 10h00",
  "Quinta-feira, 17 de Setembro – 10h00",
  "Sexta-feira, 18 de Setembro – 10h00",
] as const;
