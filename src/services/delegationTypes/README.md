# services/delegationTypes/

Case delegation type dictionary (Peer Review, Second Opinion, Subspecialty Referral, MDT Discussion).

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- **Real bug found and fixed**: `add()`'s own `id` used to be silently
  discarded and replaced with `'CUSTOM_' + Date.now()`, regardless of
  the real, validated, label-derived id the admin saw and could edit
  on screen in `DelegationTypeSection.tsx`'s own form — the on-screen
  "ID already exists" check was validating a value that then never
  actually got saved. Fixed in both `mockDelegationTypeService.ts`
  (confirmed live) and `firestoreDelegationTypeService.ts` (fixed for
  consistency — not live-tested, no real backend active yet; that
  file's own header already flags it as a stub pending cutover). The
  Firestore fix specifically needed `setDoc(doc(db, COL, id))` rather
  than just changing what `add()` returns — using `addDoc`'s own
  auto-generated key while returning a different id back to the
  caller would have created a real, silent mismatch where a later
  `getById()` for that same id couldn't find the document. `id` is
  now a real, optional override on `add()` — used when the caller
  provides one, auto-derived as a fallback when not.
- `performingLabFacilityId?: string` — real, per direct request:
  "Include Performing Lab." Same field-name convention and same
  null/undefined = inherit/global shape as
  `ContainerType.performingLabFacilityId` (see
  `services/containerTypes/README.md` and PS-75 for the full,
  standard account of this pattern). `label` and `id` uniqueness
  (`DelegationTypeSection.tsx`, via `utils/validateUnique.ts`) are
  both scoped by this field as a compound key — checked only within
  the same lab's own scope, per direct confirmation, matching
  `ContainerTypesSection.tsx`'s own established convention exactly.

## Batch 428: Configuration permissions

- `mockDelegationTypeService`: `add`, `update`, `deactivate`, `reactivate`, `remove` need `config:delegation-types:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 491 — `'TUMOR_BOARD'` seed deactivated (PS-359 follow-up)

`mockDelegationTypeService.ts`'s `'TUMOR_BOARD'` seed entry is now `active: false` (`DelegateModal.tsx` already calls `getActive()`, so it drops out of that modal's list with no further change needed there). Deactivated, not deleted — `isSystem: true` blocks deletion here anyway, and historical `DelegationRequest` records may still reference this id. The real path for a tumor board submission is `services/tumorBoard/` (`FlagForMdtModal.tsx` → `mockTumorBoardService.ts`), which models a board queue instead of forcing this type's generic person/pool recipient — the exact mismatch `services/tumorBoard/README.md` disclosed since that module's first batch.

Also corrected this file's own seed-data comment: it claimed the seed "mirrors `DEFAULT_DELEGATION_TYPES` from `constants/delegationTypes.ts`" — no such file or constant exists in this repo (verify-don't-trust). This array is the mock's own, sole copy of the seed data.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part A): server versions (PS-514)

`delegationTypeService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
