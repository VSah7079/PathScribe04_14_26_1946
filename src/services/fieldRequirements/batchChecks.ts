// src/services/fieldRequirements/batchChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 404. What Batch Management needs before it acts, per the
// organisation's Field Requirements (page "batchManagement"):
//   - New container                         batchCreateMissing
//   - aborting a batch                      batchAbortMissing
//   - forcing a reconciliation complete     batchOverrideMissing
//   - acknowledging a cold-chain excursion  coldChainAckMissing
// Fields that belong to one processing node (decal duration, referral lab and
// test, cytology stain, staining reagent lots) or to a reusable rack are only
// asked for there. The locked reasons are checked in the batch service too.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirementRules';

export const BATCH_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('batchManagement');

const filled = (v: string | undefined | null): string => (v ?? '').trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);
/** Stands in for a field that doesn't apply to this container, so it never counts as missing. */
const NOT_APPLICABLE = 'not applicable';

export function batchFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

export interface BatchCreateValues {
  processingNode: string;
  protocol: string;
  identifierMode: 'disposable' | 'semi_permanent';
  rackId?: string;
  targetDurationMinutes?: number;
  referralDestinationFacilityId?: string;
  referralTestRequested?: string;
  cytologyStainTypeId?: string;
  stainingReagentLotIds?: readonly string[];
}

/** New container. */
export function batchCreateMissing(v: BatchCreateValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const node = v.processingNode;
  const onlyFor = (applies: boolean, value: string) => (applies ? value : NOT_APPLICABLE);
  return missingRequiredFields(inGroup(requirements, 'batchCreate'), {
    protocol: filled(v.protocol),
    rackId: onlyFor(v.identifierMode === 'semi_permanent', filled(v.rackId)),
    decalDuration: onlyFor(node === 'Decal / Special Processing', (v.targetDurationMinutes ?? 0) > 0 ? 'yes' : ''),
    referralDestination: onlyFor(node === 'External Referral', filled(v.referralDestinationFacilityId)),
    referralTestRequested: onlyFor(node === 'External Referral', filled(v.referralTestRequested)),
    cytologyStainType: onlyFor(node === 'Cytology Staining', filled(v.cytologyStainTypeId)),
    stainingReagentLots: onlyFor(node === 'Staining', (v.stainingReagentLotIds ?? []).length > 0 ? 'yes' : ''),
  }).map(f => f.id);
}

const reasonCheck = (fieldId: string) => (text: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] =>
  missingRequiredFields(inGroup(requirements, 'batchClose').filter(f => f.id === fieldId), { [fieldId]: filled(text) }).map(f => f.id);

/** Aborting a batch (Pete: always needs a reason). */
export const batchAbortMissing = reasonCheck('abortReason');
/** Completing a reconciliation with items missing or unexpected. */
export const batchOverrideMissing = reasonCheck('overrideReason');
/** Acknowledging a cold-chain temperature excursion. */
export const coldChainAckMissing = reasonCheck('coldChainNote');
