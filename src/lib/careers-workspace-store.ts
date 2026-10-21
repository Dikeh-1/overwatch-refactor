import "server-only";
import { getApplications } from "./careers-store";
import { getAllCohorts, getRoleDefinitions } from "./careers-campaign-store";
import {
  applicationsForCohort,
  buildCohortCatalog,
  resolveApplication,
  sameRole,
} from "./careers-workflow";
import { evaluateApplicationWithRules } from "./careers-evaluator";

export async function getRecruitmentWorkspaceData() {
  const [raw, roles, savedCohorts] = await Promise.all([
    getApplications(),
    getRoleDefinitions(),
    getAllCohorts(),
  ]);
  const cohorts = buildCohortCatalog(savedCohorts, roles, raw);
  const applications = raw.map((a) => {
    const resolved = resolveApplication(a);
    const cohort = cohorts.find(
      (c) => applicationsForCohort([a], c, cohorts).length > 0,
    );
    const role = roles.find((r) => sameRole(r.id, a.role));
    const rules = cohort?.screeningRules ?? role?.screeningRules;
    return {
      ...resolved,
      workspaceCohortId: cohort?.id,
      screeningResult:
        a.screeningResult ??
        (rules?.length ? evaluateApplicationWithRules(a, rules) : undefined),
    };
  });
  return { raw, roles, cohorts, applications };
}
