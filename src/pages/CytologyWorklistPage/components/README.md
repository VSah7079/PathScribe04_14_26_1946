# pages/CytologyWorklistPage/components

Parts of the Cytology screening page.

| File | What it is |
|---|---|
| `CytologyReviewForm.tsx` | Bethesda-style review form. Voice: "save review" |
| `CytologyCisoeAForm.tsx` | CISOE-A (PALGA) six-component form. Voice: "save CISOE-A review" |
| `CytologyRetrospectiveBanner.tsx` | 5-year retrospective review (outcome, corrective action). Voice: "complete retrospective review" |
| `CytologyHistologyCandidateBanner.tsx` | One cyto-histologic correlation candidate: confirm the resolved diagnosis or enter one by hand. Voice: "record correlation" (first banner only) |
| `CytologySearchSelect.tsx` | The searchable pick lists and the field label with its "*" |
| `cytologyRequirements.test.tsx` | Tests for the four forms above |
| `CytologyMaterialView`, `CytologyRoseView`, `CytologySlideOverDrawer`, `CytologySynopticFormView` | Drawers and views, unchanged |

Each form shows "Still required: …", stars required labels, keeps its button off until they are filled, and its voice command does exactly what the button does.

## Batch 390 (PS-340)

| File | What it is |
|---|---|
| `CytologyRevisionActions.tsx` | "Correct diagnosis" and "Add addendum" (each its own permission, greyed out without it) and the list of changes since sign-out with who, when and why |
| `CytologyRevisionPanel.tsx` | The correction form (starts from the signed review) or the addendum form, and the mandatory reason. Shows "Still required: …" |
| `cytologyRevision.test.tsx` | Tests for both components and the hook |

## Batch 411

`CytologySpecimenTabs.tsx`: the case's cytology specimens as tabs, each Draft or Signed out, with the case's progress. It offers "Finalize case now" with a reason, greyed without `cytology:case:finalize`, and shows an early finalization. It only renders: the decisions are `cytologyCaseProgress` and `finalizeCytologyCaseEarly` in `services/cytology/`.

## Batch 412

`CytologyReviewNotes.tsx`: under each review in the history. It shows other reviewers' notes on parts of it, with their status (open, acknowledged, revised, resolved by pathologist), and the author's Acknowledge button. It has a form to add a note, optionally "Requires revision", and the author's earlier versions with "Load into form". It only renders: the rules are in `services/cytology/cytologyReviewNotes.ts` and `cytologyWorkspaceView.cytologyReviewActions`.

## Batch 419

`cytologyRevision.test.tsx` mocks `submitCytologyRevisionToRegistry` and checks a released correction goes to the registry with `kind: 'correction'`.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`CytologyReviewEligibilityBadge.tsx` (PS-163), moved out of `CytologyScreeningPage.tsx`; same look and behaviour.

## Batch 460

`CytologySlideOverDrawer.tsx` takes `wide` for the billing drawer (`.ps-cytology-slideover--wide`).

---
*See [../README.md](../README.md) for how this folder fits the page.*
