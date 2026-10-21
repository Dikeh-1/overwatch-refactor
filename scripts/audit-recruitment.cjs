require("./register-typescript.cjs");
const { Pool } = require("pg");
const {
  recruitmentMetrics,
  resolveApplication,
} = require("../src/lib/careers-workflow.ts");
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for this read-only audit");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query("SELECT data FROM career_applications");
    const liveRoles = await client.query("SELECT id, open FROM career_roles");
    const configs = await client.query(
      "SELECT key, value FROM system_configs WHERE key IN ('roles_config', 'cohorts')",
    );
    const apps = result.rows
      .map((r) => r.data)
      .filter(
        (a) =>
          a && a.role !== "__system_config__" && !a.id.startsWith("00000000-"),
      );
    const groups = new Map();
    for (const a of apps) {
      const key = `${a.role || "cctv"} / ${a.cohortId || "unassigned"}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    console.log(
      JSON.stringify(
        {
          readOnly: true,
          total: apps.length,
          groups: [...groups].map(([group, records]) => ({
            group,
            rawStatuses: records.reduce(
              (s, a) => ({ ...s, [a.status]: (s[a.status] || 0) + 1 }),
              {},
            ),
            metrics: recruitmentMetrics(records.map(resolveApplication)),
            storedScreeningPassed: records.filter(
              (a) => a.screeningResult?.passedMandatory === true,
            ).length,
            storedScreeningFailed: records.filter(
              (a) => a.screeningResult?.passedMandatory === false,
            ).length,
            missingScreening: records.filter((a) => !a.screeningResult).length,
            originalStageSaved: records.filter((a) => a.statusBeforeArchive)
              .length,
            declineDelivery: records.reduce((s, a) => {
              const status = a.locationDecline?.status || "unverified";
              s[status] = (s[status] || 0) + 1;
              return s;
            }, {}),
          })),
          authoritativeRoles: liveRoles.rows,
          roleStates: configs.rows
            .find((r) => r.key === "roles_config")
            ?.value?.map((r) => ({
              id: r.id,
              open: r.open,
              activeCohortId: r.activeCohortId,
            })),
          cohorts: configs.rows
            .find((r) => r.key === "cohorts")
            ?.value?.map((c) => ({
              id: c.id,
              roleId: c.roleId,
              status: c.status,
              stages: c.stages,
            })),
        },
        null,
        2,
      ),
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Read-only audit failed. Check database connectivity/configuration; no changes were made.",
  );
  process.exitCode = 1;
});
