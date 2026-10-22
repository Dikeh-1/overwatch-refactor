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
