# regulatoryProfile (Batch 679)

`VITE_REGULATORY_PROFILE` = `documentation` (default) or `clinical_support`.

- `regulatoryProfile.ts`: `parseRegulatoryProfile`, `regulatoryProfile()`, `capabilitiesFor(profile)`, `showsConfidence()`.
- `documentation`: no numeric confidence on clinical screens; a mismatch flag is a plain, low-risk flag that never holds sign-out.
- `clinical_support`: the earlier behaviour (percentages, thresholds, Block rules). Kept and tested; reserved until regulatory review.
- Numbers stay in audit/QA records and quality dashboards.

Details and open items: `docs/product/REGULATORY_PROFILE.md`.
