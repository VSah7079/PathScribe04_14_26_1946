**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

**Batch 723:** `img/home-overview.png` replaced with a current capture (1,600 px wide); `home-pubmed.png` stays as the close-up.

**Batch 722:** the Home article now covers the PubMed article line and its paste box, with the new capture `home-pubmed` (cropped from a capture of the running app, 760 x 128 px, native size). The `capture:` convention asks for 1,600 px wide full screens; this one is a close-up figure. See `docs/product/GUIDE_UPDATES.md`.

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

## Batch 731

- Batch 731: `add-on-orders/index.md` (exhausted blocks: what remains, alternatives, reason; answering a flag with an alternative), `workstations/embedding.md`, `microtomy.md`, `slide-distribution.md` (the exhausted-block line; End state). Rebuilt.

## Batch 732

- Batch 732: `grossing/index.md` (Type & pieces), `add-on-orders/index.md` (pieces, level range), `workstations/microtomy.md`, `embedding.md`, `slide-distribution.md` (block type, slide size, pieces). Rebuilt.

## Batch 743

- Batch 743: `report/microscopic-and-material.md`: the Attachments window on an Assist case. Rebuilt.

## Batch 742

- Batch 742: the Attachments window replaces Attach images (`report/microscopic-and-material.md`, `report/index.md`, `cytology/screening-case.md`). Rebuilt.

## Batch 741

- Batch 741: Divide specimen (grossing, cytology preparation). Rebuilt.

## Batch 740

- Batch 740: `workstations/cytology-prep.md` (new); microtomy note (fluids go to Cytology Preparation). Rebuilt.

## Batch 739

- Batch 739: batch management (Processor, Liquid-Based Cytology Processing), microtomy (cytospin suggestion), cytology screening case (aliquots). Rebuilt.

## Batch 737

- Batch 737: matrix blocks on Add-On Orders, matrix parts used up (microtomy), exhausted-block warning and large-format refusal (batch management). Rebuilt.

## Batch 736

- Batch 736: reasons worded by your lab (microtomy, batch management, add-on orders), header search note (sign-in). Rebuilt.

## Batch 735

- Batch 735: "Using a tablet at the bench" in `grossing`, `workstations/embedding`, `workstations/microtomy`, `workstations/slide-distribution`, `add-on-orders`, `batch-management`; touch layout setting in `sign-in`. Rebuilt.

## Batch 734

- Batch 734: `batch-management/index.md` (ad-hoc carriers move with you). Rebuilt.

## Batch 733

- Batch 733: `add-on-orders/index.md` and `workstations/microtomy.md` (one flag, one answer, destructive cutting). Rebuilt.
