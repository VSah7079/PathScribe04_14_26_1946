# services/aiBehavior/

Admin-configurable AI behavior settings — confidence thresholds, auto-insert toggles, per-section AI enable/disable.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- MINOR: IAIBehaviorService.ts's own header comment has a stale path (says services/aiIntegration/, should say services/aiBehavior/) — cosmetic, worth fixing.

## Batch 428: Configuration permissions

Switching AI features on or off for everyone (`aiBehaviorService.update` / `reset`) needs `config:ai-behavior:manage`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part A): server versions (PS-514)

`aiBehaviorService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
