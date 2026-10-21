import type { CareerCohort } from "./careers-models";

/** Cycle dates are interpreted in the business timezone, never the viewer's timezone. */
export function cycleMonth(date: string, lang: "en" | "pt"): string {
  const value = new Date(date);
  if (!date || !Number.isFinite(value.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-MZ", {
    month: "long", year: "numeric", timeZone: "Africa/Maputo",
  }).format(value);
}

export function cycleLabel(cohort: Pick<CareerCohort, "name" | "openedAt" | "closedAt" | "unassigned">,
  role: { en: string; pt: string }, lang: "en" | "pt"): string {
  const title = lang === "en" ? role.en || role.pt : role.pt || role.en;
  if (cohort.unassigned) return `${title} — ${lang === "en" ? "Unassigned records / review" : "Registos sem lote / revisão"}`;
  // Older cohorts stored a month only in their Portuguese title. Preserve that
  // historical period when there is no reliable closure timestamp.
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const historical = cohort.name?.toLowerCase().match(/(?:lote\s+)?(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(\d{4})/);
  const date = cohort.closedAt || (historical ? `${historical[2]}-${String(months.indexOf(historical[1]) + 1).padStart(2, "0")}-15T12:00:00Z` : cohort.openedAt);
  const period = cycleMonth(date, lang);
  return `${title} — ${lang === "en" ? "Recruitment cycle" : "Lote"}${period ? ` ${period}` : ""}`;
}
