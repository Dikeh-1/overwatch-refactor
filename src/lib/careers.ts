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
  "archived",
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
  invitedSlots?: string[];
  testSlot?: string;
  testBookedAt?: string;
  confirmationSentAt?: string;
  attendedAt?: string;
  attendanceStatus?: "present" | "absent" | "late";
};
export const MAX_CV = 3 * 1024 * 1024;

export const DEFAULT_TEST_SLOTS = [
  "Segunda-feira, 21 de Setembro - 10h00",
  "Terça-feira, 22 de Setembro - 10h00",
  "Quarta-feira, 23 de Setembro - 10h00",
  "Quinta-feira, 24 de Setembro - 10h00",
  "Sexta-feira, 25 de Setembro - 10h00",
] as const;

export function formatSlotDisplay(slot: string, l?: "en" | "pt" | boolean) {
  if (!slot) return "";
  const isPt = l === "pt" || l === true;
  if (isPt) return slot;
  return slot
    .replace("Segunda-feira", "Monday")
    .replace("Terça-feira", "Tuesday")
    .replace("Quarta-feira", "Wednesday")
    .replace("Quinta-feira", "Thursday")
    .replace("Sexta-feira", "Friday")
    .replace("Sábado", "Saturday")
    .replace("Domingo", "Sunday")
    .replace("de Setembro", "September")
    .replace("de Outubro", "October")
    .replace("de Novembro", "November")
    .replace("de Dezembro", "December")
    .replace("de Janeiro", "January")
    .replace("de Fevereiro", "February")
    .replace("de Março", "March")
    .replace("de Abril", "April")
    .replace("de Maio", "May")
    .replace("de Junho", "June")
    .replace("de Julho", "July")
    .replace("de Agosto", "August")
    .replace(/(\d{1,2})h(\d{2})/, (_, h, m) => {
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    });
}
