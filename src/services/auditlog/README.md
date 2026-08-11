# services/auditlog/

System-wide audit log — AI actions, user changes, system events.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- PHI-safe by design — AuditLog.detail is documented as containing no patient names, DOB, MRN, or clinical values.
- **`AuditLog.facilityId`** — added August 2026, per direct specification, building the Post-Sign-Out Release Buffer's own Phase 5 (audit-logging polish). A real, optional, additive field — genuinely absent for the many pre-existing audit calls across this app that don't populate it, not backfilled. See `services/reportRelease/README.md`'s own Phase 5 section for the full story, including two real, app-wide gaps found and fixed in `components/Audit/useAuditLog.ts` and `audit/auditLogger.ts` along the way (a hardcoded `caseId: null` that discarded every real caller's own case id, regardless of what they passed) — not scoped narrowly to this one new field, since the same fix pattern closes the gap for `caseId` too.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*