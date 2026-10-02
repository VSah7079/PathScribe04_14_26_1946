// src/pages/CytologyWorklistPage/cytologyDrafts.ts
// The Bethesda-style review form's in-progress draft (Batch 386: moved out of
// CytologyScreeningPage.tsx so the form can be its own component). Batch 410:
// the draft and its conversions now live in services/cytology/cytologyReviewDraft.ts;
// this keeps the components' existing import working.
// The CISOE-A draft is in services/cytology/cisoeADraft.ts.

export type { Draft } from '@/services/cytology/cytologyReviewDraft';
export { EMPTY_DRAFT } from '@/services/cytology/cytologyReviewDraft';
