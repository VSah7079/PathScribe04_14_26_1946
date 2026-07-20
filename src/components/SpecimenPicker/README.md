# components/SpecimenPicker/

**Renamed this pass** (was `components/AccessionPage/` — confusing
because it's a completely different folder from `pages/AccessionPage/`,
the actual accession page, despite the identical name; this component is
just one picker used on that page, not the page itself).

## Files

- **`SpecimenDictionaryPicker.tsx`** — Searchable lookup modal for picking
  a Specimen Dictionary entry, replacing a plain `<select>` once the
  dictionary scales past a handful of entries. Sole consumer:
  `pages/AccessionPage/AccessionPage.tsx`. No issues.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
