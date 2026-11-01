// src/services/fieldRequirements/microtomyChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 388. What the Microtome workstation's comment drawer and slide
// grid need before they act, per the organisation's Field Requirements (page
// "microtomy"):
//   - a comment                       microtomyCommentMissing
//   - a slide order (Add stain)       microtomyAddStainMissing
//   - a reprint of a printed slide    microtomyReprintMissing
//   - cancelling a printed slide      microtomyCancelMissing
// The locked fields reproduce what the page already required (a comment needs
// text, a slide order a stain, a reprint and a printed-slide cancel a reason);
// the level depth is a switch. Every path that acts (the button and the voice
// command) asks these.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, type FieldGroup, type ResolvedFieldRequirement } from './fieldRequirementRules';

const filled = (v: string): string => v.trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);

/** Whether a Microtome field is required (drives the "*" beside a label). */
export function microtomyFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return requirements.find(f => f.id === fieldId)?.required ?? false;
}

/** A block or slide comment. */
export function microtomyCommentMissing(text: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'comments'), { commentText: filled(text) }).map(f => f.id);
}

/** Adding a stain (or a level) to a block. `levelDepth` is the text of the µm field. */
export function microtomyAddStainMissing(stainTypeId: string, levelDepth: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'slideOrders'), {
    stainType: filled(stainTypeId),
    levelDepth: filled(levelDepth),
    reprintReason: 'not applicable',
    cancelReason: 'not applicable',
  }).map(f => f.id);
}

/** Reprinting a printed slide: the reason is chosen from the list. */
export function microtomyReprintMissing(reason: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'slideOrders').filter(f => f.id === 'reprintReason'), { reprintReason: filled(reason) }).map(f => f.id);
}

/** Cancelling a slide that has already printed: the reason is chosen from the list. */
export function microtomyCancelMissing(reason: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'slideOrders').filter(f => f.id === 'cancelReason'), { cancelReason: filled(reason) }).map(f => f.id);
}
