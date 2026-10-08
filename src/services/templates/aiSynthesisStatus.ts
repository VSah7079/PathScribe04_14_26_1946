// src/services/templates/aiSynthesisStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-329 (Batch 437): the report header's AI badge ("Draft ready" / "Review
// pending") is decided by the template's Must Have fields only.
//
// Pete (Oct 2): a field marked required in our templates counts as CAP
// "Must Have" for now (the templates are placeholders, not licensed CAP
// content). A required field counts while it is shown: a field or section
// with a `visibleWhen` condition is Must Have only once that answer is given.
//
// The rule:
//   • Only suggestions still unreviewed (`verification: 'unverified'`) can
//     trip the badge; a confirmed or overridden one never does.
//   • Of those, a field the template marks required and that is shown counts.
//     An optional field, or a required one that is hidden, doesn't.
//   • A suggestion for a field the template doesn't list counts (the safe
//     side), and so does every suggestion when the template isn't known yet.
//     Before Batch 437 every unreviewed field below the threshold counted.
//   • The badge reads "review-required" when the lowest-confidence counted
//     field is below the threshold, and names that field for "jump to it".
//   • `overallConfidence` (the average of all suggestions) is shown for
//     information and never decides the state.
// ─────────────────────────────────────────────────────────────────────────────

import { isVisible, type VisibilityCondition } from './fieldVisibility';

export interface AiSynthesisStatus {
  state: 'none' | 'draft-ready' | 'review-required';
  overallConfidence?:      number;
  flaggedFieldId?:          string;
  flaggedFieldConfidence?:  number;
}

export interface AiSuggestionLike {
  confidence: number;
  verification: 'unverified' | 'verified' | 'disputed';
}

/** Which fields the template lists, and which of them are Must Have right now. */
export interface MustHaveFields {
  known: ReadonlySet<string>;
  mustHave: ReadonlySet<string>;
}

interface TemplateLike {
  sections: ReadonlyArray<{
    visibleWhen?: VisibilityCondition;
    fields: ReadonlyArray<{ id: string; required?: boolean; visibleWhen?: VisibilityCondition }>;
  }>;
}

/** Required fields that are shown with these answers (pure). */
export function mustHaveFields(template: TemplateLike | null | undefined, answers: Record<string, string | string[]>): MustHaveFields | null {
  if (!template) return null;
  const known = new Set<string>();
  const mustHave = new Set<string>();
  for (const section of template.sections) {
    const sectionShown = isVisible(section.visibleWhen, answers);
    for (const field of section.fields) {
      known.add(field.id);
      if (field.required && sectionShown && isVisible(field.visibleWhen, answers)) mustHave.add(field.id);
    }
  }
  return { known, mustHave };
}

/** Whether a suggestion for this field can trip the badge. */
export function countsTowardBadge(fieldId: string, fields: MustHaveFields | null): boolean {
  if (!fields) return true;                       // template not known yet: every field
  if (!fields.known.has(fieldId)) return true;    // a field the template doesn't list
  return fields.mustHave.has(fieldId);
}

export function computeAiSynthesisStatus(
  suggestions: Record<string, AiSuggestionLike | undefined>,
  threshold: number,
  fields: MustHaveFields | null,
): AiSynthesisStatus {
  const entries = Object.entries(suggestions)
    .filter((e): e is [string, AiSuggestionLike] => typeof e[1]?.confidence === 'number');
  if (entries.length === 0) return { state: 'none' };

  const overallConfidence = Math.round(entries.reduce((sum, [, s]) => sum + s.confidence, 0) / entries.length);

  let flagged: [string, AiSuggestionLike] | null = null;
  for (const entry of entries) {
    if (entry[1].verification !== 'unverified') continue;
    if (!countsTowardBadge(entry[0], fields)) continue;
    if (!flagged || entry[1].confidence < flagged[1].confidence) flagged = entry;
  }

  return {
    state: flagged && flagged[1].confidence < threshold ? 'review-required' : 'draft-ready',
    overallConfidence,
    flaggedFieldId: flagged?.[0],
    flaggedFieldConfidence: flagged?.[1].confidence,
  };
}
