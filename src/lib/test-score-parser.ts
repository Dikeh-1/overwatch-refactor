import * as XLSX from "xlsx";
import { type Application } from "./careers";

export type ParsedScoreRecord = {
  name?: string;
  email?: string;
  phone?: string;
  rawScore: any;
  score: number; // 0-100
  nextPhaseSelected?: boolean;
  decisionRaw?: string;
  sourceLine?: string;
};

export type CandidateMatch = {
  candidate: Application;
  record: ParsedScoreRecord;
  score: number;
  nextPhaseSelected: boolean;
  matchType: "email" | "phone" | "name_exact" | "name_fuzzy";
  hasCorrection?: boolean;
  correctionDetail?: string;
};

export type UnmatchedRecord = {
  record: ParsedScoreRecord;
  reason: string;
};

export type MatchResults = {
  matched: CandidateMatch[];
  unmatched: UnmatchedRecord[];
};

/**
 * Normalizes text for comparison (removes accents, punctuation, extra spaces, lowercase)
 */
export function normalizeText(s?: string | null): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast Levenshtein distance string similarity score between 0 and 1
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const la = a.length,
    lb = b.length;
  const maxL = Math.max(la, lb);
  if (maxL === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= lb; i++) matrix[i] = [i];
  for (let j = 0; j <= la; j++) matrix[0][j] = j;

  for (let i = 1; i <= lb; i++) {
    for (let j = 1; j <= la; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return 1 - matrix[lb][la] / maxL;
}

/**
 * Checks if a string or value indicates an affirmative selection/advance to Next Phase
 * Supports Portuguese, English, and numeric/boolean flags.
 */
export function isAffirmativeSelection(val: any): boolean {
  if (val === true || val === 1 || val === "1") return true;
  if (!val) return false;
  const s = normalizeText(String(val));
  return /^(sim|s|yes|y|aprovado|aprovada|approved|passou|passa|passed|pass|avanca|avancar|advance|advancing|selecionado|selecionada|selected|classificado|classificada|qualificado|qualificada|apto|apta|admitido|admitida|true|verdadeiro)$/i.test(
    s
  );
}

/**
 * Normalizes phone numbers to standard 9-digit format (e.g. 841234567)
 */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // Mozambique numbers start with 258 or directly 82/83/84/85/86/87
  if (digits.startsWith("258") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return digits;
}

/**
 * Extracts and sanitizes a numeric test score (0 - 100)
 */
export function sanitizeScore(raw: any): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // If entered as a decimal between 0 and 1 (e.g. 0.85 = 85%)
    if (raw > 0 && raw <= 1) return Math.round(raw * 100);
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  if (!raw) return null;
  const str = String(raw).trim();

  // Fraction notation (e.g. "17/20", "85/100", "9/10")
  const fracMatch = str.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1].replace(",", "."));
    const den = parseFloat(fracMatch[2].replace(",", "."));
    if (den > 0) {
      return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
    }
  }

  // Percentage or standard number (including negative values to allow clamping to 0)
  const numMatch = str.match(/(-?\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(",", "."));
    if (Number.isFinite(val)) {
      return Math.max(0, Math.min(100, Math.round(val)));
    }
  }

  return null;
}

/**
 * Parses tabular rows from Excel (.xlsx, .xls) or CSV buffers
 * Detects candidate names, emails, phones, scores, and Next Phase / Selection statuses
 * in both Portuguese and English.
 */
export function parseSpreadsheetBuffer(buffer: Buffer): ParsedScoreRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return [];
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rawRows || rawRows.length === 0) return [];

  const results: ParsedScoreRecord[] = [];

  for (const row of rawRows) {
    if (typeof row !== "object" || row === null) continue;
    const keys = Object.keys(row);

    // 1. Identify Name (English & Portuguese)
    let name: string | undefined;
    const nameKey = keys.find((k) => {
      const nk = normalizeText(k);
      return (
        /^(candidato|candidata|candidate|nome|name|full name|nome completo|nome do candidato)$/i.test(nk) ||
        /(nome|name|candidat)/i.test(nk)
      );
    });
    if (nameKey && row[nameKey]) name = String(row[nameKey]).trim();

    // 2. Identify Email (English & Portuguese)
    let email: string | undefined;
    const emailKey = keys.find((k) => {
      const nk = normalizeText(k);
      return /(email|e mail|correio|correio electronico)/i.test(nk);
    });
    if (emailKey && row[emailKey]) {
      const match = String(row[emailKey]).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) email = match[0].toLowerCase().trim();
    }

    // 3. Identify Phone / WhatsApp (English & Portuguese)
    let phone: string | undefined;
    const phoneKey = keys.find((k) => {
      const nk = normalizeText(k);
      return /(phone|tel|telef|whatsapp|cel|celular|contacto|contato)/i.test(nk);
    });
    if (phoneKey && row[phoneKey]) {
      phone = normalizePhone(String(row[phoneKey]));
    }

    // 4. Identify Score (English & Portuguese)
    let rawScore: any;
    const scoreKey = keys.find((k) => {
      const nk = normalizeText(k);
      return (
        /^(score|nota|pontuacao|resultado|mark|classificacao|teste|aptidao|grade)/i.test(nk) ||
        /(score|nota|pontua|result)/i.test(nk)
      );
    });
    if (scoreKey) {
      rawScore = row[scoreKey];
    } else {
      // Fallback: look for any column value that parses as a valid score
      for (const k of keys) {
        if (k === nameKey || k === emailKey || k === phoneKey) continue;
        const s = sanitizeScore(row[k]);
        if (s !== null) {
          rawScore = row[k];
          break;
        }
      }
    }

    // 5. Identify Next Phase / Selection Decision (Portuguese & English)
    let nextPhaseSelected = false;
    let decisionRaw: string | undefined;
    const decisionKey = keys.find((k) => {
      const nk = normalizeText(k);
      return /^(proxima fase|fase seguinte|next phase|decisao|decision|aprovado|aprovada|approved|pass|passed|selecionado|selecionada|selected|qualificado|qualificada|classificado|classificada|admissao|avancar|avanca|status|estado|resultado final)/i.test(
        nk
      );
    });
    if (decisionKey && row[decisionKey] !== undefined && row[decisionKey] !== "") {
      decisionRaw = String(row[decisionKey]).trim();
      nextPhaseSelected = isAffirmativeSelection(decisionRaw);
    } else {
      // Check observation / notes column
      const obsKey = keys.find((k) => /(obs|observacao|notas|notes|comentarios|comments)/i.test(normalizeText(k)));
      if (obsKey && row[obsKey]) {
        const obsText = String(row[obsKey]);
        if (
          /(proxima fase|next phase|aprovado|aprovada|approved|selecionado|selecionada|selected|passou|avanca)/i.test(
            normalizeText(obsText)
          )
        ) {
          nextPhaseSelected = true;
          decisionRaw = obsText.trim();
        }
      }
    }

    const score = sanitizeScore(rawScore);
    if (score !== null && (name || email || phone)) {
      results.push({
        name,
        email,
        phone,
        rawScore,
        score,
        nextPhaseSelected,
        decisionRaw,
        sourceLine: JSON.stringify(row),
      });
    }
  }

  return results;
}

/**
 * Parses lines from a PDF buffer by extracting text
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedScoreRecord[]> {
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const rawText = typeof textResult === "string" ? textResult : (textResult?.text || "");

    const lines = rawText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const results: ParsedScoreRecord[] = [];

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const phoneRegex = /(?:(?:\+?258\s*)?(8[2-7]\d{7}))/;
    const scoreRegex = /(?:\b|\s)(\d{1,3}(?:[.,]\d+)?)(?:\s*(?:%|\/\s*(?:100|20|10))\b|\b)/;
    const decisionRegex = /(?:\[?(aprovad[oa]|passed|pass|pr[oó]xima\s*fase|next\s*phase|selecionad[oa]|selected|apto|apta|avan[cç]a)\]?)/i;

    for (const line of lines) {
      // Ignore common header lines
      if (/^(nome|name|candidato|email|score|nota|page|p[aá]gina|overwatch)/i.test(line)) continue;

      let email: string | undefined;
      const emMatch = line.match(emailRegex);
      if (emMatch) email = emMatch[1].toLowerCase();

      let phone: string | undefined;
      const phMatch = line.match(phoneRegex);
      if (phMatch) phone = normalizePhone(phMatch[1]);

      let score: number | null = null;
      let rawScore: any;
      const scMatch = line.match(scoreRegex);
      if (scMatch) {
        rawScore = scMatch[1];
        score = sanitizeScore(scMatch[0]);
      }

      let nextPhaseSelected = false;
      let decisionRaw: string | undefined;
      const decMatch = line.match(decisionRegex);
      if (decMatch) {
        decisionRaw = decMatch[1];
        nextPhaseSelected = isAffirmativeSelection(decisionRaw);
      }

      if (score !== null) {
        // Strip out email, phone, decision and score from line to extract name
        let cleanName = line
          .replace(emailRegex, " ")
          .replace(phoneRegex, " ")
          .replace(scoreRegex, " ")
          .replace(decisionRegex, " ")
          .replace(/[|,:;\t\-\(\)]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Strip leading row numbers (e.g. "1.", "1 -", "01 ")
        cleanName = cleanName.replace(/^\d+[\s\.\-]+/, "").trim();

        if (cleanName.length > 2 || email || phone) {
          results.push({
            name: cleanName.length > 2 ? cleanName : undefined,
            email,
            phone,
            rawScore,
            score,
            nextPhaseSelected,
            decisionRaw,
            sourceLine: line,
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.warn("PDF parse fallback triggered:", err);
    return [];
  }
}

/**
 * Universal dispatcher parsing CSV, XLSX, XLS, or PDF
 */
export async function parseScoresFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedScoreRecord[]> {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") {
    return parsePdfBuffer(buffer);
  }
  // XLSX, XLS, CSV are all natively read by XLSX
  return parseSpreadsheetBuffer(buffer);
}

/**
 * Match parsed records against database candidates
 *
 * Built-in safeguards:
 * 1. Anti-mixing: If multiple candidates share an identical or ambiguous name, do not guess. Flag ambiguity!
 * 2. Anti-duplication: If the file has multiple rows for the same candidate or duplicate emails/phones, flag duplication!
 * 3. Typo-tolerant correction: Recovers candidates when there is a typo in email, phone or name using the available DB record.
 * 4. Cross-role diagnosis: Distinguishes candidates outside this role/pipeline (e.g. CCO) or archived/disqualified candidates.
 */
export function matchScoresToCandidates(
  records: ParsedScoreRecord[],
  candidates: Application[],
  allDatabaseCandidates?: Application[],
  lang: "pt" | "en" = "en"
): MatchResults {
  const loc = (en: string, pt: string) => (lang === "pt" ? pt : en);
  const matched: CandidateMatch[] = [];
  const unmatched: UnmatchedRecord[] = [];
  const matchedCandidateIds = new Set<string>();

  // Track seen identifiers within the uploaded file to flag duplicate entries
  const seenFileEmails = new Set<string>();
  const seenFilePhones = new Set<string>();

  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];
    const rowNum = idx + 1;

    // Detect immediate duplicate identity inside the uploaded file itself
    if (record.email) {
      const emailLower = record.email.toLowerCase().trim();
      if (seenFileEmails.has(emailLower)) {
        unmatched.push({
          record,
          reason: loc(
            `Duplicate in file (Row ${rowNum}): Email "${record.email}" appears more than once. Only the first entry was processed.`,
            `Duplicação no ficheiro (Linha ${rowNum}): O email "${record.email}" aparece mais de uma vez no documento. Apenas a primeira entrada foi considerada.`
          ),
        });
        continue;
      }
      seenFileEmails.add(emailLower);
    }

    if (record.phone) {
      const phoneNorm = normalizePhone(record.phone);
      if (phoneNorm.length >= 8) {
        if (seenFilePhones.has(phoneNorm)) {
          unmatched.push({
            record,
            reason: loc(
              `Duplicate in file (Row ${rowNum}): Contact "${record.phone}" appears more than once. Only the first entry was processed.`,
              `Duplicação no ficheiro (Linha ${rowNum}): O contacto "${record.phone}" aparece mais de uma vez no documento. Apenas a primeira entrada foi considerada.`
            ),
          });
          continue;
        }
        seenFilePhones.add(phoneNorm);
      }
    }

    let matchedCandidate: Application | undefined;
    let matchType: "email" | "phone" | "name_exact" | "name_fuzzy" = "email";
    let hasCorrection = false;
    let correctionDetail: string | undefined;

    // 1. Match by Email (highest confidence)
    if (record.email) {
      const targetEmail = record.email.toLowerCase().trim();
      const emailMatches = candidates.filter(
        (c) => c.email && c.email.toLowerCase().trim() === targetEmail
      );

      if (emailMatches.length === 1) {
        const cand = emailMatches[0];
        if (matchedCandidateIds.has(cand.id)) {
          unmatched.push({
            record,
            reason: loc(
              `Duplicate conflict: Candidate "${cand.name}" was already assigned to a previous row.`,
              `Conflito de duplicação: O candidato "${cand.name}" já foi associado a outra linha anterior neste ficheiro.`
            ),
          });
          continue;
        }
        matchedCandidate = cand;
        matchType = "email";

        // Check if name had a typo in the file
        if (record.name && normalizeText(record.name) !== normalizeText(cand.name)) {
          hasCorrection = true;
          correctionDetail = loc(
            `Name corrected from DB: "${cand.name}" (file contained "${record.name}")`,
            `Nome corrigido pela BD: "${cand.name}" (ficheiro continha "${record.name}")`
          );
        }
      } else if (emailMatches.length > 1) {
        unmatched.push({
          record,
          reason: loc(
            `Email ambiguity: Multiple applications exist for email "${record.email}".`,
            `Ambiguidade no email: Existem ${emailMatches.length} candidaturas com o email "${record.email}" no funil.`
          ),
        });
        continue;
      }
    }

    // 2. Match by Phone / WhatsApp (helps if email had a typo)
    if (!matchedCandidate && record.phone) {
      const targetPhone = normalizePhone(record.phone);
      if (targetPhone.length >= 8) {
        const phoneMatches = candidates.filter((c) => {
          const cPhone = normalizePhone(c.whatsapp);
          return cPhone.length >= 8 && cPhone.endsWith(targetPhone);
        });

        if (phoneMatches.length === 1) {
          const cand = phoneMatches[0];
          if (matchedCandidateIds.has(cand.id)) {
            unmatched.push({
              record,
              reason: loc(
                `Duplicate conflict: Candidate "${cand.name}" was already assigned to a previous row.`,
                `Conflito de duplicação: O candidato "${cand.name}" já foi associado a outra linha anterior neste ficheiro.`
              ),
            });
            continue;
          }
          matchedCandidate = cand;
          matchType = "phone";

          if (record.email && cand.email && record.email.toLowerCase().trim() !== cand.email.toLowerCase().trim()) {
            hasCorrection = true;
            correctionDetail = loc(
              `Email corrected from DB: "${cand.email}" (file contained typo "${record.email}")`,
              `Email corrigido pela BD: "${cand.email}" (ficheiro continha erro "${record.email}")`
            );
          } else if (record.name && normalizeText(record.name) !== normalizeText(cand.name)) {
            hasCorrection = true;
            correctionDetail = loc(
              `Name corrected from DB: "${cand.name}" (file contained typo "${record.name}")`,
              `Nome corrigido pela BD: "${cand.name}" (ficheiro continha erro "${record.name}")`
            );
          }
        } else if (phoneMatches.length > 1) {
          unmatched.push({
            record,
            reason: loc(
              `Phone ambiguity: Multiple candidates have contact "${record.phone}".`,
              `Ambiguidade no telefone: ${phoneMatches.length} candidatos têm o contacto "${record.phone}".`
            ),
          });
          continue;
        }
      }
    }

    // 3. Match by Exact Normalized Name (helps if email had a typo)
    if (!matchedCandidate && record.name) {
      const normInput = normalizeText(record.name);
      if (normInput.length >= 4) {
        const exactMatches = candidates.filter((c) => normalizeText(c.name) === normInput);

        if (exactMatches.length === 1) {
          const cand = exactMatches[0];
          if (matchedCandidateIds.has(cand.id)) {
            unmatched.push({
              record,
              reason: loc(
                `Duplicate conflict: Candidate "${cand.name}" was already assigned to a previous row.`,
                `Conflito de duplicação: O candidato "${cand.name}" já foi associado a outra linha anterior neste ficheiro.`
              ),
            });
            continue;
          }
          matchedCandidate = cand;
          matchType = "name_exact";

          if (record.email && cand.email && record.email.toLowerCase().trim() !== cand.email.toLowerCase().trim()) {
            hasCorrection = true;
            correctionDetail = loc(
              `Email corrected from DB: "${cand.email}" (file contained "${record.email}")`,
              `Email corrigido pela BD: "${cand.email}" (ficheiro continha "${record.email}")`
            );
          }
        } else if (exactMatches.length > 1) {
          // Strict Anti-Mixing Guard: do NOT pick arbitrarily!
          unmatched.push({
            record,
            reason: loc(
              `Name ambiguity: Multiple candidates share the exact name "${record.name}". Please provide email or phone.`,
              `Ambiguidade de nome: Existem ${exactMatches.length} candidatos com o nome exato "${record.name}" neste ciclo/funil. É necessário indicar o email ou contacto na folha para evitar misturar notas.`
            ),
          });
          continue;
        }
      }
    }

    // 4. Match by Fuzzy Tokenized Name (first and last name)
    if (!matchedCandidate && record.name) {
      const normInput = normalizeText(record.name);
      const inputTokens = normInput.split(" ").filter((t) => t.length > 2);
      if (inputTokens.length >= 2) {
        const firstToken = inputTokens[0];
        const lastToken = inputTokens[inputTokens.length - 1];

        const fuzzyMatches = candidates.filter((c) => {
          const candNorm = normalizeText(c.name);
          const candTokens = candNorm.split(" ").filter((t) => t.length > 2);
          if (candTokens.length < 2) return false;

          const hasFirst = candTokens[0] === firstToken;
          const hasLast = candTokens.includes(lastToken);
          return hasFirst && hasLast;
        });

        if (fuzzyMatches.length === 1) {
          const cand = fuzzyMatches[0];
          if (matchedCandidateIds.has(cand.id)) {
            unmatched.push({
              record,
              reason: loc(
                `Duplicate conflict: Candidate "${cand.name}" was already assigned to a previous row.`,
                `Conflito de duplicação: O candidato "${cand.name}" já foi associado a outra linha anterior neste ficheiro.`
              ),
            });
            continue;
          }
          matchedCandidate = cand;
          matchType = "name_fuzzy";

          hasCorrection = true;
          correctionDetail = loc(
            `Approximate name validated from DB: "${cand.name}" (file contained "${record.name}")`,
            `Nome aproximado validado pela BD: "${cand.name}" (ficheiro continha "${record.name}")`
          );
        } else if (fuzzyMatches.length > 1) {
          // Strict Anti-Mixing Guard: do NOT pick arbitrarily!
          unmatched.push({
            record,
            reason: loc(
              `Name ambiguity: Multiple candidates share similar first and last names. Please add email or phone.`,
              `Ambiguidade de nome: Múltiplos candidatos têm o primeiro e último nome correspondentes. Adicione o email ou telefone para desambiguar.`
            ),
          });
          continue;
        }
      }
    }

    // 5. Tier 5: Levenshtein String Similarity (handles minor character typos in name when phone/email also have typos)
    if (!matchedCandidate && record.name) {
      const normInput = normalizeText(record.name);
      if (normInput.length >= 5) {
        const scored = candidates
          .map((c) => ({ cand: c, sim: stringSimilarity(normInput, normalizeText(c.name)) }))
          .filter((s) => s.sim >= 0.82)
          .sort((a, b) => b.sim - a.sim);

        if (scored.length === 1 || (scored.length > 1 && scored[0].sim - scored[1].sim >= 0.12)) {
          const cand = scored[0].cand;
          if (matchedCandidateIds.has(cand.id)) {
            unmatched.push({
              record,
              reason: loc(
                `Duplicate conflict: Candidate "${cand.name}" was already assigned to a previous row.`,
                `Conflito de duplicação: O candidato "${cand.name}" já foi associado a outra linha anterior neste ficheiro.`
              ),
            });
            continue;
          }
          matchedCandidate = cand;
          matchType = "name_fuzzy";
          hasCorrection = true;
          correctionDetail = loc(
            `Approximate name (${Math.round(scored[0].sim * 100)}% match with "${cand.name}")`,
            `Nome aproximado (${Math.round(scored[0].sim * 100)}% de correspondência com "${cand.name}")`
          );
        }
      }
    }

    if (matchedCandidate) {
      if (
        matchedCandidate.status === "archived" ||
        matchedCandidate.status === "not_advancing" ||
        matchedCandidate.status === "rejected" ||
        matchedCandidate.status === "disqualified"
      ) {
        unmatched.push({
          record,
          reason: loc(
            `Disqualified/Archived applicant: "${matchedCandidate.name}" is recorded as '${matchedCandidate.status}' (ineligible for physical testing).`,
            `Candidato Desqualificado/Arquivado: "${matchedCandidate.name}" consta no histórico como '${matchedCandidate.status}' (rejeitado/não elegível para provas presenciais).`
          ),
        });
        continue;
      }

      matchedCandidateIds.add(matchedCandidate.id);
      matched.push({
        candidate: matchedCandidate,
        record,
        score: record.score,
        nextPhaseSelected: record.nextPhaseSelected || false,
        matchType,
        hasCorrection,
        correctionDetail,
      });
    } else {
      // Diagnostic check against all database candidates if provided
      let diagnosticReason = loc(
        `Candidate not found in this cycle/pipeline ("${
          record.name || record.email || record.phone || "row"
        }"). Please verify candidate spelling or role.`,
        `Candidato não encontrado na base de dados deste ciclo/funil ("${
          record.name || record.email || record.phone || "linha"
        }"). Verifique se o candidato pertence a este ciclo e se o nome ou email está correto.`
      );

      if (allDatabaseCandidates && allDatabaseCandidates.length > 0) {
        const targetEmail = record.email ? record.email.toLowerCase().trim() : null;
        const targetPhone = record.phone ? normalizePhone(record.phone) : null;
        const targetNormName = record.name ? normalizeText(record.name) : null;

        const globalMatch = allDatabaseCandidates.find((c) => {
          if (targetEmail && c.email && c.email.toLowerCase().trim() === targetEmail) return true;
          if (targetPhone && targetPhone.length >= 8 && normalizePhone(c.whatsapp).endsWith(targetPhone)) return true;
          if (targetNormName && targetNormName.length >= 5 && normalizeText(c.name) === targetNormName) return true;
          return false;
        });

        if (globalMatch) {
          if (globalMatch.status === "archived" || globalMatch.status === "not_advancing" || globalMatch.status === "rejected") {
            diagnosticReason = loc(
              `Disqualified/Archived applicant: "${globalMatch.name}" is recorded as '${globalMatch.status}' (ineligible for physical testing).`,
              `Candidato Desqualificado/Arquivado: "${globalMatch.name}" consta no histórico como ${globalMatch.status} (não aprovado nesta fase).`
            );
          } else if (globalMatch.role && globalMatch.role !== "cctv_technical_manager") {
            const roleName = globalMatch.role === "cctv" ? "CCTV Operator (CCO)" : globalMatch.role;
            diagnosticReason = loc(
              `Out of pipeline: "${globalMatch.name}" applied for ${roleName} and does not belong to this Technical Manager pipeline.`,
              `Fora do funil de testes: "${globalMatch.name}" pertence à função ${
                globalMatch.role === "cctv" ? "Operador de CCTV (CCO)" : globalMatch.role
              } e não a esta vaga de Gestor Técnico.`
            );
          }
        }
      }

      unmatched.push({
        record,
        reason: diagnosticReason,
      });
    }
  }

  return { matched, unmatched };
}
