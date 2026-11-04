# services/workstationGroups

Workstation groups. The QC mode at each bench. `mockWorkstationGroupService.ts`: create / update / deactivate / reactivate.

## Batch 428: Configuration permissions

- `mockWorkstationGroupService`: `create`, `update`, `deactivate`, `reactivate` need `config:workstation-groups:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*

## Batch 617 (part C): server versions (PS-514)

The workstation group service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/DICTIONARIES_CONFIG_API.md`. The mocks are unchanged.
