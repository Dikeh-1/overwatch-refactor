# Recruitment workflow repairs — 21 October 2026

## Delivered behavior

- Open and intake-closed cohorts use `RecruitmentWorkspace`: the same candidate table, testing/attendance view, next-phase roster and communications editor. The archive is a directory of closed cycles rather than a separate reduced recruitment product.
- Closing applications preserves candidate stages and explicit membership. PostgreSQL lifecycle changes use an advisory lock and a transaction covering role state, cohort state, closure evidence and attachment of unassigned members. Repeated open/close requests are idempotent. Reopening creates a separate cycle.
- Future closures capture candidate records, role/rule/stage configuration and the current schedule. The workspace exposes the closure records separately in a read-only view; operational recruitment can continue afterward.
- Archived legacy stages are recovered for display only where stored decisions, stage history, responses, bookings, invitations or screening results support them. Explicit exclusions take priority over old scores. Unresolved records remain labelled for review. Reads never rewrite candidate statuses or create next-phase tokens.
- A shared cohort resolver prevents same-role records from leaking between batches. Unassigned legacy records appear once in a review bucket; active cohorts are not classified as archived merely because of their names. Authoritative closed-role state corrects stale active-cohort metadata in the read model.
- Metrics distinguish ready-to-invite, invited, booked, attendance, completed-test evidence, scored, next-phase selection and responses. Catalog, detail, drill-down, sidebar and exports use the same definitions. Literal 104/21 labels were removed.
- Technical-manager test eligibility requires confirmed metropolitan residence and qualification. Unknown geography remains unknown; a national phone number cannot establish Maputo residence. Regional-decline actions validate the audience and persist pending/sent/failed outcomes, with retry protection for notices already recorded as sent.
- Every cohort can have its own testing schedule, including a closed intake whose selection is continuing. Booking rejects invented/past dates, repeat bookings without valid grace, inactive candidates and full slots. PostgreSQL reservations serialize capacity checks and candidate updates. Booking correctly records `test_booked`, not `interview`.
- Communications are scoped on the server to the selected cohort. Test-booking links are an explicit editor option and filter out ineligible recipients. Generic messages do not silently add booking links. Communication history records successful/failed attempts. Missing scores are no longer filled from the approved-name list or advertised as over 80%.
- Placeholder roles are no longer seeded or resurrected after deletion. Intentionally empty role/rule lists remain empty.
- Database stores share a small connection pool; this fixes connection exhaustion observed during browser testing. Candidate patches merge fields atomically in PostgreSQL rather than overwriting unrelated concurrent changes. Configuration failures are surfaced instead of reporting a successful ephemeral save. Automatic deletion of unmigrated legacy configuration rows was removed.
- Attendance lookup/mutations require authenticated staff, forced overrides require an administrator, and gate sessions use signed expiring tokens. Forged constant gate tokens and cross-origin mutations are rejected. Gate checks compare full dates, not just the day of the month.
- Additional fixes include finite score validation, numeric screening ranges, configured string-rule matching, CSV quoting/formula protection, immutable candidate props, persistent sidebar component identity, QR callback recursion and multi-file editor attachment handling.

## Verified database evidence

The audit was run against the configured PostgreSQL database inside `BEGIN READ ONLY`, and printed aggregate information only. No candidate changes, recruitment emails or bulk recovery migration were executed.

| Cycle | Records | Stored status before repairs | Bookings | Stored scores | Recorded attendance |
| --- | ---: | --- | ---: | ---: | ---: |
| CCO September | 224 | All archived | 104 | 20 | 0 |
| Technical manager | 96 | All archived | 0 | 0 | 0 |

The repaired read model identifies 47 technical-manager candidates ready for test invitations using saved screening results, explicit decline decisions and confirmed metropolitan locations. The CCO roster contains 20 candidates with recorded next-phase evidence: 17 accepted, two awaiting a response and one declined. These are current stored-record counts, not a reconstruction of an external results sheet.

Zero recorded attendance does **not** mean nobody attended. Neither 104 bookings nor 20 stored scores establishes the complete historical number who physically took the CCO test. The UI explicitly explains this missing evidence. External test sheets/rosters still need reconciliation; no synthetic attendance or scores were inserted.

The technical-manager role was closed in `career_roles` while its configuration/cohort still claimed it was open/active. The read model now respects authoritative intake closure. Database lifecycle writes repair the configuration consistently when an administrator explicitly performs a lifecycle action.

## Verification

- `npm test`: 23 passing tests covering workflow, recovery, lifecycle rollback, membership isolation, eligibility, screening, date/booking rules and CSV regression tests.
- `npx tsc --noEmit --pretty false`: type check.
- `npm run build`: production compilation and static/dynamic route generation.
- `node --env-file=.env.local scripts/smoke-recruitment.cjs`: localhost API checks reconcile both archive cycles across catalog/detail/next-phase APIs and reject unknown cohorts, unauthorized attendance, forged gate tokens and cross-origin updates. The smoke test signs in locally but makes no candidate edits and sends no emails.
- Browser checks: both archive cycles load; the technical-manager invitation count opens exactly 47 records; the CCO next-phase roster shows 20/17/2/1; navigation follows the selected role; the narrow-screen layout remains usable.
- `node --env-file=.env.local scripts/audit-recruitment.cjs`: repeatable read-only aggregate audit.

The repository already had a lint backlog. An isolated scan of the original HEAD found 173 errors and 160 warnings; the final source scan found 121 errors and 162 warnings after the repairs. The new shared workflow, archive, database, authentication and booking modules are checked separately. Repository-wide lint is not asserted to pass; remaining legacy typing/React lint findings must not be confused with a clean production build/type check.

## Deployment and remaining limits

Changes are local; nothing was pushed or deployed. The earlier investigation document is retained as the pre-change baseline.

Production must have `DATABASE_URL`, an explicit `CAREERS_ADMIN_PASSWORD` (or `ADMIN_PASSWORD`), and `GATE_PIN`. Production no longer accepts source-code fallback credentials. The local environment has an administrator password but no `GATE_PIN`; set a production gate PIN before rollout. Existing gate users will need to sign in again because the old unsigned constant session is no longer accepted.

Transactional lifecycle/reservation guarantees apply to PostgreSQL, the configured production backend. Legacy REST/local fallback modes cannot provide the same multi-record transaction guarantees. They surface failed writes rather than claiming successful closure.

Historical decline delivery remains unverified where the old code did not persist delivery outcomes. No old Slack instruction was treated as authorization to resend notices, schedule training, reject applicants, delete candidates or publish the changes.
