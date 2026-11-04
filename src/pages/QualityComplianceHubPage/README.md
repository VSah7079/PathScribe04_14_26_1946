# pages/QualityComplianceHubPage

The Quality & Compliance hub behind the Home tile: one card per screen the user may open (`services/screens/screenAccess.ts`).

## Batch 421

A third card, **Registry Exceptions** (`/registry-exceptions`), beside Audit and Quality Assurance; the subtitle mentions registry submissions.

## Batch 425

The Registry Exceptions tile shows the live count of submissions needing attention (`useRegistryExceptionCount`). The Home page's Quality & Compliance tile shows it too.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 610 (part A) — Autopsy Dashboards tile

New tile for `/autopsy-dashboards`, shown with `screen:autopsy-dashboards:open` (Admin, Lab Director, QA Reviewer).

## Batch 708 — Margin Exception Review tile

The hub gained a sixth tile, **Margin Exception Review** (`screen: 'marginExceptionReview'`, route `/margin-exception-review`), moved from Pathology Workspace. Tile text is under `qualityComplianceHub.marginExceptionReviewTile` in all six locales. Because that screen's capability is seeded to pathologist roles, those roles now see a Quality & Compliance tile holding this one screen.

## Batch 710 — Tile descriptions

The six tile descriptions (`qualityComplianceHub.*Tile.description`) are now one short line each in all six languages so they fit the shared `.ps-home-card`; `src/i18n/tileDescriptionLength.test.ts` holds the character budget. Registry Exceptions with its count badge and long titles can still fill the card on their own.
