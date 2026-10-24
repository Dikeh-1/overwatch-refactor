import * as XLSX from "xlsx";
import { type Application } from "./careers";

export type ParsedScoreRecord = {
  name?: string;
  email?: string;
  phone?: string;
  rawScore: any;
  score: number; // 0-100
  sourceLine?: string;
};

export type CandidateMatch = {
  candidate: Application;
  record: ParsedScoreRecord;
  score: number;
  matchType: "email" | "phone" | "name_exact" | "name_fuzzy";
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
 */
export function parseSpreadsheetBuffer(buffer: Buffer): ParsedScoreRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
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

    // Identify Name
    let name: string | undefined;
    const nameKey = keys.find((k) =>
      /^(candidat[oa]|candidate|nome|name|full\s*name|nome\s*completo)$/i.test(k.trim()) ||
      /(nome|name|candidat)/i.test(k.trim())
    );
    if (nameKey && row[nameKey]) name = String(row[nameKey]).trim();

    // Identify Email
    let email: string | undefined;
    const emailKey = keys.find((k) => /(e-?mail|correio)/i.test(k.trim()));
    if (emailKey && row[emailKey]) {
      const match = String(row[emailKey]).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) email = match[0].toLowerCase().trim();
    }

    // Identify Phone / WhatsApp
    let phone: string | undefined;
    const phoneKey = keys.find((k) => /(phone|tel|telef|whatsapp|cel|contacto)/i.test(k.trim()));
    if (phoneKey && row[phoneKey]) {
      phone = normalizePhone(String(row[phoneKey]));
    }

    // Identify Score
    let rawScore: any;
    const scoreKey = keys.find((k) =>
      /^(score|nota|pontua[cç][aã]o|resultado|mark|classifica[cç][aã]o|teste|aptid[aã]o)/i.test(k.trim()) ||
      /(score|nota|pontua|result)/i.test(k.trim())
    );
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

    const score = sanitizeScore(rawScore);
    if (score !== null && (name || email || phone)) {
      results.push({
        name,
        email,
        phone,
        rawScore,
        score,
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

      if (score !== null) {
        // Strip out email, phone, and score from line to extract name
        let cleanName = line
          .replace(emailRegex, " ")
          .replace(phoneRegex, " ")
          .replace(scoreRegex, " ")
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
 */
export function matchScoresToCandidates(
  records: ParsedScoreRecord[],
  candidates: Application[]
): MatchResults {
  const matched: CandidateMatch[] = [];
  const unmatched: UnmatchedRecord[] = [];
  const matchedCandidateIds = new Set<string>();

  for (const record of records) {
    let matchedCandidate: Application | undefined;
    let matchType: "email" | "phone" | "name_exact" | "name_fuzzy" = "email";

    // 1. Match by Email (highest confidence)
    if (record.email) {
      const targetEmail = record.email.toLowerCase().trim();
      matchedCandidate = candidates.find(
        (c) => c.email && c.email.toLowerCase().trim() === targetEmail && !matchedCandidateIds.has(c.id)
      );
      if (matchedCandidate) matchType = "email";
    }

    // 2. Match by Phone / WhatsApp
    if (!matchedCandidate && record.phone) {
      const targetPhone = normalizePhone(record.phone);
      if (targetPhone.length >= 8) {
        matchedCandidate = candidates.find((c) => {
          if (matchedCandidateIds.has(c.id)) return false;
          const cPhone = normalizePhone(c.whatsapp);
          return cPhone.length >= 8 && cPhone.endsWith(targetPhone);
        });
        if (matchedCandidate) matchType = "phone";
      }
    }

    // 3. Match by Exact Normalized Name
    if (!matchedCandidate && record.name) {
      const normInput = normalizeText(record.name);
      if (normInput.length >= 4) {
        matchedCandidate = candidates.find((c) => {
          if (matchedCandidateIds.has(c.id)) return false;
          return normalizeText(c.name) === normInput;
        });
        if (matchedCandidate) matchType = "name_exact";
      }
    }

    // 4. Match by Fuzzy Tokenized Name (first and last name)
    if (!matchedCandidate && record.name) {
      const normInput = normalizeText(record.name);
      const inputTokens = normInput.split(" ").filter((t) => t.length > 2);
      if (inputTokens.length >= 2) {
        const firstToken = inputTokens[0];
        const lastToken = inputTokens[inputTokens.length - 1];

        matchedCandidate = candidates.find((c) => {
          if (matchedCandidateIds.has(c.id)) return false;
          const candNorm = normalizeText(c.name);
          const candTokens = candNorm.split(" ").filter((t) => t.length > 2);
          if (candTokens.length < 2) return false;

          const hasFirst = candTokens[0] === firstToken;
          const hasLast = candTokens.includes(lastToken);
          return hasFirst && hasLast;
        });
        if (matchedCandidate) matchType = "name_fuzzy";
      }
    }

    if (matchedCandidate) {
      matchedCandidateIds.add(matchedCandidate.id);
      matched.push({
        candidate: matchedCandidate,
        record,
        score: record.score,
        matchType,
      });
    } else {
      unmatched.push({
        record,
        reason: `Nenhum candidato encontrado correspondente a "${record.name || record.email || record.phone || "linha"}"`,
      });
    }
  }

  return { matched, unmatched };
}
