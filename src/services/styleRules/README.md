**Batch 759:** `fileSizeBaseline.ts`: `AccessionPage.tsx` lowered to 4,003 (the Outside Patient Data card moved to `OutsideCaseCard.tsx`) and `types/case/Case.ts` to 1,056 (`AiFieldSuggestion` moved to its own file).

**Batch 742:** `fileSizeBaseline.ts`: `SynopticReportPage.tsx` lowered to 7,058 and `CytologyScreeningPage.tsx` to 1,537.

**Batch 738:** `fileSizeBaseline.ts`: `useSignOutWorkflow.ts` lowered to 1,747.

**Batch 735:** `touchLayout.guard.test.ts` holds the station touch rules (routes wrapped in the touch layout, 44/48 px and 16 px in `touchLayout.css`, header sizes, the shared scan field, windows as dialogs, no drag-only lists, tap-to-pick reasons). Eight unused scan-field classes left `pathscribe.css`; baseline 28550.

**Batch 650 to 652:** `fileSizeBaseline.ts` lowered: `mockActionRegistryService.ts` 4,189, `WorklistTable.tsx` 2,290, `AddCodeModal.tsx` 1,191, `SynopticReportPage.tsx` 7,082, `mockCaseService.ts` 6,048. Nothing was added and no file got longer.

**Batch 649:** `fileSizeBaseline.ts` lowered (Batch 646 baseline to now): `useSignOutWorkflow.ts` 2377 to 1813 (sign-out logic moved to `services/signoutGates/` and `services/surgicalSignOut/`), `QualityAssurancePage.tsx` 1505 to 1477, `SynopticReportPage.tsx` 7177 to 7172, `AccessionPage.tsx` 4207 to 4205, `AddCodeModal.tsx` 1376 to 1374. Nothing was added and no file got longer.

**Batch 645:** `fileSizeBaseline.ts`: `mockActionRegistryService.ts` lowered from 4213 to 4198 lines (the shortcut migrations moved to `shortcutMigrations.ts`). No other baseline changed; none of the touched files over 1,000 lines grew.

## Batch 598 — Held-back CSS classes checked (PS-520)

- **What was checked:** the 517 classes whose names code builds from a prefix or suffix (`ps-foo--${status}`). For each, the variant word (`overdue`, `heavy`, `role-ineligible`, ...) was searched for in all non-test code. Every one is there as a value, a type member or a literal.
- **Result:** nothing removed. All 517 are live. The rule "dead means no exact name in code, and not built from a prefix or suffix" is unchanged.
- **Limit:** this shows each variant can be produced, not that it can be reached at runtime. A status that no screen ever sets still passes. That is found by using the app.

# services/styleRules/

Batch 367 (PS-74): the check behind standing rule 1, **no inline CSS**.

- **`inlineStyleAudit.ts`** reads a `.tsx` file's structure (TypeScript's parser) and reports:
  - a `style={{ … }}` key that isn't a custom property (`--name`), or a spread of an unnamed object;
  - on a DOM element, `style={x}` / `style={f(…)}` unless the name ends in `Vars`/`Var`, the convention for helpers that return only custom properties (it looks through `?:`, `&&`, `??` and `as`);
  - a helper named `…Vars` whose returned object sets a real CSS property;
  - a colour built from a string: `${c}22`, `c + '18'`, `rgba(${…})`.

  A `style` prop on a component that isn't an object literal is left to that component; its own DOM elements are checked.
- **`inlineStyleAudit.test.ts`**: what it finds and what it accepts.
- **`inlineCss.guard.test.ts`**: runs the check over every `.tsx` file in `src/`, with no exception list, and checks it would catch an inline style coming back.

**How to comply:**
- Put the look in a `pathscribe.css` class.
- Pass per-instance values as custom properties.
- For a colour, pass `--ps-hue` and derive tints with `color-mix(in srgb, var(--ps-hue) N%, transparent)`. N is the old hex alpha as a percentage (`18` ≈ 9.4%, `22` ≈ 13.3%, `33` = 20%, `66` = 40%).

## Batch 436 (PS-294)

`duplicateCss.guard.test.ts` fails when `pathscribe.css` has two identical top-level rules (same selector, same declarations). Batch 436 removed 377 such copies, keeping the last copy of each, which is the one the browser used. Every selector's final declarations and the order of the surviving rules were checked to be unchanged. The file went from 33,089 to 32,219 lines. Rules that share a selector but differ are left alone: those are real overrides.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 517 — CSS cleanup (PS-294)

- **Removed the Orchestrator report panel's CSS.** That is the `ps-orch`, `ps-orch2`, `ps-orch3` and `ps-orch4` families: 311 classes, 446 rules, 9 `@keyframes` and 120 comments that described only those rules. Nothing in `src` referenced them; the panel itself is gone.
- **Removed the `[data-ps-dark]` rules.** Nothing sets that attribute.
- **Kept the app-wide print isolation rule.** That is `body > *:not(.ps-orch4-shell):not(.ps-mth-overlay):not(.ps-cyto-histo-print-overlay)`: it still hides everything else when printing, so it stays, with a comment.
- **Removed the exact duplicates the top-level guard can't see.** These were inside `@media print` (`body *`, three copies, now one) and `@keyframes`.
- **Bug fixed.**
  - An older second copy of the print isolation rule lacked the `.ps-cyto-histo-print-overlay` exemption.
  - Because of it, the Cyto-Histologic Correlation print view printed blank.
  - That copy is removed.
- **Deleted five stylesheets that nothing loads** (listed in `DELETED_FILES.txt`).
- **Result.** `pathscribe.css` went from 32,708 to about 30,600 lines.
- **Follow-up.** The remaining unused classes (about 717, plus 472 to check by hand) are tracked in PS-520.

## Batch 597 — Unused CSS, the rest (PS-520)

- **Removed:** all 530 remaining unreferenced classes (608 rules, 633 selectors), 4 `@keyframes` nothing used, and 121 comments that headed only removed rules. `pathscribe.css` went from 30,494 to 28,146 lines.
- **Grouped selectors:** where a selector list had a dead member (`.a, .b`), only the dead member went (`.a` stays). A selector containing a dead class can never match.
- **Audit tool:** now also detects names built from a suffix (`${x}-badge`), exempts classes that libraries add themselves (11), and has `--remove-all`. Notes written on the same line as a live rule stay.
- **Kept on purpose:** 517 classes whose names code builds from a prefix or suffix. They cannot be proven dead by text search; each family needs a check of the values that build the name (listed by `node scripts/css-unused-audit.mjs`).
- **`unusedCss.guard.test.ts`:** the unreferenced count is now 0 and cannot rise.

## Batch 596 — Unused CSS, first slice (PS-520)

- **New tool:** `scripts/css-unused-audit.mjs` lists the classes in `pathscribe.css` that nothing refers to, by family (`--json` for a machine-readable list). A class counts as used when its exact name appears in `src/` (tests excluded), `e2e/` or `index.html`, and a class whose name starts with a prefix some code builds names from (`ps-foo-${x}`) is held back for a check by hand, never listed as dead.
- **`--remove=prefix,prefix`** deletes the dead classes with those prefixes (a selector that contains a dead class can never match), the rules left empty, and the comments that headed only those rules.
- **Removed (146 classes, 167 rules, 572 lines; the diff only removes lines):**
  - `ps-team-` (45): the old Case Team window. `CaseTeamModal.tsx` was rewritten on `ps-ctm-`.
  - `ps-tmpl-` (34): the old template request window (now `trm-`).
  - `ps-part-` (30): the old Template Builder part catalogue (now `ps-plib-`).
  - `ps-osn-` (21): the Orchestrator section navigator, left over when the Orchestrator panel went in Batch 517.
  - `ps-hist-` (16): the old Patient History tab and window (now `ps-ph-`).
  - Also the `rp-spin` animation, which only the removed rules used.
- **`unusedCss.guard.test.ts`:** the number of unreferenced classes can only go down (572 now, was 718), and the five removed families cannot come back unused.
- **Left for later batches:** 572 unreferenced classes in other families (largest: `fm-del-` 49, `ps-search-` 37, `ps-report-` 30, `ps-tat-` 23, `ps-syn-` 23) and 486 held back because code builds names from a prefix. Some families are partly live (`fm-del-`, `ps-search-`): the tool removes only the dead classes.

## Batch 615 (part D) — logical CSS (PS-293)

`logicalCss.guard.test.ts`: `pathscribe.css` and `index.css` may not use a physical left/right property (`margin-left`, `padding-right`, `border-left`, `left`, `right`, `text-align: left`, `float: left`, the left/right corner radii) or a four-value `padding` / `margin` / `border-radius` whose sides differ. Use `margin-inline-start`, `inset-inline-end`, `text-align: start`, `padding-inline: start end` and the like, so a right-to-left language mirrors the layout. The physical layouts that must not mirror are listed in the closing block of `pathscribe.css`.

## Batch 618 (part B) — file-size ratchet (PS-497)

`fileSize.guard.test.ts` with `fileSizeBaseline.ts`: every source file (`.ts`, `.tsx`, `.css`; not tests) over 1,000 lines is recorded with its length (35 files). A recorded file may not grow, a new file may not cross 1,000 lines, a file that shrank must have its number lowered (the test names the exact number), and a file at or under 1,000 lines is removed from the list. After a deliberate split, `UPDATE_FILE_SIZE_BASELINE=1 npx vitest run src/services/styleRules/fileSize.guard.test.ts` rewrites the baseline. Large files are split when a story touches them (CLAUDE.md rule 10).


Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): baselines lowered for RightSynopticPanel.tsx and pathscribe.css after removing confidence rendering.

## Batch 732

- Batch 732: `fileSizeBaseline.ts`: `types/case/Specimen.ts` lowered to 1,840.

## Batch 750

Baselines lowered: `CytologyScreeningPage.tsx` 1,528, `pathscribe.css` 28,539 (the launch button's styles removed), `types/case/Specimen.ts` 1,839.

## Batch 751

Baseline lowered: `FacilityEditorModal.tsx` 1,469 (the Outbound documents section moved to `FacilityOutboundDocumentsSection.tsx`).
