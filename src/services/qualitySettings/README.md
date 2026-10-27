# services/qualitySettings

Quality settings. Lab-wide quality defaults. `mockConcordanceReviewSettingsService.ts`: the concordance review default (`setOrgDefault`).

## Batch 428: Configuration permissions

- `mockConcordanceReviewSettingsService`: `setOrgDefault` need `config:concordance-review:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*

## Batch 617 (part C): server versions (PS-514)

The concordance review settings service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/QUALITY_SETTINGS_API.md`. The mocks are unchanged.

## Batch 652 — Specimen pipeline gaps

- `aiComparisonEnabled` switches the automatic **category** comparison of frozen vs final (no AI model is involved). The stored key keeps its historical name so saved org, facility and staff settings keep working; the screen label and the comments say category comparison. It shows only while `reviewScreenEnabled` is also on.
