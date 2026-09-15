import "server-only";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { roles, type Role, type Application, DEFAULT_TEST_SLOTS } from "./careers";

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
  localOnly();
  try {
    return JSON.parse(await readFile(path.join(directory, file), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
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
  if (!isRemote()) return read("roles.json", roles);
  const rows = (await (
    await api("/rest/v1/career_roles?select=id,open")
  ).json()) as { id: string; open: boolean }[];
  return roles.map((role) => ({
    ...role,
    open: rows.find((r) => r.id === role.id)?.open ?? false,
  }));
}
export async function setRole(id: string, open: boolean) {
  if (isRemote()) {
    await api(`/rest/v1/career_roles?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ open }),
    });
    return;
  }
  await exclusive(async () =>
    write(
      "roles.json",
      (await getRoles()).map((r) => (r.id === id ? { ...r, open } : r)),
    ),
  );
}
export async function getApplications(): Promise<Application[]> {
  if (!isRemote()) return read("applications.json", []);
  const rows = await (
    await api("/rest/v1/career_applications?select=data&order=created_at.desc")
  ).json();
  return rows.map((r: { data: Application }) => r.data);
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

export async function deleteApplications(ids: string[]): Promise<void> {
  const validIds = ids.filter((id) => /^[\da-f-]{36}$/i.test(id));
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

export async function getTestSlots(): Promise<string[]> {
  try {
    return await read<string[]>("test-slots.json", [...DEFAULT_TEST_SLOTS]);
  } catch {
    return [...DEFAULT_TEST_SLOTS];
  }
}

export async function saveTestSlots(slots: string[]): Promise<string[]> {
  const cleanSlots = Array.isArray(slots)
    ? slots.map((s) => String(s).trim()).filter(Boolean)
    : [...DEFAULT_TEST_SLOTS];
  await exclusive(async () => {
    await write("test-slots.json", cleanSlots);
  });
  return cleanSlots;
}

