# types/patients/

Standard reason-code taxonomy supporting the Master Patient Index's Break-Glass rebind workflow (`services/patients/`).

## Files

- **`BreakGlassReasonCode.ts`** — real reason codes for attaching a Case created under a temporary/downtime placeholder identity to the confirmed, real patient once identity is established (Interface Exception & Case-Binding Module, Phase B).
- **`OutboundPatientAdtQueueEntry.ts`** — a queued outbound patient ADT message (see Batch 425 below).

*Corrected in the Batch 496 README audit (Oct 9, 2026): added `OutboundPatientAdtQueueEntry.ts`, missing from this list.*

## Batch 425

`OutboundPatientAdtQueueEntry.sourceOperation` gains `'recordNationalIdentifier'`: an A08 queued because a national identifier was recorded or removed after accessioning.

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*
