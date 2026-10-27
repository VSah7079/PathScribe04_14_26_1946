# services/usEpath

Batch 620 (part E, PS-800). US electronic pathology (ePath) reporting to state cancer registries, in Pete's three layers: the NPCR ePath base message (`../hl7/epathBuilder.ts`, HL7 v2.5.1 ORU^R01), a **state profile** per state (data), and a **transport adapter** contract. Contract for the API server: `docs/architecture/US_EPATH_API.md`.

| File | What it does |
|---|---|
| `epathProfile.ts` | profile and assignment types, validation, the labelled example profile |
| `epathRouting.ts` | which profile: the performing facility's state (never the patient's); technical-component facility rule from the profile |
| `epathCheck.ts` | checks a built message against its profile; fixed codes only |
| `epathTransport.ts` | `IEpathTransportAdapter` and mocks (the interface engine owns the real transport) |
| `prepareEpathSubmission.ts` | case -> `ready` (message, profile, transport) or `review` (codes) |
| `epathReviewCodes.ts` | review code -> locale key |
| `IUsEpathService.ts`, `mockUsEpathService.ts`, `httpUsEpathService.ts`, `usEpathServiceInstance.ts` | stored profiles and per-facility choices; every change needs `config:us-epath:manage` |

Only an example profile ships; real profiles come from each state's published specification. The OBX identifiers are defaults to confirm against the NPCR guide. Nothing was tried against a real server or registry.

Time zone note (Batch 620 merge): the ePath submission reads the time zone from the system configuration service (`timezone`). The screens' own `facilityTimezone` setting is held in the browser configuration and is not visible to services, so changing it on the Contribution settings screen does not change this one. To be unified when the two settings are merged.
