// src/services/fieldRequirements/slideDistributionChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 402. What the Slide distribution station needs before it acts,
// per the organisation's Field Requirements (page "slideDistribution"):
//   - routing a slide to a pathologist (physical checkout)  slideCheckoutMissing
//   - routing a slide to a digital scanner                  scannerLoadMissing
//   - flagging an exception on a slide                      slideExceptionMissing
//   - reprinting a slide label                              slideReprintMissing
// A checkout also always needs somewhere to go: a pathologist, a pool or a
// location (the operation refuses one with none). That isn't a switch, so it
// is reported as `checkoutTarget` alongside the configured fields.
// Every path that acts asks these: the button and the voice command.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirementRules';

/** The page's defaults, for checks made before the organisation's settings load. */
export const SLIDE_DISTRIBUTION_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('slideDistribution');

/** Reported when a checkout has no pathologist, pool or location at all. */
export const CHECKOUT_TARGET_MISSING = 'checkoutTarget';

const filled = (v: string | undefined | null): string => (v ?? '').trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);

/** Whether a Slide distribution field is required (drives the "*" beside a label). */
export function slideDistributionFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

export interface SlideCheckoutValues {
  pathologistId?: string | null;
  subspecialtyId?: string | null;
  slideFolderId?: string | null;
  trayNumber?: string | null;
  courierBagId?: string | null;
}

/** Physical checkout: the configured fields, then `checkoutTarget` when nothing at all says where the slide goes. */
export function slideCheckoutMissing(values: SlideCheckoutValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const recipient = filled(values.pathologistId) || filled(values.subspecialtyId);
  const missing = missingRequiredFields(inGroup(requirements, 'slideCheckout'), {
    readingPathologist: recipient,
    slideFolderId: filled(values.slideFolderId),
    trayNumber: filled(values.trayNumber),
    courierBagId: filled(values.courierBagId),
  }).map(f => f.id);
  const anyTarget = !!(recipient || filled(values.slideFolderId) || filled(values.trayNumber) || filled(values.courierBagId));
  return anyTarget ? missing : [...missing, CHECKOUT_TARGET_MISSING];
}

export interface ScannerLoadValues {
  scannerInstrumentId?: string | null;
  rackId?: string | null;
  slotPosition?: string | null;
}

/** Routing to a digital scanner. */
export function scannerLoadMissing(values: ScannerLoadValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'scannerLoad'), {
    scannerInstrument: filled(values.scannerInstrumentId),
    rackId: filled(values.rackId),
    slotPosition: filled(values.slotPosition),
  }).map(f => f.id);
}

/** Flagging an exception on a slide: the reason is the button pressed; the note is a switch. */
export function slideExceptionMissing(note: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'slideException'), { exceptionNote: filled(note) }).map(f => f.id);
}

/** Reprinting a slide label: the reason is chosen from the list. */
export function slideReprintMissing(reason: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'slideLabelReprint'), { reprintReason: filled(reason) }).map(f => f.id);
}
