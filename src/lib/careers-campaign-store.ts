import "server-only";
import { changedValues, createActivityEvent, recordActivity } from "./admin-activity";
import { cycleLabel } from "./careers-cycle-label";
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
  updateApplication,
  invalidateApplicationsCache,
  setRole,
} from "./careers-store";
import {
  getConfiguredRoles,
  setConfiguredRoles,
  getConfiguredCohorts,
  setConfiguredCohorts,
  getSystemConfig,
  getConfiguredTestSlots,
} from "./careers-config-store";

import { getCareersPool as getPgPool } from "./careers-db";
import { sameRole, applicationsForCohort, buildCohortCatalog } from "./careers-workflow";
import type { Application } from "./careers";


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
  return Boolean(
    getPgPool() ||
    (getSupabaseUrl() && getSupabaseKey() && getSupabaseKey().length > 10)
  );
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

// In-memory runtime cache for serverless environments with TTL
let inMemoryRoleDefs: CareerRoleDefinition[] | null = null;
let inMemoryRoleDefsAt = 0;
let inMemoryCohorts: CareerCohort[] | null = null;
let inMemoryCohortsAt = 0;
const ROLE_DEFS_TTL_MS = 60000; // 60s TTL
const COHORTS_TTL_MS = 60000; // 60s TTL

export function invalidateCampaignStoreCache(): void {
  inMemoryRoleDefs = null;
  inMemoryRoleDefsAt = 0;
  inMemoryCohorts = null;
  inMemoryCohortsAt = 0;
}

// Generate default initial roles if storage is fresh
function buildDefaultRoles(): CareerRoleDefinition[] {
  const now = new Date().toISOString();
  return legacyRoles.map((r) => {
    const defaultRules = DEFAULT_SCREENING_RULES_BY_ROLE[r.id] || [];
    const isTechMgr = r.id === "cctv_technical_manager";

    // Tech Manager skips physical aptitude test & gate check-in by default
    const stages: PipelineStageKey[] = isTechMgr
      ? ["applications", "screening", "testing", "interview", "hired"]
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

export async function getRoleDefinitions(forceFresh = false): Promise<CareerRoleDefinition[]> {
  if (!forceFresh && inMemoryRoleDefs && Date.now() - inMemoryRoleDefsAt < ROLE_DEFS_TTL_MS) {
    return inMemoryRoleDefs;
  }

  let remoteConfigs: CareerRoleDefinition[] | null = null;

  // 1. Try dedicated system config store (Supabase storage career-cvs/system-configs/roles_def.json or local)
  const storedRoles = await getSystemConfig<CareerRoleDefinition[] | null>("roles_config", null);
  if (Array.isArray(storedRoles)) {
    remoteConfigs = storedRoles;
  }

  if (isRemote()) {
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

    // 3. Graceful one-time migration: check if legacy synthetic row exists in career_applications
    if (!remoteConfigs) {
      try {
        const res = await api(`/rest/v1/career_applications?id=eq.00000000-0000-0000-0000-000000000004&select=data`);
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]?.data?.roles && Array.isArray(rows[0].data.roles) && rows[0].data.roles.length > 0) {
          remoteConfigs = rows[0].data.roles;
          if (remoteConfigs) {
            await setConfiguredRoles(remoteConfigs).catch(() => {});
          }
        }
      } catch {}
    }

    // 4. Fetch authoritative open/closed status from PostgreSQL career_roles (or Supabase)
    const remoteOpenMap: Record<string, boolean> = {};
    const pool = getPgPool();
    if (pool) {
      try {
        const res = await pool.query("SELECT id, open FROM career_roles");
        if (res.rows) {
          for (const row of res.rows) {
            if (row.id) {
              remoteOpenMap[row.id] = Boolean(row.open);
            }
          }
        }
      } catch (pgErr) {
        throw new Error("Unable to read role intake state", { cause: pgErr });
      }
    } else if (getSupabaseUrl() && getSupabaseKey()) {
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
    }

    // Combine configs or fallback to defaults
    const defaultList = buildDefaultRoles();
    let roles: CareerRoleDefinition[] = remoteConfigs
      ? [...remoteConfigs]
      : inMemoryRoleDefs
      ? [...inMemoryRoleDefs]
      : defaultList;

    for (const def of defaultList) {
      if (!roles.some((r) => sameRole(r.id, def.id))) {
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

      const activeCohortId = role.activeCohortId || (open ? `${role.id}_cohort` : null);

      return {
        ...role,
        open,
        activeCohortId,
        screeningRules:
          Array.isArray(role.screeningRules)
            ? role.screeningRules
            : DEFAULT_SCREENING_RULES_BY_ROLE[role.id] || [],
      };
    });

    inMemoryRoleDefs = roles;
    inMemoryRoleDefsAt = Date.now();
    return roles;
  }

  // Local development
  const local = storedRoles;
  if (Array.isArray(local)) {
    inMemoryRoleDefs = local;
    inMemoryRoleDefsAt = Date.now();
    return local;
  }

  const defaults = buildDefaultRoles();
  await setConfiguredRoles(defaults);
  inMemoryRoleDefs = defaults;
  inMemoryRoleDefsAt = Date.now();
  return defaults;
}

export async function persistRoleDefinition(
  role: CareerRoleDefinition,
): Promise<CareerRoleDefinition> {
  invalidateCampaignStoreCache();
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
    nextRoles = roles.map((r, idx) => (idx === existingIdx ? updatedRole : r));
  } else {
    updatedRole.createdAt = now;
    nextRoles = [...roles, updatedRole];
  }

  // Clean persistence to dedicated config store (Supabase storage system-configs/ and local file)
  await setConfiguredRoles(nextRoles);
  inMemoryRoleDefs = nextRoles;
  inMemoryRoleDefsAt = Date.now();

  if (isRemote()) {
    // Also attempt saving to career_roles_config table if present
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
  invalidateCampaignStoreCache();
  const roles = await getRoleDefinitions();
  const nextRoles = roles.filter(
    (r) =>
      r.id !== roleId &&
      !(roleId === "cctv" && r.id === "cctv_operator") &&
      !(roleId === "cctv_operator" && r.id === "cctv"),
  );
  await setConfiguredRoles(nextRoles);
  inMemoryRoleDefs = nextRoles;
  inMemoryRoleDefsAt = Date.now();

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

export async function getAllCohorts(forceFresh = false): Promise<CareerCohort[]> {
  if (!forceFresh && inMemoryCohorts && Date.now() - inMemoryCohortsAt < COHORTS_TTL_MS) {
    return inMemoryCohorts;
  }

  // 1. Check dedicated config store
  const stored = await getConfiguredCohorts();
  if (Array.isArray(stored) && stored.length > 0) {
    inMemoryCohorts = stored;
    inMemoryCohortsAt = Date.now();
    return stored;
  }

  if (isRemote()) {
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
        inMemoryCohortsAt = Date.now();
        await setConfiguredCohorts(remote).catch(() => {});
        return remote;
      }
    } catch {}

    // 3. Graceful one-time migration: check if legacy synthetic row exists in career_applications
    try {
      const res = await api(`/rest/v1/career_applications?id=eq.00000000-0000-0000-0000-000000000003&select=data`);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]?.data?.cohorts && Array.isArray(rows[0].data.cohorts) && rows[0].data.cohorts.length > 0) {
        inMemoryCohorts = rows[0].data.cohorts;
        inMemoryCohortsAt = Date.now();
        await setConfiguredCohorts(rows[0].data.cohorts).catch(() => {});
        return rows[0].data.cohorts;
      }
    } catch {}

    if (inMemoryCohorts && inMemoryCohorts.length > 0) return inMemoryCohorts;
    return [];
  }

  return stored;
}

export async function saveCohort(cohort: CareerCohort): Promise<CareerCohort> {
  invalidateCampaignStoreCache();
  const cohorts = await getAllCohorts();
  const idx = cohorts.findIndex((c) => c.id === cohort.id);
  const next = idx >= 0 ? cohorts.map((c) => (c.id === cohort.id ? cohort : c)) : [cohort, ...cohorts];

  // Clean persistence to dedicated config store (Supabase storage system-configs/ and local file)
  await setConfiguredCohorts(next);
  inMemoryCohorts = next;
  inMemoryCohortsAt = Date.now();

  if (isRemote()) {
    // Also try syncing to career_cohorts table if present
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

type LifecycleResult = { role: CareerRoleDefinition; cohort: CareerCohort };

function planLifecycle(role: CareerRoleDefinition, cohorts: CareerCohort[], applications: Application[], open: boolean, name?: string): LifecycleResult {
  const now = new Date().toISOString();
  const existing = cohorts.find(c => c.id === role.activeCohortId && sameRole(c.roleId, role.id)) ||
    cohorts.find(c => sameRole(c.roleId, role.id) && c.status === "active");
  if (open && role.open && existing?.status === "active") return { role, cohort: { ...existing, applicationQuota: role.applicationQuota ?? existing.applicationQuota ?? null, stages: [...role.pipelineStages], screeningRules: structuredClone(role.screeningRules), roleSnapshot: structuredClone(role) } };
  // A repeated closure is idempotent, including roles closed by the old implementation.
  const lastClosed = !open && !role.open ? cohorts.filter(c => sameRole(c.roleId, role.id) && c.status !== "active").sort((a,b) => (b.closedAt || "").localeCompare(a.closedAt || ""))[0] : undefined;
  const old = existing || lastClosed;
  if (!open && lastClosed) return { role, cohort: lastClosed };
  const cohort: CareerCohort = open ? {
    id: `${role.id}_${crypto.randomUUID()}`, roleId: role.id,
    name: name?.trim() || `${role.pt} — ${new Date().toLocaleDateString("pt-MZ", { month: "long", year: "numeric", timeZone: "Africa/Maputo" })}`,
    openedAt: now, status: "active", applicationQuota: role.applicationQuota ?? null, stages: [...role.pipelineStages], screeningRules: structuredClone(role.screeningRules), roleSnapshot: structuredClone(role),
  } : {
    ...(old || { id: role.activeCohortId || `${role.id}_${crypto.randomUUID()}`, roleId: role.id, name: role.pt, openedAt: role.createdAt }),
    name: cycleLabel({ name: "", openedAt: role.createdAt, closedAt: now }, role, "pt"),
    status: "closed", closedAt: now, notes: name ?? old?.notes, applicationQuota: old?.applicationQuota ?? role.applicationQuota ?? null,
    stages: [...role.pipelineStages], screeningRules: structuredClone(role.screeningRules), roleSnapshot: structuredClone(role),
  };
  if (!open) {
    const catalog = buildCohortCatalog([...cohorts.filter(c => c.id !== cohort.id), { ...cohort, status: "active" }], [role], applications);
    const members = applicationsForCohort(applications, { ...cohort, status: "active" }, catalog);
    cohort.closureSnapshot = old?.closureSnapshot || { capturedAt: now, applications: structuredClone(members) };
  }
  return { role: { ...role, open, activeCohortId: open ? cohort.id : null, updatedAt: now }, cohort };
}

async function changeLifecycle(roleId: string, open: boolean, name?: string, patch?: CareerRoleDefinition): Promise<LifecycleResult> {
  const initialRoles = await getRoleDefinitions(true);
  const initialCohorts = await getAllCohorts(true);
  const slots = await getConfiguredTestSlots();
  const pool = getPgPool();
  let result: LifecycleResult;
  if (pool) {
    const activity = await recordActivity({ action: open ? "Role cycle opening / configuration requested" : "Role cycle closure requested", outcome: "started", roleId, section: "roles" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize lifecycle/configuration transitions across serverless instances.
      await client.query("SELECT pg_advisory_xact_lock(724216)");
      const configs = await client.query("SELECT key, value FROM system_configs WHERE key IN ('roles_config', 'cohorts') FOR UPDATE");
      const roles: CareerRoleDefinition[] = configs.rows.find(r => r.key === "roles_config")?.value ?? initialRoles;
      const cohorts: CareerCohort[] = configs.rows.find(r => r.key === "cohorts")?.value ?? initialCohorts;
      const configuredRole = roles.find(r => sameRole(r.id, roleId));
      const intake = await client.query("SELECT id, open FROM career_roles WHERE id = $1 FOR UPDATE", [configuredRole?.id || roleId]);
      const current = configuredRole && { ...configuredRole, open: intake.rows[0] ? Boolean(intake.rows[0].open) : configuredRole.open };
      const effectiveCohorts = cohorts.map(c => current && !current.open && sameRole(c.roleId, current.id) && c.status === "active" ? { ...c, status: "closed" as const } : c);
      if (!current) throw new Error("Role not found");
      const rows = await client.query("SELECT id, data FROM career_applications FOR UPDATE");
      const applications: Application[] = rows.rows.map(r => r.data).filter(a => a && a.role !== "__system_config__");
      result = planLifecycle(patch ? { ...patch, open: current.open, activeCohortId: current.activeCohortId } : current, effectiveCohorts, applications, open, name);
      if (!open && !result.cohort.testSlots) { result.cohort.testSlots = slots.slots; result.cohort.slotQuota = slots.quota; }
      // Only attach previously unassigned members of this intake. Never rewrite stages or older cohort IDs.
      for (const a of result.cohort.closureSnapshot?.applications || []) {
        if (!a.cohortId && !open) await client.query("UPDATE career_applications SET data = jsonb_set(data, '{cohortId}', to_jsonb($2::text)) WHERE id = $1 AND COALESCE(data->>'cohortId', '') = ''", [a.id, result.cohort.id]);
      }
      const nextRoles = roles.map(r => sameRole(r.id, roleId) ? result.role : r);
      const nextCohorts = [...effectiveCohorts.filter(c => c.id !== result.cohort.id), result.cohort];
      for (const [key, value] of [["roles_config", nextRoles], ["cohorts", nextCohorts]] as const) await client.query("INSERT INTO system_configs (key, value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()", [key, JSON.stringify(value)]);
      for (const id of result.role.id === "cctv" || result.role.id === "cctv_operator" ? ["cctv", "cctv_operator"] : [result.role.id]) await client.query("INSERT INTO career_roles (id, open) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET open=EXCLUDED.open", [id, open]);
      // Save lifecycle evidence in the same transaction as the intake and cohort changes.
      const log = createActivityEvent({ action: "Role cycle changed", outcome: "succeeded", section: "roles", roleId: result.role.id, cohortId: result.cohort.id,
        details: { startId: activity.id, role: changedValues(current, result.role), cohort: changedValues(cohorts.find(c => c.id === result.cohort.id) || {}, result.cohort), assignedApplicationIds: (result.cohort.closureSnapshot?.applications || []).filter(a => !a.cohortId && !open).map(a => a.id) } });
      await client.query("INSERT INTO admin_activity_events (id, timestamp, data) VALUES ($1,$2,$3)", [log.id, log.timestamp, JSON.stringify(log)]);
      if (!open) {
        const archived = createActivityEvent({ ...log, section: "archive", action: "Recruitment cycle closed and preserved" });
        await client.query("INSERT INTO admin_activity_events (id, timestamp, data) VALUES ($1,$2,$3)", [archived.id, archived.timestamp, JSON.stringify(archived)]);
      }
      if (JSON.stringify(current.screeningRules) !== JSON.stringify(result.role.screeningRules)) {
        const rules = createActivityEvent({ ...log, section: "form-builder", action: "Screening form / rules changed", details: changedValues({ rules: current.screeningRules }, { rules: result.role.screeningRules }) });
        await client.query("INSERT INTO admin_activity_events (id, timestamp, data) VALUES ($1,$2,$3)", [rules.id, rules.timestamp, JSON.stringify(rules)]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  } else {
    const role = initialRoles.find(r => sameRole(r.id, roleId));
    if (!role) throw new Error("Role not found");
    const apps = await getApplications(true);
    result = planLifecycle(patch ? { ...patch, open: role.open, activeCohortId: role.activeCohortId } : role, initialCohorts, apps, open, name);
    if (!open && !result.cohort.testSlots) { result.cohort.testSlots = slots.slots; result.cohort.slotQuota = slots.quota; }
    // Persist evidence first and role last. A failure is surfaced and safely retryable.
    await saveCohort(result.cohort);
    for (const a of result.cohort.closureSnapshot?.applications || []) if (!a.cohortId && !open) await updateApplication(a.id, { cohortId: result.cohort.id });
    await persistRoleDefinition(result.role);
    await setRole(result.role.id, open);
  }
  invalidateCampaignStoreCache();
  invalidateApplicationsCache();
  return result;
}

export async function saveRoleDefinition(role: CareerRoleDefinition): Promise<CareerRoleDefinition> {
  const previous = (await getRoleDefinitions(true)).find(r => sameRole(r.id, role.id));
  if (previous && (previous.open !== role.open || role.open)) return (await changeLifecycle(role.id, role.open, undefined, role)).role;
  if (!previous && role.open) {
    await persistRoleDefinition({ ...role, open: false, activeCohortId: null });
    return (await changeLifecycle(role.id, true)).role;
  }
  // Cohort identity is controlled by lifecycle transitions, not the role editor.
  return persistRoleDefinition({ ...role, activeCohortId: previous?.activeCohortId ?? null });
}

export async function openRoleCohort(roleId: string, name?: string) { return changeLifecycle(roleId, true, name); }
export async function closeAndArchiveRoleCohort(roleId: string, notes?: string) {
  const result = await changeLifecycle(roleId, false, notes);
  return { role: result.role, archivedCohort: result.cohort };
}
