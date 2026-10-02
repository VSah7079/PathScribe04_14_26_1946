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

---
*When this folder's contents change meaningfully, update THIS file.*
