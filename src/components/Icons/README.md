# components/Icons/

Shared SVG icon components, barrel-exported.

## Files

- **`Icons.tsx`** — Icon components (Sun, etc.), shared `IconProps` type
  (color/size/style). No issues.
- **`index.ts`** — Barrel export (`export * from './Icons'`). No issues.

## Notes

- No issues. Correctly the single shared home for icons — confirmed no
  other file defines its own local icon set duplicating this.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
