# services/performanceTargets/

Admin-configurable performance/productivity targets (cases/RVUs per period).

**Pattern:** Standard interface/mock/firestore pattern.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 610 (#87)

Targets are now saved: `mockPerformanceTargetService` keeps them in mockStorage under `performance_targets_v1` (starting set `STARTING_PERFORMANCE_TARGETS`; cleared by Demo Reset), guards add/update/delete with `config:tat-targets:manage`, audits numbers only (`PERFORMANCE_TARGET_CHANGED`), and refuses to delete or re-key the system targets. `performanceTargetRules.ts` holds the pure rules: validation, period bounds (Monday weeks, local time), `evaluateCountTarget` (met / on track / behind / missed) and `buildTargetProgress`, which the Productivity dashboard uses for the monthly cases and RVU targets.

## Batch 617 (part B): server version (PS-514)

The performance target service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/CONFIG_DICTIONARIES_API.md`.
