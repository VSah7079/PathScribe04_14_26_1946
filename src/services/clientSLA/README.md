# services/clientSLA/

Per-client Service Level Agreement targets (first-touch/total TAT hours, STAT variants).

**Pattern:** Standard interface/mock/firestore pattern.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 610 (#164)

Client service levels are now saved: `mockClientSLAService` keeps them under `client_sla_v1` (empty to begin with; cleared by Demo Reset), guarded by `config:tat-targets:manage`, audited as `CLIENT_SLA_CHANGED` (hours only). `clientSlaRules.ts` holds the pure rules: validation, STAT variants, `evaluateCaseSla` (hours from received to first open and to sign-out), `buildClientSlaRows` (per-client results for the dashboards) and `openCaseSlaBreaches` (open cases past target, for the worklist badge). `loadOpenSlaBreaches.ts` reads the SLAs and facilities and returns that map for a list of cases.

## Batch 617 (part A): server versions (PS-514)

`clientSlaService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
