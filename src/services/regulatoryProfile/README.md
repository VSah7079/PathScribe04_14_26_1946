# regulatoryProfile (Batch 679)

`VITE_REGULATORY_PROFILE` = `documentation` (default) or `clinical_support`.

- `regulatoryProfile.ts`: `parseRegulatoryProfile`, `regulatoryProfile()`, `capabilitiesFor(profile)`, `showsConfidence()`.
- `documentation`: no numeric confidence on clinical screens; a mismatch flag is a plain, low-risk flag that never holds sign-out.
- `clinical_support`: the earlier behaviour (percentages, thresholds, Block rules). Kept and tested; reserved until regulatory review.
- Numbers stay in audit/QA records and quality dashboards.

Details and open items: `docs/product/REGULATORY_PROFILE.md`.

Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): showsConfidence()/showConfidenceScores no longer drive any screen; confidence figures are not rendered in either profile. Only the admin Clinical Mismatch Rules page still reads it.
