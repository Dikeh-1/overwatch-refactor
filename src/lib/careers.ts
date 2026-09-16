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

/**
 * Extract numeric day of the month from any test slot string (e.g. "Quarta-feira, 16 de Setembro – 10h00" => 16).
 * Robust across Portuguese, English, ISO dates, and varying punctuation (hyphens, en-dashes, em-dashes).
 */
export function getSlotDayNumber(slot?: string | null): number | null {
  if (!slot) return null;
  const s = slot.trim();

  // ISO date: 2026-09-16
  const iso = s.match(/^\d{4}-\d{2}-(\d{2})/);
  if (iso) return parseInt(iso[1], 10);

  // DMY: 16/09/2026 or 16-09-2026
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})/);
  if (dmy) return parseInt(dmy[1], 10);

  // Day followed by Month (Portuguese or English, e.g. "16 de Setembro", "16 September", "16th September")
  const dayMonth = s.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:de\s*)?(?:Setembro|September|Outubro|October|Novembro|November|Dezembro|December|Janeiro|January|Fevereiro|February|Março|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August)/i
  );
  if (dayMonth) return parseInt(dayMonth[1], 10);

  // Month followed by Day (e.g. "September 16", "Sept 16")
  const monthDay = s.match(
    /(?:Setembro|September|Outubro|October|Novembro|November|Dezembro|December|Janeiro|January|Fevereiro|February|Março|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August)\s*(\d{1,2})/i
  );
  if (monthDay) return parseInt(monthDay[1], 10);

  // Generic fallback: match standard slot day like "Quarta-feira, 16 ..." or "16 de..."
  const generic = s.match(/(?:^|[^\d])(\d{1,2})(?:\s*de\s*|\s+[-–—]|\s+|$)/);
  if (generic) {
    const num = parseInt(generic[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 31) return num;
  }

  return null;
}

/**
 * Get current date & time components in Mozambique / Maputo timezone (Africa/Maputo, UTC+2 / CAT).
 * Uses Intl.DateTimeFormat with formatToParts to guarantee exact numeric values across any server environment.
 */
export function getMaputoToday() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Maputo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  return {
    day,
    month,
    year,
    hour,
    minute,
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}
