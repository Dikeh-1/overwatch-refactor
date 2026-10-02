import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type CareerRoleDefinition,
  type CareerCohort,
  type PipelineStageKey,
  type ScreeningRule,
  ALL_PIPELINE_STAGES,
  DEFAULT_SCREENING_RULES_BY_ROLE,
} from "./careers-models";
import { roles as legacyRoles } from "./careers";
import { getApplications, bulkSaveApplications, setRole } from "./careers-store";

const directory = path.join(process.cwd(), ".careers-data");

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim().replace(/\/+$/, "");
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  ).trim();
}

function isRemote() {
  return Boolean(getSupabaseUrl() && getSupabaseKey() && getSupabaseKey().length > 10);
}

async function api(endpoint: string, init: RequestInit = {}) {
  const baseUrl = getSupabaseUrl();
  const key = getSupabaseKey();

  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };

  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Campaigns storage error (${response.status}): ${errorBody}`);
  }
  return response;
}

async function readLocal<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(directory, file), "utf8"));
  } catch (e: any) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeLocal(file: string, value: unknown) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, file), JSON.stringify(value, null, 2));
}

// Generate default initial roles if storage is fresh
function buildDefaultRoles(): CareerRoleDefinition[] {
  const now = new Date().toISOString();
  return legacyRoles.map((r) => {
    const defaultRules = DEFAULT_SCREENING_RULES_BY_ROLE[r.id] || [];
    const isTechMgr = r.id === "cctv_technical_manager";

    // Tech Manager skips physical aptitude test & gate check-in by default
    const stages: PipelineStageKey[] = isTechMgr
      ? ["applications", "screening", "interview", "hired"]
      : ["applications", "screening", "testing", "gate_checkin", "next_phase", "interview", "hired"];

    return {
      id: r.id,
      en: r.en,
      pt: r.pt,
      department: isTechMgr ? "Engenharia Técnica" : "Operações de Segurança",
      open: r.open,
      activeCohortId: r.open ? `${r.id}_initial_cohort` : null,
      pipelineStages: stages,
      screeningRules: defaultRules,
      createdAt: now,
      updatedAt: now,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MANAGEMENT (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

export async function getRoleDefinitions(): Promise<CareerRoleDefinition[]> {
  if (isRemote()) {
    try {
      const res = await api("/rest/v1/career_roles_config?select=*&order=created_at.asc");
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          en: r.en || r.title_en,
          pt: r.pt || r.title_pt,
          department: r.department || "Operações",
          descriptionEn: r.description_en,
          descriptionPt: r.description_pt,
          open: Boolean(r.open),
          activeCohortId: r.active_cohort_id,
          pipelineStages: r.pipeline_stages || [
            "applications",
            "screening",
            "interview",
            "hired",
          ],
          screeningRules: r.screening_rules || [],
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Fallback to legacy career_roles table in Supabase
      try {
        const res = await api("/rest/v1/career_roles?select=id,open");
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const defaults = buildDefaultRoles();
          return defaults.map((role) => {
            const row = rows.find(
              (r) =>
                r.id === role.id ||
                (role.id === "cctv" && r.id === "cctv_operator") ||
                (role.id === "cctv_operator" && r.id === "cctv"),
            );
            return {
              ...role,
              open: row ? Boolean(row.open) : role.open,
            };
          });
        }
      } catch {}
    }
  }

  const local = await readLocal<CareerRoleDefinition[]>("roles_def.json", []);
  if (local.length > 0) return local;

  const defaults = buildDefaultRoles();
  await writeLocal("roles_def.json", defaults);
  return defaults;
}

export async function saveRoleDefinition(
  role: CareerRoleDefinition,
): Promise<CareerRoleDefinition> {
  const roles = await getRoleDefinitions();
  const existingIdx = roles.findIndex((r) => r.id === role.id);
  const now = new Date().toISOString();
  const updatedRole = { ...role, updatedAt: now };

  let nextRoles: CareerRoleDefinition[];
  if (existingIdx >= 0) {
    nextRoles = roles.map((r) => (r.id === role.id ? updatedRole : r));
  } else {
    updatedRole.createdAt = now;
    nextRoles = [...roles, updatedRole];
  }

  await writeLocal("roles_def.json", nextRoles);

  if (isRemote()) {
    try {
      await api("/rest/v1/career_roles_config", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: updatedRole.id,
          title_en: updatedRole.en,
          title_pt: updatedRole.pt,
          department: updatedRole.department,
          description_en: updatedRole.descriptionEn,
          description_pt: updatedRole.descriptionPt,
          open: updatedRole.open,
          active_cohort_id: updatedRole.activeCohortId,
          pipeline_stages: updatedRole.pipelineStages,
          screening_rules: updatedRole.screeningRules,
          updated_at: updatedRole.updatedAt,
        }),
      });
    } catch (e) {
      console.warn("Could not sync role to Supabase:", e);
    }

    try {
      await api("/rest/v1/career_roles", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: updatedRole.id, open: updatedRole.open }),
      });
      if (updatedRole.id === "cctv" || updatedRole.id === "cctv_operator") {
        const alias = updatedRole.id === "cctv" ? "cctv_operator" : "cctv";
        await api("/rest/v1/career_roles", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({ id: alias, open: updatedRole.open }),
        }).catch(() => {});
      }
    } catch {}
  }

  return updatedRole;
}

export async function deleteRoleDefinition(roleId: string): Promise<void> {
  const roles = await getRoleDefinitions();
  const nextRoles = roles.filter((r) => r.id !== roleId);
  await writeLocal("roles_def.json", nextRoles);

  if (isRemote()) {
    try {
      await api(`/rest/v1/career_roles_config?id=eq.${roleId}`, {
        method: "DELETE",
      });
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT / CAMPAIGN WORKSPACE MANAGEMENT & ARCHIVING
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCohorts(): Promise<CareerCohort[]> {
  if (isRemote()) {
    try {
      const res = await api("/rest/v1/career_cohorts?select=*&order=opened_at.desc");
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          roleId: r.role_id,
          name: r.name,
          openedAt: r.opened_at,
          closedAt: r.closed_at,
          status: r.status,
          stages: r.stages || [],
          screeningRules: r.screening_rules || [],
          notes: r.notes,
        }));
      }
    } catch {}
  }

  return readLocal<CareerCohort[]>("cohorts.json", []);
}

export async function saveCohort(cohort: CareerCohort): Promise<CareerCohort> {
  const cohorts = await getAllCohorts();
  const idx = cohorts.findIndex((c) => c.id === cohort.id);
  const next = idx >= 0 ? cohorts.map((c) => (c.id === cohort.id ? cohort : c)) : [cohort, ...cohorts];

  await writeLocal("cohorts.json", next);

  if (isRemote()) {
    try {
      await api("/rest/v1/career_cohorts", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: cohort.id,
          role_id: cohort.roleId,
          name: cohort.name,
          opened_at: cohort.openedAt,
          closed_at: cohort.closedAt,
          status: cohort.status,
          stages: cohort.stages,
          screening_rules: cohort.screeningRules,
          notes: cohort.notes,
        }),
      });
    } catch {}
  }

  return cohort;
}

/**
 * Open a new recruitment cycle for a role.
 * Generates an isolated, fresh cohort so old candidates never mix in.
 */
export async function openRoleCohort(
  roleId: string,
  customCohortName?: string,
): Promise<{ role: CareerRoleDefinition; cohort: CareerCohort }> {
  const roles = await getRoleDefinitions();
  const role = roles.find(
    (r) =>
      r.id === roleId ||
      (roleId === "cctv" && r.id === "cctv_operator") ||
      (roleId === "cctv_operator" && r.id === "cctv"),
  );
  if (!role) throw new Error(`Role not found: ${roleId}`);

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-MZ", { month: "short", year: "numeric" });
  const cohortId = `${role.id}_${now.getFullYear()}_${now.getMonth() + 1}_${Date.now().toString(36)}`;

  const cohortName =
    customCohortName?.trim() ||
    `${role.pt} — Lote ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`;

  const cohort: CareerCohort = {
    id: cohortId,
    roleId: role.id,
    name: cohortName,
    openedAt: now.toISOString(),
    status: "active",
    stages: role.pipelineStages,
    screeningRules: role.screeningRules,
  };

  await saveCohort(cohort);

  const updatedRole: CareerRoleDefinition = {
    ...role,
    open: true,
    activeCohortId: cohortId,
    updatedAt: now.toISOString(),
  };
  await saveRoleDefinition(updatedRole);

  // Synchronize open state in legacy roles and all aliases
  await setRole(role.id, true).catch(() => {});
  if (role.id === "cctv" || role.id === "cctv_operator") {
    await setRole("cctv", true).catch(() => {});
    await setRole("cctv_operator", true).catch(() => {});
  }

  return { role: updatedRole, cohort };
}

/**
 * Close and archive the active recruitment cycle for a role.
 * All candidates and records remain sealed in the historical vault.
 * The active workspace is cleared for the next recruitment cycle.
 */
export async function closeAndArchiveRoleCohort(
  roleId: string,
  archiveNotes?: string,
): Promise<{ role: CareerRoleDefinition; archivedCohort: CareerCohort | null }> {
  const roles = await getRoleDefinitions();
  const role = roles.find(
    (r) =>
      r.id === roleId ||
      (roleId === "cctv" && r.id === "cctv_operator") ||
      (roleId === "cctv_operator" && r.id === "cctv"),
  );
  if (!role) throw new Error(`Role not found: ${roleId}`);

  const cohorts = await getAllCohorts();
  const now = new Date().toISOString();

  // Find existing active cohort or synthesize one so it always saves to vault
  let cohortToArchive = role.activeCohortId
    ? cohorts.find((c) => c.id === role.activeCohortId)
    : null;

  if (!cohortToArchive) {
    const cohortId = role.activeCohortId || `${role.id}_cohort_${Date.now().toString(36)}`;
    cohortToArchive = {
      id: cohortId,
      roleId: role.id,
      name: `${role.pt} — Concurso Encerrado`,
      openedAt: role.createdAt || now,
      closedAt: now,
      status: "archived",
      stages: role.pipelineStages,
      screeningRules: role.screeningRules,
      notes: archiveNotes || "",
    };
  } else {
    cohortToArchive = {
      ...cohortToArchive,
      status: "archived",
      closedAt: now,
      notes: archiveNotes || cohortToArchive.notes || "",
    };
  }

  await saveCohort(cohortToArchive);

  // Seal all current candidates belonging to this role cohort
  try {
    const allApps = await getApplications();
    let updatedAny = false;
    const targetCohortId = cohortToArchive.id;

    const updatedApps = allApps.map((app) => {
      const isThisRole =
        app.role === role.id ||
        (role.id === "cctv" && (!app.role || app.role === "cctv" || app.role === "cctv_operator")) ||
        (role.id === "cctv_operator" && (!app.role || app.role === "cctv" || app.role === "cctv_operator"));

      if (isThisRole && (!app.cohortId || app.cohortId === role.activeCohortId)) {
        updatedAny = true;
        return {
          ...app,
          cohortId: targetCohortId,
          status: (app.status === "hired" ? "hired" : "archived") as any,
        };
      }
      return app;
    });

    if (updatedAny) {
      await bulkSaveApplications(updatedApps);
    }
  } catch (err) {
    console.warn("Could not seal applications to cohort:", err);
  }

  const updatedRole: CareerRoleDefinition = {
    ...role,
    open: false,
    activeCohortId: null,
    updatedAt: now,
  };
  await saveRoleDefinition(updatedRole);

  // Synchronize closed state in legacy roles and all aliases
  await setRole(role.id, false).catch(() => {});
  if (role.id === "cctv" || role.id === "cctv_operator") {
    await setRole("cctv", false).catch(() => {});
    await setRole("cctv_operator", false).catch(() => {});
  }

  return { role: updatedRole, archivedCohort: cohortToArchive };
}
