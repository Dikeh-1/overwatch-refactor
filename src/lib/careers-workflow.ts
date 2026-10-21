import { stages, type Application, type PipelineStage } from "./careers";
import type { CareerCohort, CareerRoleDefinition } from "./careers-models";
import { classifyCandidateLocation } from "./location-utils";

export function canonicalRole(id?: string | null): string {
  return !id || ["cctv", "cctv_operator", "cco-operator-maputo"].includes(id)
    ? "cctv"
    : id;
}
export const sameRole = (a?: string | null, b?: string | null) =>
  canonicalRole(a) === canonicalRole(b);
export const hasScore = (a: Application) =>
  typeof a.testScore === "number" && Number.isFinite(a.testScore);
export const hasAttended = (a: Application) =>
  Boolean(a.attendedAt) ||
  a.attendanceStatus === "present" ||
  a.attendanceStatus === "late";
export const hasTested = (a: Application) =>
  hasScore(a) || a.status === "tested";
export const isTerminal = (a: Application) =>
  [
    "archived",
    "rejected",
    "not_advancing",
    "withdrawn",
    "no_show",
    "disqualified",
    "interest_declined",
  ].includes(a.status);
export const isNextPhase = (a: Application) =>
  !["rejected", "not_advancing", "withdrawn", "disqualified"].includes(
    a.status,
  ) &&
  ([
    "next_phase_selected",
    "next_phase_invited",
    "awaiting_response",
    "interest_confirmed",
    "interest_declined",
  ].includes(a.status) ||
    ["selected", "invited", "confirmed", "declined"].includes(
      a.nextPhaseStatus || "",
    ) ||
    Boolean(a.nextPhaseInvitedAt || a.nextPhaseResponse));
export const isConfirmed = (a: Application) =>
  isNextPhase(a) &&
  (a.nextPhaseResponse === "yes" ||
    a.nextPhaseStatus === "confirmed" ||
    a.status === "interest_confirmed");
export const isDeclined = (a: Application) =>
  isNextPhase(a) &&
  (a.nextPhaseResponse === "no" ||
    a.nextPhaseStatus === "declined" ||
    a.status === "interest_declined");
export const isAwaiting = (a: Application) =>
  isNextPhase(a) &&
  !isConfirmed(a) &&
  !isDeclined(a) &&
  Boolean(
    a.nextPhaseInvitedAt ||
      a.nextPhaseStatus === "invited" ||
      a.status === "awaiting_response" ||
      a.status === "next_phase_invited",
  );
export const isQualified = (a: Application) =>
  !isTerminal(a) &&
  (a.screeningResult?.passedMandatory === true || a.status === "shortlisted");
export const isEligibleForTest = (a: Application) =>
  isQualified(a) &&
  !a.testSlot &&
  !a.invitedAt &&
  !hasTested(a) &&
  !hasAttended(a) &&
  !isNextPhase(a) &&
  !["interview", "training", "hired"].includes(a.status) &&
  (canonicalRole(a.role) !== "cctv_technical_manager" ||
    classifyCandidateLocation(a).isMaputoRegion);
export const canReceiveTestInvitation = (a: Application) =>
  !isTerminal(a) &&
  !hasTested(a) &&
  !hasAttended(a) &&
  !isNextPhase(a) &&
  !["interview", "training", "hired"].includes(a.status) &&
  (isQualified(a) || Boolean(a.invitedAt || a.testSlot)) &&
  (canonicalRole(a.role) !== "cctv_technical_manager" ||
    classifyCandidateLocation(a).isMaputoRegion);

/** A recovered display is explicit about its evidence; raw stored status is never rewritten on read. */
export function resolveApplication(a: Application): Application {
  if (
    a.status !== "archived" ||
    (a.archiveReason && a.archiveReason !== "Recruitment Closed")
  )
    return { ...a, stageSource: "recorded" };
  const log = [...(a.activityLog || [])].reverse();
  const latestDecision = log.find((e) =>
    /^Declined:|^Stage Transition: /.test(e.action || ""),
  );
  const explicit =
    a.statusBeforeArchive ||
    (latestDecision?.action?.startsWith("Declined:")
      ? "not_advancing"
      : latestDecision?.action?.match(/^Stage Transition: (.+)$/)?.[1]);
  if (explicit === "archived") return { ...a, stageSource: "recorded" };
  let status: PipelineStage | undefined =
    explicit && (stages as readonly string[]).includes(explicit)
      ? (explicit as PipelineStage)
      : undefined;
  if (!status && a.nextPhaseResponse === "no") status = "interest_declined";
  if (
    !status &&
    (a.nextPhaseResponse === "yes" || a.nextPhaseStatus === "confirmed")
  )
    status = "interest_confirmed";
  if (!status && a.nextPhaseStatus === "declined") status = "interest_declined";
  if (!status && a.nextPhaseInvitedAt) status = "next_phase_invited";
  if (!status && a.nextPhaseStatus === "selected")
    status = "next_phase_selected";
  // Never turn a decline decision into a shortlist from an old screening result.
  if (!status && hasScore(a)) status = "tested";
  if (!status && a.testSlot) status = "test_booked";
  if (!status && a.invitedAt) status = "test_invited";
  if (!status && a.screeningResult?.passedMandatory === true)
    status = "shortlisted";
  if (!status && a.screeningResult?.passedMandatory === false)
    status = "not_advancing";
  return {
    ...a,
    storedStatus: a.status,
    status: status || a.status,
    stageSource: status ? "recovered" : "unresolved",
  };
}

/** Explicit membership wins. Unassigned legacy records get one review bucket, never every same-role cohort. */
export function buildCohortCatalog(
  cohorts: CareerCohort[],
  roles: CareerRoleDefinition[],
  applications: Application[],
): CareerCohort[] {
  const catalog = cohorts.map((c) => {
    const role = roles.find((r) => sameRole(r.id, c.roleId));
    return {
      ...c,
      ...(role && !role.open && c.status === "active"
        ? { status: "closed" as const, legacy: true }
        : {}),
    };
  });
  for (const role of roles) {
    if (
      role.open &&
      role.activeCohortId &&
      !catalog.some((c) => c.id === role.activeCohortId)
    )
      catalog.push({
        id: role.activeCohortId,
        roleId: role.id,
        name: role.pt,
        openedAt: role.createdAt,
        status: "active",
        stages: role.pipelineStages,
        screeningRules: role.screeningRules,
      });
  }
  for (const a of applications) {
    if (!a.cohortId || catalog.some((c) => c.id === a.cohortId)) continue;
    const role = roles.find((r) => sameRole(r.id, a.role));
    const pool = applications.filter((b) => b.cohortId === a.cohortId);
    const dates = pool
      .map((b) => b.createdAt)
      .filter(Boolean)
      .sort();
    catalog.push({
      id: a.cohortId,
      roleId: role?.id || canonicalRole(a.role),
      name:
        a.cohortId === "cctv_cohort"
          ? "Operadora de CCTV (CCO) — Lote Setembro 2026"
          : `${role?.pt || a.role} — ${a.cohortId}`,
      openedAt: dates[0],
      status:
        role?.open && role.activeCohortId === a.cohortId ? "active" : "closed",
      stages: role?.pipelineStages || [
        "applications",
        "screening",
        "testing",
        "next_phase",
        "interview",
        "hired",
      ],
      screeningRules: role?.screeningRules || [],
      legacy: true,
    });
  }
  for (const roleId of new Set(
    applications.filter((a) => !a.cohortId).map((a) => canonicalRole(a.role)),
  )) {
    const role = roles.find((r) => sameRole(r.id, roleId));
    // A fresh initial intake may contain pre-cohort records. Once another cohort exists, do not guess.
    const roleCohorts = catalog.filter((c) => sameRole(c.roleId, roleId));
    if (
      role?.open &&
      role.activeCohortId &&
      roleCohorts.length === 1 &&
      roleCohorts[0].id === role.activeCohortId
    )
      continue;
    catalog.push({
      id: `${roleId}_legacy_unassigned`,
      roleId,
      name: `${role?.pt || roleId} — ${"Registos sem lote / revisão"}`,
      openedAt: "",
      status: "closed",
      stages: role?.pipelineStages || [
        "applications",
        "screening",
        "testing",
        "next_phase",
        "interview",
        "hired",
      ],
      screeningRules: role?.screeningRules || [],
      legacy: true,
      unassigned: true,
    });
  }
  return catalog;
}

export function applicationsForCohort(
  applications: Application[],
  cohort: CareerCohort,
  catalog: CareerCohort[],
): Application[] {
  return applications.filter((a) => {
    if (!sameRole(a.role, cohort.roleId)) return false;
    if (a.cohortId) return a.cohortId === cohort.id;
    if (cohort.unassigned) return true;
    return (
      cohort.status === "active" &&
      catalog.filter((c) => sameRole(c.roleId, cohort.roleId)).length === 1
    );
  });
}

export function recruitmentMetrics(applications: Application[]) {
  return {
    total: applications.length,
    qualified: applications.filter(isQualified).length,
    eligible: applications.filter(isEligibleForTest).length,
    invited: applications.filter(
      (a) => Boolean(a.invitedAt) || a.status === "test_invited",
    ).length,
    booked: applications.filter((a) => Boolean(a.testSlot)).length,
    attended: applications.filter(hasAttended).length,
    tested: applications.filter(hasTested).length,
    scored: applications.filter(hasScore).length,
    nextPhase: applications.filter(isNextPhase).length,
    confirmed: applications.filter(isConfirmed).length,
    awaiting: applications.filter(isAwaiting).length,
    declined: applications.filter(isDeclined).length,
    interview: applications.filter((a) => a.status === "interview").length,
    training: applications.filter((a) => a.status === "training").length,
    hired: applications.filter((a) => a.status === "hired").length,
    unresolved: applications.filter((a) => a.stageSource === "unresolved")
      .length,
  };
}
