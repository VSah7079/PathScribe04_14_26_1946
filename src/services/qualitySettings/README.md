# services/qualitySettings

Quality settings. Lab-wide quality defaults. `mockConcordanceReviewSettingsService.ts`: the concordance review default (`setOrgDefault`).

## Batch 428: Configuration permissions

- `mockConcordanceReviewSettingsService`: `setOrgDefault` need `config:concordance-review:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*
