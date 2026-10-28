import "server-only";
import { Pool } from "pg";

const runtime = globalThis as typeof globalThis & {
  overwatchCareersPool?: Pool;
};
const FALLBACK_DATABASE_URL =
  "postgres://postgres.pnrjytqtjhprrlwkgwls:Overwatch_Moz26@aws-0-eu-west-2.pooler.supabase.com:6543/postgres";

/** Share the connection budget across stores, route bundles and development reloads. */
export function getCareersPool(): Pool | null {
  if (process.env.NODE_ENV === "test") return null;
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    FALLBACK_DATABASE_URL;
  if (!rawUrl) return null;
  if (!runtime.overwatchCareersPool) {
    let cleanConnectionString = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.delete("sslmode");
      cleanConnectionString = parsed.toString();
    } catch {
      cleanConnectionString = cleanConnectionString.replace(/[\?&]sslmode=[^&]*/g, "");
    }
    // Automatically use Supabase Transaction Pooler (port 6543) instead of Session Pooler (port 5432)
    // to support unlimited serverless clients without hitting EMAXCONNSESSION (pool_size: 15 limit)
    if (cleanConnectionString.includes("pooler.supabase.com:5432")) {
      cleanConnectionString = cleanConnectionString.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    }
    runtime.overwatchCareersPool = new Pool({
      connectionString: cleanConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  }
  return runtime.overwatchCareersPool;
}
