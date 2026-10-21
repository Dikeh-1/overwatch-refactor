/** Quote CSV fields and prevent spreadsheet formula execution from applicant input. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
