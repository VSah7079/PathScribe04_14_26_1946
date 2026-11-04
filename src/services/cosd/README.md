# services/cosd

Batch 620 (part C, PS-800). The UK cancer registry feed, COSD: the destination settings, PathScribe's own checks on a submission, a labelled preview, and the correction loop on the Outbound Queue. PathScribe owns what is sent, when, the status and the audit; the interface engine makes the real COSD file, holds the endpoint and credentials, sends it and returns the acknowledgement. Contract: `docs/architecture/UK_COSD_API.md`.

**What is and is not modelled.** The preview's element names are PathScribe's own simplified model, not the official COSD schema, and nothing here claims conformance. The checks are only the ones that can be made without the published NHS England / NCRAS specification. `COSD_RULES_NEEDING_SPEC` lists what the lab's sign-off lead must still confirm against it.

| File | What it does |
|---|---|
| `cosdModel.ts` | Types, the finding codes, the model status (`simplified`), the list of rules still needing the specification, the default of 5 working days. |
| `buildCosdXml.ts` | The preview, built from the registry payload `cancerRegistry/` already makes (values only; nothing invented). Pure. |
| `validateCosd.ts` | The offline checks: NHS number length and check digit, dates, ICD-O-3 and ICD-10 shape, the mandatory items, and that the preview is well formed XML. Fixed codes, never text. Pure. |
| `workingDays.ts` | Adding working days (Monday to Friday, minus the lab's non-working dates; UTC; time of day kept). Pure. |
| `cosdDestination.ts` | The destination (transport label, correction working days, non-working dates), validation, and enterprise / facility / default resolution. Pure. |
| `ICosdDestinationService.ts`, `mockCosdDestinationService.ts`, `httpCosdDestinationService.ts`, `cosdDestinationServiceInstance.ts` | The stored destinations. Changes need `config:cosd-destination:manage` and are audited. Mock in the demo; server version when an API address is set. |
| `cosdFeed.ts` | `withCosdCorrection`: wraps the registry feed so a rejected `cosd_uk` submission gets its working-day correction due date and the destination's transport; `correctionStatus` reads the window through the delivery schedule's `deadlineStatus`. Other registries are untouched; retry and amended re-queue links pass through. |
| `cosdSample.ts` | A sample payload typed into the check panel. |

Reused, not repeated: `services/cancerRegistry/` (the `cosd_uk` definition, payload, mandatory data, go-live gate), `services/deliverySchedules/` (per-registry schedule and reporting deadline), `services/outboundQueue/` (rejected state, retry with a reason, amended links).

Not built: the real COSD file and transport (interface engine), the server, any check that needs the published specification.
