// src/services/cytology/cisoeADraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// The CISOE-A (PALGA) form's in-progress draft and the conversions between it
// and a real CisoeAScore. Moved out of CytologyScreeningPage.tsx (Batch 386)
// so they can be tested and the form can be its own component.
//
// The draft holds strings (not numbers) deliberately, so an empty or
// in-progress field can be shown; numbers are parsed only at save time.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CisoeAScore, CisoeAAdequacy } from '@/types/cytology/CisoeAScore';

export interface CisoeADraft {
  composition: string; compositionComment: string;
  inflammation: string; inflammationComment: string;
  squamous: string; squamousComment: string;
  otherEndometrium: string; otherEndometriumComment: string;
  endocervical: string; endocervicalComment: string;
  adequacy: CisoeAAdequacy | '';
  notes: string;
}

export const EMPTY_CISOEA_DRAFT: CisoeADraft = {
  composition: '', compositionComment: '', inflammation: '', inflammationComment: '',
  squamous: '', squamousComment: '', otherEndometrium: '', otherEndometriumComment: '',
  endocervical: '', endocervicalComment: '', adequacy: '', notes: '',
};

/** The draft as a real CisoeAScore, or undefined if any numeric field is empty or out of range (0–9). */
export function resolveCisoeAScoreFromDraft(draft: CisoeADraft): CisoeAScore | undefined {
  const parse = (s: string) => (s.trim() === '' ? undefined : Number(s));
  const c = parse(draft.composition), i = parse(draft.inflammation), s = parse(draft.squamous),
        o = parse(draft.otherEndometrium), e = parse(draft.endocervical);
  if (c === undefined || i === undefined || s === undefined || o === undefined || e === undefined || !draft.adequacy) return undefined;
  if ([c, i, s, o, e].some(v => Number.isNaN(v) || v < 0 || v > 9)) return undefined;
  return {
    composition: { value: c, comment: draft.compositionComment || undefined },
    inflammation: { value: i, comment: draft.inflammationComment || undefined },
    squamous: { value: s, comment: draft.squamousComment || undefined },
    otherEndometrium: { value: o, comment: draft.otherEndometriumComment || undefined },
    endocervical: { value: e, comment: draft.endocervicalComment || undefined },
    adequacy: draft.adequacy,
  };
}

/**
 * Whatever axes are filled in, valid, as a partial score. Feeds the validation
 * messages so someone who filled in 5 of 6 axes sees exactly the one missing
 * field, not "all 6 are missing".
 */
export function resolveCisoeAPartialFromDraft(draft: CisoeADraft): Partial<CisoeAScore> {
  const parse = (s: string) => {
    if (s.trim() === '') return undefined;
    const n = Number(s);
    return Number.isNaN(n) || n < 0 || n > 9 ? undefined : n;
  };
  const partial: Partial<CisoeAScore> = {};
  const c = parse(draft.composition); if (c !== undefined) partial.composition = { value: c, comment: draft.compositionComment || undefined };
  const i = parse(draft.inflammation); if (i !== undefined) partial.inflammation = { value: i, comment: draft.inflammationComment || undefined };
  const s = parse(draft.squamous); if (s !== undefined) partial.squamous = { value: s, comment: draft.squamousComment || undefined };
  const o = parse(draft.otherEndometrium); if (o !== undefined) partial.otherEndometrium = { value: o, comment: draft.otherEndometriumComment || undefined };
  const e = parse(draft.endocervical); if (e !== undefined) partial.endocervical = { value: e, comment: draft.endocervicalComment || undefined };
  if (draft.adequacy) partial.adequacy = draft.adequacy;
  return partial;
}

/** A saved review's score, back as an editable draft. */
export function cisoeADraftFromScore(score: CisoeAScore, notes: string | undefined): CisoeADraft {
  return {
    composition: String(score.composition.value), compositionComment: score.composition.comment ?? '',
    inflammation: String(score.inflammation.value), inflammationComment: score.inflammation.comment ?? '',
    squamous: String(score.squamous.value), squamousComment: score.squamous.comment ?? '',
    otherEndometrium: String(score.otherEndometrium.value), otherEndometriumComment: score.otherEndometrium.comment ?? '',
    endocervical: String(score.endocervical.value), endocervicalComment: score.endocervical.comment ?? '',
    adequacy: score.adequacy, notes: notes ?? '',
  };
}
