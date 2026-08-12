# components/Config/Integrations/

**New folder**, per direct request: consolidates the real interoperability-related config that was scattered in `Config/System/`'s flat "Independent" sidebar group into its own major configuration tab (`ConfigurationPage.tsx`'s `TAB_LABELS`), alongside `Config/System`, `Config/AI`, `Config/Staff`, etc.

**Pattern:** Same sidebar + section-router structure as `Config/System/index.tsx` — deliberately not reinvented, just scoped smaller (no group headers needed yet at only four sections).

## Files

- **`index.tsx`** — Tab shell + section registry (`lis`, `crosswalk`, `identifiers`, `terminology`).
- **`LISSection.tsx`** — Relocated from `Config/System/`, unchanged. LIS integration config (enabled, endpoint, whether LIS owns case statuses, whether pathologists can initiate Addendum/Amendment directly).
- **`IdentifierFormatsSection.tsx`** — Relocated from `Config/System/`, unchanged. Read-only system-defined identifier formats per jurisdiction; admin can enable/disable + test against a real value.
- **`TerminologyServicesSection.tsx`** — Not relocated; still physically lives in `Config/Terminology/` (its own established folder) and is imported cross-folder here, same as it previously was into `Config/System/index.tsx`.
- **`CrosswalkSection.tsx`** — **New.** Real admin UI for `services/orderIntake/`'s Specimen Code Crosswalk — closes a real gap flagged directly: `listCrosswalkEntries`/`addCrosswalkEntry` were real, already-implemented service methods with zero UI anywhere. Shows both admin-entered mappings and the real, system-learned "pending" entries `resolveOrder()` already creates on an unrecognized inbound order code (distinguished by `createdBy`), and lets an admin add a known mapping ahead of time so a client's code never has to self-learn at all.

## Notes

- `RvuCodeMapSection.tsx` deliberately stayed in `Config/System/` — it's billing/coding rules, not external-system connectivity, a real, different concern from everything else in this folder.
- This tab is the intended home for future Patient/Encounter subsystem admin surfaces (merge/link review, identifier crosswalk management) as that work (Phase 0 onward) lands — see the phased plan doc from that scoping conversation.

---
*See [components/Config/README.md](../README.md) if one exists for how this folder fits the whole Config/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
