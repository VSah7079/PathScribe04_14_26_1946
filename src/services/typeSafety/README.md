# services/typeSafety/

Batch 504 (PS-470, PS-478): keeping type safety from getting worse while it is improved.

- **`explicitAny.guard.test.ts`** — no new explicit `any` in app code (tests excluded). ESLint's `no-explicit-any` stays off because about 1,700 already exist. Instead, each file may hold at most the count recorded in `explicitAnyBaseline.json`, and a file not listed may hold none. The baseline only ever goes down: after removing `any` from a file, lower its count, or regenerate it with `WRITE_ANY_BASELINE=1 npx vitest run src/services/typeSafety/writeExplicitAnyBaseline.test.ts`. Same pattern as `deploymentReadiness/deploymentBaseline.ts`.
- **`countExplicitAny.ts`** — counts `any` type keywords with the TypeScript parser (comments and strings don't count).
- **Starting point (Batch 504):** 1,710 explicit `any` across 271 app files.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 511 (PS-478): full strict type-checking

- **New `strictTsconfig.guard.test.ts`:** fails if `tsconfig.json` loses `"strict": true`, switches a strict flag back off, or excludes a file from type-checking.
- **Explicit `any` baseline lowered from 1,710 to 1,685.** The seed-template change in Batch 505 removed 24 from `templateService.ts`, and this batch typed `BlockStainEditorModal`'s decant rows.

## Batches 532–533

`explicitAnyBaseline.json`: `cytology/signOutCytologyCase.ts` 50 → 49 and `cytology/cytologyCaseActions.ts` 54 → 52 (explicit `any` removed while the files were changed).
