**Batch 755a:** chapter 6 (Synoptic Library) describes the demonstration checklists by their plain names and tag, in all six languages; rebuilt and published.

**Batch 739:** `src/02-tier1-primary-prerequisites.md` (and fr, de, nl, ko, es): Equipment kind Liquid-based cytology processor. Rebuilt.

**Batch 737:** `src/02-tier1-primary-prerequisites.md` (and fr, de, nl, ko, es): Equipment → Staining racks. Rebuilt.

**Batch 736:** `src/04-tier3-workflow-engines.md` (and fr, de, nl, ko, es): System → Bench Reasons (step 32). Rebuilt.

**Batch 734:** `src/02-tier1-primary-prerequisites.md`, Facility editor Printing tab: **Allow direct printing from the browser**. Rebuilt.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

**Batch 668:** the Help button paragraph in chapter 1 describes the window behaviour and the top-bar book button, in all six languages.

**Batch 666:** the English chapters and all five translations now describe Batches 653 to 665: the Release Hold Print Policy and `print:release-hold:override`, `qa:management-review:submit`, facility limits on case actions, locked Sex and required Downtime Reason, Quick Links from External Resources, the new commands and keys, the sex at birth and NHS number variables and the PID-8 mapping, the AI confidence floor and Codes window, and the unbuilt release-sweep job. `parity.py` reports 0 problems in every language.

**Batch 667:** the Label Designer section gained rows (version history, export boxes, save messages) in English and all five translations. About 740 Configuration labels are still not named in the guide.

**Batch 650 to 652:** the Superadmin wording (holds every capability except `config:ai-prompt:approve`), the Audit Log appendix (Voice command executed / refused and the Batch 651 events), the retention-placeholder paragraph, Printer Profiles limits and the AI framework notes were corrected in the English source; the translations carry the Superadmin and audit-event corrections only (the retention-placeholder paragraph still awaits translation: `docs/product/KNOWN_GAPS.md`).

# docs/admin-guide/

**Batch 648:** the Lockbox Drop-Off section notes the demo seed cases and Demo Reset (all six languages).

**Batch 646.** The PathScribe Administrator Guide (Pete, Oct 21, 2026), written from the product source for customer system administrators and ForMedrixAI support and services engineers. It follows the outline's setup order (Tier 1 to Tier 7), gives every screen the seven-part layout (navigation, purpose, prerequisites and setup sequence, screenshot, field reference, permissions, known limits), and says plainly what is Built, Demonstration, Partial, Planned or Not built.

| Folder or file | What it is |
|---|---|
| `src/` | The chapters, in Markdown: `01-system-overview` to `09-appendices`, and `99-glossary` (196 terms, linked automatically). About 9,600 lines, 318 field tables. This is what people edit. |
| `AUTHORING.md` | The writing standard, with a worked example (Departments). A chapter that breaks it fails the build. |
| `OWNERSHIP.md` | Every screen's canonical id (`screen-<name>`), its capture id and its one owning chapter. |
| `open-questions/ch1.md` to `ch9.md` | Where the authors disagreed with the outline, the older docs or the screens, and what needs Pete's decision. |
| `img/` | Real screen captures (WebP, 1440 wide) of the demo, and `manifest.json`. Made by `scripts/admin-guide/capture.mjs`. |
| `MISSING_CAPTURES.md` | Pictures a chapter asks for that are not captured (none since Batch 647). The guide shows a labelled placeholder box for each one listed. |
| `src/<lang>/`, `TRANSLATION.md` | The French, German, Dutch, Korean and Spanish translations (Batch 647, machine made, native review pending) and the rules translators follow. `scripts/admin-guide/parity.py` checks each one against the English; a language builds only when all ten files exist. |
| `html/` | Build output, two editions: `customer` and `internal` (adds the sections marked FORMEDRIXAI INTERNAL ONLY). Not edited by hand. |

**Build:** `python3 scripts/admin-guide/build.py [--no-convert] [--publish]`. It checks every link, duplicate id, setup-order rule (a screen may only require one that comes earlier) and missing Setup step line, and fails on any. `--publish` copies the customer edition to `public/help/admin-guide/`, which the app serves.
**Screen captures:** run the app (`npx vite --port 5179`), then `node scripts/admin-guide/capture.mjs` (set `PLAYWRIGHT_CHROMIUM` when the installed browser is not the version Playwright expects).

**Features of the built guide:** a linked contents page, a breadcrumb and a deep-link id on every chapter, section, screen, field row, glossary term and error code; a "Setup sequence" box on each screen (configure first, this unlocks) and a master **Setup order** checklist; search over screens, field names and error codes; light and dark themes; a print layout and `all.html` for print-to-PDF; and `go.html#<screen id>`, the page the in-app **Help** button opens (see `src/components/Config/help/` and `src/services/help/`).

**Keeping it true:** `src/services/help/adminGuideAnchors.guard.test.ts` fails when a Configuration tab or section has no section in these chapters. Re-run the captures after a screen changes. Status words are the source of truth for what can be promised to a customer.

- Batch 669a: User Guide and Administrator Guide screenshots re-captured by script (`scripts/user-guide/capture.cjs`, `scripts/admin-guide/capture.mjs`); one User Guide picture (autopsy authorization) still missing.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).

## Batch 731

- Batch 731: chapter 2, the three `material:` permissions (English).

## Batch 732

- Batch 732: chapter 2 Equipment, "Takes large-format slides" (all six languages). Rebuilt (English).

## Batch 750

- Batch 750: chapter 4, digital pathology and Vendor Integrations: no viewer in PathScribe; the WSI Viewers category's **Slide images** table; the example.com demo entry gone (six languages). Published.

## Batch 751

- Batch 751: chapter 2, Facility editor, LIS Integration tab: the three Organ map delivery rows (six languages). Published.
