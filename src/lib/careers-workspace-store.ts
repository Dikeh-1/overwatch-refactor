import "server-only";
import { getApplications } from "./careers-store";
import { getAllCohorts, getRoleDefinitions } from "./careers-campaign-store";
import {
  applicationsForCohort,
  applyHistoricalAttendance,
  buildCohortCatalog,
  resolveApplication,
  sameRole,
} from "./careers-workflow";
import { evaluateApplicationWithRules } from "./careers-evaluator";

export async function getRecruitmentWorkspaceData() {
  const [raw, roles, savedCohorts] = await Promise.all([
    getApplications(true),
    getRoleDefinitions(true),
    getAllCohorts(true),
  ]);
  const cohorts = buildCohortCatalog(savedCohorts, roles, raw);
  const applications = raw.map((a) => {
    const cohort = cohorts.find(
      (c) => applicationsForCohort([a], c, cohorts).length > 0,
    );
    const resolved = resolveApplication(applyHistoricalAttendance(a, cohort));
    const role = roles.find((r) => sameRole(r.id, a.role));
    const rules = cohort?.screeningRules ?? role?.screeningRules;
    return {
      ...resolved,
      workspaceCohortId: cohort?.id,
      screeningRulesApplied: rules,
      screeningResult: rules ? evaluateApplicationWithRules(a, rules) : a.screeningResult,
    };
  });
  return { raw, roles, cohorts, applications };
}
