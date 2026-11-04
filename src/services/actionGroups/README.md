# services/actionGroups

Action groups. Which actions each workstation allows (Configuration → System → Action groups). `mockActionGroupService.ts`: storage-backed create / update / deactivate / reactivate.

## Batch 428: Configuration permissions

- `mockActionGroupService`: `create`, `update`, `deactivate`, `reactivate` need `config:action-groups:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*

## Batch 617 (part A): server versions (PS-514)

`actionGroupService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
