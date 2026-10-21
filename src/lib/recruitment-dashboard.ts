import type { Application } from "./careers";
import type { CareerCohort, CareerRoleDefinition } from "./careers-models";
import { applicationsForCohort, hasScore, isScreened, passedScreening, isNotAdvancing, hasAttended, hasTested, isAwaiting, isConfirmed, isNextPhase, isQualified, recruitmentMetrics, sameRole } from "./careers-workflow";

export type DashboardScope = "all" | "open";
export function isDashboardRoster(params: Pick<URLSearchParams, "has">) {
  return params.has("metric") || params.has("scope");
}
export const dashboardPredicates: Record<string, (candidate: Application) => boolean> = {
  total: () => true,
  screened: isScreened,
  screeningPassed: passedScreening,
  notAdvancing: isNotAdvancing,
  unresolved: a => a.stageSource === "unresolved",
  qualified: isQualified,
  booked: a => Boolean(a.testSlot),
  attended: hasAttended,
  scored: hasScore,
  tested: hasTested,
  nextPhase: isNextPhase,
  awaiting: isAwaiting,
  confirmed: isConfirmed,
};
export function dashboardCandidates(applications: Application[], roles: CareerRoleDefinition[], cohorts: CareerCohort[], scope: DashboardScope, metric = "total") {
  const openCohorts = cohorts.filter(c => c.status === "active" && roles.some(r => r.open && r.activeCohortId === c.id && sameRole(r.id, c.roleId)));
  const scoped = scope === "all" ? applications : applications.filter(a => openCohorts.some(c => applicationsForCohort([a], c, cohorts).length > 0));
  return scoped.filter(dashboardPredicates[metric] || dashboardPredicates.total);
}
export function recruitmentDashboard(applications: Application[], roles: CareerRoleDefinition[], cohorts: CareerCohort[], scope: DashboardScope) {
  const candidates = dashboardCandidates(applications, roles, cohorts, scope);
  return {
    candidates,
    metrics: recruitmentMetrics(candidates),
    openRoles: roles.filter(r => r.open),
    closedCycles: cohorts.filter(c => c.status !== "active").sort((a, b) => (b.closedAt || b.openedAt || "").localeCompare(a.closedAt || a.openedAt || "")),
    roles: roles.filter(r => scope === "all" || r.open).map(role => {
      const records = candidates.filter(a => sameRole(a.role, role.id));
      const roleCohorts = cohorts.filter(c => sameRole(c.roleId, role.id));
      return { role, metrics: recruitmentMetrics(records), cycles: roleCohorts };
    }),
  };
}
