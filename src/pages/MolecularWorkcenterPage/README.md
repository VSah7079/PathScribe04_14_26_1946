# pages/MolecularWorkcenterPage/

- **`MolecularWorkcenterPage.tsx`** (`/molecular`) — real, per direct
  follow-up ("I'm not sure it makes sense to have Molecular Testing and
  Molecular Batch Management as separate tiles"): the single, real home
  for the whole molecular-testing lifecycle, replacing two former,
  separate home-page tiles/routes. See `services/molecular/README.md`'s
  own Phase 21 for the full architectural account — why the two former
  pages are genuinely related (both real, downstream pipelines off the
  same real molecular-instrument-run lifecycle) yet deliberately kept as
  two separate real data models, never merged into one shape.

Four real tabs, driven by a real `?tab=` query param (`worklist` |
`active` | `history` | `qc`; no param defaults to `active`, per direct
guidance's own "Primary View: Active Batches & Runs"):

- **Worklist & Plate Builder** — `draft` batches only, plus the
  "+ New Batch"/Extraction Racks/Control Rules header actions.
- **Active Runs & Batches** (the real default) — `active` +
  `awaiting_results`.
- **History & Archive** — `completed` + `aborted` + `superseded`.
- **QC & Specimen Association** — `pages/MolecularBatchManagement/
  MolecularBatchManagementPage.tsx`, embedded directly as its own real,
  distinct tab (not blended into History) since it remains a genuinely
  different real data model (`MolecularQcRunRecord`, not `MolecularBatch`).

`workcenterTabForStatus()` is exported from this file — a real, small,
pure function resolving which real tab a given batch's own current status
belongs to, so `MolecularPlateBuilderPage.tsx`'s own "Back to Batches"
action lands a tech on the tab that actually shows their batch.

**Real, deliberate scope limit**: the actual plate builder
(`pages/MolecularBatchPage/MolecularPlateBuilderPage.tsx`) remains its own,
separate, full-page route (`/molecular-batch/:batchId`) — not re-embedded
inline inside a tab panel. That page is large, real, and already working;
forcing it into a tab-constrained space would have been a real, risky
rewrite for no real, stated benefit.

## Batch 367 (PS-74): no inline CSS

`MolecularWorkcenterPage.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`MolecularWorkcenterPage.tsx` takes `molecularBatchService` from `@/services`, and is off the deployment baseline.

## Batch 436 (PS-326)

The workcenter shows each run's instrument by name (from the Equipment register) instead of its id, and formats dates in the user's language.

## Batch 467 — In-house molecular orders

`MolecularOrderQueueTab.tsx`, the first tab ("Order Queue"): the engine's queue view. Select queued orders of one test, pick a draft plate, Assign; Remove, Re-route, Cancel per row (capability buttons). Demo builds offer "Demo: positive / negative" for an order on a plate. The accession is tagged `data-phi`. The tab decides nothing; the engine does.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

Order Queue:
- A queued send-out order has a reference lab list, and says so when none is chosen.
- Orders at the reference lab read "At the reference lab" and show their referral batch.
- Demo builds add "Demo: reference lab → positive / negative" for send-out orders.

## Batch 474 — Instrument-alert visibility in the batch summary table (PS-359)

The Batch 436 instrument-by-name display never flagged an instrument with an open malfunction or overdue maintenance/calibration, unlike the Equipment register and `MolecularPlateBuilderPage.tsx`'s own instrument picker. Now reuses the same `isServiceAlert`/`serviceStatesById` pair (`services/equipment/equipmentLogRules.ts`) and the same `ps-eqlog-row--alert` row styling as those two screens — a row whose batch targets an alerted instrument gets the red-tinted row and a tooltip on the instrument cell. No new CSS; new locale key `molecularWorkcenterPage.instrumentAlertHint`.
