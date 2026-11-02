import "server-only";
import { Pool } from "pg";
import { rootCertificates } from "node:tls";
import { SUPABASE_DATABASE_CA } from "./careers-db-ca";

const runtime = globalThis as typeof globalThis & {
  overwatchCareersPool?: Pool;
};

/** Share the connection budget across stores, route bundles and development reloads. */
export function getCareersPool(): Pool | null {
  if (process.env.NODE_ENV === "test") return null;
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!rawUrl) return null;
  if (!runtime.overwatchCareersPool) {
    let cleanConnectionString = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      for (const option of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) {
        parsed.searchParams.delete(option);
      }
      cleanConnectionString = parsed.toString();
    } catch {
      throw new Error("DATABASE_URL_INVALID");
    }
    // Use the transaction pooler for short-lived serverless requests.
    if (cleanConnectionString.includes("pooler.supabase.com:5432")) {
      cleanConnectionString = cleanConnectionString.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    }
    runtime.overwatchCareersPool = new Pool({
      connectionString: cleanConnectionString,
      ssl: { rejectUnauthorized: true, ca: [...rootCertificates, SUPABASE_DATABASE_CA] },
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  }
  return runtime.overwatchCareersPool;
}
