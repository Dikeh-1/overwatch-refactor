# Admin workflow audit — 21 October 2026

## Confirmed problems repaired

- Workspace loading indicator was an inline element in a left-aligned wrapper. Its loading region now centres it horizontally and vertically.
- Closed roles appeared in the open-role selector and pipeline links. Only authoritative open roles are selectable; no open roles produces an explicit empty state. Archive stages remain available inside their own cycle.
- Role switching changed local selection without updating an explicit role in the URL. It now navigates to the corresponding role workspace.
- Role lifecycle edits left sidebar state stale. Successful changes publish the shared update event and refresh role definitions.
- Cycle headings rendered stored Portuguese titles even in English. Shared cycle labels now use the selected language, the saved role title, and a month/year in Africa/Maputo. Both archive cards and detail headings use the same formatter.
- Closing an intake preserved its old name. Future closures stamp the actual closure month/year. Existing September/October periods remain identifiable without altering candidates or inventing a legacy closure timestamp.
- Roles-manager returned stale active cohort metadata for closed roles. Its catalog now applies authoritative role state, as the archive API does.
- Closed legacy cohorts could inherit another intake's global booking schedule. Global schedule fallback now requires an actually open role and its current cohort.
- Inline live-feed callbacks restarted polling on renders; abandoned requests could continue scheduling timers. Callbacks now use refs, requests abort on cleanup, and polls cannot overlap.
- Query-only navigation did not dismiss the navigation indicator. Query changes now finish navigation too; changing a role without navigating does not start a fake navigation overlay.
- Settings displayed success without saving. An authenticated, origin-checked API now reads and persists sender/reply-to defaults and session capacity. Email sending consumes those saved defaults. Invalid settings fail validation; failed writes surface errors. Capacity preserves the existing schedule. Closed cohorts with their own saved quota keep that quota.
- Bulk invites accepted ineligible candidates and expired default dates. Invitations now require an eligible resolved candidate and configured future sessions; duplicate IDs are deduplicated.
- Reminders compared the day number alone, allowing different months/years to match. They now compare full dates and skip already recorded reminders.
- Cookie-authenticated legacy broadcast endpoints did not consistently enforce request origin. The shared authorization helper now checks origins for cookie-authenticated mutations while retaining explicit server credential authorization.
- Restoration accepted arbitrary stages, implicitly selected unknown-sex archived records, and erased historical bookings. It now requires explicit IDs, validates a review stage, retains booking evidence, and skips active candidates.
- Disqualification wrote ambiguous generic archival status and duplicate IDs could send twice. It now records an explicit disqualified decision and activity entry, deduplicates IDs, and skips hires/already rejected candidates.
- Explicit terminal decisions could reappear in next-phase counts through stale response metadata. Shared next-phase predicates now exclude those decisions.
- Repeated archival overwrote the original pre-archive stage. Repeated operations now preserve that evidence.
- Clearing a booking retained the booked stage or could erase the booking underlying recorded attendance/results. It now restores the invited stage where applicable and rejects removal with recorded attendance/results.
- Rebooking exposed expired fallback slots and could email a token before persistence. It now exposes only configured future slots, persists tokens before delivery, reuses unused tokens, and rejects candidates with terminal decisions, attendance or completed tests.
- The September holiday helper matched other months' 25th. It now checks the parsed month and day.
- Global overview counted historical closed intakes as active, treated attendance as test completion, and inferred progression inconsistently. It now scopes open intakes and uses the shared metric predicates.
- Form builder recreated default open roles for an empty stored role list and reinstated default criteria after an administrator removed all rules. Empty roles and empty rules are now respected; loading failures surface retry controls.
- CV caching identified files by byte length, allowing a same-size replacement to stay stale. ETags now hash content. Unsupported MIME types download as attachments with a sandbox policy.
- Presence writes now check origin and bound session ID/name lengths.

## Verification and limits

- Regression suite: 32 tests, including isolated settings persistence and candidate mutation tests with mocked storage/email providers. No real candidate decisions or emails are exercised.
- TypeScript and production build pass, including static prerendering of all admin routes. A missing Suspense boundary around query-aware navigation was caught by production prerendering and repaired.
- Localhost smoke checks compare each archive directory metric with detail and next-phase APIs, check closed-role consistency/settings loading, and reject unauthorized, cross-origin, forged-gate and invalid-setting requests. They make no candidate mutations and send no emails.
- Visual checks cover October in English and Portuguese, the separate September cycle, closed-role sidebar state and the Settings page.
- Repository lint has existing typing/React-rule findings. They are not evidence of a clean lint run and were not hidden by disabling rules. Targeted changed/new modules are checked separately.
- Stored historical attendance remains incomplete. No test can reconstruct missing attendance or verify old email deliveries without external records. No synthetic attendance, scores or decisions were inserted.
- The old technical cohort's stored status is inconsistent with the authoritative closed role. APIs normalize it consistently; this audit does not bulk-rewrite production recruitment history.
- This is an evidence-based audit and regression pass, not a guarantee that every possible hidden defect has been eliminated. Actual provider delivery and production deployment require environment-level verification. Production still requires explicit admin credentials and GATE_PIN.

The final next-phase predicate excludes two stored terminal decisions with stale response metadata (one archived, one archived with a decline reason). Counts may therefore differ from the older implementation; underlying candidate decisions were not modified.
