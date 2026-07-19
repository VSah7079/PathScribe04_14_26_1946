# services/cases/

The biggest, most central folder — case data access, LIS-vs-Orchestration routing, and production-migration planning.

**Pattern:** See PRODUCTION_MIGRATION.md — this folder deliberately does NOT follow the simple interface/mock/firestore triplet; read that doc first.

## Files

- **`ICaseService.ts`** — The contract any case data source must satisfy (mock, Firestore, HL7 FHIR, or direct LIS DB).
- **`CaseRouter.ts`** — THE FACADE — routes between LIS cases (S26- prefix) and Orchestration cases (O26- prefix). Production-critical, explicitly marked 'keep' in PRODUCTION_MIGRATION.md.
- **`casePoolAssignmentService.ts`** — (renamed from caseRoutingService.ts) Automatic case-POOL/subspecialty routing when no LIS assignment exists — a genuinely DIFFERENT concern from CaseRouter.ts (business logic, not data-source selection). Called from HL7 inbound handler, LIS polling, and the manual 'Route to Pool' action.
- **`AuditLogger.ts`** — DSPT/GDPR-compliant structured access logging, partitioned per data source for medico-legal clarity.
- **`FHIRCaseService.ts`** — Production NHS HL7 FHIR R4 implementation — deliberate scaffolding, not yet wired in. Full resource-mapping table and go-live TODO list in its own header.
- **`FirestoreCaseService.ts`** — (casing fixed July 2026 — was firestoreCaseService.ts, mismatched PRODUCTION_MIGRATION.md's documented name, would have broken on a case-sensitive/Linux deploy) Production Orchestration-case data source.
- **`caseFilterUtils.ts`** — Shared case-filtering pipeline — extracted specifically to stop mockCaseService.ts and mockOrchestratorCaseService.ts's filter logic from drifting apart, the same class of bug this codebase has hit and fixed repeatedly (see its own header comment for the pattern list).
- **`mockCaseService.ts`** — MASSIVE (4,000+ lines) — the real, active LIS-mode mock data source. Marked for deletion at production go-live per PRODUCTION_MIGRATION.md Step 4.
- **`mockOrchestratorCaseService.ts`** — Large — the real, active Orchestration-mode mock data source. Also marked for deletion at go-live.

## Notes

- READ PRODUCTION_MIGRATION.md FIRST when working in this folder — it's a genuinely detailed, real go-live runbook (SMART on FHIR auth options, NHS DSPT compliance by jurisdiction, GDPR Art 25 data-minimization reasoning, Caldicott Guardian approval, Firestore UK/EU residency).
- The O26-/S26- accession prefix convention (Orchestration vs LIS) is central to how this whole folder works — see CaseRouter.ts.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*