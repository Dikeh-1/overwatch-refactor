require("../scripts/register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const w = require("../src/lib/careers-workflow.ts");
const {
  classifyCandidateLocation: location,
} = require("../src/lib/location-utils.ts");
const {
  evaluateApplicationWithRules: evaluate,
} = require("../src/lib/careers-evaluator.ts");
const {
  DEFAULT_SCREENING_RULES_BY_ROLE: rules,
} = require("../src/lib/careers-models.ts");
const candidate = (id, props = {}) => ({
  id,
  name: "Candidate",
  email: "qa@example.invalid",
  whatsapp: "",
  createdAt: "2026-09-12T10:00:00Z",
  role: "cctv",
  status: "shortlisted",
  ...props,
});
const cohort = (id, props = {}) => ({
  id,
  roleId: "cctv",
  name: id,
  openedAt: "2026-09-01T00:00:00Z",
  status: "closed",
  stages: ["applications", "testing"],
  screeningRules: [],
  ...props,
});

test("cohorts never absorb another batch's archived candidates or hires", () => {
  const cs = [cohort("old"), cohort("new")];
  const apps = [
    candidate("one", { cohortId: "old", status: "hired" }),
    candidate("two", { cohortId: "new", status: "archived" }),
  ];
  assert.deepEqual(
    w.applicationsForCohort(apps, cs[0], cs).map((a) => a.id),
    ["one"],
  );
});
test("unassigned records appear once in a review bucket, not every batch", () => {
  const apps = [candidate("unassigned")];
  const cs = w.buildCohortCatalog([cohort("old"), cohort("new")], [], apps);
  assert.equal(cs.filter((c) => c.unassigned).length, 1);
  assert.equal(
    cs.flatMap((c) => w.applicationsForCohort(apps, c, cs)).length,
    1,
  );
});
test("an active cohort is never archived because its ID includes cohort", () => {
  const cs = w.buildCohortCatalog(
    [cohort("active_cohort", { status: "active" })],
    [],
    [candidate("one", { cohortId: "active_cohort" })],
  );
  assert.equal(cs[0].status, "active");
  assert.equal(cs.length, 1);
});
test("bookings, attendance, completed tests and scores are independent", () => {
  const m = w.recruitmentMetrics([
    candidate("booked", { testSlot: "slot" }),
    candidate("attended", { attendedAt: "2026-09-16" }),
    candidate("scored", { testScore: 0 }),
    candidate("tested", { status: "tested" }),
    candidate("invited", { status: "test_invited" }),
  ]);
  assert.equal(m.booked, 1);
  assert.equal(m.attended, 1);
  assert.equal(m.tested, 2);
  assert.equal(m.scored, 1);
  assert.equal(m.invited, 1);
});
test("non-finite and missing scores do not invent results", () => {
  assert.equal(w.hasScore(candidate("one", { testScore: NaN })), false);
  assert.equal(w.hasTested(candidate("one", { testScore: Infinity })), false);
});
test("a token alone does not prove next-phase selection", () => {
  assert.equal(
    w.isNextPhase(
      candidate("one", { nextPhaseToken: "old-get-created-token" }),
    ),
    false,
  );
});
test("declined and rejected applicants are not eligible to invite", () => {
  for (const status of [
    "not_advancing",
    "rejected",
    "withdrawn",
    "hired",
    "archived",
  ])
    assert.equal(
      w.isEligibleForTest(
        candidate("one", {
          status,
          screeningResult: { passedMandatory: true },
        }),
      ),
      false,
    );
});
test("technical-manager test eligibility requires confirmed metro residence", () => {
  assert.equal(
    w.isEligibleForTest(
      candidate("one", {
        role: "cctv_technical_manager",
        whatsapp: "+258841234567",
      }),
    ),
    false,
  );
  assert.equal(
    w.isEligibleForTest(
      candidate("one", {
        role: "cctv_technical_manager",
        currentLocation: "Matola",
      }),
    ),
    true,
  );
});
test("unknown location and national phone number do not establish residence", () => {
  assert.equal(location({ whatsapp: "+258841234567" }).group, "unknown");
  assert.equal(
    location({ currentLocation: "Unknown village" }).group,
    "unknown",
  );
  assert.equal(location({ currentLocation: "Maputo" }).group, "maputo_region");
  assert.equal(
    location({ currentLocation: "Mumbai" }).group,
    "outside_mozambique",
  );
  assert.equal(
    location({ currentLocation: "Beira" }).group,
    "mozambique_other",
  );
});
test("location matching respects word boundaries", () => {
  assert.equal(
    location({ currentLocation: "Human resources" }).group,
    "unknown",
  );
  assert.equal(
    location({ currentLocation: "Mavalane, Moçambique" }).group,
    "maputo_region",
  );
});
test("historical recovery preserves explicit archival decisions and does not guess qualification", () => {
  const a = candidate("one", {
    status: "archived",
    grade12: "yes",
    shifts: "yes",
  });
  const result = w.resolveApplication(a);
  assert.equal(result.status, "archived");
  assert.equal(result.stageSource, "unresolved");
  assert.equal(a.status, "archived");
  assert.equal(
    w.resolveApplication({ ...a, archiveReason: "Duplicate", testScore: 90 })
      .status,
    "archived",
  );
});
test("regional decline evidence outranks old tests and screening", () => {
  const result = w.resolveApplication(
    candidate("one", {
      status: "archived",
      testScore: 80,
      activityLog: [{ action: "Declined: Outside Mozambique" }],
    }),
  );
  assert.equal(result.status, "not_advancing");
});
test("recorded status before archival recovers training/interview accurately", () => {
  assert.equal(
    w.resolveApplication(
      candidate("one", { status: "archived", statusBeforeArchive: "training" }),
    ).status,
    "training",
  );
});
test("numeric screening supports ranges and rejects negative/infinite experience", () => {
  const criteria = rules.cctv_technical_manager.filter(
    (r) => r.field === "yearsCctvExperience",
  );
  for (const value of ["1-2", "8+", "1_2"])
    assert.equal(
      evaluate({ yearsCctvExperience: value }, criteria).passedMandatory,
      true,
    );
  for (const value of ["0", "-2", "none", Infinity])
    assert.equal(
      evaluate({ yearsCctvExperience: value }, criteria).passedMandatory,
      false,
    );
});
test("custom string rules use their configured expected value", () => {
  const criteria = [
    {
      id: "area",
      field: "currentLocation",
      labelPt: "Local",
      labelEn: "Location",
      type: "string",
      mandatory: true,
      expectedValue: "Matola",
    },
  ];
  assert.equal(
    evaluate({ currentLocation: "Beira" }, criteria).passedMandatory,
    false,
  );
  assert.equal(
    evaluate({ currentLocation: "MATOLA" }, criteria).passedMandatory,
    true,
  );
});

test("saved screening recovers a shortlist without overriding a later decline", () => {
  assert.equal(
    w.resolveApplication(
      candidate("one", {
        status: "archived",
        screeningResult: { passedMandatory: true },
      }),
    ).status,
    "shortlisted",
  );
  assert.equal(
    w.resolveApplication(
      candidate("one", {
        status: "archived",
        screeningResult: { passedMandatory: true },
        activityLog: [
          { action: "Stage Transition: shortlisted" },
          { action: "Declined: Outside Mozambique" },
        ],
      }),
    ).status,
    "not_advancing",
  );
});
test("stale active cohort metadata follows authoritative intake closure", () => {
  const cs = w.buildCohortCatalog(
    [cohort("current", { status: "active" })],
    [{ id: "cctv", open: false }],
    [],
  );
  assert.equal(cs[0].status, "closed");
});
test("date parsing validates calendar dates and preserves ISO times", () => {
  const { parseSlotComponents, isSlotToday } = require("../src/lib/careers.ts");
  assert.equal(parseSlotComponents("2027-02-29 10:00"), null);
  assert.equal(parseSlotComponents("2026-10-22 25:00"), null);
  assert.equal(parseSlotComponents("2027-01-02 14:30").hour, 14);
  assert.equal(parseSlotComponents("02/01/2027 14:30").month, 1);
  assert.equal(
    isSlotToday("2026-09-21 10:00", new Date("2026-10-21T07:30:00Z")),
    false,
  );
});
test("booking validates invitation, configured sessions, capacity, grace and proper stage", () => {
  const {
    validateReservation,
  } = require("../src/lib/careers-booking-rules.ts");
  const now = new Date("2026-10-21T06:00:00Z");
  const slot = "2026-10-22 10:00";
  const config = { slots: [slot], quota: 1 };
  const invited = candidate("one", {
    invitedAt: "2026-10-20",
    status: "test_invited",
  });
  assert.equal(
    validateReservation(invited, slot, config, [], now).status,
    "test_booked",
  );
  assert.throws(
    () => validateReservation(candidate("one"), slot, config, [], now),
    /INVITATION_REQUIRED/,
  );
  assert.throws(
    () => validateReservation(invited, "2099-01-01 10:00", config, [], now),
    /INVALID_SLOT/,
  );
  assert.throws(
    () =>
      validateReservation(
        invited,
        slot,
        config,
        [candidate("two", { testSlot: slot })],
        now,
      ),
    /SLOT_FULL/,
  );
  assert.throws(
    () =>
      validateReservation(
        {
          ...invited,
          testSlot: "old",
          rebookingGrace: { expiresAt: "2026-10-20", usedAt: null },
        },
        slot,
        config,
        [],
        now,
      ),
    /ALREADY_BOOKED/,
  );
  const result = validateReservation(
    {
      ...invited,
      testSlot: "old",
      rebookingGrace: { expiresAt: "2026-10-23", usedAt: null },
    },
    slot,
    config,
    [],
    now,
  );
  assert.equal(result.rebookingGrace.usedAt, now.toISOString());
});

test("CSV exports quote delimiters and block applicant-supplied formulas", () => {
  const { csvCell } = require("../src/lib/csv.ts");
  assert.equal(csvCell('Name, "quoted"'), '\"Name, \"\"quoted\"\"\"');
  assert.equal(csvCell("=HYPERLINK(1)"), '\"\'=HYPERLINK(1)\"');
  assert.equal(csvCell(0), '\"0\"');
});

test("local lifecycle preserves stages, snapshots, cohort isolation and deletion across reload", async () => {
  // No test may connect to a real database or write into the user's project data directory.
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "VERCEL",
    "AWS_LAMBDA_FUNCTION_NAME",
  ])
    delete process.env[key];
  process.env.NODE_ENV = "test";
  const cwd = process.cwd();
  const temp = mkdtempSync(path.join(os.tmpdir(), "overwatch-workflow-test-"));
  process.chdir(temp);
  try {
    const config = require(path.join(root, "src/lib/careers-config-store.ts"));
    const store = require(path.join(root, "src/lib/careers-store.ts"));
    const campaigns = require(
      path.join(root, "src/lib/careers-campaign-store.ts"),
    );
    const role = {
      id: "cctv",
      en: "CCO",
      pt: "CCO",
      department: "Operations",
      open: true,
      activeCohortId: "current",
      pipelineStages: ["applications", "testing", "training"],
      screeningRules: [],
      createdAt: "2026-09-01",
      updatedAt: "2026-09-01",
    };
    await config.setConfiguredRoles([role]);
    await config.setConfiguredCohorts([
      cohort("current", { status: "active" }),
      cohort("old"),
    ]);
    await store.bulkSaveApplications([
      candidate("current-candidate", {
        cohortId: "current",
        status: "training",
      }),
      candidate("prior-hire", { cohortId: "old", status: "hired" }),
    ]);
    const closed = await campaigns.closeAndArchiveRoleCohort("cctv");
    assert.equal(closed.archivedCohort.status, "closed");
    assert.equal(closed.archivedCohort.closureSnapshot.applications.length, 1);
    assert.equal(
      (await store.getApplication("current-candidate")).status,
      "training",
    );
    assert.equal((await store.getApplication("prior-hire")).cohortId, "old");
    const repeat = await campaigns.closeAndArchiveRoleCohort("cctv");
    assert.equal(repeat.archivedCohort.id, "current");
    const reopened = await campaigns.openRoleCohort("cctv");
    assert.notEqual(reopened.cohort.id, "current");
    const repeatOpen = await campaigns.openRoleCohort("cctv");
    assert.equal(repeatOpen.cohort.id, reopened.cohort.id);
    assert.equal((await store.getApplication("prior-hire")).cohortId, "old");
    await campaigns.deleteRoleDefinition("cctv");
    campaigns.invalidateCampaignStoreCache();
    assert.deepEqual(await campaigns.getRoleDefinitions(), []);
  } finally {
    process.chdir(cwd);
  }
});

const { cycleLabel, cycleMonth } = require("../src/lib/careers-cycle-label.ts");
test("archive cycle labels use selected language and closure month in Maputo", () => {
  const role = { en: "Technical Manager", pt: "Gestor Técnico" };
  const c = { name: "Concurso Encerrado", openedAt: "2026-09-01", closedAt: "2026-09-30T23:00:00Z" };
  assert.equal(cycleLabel(c, role, "en"), "Technical Manager — Recruitment cycle October 2026");
  assert.match(cycleLabel(c, role, "pt"), /Gestor Técnico — Lote outubro de 2026/);
  assert.equal(cycleMonth("bad date", "en"), "");
});
test("legacy archive names keep historical period and localize unassigned records", () => {
  const role = { en: "Operator", pt: "Operadora" };
  assert.equal(cycleLabel({ name: "Operadora — Lote Setembro 2026", openedAt: "2026-10-01" }, role, "en"), "Operator — Recruitment cycle September 2026");
  assert.equal(cycleLabel({ name: "Concurso Encerrado", openedAt: "2026-10-01" }, role, "en"), "Operator — Recruitment cycle October 2026");
  assert.match(cycleLabel({ unassigned: true }, role, "en"), /Unassigned records/);
});
const { validAdminSettings } = require("../src/lib/admin-settings.ts");
test("settings reject invalid capacity, email and header injection", () => {
  const valid = { senderName: "Recruitment", replyToEmail: "qa@example.invalid", quota: 15 };
  assert.equal(validAdminSettings(valid), true);
  for (const patch of [{ quota: 0 }, { quota: 201 }, { quota: 1.5 }, { replyToEmail: "bad" }, { senderName: "Injected\r\nBcc: hidden@example.invalid" }]) assert.equal(validAdminSettings({ ...valid, ...patch }), false);
});

test("explicit terminal decisions never reappear in next-phase metrics through stale response data", () => {
  for (const status of ["archived", "rejected", "not_advancing", "withdrawn", "disqualified", "no_show"]) {
    const a = candidate("terminal", { status, nextPhaseResponse: "yes", nextPhaseInvitedAt: "2026-09-10", nextPhaseStatus: "confirmed" });
    assert.equal(w.isNextPhase(a), false, status);
    assert.equal(w.recruitmentMetrics([a]).confirmed, 0, status);
  }
});

test("holiday rescheduling never mistakes another month's 25th for September", () => {
  const { isFriday25Sept } = require("../src/lib/careers.ts");
  assert.equal(isFriday25Sept("Sexta-feira, 25 de Dezembro 2026 – 10h00"), false);
  assert.equal(isFriday25Sept("Sexta-feira, 25 de Setembro 2026 – 10h00"), true);
});

const { recruitmentDashboard, dashboardCandidates, dashboardPredicates } = require("../src/lib/recruitment-dashboard.ts");
test("global dashboard retains closed-cycle history when no roles are open", () => {
  const roles = [{ id: "cctv", open: false, activeCohortId: null }, { id: "technical", open: false }];
  const cycles = [cohort("september"), cohort("october", { roleId: "technical" })];
  const records = [candidate("one", { cohortId: "september", testSlot: "2026-09-20", testScore: 82 }), candidate("two", { role: "technical", cohortId: "october" }), candidate("three", { role: "cctv_operator", cohortId: "september", status: "archived" })];
  const model = recruitmentDashboard(records, roles, cycles, "all");
  assert.equal(model.metrics.total, 3);
  assert.equal(model.openRoles.length, 0);
  assert.equal(model.closedCycles.length, 2);
  assert.equal(model.roles.find(r => r.role.id === "cctv").metrics.total, 2);
  assert.equal(recruitmentDashboard(records, roles, cycles, "open").metrics.total, 0);
});
test("open dashboard excludes previous cycles after a role reopens and does not guess unassigned membership", () => {
  const roles = [{ id: "cctv", open: true, activeCohortId: "new" }];
  const cycles = [cohort("old"), cohort("new", { status: "active" })];
  const records = [candidate("old-record", { cohortId: "old" }), candidate("new-record", { cohortId: "new" }), candidate("unassigned")];
  assert.deepEqual(dashboardCandidates(records, roles, cycles, "open").map(a => a.id), ["new-record"]);
  assert.equal(recruitmentDashboard(records, roles, cycles, "all").metrics.total, 3);
});
test("every dashboard count opens its exact records, including historical bookings and outcomes", () => {
  const roles = [{ id: "cctv", open: false }];
  const cycles = [cohort("old")];
  const records = [candidate("booked", { cohortId: "old", status: "rejected", testSlot: "past-slot" }), candidate("attended", { cohortId: "old", attendedAt: "2026-09-20" }), candidate("scored", { cohortId: "old", testScore: 0 }), candidate("confirmed", { cohortId: "old", status: "interest_confirmed", nextPhaseResponse: "yes" })];
  for (const scope of ["all", "open"]) {
    const model = recruitmentDashboard(records, roles, cycles, scope);
    for (const metric of Object.keys(dashboardPredicates)) assert.equal(dashboardCandidates(records, roles, cycles, scope, metric).length, model.metrics[metric], `${scope}/${metric}`);
  }
  const model = recruitmentDashboard(records, roles, cycles, "all");
  assert.equal(model.metrics.booked, 1);
  assert.equal(model.metrics.attended, 1);
  assert.equal(model.metrics.tested, 1);
});
test("dashboard respects explicitly empty role lists and never invents active roles", () => {
  const records = [candidate("legacy")];
  assert.equal(recruitmentDashboard(records, [], [], "all").metrics.total, 1);
  assert.equal(recruitmentDashboard(records, [], [], "all").roles.length, 0);
  assert.equal(recruitmentDashboard(records, [], [], "open").metrics.total, 0);
});

test("role filters retain a dashboard drilldown instead of opening the entire role workspace", () => {
  const { isDashboardRoster } = require("../src/lib/recruitment-dashboard.ts");
  assert.equal(isDashboardRoster(new URLSearchParams("scope=all&metric=booked&role=cctv")), true);
  assert.equal(isDashboardRoster(new URLSearchParams("scope=open&role=cctv")), true);
  assert.equal(isDashboardRoster(new URLSearchParams("role=cctv")), false);
});
