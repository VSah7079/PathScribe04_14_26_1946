# components/ClientDictionary/

User-facing screen title is **Facility Configuration** (renamed from
"Client Dictionary" this session — the underlying type is `Facility`,
not `Client`; see `services/facilities/README.md`). Folder and file
names were deliberately **not** renamed to match — only user-visible
text was — so `ClientDictionary/`, `ClientTable.tsx`, and
`ClientEditorModal.tsx` are what you'll still find on disk. Don't be
thrown by that mismatch; it's intentional scope discipline, not an
oversight (see the "Facility rename" section below for why).

## Files

- **`ClientTable.tsx`** — Facility list, inline search + status filter
  + **role filter** (replaces the old internal/external type filter —
  see "Facility rename" below). Each row shows every role a facility
  holds as separate badges (a facility can hold several at once), not
  a single type label.

- **`ClientEditorModal.tsx`** — Full facility editor. Six tabs now,
  each gated by which roles are checked on the facility (not a fixed
  internal/external branch):
  - **General** — always shown. Core identity + the role checkboxes
    themselves (`performing_lab`, `internal_submitting_location`,
    `internal_ordering_client`, `external_ordering_client`,
    `hl7_routing_endpoint`).
  - **HL7 Integration** — gated to `hl7_routing_endpoint`.
  - **Reporting** / **TAT & Escalation** — **not** role-gated (a real
    fix this session — see below). Always shown.
  - **AI & Performance** — gated to `performing_lab`.
    `internalAiOrchestratorEnabled` / `internalAiModelId` /
    `idleTimeoutMinutesOverride` live here, directly on `Facility`.
    Resolved via `resolvePerformingLabFacilityId()`
    (`services/facilities/IFacilityService.ts`) — same lab-scoped
    resolution as every other setting on this tab.
  - **Locations** — edit-mode only, **not** role-gated (a real fix
    this session — see below). Lists/adds/verifies/deactivates
    `Location` records (`services/locations/`) for this facility —
    the ward/room/bed dictionary an inbound PV1 (HL7 ADT/ORM) resolves
    against. See `services/locations/README.md`.

## Facility rename (this session)

`Client`/`clientType: 'internal' | 'external'` was replaced entirely
by `Facility`/`roles: FacilityRole[]` — see
`services/facilities/README.md` for the full rationale (short version:
internal performing-lab settings were leaking onto every client
record regardless of type, and a prior fix that split them into a
separate `PerformingLabConfig` service solved that but created a real
workflow problem — "create the internal client, then go to a separate
screen to configure it" — that this unified, role-based model actually
fixes).

Two real, confirmed bugs from that redesign, both fixed in this same
file:

1. **Reporting/TAT were wrongly gated to ordering-client roles.**
   Confirmed against real seed data: a `performing_lab`-only facility
   (Fenwick General Hospital) had real, configured TAT targets that
   were completely hidden behind that gate. TAT is a real concern for
   any facility handling cases, not just ordering clients — both tabs
   are unconditional now.
2. **Locations was wrongly gated to `hl7_routing_endpoint`.** A
   facility can want its locations configured purely for manual
   accessioning (`AccessionPage.tsx`'s own Location dropdown — see
   `pages/AccessionPage/README.md`), independent of whether HL7
   integration exists at all. Gate removed; still edit-mode only.

## Sole consumer

`pages/system/ClientDictionaryPage.tsx` — page title also reads
"Facility Configuration" now, same rename.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
