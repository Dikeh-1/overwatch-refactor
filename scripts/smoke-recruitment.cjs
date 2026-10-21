const assert = require("node:assert/strict");
async function main() {
  const origin = process.env.RECRUITMENT_TEST_ORIGIN || "http://localhost:3100";
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
    throw new Error(
      "Smoke tests only run against an explicit localhost server",
    );
  const password =
    process.env.CAREERS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Administrator password is not configured");
  const login = await fetch(`${origin}/api/admin/session`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const get = async (path, status = 200) => {
    const response = await fetch(origin + path, { headers: { cookie } });
    assert.equal(response.status, status, path);
    return response.json();
  };
  const catalog = await get("/api/admin/careers/archive");
  assert.ok(catalog.archivedCohorts.length > 0);
  for (const cohort of catalog.archivedCohorts) {
    const detail = await get(
      `/api/admin/careers/archive?cohortId=${encodeURIComponent(cohort.id)}`,
    );
    assert.deepEqual(detail.metrics, cohort.metrics);
    assert.equal(detail.applications.length, cohort.metrics.total);
    assert.ok(
      detail.applications.every(
        (a) => a.cohortId === cohort.id || cohort.unassigned,
      ),
    );
    const next = await get(
      `/api/admin/careers/next-phase?cohortId=${encodeURIComponent(cohort.id)}`,
    );
    assert.equal(next.summary.totalSelected, detail.metrics.nextPhase);
    assert.ok(
      next.candidates.every((a) =>
        detail.applications.some((b) => b.id === a.id),
      ),
    );
  }
  await get(
    "/api/admin/careers/archive?cohortId=nonexistent-smoke-cohort",
    404,
  );
  const unauthenticated = await fetch(
    `${origin}/api/careers/check-in?query=smoke-fixture`,
  );
  assert.equal(unauthenticated.status, 401);
  const forgedGate = await fetch(`${origin}/api/gate/roster`, {
    headers: { "x-gate-token": "authorized_gate_officer" },
  });
  assert.equal(forgedGate.status, 401);
  const csrf = await fetch(`${origin}/api/admin/careers/archive`, {
    method: "PATCH",
    headers: {
      cookie,
      "Content-Type": "application/json",
      Origin: "https://untrusted.invalid",
    },
    body: JSON.stringify({ cohortId: "smoke", notes: "must not save" }),
  });
  assert.equal(csrf.status, 403);
  const forced = await fetch(`${origin}/api/careers/check-in`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "smoke-fixture", force: true }),
  });
  assert.equal(forced.status, 403);
  console.log(
    `PASS: ${catalog.archivedCohorts.length} archive cycles reconcile across catalog, detail and next-phase APIs; unknown cohorts, unauthorized attendance, forged gate tokens and cross-origin mutations are rejected. No candidate changes or emails were made.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
