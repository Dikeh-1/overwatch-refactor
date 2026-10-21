import "server-only";
import type { Application } from "./careers";

import { getAllCohorts } from "./careers-campaign-store";
import { getTestSlotConfig, updateApplication } from "./careers-store";
import { getCareersPool } from "./careers-db";
import { validateReservation } from "./careers-booking-rules";

export async function getCandidateSlotConfig(candidate: Application) {
  if (!candidate.cohortId) return getTestSlotConfig();
  const cohort = (await getAllCohorts()).find(
    (c) => c.id === candidate.cohortId,
  );
  if (cohort?.testSlots)
    return { slots: cohort.testSlots, quota: cohort.slotQuota || 15 };
  if (cohort?.status === "active") return getTestSlotConfig();
  // A closed legacy cycle must have its own schedule, not another intake's current slots.
  return { slots: [], quota: 15 };
}

export async function reserveTestSlot(
  candidate: Application,
  slot: string,
  config: { slots: string[]; quota: number },
  applications: Application[],
) {
  const pool = getCareersPool();
  if (!pool)
    return updateApplication(
      candidate.id,
      validateReservation(candidate, slot, config, applications),
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `test-slot:${slot}`,
    ]);
    // Lock candidate as well: simultaneous requests for different slots must not consume grace twice.
    const current = await client.query(
      "SELECT data FROM career_applications WHERE id=$1 FOR UPDATE",
      [candidate.id],
    );
    if (!current.rows[0]) throw new Error("CANDIDATE_INACTIVE");
    const rows = await client.query("SELECT data FROM career_applications");
    const updates = validateReservation(
      current.rows[0].data,
      slot,
      config,
      rows.rows.map((r) => r.data),
    );
    const removed = Object.keys(updates).filter(
      (key) => updates[key] === undefined,
    );
    const result = await client.query(
      "UPDATE career_applications SET data=(data - $3::text[]) || $2::jsonb WHERE id=$1 RETURNING data",
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
