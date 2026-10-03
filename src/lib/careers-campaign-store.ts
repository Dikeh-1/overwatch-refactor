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
import {
  getApplications,
  bulkSaveApplications,
  setRole,
  SYSTEM_COHORTS_UUID,
  SYSTEM_ROLES_CONFIG_UUID,
} from "./careers-store";

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

function isServerless() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production"
  );
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

// In-memory runtime cache for serverless environments
let inMemoryRoleDefs: CareerRoleDefinition[] | null = null;
let inMemoryCohorts: CareerCohort[] | null = null;

async function readLocal<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(directory, file), "utf8"));
  } catch {
    return fallback;
  }
}

async function writeLocal(file: string, value: unknown) {
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, file), JSON.stringify(value, null, 2));
  } catch (e) {
    // Silently ignore filesystem errors in environments where disk write is restricted
  }
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
    let remoteConfigs: CareerRoleDefinition[] | null = null;

    // 1. Try to fetch from SYSTEM_ROLES_CONFIG_UUID in career_applications (Guaranteed remote persistence)
    try {
      const res = await api(`/rest/v1/career_applications?id=eq.${SYSTEM_ROLES_CONFIG_UUID}&select=data`);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]?.data?.roles && Array.isArray(rows[0].data.roles) && rows[0].data.roles.length > 0) {
        remoteConfigs = rows[0].data.roles;
      }
    } catch {}

    // 2. Try to fetch from rich config table if it exists in Supabase
    if (!remoteConfigs) {
      try {
        const res = await api("/rest/v1/career_roles_config?select=*&order=created_at.asc");
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          remoteConfigs = rows.map((r: any) => ({
            id: r.id,
            en: r.en || r.title_en || r.id,
            pt: r.pt || r.title_pt || r.id,
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
            screeningRules: r.screening_rules || DEFAULT_SCREENING_RULES_BY_ROLE[r.id] || [],
            createdAt: r.created_at || new Date().toISOString(),
            updatedAt: r.updated_at || new Date().toISOString(),
          }));
        }
      } catch {
        // Table may not exist yet or not migrated
      }
    }

    // 3. Fetch authoritative open/closed status from Supabase career_roles
    const remoteOpenMap: Record<string, boolean> = {};
    try {
      const res = await api("/rest/v1/career_roles?select=id,open");
      const rows = await res.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.id) {
            remoteOpenMap[row.id] = Boolean(row.open);
          }
        }
      }
    } catch (e) {
      console.warn("Could not query career_roles from Supabase:", e);
    }

    // Combine configs or fallback to defaults
    let roles: CareerRoleDefinition[] = remoteConfigs
      ? [...remoteConfigs]
      : inMemoryRoleDefs
      ? [...inMemoryRoleDefs]
      : buildDefaultRoles();

    // Ensure all standard default roles exist
    const defaultRoles = buildDefaultRoles();
    for (const def of defaultRoles) {
      const exists = roles.some(
        (r) =>
          r.id === def.id ||
          (def.id === "cctv" && r.id === "cctv_operator") ||
          (def.id === "cctv_operator" && r.id === "cctv"),
      );
      if (!exists) {
        roles.push(def);
      }
    }

    // Synchronize open state from Supabase career_roles
    roles = roles.map((role) => {
      let open = role.open;
      if (role.id in remoteOpenMap) {
        open = remoteOpenMap[role.id];
      } else if (role.id === "cctv" && "cctv_operator" in remoteOpenMap) {
        open = remoteOpenMap["cctv_operator"];
      } else if (role.id === "cctv_operator" && "cctv" in remoteOpenMap) {
        open = remoteOpenMap["cctv"];
      }

      const activeCohortId = open
        ? (role.activeCohortId || `${role.id}_cohort`)
        : null;

      return {
        ...role,
        open,
        activeCohortId,
        screeningRules:
          role.screeningRules && role.screeningRules.length > 0
            ? role.screeningRules
            : DEFAULT_SCREENING_RULES_BY_ROLE[role.id] || [],
      };
    });

    inMemoryRoleDefs = roles;
    return roles;
  }

  // Local development
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
  const existingIdx = roles.findIndex(
    (r) =>
      r.id === role.id ||
      (role.id === "cctv" && r.id === "cctv_operator") ||
      (role.id === "cctv_operator" && r.id === "cctv"),
  );
  const now = new Date().toISOString();
  const updatedRole = { ...role, updatedAt: now };

  let nextRoles: CareerRoleDefinition[];
  if (existingIdx >= 0) {
    const prevRole = roles[existingIdx];
    // If role was previously open, but is now closed directly, ensure its active cohort is sealed and saved to archive vault
    if (prevRole.open && !role.open) {
      try {
        const cohorts = await getAllCohorts();
        const activeCohort = cohorts.find(
          (c) => (c.roleId === role.id || (role.id === "cctv" && c.roleId === "cctv_operator")) && c.status === "active",
        ) || (prevRole.activeCohortId ? cohorts.find((c) => c.id === prevRole.activeCohortId) : null);

        if (activeCohort) {
          await saveCohort({
            ...activeCohort,
            status: "archived",
            closedAt: now,
          });
        } else {
          const cohortId = prevRole.activeCohortId || `${role.id}_cohort_${Date.now().toString(36)}`;
          await saveCohort({
            id: cohortId,
            roleId: role.id,
            name: `${role.pt || role.en} — Concurso Encerrado`,
            openedAt: prevRole.createdAt || now,
            closedAt: now,
            status: "archived",
            stages: role.pipelineStages || [],
            screeningRules: role.screeningRules || [],
          });
        }
      } catch (cohortErr) {
        console.warn("Could not auto-seal cohort on role close:", cohortErr);
      }
    }
    nextRoles = roles.map((r, idx) => (idx === existingIdx ? updatedRole : r));
  } else {
    updatedRole.createdAt = now;
    nextRoles = [...roles, updatedRole];
  }

  inMemoryRoleDefs = nextRoles;
  await writeLocal("roles_def.json", nextRoles);

  if (isRemote()) {
    // 1. Guaranteed storage in career_applications under SYSTEM_ROLES_CONFIG_UUID
    try {
      await api("/rest/v1/career_applications", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: SYSTEM_ROLES_CONFIG_UUID,
          data: { id: SYSTEM_ROLES_CONFIG_UUID, roles: nextRoles, updatedAt: now },
        }),
      });
    } catch {
      await api(`/rest/v1/career_applications?id=eq.${SYSTEM_ROLES_CONFIG_UUID}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: { id: SYSTEM_ROLES_CONFIG_UUID, roles: nextRoles, updatedAt: now },
        }),
      }).catch(() => {});
    }

    // 2. Also attempt saving to career_roles_config table
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
      console.warn("Could not sync role to Supabase career_roles_config:", e);
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
    } catch (e) {
      console.warn("Could not sync role to Supabase career_roles:", e);
    }
  }

  return updatedRole;
}

export async function deleteRoleDefinition(roleId: string): Promise<void> {
  const roles = await getRoleDefinitions();
  const nextRoles = roles.filter(
    (r) =>
      r.id !== roleId &&
      !(roleId === "cctv" && r.id === "cctv_operator") &&
      !(roleId === "cctv_operator" && r.id === "cctv"),
  );
  inMemoryRoleDefs = nextRoles;
  await writeLocal("roles_def.json", nextRoles);

  if (isRemote()) {
    try {
      await api(`/rest/v1/career_roles_config?id=eq.${roleId}`, {
        method: "DELETE",
      });
    } catch {}
    try {
      await api(`/rest/v1/career_roles?id=eq.${roleId}`, {
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
    // 1. Check SYSTEM_COHORTS_UUID in career_applications (Guaranteed persistence)
    try {
      const res = await api(`/rest/v1/career_applications?id=eq.${SYSTEM_COHORTS_UUID}&select=data`);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]?.data?.cohorts && Array.isArray(rows[0].data.cohorts) && rows[0].data.cohorts.length > 0) {
        inMemoryCohorts = rows[0].data.cohorts;
        return rows[0].data.cohorts;
      }
    } catch {}

    // 2. Fallback to career_cohorts table if it exists
    try {
      const res = await api("/rest/v1/career_cohorts?select=*&order=opened_at.desc");
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const remote = rows.map((r: any) => ({
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
        inMemoryCohorts = remote;
        return remote;
      }
    } catch {}

    if (inMemoryCohorts && inMemoryCohorts.length > 0) return inMemoryCohorts;
    const localFallback = await readLocal<CareerCohort[]>("cohorts.json", []);
    if (localFallback.length > 0) {
      inMemoryCohorts = localFallback;
      return localFallback;
    }
    return [];
  }

  return readLocal<CareerCohort[]>("cohorts.json", []);
}

export async function saveCohort(cohort: CareerCohort): Promise<CareerCohort> {
  const cohorts = await getAllCohorts();
  const idx = cohorts.findIndex((c) => c.id === cohort.id);
  const next = idx >= 0 ? cohorts.map((c) => (c.id === cohort.id ? cohort : c)) : [cohort, ...cohorts];

  inMemoryCohorts = next;
  await writeLocal("cohorts.json", next);

  if (isRemote()) {
    // 1. Guaranteed storage in career_applications under SYSTEM_COHORTS_UUID
    try {
      await api("/rest/v1/career_applications", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: SYSTEM_COHORTS_UUID,
          data: { id: SYSTEM_COHORTS_UUID, cohorts: next, updatedAt: new Date().toISOString() },
        }),
      });
    } catch {
      await api(`/rest/v1/career_applications?id=eq.${SYSTEM_COHORTS_UUID}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: { id: SYSTEM_COHORTS_UUID, cohorts: next, updatedAt: new Date().toISOString() },
        }),
      }).catch(() => {});
    }

    // 2. Also try career_cohorts table
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
    } catch (e) {
      console.warn("Could not sync cohort to Supabase career_cohorts:", e);
    }
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

  try {
    await saveCohort(cohort);
  } catch (err) {
    console.warn("Failed saving cohort:", err);
  }

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

  try {
    await saveCohort(cohortToArchive);
  } catch (err) {
    console.warn("Failed saving archived cohort:", err);
  }

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

      if (isThisRole && (!app.cohortId || app.cohortId === role.activeCohortId || app.status !== "archived")) {
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
