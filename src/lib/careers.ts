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
  gatePassSentAt?: string;
  reminderSentAt?: string;
  attendedAt?: string;
  attendanceStatus?: "present" | "absent" | "late";
  previousTestSlot?: string;
  rebookingGrace?: {
    token: string;
    grantedAt: string;
    expiresAt?: string;
    usedAt?: string | null;
    previousSlot?: string;
    reason?: string;
    emailSentAt?: string;
    grantedBy?: string;
  };
};

export type RebookingGrace = NonNullable<Application["rebookingGrace"]>;
export const MAX_CV = 3 * 1024 * 1024;

export const DEFAULT_TEST_SLOTS = [
  "Segunda-feira, 21 de Setembro - 10h00",
  "Terça-feira, 22 de Setembro - 10h00",
  "Quarta-feira, 23 de Setembro - 10h00",
  "Quinta-feira, 24 de Setembro - 10h00",
] as const;

/**
 * Normalizes a test slot string to canonical form:
 * - Standardizes day names (e.g. "Segunda-feira")
 * - Normalizes Unicode en-dashes / em-dashes into standard ASCII hyphen " - "
 * - Normalizes time prefix and trims extra whitespace
 */
export function normalizeSlot(slot?: string | null): string {
  if (!slot) return "";
  let clean = slot
    .replace(/(Segunda|Terça|Quarta|Quinta|Sexta)[\u2013\u2014\-](feira)/gi, "$1-$2")
    .replace(/\s*[\u2013\u2014]\s*/g, " - ")
    .replace(/\s*-\s*(\d{1,2}(?:h|:)\d{2})/i, " - $1")
    .replace(/\s+/g, " ")
    .trim();

  // Safeguard: If somehow a day prefix was stripped or malformed (e.g. "-, 21 de Setembro" or ", 21 de Setembro")
  clean = clean.replace(/^[,\-\s]+(\d{1,2}\s+de\s+[a-zA-ZçÇ]+)/i, (match, p1) => {
    const day = parseInt(p1, 10);
    if (day === 21 || day === 28) return `Segunda-feira, ${p1}`;
    if (day === 22 || day === 29) return `Terça-feira, ${p1}`;
    if (day === 23 || day === 30) return `Quarta-feira, ${p1}`;
    if (day === 24) return `Quinta-feira, ${p1}`;
    if (day === 25) return `Sexta-feira, ${p1}`;
    if (day === 16) return `Quarta-feira, ${p1}`;
    if (day === 17) return `Quinta-feira, ${p1}`;
    if (day === 18) return `Sexta-feira, ${p1}`;
    return match;
  });

  return clean;
}

/** Check if a given slot is on Friday, 25 September (National Public Holiday in Mozambique) */
export function isFriday25Sept(slot?: string | null): boolean {
  if (!slot) return false;
  const norm = normalizeSlot(slot).toLowerCase();
  return (
    (norm.includes("sexta") || norm.includes("friday")) &&
    (norm.includes("25") || norm.includes("setembro") || norm.includes("september"))
  );
}

export function formatSlotDisplay(slot: string, l?: "en" | "pt" | boolean) {
  if (!slot) return "";
  const normalized = normalizeSlot(slot);
  const isPt = l === "pt" || l === true;
  if (isPt) return normalized;
  return normalized
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

/** Extract date-only display string (e.g. "Monday, 21 September" or "Segunda-feira, 21 de Setembro") */
export function formatSlotDateOnly(slot?: string | null, l?: "en" | "pt" | boolean): string {
  if (!slot) return "";
  const norm = normalizeSlot(slot);
  const datePart = norm.split(/\s+-\s+\d{1,2}(?:h|:)\d{2}/i)[0].trim();
  return formatSlotDisplay(datePart, l);
}

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  janeiro: 1,
  january: 1,
  jan: 1,
  fevereiro: 2,
  february: 2,
  feb: 2,
  março: 3,
  marco: 3,
  march: 3,
  mar: 3,
  abril: 4,
  april: 4,
  apr: 4,
  maio: 5,
  may: 5,
  junho: 6,
  june: 6,
  jun: 6,
  julho: 7,
  july: 7,
  jul: 7,
  agosto: 8,
  august: 8,
  aug: 8,
  setembro: 9,
  september: 9,
  set: 9,
  sept: 9,
  outubro: 10,
  october: 10,
  out: 10,
  oct: 10,
  novembro: 11,
  november: 11,
  nov: 11,
  dezembro: 12,
  december: 12,
  dez: 12,
  dec: 12,
};

/**
 * Parses any test slot string into its exact components: year, month (1-12), day (1-31), hour (0-23), minute (0-59).
 */
export function parseSlotComponents(slot?: string | null): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  if (!slot) return null;
  const s = slot.trim();

  // Try extracting year (e.g. 2026)
  const yearMatch = s.match(/\b(202\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;

  // Try extracting month
  let month: number | null = null;
  const monthMatch = s.match(
    /\b(Janeiro|January|Fevereiro|February|Março|Marco|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August|Setembro|September|Outubro|October|Novembro|November|Dezembro|December)\b/i
  );
  if (monthMatch) {
    const rawMonth = monthMatch[1].toLowerCase();
    month = MONTH_NAME_TO_INDEX[rawMonth] || null;
  }

  // ISO date fallback (YYYY-MM-DD)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const isoYear = parseInt(iso[1], 10);
    const isoMonth = parseInt(iso[2], 10);
    const isoDay = parseInt(iso[3], 10);
    return { year: isoYear, month: isoMonth, day: isoDay, hour: 10, minute: 0 };
  }

  // Try extracting day
  const day = getSlotDayNumber(s);
  if (!day) return null;

  // Default month if not found in text: September (9)
  if (!month) {
    month = 9;
  }

  // Try extracting time (e.g. 10h00, 10:00, 14h30, 10:00 AM)
  let hour = 10;
  let minute = 0;
  const timeMatch = s.match(/(\d{1,2})(?:h|:)(\d{2})(?:\s*(AM|PM))?/i);
  if (timeMatch) {
    let rawHour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10) || 0;
    const ampm = timeMatch[3]?.toUpperCase();
    if (ampm === "PM" && rawHour < 12) rawHour += 12;
    if (ampm === "AM" && rawHour === 12) rawHour = 0;
    hour = rawHour;
  }

  return { year, month, day, hour, minute };
}

/**
 * Accurately determines if a test slot's session has already concluded / passed in Maputo local time.
 */
export function isPastDateSlot(slot?: string | null, customRefDate?: Date): boolean {
  if (!slot) return false;
  const parsed = parseSlotComponents(slot);
  if (!parsed) return false;

  const now = getMaputoToday(customRefDate || new Date());

  if (parsed.year < now.year) return true;
  if (parsed.year > now.year) return false;

  if (parsed.month < now.month) return true;
  if (parsed.month > now.month) return false;

  if (parsed.day < now.day) return true;
  if (parsed.day > now.day) return false;

  // If same day: check if slot start time has already passed
  if (parsed.hour < now.hour) return true;
  if (parsed.hour === now.hour && parsed.minute <= now.minute) return true;

  return false;
}

/**
 * Checks if slot is scheduled for today (Maputo time).
 */
export function isSlotToday(slot?: string | null, customRefDate?: Date): boolean {
  if (!slot) return false;
  const parsed = parseSlotComponents(slot);
  if (!parsed) return false;
  const now = getMaputoToday(customRefDate || new Date());
  return parsed.year === now.year && parsed.month === now.month && parsed.day === now.day;
}

/**
 * Categorizes any slot dynamically relative to the current Monday–Sunday week.
 */
export function getSlotWeekCategory(
  slot?: string | null,
  customRefDate?: Date
): "past_week" | "this_week" | "next_week" | "future" {
  if (!slot) return "this_week";
  const parsed = parseSlotComponents(slot);
  if (!parsed) return "this_week";

  const now = getMaputoToday(customRefDate || new Date());
  const nowJsDate = new Date(now.year, now.month - 1, now.day);
  const jsDay = nowJsDate.getDay(); // 0 = Sun, 1 = Mon...
  const mondayOffset = (jsDay + 6) % 7;

  // Start of current week (Monday 00:00)
  const thisWeekMonday = new Date(now.year, now.month - 1, now.day - mondayOffset, 0, 0, 0);
  // End of current week (Sunday 23:59:59)
  const thisWeekSunday = new Date(now.year, now.month - 1, now.day - mondayOffset + 6, 23, 59, 59);

  // Next week (Monday 00:00 to Sunday 23:59:59)
  const nextWeekMonday = new Date(now.year, now.month - 1, now.day - mondayOffset + 7, 0, 0, 0);
  const nextWeekSunday = new Date(now.year, now.month - 1, now.day - mondayOffset + 13, 23, 59, 59);

  const slotDate = new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute);

  if (slotDate < thisWeekMonday) return "past_week";
  if (slotDate <= thisWeekSunday) return "this_week";
  if (slotDate <= nextWeekSunday) return "next_week";
  return "future";
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
export function getMaputoToday(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Maputo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "0", 10);

  const isBeforeNineAm = hour < 9;

  let countdownString = "";
  if (isBeforeNineAm) {
    const totalSecondsNow = hour * 3600 + minute * 60 + second;
    const targetSeconds = 9 * 3600; // 09:00:00 AM
    const diff = Math.max(0, targetSeconds - totalSecondsNow);
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    countdownString = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

  return {
    day,
    month,
    year,
    hour,
    minute,
    second,
    isBeforeNineAm,
    countdownString,
    timeString,
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export const getMaputoTime = getMaputoToday;


