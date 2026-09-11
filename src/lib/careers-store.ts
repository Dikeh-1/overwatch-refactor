import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { roles, type Role, type Application } from "./careers";

const directory = path.join(process.cwd(), ".careers-data");
const remote = !!(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
function localOnly() {
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Configure Supabase before accepting applications in production.",
    );
}
async function api(endpoint: string, init: RequestInit = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}${endpoint}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(`Careers storage failed (${response.status})`);
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
  if (!remote) return read("roles.json", roles);
  const rows = (await (
    await api("/rest/v1/career_roles?select=id,open")
  ).json()) as { id: string; open: boolean }[];
  return roles.map((role) => ({
    ...role,
    open: rows.find((r) => r.id === role.id)?.open ?? false,
  }));
}
export async function setRole(id: string, open: boolean) {
  if (remote) {
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
  if (!remote) return read("applications.json", []);
  const rows = await (
    await api("/rest/v1/career_applications?select=data&order=created_at.desc")
  ).json();
  return rows.map((r: { data: Application }) => r.data);
}
export async function saveApplication(application: Application, cv: Buffer) {
  if (remote) {
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
  if (remote) {
    await api("/rest/v1/rpc/update_career_status", {
      method: "POST",
      body: JSON.stringify({ application_id: id, new_status: status }),
    });
    return;
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
  if (remote)
    return Buffer.from(
      await (await api(`/storage/v1/object/career-cvs/${id}`)).arrayBuffer(),
    );
  localOnly();
  return readFile(path.join(directory, id));
}
