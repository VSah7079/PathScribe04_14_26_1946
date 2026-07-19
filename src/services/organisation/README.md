# services/organisation/

Organization/Site/Lab hierarchy — the real Enterprise-and-participating-hospitals structure (e.g. NHS Trust + member hospitals).

**Pattern:** Deliberately a different, equally-valid pattern: plain exported functions with inline '// REAL: fetch(...)' comments documenting the eventual backend swap, rather than a class implementing an interface. Makes sense given it's read-mostly (no add/update/delete — records are provisioned directly, not edited through the app).

## Notes

- Confirmed this folder is the real backing for Enterprise/Hospital feature flags (see services/types/config/EnterpriseConfig.ts, HospitalConfig.ts) — genuinely supports the multi-tenant org structure, not at risk despite an unrelated dead FeatureFlags.ts helper being removed elsewhere.
- Contains real pilot customer data in its mock seed (DVMC, MFT, MPA, HFHS) — be mindful of this if sharing this file externally.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*