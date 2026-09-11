import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
const base = process.env.CAREERS_TEST_URL || "http://localhost:3000";
const password =
  process.env.CAREERS_TEST_PASSWORD ||
  process.env.CAREERS_ADMIN_PASSWORD ||
  "OverwatchRecruit2026!";
let cookie = "";
const headers = () => ({
  "Content-Type": "application/json",
  origin: base,
  cookie,
});
function form(role = "cctv", cv = "%PDF-1.4\n%%EOF") {
  const data = new FormData();
  for (const [k, v] of Object.entries({
    name: "Recruitment QA Fixture",
    email: "qa@example.invalid",
    whatsapp: "+258 840000000",
    role,
    locale: "pt",
    grade12: "yes",
    sex: "female",
    ai: "no",
    experience: "yes",
    lastProfession: "QA fixture",
    shifts: "yes",
    coverLetter: "QA fixture cover letter content",
  }))
    data.set(k, v);
  data.set("cv", new Blob([cv], { type: "application/pdf" }), "qa-cv.pdf");
  return data;
}
test("Recruitment flow: authorization, locked roles, validation, persistence, CVs and stage updates", async () => {
  assert.equal((await fetch(base + "/api/admin/careers")).status, 401);
  assert.equal((await fetch(base + "/api/admin/cv?id=anything")).status, 401);
  const login = await fetch(base + "/api/admin/session", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  const get = async () => {
    const r = await fetch(base + "/api/admin/careers", { headers: { cookie } });
    assert.equal(r.status, 200);
    return r.json();
  };
  const initial = await get();
  assert.equal(initial.roles.find((r) => r.id === "cctv").open, true);
  assert.equal(
    (
      await fetch(base + "/api/careers", {
        method: "POST",
        body: form("sales"),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await fetch(base + "/api/careers", {
        method: "POST",
        body: form("cctv", "not a PDF"),
      })
    ).status,
    400,
  );
  const bad = form();
  bad.set("grade12", "maybe");
  assert.equal(
    (await fetch(base + "/api/careers", { method: "POST", body: bad })).status,
    400,
  );
  const missing = form();
  missing.delete("sex");
  assert.equal(
    (await fetch(base + "/api/careers", { method: "POST", body: missing }))
      .status,
    400,
  );
  let id;
  try {
    const response = await fetch(base + "/api/careers", {
      method: "POST",
      body: form(),
    });
    assert.equal(response.status, 200);
    id = (await response.json()).id;
    const saved = (await get()).applications.find((a) => a.id === id);
    assert.equal(saved.sex, "female");
    assert.equal(saved.locale, "pt");
    assert.equal(saved.ai, "no");
    assert.equal(saved.grade12, "yes");
    assert.equal(saved.experience, "yes");
    assert.equal(saved.shifts, "yes");
    assert.equal(saved.lastProfession, "QA fixture");
    assert.equal(saved.coverLetter, "QA fixture cover letter content");
    assert.equal(saved.cvName, "qa-cv.pdf");
    const cv = await fetch(base + "/api/admin/cv?id=" + id, {
      headers: { cookie },
    });
    assert.equal(cv.status, 200);
    assert.match(cv.headers.get("content-disposition"), /^attachment;/);
    assert.equal(await cv.text(), "%PDF-1.4\n%%EOF");
    assert.match(cv.headers.get("cache-control"), /no-store/);

    const cvInline = await fetch(base + "/api/admin/cv?id=" + id + "&inline=1", {
      headers: { cookie },
    });
    assert.equal(cvInline.status, 200);
    assert.match(cvInline.headers.get("content-disposition"), /^inline;/);
    assert.equal(
      (
        await fetch(base + "/api/admin/careers", {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ kind: "status", id, status: "shortlisted" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (await get()).applications.find((a) => a.id === id).status,
      "shortlisted",
    );
    assert.equal(
      (
        await fetch(base + "/api/admin/careers", {
          method: "PATCH",
          headers: { ...headers(), origin: "https://untrusted.example" },
          body: JSON.stringify({ kind: "role", id: "cctv", open: false }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/admin/careers", {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ kind: "role", id: "cctv", open: false }),
        })
      ).status,
      200,
    );
    assert.equal(
      (await (await fetch(base + "/api/careers/roles")).json()).roles.find(
        (r) => r.id === "cctv",
      ).open,
      false,
    );
    assert.equal(
      (await fetch(base + "/api/careers", { method: "POST", body: form() }))
        .status,
      409,
    );
  } finally {
    await fetch(base + "/api/admin/careers", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ kind: "role", id: "cctv", open: true }),
    });
    // Only remove the fixture this test created, from local development storage.
    if (id) {
      const p = ".careers-data/applications.json";
      const rows = JSON.parse(await readFile(p, "utf8"));
      await writeFile(p, JSON.stringify(rows.filter((a) => a.id !== id)));
      await unlink(".careers-data/" + id);
    }
    await fetch(base + "/api/admin/session", {
      method: "DELETE",
      headers: headers(),
    });
    assert.equal(
      (await (await fetch(base + "/api/admin/session")).json()).authenticated,
      false,
    );
  }
});
