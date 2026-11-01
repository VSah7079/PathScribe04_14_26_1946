**Batch 734:** `DirectPrintingSetting.tsx` on the Printing tab (performing labs): the facility's **Allow direct printing from the browser** switch (`config:direct-device-printing:manage`, saved at once, audited by the service).

# components/FacilityDictionary/

User-facing screen title is **Facility Configuration** (renamed from
"Client Dictionary" — the underlying type is `Facility`, not `Client`;
see `services/facilities/README.md`). This folder is itself the
result of that rename being carried all the way through — folder and
file names were updated to match (`FacilityDictionary/`,
`FacilityTable.tsx`, `FacilityEditorModal.tsx`), superseding an earlier
`components/ClientDictionary/` fork that kept the old `Client*` names.
That original fork was found to still exist, fully orphaned (zero real
imports anywhere), and was deleted in the i18n sweep's batch 178 —
see `pages/system/README.md` for that removal's own account. If you
see a reference to `Client*` file names anywhere else in the docs
tree, it predates that cleanup.

## Files

- **`FacilityTable.tsx`** — Facility list, inline search + status filter
  + **role filter** (replaces the old internal/external type filter —
  see "Facility rename" below). Each row shows every role a facility
  holds as separate badges (a facility can hold several at once), not
  a single type label.

- **`IdentifierFormatsTab.tsx`** (**NEW**) — relocated from
  `Config/Integrations/IdentifierFormatsSection.tsx` (now deleted),
  same real move LIS Integration made — out of a standalone,
  globally-scoped System screen and into the Facility editor. Real,
  full feature set preserved: per-format enable toggles, a live test
  tool, a simulate-scan tool (tests the real, live, app-wide union of
  every Enterprise's own enabled formats — a genuine, deliberate
  mismatch with the single facility/Enterprise being edited, called
  out directly in its own comment), LIS-preset filtering, and a
  jurisdiction/locale info card (now resolved from the facility being
  edited, not a global default). Kept as its own file rather than
  inlined into `FacilityEditorModal.tsx` — a real, substantial screen,
  and that file is already large. See
  `services/facilities/README.md`'s own `Facility.identifierFormats`
  doc comment for the full architectural account.

- **`FacilityEditorModal.tsx`** — Full facility editor. Eight tabs now (the
  eighth, **Spelling**, is described under Batch 432 below; corrected from
  "Seven" in the Batch 496 README audit),
  most gated by which roles are checked on the facility (not a fixed
  internal/external branch):
  - **General** — always shown. Core identity + the role checkboxes
    themselves (`performing_lab`, `internal_submitting_location`,
    `internal_ordering_client`, `external_ordering_client`,
    `specimen_acquisition`), each with a real,
    per-role hover tooltip (native `title` attribute, matching this
    app's own established pattern — no custom tooltip component
    exists) sourced from `FACILITY_ROLE_TOOLTIPS`
    (`services/facilities/IFacilityService.ts`), plus a real, separate
    Enterprise checkbox (`isEnterprise` — not a role; see
    `services/facilities/README.md` for why) that filters which
    facilities can be chosen as a Parent Institution below it. Two
    real, role-gated fields also live here now: CLIA/ISO Accreditation
    Number (gated to `performing_lab`, free text) and Place of Service
    Code (gated to `specimen_acquisition`) — a real picker against
    `services/billing/mockPlaceOfServiceCodeService.ts`'s own 52 real,
    currently-active CMS codes, not a placeholder text field.
  - **LIS Integration** (**real, per direct architectural correction —
    replaces the old HL7 Integration tab and the `hl7_routing_endpoint`
    role, both retired**) — never role-gated; real for any facility, not
    just ones holding a specific role. Two real sections: Interface
    Engine Connection (only editable when `isEnterprise` — shows a
    real inheritance note naming the actual Parent Institution
    otherwise) and LIS Routing (editable for any facility; a
    non-Enterprise facility gets an explicit "Override Enterprise
    routing" toggle, off by default, with a real inheritance message
    naming the parent when off). See `services/facilities/README.md`'s
    own `Facility.interfaceEngineConnection` doc comment for the full
    architectural account.
  - **Identifier Formats** (**NEW**, `IdentifierFormatsTab.tsx` above)
    — never role-gated, same real pattern as LIS Integration.
  - **Reporting** / **TAT & Escalation** — **not** role-gated (a real
    fix — see below). Always shown.
  - **AI & Performance** — gated to `performing_lab`.
    `internalAiOrchestratorEnabled` / `internalAiModelId` /
    `idleTimeoutMinutesOverride` live here, directly on `Facility`.
    Resolved via `resolvePerformingLabFacilityId()`
    (`services/facilities/IFacilityService.ts`) — same lab-scoped
    resolution as every other setting on this tab.
  - **Locations** — edit-mode only, **not** role-gated (a real fix —
    see below). Lists/adds/verifies/deactivates
    `Location` records (`services/locations/`) for this facility —
    the ward/room/bed dictionary an inbound PV1 (HL7 ADT/ORM) resolves
    against. See `services/locations/README.md`.

## Facility rename

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

## Real, found-and-fixed accessibility bug, per direct report ("occasional text that is dark and pretty much impossible to read")

The footer's own Save/Add button — background switches between `#10b981` (saved, bright green) and `#0891b2` (this app's own teal accent, `--ps-teal`) — used `color: "#0f172a"` (dark). Bright green with dark text is genuinely readable, but the teal state (a moderate-brightness accent, not a truly bright one) made the dark text noticeably hard to read — the same pattern already found and fixed in `pathscribe.css` itself for `.ps-login-submit` (see `src/README.md`'s own account). Fixed to white, readable against both real background states this button ever has.

## Real fix (PS-73, Sep 2026) — Duplicate + assigningAuthority uniqueness

The one dictionary this ticket's own original target matrix named
("Client Dictionary" — this folder's real predecessor, see the rename
note above) and that had genuinely never been wired, closed:

- **`FacilityTable.tsx`** — new Duplicate action button per row
  (`common.duplicate`), alongside the existing Edit.
- **`FacilityDictionaryPage.tsx`** — new `handleDuplicateFacility()`.
  Not a plain `prepareDuplicate()` "(Copy)"-and-done clone (see
  `utils/README.md`'s own account of why `preparePersonDuplicate()`
  doesn't fit here either): `assigningAuthority` — the field a real,
  live lookup in `mockOrderIntakeService.ts` keys Facility resolution
  on — is cleared, not copied, same reasoning as a cloned physician's
  own `npi`/`physicianCode`; contact-person fields
  (`contactGivenNames`/`contactFamilyNames`/`email`/`phone`/`fax`/
  `address`/`notes`) are cleared too, since they belong to a specific
  person/location, not the reusable org config actually being cloned
  (roles, jurisdiction, reporting, TAT, escalation, AI settings, LIS
  routing, identifier formats — all genuinely carry over). Also added
  an explicit `editorMode: 'add' | 'edit'` page state, replacing the
  old `!!editingFacility` inference — real bug class this avoids:
  Duplicate populates `editingFacility` with a prefilled template for
  an *add*, which `!!editingFacility` could never tell apart from a
  real edit; `handleSave` now branches on `editorMode`, never on
  `editingFacility`'s mere presence.
- **`FacilityEditorModal.tsx`** — gained the matching `mode: 'add' |
  'edit'` prop, replacing `isEdit = !!facility` with
  `isEdit = mode === 'edit'` — the same fix on the modal's own side.
  This wasn't cosmetic: `eligibleModels` (AI tab) and `locations`
  (Locations tab) were both gated on `facility?.id` alone, which a
  Duplicate template's placeholder id would have satisfied, firing
  real lookups against a bogus id and showing the Locations tab for
  an unsaved record. Both effects, plus the Locations tab itself and
  `handleAddLocation`, are now additionally gated on `isEdit`. Also
  gained real `assigningAuthority` uniqueness validation via
  `utils/validateUnique.ts`'s `findDuplicate()` (case-insensitive,
  `excludeId` only in real edit mode) — the exact real-lookup risk
  `CrosswalkSection.tsx`'s own compound check already protects
  against, just single-key here.
- Real regression tests added: `FacilityEditorModal.test.tsx` (mode
  vs. facility-presence for the id-gated effects; the uniqueness
  check itself, both directions) and a new
  `pages/system/FacilityDictionaryPage.test.tsx` (the actual
  regression this fix is about — Duplicate-then-Save calls
  `facilityService.add()`, never `.update()`, and never touches the
  source record).

## Sole consumer

`pages/system/FacilityDictionaryPage.tsx` — page title also reads
"Facility Configuration", same rename.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`IdentifierFormatsTab.tsx`: the scan-test result banner is tagged. The kind badge's colours come from `--ps-hue` and a CSS rule; they were three inline style properties built in JSX.

## Batch 367 (PS-74): no inline CSS

`FacilityEditorModal.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`FacilityEditorModal.tsx` takes `placeOfServiceCodeService` from `@/services`, and is off the deployment baseline.

## Batch 391

`FacilityEditorModal`: a performing lab gets a **Report language** choice (the app's languages, or "Default for the jurisdiction (…)" naming what that is), with a hint that it sets the report PDF's labels, headers and dates and is kept with each report at sign-out.

## Batch 427

The LIS Integration tab of a performing-lab facility adds "Send one combined PDF per case (this lab's LIS takes one PDF per accession)" (`consolidateOutboundPdfs`). Saving a facility still checks no capability (disclosed; Configuration-wide scan to follow). *(Since closed in Batch 428: `mockFacilityService` add, update, deactivate, reactivate and verify need `config:facilities:manage` via `guardConfigWrites` — checked in the Batch 496 README audit.)*

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

## Batch 432

Facility editor: a Spelling tab for performing labs (edit mode) lists the lab's spelling dictionary, with add and remove (`config:facilities:manage`, audited).

## Batch 433

General tab: **Charges need billing approval**, shown for a performing lab or an enterprise. An enterprise picks On or Off; a lab picks Same as the enterprise, On or Off (`services/billing/chargeApproval.ts` choice helpers). Tests in `FacilityEditorModal.test.tsx`.

## Batch 437

Filter boxes are marked `data-dirty-ignore` (PS-128).

## Batch 499 — rules of hooks

`FacilityEditorModal` returned `null` when closed part-way through its hooks (ten more `useState`/`useEffect` calls followed), so opening the modal changed the number of hooks between renders — React's rules of hooks, and a "Rendered more hooks than during the previous render" crash waiting to happen. The exported `FacilityEditorModal` is now a wrapper that mounts `FacilityEditorModalBody` only while open; closing unmounts it, so reopening starts clean (the reset effect still runs when `facility` changes while open). ESLint's 10 `rules-of-hooks` errors in this file are gone.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 511 (PS-478): full strict type-checking

`FacilityEditorModal` types its interface-engine and LIS-routing setters with `NonNullable<…>` keys. No visible change.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. `FacilityEditorModal`: the contact-title options (Mr., Mrs., Ms., Mx., Dr.) show translated labels; the stored value is unchanged. Placeholders starting "e.g." are translated, with the technical example kept as is.

## Batch 517 — Printing and Secure messaging tabs (PS-337, PS-143)

**Printing tab** (`FacilityPrintingTab.tsx`, + test). Shown in edit mode. Before this, a facility's report printing could only be set in seed data.
- **Report printing** (performing labs only):
  - print released reports, or not;
  - the delivery mode (QZ Tray to a named printer, the interface engine or a print server, or a network printer directly);
  - paper size;
  - for a network printer, the default printer used when no print routing rule matches.
- **Paper handling** (any facility, as the ordering client): the paper tray and one- or two-sided printing. "Report default" keeps the report type's own choice.
- **Saving.** The tab saves on its own button through `facilityService.setPrintSettings`, which checks `config:print-settings:manage`. It reads the stored settings when it opens.
- **Main Save.** The facility's main Save (`add` and `update`) never changes printing. A stale form can't overwrite it, and `config:facilities:manage` alone can't change it.

**Secure messaging tab** (`FacilitySecureMessagingTab.tsx`, + test). Shown for enterprise facilities (performing-lab tenants) in edit mode.
- The lab chooses its gateways, with its own country's listed first.
- For each gateway it sets: the sending address or network ID, whether staff may use it, and the default.
- It records each gateway's BAA or data processing agreement: reference, signed date and optional expiry.
- Saving needs `config:secure-messaging:manage`. See `services/secureMessaging/README.md`.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 528: required fields come from Field Requirements (PS-359)

`FacilityEditorModal.tsx`'s stars and save check come from the organisation's Field Requirements (page Facility editor), through `services/facilities/facilityFormChecks.ts`. Name and assigning authority are always required, and the assigning authority stays unique. Email is required by default. Phone, address and the contact's family names show their error under the field when required and blank. The footer lists every missing field ("Still required: …"), including ones on other tabs (the interface fields).

## Batch 530 (Pete)

`FacilityEditorModal.tsx`: **Fax**, **City**, **State / province / region** and **Postal code** on the General tab (stored as `fax`, `city`, `state`, `zip`, which a facility already had). Each can be made required in Field Requirements.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `FacilityEditorModal.tsx`: a letterhead logo that isn't an https link shows "must be an https link" under the field, and the facility isn't saved until it's fixed.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- `FacilityPrintingTab.tsx` (Batch 553): the default network printer can be one of the facility's own site agent printers, picked from its list.

- Batch 608: `FacilityEditorModal.tsx` has a national screening registry ID (`Facility.nationalRegistryId`), shown in the EU compliance matrix.

## Batch 715 — letters or numbers for labels

`FacilityLabelStyleField.tsx` (+ `.css`) replaces the single "Specimen / Block Labeling" choice in `FacilityEditorModal.tsx` with three selectors (Specimens, Blocks, Slides: Letters or Numbers), a Preset menu holding the two old pairs, and a live example ("Specimen A · Block 1 · Slide L1"). On the Enterprise it sets the default; on a lab each level can be "Same as enterprise (value)". A warning shows when specimens and blocks both use letters or both use numbers. A new facility starts with no choice of its own (it follows its enterprise); a facility with the old preset opens with it as its own choice, so its labels do not change. The editor stores `labelStyle` and clears `specimenLabelStyle`. The change is audited in `pages/system/FacilityDictionaryPage.tsx`. `FacilityEditorModal.tsx` shrank (1,478 to 1,476 lines). Rules: `services/labeling/README.md`.
