# services/organisation/

Organization/Site/Lab hierarchy — the real Enterprise-and-participating-hospitals structure (e.g. NHS Trust + member hospitals).

**Pattern:** Deliberately a different, equally-valid pattern: plain exported functions with inline '// REAL: fetch(...)' comments documenting the eventual backend swap, rather than a class implementing an interface. Makes sense given it's read-mostly (no add/update/delete — records are provisioned directly, not edited through the app).

## Notes

- **Correction to a prior note here** ("genuinely supports the multi-tenant org structure"): that wasn't fully true until this session. `Organisation` had NO link to Enterprise at all — `EnterpriseConfig`/`HospitalConfig` (`types/config/`) and `Organisation`/`Site`/`Lab` here were two genuinely disconnected systems, discovered while tracing why a QA admin-alert feature couldn't resolve "which enterprise does this case belong to." Fixed: `Organisation.enterpriseId` is now a real field, set on all four mock organisations.
- **A second, real discrepancy found and fixed alongside it**: `AccessionPage.tsx` was hardcoding every new case's `originEnterpriseId` to the literal `'ENT-ACME'` — which didn't even match `EnterpriseConfig`'s own default id (`'ENT-DEFAULT'`, in `contexts/SystemConfigContext.tsx`). Two separate, disagreeing hardcoded guesses for what was supposed to be the one demo enterprise. `AccessionPage.tsx` now resolves `originEnterpriseId` from the real `Organisation.enterpriseId` the same way it already resolved `originHospitalId`, and the ~30 existing seed-data cases in `services/cases/mockCaseService.ts`/`mockOrchestratorCaseService.ts` were updated to `'ENT-DEFAULT'` too, so old and new cases are consistent rather than old cases carrying a stale, orphaned id.
- **Still not a real multi-tenant model** — there's still only one enterprise (`ENT-DEFAULT`) in the demo data; this fix makes the *link* real, not the plurality. Real FHIR-`Organization.partOf`-style research on how to properly model this for actual multiple enterprises (relevant once real NHS Trust customers are onboarded) is documented in `backend-requirements-concurrency-security.md` §9/§10 — not yet acted on.
- Confirmed this folder is the real backing for Enterprise/Hospital feature flags (see services/types/config/EnterpriseConfig.ts, HospitalConfig.ts) — genuinely supports the multi-tenant org structure now, not at risk despite an unrelated dead FeatureFlags.ts helper being removed elsewhere.
- Contains real pilot customer data in its mock seed (DVMC, MFT, MPA, HFHS) — be mindful of this if sharing this file externally.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*