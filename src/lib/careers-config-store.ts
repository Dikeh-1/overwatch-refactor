import "server-only";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getCareersPool as getPgPool } from "./careers-db";
import type { CareerRoleDefinition, CareerCohort } from "./careers-models";
import { DEFAULT_TEST_SLOTS } from "./careers";

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NODE_ENV === "production"
);

const directory = isServerless
  ? path.join(os.tmpdir(), ".careers-data")
  : path.join(process.cwd(), ".careers-data");


let tableEnsured = false;
async function ensureSystemConfigsTable(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;
  if (tableEnsured) return true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz DEFAULT NOW()
      )
    `);
    tableEnsured = true;
    return true;
  } catch (err) {
    console.warn("Could not ensure system_configs table:", err);
    return false;
  }
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getSupabaseKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

export function isRemoteConfigStore() {
  return !!(getPgPool() || (getSupabaseUrl() && getSupabaseKey()));
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
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE I/O HELPERS (LOCAL PERSISTENCE)
// ─────────────────────────────────────────────────────────────────────────────

let lock = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn);
  lock = next.then(() => {}, () => {});
  return next;
}

async function readLocal<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(directory, filename), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeLocal(filename: string, data: any) {
  try {
    await mkdir(directory, { recursive: true });
    const finalPath = path.join(directory, filename);
    const tempPath = `${finalPath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
    await rename(tempPath, finalPath);
  } catch (err) {
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY MOCK UUID PURGE UTILITY
// Eliminates the legacy hack where config rows lived in career_applications.
// ─────────────────────────────────────────────────────────────────────────────

export const LEGACY_SYSTEM_UUIDS = [
  "00000000-0000-0000-0000-000000000001", // deleted_next_phase
  "00000000-0000-0000-0000-000000000002", // test_slots
  "00000000-0000-0000-0000-000000000003", // cohorts
  "00000000-0000-0000-0000-000000000004", // roles_config
] as const;

export async function purgeLegacySystemRowsFromApplicationsTable(): Promise<void> {
  if (isRemoteConfigStore()) {
    try {
      // Delete any rows in career_applications where role == '__system_config__' or id in LEGACY_SYSTEM_UUIDS
      const idsParam = LEGACY_SYSTEM_UUIDS.join(",");
      await api(`/rest/v1/career_applications?id=in.(${idsParam})`, {
        method: "DELETE",
      }).catch(() => {});

      await api(`/rest/v1/career_applications?role=eq.__system_config__`, {
        method: "DELETE",
      }).catch(() => {});
    } catch (err) {
      console.warn("Legacy config row cleanup note:", err);
    }
    return;
  }

  // Local cleanup in applications.json
  await exclusive(async () => {
    try {
      const apps = await readLocal<any[]>("applications.json", []);
      const legacySet = new Set<string>(LEGACY_SYSTEM_UUIDS);
      const clean = apps.filter((a) => a && a.role !== "__system_config__" && !legacySet.has(a.id));
      if (clean.length !== apps.length) {
        await writeLocal("applications.json", clean);
      }
    } catch {}
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION PERSISTENCE ADAPTER (STORAGE BUCKET / DEDICATED FILES)
// ─────────────────────────────────────────────────────────────────────────────

export type SystemConfigKey =
  | "roles_config"
  | "cohorts"
  | "test_slots"
  | "deleted_next_phase";

const FILENAME_MAP: Record<SystemConfigKey, string> = {
  roles_config: "roles_def.json",
  cohorts: "cohorts.json",
  test_slots: "test-slots.json",
  deleted_next_phase: "deleted-next-phase.json",
};

export async function getSystemConfig<T>(key: SystemConfigKey, fallback: T): Promise<T> {
  const filename = FILENAME_MAP[key];

  // 1. Try PostgreSQL system_configs table (fast, reliable, persistent)
  const pool = getPgPool();
  if (pool) {
    try {
      await ensureSystemConfigsTable();
      const res = await pool.query(
        "SELECT value FROM system_configs WHERE key = $1 LIMIT 1",
        [key]
      );
      if (res.rows && res.rows.length > 0 && res.rows[0].value !== undefined && res.rows[0].value !== null) {
        return res.rows[0].value as T;
      }
    } catch (pgErr) {
      throw new Error(`Unable to read configuration ${key}`, { cause: pgErr });
    }
  }

  if (getSupabaseUrl() && getSupabaseKey()) {
    // 2. Try dedicated Supabase Storage bucket under system-configs/
    try {
      const res = await api(`/storage/v1/object/career-cvs/system-configs/${filename}`);
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed !== undefined && parsed !== null) {
          return parsed as T;
        }
      }
    } catch {}

    // 3. Try root storage backup path
    try {
      const res = await api(`/storage/v1/object/career-cvs/${filename}`);
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed !== undefined && parsed !== null) {
          return parsed as T;
        }
      }
    } catch {}
  }

  // 4. Fallback to local files if present
  return readLocal<T>(filename, fallback);
}

export async function setSystemConfig<T>(key: SystemConfigKey, data: T): Promise<T> {
  const filename = FILENAME_MAP[key];

  // 1. Persist to PostgreSQL system_configs table
  const pool = getPgPool();
  let pgSaved = false;
  if (pool) {
    try {
      await ensureSystemConfigsTable();
      await pool.query(
        `INSERT INTO system_configs (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(data)]
      );
      pgSaved = true;
    } catch (pgErr) {
      throw new Error(`Unable to save configuration ${key}`, { cause: pgErr });
    }
  }

  let remoteSaved = pgSaved;
  // 2. If remote Supabase is configured, persist to dedicated storage object
  if (getSupabaseUrl() && getSupabaseKey()) {
    try {
      const jsonBody = Buffer.from(JSON.stringify(data, null, 2), "utf8");

      // Save to system-configs/ namespace in career-cvs bucket
      await api(`/storage/v1/object/career-cvs/system-configs/${filename}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-upsert": "true",
        },
        body: new Uint8Array(jsonBody),
      });

      remoteSaved = true;
      // Also mirror to root storage path for backward-compatibility
      await api(`/storage/v1/object/career-cvs/${filename}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-upsert": "true",
        },
        body: new Uint8Array(jsonBody),
      }).catch(() => {});
    } catch (err) {
      if (!pgSaved) throw new Error(`Unable to save configuration ${key}`, { cause: err });
    }

    // Legacy rows are retained until a verified migration has copied every key.
  }

  // 3. Best-effort local storage backup (never fails the request if disk is read-only)
  try {
    await exclusive(async () => {
      await writeLocal(filename, data);
    });
  } catch (err) {
    if (!remoteSaved) throw err;
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE CONFIG GETTERS / SETTERS
// ─────────────────────────────────────────────────────────────────────────────

export interface TestSlotConfig {
  slots: string[];
  quota: number;
}

export async function getConfiguredTestSlots(): Promise<TestSlotConfig> {
  return getSystemConfig<TestSlotConfig>("test_slots", {
    slots: [...DEFAULT_TEST_SLOTS],
    quota: 10,
  });
}

export async function setConfiguredTestSlots(config: { slots: string[]; quota?: number }): Promise<TestSlotConfig> {
  const cleanSlots = Array.isArray(config.slots)
    ? config.slots.map((s) => String(s).trim()).filter(Boolean)
    : [...DEFAULT_TEST_SLOTS];
  const quota = typeof config.quota === "number" && config.quota > 0 ? config.quota : 10;
  const payload: TestSlotConfig = { slots: cleanSlots, quota };
  return setSystemConfig<TestSlotConfig>("test_slots", payload);
}

export async function getConfiguredDeletedNextPhase(): Promise<string[]> {
  return getSystemConfig<string[]>("deleted_next_phase", []);
}

export async function setConfiguredDeletedNextPhase(list: string[]): Promise<string[]> {
  const set = new Set(list.map((s) => String(s).trim()).filter(Boolean));
  return setSystemConfig<string[]>("deleted_next_phase", Array.from(set));
}

export async function getConfiguredCohorts(): Promise<CareerCohort[]> {
  return getSystemConfig<CareerCohort[]>("cohorts", []);
}

export async function setConfiguredCohorts(cohorts: CareerCohort[]): Promise<CareerCohort[]> {
  return setSystemConfig<CareerCohort[]>("cohorts", cohorts);
}

export async function getConfiguredRoles(): Promise<CareerRoleDefinition[]> {
  return getSystemConfig<CareerRoleDefinition[]>("roles_config", []);
}

export async function setConfiguredRoles(roles: CareerRoleDefinition[]): Promise<CareerRoleDefinition[]> {
  return setSystemConfig<CareerRoleDefinition[]>("roles_config", roles);
}
