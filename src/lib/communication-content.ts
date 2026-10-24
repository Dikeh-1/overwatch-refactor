import { formatSlotDisplay } from "./careers";
import sanitizeHtml from "sanitize-html";

export const BOOKING_TOKEN = "{{booking_link}}";
export const escapeMailText = (value: string) => value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
export function safeMailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p","div","br","strong","b","em","i","u","s","strike","span","font","a","ul","ol","li","blockquote","hr","h1","h2","h3"],
    allowedAttributes: { "*": ["style"], a: ["href","target","rel","data-booking-button","data-action-button","draggable"], font: ["face","size","color"] },
    allowedSchemes: ["http","https","mailto","tel"], allowProtocolRelative: false,
    allowedStyles: { "*": {
      color: [/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d\s.,%]+\)$/i,/^[a-z]+$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d\s.,%]+\)$/i,/^[a-z]+$/i],
      "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/], "font-family": [/^[a-z\s,"'-]+$/i],
      "text-align": [/^(left|right|center|justify)$/], "font-weight": [/^(bold|normal|[1-9]00)$/],
      "font-style": [/^(italic|normal)$/], "text-decoration": [/^(underline|line-through|none)(?:\s+(?:underline|line-through))*$/],
      padding: [/^[\d\s.pxemr%]+$/], margin: [/^[\d\s.pxemr%]+$/], "border-radius": [/^\d+px$/], display: [/^(inline-block|block|inline)$/], border: [/^[\d\s.pxemr%#a-z]+$/i], "border-width": [/^[\d]+px$/], "border-style": [/^(solid|dashed|dotted|none)$/], "border-color": [/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d\s.,%]+\)$/i,/^[a-z]+$/i]
    } },
    transformTags: { a: (_tag, attributes) => ({ tagName: "a", attribs: { ...attributes, rel: "noopener noreferrer" } }) }
  });
}
type Candidate = {
  id: string;
  name: string;
  role: string;
  testSlot?: string;
  testScore?: number | null;
  score?: number | null;
  nextPhaseToken?: string;
};

export function candidateVariables(text: string, candidate: Candidate, roleTitle: string, lang: "en" | "pt", html = false): string {
  const slot = (candidate.testSlot ? formatSlotDisplay(candidate.testSlot, lang) : "") || (lang === "en" ? "Not booked yet — choose a time using your booking link" : "Ainda não agendado — escolha um turno no seu link");
  const token = candidate.nextPhaseToken || candidate.id || "preview";
  const nextPhaseUrl = `https://www.overwatchmoz.com/${lang}/careers/next-phase/${encodeURIComponent(token)}`;
  const confirmAttendanceUrl = `${nextPhaseUrl}?choice=yes&mode=confirm`;
  const yesChoiceUrl = `${nextPhaseUrl}?choice=yes`;
  const noChoiceUrl = `${nextPhaseUrl}?choice=no`;

  const scoreVal = typeof candidate.testScore === "number" ? candidate.testScore : typeof candidate.score === "number" ? candidate.score : null;
  const scoreDisplay = scoreVal !== null ? `${scoreVal}%` : "";

  // HTML Buttons (bulletproof inline styled for email clients)
  const confirmButtonHtml = `<a data-action-button="true" href="${confirmAttendanceUrl}" target="_blank" style="display:inline-block;background-color:#0b1329;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">${lang === "en" ? "Confirm Attendance" : "Confirmar Presença"} →</a>`;
  const yesButtonHtml = `<a data-action-button="true" href="${yesChoiceUrl}" target="_blank" style="display:inline-block;background-color:#0b1329;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">${lang === "en" ? "Yes, I am interested" : "Sim, tenho interesse"}</a>`;
  const noButtonHtml = `<a data-action-button="true" href="${noChoiceUrl}" target="_blank" style="display:inline-block;color:#64748b;padding:8px 14px;text-decoration:underline;font-size:13px;">${lang === "en" ? "Decline / No interest" : "Não tenho interesse"}</a>`;
  const responseButtonsHtml = `<span style="display:inline-block;margin:14px 0;">${yesButtonHtml}&nbsp;&nbsp;${noButtonHtml}</span>`;

  const values: Record<string, string> = {
    name: candidate.name,
    candidate_name: candidate.name,
    role: roleTitle,
    role_title: roleTitle,
    score: scoreDisplay,
    test_score: scoreDisplay,
    next_phase_link: nextPhaseUrl,
    portal_link: nextPhaseUrl,
    confirm_button: html ? confirmButtonHtml : confirmAttendanceUrl,
    response_buttons: html ? responseButtonsHtml : `${yesChoiceUrl} | ${noChoiceUrl}`,
    yes_button: html ? yesButtonHtml : yesChoiceUrl,
    no_button: html ? noButtonHtml : noChoiceUrl,
    slot,
    test_slot: slot,
    booked_slot: slot,
    booked_test_slot: slot,
    booked_slot_data: slot,
    test_slot_date: slot,
    slot_date: slot,
    data_teste: slot,
    data_do_teste: slot,
    data_agendada: slot,
    turno: slot,
    turno_teste: slot,
    turno_agendado: slot,
    test_session: slot,
    session: slot,
    company: "Overwatch Moçambique",
    company_name: "Overwatch Moçambique",
    location: "Avenida Paulo Samuel Kankhomba, N.º 1948, Maputo",
    date: new Date().toLocaleDateString(lang === "en" ? "en-GB" : "pt-MZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Maputo" }),
  };

  return text.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}\}?/gi, (tokenMatch, key) => {
    const value = values[key.toLowerCase()];
    if (value === undefined) return tokenMatch;
    // Don't escape pre-built HTML button fragments
    if (html && (key.toLowerCase().endsWith("_button") || key.toLowerCase().endsWith("_buttons"))) {
      return value;
    }
    return html ? escapeMailText(value) : value;
  });
}
export function bookingButton(candidate: Candidate, lang: "en" | "pt", preview = false): string {
  const href = `https://www.overwatchmoz.com/${lang}/careers/test-invite/${encodeURIComponent(candidate.id)}`;
  return `<a data-booking-button="true" draggable="${preview ? "true" : "false"}" href="${href}" target="_blank" style="display:inline-block;background-color:#0b1329;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${lang === "en" ? "Choose your test date & time" : "Escolher data e hora do teste"} →</a>`;
}
export function renderStudioMessage(message: string, candidate: Candidate, roleTitle: string, lang: "en" | "pt", includeBooking: boolean, preview = false): string {
  let html = /<[a-z][\s\S]*>/i.test(message) ? safeMailHtml(message) : message.split(/\n\s*\n/).map(p => `<p>${escapeMailText(p).replace(/\n/g,"<br>")}</p>`).join("");
  html = candidateVariables(html, candidate, roleTitle, lang, true);
  return safeMailHtml(html.replace(/\{\{booking_link\}\}/g, () => includeBooking ? bookingButton(candidate, lang, preview) : ""));
}
export function studioScope(cohortId?: string, roleId?: string, recipientId?: string) { return `${cohortId || "current"}:${roleId || "all"}:${recipientId || "bulk"}`; }
export function messageBlocks(message: string): string[] {
  if (!/<[a-z][\s\S]*>/i.test(message)) return message.split(/\n\s*\n/);
  // Split complete top-level elements only. Splitting on every </p> breaks nested quotes/lists.
  const html = safeMailHtml(message), blocks: string[] = [];
  let depth = 0, start = 0;
  for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase(), closing = match[0].startsWith("</"), empty = ["br","hr"].includes(tag);
    if (!empty) depth = closing ? Math.max(0, depth - 1) : depth + 1;
    if (!depth) { const end = match.index! + match[0].length; blocks.push(html.slice(start,end)); start = end; }
  }
  if (start < html.length) blocks.push(html.slice(start));
  return blocks.filter(Boolean);
}
export function moveBookingToken(message: string, index: number): string {
  const blocks = messageBlocks(message.replace(/\{\{booking_link\}\}/g, ""));
  blocks.splice(Math.max(0, Math.min(blocks.length,index)), 0, /<[a-z][\s\S]*>/i.test(message) ? `<p>${BOOKING_TOKEN}</p>` : BOOKING_TOKEN);
  return blocks.join(/<[a-z][\s\S]*>/i.test(message) ? "" : "\n\n");
}

/** Preserve received/sent mail structure. The viewer additionally isolates it
 * in a sandbox with a restrictive CSP, preventing scripts and tracking loads. */
export function safeEmailDocument(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "font"],
    allowedAttributes: { "*": ["style", "align", "valign", "width", "height", "bgcolor"], a: ["href", "title", "target", "rel"], img: ["src", "alt", "width", "height", "style"], font: ["face", "size", "color"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "data"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
      // Brevo rewrites image URLs. Restore only our identified logo instead of
      // enabling all remote images (which would trigger an applicant's open pixel).
      img: (tagName, attributes) => ({ tagName, attribs: { ...attributes, ...(attributes.alt?.toLowerCase() === "overwatch" ? { src: "https://www.overwatchmoz.com/logo-white.png" } : {}) } }),
    },
  });
}
