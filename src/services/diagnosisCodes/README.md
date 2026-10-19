# services/diagnosisCodes/

Referring physician's order-time diagnosis code, as it arrives on the requisition.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Deliberately renamed FROM 'icd10' specifically to avoid confusion with services/codes/'s separate, broader, case-level multi-standard coding system used near sign-out. Already correctly resolved — see this file's own header for the full reasoning.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part B): server version (PS-514)

The diagnosis code search now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/CONFIG_DICTIONARIES_API.md`.
