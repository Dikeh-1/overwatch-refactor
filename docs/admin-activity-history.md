# Admin activity history

Every admin section has a History control in the shared header. Activity Log in the left navigation lists all sections, with section filtering, workspace/candidate scope, timezone-aware timestamps, stable pagination and expandable details. EN/PT interface labels follow the admin language.

## Evidence captured

- All admin mutation routes, login/logout attempts (including gate access), CV access, candidate applications, booking, gate check-in and next-phase responses have server-generated request start/result records.
- Candidate updates, bulk changes, deletion, intake state and configuration changes capture previous/proposed values in durable start records and separate success/failure records. Bulk operations retain their original batch semantics. A batch failure may be partial and is labelled accordingly.
- PostgreSQL role/cohort lifecycle transitions also insert their exact previous/new state in the same transaction as the lifecycle update; rollback removes both the change and its success record.
- All transactional communications preserve subject, recipients, message text and HTML source before provider dispatch, with delivery success/failure linked to the original record. Attachment filenames are retained; attachment bytes, CV files, credentials and signed links are excluded/redacted. Content is rendered as inert text, never executed as HTML.
- Saved communication templates now use a shared persistent store. Existing browser templates import once without replacing newer server copies; save/delete/import changes include full content. Production template changes and evidence commit in the same transaction.
- Browser navigation records section visits and CSV export requests (not proof of a completed file save). This telemetry is best effort, explicitly labelled as browser navigation and cannot submit authoritative change events. Polling/heartbeat requests, refreshes and unsaved typing are not logged as changes.

## Reliability and access

Production requires DATABASE_URL. Events are separate INSERT-only records in admin_activity_events, with no update/delete API. Section/role/cohort/time indexes support pagination. The table is protected with RLS and public/anon/authenticated grants revoked; access is through the authenticated administrator API. Local development without a database uses one exclusive-create JSON file per event in .careers-data/activity (not a shared mutable array).

The first request journal entry must persist before the handler executes. If storage is unavailable, a 503 prevents the action. If completion persistence fails after an email or mutation already succeeded, the successful response is preserved to avoid a duplicate retry, a warning response header and server diagnostic identify the gap, and the original start evidence remains available. A started event without a result requires verification; it does not prove success. Non-lifecycle mutations and their audit completion records are not a single database transaction.

Shared administrator/gate passwords identify a shared account, not an individual employee. Request IDs correlate related events without storing session credentials. Timestamps are stored in UTC and displayed with the viewer's timezone abbreviation and raw UTC timestamp in the title. Logging begins at deployment; prior events are not fabricated or backfilled from uncertain evidence. Database backups/retention must include this table. No history purge is exposed in the application.
