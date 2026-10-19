# scopeReference (Batch 612)

A reference list saying, for each setting area, whether it is set once for the whole enterprise, per performing-lab facility, enterprise with a facility override, or in tiers. Shown at Configuration > System > Scope reference (`components/Config/System/ScopeReferenceSection.tsx`).

- `scopeReference.ts`: `SCOPE_REFERENCE` (9 areas), `SETTING_SCOPES`, `entriesByScope`. Each entry names the source file that was read to confirm it.
- Only areas confirmed from the code are listed; the screen says the others are not yet confirmed rather than guessing.
- `scopeReference.test.ts` checks that every source file exists, every section id is a real System section, and the English text exists.
