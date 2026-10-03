import "server-only";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { roles, type Role, type Application, DEFAULT_TEST_SLOTS } from "./careers";
import {
  getConfiguredTestSlots,
  setConfiguredTestSlots,
  getConfiguredDeletedNextPhase,
  setConfiguredDeletedNextPhase,
  purgeLegacySystemRowsFromApplicationsTable,
  LEGACY_SYSTEM_UUIDS,
} from "./careers-config-store";

const directory = path.join(process.cwd(), ".careers-data");

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getSupabaseKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

function isRemote() {
  return !!(getSupabaseUrl() && getSupabaseKey());
}

function localOnly() {
  if (process.env.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!getSupabaseUrl()) missing.push("SUPABASE_URL");
    if (!getSupabaseKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    throw new Error(
      `Missing in Vercel: ${missing.join(" and ")}. Please add in Vercel Settings > Environment Variables, then click Redeploy.`,
    );
  }
}

async function api(endpoint: string, init: RequestInit = {}) {
  const baseUrl = getSupabaseUrl();
  const key = getSupabaseKey();

  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };

  // Only attach Bearer authorization if using legacy JWT service_role key (starts with eyJ).
  // New Supabase sb_secret_ keys are passed via apikey header and rejected by PostgREST if placed in Authorization header.
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
    throw new Error(`Careers storage failed (${response.status}): ${errorBody}`);
  }
  return response;
}
async function read<T>(file: string, fallback: T): Promise<T> {
  try {
    localOnly();
    return JSON.parse(await readFile(path.join(directory, file), "utf8"));
  } catch (e) {
    return fallback;
  }
}
async function write(file: string, value: unknown) {
  localOnly();
  await mkdir(directory, { recursive: true });
  const temp = path.join(directory, `${file}.${crypto.randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(value));
  await rename(temp, path.join(directory, file));
}
let queue: Promise<unknown> = Promise.resolve();
export function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
export async function getRoles(): Promise<Role[]> {
  try {
    const { getRoleDefinitions } = await import("./careers-campaign-store");
    const roleDefs = await getRoleDefinitions().catch(() => null);
    if (roleDefs && roleDefs.length > 0) {
      return roleDefs.map((r) => ({
        id: r.id,
        en: r.en || r.id,
        pt: r.pt || r.id,
        open: Boolean(r.open),
        department: r.department,
        descriptionEn: r.descriptionEn,
        descriptionPt: r.descriptionPt,
        screeningRules: r.screeningRules,
        activeCohortId: r.activeCohortId,
        pipelineStages: r.pipelineStages,
      }));
    }
  } catch {}

  try {
    const defs = await read<any[]>("roles_def.json", []);
    if (Array.isArray(defs) && defs.length > 0) {
      return defs.map((r) => ({
        id: r.id,
        en: r.en || r.title_en || r.id,
        pt: r.pt || r.title_pt || r.id,
        open: Boolean(r.open),
      }));
    }
  } catch {}

  if (!isRemote()) return read("roles.json", roles);

  try {
    const rows = (await (
      await api("/rest/v1/career_roles?select=id,open")
    ).json()) as { id: string; open: boolean }[];
    return roles.map((role) => {
      const match = rows.find(
        (r) =>
          r.id === role.id ||
          (role.id === "cctv" && r.id === "cctv_operator") ||
          (role.id === "cctv_operator" && r.id === "cctv"),
      );
      return {
        ...role,
        open: match !== undefined ? Boolean(match.open) : role.open,
      };
    });
  } catch {
    return read("roles.json", roles);
  }
}

export async function setRole(id: string, open: boolean) {
  if (isRemote()) {
    try {
      await api(`/rest/v1/career_roles`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id, open }),
      });
      if (id === "cctv" || id === "cctv_operator") {
        const alias = id === "cctv" ? "cctv_operator" : "cctv";
        await api(`/rest/v1/career_roles`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({ id: alias, open }),
        }).catch(() => {});
      }
    } catch {
      try {
        await api(`/rest/v1/career_roles?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({ open }),
        });
      } catch {}
    }
  }
  await exclusive(async () => {
    // 1. Update roles.json
    const currentLegacy = await read("roles.json", roles);
    const updatedLegacy = currentLegacy.map((r) =>
      r.id === id ||
      (id === "cctv" && r.id === "cctv_operator") ||
      (id === "cctv_operator" && r.id === "cctv")
        ? { ...r, open }
        : r
    );
    await write("roles.json", updatedLegacy);

    // 2. Also ensure roles_def.json stays in sync if present
    try {
      const defs = await read<any[]>("roles_def.json", []);
      if (Array.isArray(defs) && defs.length > 0) {
        const updatedDefs = defs.map((r) =>
          r.id === id ||
          (id === "cctv" && r.id === "cctv_operator") ||
          (id === "cctv_operator" && r.id === "cctv")
            ? { ...r, open }
            : r
        );
        await write("roles_def.json", updatedDefs);
      }
    } catch {}
  });
}
export const SYSTEM_DELETED_NEXT_PHASE_UUID = "00000000-0000-0000-0000-000000000001";
export const SYSTEM_TEST_SLOTS_UUID = "00000000-0000-0000-0000-000000000002";
export const SYSTEM_COHORTS_UUID = "00000000-0000-0000-0000-000000000003";
export const SYSTEM_ROLES_CONFIG_UUID = "00000000-0000-0000-0000-000000000004";
const SYSTEM_UUIDS = new Set([
  SYSTEM_DELETED_NEXT_PHASE_UUID,
  SYSTEM_TEST_SLOTS_UUID,
  SYSTEM_COHORTS_UUID,
  SYSTEM_ROLES_CONFIG_UUID,
]);

let hasPurgedLegacy = false;

export async function getApplications(): Promise<Application[]> {
  if (!hasPurgedLegacy) {
    hasPurgedLegacy = true;
    purgeLegacySystemRowsFromApplicationsTable().catch(() => {});
  }

  if (!isRemote()) {
    const list = await read("applications.json", []);
    return list.filter((a: any) => a && a.role !== "__system_config__" && !SYSTEM_UUIDS.has(a.id));
  }
  const rows = await (
    await api("/rest/v1/career_applications?select=data&order=created_at.desc")
  ).json();
  return rows
    .map((r: { data: Application }) => r.data)
    .filter((a: any) => a && a.role !== "__system_config__" && !SYSTEM_UUIDS.has(a.id));
}
export async function saveApplication(application: Application, cv: Buffer) {
  if (isRemote()) {
    await api(`/storage/v1/object/career-cvs/${application.id}`, {
      method: "POST",
      headers: { "Content-Type": application.cvType },
      body: new Uint8Array(cv),
    });
    try {
      // The database function locks the role row, preventing submissions after a role closes.
      await api("/rest/v1/rpc/submit_career_application", {
        method: "POST",
        body: JSON.stringify({ application }),
      });
    } catch (error) {
      await api(`/storage/v1/object/career-cvs/${application.id}`, {
        method: "DELETE",
      }).catch(() => {});
      throw error;
    }
    return;
  }
  await exclusive(async () => {
    if (!(await getRoles()).find((r) => r.id === application.role)?.open)
      throw new Error("ROLE_CLOSED");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, application.id), cv);
    await write("applications.json", [
      application,
      ...(await getApplications()),
    ]);
  });
}
export async function setStatus(id: string, status: Application["status"]) {
  if (isRemote()) {
    try {
      await api("/rest/v1/rpc/update_career_status", {
        method: "POST",
        body: JSON.stringify({ application_id: id, new_status: status }),
      });
      return;
    } catch {
      // Fallback to direct PATCH on career_applications (e.g., for newly added stages like 'archived')
      await updateApplication(id, { status });
      return;
    }
  }
  await exclusive(async () =>
    write(
      "applications.json",
      (await getApplications()).map((a) =>
        a.id === id ? { ...a, status } : a,
      ),
    ),
  );
}
export async function getCV(id: string) {
  if (isRemote())
    return Buffer.from(
      await (await api(`/storage/v1/object/career-cvs/${id}`)).arrayBuffer(),
    );
  localOnly();
  return readFile(path.join(directory, id));
}

export async function getApplication(id: string): Promise<Application | null> {
  if (isRemote()) {
    const rows = await (
      await api(`/rest/v1/career_applications?id=eq.${id}&select=data`)
    ).json();
    return rows?.[0]?.data || null;
  }
  const list = await getApplications();
  return list.find((a) => a.id === id) || null;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>,
): Promise<Application> {
  if (isRemote()) {
    const current = await getApplication(id);
    if (!current) throw new Error("Application not found");
    const merged = { ...current, ...updates };
    await api(`/rest/v1/career_applications?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: merged }),
    });
    return merged;
  }
  return await exclusive(async () => {
    const list = await getApplications();
    const target = list.find((a) => a.id === id);
    if (!target) throw new Error("Application not found");
    const merged = { ...target, ...updates };
    await write(
      "applications.json",
      list.map((a) => (a.id === id ? merged : a)),
    );
    return merged;
  });
}

export async function bulkSaveApplications(applications: Application[]): Promise<void> {
  if (!isRemote()) {
    await exclusive(async () => write("applications.json", applications));
    return;
  }
  const chunkSize = 50;
  for (let i = 0; i < applications.length; i += chunkSize) {
    const chunk = applications.slice(i, i + chunkSize);
    try {
      await api("/rest/v1/career_applications", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(chunk.map((app) => ({ id: app.id, data: app }))),
      });
    } catch {
      await Promise.allSettled(
        chunk.map((app) =>
          api(`/rest/v1/career_applications?id=eq.${app.id}`, {
            method: "PATCH",
            body: JSON.stringify({ data: app }),
          })
        )
      );
    }
  }
}

export async function deleteApplications(ids: string[]): Promise<void> {
  const validIds = ids.filter((id) => /^[\da-f-]{36}$/i.test(id) && !SYSTEM_UUIDS.has(id));
  if (!validIds.length) return;

  if (isRemote()) {
    // Delete in chunks of 50 to prevent query string URL length issues
    const chunkSize = 50;
    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize);
      await api(`/rest/v1/career_applications?id=in.(${chunk.join(",")})`, {
        method: "DELETE",
      });
      // Delete CV files from storage bucket
      await Promise.allSettled(
        chunk.map((id) =>
          api(`/storage/v1/object/career-cvs/${id}`, { method: "DELETE" }),
        ),
      );
    }
    return;
  }

  // Local filesystem fallback
  await exclusive(async () => {
    const list = await getApplications();
    const idSet = new Set(validIds);
    const updated = list.filter((a) => !idSet.has(a.id));
    await write("applications.json", updated);

    // Delete local CV files if they exist
    await Promise.allSettled(
      validIds.map((id) => unlink(path.join(directory, id)).catch(() => {})),
    );
  });
}

export async function deleteApplication(id: string): Promise<void> {
  await deleteApplications([id]);
}

export type TestSlotConfig = {
  slots: string[];
  quota: number;
};

export const DEFAULT_SLOT_QUOTA = 15;

export async function getTestSlotConfig(): Promise<TestSlotConfig> {
  return getConfiguredTestSlots();
}

export async function getTestSlots(): Promise<string[]> {
  const config = await getConfiguredTestSlots();
  return config.slots;
}

export async function saveTestSlotConfig(config: { slots: string[]; quota?: number }): Promise<TestSlotConfig> {
  return setConfiguredTestSlots(config);
}

export async function saveTestSlots(slots: string[], quota?: number): Promise<string[]> {
  const saved = await setConfiguredTestSlots({ slots, quota });
  return saved.slots;
}

export async function getDeletedNextPhaseIdentifiers(): Promise<string[]> {
  const fallback: string[] = [];
  if (isRemote()) {
    // 1. Storage / config fallback
    return getConfiguredDeletedNextPhase();
  }

  return getConfiguredDeletedNextPhase();
}

export async function addDeletedNextPhaseIdentifiers(identifiers: string[]): Promise<string[]> {
  const current = await getConfiguredDeletedNextPhase();
  const set = new Set(current);
  identifiers.forEach((id) => {
    if (id && id.trim()) {
      set.add(id.trim());
      const norm = id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (norm) set.add(norm);
    }
  });
  return setConfiguredDeletedNextPhase(Array.from(set));
}




