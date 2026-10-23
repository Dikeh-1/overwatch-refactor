# Communications Studio operations

## Storage and booking migration

Apply `private-mail-schema.sql` and `atomic-test-booking.sql` as the database owner before deploying. Both were applied for this release. Mail storage is private: RLS is enabled and only the server service role can access it. Do not expose the service key or add the local DATABASE_URL to Vercel; production uses the existing Supabase REST connection.

Drafts are versioned. A stale tab cannot overwrite a newer version. Attachments are stored privately once, then referenced by the draft. Browser recovery preserves unsaved edits when the server is unavailable. Draft autosaves do not generate activity-log noise.

Queue submission freezes the message and recipient list. Delivery claims use compare-and-swap; completed deliveries are never automatically resent. If a worker times out, Outbox has Resume pending deliveries. Failed or ambiguous deliveries require provider verification before manual retry. Do not resend a campaign simply because profile history failed after delivery. Waiting booking follow-ups are visible in Outbox; successful follow-ups appear in Sent.

## Delivery

The only outbound transport is Brevo. Set BREVO_API_KEY and BREVO_API_KEY_BACKUP (legacy BREVO_API_KEY_SECONDARY is also accepted). The sender is always noreply@overwatchmoz.com. Configure/verify that sender in both Brevo accounts. Accounts rotate; a definite quota/auth rejection can fail over. A network timeout does not trigger a second send because the first request may already have succeeded.

Remove obsolete FALLBACK_SMTP_USER and FALLBACK_SMTP_PASS from deployment environment settings. They are ignored by the application, and the SMTP library has been removed. EMAIL_PROVIDER is no longer needed. Do not store personal mail credentials in this repository.

Email language defaults to Portuguese independently of the admin interface language. The saved email language controls role names, personal booking buttons, dates and the original official letterhead. Subject is only the email subject, not repeated as a body heading.

## Incoming: info@overwatchmoz.com

The domain uses Zoho Mail. Authorize read-only scopes ZohoMail.accounts.READ and ZohoMail.messages.READ for the mailbox owner, then securely configure ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET and ZOHO_MAIL_REFRESH_TOKEN on the server. Do not paste credentials into chat. The implementation uses Zoho US endpoints and verifies that the authorized account owns info@overwatchmoz.com, either as its primary address or as a confirmed alias of comercial@overwatchmoz.com, before reading any messages. Search is restricted to To/Cc info@; full-content requests independently verify the recipient metadata. It never sends through Zoho. A temporary ZOHO_MAIL_ACCESS_TOKEN can be used for connection testing but is not a durable setup.

References: https://www.zoho.com/mail/help/api/get-emails-list.html and https://www.zoho.com/mail/help/api/get-email-content.html . Incoming currently lists the latest 100 messages addressed to info@ in To/Cc (excluding spam/trash by provider default) and loads full content on demand. The owner authorized the read-only connection on 22 October 2026. Production credentials are stored as Vercel Secret variables. Zoho verified the confirmed info@ alias, and a live API check loaded 100 matching messages plus one full message. No mailbox contents are simulated.

## Test schedules

Settings > Test schedules by role & recruitment cycle controls the cycle schedule and capacity. Times are Maputo (UTC+2). Personal booking links resolve the applicant's own role and cycle; there is no global fallback. Removing a slot preserves historical bookings. The atomic reservation RPC serializes reservations within each role/cycle/slot and rechecks capacity. The booking event triggers the configured follow-up, using the actual selected slot.

## Screening

The checklist, failed count, eligibility and weighted score use the same cycle snapshot rules. Experience ranges are evaluated using their lower bound; missing/unknown numeric responses do not become zero. Saved raw evaluations remain in the database for evidence, while displayed evaluations are recomputed from the applicable rules. Screening does not overwrite recorded recruitment selections or outcomes.

## Validation limits

Runtime dependency audit reports zero vulnerabilities after updating Next.js to 16.4.2 and removing nodemailer. The full audit still reports five high findings in the ESLint-only dependency chain (braces, micromatch, fast-glob, @next/eslint-plugin-next, eslint-config-next). npm currently proposes an incompatible downgrade to eslint-config-next 14.2.35; it was not forced. Track the upstream fix. Incoming was verified against the authorized real mailbox after setup. Real recipient delivery was not exercised in QA; no applicant emails were sent by the agent.


## Delivery reliability and mailbox verification (22 October 2026)

Empty attachment arrays are omitted at the Brevo boundary. Each mailbox has a durable worker lease, with up to five simultaneous deliveries followed by a one-second pause. Per-message version claims prevent duplicate processing when Send and Resume overlap. The progress dialog reports accepted, sending, queued, failed and skipped/cancelled counts. An unconfirmed network outcome is never offered as a safe retry. The Outbox allows individual selection and bulk cancellation of queued/failed mail and waiting automations; messages already sending cannot be removed. Tombstones prevent interrupted queue recovery from restoring cancelled deliveries.

Invitation delivery reuses the same recovered stages and cycle screening evaluation as recipient selection. An applicant who becomes ineligible is skipped without calling Brevo. Historical eligibility/empty-attachment rejections can be retried explicitly; the server rechecks eligibility. The old synthetic invitedAt history entry is suppressed when an actual communication exists at that time. A live read-only check against both Brevo connections confirmed one invitation for the reported example, with sent/delivered events and its original HTML available.

Sent messages retain the exact rendered HTML and provider message ID. Opening a historical email attempts recovery from Brevo using its stored recipient, exact subject and sending time, requiring a unique match. Unavailable originals are identified honestly. Original provider content and delivery/open/click events load on expansion; clicked URLs are shown when supplied by Brevo. Tracking is read from the provider on demand and is subject to its retention, recipient privacy settings and proxy image loading; it is not proof that a person read the message. Received/sent documents render in sandboxed frames, preserving tables and inline formatting while blocking scripts and external tracking image requests. Mail viewing does not create a false open event.

The live manager cycle had capacity 8 separately from the default capacity 10. Its cycle capacity was changed to 10 and verified after a fresh production reload. Cycle and booking configuration reads now bypass the old per-instance 60-second cache, and a rejected remote storage write cannot report a successful save. Existing reservations and candidate outcomes were not changed.

Booking commits before email delivery. The configured follow-up and standard booking receipt start independently immediately after confirmation, so a slow receipt no longer delays the follow-up. The automation is claimed before delivery, preventing duplicate triggers or a cancelled waiting automation from racing into a send.


## Folder and action feedback correction (23 October 2026)

Mailbox folder sessions remount by scope and folder, abort obsolete list/detail reads, ignore stale response generations and accept only received Zoho records in Incoming. Deleted Outbox rows cannot render beneath another folder's heading. Deleting requires an accessible native modal confirming the exact frozen selection; Escape/Cancel makes no request. Mutating controls lock synchronously, display processing text and report success/failure. Background Outbox polling pauses during a confirmation or mutation. Mail reads show loading status, repeated reads are coalesced per message, manual Refresh has a visible loading/result state, and network requests have bounded timeouts. New draft creation also rejects repeated clicks. Admin controls have hover, press and keyboard-focus feedback, and language helpers remain stable across unrelated renders.

Provider events reported through both content and statistics endpoints are deduplicated by event and second. Provider-rewritten company logos are restored to the known Overwatch logo while tracking pixels remain blocked in the mail viewer. The completed-campaign retry regression preserves immutable original content. The full suite currently contains 89 passing tests.


Local browser verification used one marked, disposable failed Outbox record addressed to qa@example.invalid. Cancel retained it; Confirm displayed Deleting/disabled controls, then removed it and displayed the success result. Rapid Outbox/Sent/Incoming switching exposed no old Outbox rows or controls in Incoming. The fixture was removed afterwards. No applicant messages were sent or deleted in QA. TypeScript and focused ESLint checks passed; the production build completed successfully.
