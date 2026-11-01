**Batch 740:** the Cytology Preparation tile (reuses `/cytology.webp`).

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# pages/PathologyWorkspacePage/

- **`PathologyWorkspacePage.tsx`** (`/pathology-workspace`) — the real
  destination behind Home's "Pathology Workspace" tile: a small,
  second-level hub grouping the sub-workspaces that don't need their own
  flat top-level Home tile (Cytology, Microtome, Embedding, Slide
  Distribution, Molecular, Batch Management, Margin Exception Review: seven
  tiles in all, each shown only if the user may open its screen). See the file's own header
  for the full "Homepage Changes part 1" direct-request account and why
  Molecular Workspace was folded in here too (grouped by domain, not by
  shared audience).

Each tile names the `ScreenId` it opens (`services/screens/screenAccess.ts`)
and is shown only when `visibleTiles()` says the signed-in user may open
that screen — the same Batch 374 convention as Home's own tiles. Reuses
Home.tsx's `.ps-home-cards-grid`/`.ps-home-card` visual language rather than
inventing a second card style.

## Batch 491 — Margin Exception Review tile (deferred from Batch 490's own margin-distance extraction layer)

The seventh and last tile (Batch 491), **Margin Exception Review** (`screen: 'marginExceptionReview'`,
route `/margin-exception-review`), reaches the new review queue for a
`Pending` `MarginExtractionException` — a margin-distance free-text answer
the extraction layer couldn't confidently parse. Placed in this hub
(alongside the other grossing-adjacent screens) rather than given its own
standalone Home tile like Tumor Board, since it's a narrower, lower-traffic
queue. No dedicated photo shoot for this tile yet — reuses
`/deficiencies.webp` (an existing "needs a person to resolve it"
placeholder), same disclosed-placeholder posture as the Embedding tile's
own image (see this file's own comment).

See `pages/MarginExceptionReviewPage.tsx`, `hooks/useMarginExceptionReview.ts`,
and `services/marginExtraction/README.md` for the rest of the feature.

## Batch 708 — Margin Exception Review moved to Quality & Compliance

Pete (Oct 28, 2026): the margin exception queue works on cases after sign-out and is an oversight task, not bench work, so it now lives in the Quality & Compliance hub (`HUB_SCREENS.qualityCompliance`), not here. Same screen, route (`/margin-exception-review`) and capability; only the hub changed. Its tile strings moved to the `qualityComplianceHub.marginExceptionReviewTile` namespace in all six locales. This hub is back to six tiles.

## Batch 710 — Tile descriptions

The six tile descriptions (`pathologyWorkspace.*Tile.description`) are now one short line each in all six languages so they fit the shared `.ps-home-card`; `src/i18n/tileDescriptionLength.test.ts` holds the character budget. Long titles (French, Spanish, Dutch, German) can still fill the card on their own.
