export const roles = [
  {
    id: "cctv_technical_manager",
    en: "CCTV Installation & Technical Manager",
    pt: "Gestor Técnico e Instalação de CCTV",
    open: true,
  },
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

export type Role = {
  id: string;
  en: string;
  pt: string;
  open: boolean;
  department?: string;
  descriptionEn?: string;
  descriptionPt?: string;
  screeningRules?: any[];
  activeCohortId?: string | null;
  pipelineStages?: string[];
};
export const stages = [
  "new",
  "reviewing",
  "screening",
  "shortlisted",
  "test_invited",
  "test_booked",
  "tested",
  "next_phase_selected",
  "next_phase_invited",
  "awaiting_response",
  "interest_confirmed",
  "interest_declined",
  "interview",
  "training",
  "hired",
  "not_advancing",
  "withdrawn",
  "no_show",
  "disqualified",
  "rejected",
  "archived",
] as const;

export type PipelineStage = (typeof stages)[number];

export interface CommunicationRecord {
  id: string;
  type: "convocation" | "confirmation" | "gate_pass" | "reminder" | "next_phase_invite" | "next_phase_confirmation" | "next_phase_closure" | "custom" | "apology";
  subject: string;
  bodySnippet?: string;
  recipient: string;
  sentAt: string;
  status: "sent" | "delivered" | "failed";
  sender?: string;
  preview?: boolean;
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  action: string;
  actor?: string;
  details?: string;
}

export type ArchiveReason =
  | "Below Test Threshold"
  | "Not Selected for Next Phase"
  | "No Show"
  | "Candidate Withdrew"
  | "Declined Next Phase"
  | "Outside Mozambique"
  | "Outside Maputo Region"
  | "Duplicate"
  | "Recruitment Closed"
  | "Other"
  | (string & {});

export type ScreeningEvaluationResult = {
  passedMandatory: boolean;
  failedReasons: string[];
  failedReasonsPt?: string[];
  mandatoryScore?: number;
  mandatoryTotal?: number;
  preferredScore: number;
  preferredTotal: number;
  matchPercentage: number;
  evaluatedAt: string;
  details?: Array<{ key: string; label: string; passed: boolean; mandatory: boolean }>;
};

export type Application = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  whatsapp: string;
  role: string;
  cohortId?: string;
  locale: "en" | "pt";
  // CCTV Operator fields (optional for other roles)
  grade12?: "yes" | "no";
  sex?: "female" | "male";
  ai?: "yes" | "no";
  experience?: "yes" | "no";
  lastProfession?: string;
  shifts?: "yes" | "no";
  coverLetter?: string;
  cvName: string;
  cvType: string;
  cvSize: number;
  status: PipelineStage;
  // Technical / Structured Screening fields
  currentLocation?: string;
  yearsCctvExperience?: string;
  ipCctv?: "yes" | "no";
  analogueCctv?: "yes" | "no";
  hikvision?: "yes" | "no";
  dahua?: "yes" | "no";
  nvrDvr?: "yes" | "no";
  networking?: "yes" | "no";
  structuredCabling?: "yes" | "no";
  electricalUps?: "yes" | "no";
  troubleshooting?: "yes" | "no";
  supervision?: "yes" | "no";
  drivingLicence?: "yes" | "no";
  aiAnalytics?: "yes" | "no";
  remoteMonitoring?: "yes" | "no";
  boqScopes?: "yes" | "no";
  startDate?: string;
  salaryExpectation?: string;
  largestProjectDescription?: string;
  technicalData?: Record<string, any>;
  screeningRulesApplied?: import("./careers-models").ScreeningRule[];
  screeningResult?: ScreeningEvaluationResult;
  screeningScore?: number;
  testScore?: number;
  score?: number;
  nextPhaseStatus?: "selected" | "invited" | "confirmed" | "declined" | "not_advancing";
  nextPhaseToken?: string;
  nextPhaseInvitedAt?: string;
  nextPhaseRespondedAt?: string;
  nextPhaseResponse?: "yes" | "no";
  nextPhaseResponseOption?: string;
  archiveReason?: ArchiveReason;
  trainingGroupId?: string;
  trainingGroup?: string;
  trainingBookedAt?: string;
  trainingStatus?: "selected" | "invited" | "booked" | "attended" | "completed";
  communications?: CommunicationRecord[];
  activityLog?: ActivityRecord[];
  bookingLinkOpenedAt?: string;
  invitedAt?: string;
  invitedSlots?: string[];
  testSlot?: string;
  testBookedAt?: string;
  confirmationSentAt?: string;
  gatePassSentAt?: string;
  reminderSentAt?: string;
  attendedAt?: string;
  attendedBy?: string;
  attendanceStatus?: "present" | "absent" | "late";
  historicalAttendanceConfirmed?: boolean;
  attendanceUpdatedAt?: string;
  historicalRecordedAttendanceStatus?: "present" | "absent" | "late";
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
  customFields?: Record<string, any>;
  [key: string]: any;
};

export type RebookingGrace = NonNullable<Application["rebookingGrace"]>;
export const MAX_CV = 3 * 1024 * 1024;

export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("258") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+258${digits}`;
  }
  if (raw.startsWith("+")) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : "";
}

export function formatPhoneDisplay(raw?: string | null): string {
  const norm = normalizePhone(raw);
  if (norm.startsWith("+258") && norm.length === 13) {
    return `+258 ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`;
  }
  return raw || "";
}

export interface NextPhaseCandidateSeed {
  name: string;
  score: number;
  matchedId?: string;
}

export const APPROVED_NEXT_PHASE_15: NextPhaseCandidateSeed[] = [
  { name: "Artimiza André Manuel Vilanculos", score: 93, matchedId: "e7352e38-6608-4fe5-a6c5-cf5251912901" },
  { name: "Isabel Paulo", score: 91, matchedId: "3cbac31c-b82d-44d8-a702-372f1011b101" },
  { name: "Nádia Emília Calisto Jalane", score: 91, matchedId: "bc3d929d-e09e-44c1-9129-d29ac1e4811c" },
  { name: "Denize Maura Cuinica", score: 90, matchedId: "b0c66d1e-c918-4de2-8cec-f6333e5196c2" },
  { name: "Ivânia Zacarias Simbine", score: 90, matchedId: "4d49be41-f6dd-4792-bda6-88a7b5ec57e9" },
  { name: "Jana Sheinil Mugalela", score: 90, matchedId: "5b009156-bc7a-43e4-b619-dcb728543589" },
  { name: "Arminda Martins Guambe", score: 89, matchedId: "a64edc70-52ef-4993-b646-5a962b5aadcc" },
  { name: "Dulce Filomena Ricardo Massango", score: 89, matchedId: "c15f8303-f3af-487d-8a37-eae13a9984af" },
  { name: "Isaura José Vilanculos", score: 88, matchedId: "c39b7cde-a15d-4f26-a681-ef78a9a63621" },
  { name: "Orquidia Mabasso", score: 88, matchedId: "b912a272-18d8-4ed2-a097-cb00860db869" },
  { name: "Palmira João Mordinho", score: 87, matchedId: "7e04bfcd-12c5-408b-8cb8-46482e1e9499" },
  { name: "Lindica Chiluane", score: 86, matchedId: "e0a12b34-86ff-4c22-b912-lindica86chiluane" },
  { name: "Érica Khossa", score: 85, matchedId: "64827472-1369-4879-b045-7459da72daeb" },
  { name: "Cinelia Machaieie", score: 81, matchedId: "f5229a5e-ca36-4b2a-b9b3-d97ba319ea90" },
  { name: "Marcia Emilia Jacinto Mavie", score: 81, matchedId: "7a2d84c8-be8f-4470-9eaa-1b8f11052b81" },
  { name: "Cátia Saidino Hargas", score: 78, matchedId: "5f4c6dc7-3d57-451c-a3ca-9a2067fd83f4" },
  { name: "Edna Joaquim", score: 77, matchedId: "e3592560-2a09-4861-9839-3da5ebe549a2" },
  { name: "Ilódia da Ana Lourenço", score: 76, matchedId: "3dc4b7cd-9bed-4e04-9461-5ff2e7f96f76" },
  { name: "Claudina Chaima", score: 75, matchedId: "0df8c415-dbbf-438d-b177-a506b220067b" },
  { name: "Gleid Elaine Munguambe", score: 75, matchedId: "599f2e08-2338-406e-9cef-51f43d89d4aa" },
  { name: "Yumina Alzira Mahumane", score: 73, matchedId: "4dcbf0aa-89d4-4ca9-b944-1875cb99308c" },
];
export const APPROVED_NEXT_PHASE_CANDIDATES = APPROVED_NEXT_PHASE_15;

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

/** Check if a given slot is specifically on Friday, 25 September (National Public Holiday in Mozambique) */
export function isFriday25Sept(slot?: string | null): boolean {
  if (!slot) return false;
  const date = parseSlotComponents(slot);
  return Boolean(date && date.month === 9 && date.day === 25);
}

export function formatSlotDisplay(slot: string, l?: "en" | "pt" | boolean) {
  if (!slot) return "";
  const normalized = normalizeSlot(slot);
  const isPt = l === "pt" || l === true;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    const parts = parseSlotComponents(normalized);
    if (parts) {
      const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
      return new Intl.DateTimeFormat(isPt ? "pt-MZ" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date) + " (Maputo)";
    }
  }
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
export function parseSlotComponents(slot?: string | null): { year: number; month: number; day: number; hour: number; minute: number } | null {
  if (!slot?.trim()) return null;
  const text = slot.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const namedMonth = text.match(/\b(Janeiro|January|Fevereiro|February|Março|Marco|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August|Setembro|September|Outubro|October|Novembro|November|Dezembro|December)\b/i);
  let year: number, month: number, day: number;
  if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
  else if (dmy) { year = Number(dmy[3]); month = Number(dmy[2]); day = Number(dmy[1]); }
  else if (namedMonth) {
    year = Number(text.match(/\b(20\d{2})\b/)?.[1] || 2026); // Legacy September invitations omitted the year.
    month = MONTH_NAME_TO_INDEX[namedMonth[1].toLowerCase()];
    day = getSlotDayNumber(text) || 0;
  } else return null;
  const time = text.match(/(?:T|\s|[–—])?(\d{1,2})(?:h|:)(\d{2})(?:\s*(AM|PM))?/i);
  let hour = time ? Number(time[1]) : 10;
  const minute = time ? Number(time[2]) : 0;
  if (time?.[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (time?.[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
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
 * Automatically invalidates or closes booking for any test slot 1 day prior to the scheduled date.
 * (e.g. A slot on Monday 26th expires by 11:59:59 PM Sunday 25th in Maputo time Africa/Maputo).
 * From 00:00:00 on the day of the slot onwards, applicants can no longer book that slot.
 */
export function isSlotBookingExpired(slot?: string | null, customRefDate?: Date): boolean {
  if (!slot) return true;
  const parsed = parseSlotComponents(slot);
  if (!parsed) return true;

  const now = getMaputoToday(customRefDate || new Date());

  if (now.year > parsed.year) return true;
  if (now.year < parsed.year) return false;

  if (now.month > parsed.month) return true;
  if (now.month < parsed.month) return false;

  // On the day of the slot or any day after, the slot booking has expired (cut-off: 11:59:59 PM day prior)
  if (now.day >= parsed.day) return true;

  return false;
}

/**
 * Determines the start date for a training group, from explicit startDate (YYYY-MM-DD) or parsing schedule string.
 */
export function getTrainingGroupStartDate(group?: { startDate?: string; schedule?: string } | null): { year: number; month: number; day: number } | null {
  if (!group) return null;
  if (group.startDate && /^\d{4}-\d{2}-\d{2}$/.test(group.startDate)) {
    const [y, m, d] = group.startDate.split("-").map(Number);
    return { year: y, month: m, day: d };
  }
  if (!group.schedule) return null;

  const ptMonths: Record<string, number> = {
    janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };
  const enMonths: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, apr: 4, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };

  const str = group.schedule.toLowerCase();

  // Match e.g. "(\d{1,2})[\s,]+.*(?:de\s+)?([a-zçãé]+)" e.g. "2, 3 e 4 de Novembro" or "2 de Novembro"
  const dayMonthMatch = str.match(/(?:^|[^\d])(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*\d{1,2})*(?:\s+e\s+\d{1,2})?\s+(?:de\s+)?([a-zçãé]+)/i);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const rawMonth = dayMonthMatch[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const month = ptMonths[rawMonth] || enMonths[rawMonth];
    if (month && day >= 1 && day <= 31) {
      return { year: 2026, month, day };
    }
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) };
  }

  // Match DD/MM/YYYY
  const ddmmyyyy = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    return { year: Number(ddmmyyyy[3]), month: Number(ddmmyyyy[2]), day: Number(ddmmyyyy[1]) };
  }

  return null;
}

/**
 * Automatically invalidates or closes booking for any training group 1 day prior to its scheduled start date.
 * (e.g. Training starting Monday 2nd Nov expires by 11:59:59 PM Sunday 1st Nov in Maputo time).
 */
export function isTrainingGroupBookingExpired(group?: { startDate?: string; schedule?: string } | null, customRefDate?: Date): boolean {
  if (!group) return false;
  const parsed = getTrainingGroupStartDate(group);
  if (!parsed) return false;

  const now = getMaputoToday(customRefDate || new Date());

  if (now.year > parsed.year) return true;
  if (now.year < parsed.year) return false;

  if (now.month > parsed.month) return true;
  if (now.month < parsed.month) return false;

  if (now.day >= parsed.day) return true;

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

  const hour12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const timeString = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")} ${ampm}`;

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

/**
 * Professional Portuguese / International Name Title-Casing.
 * Formats "marven combane" => "Marven Combane", "ANA DE SOUSA" => "Ana de Sousa", etc.
 * Preserves standard lowercase prepositions in Portuguese: da, de, do, das, dos, e.
 */
export function formatCandidateName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.toLowerCase().split(/\s+/);
  const lowerPrepositions = new Set(["de", "da", "do", "das", "dos", "e"]);
  return parts
    .map((word, index) => {
      if (index > 0 && lowerPrepositions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}



