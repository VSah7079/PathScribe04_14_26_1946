# services/screeningRegistry/

The cervical screening registry engine (Batch 414, PS-359). PathScribe reports signed-out GYN cytology to national and regional screening programmes. Each programme is a **definition**, and each lab supplies a **configuration**. One **engine** decides what to send, and sign-out uses it. A new country means a new definition plus the lab's configuration, not new dispatch code.

| File | What it is |
|---|---|
| `screeningRegistryDefinitions.ts` | The catalog, one entry per programme. |
| `IScreeningRegistryConfigService.ts`, `mockScreeningRegistryConfigService.ts` | A lab's configuration of each registry. |
| `screeningRegistryEngine.ts` | The pure engine: eligibility, holds, readiness, the settings screen's mapping rows, and the payload. |
| `saveScreeningRegistrySettings.ts`, `screeningRegistrySettingsDeps.ts` | Every settings change. Each needs `config:screening-registry:manage` and is audited. |

## The catalog

Each definition in `screeningRegistryDefinitions.ts` gives:
- where the registry applies, and that it takes GYN specimens only;
- the national identifier it keys on, from `IDENTIFIER_FORMAT_LIBRARY`;
- how results are coded: built in, the lab's mapping table, or result text;
- the wire format the interface engine produces;
- whether PathScribe built it from the programme's published specification (`verified`) or the lab configures it from theirs (`configurable`).

| Registry | Where | Identifier | Coding | Spec |
|---|---|---|---|---|
| CSMS | England and Wales | NHS number | built in (action code) | verified |
| NICSP | Northern Ireland | H&C number | mapping table | configurable |
| SCCRS | Scotland | CHI | mapping table | configurable |
| CervicalCheck | Ireland | MRN | text | configurable |
| PALGA | Netherlands | BSN | built in (CISOE-A score) | verified |
| Organised programme (oKFE) | Germany | KVNR | mapping table | configurable |
| CRCDC | France | INS | mapping table | configurable |
| Cyto-Histo Register | Belgium | national register number | mapping table | configurable |
| NCSR | Australia | IHI | built in (LOINC result codes) | verified |
| NCSP Register | New Zealand | NHI | mapping table | configurable |
| KNCSP / KCCR | South Korea | MRN | text | configurable |
| Provincial programme | Canada (one per province, via facility override) | MRN | mapping table | configurable |

The US has no national cervical screening registry.

## A lab's configuration

The configuration in `IScreeningRegistryConfigService.ts` holds:
- the lab's code for each dictionary category and coded field (adequacy, primary, secondary, recommendation);
- `requireMappedCodes`: hold a result until its categories are mapped. This is on by default for mapping-table registries;
- `requirePatientIdentifier`: hold a result unless the MRN is the registry's national identifier. This is off by default, because PathScribe keeps a single patient identifier.

## The engine

`screeningRegistryEngine.ts` works out:
- whether a registry takes the specimen (`decideRegistrySubmission`);
- whether to hold it, and why;
- which categories still need codes (`registryConfigReadiness`);
- the settings screen's mapping rows;
- the payload (`buildScreeningRegistryPayload`). That's the existing structured result with its built-in coders, plus the programme, wire format, patient identifier and mapped codes.

A held result is queued and marked failed with `REGISTRY_NOT_READY` and the reason. It shows in the registry transmission audit and is never sent half-coded.

## Configurable registries

A `configurable` registry is ready in the engine. Confirm its codes, identifier and file format with the programme's current specification before going live; PathScribe hasn't been checked against those programmes' live specifications.

## Batch 417: the national identifier, verified

`resolveRegistryPatientIdentifier(definition, patient)` picks the identifier the registry keys on from `patient.nationalIdentifiers` first (its check digit already run) and falls back to the MRN, format-checked, for records from before Batch 417. `decideRegistrySubmission` takes `patient` and holds with `patientIdentifierMissing` or `patientIdentifierChecksum` (new reasons) as well as `patientIdentifierFormat`. The payload's `patientIdentifier` gains `verification` and `fromNationalIdentifier`. Sign-out passes the case's patient.

## Batch 419: one submission path, for every version

`submitScreeningRegistryResult.ts` (moved out of `cytology/signOutCytologyCase.ts`): consent, eligibility, the payload header, hold or send, and the CSMS reason-for-study flag (first submission only). Used by sign-out (`kind: 'signOut'`) and, new, by `submitCytologyRevisionToRegistry.ts` after a correction (`CORRECTION`) or an addendum (`AMENDMENT`). Before this a registry only ever saw the first sign-out. The payload carries `submission`. `ScreeningRegistryConfig.environment` (`test` by default) is set on the Configuration screen and saved through `saveScreeningRegistrySettings` (audited).

## Batch 421

`submitScreeningRegistryResult.ts` splits into `prepareScreeningRegistrySubmission` (registry, consent, decision, payload body, content fingerprint; nothing queued) and the commit. Queue entries store `contentHash`. `registryHoldMessage` names the identifier ("NHS Number"), not its id ("mrn_nhs"), since the text shows on the worklist.

## Batch 422

`resolveRegistryPatientIdentifier` takes any definition with a `patientIdentifierFormatId`, so the cancer registry payload uses it too.

## Batch 423: go-live gate

- `submitScreeningRegistryResult` asks `deps.liveHold` before dispatching. A live register without a current go-live approval holds the result (`REGISTRY_LIVE_NOT_APPROVED`), and the header carries the template version.
- `saveScreeningRegistryConfig` no longer changes the environment; it keeps the stored one. Going live is approved through `services/registryGoLive/`.

## Batch 424

- **Send gate.** `submitScreeningRegistryResult` asks `deps.sendGate` (`registryGoLive/registrySendGate.ts`) before building the header:
  - a validation instance never sends a real case: outcome `notSent`, not queued, audited;
  - production holds the result until go-live is approved;
  - the header's environment is the instance's.
- **Baseline stamps on save.** `saveScreeningRegistryConfig` stamps each code mapping, and the identifier hold, with the template version it was made against (`baselineVersion`, `identifierHoldBaselineVersion`). An unchanged mapping keeps its stamp. A release that changes those codes then flags them for review.
- **Environment no longer read.** `ScreeningRegistryConfig.environment` is kept only so stored configurations still load.

---
*Update this README when a registry is added or a definition's facts change.*
