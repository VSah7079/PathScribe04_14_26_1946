# services/systemConfig/

Lab-wide system configuration (name, code, timezone, LIS connection settings).

**Pattern:** Mock/firestore pair only — no separate interface file. The real SystemConfig interface is defined inline inside mockSystemConfigService.ts itself, which is why a duplicate standalone ISystemConfigService.ts (found elsewhere, unused) was deleted during the July 2026 review.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*