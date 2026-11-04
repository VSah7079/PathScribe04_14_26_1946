# 5. Specimen traceability controls

Sources: `FEATURE_OVERVIEW.md` (Batch Management & Chain of Custody), the Administrator Guide Batch Management and Lockbox chapters, `COLD_CHAIN.md`, `BLOCK_DELETION.md`, `RETENTION_HOLDS_QUEUE.md`.

| Control | What it does | Status |
|---|---|---|
| Chain of custody | Cassettes and slides are tracked by scanning container barcodes through Decal/Special Processing, Processing, Embedding, Microtome/Sectioning, Staining and Checkout. Each step records the person, station and time. | Live |
| Scan verification | Scanning is required at each node; mismatches are refused with a reason in the person's language. Reconciliation overrides need their own permission and are audited. | Live |
| Workstation tracking | The scan station, bench workstation and site agent are recorded with each scan; a computer's scan station is a workstation setting, not user data. | Live (browser); site agent and server Partial (phase 2e) |
| Batch tracking | Batches of cassettes and slides are loaded, processed and reconciled as a unit; Pending Batch Load queues work; Frozen-to-Permanent reconciliation links frozen and permanent sections. | Live |
| Cold chain | Excursions are flagged and need acknowledgement with their own permission. | Live (Demo data) |
| Lockbox drop-off | After-hours specimen drop-off with seed cases and demo reset. | Built (Demo) |
| Retention and disposal | Eligibility is computed from the governing-body figures for the jurisdiction; a case-level Retention Hold blocks disposal until released; scan-to-dispose and a disposal report each need their own permission. Seeded CAP wet-tissue, RCPA and Korea MSA figures are **unverified placeholders**, shown with an amber badge; confirm them before go-live. | Live |
| Block deletion | Deleting a block is restricted and audited. | Partial (Batch 588) |
| Correction auditing | Corrections to patient, case and specimen identifiers and amendments to reports write audit entries with old and new values; re-linking a downtime patient identity needs the high-risk permission `patient:break-glass:rebind`, a reason code and a written justification. | Built (Demo) |

## What the laboratory still owns

Specimen labelling at collection, transport conditions outside the lab, physical storage security, the retention schedule it adopts (the product supplies figures; the laboratory confirms them), and disposal methods. The audit log is not tamper-evident until the server exists (chapter 4).
