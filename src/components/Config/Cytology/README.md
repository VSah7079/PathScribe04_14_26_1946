# components/Config/Cytology

Configuration → Cytology: nomenclature, categories, routing, registry reporting, compliance features and the rest of the cytology settings sections (`index.tsx` lists them).

## Batch 414

`CytologyRegistrySettingsSection.tsx` rebuilt on the screening registry engine: the enterprise and facility registry, each registry's code mappings, and what is held rather than sent. Saved through `services/screeningRegistry/saveScreeningRegistrySettings.ts` (`config:screening-registry:manage`).

## Batch 415

`CytologyComplianceFeaturesSection.tsx`: the US-only CLIA workload cap and CAP 5-year lookback as features (auto / on / off, enterprise and facility).

## Batch 419

`CytologyRegistrySettingsSection.tsx`: "Send results to" (the programme's test system, the default, or its live register), carried on every payload; and the hold-for-identifier wording now says "a verified <identifier>" (it checks the national identifier since Batch 417).

## Batch 423

The screening registry's test/live selector is replaced by the go-live panel (`components/Config/RegistryGoLive/`). Saving the registry configuration no longer changes where results go.

## Batch 424

The go-live panel is now the registry connection panel: instance, state, agreement, test suite or go-live, and local changes. The screen passes the registry and refreshes its configuration afterwards.

## Batch 429: view-only sections, equipment log for the bench

Every section is wrapped in `ConfigSectionGate` (`index.tsx`).

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

## Batch 431

The section list moved to `cytologySections.ts` (shared with the Configuration search).

## Batch 437

Every settings section reports unsaved changes (an enterprise value not yet saved, or an override being added), and the section list asks before leaving them (PS-128).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`CytologyHistologyCorrelationSection.tsx` (PS-156): the Correlation window section. It sets an enterprise default, rules per jurisdiction and facility overrides. Its decisions are in `services/cytology/correlationSettingsEditing.ts`, and it reaches its services through `@/services`.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`CytologyHistologyCorrelationSection.tsx` now exports `CorrelationWindowSettings({ settingsService, overrideService, titleKey, subtitleKey })`, the same screen with its services and headings passed in. The surgical window in `Config/System/` uses it.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 533

`CytologyComplianceFeaturesSection.tsx`: now "Country and laboratory rules", with a third setting, the signature for an urgent cytology preliminary report (Automatic: required everywhere; Off lets it go without a signature). The Automatic wording per setting comes from `cytologyComplianceSettingKey`.

## Batch 574

- `CytologyWorkloadCapSettingsSection.tsx`: "Screening day starts at" (hours in the user's locale; applies from now on; a refused or failed save says so; audited via `services/cytology/saveScreeningDayStart.ts`).

## Batch 576

- `CytologyWorkloadCapSettingsSection.tsx`: caps 1–100; an out-of-range or failed save is said.

## Batch 578

- `CytologyWorkloadCapSettingsSection.tsx`: a cap that isn't saved is said beside its own field (only that field marked invalid); the add pickers offer only facilities and staff without an override, and "+ Add Override" is unavailable, with a note, when nobody is left.

## Batch 608

- `ScreeningIntervalsCard.tsx`: the per-country, per-age screening interval table, inside Country and laboratory rules.
