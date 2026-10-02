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
    const rawVal = (app as Record<string, any>)[rule.field];
    let passed = false;

    if (rule.type === "boolean") {
      passed = String(rawVal).toLowerCase() === String(rule.expectedValue).toLowerCase();
    } else if (rule.type === "number") {
      const num = Number(rawVal) || 0;
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
