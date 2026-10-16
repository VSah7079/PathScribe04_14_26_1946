# pages/PathologyWorkspacePage/

- **`PathologyWorkspacePage.tsx`** (`/pathology-workspace`) — the real
  destination behind Home's "Pathology Workspace" tile: a small,
  second-level hub grouping the sub-workspaces that don't need their own
  flat top-level Home tile (Cytology, Microtomy, Embedding, Slide
  Distribution, Molecular, Batch Management). See the file's own header
  for the full "Homepage Changes part 1" direct-request account and why
  Molecular Workspace was folded in here too (grouped by domain, not by
  shared audience).

Each tile names the `ScreenId` it opens (`services/screens/screenAccess.ts`)
and is shown only when `visibleTiles()` says the signed-in user may open
that screen — the same Batch 374 convention as Home's own tiles. Reuses
Home.tsx's `.ps-home-cards-grid`/`.ps-home-card` visual language rather than
inventing a second card style.

## Batch 491 — Margin Exception Review tile (deferred from Batch 490's own margin-distance extraction layer)

A sixth tile, **Margin Exception Review** (`screen: 'marginExceptionReview'`,
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
