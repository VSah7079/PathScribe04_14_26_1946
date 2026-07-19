# services/clients/

The Client Dictionary — institutions/hospitals PathScribe reports for.

**Pattern:** Standard interface/mock/firestore pattern.

## Files

- **`IClientService.ts`** — IMPORTANT: its own header documents an ALREADY-RESOLVED historical bug — this file and mockClientService.ts once each declared their own diverged Client type (one had address/contact fields, the other had pediatric/TAT config); two consumers only compiled by accident because both only touched .status. Reconciled June 2026 — this file is now the single source of truth.

## Notes

- Good example, for anyone reviewing this codebase, of a real 'two versions of the same type silently diverged' bug being caught and properly fixed rather than left to rot.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*