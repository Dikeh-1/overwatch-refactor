require("../scripts/register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const role = {
  id: "cctv",
  en: "CCO",
  pt: "CCO",
  open: true,
  activeCohortId: "current",
  pipelineStages: ["applications", "testing"],
  screeningRules: [],
  createdAt: "2026-09-01",
};
const cohorts = [
  {
    id: "current",
    roleId: "cctv",
    status: "active",
    stages: role.pipelineStages,
    screeningRules: [],
    openedAt: "2026-09-01",
  },
  {
    id: "prior",
    roleId: "cctv",
    status: "closed",
    stages: [],
    screeningRules: [],
    openedAt: "2026-08-01",
  },
];
const apps = [
  {
    id: "current-app",
    role: "cctv",
    cohortId: "current",
    status: "training",
    createdAt: "2026-09-10",
  },
  { id: "prior-hire", role: "cctv", cohortId: "prior", status: "hired" },
];
const calls = [];
let fail = true;
const fake = {
  async query(sql, params = []) {
    calls.push([sql, params]);
    if (sql.includes("SELECT value FROM system_configs"))
      return {
        rows: [
          {
            value:
              params[0] === "roles_config"
                ? [role]
                : params[0] === "cohorts"
                  ? cohorts
                  : { slots: [], quota: 15 },
          },
        ],
      };
    if (sql.includes("SELECT key, value"))
      return {
        rows: [
          { key: "roles_config", value: [role] },
          { key: "cohorts", value: cohorts },
        ],
      };
    if (sql.includes("SELECT id, open"))
      return { rows: [{ id: "cctv", open: true }] };
    if (sql.includes("SELECT id, data"))
      return { rows: apps.map((data) => ({ id: data.id, data })) };
    if (
      fail &&
      sql.includes("INSERT INTO system_configs") &&
      params[0] === "cohorts"
    )
      throw new Error("simulated database failure");
    return { rows: [] };
  },
  async connect() {
    return this;
  },
  release() {},
};
const original = Module._load;
Module._load = function (name, ...args) {
  return name === "pg"
    ? {
        Pool: class {
          constructor() {
            return fake;
          }
        },
      }
    : original.call(this, name, ...args);
};
process.env.DATABASE_URL = "postgres://fixture.invalid/test";
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
const campaigns = require("../src/lib/careers-campaign-store.ts");

test("database failure rolls back cohort, membership and role closure", async () => {
  await assert.rejects(
    campaigns.closeAndArchiveRoleCohort("cctv"),
    /simulated database failure/,
  );
  assert.ok(calls.some(([sql]) => sql === "ROLLBACK"));
  assert.equal(
    calls.some(([sql]) => sql === "COMMIT"),
    false,
  );
  assert.equal(
    calls.some(([sql]) => sql.includes("INSERT INTO career_roles")),
    false,
  );
});
test("successful database closure commits one snapshot without rewriting candidate stages", async () => {
  fail = false;
  calls.length = 0;
  const result = await campaigns.closeAndArchiveRoleCohort("cctv");
  assert.equal(result.role.open, false);
  assert.equal(result.archivedCohort.closureSnapshot.applications.length, 1);
  assert.equal(
    result.archivedCohort.closureSnapshot.applications[0].status,
    "training",
  );
  assert.ok(calls.some(([sql]) => sql.includes("pg_advisory_xact_lock")));
  assert.ok(calls.some(([sql]) => sql === "COMMIT"));
  assert.equal(
    calls.some(([sql]) => /UPDATE career_applications.*status/.test(sql)),
    false,
  );
});
