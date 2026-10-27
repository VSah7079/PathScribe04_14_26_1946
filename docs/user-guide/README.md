# PathScribe User Guide (source)

**Batch 668:** the Help button text in `help/index.md` and `home/index.md` describes the top-bar buttons.

**Batch 667 (live check):** `scripts/user-guide/verify-live.cjs` opens every screen the guide claims in Chromium on the demo data (app serving on port 5179; `PLAYWRIGHT_CHROMIUM` names the browser), lists visible buttons, tabs and headings the article never mentions (`LIVE_CHECK.md`) and saves missing `-overview` screenshots to `img/`. Screenshots show demo data only and still need a person's check before publication.

**Batch 667:** every short on-screen label of a user-facing screen is now in an article or listed with a reason in `coverage-ignore.json` (screens that belong to the Administrator Guide are listed in `coverage-scope.json`). `scripts/user-guide/coverage.py` and `userGuide.coverage.guard.test.ts` enforce it. Placeholder labels match when the article writes `…` in place of the value. New: 70 articles; findings in `FINDINGS_667.md`.

> **Batch 666 follow-up:** `DECISIONS_666.md` sorts the 126 findings in `FINDINGS_666_*.md` into defects to fix, decisions for Pete, wording clean-ups and documentation-only items.

**Batch 666:** 61 articles cover every screen (see `route-exemptions.json` for the few that the Administrator Guide covers or that redirect). `build.py` fails when a screen route of the app has no article, and `src/services/help/userGuide.guard.test.ts` checks the same. Writing the articles logged 126 oddities in `FINDINGS_666_<group>.md` (batch, cytology, molecular, workstations, ops, access, report, everyday): each is a decision or defect for Pete, and none is fixed. All articles are still `status: Draft`.

**Batch 657.** The online User Guide for the people who do the work: pathologists, pathology assistants, accessioners, histotechnologists, laboratory managers, MDT coordinators and quality staff. Configuration is covered by the Administrator Guide (`docs/admin-guide/`), not here.

- `AUTHORING.md`: the writing standard, the front matter that makes help context-aware, and the sections every article must have. `TEMPLATE.md`: copy it for a new article.
- `src/<module>/…md`: the articles. Front matter gives each article its Module, Screen, Workflow, Role, Keywords and the app routes that open it.
- `img/`: screenshots (`<capture id>.png`). `MISSING_CAPTURES.md` (generated) lists those still to capture.
- Build: `python3 scripts/user-guide/build.py` writes `public/help/user-guide/` (manifest, search index, article pages, images) and `src/services/help/userGuideRoutes.generated.ts`. `--check` only validates. The build fails on a missing section, a broken link, a route claimed twice, or developer and database wording.
- In the app: `/help` (contents and search) and `/help/<module>/<screen>` (an article, with its "You are here" trail, previous and next step and related actions). The Help button on each screen, and F1 (View Help) where the screen does not use that key (the report page uses it for Full View), open the article for the screen being shown. Code: `src/pages/Help/`, `src/components/Help/`, `src/services/help/userGuide*.ts`.
- The articles are written from the code and the English screen text, not from a running installation; the clinical reviewer checks them against the real screens. English only for now. All articles start as `status: Draft` until a clinical reviewer checks them against the screen.
