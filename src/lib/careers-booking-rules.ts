import type { Application } from "./careers";
import { isPastDateSlot, normalizeSlot } from "./careers";
import { isTerminal, resolveApplication } from "./careers-workflow";

export function validateReservation(
  candidate: Application,
  slot: string,
  config: { slots: string[]; quota: number },
  applications: Application[],
  now = new Date(),
): Partial<Application> {
  if (isTerminal(resolveApplication(candidate)))
    throw new Error("CANDIDATE_INACTIVE");
  const grace = candidate.rebookingGrace;
  const hasGrace = Boolean(
    grace &&
      !grace.usedAt &&
      (!grace.expiresAt || new Date(grace.expiresAt) > now),
  );
  if (
    !candidate.invitedAt &&
    !candidate.testSlot &&
    candidate.status !== "test_invited" &&
    !hasGrace
  )
    throw new Error("INVITATION_REQUIRED");
  if (candidate.testSlot && !hasGrace) throw new Error("ALREADY_BOOKED");
  if (
    !config.slots.some((s) => normalizeSlot(s) === slot) ||
    isPastDateSlot(slot, now)
  )
    throw new Error("INVALID_SLOT");
  const occupancy = applications.filter(
    (a) =>
      a.id !== candidate.id &&
      normalizeSlot(a.testSlot) === slot &&
      !isTerminal(resolveApplication(a)),
  ).length;
  if (occupancy >= config.quota) throw new Error("SLOT_FULL");
  const at = now.toISOString();
  return {
    testSlot: slot,
    testBookedAt: at,
    status: "test_booked",
    attendedAt: undefined,
    attendanceStatus: undefined,
    ...(hasGrace && grace
      ? {
          previousTestSlot: grace.previousSlot || candidate.testSlot,
          rebookingGrace: { ...grace, usedAt: at },
        }
      : {}),
  };
}
