# src/services/governingBodies/

`IGoverningBodyService.ts` + `mockGoverningBodyService.ts` (+ test) —
real persistence for the Governing Bodies list (CAP, RCPath, ICCR,
RCPA, and any custom bodies a super-admin adds).

## Already fixed in a past session — verified, not just read

The interface file's own header documents a real bug found and fixed
before this review: `GoverningBodiesSection.tsx`'s `handleSave` used to
be a bare `/* TODO: persist */` comment — every toggle, edit, add, and
remove only ever touched React state, never saved anywhere. A refresh
silently discarded every change, while the UI's "unsaved changes"
indicator cleared as if the save had genuinely succeeded.

Didn't just trust the header comment — ran the test suite directly (4
tests: seed data loads, a save is genuinely visible on the next
`getAll()` — the actual bug this closes — adding a custom body
persists, removing a body persists). All 4 pass. Also confirmed
`GoverningBodiesSection.tsx` is genuinely wired to this real service
(not just the interface existing in isolation) — `getAll()` on mount,
`saveAll()` on save.

Clean otherwise. `firestore.rules` already has a real
`/governingBodies/{docId}` collection defined (platform-level,
ForMedrix-staff-only write access) — the backend schema anticipated
this data existing; the frontend fix (this folder) is what actually
makes use of it once a real Firestore-backed implementation replaces
the mock. *(Since superseded: production storage is SQL Server behind the ASP.NET Core API server (Pete, Sep 2026), so `firestore.rules` will be replaced rather than extended — checked in the Batch 496 README audit.)*

## Batch 371

`governingBodyAdministration.ts`: `saveGoverningBodies` needs `platform:governing-bodies:manage` (Superadmin only). This setting is platform-wide, not a hospital's. `@/services` exports `governingBodyService`.

## Batch 617 (part B): server version (PS-514)

The governing bodies service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/CONFIG_DICTIONARIES_API.md`.

## Batch 652

`retentionPlaceholder.ts` (+ test): a retention version whose source note says "unverified" (seeded CAP and CAP-ACP wet tissue, RCPA, Korea MSA) gets an UNVERIFIED PLACEHOLDER badge in the Governing Bodies retention window. Confirming the figures is a compliance task (`docs/product/KNOWN_GAPS.md`).
