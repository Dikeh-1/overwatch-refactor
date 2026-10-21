# Admin recruitment and Archive Vault investigation

Reviewed 21 October 2026. This is an investigation and implementation brief; application behavior has not been changed.

## Scope and confidence

Read the available Filipa DM history through the Slack connector until it returned no more messages, and read the key recruitment threads, including the 77-reply September testing thread, the October regional-decline/closure thread, the training-readiness thread, and the exact October 21 Archive Vault complaint. Not every unrelated thread or linked attachment was opened. Historical Slack instructions are evidence of requirements, not authorization to execute old requests now.

Fetched all three configured Git remotes and inspected repository history, relevant changes, and the current implementation. The fetched history contains 238 commits across all refs. The local main branch, origin/main, upstream/main and overwatch-target/main resolve to b540d5f. Git author names do not establish which assistant wrote a commit: 217 commits are attributed to Dikeh-1, 14 to horuswave, six to Ebube Junior Michael and one to Vercel. Git history does not provide a complete historical record of push events or prove which commit is currently deployed. Production identity is based on the user's description, not independently verified deployment metadata.

No live candidate database was queried, no recruitment messages were sent, and no production writes were made. Exact present-day candidate totals, delivery status, and recoverability of overwritten stages remain unverified.

## What the workflow needs to mean

Closing applications must be distinct from completing recruitment. A closed vacancy can still have applicants awaiting testing, management decisions, confirmation, interviews or training. The Archive Vault should open the same role/cohort workspace with the relevant data and stages preserved, rather than presenting a second, reduced implementation.

Role intake state, cohort lifecycle, candidate selection stage, eligibility, attendance, and communication delivery are separate facts. One `archived` candidate status cannot represent all of them.

## Slack evidence and requirements

| Evidence | Meaning for the revamp |
| --- | --- |
| September 14: candidates choose a test date, receive confirmation, and appear on the corresponding list | Invitation, booking and attendance must remain separate and reconcile with the roster. |
| September 15 testing thread: written situational-awareness assessment, technical/system-response assessment, structured interview | Preserve the actual role-specific process rather than assuming every role has an identical generic funnel. |
| September 17: close the opening because there are enough candidates; tests continued afterward | Closing intake must not terminate selection or erase stage membership. |
| September 17 and 24: confirmations did not always match lists; QR use was unreliable; only about half attended | Bookings and QR check-ins cannot be treated as complete proof of who actually sat a test. |
| September 24: next-phase selection supplied through an external result file; September 29: six further candidates added | Selection and results need recorded provenance. The historical next-phase roster is not the total tested population. |
| October 1: technical-manager application form with mandatory versus preferred screening requirements | Preserve role-specific questions and rules. Passing mandatory criteria drives shortlist/review; preferred experience is additional evidence. |
| October 19: first decline technical-manager applicants outside Mozambique, then narrow eligibility to Maputo, Matola, Marracuene and Mavalane; then close the position | Retain eligible applicants and their progress after closing intake. Record regional decisions and communication outcomes separately. |
| October 19: CCO training material needs revision; no training date yet | Do not infer a training schedule or send dated next-step invitations from old messages. |
| October 21: cannot see test-call numbers, eligible Maputo applicants appear archived, next-stage selection is unclear, CCO September cohort shows an incorrect 23 tested | Show clear counts with drill-down candidate lists and explain each metric. |
| October 21: remove fake openings such as Vendas | Stop automatically recreating placeholder roles after deletion; protect any real historical associations during cleanup. |

Primary Slack references:

- [Archive Vault complaint and technical-manager test-count question](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1792578201599469)
- [Metropolitan eligibility and outstanding decline communication](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1792578129434139)
- [Regional eligibility and technical-manager closure](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1792404213945679)
- [Training readiness](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1792405871237539)
- [Technical-manager form and screening specification](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1790856742905229)
- [September testing workflow](https://filipasteam.slack.com/archives/D09KM0EF4FQ/p1789477342865709)

## Relevant change history

| Commit | Change and implication |
| --- | --- |
| ac8dfb9, October 2 | Introduced role workspaces, cohort archiving and modular pipeline infrastructure. |
| 8aa4e7e, October 2 | Introduced the close-and-archive candidate-status rewrite, as located with Git history search. |
| 0069cad / ca38938, October 3 | Expanded the separate vault interface and embedded cohort communications. |
| 8bef3df, October 3 | Separated configuration storage from application records. |
| 9909120, October 4 | Changed screening weighting and separated screening/technical match from test scores. These measures must stay distinct. |
| 25a84ff, October 12 | Expanded next-phase visibility and transition auditing. |
| 7b55044 / 773811d / 175357e / 9d668d2 / df45e4e, October 19 | Added regional filters, decline workflow and wording; addressed status auto-healing. |
| 4ae8b4d, October 19 | Migrated configuration/cohort persistence toward PostgreSQL and addressed serverless filesystem errors. |
| b540d5f, October 21 | Rewrote much of ArchiveVaultView and added inferred historical statuses and broader testing counts. It does not fix the underlying lifecycle model. |

Latest commit: [b540d5f](https://github.com/Dikeh-1/OverWatch/commit/b540d5f7f71886a65dc0c575c88c84a31cd2e145).

## Confirmed implementation problems

1. **Archiving erases explicit candidate stages.** `closeAndArchiveRoleCohort` in `src/lib/careers-campaign-store.ts` replaces every selected non-hired candidate's status with `archived`. It does not preserve the previous status in a dedicated field. The cohort model stores stages/rules but no immutable candidate snapshot.

2. **Closing a later cohort can capture earlier cohorts.** Its selection condition accepts a same-role application whenever `app.status !== "archived"`, even if that application explicitly belongs to another cohort. Previous hires are particularly exposed because they retain `hired` rather than `archived`.

3. **Archive reads guess history.** `src/app/api/admin/careers/archive/route.ts` converts archived records into inferred stages using next-phase fields, attendance, scores, bookings and simplified screening conditions. It cannot reliably recover a previous rejection, withdrawal, no-show, interview or training stage after that stage was overwritten. The returned `status` is replaced with this inference.

4. **Cohort membership is too broad.** Archive detail and summary queries include same-role records if they are archived or lack a cohort ID, even when there is no explicit evidence they belong to the requested batch. This can duplicate or mix people across cohorts. Discovery also treats IDs containing `cohort` as evidence of archival, which can surface active cohorts as archived.

5. **The new tested count changes the definition instead of establishing attendance.** The latest API and UI predicates count a test slot, booking timestamp, invitation status, attendance timestamp or numerical score as testing evidence. Invited/booked people can therefore appear in totals read as tested. Summary and detail also differ because detail may enrich missing scores from a hardcoded approved-candidate list.

6. **The vault is still a separate workspace implementation.** `ArchiveVaultView.tsx` hardcodes five tabs and a generic funnel. It does not derive its navigation from the saved cohort stages or reuse the active workspace views. Interviews/training do not receive equivalent dedicated workflow tabs. Comments describing the tabs as identical do not make them so.

7. **Hardcoded counts remain.** The latest vault includes literal `View All (104)` and `View Roster (21)` labels. Neither is evidence of a current candidate total.

8. **Location classification invents certainty.** `src/lib/location-utils.ts` treats an otherwise unclassified Mozambique phone number as Maputo-region residence. Unrecognized locations without such a number become outside Mozambique. A phone prefix cannot establish metropolitan residence; unknown/ambiguous locations need review.

9. **Deleted placeholder roles can return.** `getRoleDefinitions` re-adds every missing default role in the remote path. `src/lib/careers.ts` includes sales, operations and technical placeholders, so deleting Vendas alone is insufficient.

10. **Archive completion can conceal partial failure.** Cohort save and application sealing failures are caught and logged before the role is still closed. Persistence across cohort/application/role updates is not atomic.

11. **Decline action and delivery are separate but insufficiently durable.** `decline-location/route.ts` updates status before sending email; email failure can leave the applicant declined but unnotified. The response reports delivery success, but the inspected route does not persist a successful delivery receipt with the candidate. It also does not enforce the candidate's role or location group before applying the requested decline type.

## Implementation direction

1. Establish read-only baseline counts from authoritative candidate and result records, grouped by explicit cohort. Compare actual attendance/results with the externally maintained test results. Record unresolved identities and missing evidence; do not manufacture a corrected number.
2. Separate intake closure from recruitment completion. Preserve selection status and explicit cohort membership. Design an evidence-based recovery/migration for already overwritten records before bulk changes.
3. Use one role/cohort workspace across open and intake-closed recruitment, with the same configured stages, candidate detail, tables, roster, scoring, response tracking and communications. Keep the vault as a cohort directory/context selector.
4. Centralize cohort membership and metric predicates. Distinguish eligible for invitation, invited, booked, attended, scored, selected, accepted, declined and awaiting response. Every metric must open the exact underlying population.
5. Preserve cohort configuration and lifecycle history. Decide explicitly how later operational updates coexist with the record of what existed at intake closure; a single mutable record cannot serve as both without an audit trail.
6. Add unknown-location review, durable communication outcomes, persistent placeholder-role deletion, and atomic/verified closure behavior.

Acceptance checks should cover intake closure without stage loss; reopening without cohort mixing; prior hires retaining their original cohort; identical metric populations across list/detail/export; separate booked/attended/scored numbers; saved role-specific stage navigation; unknown geography staying unresolved; failed email remaining visible for retry; and placeholder deletions surviving a refresh.

## Remaining evidence gaps

- The actual September tested total and the current eligible technical-manager test-call total require live records and reconciliation with result sheets.
- Slack contains the request to send regional declines, not proof that every intended recipient received one.
- Git confirms fetched branch contents, not a complete historical push audit or production deployment identity.
- Exact historical stages may require activity logs, database backups and external rosters because closure overwrote some statuses.
- No new technical-manager test date or training date was established in the reviewed latest threads.
