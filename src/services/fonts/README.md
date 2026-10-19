# services/fonts/

Editor font dictionary for the report/synoptic text editor.

**Pattern:** Standard interface/mock/firestore pattern.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part B): server version (PS-514)

The font service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/CONFIG_DICTIONARIES_API.md`.
