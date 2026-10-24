require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSlotBookingExpired, isPastDateSlot } = require('../src/lib/careers.ts');
const { validateReservation } = require('../src/lib/careers-booking-rules.ts');

test('test slot booking auto-invalidates 1 day prior at 11:59:59 PM Maputo time', () => {
  const slotMonday26 = '2026-10-26 09:00';

  // Sunday Oct 25 at 23:59:00 Maputo time (UTC 21:59:00) -> Still bookable
  const sundayNight = new Date(Date.UTC(2026, 9, 25, 21, 59, 0));
  assert.equal(isSlotBookingExpired(slotMonday26, sundayNight), false, 'Sunday night before slot must be bookable');

  // Monday Oct 26 at 00:00:01 Maputo time (UTC 22:00:01 on Oct 25) -> Expired / Invalidated
  const mondayMidnight = new Date(Date.UTC(2026, 9, 25, 22, 0, 1));
  assert.equal(isSlotBookingExpired(slotMonday26, mondayMidnight), true, 'Monday 00:00:01 Maputo time must be expired');

  // Monday Oct 26 at 08:30:00 Maputo time (UTC 06:30:00) -> Expired / Invalidated
  const mondayMorning = new Date(Date.UTC(2026, 9, 26, 6, 30, 0));
  assert.equal(isSlotBookingExpired(slotMonday26, mondayMorning), true, 'Monday morning before 09:00 test must be expired');

  // Tuesday Oct 27 -> Expired
  const tuesday = new Date(Date.UTC(2026, 9, 27, 8, 0, 0));
  assert.equal(isSlotBookingExpired(slotMonday26, tuesday), true, 'Day after test must be expired');
});

test('validateReservation rejects booking attempts for slots whose cut-off has passed', () => {
  const candidate = {
    id: 'test-cand-1',
    role: 'cctv_operator',
    status: 'test_invited',
    invitedAt: '2026-10-20T10:00:00Z',
  };
  const config = {
    slots: ['2026-10-26 09:00'],
    quota: 15,
  };
  const applications = [];

  // On Sunday evening before test: Valid
  const sunday = new Date(Date.UTC(2026, 9, 25, 18, 0, 0));
  const res = validateReservation(candidate, '2026-10-26 09:00', config, applications, sunday);
  assert.equal(res.testSlot, '2026-10-26 09:00');

  // On Monday morning (day of test): Throws INVALID_SLOT
  const monday = new Date(Date.UTC(2026, 9, 26, 6, 0, 0));
  assert.throws(
    () => validateReservation(candidate, '2026-10-26 09:00', config, applications, monday),
    /INVALID_SLOT/
  );
});
