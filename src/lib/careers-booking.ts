import { hasActivityRest } from "./admin-activity";
import "server-only";
import type { Application } from "./careers";

import { getAllCohorts } from "./careers-campaign-store";
import { updateApplication } from "./careers-store";
import { getCareersPool } from "./careers-db";
import { sameRole, canonicalRole } from "./careers-workflow";
import { validateReservation, sameBookingScope, getQuotaForSlot } from "./careers-booking-rules";

export async function getCandidateSlotConfig(candidate: Application) {
  if (!candidate.cohortId) return { slots: [], quota: 15, slotQuotas: {} as Record<string, number> };
  const cohort = (await getAllCohorts(true)).find(
    (c) => c.id === candidate.cohortId,
  );
  if (cohort?.testSlots && sameRole(cohort.roleId, candidate.role))
    return { slots: cohort.testSlots, quota: cohort.slotQuota || 15, slotQuotas: cohort.slotQuotas || ({} as Record<string, number>) };
  // A closed legacy cycle must have its own schedule, not another intake's current slots.
  return { slots: [], quota: 15, slotQuotas: {} as Record<string, number> };
}

export async function reserveTestSlot(
  candidate: Application,
  slot: string,
  config: { slots: string[]; quota: number; slotQuotas?: Record<string, number> },
  applications: Application[],
) {
  const effectiveQuota = getQuotaForSlot(slot, config.quota, config.slotQuotas);
  const pool = getCareersPool();
  if (!pool && hasActivityRest()) {
    validateReservation(candidate, slot, config, applications);
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    const response = await fetch(`${base}/rest/v1/rpc/reserve_career_test_slot`, { method: "POST", headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json" }, body: JSON.stringify({ p_id: candidate.id, p_slot: slot, p_quota: effectiveQuota }), cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = ["SLOT_FULL","ALREADY_BOOKED","INVALID_SLOT","CANDIDATE_INACTIVE","INVITATION_REQUIRED","BOOKING_CHANGED"].find(code => String(result?.message || "").includes(code));
      if (code) throw Error(code);
      return updateApplication(
        candidate.id,
        validateReservation(candidate, slot, config, applications),
      );
    }
    const { invalidateApplicationsCache } = await import("./careers-store"); invalidateApplicationsCache();
    return result as Application;
  }
  if (!pool)
    return updateApplication(
      candidate.id,
      validateReservation(candidate, slot, config, applications),
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `test-slot:${canonicalRole(candidate.role)}:${candidate.cohortId || "legacy"}:${slot}`,
    ]);
    // Lock candidate as well: simultaneous requests for different slots must not consume grace twice.
    const current = await client.query(
      "SELECT data FROM career_applications WHERE id::text=$1 FOR UPDATE",
      [candidate.id],
    );
    if (!current.rows[0]) throw new Error("CANDIDATE_INACTIVE");
    if (!sameBookingScope(candidate, current.rows[0].data)) throw new Error("BOOKING_CHANGED");
    const rows = await client.query("SELECT data FROM career_applications");
    const lockedData: Application = {
      ...current.rows[0].data,
      status:
        current.rows[0].data.status === "archived" && current.rows[0].data.invitedAt
          ? "test_invited"
          : current.rows[0].data.status,
    };
    const updates = validateReservation(
      lockedData,
      slot,
      config,
      rows.rows.map((r) => r.data),
    );
    if (current.rows[0].data.status === "archived" && current.rows[0].data.invitedAt) {
      updates.status = "test_invited";
    }
    const removed = Object.keys(updates).filter(
      (key) => updates[key] === undefined,
    );
    const result = await client.query(
      "UPDATE career_applications SET data=(data - $3::text[]) || $2::jsonb WHERE id::text=$1 RETURNING data",
      [candidate.id, JSON.stringify(updates), removed],
    );
    await client.query("COMMIT");
    const { invalidateApplicationsCache } = await import("./careers-store");
    invalidateApplicationsCache();
    return result.rows[0].data as Application;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
