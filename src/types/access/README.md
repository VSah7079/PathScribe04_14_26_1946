# types/access/

Real, tracked access-request tickets (Pediatric, Pool, Orchestration access) — a real status lifecycle and quality-metric turnaround time, replacing message-only requests with no real ticket status.

## Files

- **`AccessRequest.ts`** — the ticket shape. See `services/access/README.md` for the real service built on top of this.

## Batch 432

`AccessRequest.denialReason`: why it was denied (required when denying).

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*
