import type { ScreeningRule } from "./careers-models";
import type { Application, ScreeningEvaluationResult } from "./careers";

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
  let preferredScore = 0;
  let preferredTotal = 0;
  const details: Array<{
    key: string;
    label: string;
    passed: boolean;
    mandatory: boolean;
  }> = [];

  for (const rule of rules) {
    const rawVal =
      (app as Record<string, any>)[rule.field] ??
      ((app as any).technicalData && (app as any).technicalData[rule.field]);
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
      let num = 0;
      if (typeof rawVal === "number") {
        num = isNaN(rawVal) ? 0 : rawVal;
      } else if (typeof rawVal === "string") {
        const cleaned = rawVal.trim().toLowerCase();
        if (
          cleaned === "" ||
          cleaned === "0" ||
          cleaned === "none" ||
          cleaned === "no" ||
          cleaned === "não" ||
          cleaned === "nao"
        ) {
          num = 0;
        } else {
          // Extract first integer from range string (e.g. "5-8" -> 5, "1-2" -> 1, "8+" -> 8, "1_2" -> 1)
          const match = cleaned.match(/(\d+)/);
          num = match ? parseInt(match[1], 10) : Number(cleaned) || 0;
        }
      }
      const target = Number(rule.expectedValue) || 0;
      passed = num >= target;
    } else {
      passed = Boolean(rawVal && String(rawVal).trim().length > 0);
    }

    details.push({
      key: rule.field,
      label: rule.labelPt,
      passed,
      mandatory: rule.mandatory,
    });

    if (rule.mandatory) {
      if (!passed) {
        passedMandatory = false;
        failedReasons.push(`Missing mandatory requirement: ${rule.labelEn}`);
        failedReasonsPt.push(`Requisito obrigatório em falta: ${rule.labelPt}`);
      }
    } else {
      const weight = rule.weight || 1;
      preferredTotal += weight;
      if (passed) {
        preferredScore += weight;
      }
    }
  }

  const matchPercentage =
    preferredTotal > 0
      ? Math.round((preferredScore / preferredTotal) * 100)
      : passedMandatory
        ? 100
        : 0;

  return {
    passedMandatory,
    failedReasons,
    failedReasonsPt,
    preferredScore,
    preferredTotal,
    matchPercentage,
    evaluatedAt: new Date().toISOString(),
    details,
  };
}
