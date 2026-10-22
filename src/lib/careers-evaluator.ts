import type { ScreeningRule } from "./careers-models";
import type { Application, ScreeningEvaluationResult } from "./careers";

export function screeningValue(app: Partial<Application>, field: string): unknown {
  const direct = (app as Record<string, unknown>)[field];
  return direct === undefined || direct === null || (typeof direct === "string" && !direct.trim()) ? app.technicalData?.[field] : direct;
}
export function screeningNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (["none","no","não","nao","sem experiência","sem experiencia"].includes(text)) return 0;
  const match = text.match(/^([+-]?\d+(?:[.,]\d+)?)(?:\s*(?:[-_–—+]|to\b|a\b|years?\b|anos?\b|plus\b)|$)/);
  const number = match ? Number(match[1].replace(",", ".")) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function evaluateApplicationWithRules(
  app: Partial<Application>,
  rules: ScreeningRule[],
): ScreeningEvaluationResult {
  if (!rules || rules.length === 0) {
    return {
      passedMandatory: true,
      failedReasons: [],
      failedReasonsPt: [],
      preferredScore: 0,
      preferredTotal: 0,
      matchPercentage: 100,
      evaluatedAt: new Date().toISOString(),
      details: [],
    };
  }

  let passedMandatory = true;
  const failedReasons: string[] = [];
  const failedReasonsPt: string[] = [];
  let mandatoryScore = 0;
  let mandatoryTotal = 0;
  let preferredScore = 0;
  let preferredTotal = 0;
  const details: Array<{
    key: string;
    label: string;
    passed: boolean;
    mandatory: boolean;
  }> = [];

  for (const rule of rules) {
    const rawVal = screeningValue(app, rule.field);
    let passed = false;

    if (rule.type === "boolean") {
      const s = String(rawVal ?? "").trim().toLowerCase();
      const exp = String(rule.expectedValue ?? "yes").trim().toLowerCase();
      if (exp === "yes" || exp === "true" || exp === "sim" || exp === "1") {
        passed = s === "yes" || s === "true" || s === "sim" || s === "1";
      } else if (exp === "no" || exp === "false" || exp === "não" || exp === "nao" || exp === "0") {
        passed = s === "no" || s === "false" || s === "não" || s === "nao" || s === "0";
      } else {
        passed = s === exp;
      }
    } else if (rule.type === "number") {
      const num = screeningNumber(rawVal);
      const target = typeof rule.expectedValue === "number" ? rule.expectedValue : Number(rule.expectedValue);
      passed = num !== null && Number.isFinite(target) && target >= 0 && num >= target;
    } else {
      const actual = String(rawVal ?? "").trim().toLowerCase();
      const expected = String(rule.expectedValue ?? "").trim().toLowerCase();
      passed = expected ? actual === expected : actual.length > 0;
    }

    details.push({
      key: rule.field,
      label: rule.labelPt,
      passed,
      mandatory: rule.mandatory,
    });

    const weight = typeof rule.weight === "number" && Number.isFinite(rule.weight) && rule.weight > 0 ? rule.weight : 1;
    if (rule.mandatory) {
      mandatoryTotal += weight;
      if (passed) {
        mandatoryScore += weight;
      } else {
        passedMandatory = false;
        failedReasons.push(`Missing mandatory requirement: ${rule.labelEn}`);
        failedReasonsPt.push(`Requisito obrigatório em falta: ${rule.labelPt}`);
      }
    } else {
      preferredTotal += weight;
      if (passed) {
        preferredScore += weight;
      }
    }
  }

  // Mandatory requirements carry primary heavy scoring criteria (70% mandatory, 30% preferred)
  const mandatoryRatio = mandatoryTotal > 0 ? mandatoryScore / mandatoryTotal : 1;
  const preferredRatio = preferredTotal > 0 ? preferredScore / preferredTotal : 1;

  let matchPercentage: number;
  if (mandatoryTotal > 0 && preferredTotal > 0) {
    matchPercentage = Math.round((mandatoryRatio * 70) + (preferredRatio * 30));
  } else if (mandatoryTotal > 0) {
    matchPercentage = Math.round(mandatoryRatio * 100);
  } else if (preferredTotal > 0) {
    matchPercentage = Math.round(preferredRatio * 100);
  } else {
    matchPercentage = 100;
  }

  return {
    passedMandatory,
    failedReasons,
    failedReasonsPt,
    mandatoryScore,
    mandatoryTotal,
    preferredScore,
    preferredTotal,
    matchPercentage,
    evaluatedAt: new Date().toISOString(),
    details,
  };
}
