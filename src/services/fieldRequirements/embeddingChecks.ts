// src/services/fieldRequirements/embeddingChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 401. What the Embedding station needs before it acts, per the
// organisation's Field Requirements (page "embedding"):
//   - a block comment                        embeddingCommentMissing
//   - confirming a block as embedded         embeddingConfirmMissing
//     (observed piece count, plus the mold size and orientation
//     instructions when the organisation requires them)
//   - reprinting the cassette label          embeddingReprintMissing
// Every path that acts asks these: the button, the voice command and, for
// Confirm, the foot pedal.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirementRules';

/** The page's defaults, for checks made before the organisation's settings load. */
export const EMBEDDING_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('embedding');

const filled = (v: string | undefined | null): string => (v ?? '').trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);

/** Whether an Embedding station field is required (drives the "*" beside a label). */
export function embeddingFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

/** The observed piece count as a whole number of 0 or more, or null when the text isn't one. */
export function parseObservedPieceCount(text: string | number | null | undefined): number | null {
  const s = String(text ?? '').trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

/** A block comment. */
export function embeddingCommentMissing(text: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'comments'), { commentText: filled(text) }).map(f => f.id);
}

export interface EmbeddingConfirmValues {
  /** The text of the observed-count field (or the expected count, for the foot pedal). */
  observedCount: string | number;
  moldSize?: string | null;
  orientationInstructions?: string | null;
}

/** Confirming a block as embedded. An observed count that isn't a whole number counts as missing. */
export function embeddingConfirmMissing(values: EmbeddingConfirmValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const count = parseObservedPieceCount(values.observedCount);
  return missingRequiredFields(inGroup(requirements, 'embeddingConfirm'), {
    observedPieceCount: count == null ? '' : String(count),
    moldSize: filled(values.moldSize),
    orientationInstructions: filled(values.orientationInstructions),
  }).map(f => f.id);
}

/** Reprinting the cassette label: the reason is chosen from the list. */
export function embeddingReprintMissing(reason: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'cassetteReprint'), { reprintReason: filled(reason) }).map(f => f.id);
}
