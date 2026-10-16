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
