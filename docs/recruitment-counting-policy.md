# Recruitment counting policy — administrator clarification

The administrator clarified that screening means an application was assessed, that candidate archival represents a decision not to proceed, and that September's booked cohort completed the test without using QR attendance. Future completed-test counts must follow recorded gate attendance.

## Definitions used across roles and cycles

- Total applications: every candidate record in the selected role/cycle.
- Screening assessed: saved or calculated criteria assessment exists, including passes and failures. This does not claim that a human opened every CV or that a rejection email was sent.
- Screening passed: assessment reports that mandatory criteria were met. It is independent of later location/selection decisions.
- Qualified to continue: qualified records still in the recruitment pipeline. This is not an invitation or a recorded next-phase selection.
- Not advancing / archived: explicit terminal candidate outcomes, including regional decline decisions, disqualification, withdrawal and rejection. Unknown legacy closure stages are shown separately for review. Closing a role's intake never means rejecting all of its candidates.
- Booked: saved test booking.
- Attended: recorded present/late attendance or an explicit, scoped historical administrator confirmation.
- Tests completed: attended under the administrator's operating convention, explicitly tested, or has a finite saved score. Future gate check-ins therefore populate this number automatically.
- Results scored: finite numeric scores only; no scores are synthesized from attendance.

Production technical-manager records verify: 96 assessed, 90 passed technical screening, 47 qualified to continue and 49 not advancing. The old role card incorrectly excluded only the literal archived/rejected statuses, overlooking explicit not_advancing decisions.

## September correction

The administrator explicitly confirmed that the 104 booked September candidates completed the test. Production contains 21 older absence flags among those records and 20 saved scores, all belonging to booked candidates. A protected origin-checked archive API records a fixed list of the 104 candidate IDs in the September cohort metadata, the confirmation time/basis, and the IDs of the 21 prior absence flags. Original candidate rows, QR timestamps and test scores remain unchanged. The read projection shows confirmed attendance for those IDs, so September booked/attended/completed counts agree at 104 while scored results remain 20.

Confirmation rejects a mismatched expected booking count and requires an explicit override flag when older absence records conflict. It applies only to a closed confirmed cycle and is idempotent. It cannot sweep up future bookings or another cohort. Later explicit attendance corrections, timestamped by the gate API, take precedence. This is a targeted correction authorized by the administrator's request, not a general rule that every booking means attendance.

The generic overwritten-stages banner is removed. Records with no saved outcome retain a specific review count. Actual historical sources remain traceable rather than being silently erased.

Regression coverage includes assessment versus pass/decision counts, attendance-driven completion, no synthetic scores/scan timestamps, membership isolation, fixed-ID historical confirmation, conflict checking, explicit absence override, later corrections, idempotence and origin protection.

Visible recruitment dashboards, cohort workspaces, archive catalogs and role cards refresh every 30 seconds and when focus returns. This allows QR attendance saved on another device to populate the counts without a manual reload. Hidden views do not poll.
