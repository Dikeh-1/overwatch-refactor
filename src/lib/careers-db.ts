import "server-only";
import { Pool } from "pg";

const runtime = globalThis as typeof globalThis & {
  overwatchCareersPool?: Pool;
};
/** Share the connection budget across stores, route bundles and development reloads. */
export function getCareersPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!runtime.overwatchCareersPool)
    runtime.overwatchCareersPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  return runtime.overwatchCareersPool;
}
