# services/systemConfig/

Lab-wide system configuration (name, code, timezone, LIS connection settings).

**Pattern:** Mock/firestore pair only — no separate interface file. The real SystemConfig interface is defined inline inside mockSystemConfigService.ts itself, which is why a duplicate standalone ISystemConfigService.ts (found elsewhere, unused) was deleted during the July 2026 review.

## Batch 428: Configuration permissions

`systemConfigChangeChecks.ts` (new): the settings kept in SystemConfigContext need their section's capability: voice on/off (`config:voice:manage`), approved fonts (`config:report-appearance:manage`), peer averages and time zone (`config:contribution-settings:manage`), abnormal-result detection (`config:abnormal-triggers:manage`).

## Batch 431: systemConfigStore.ts

System, enterprise and hospital configuration is read and saved through `systemConfigStore.ts` (same keys as before). `SystemConfigContext` and `retentionPolicy/RetentionPolicy.ts` use it. Production (PS-345): GET/PUT on the API server, so every workstation in a lab sees the same settings.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*