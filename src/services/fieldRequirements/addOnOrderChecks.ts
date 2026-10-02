// src/services/fieldRequirements/addOnOrderChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 403. What the Add-On Orders page needs before it acts, per the
// organisation's Field Requirements (page "addOnOrder"):
//   - adding a line to the order (a recut's level depth)   addOnLineMissing
//   - submitting the order                                  addOnSubmitMissing
//   - a tech flagging a block exception on an order         addOnExceptionMissing
//   - the pathologist's response to that exception          addOnResponseMissing
// The level depth applies to recut lines only and the send-out lab to
// molecular/send-out lines only; where no such line is in the order, the rule
// has nothing to ask for. Every path that acts asks these: the buttons, the
// voice commands and services/addOnOrders/addOnOrderActions.ts.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirementRules';

/** The page's defaults, for checks made before the organisation's settings load. */
export const ADD_ON_ORDER_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('addOnOrder');

const filled = (v: string | undefined | null): string => (v ?? '').trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);
/** Stands in for a rule that doesn't apply to this order, so it never counts as missing. */
const NOT_APPLICABLE = 'not applicable';

/** Whether an Add-On Orders field is required (drives the "*" beside a label). */
export function addOnOrderFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

/** A level depth in µm that counts as given: a number above 0. */
export function validLevelDepth(depth: number | string | undefined | null): boolean {
  if (depth === undefined || depth === null || String(depth).trim() === '') return false;
  const n = Number(depth);
  return Number.isFinite(n) && n > 0;
}

/** What an order line carries that these rules look at. */
export interface AddOnLineValues {
  orderKind: 'recut' | 'special_stain' | 'ihc' | 'molecular';
  levelDepthMicrons?: number | string | null;
  sendOutReferenceLabFacilityId?: string | null;
}

const orderGroup = (requirements: readonly ResolvedFieldRequirement[]) => inGroup(requirements, 'addOnOrder');

/** Adding one line: a recut asks for its level depth when the organisation requires it. */
export function addOnLineMissing(line: AddOnLineValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const rules = orderGroup(requirements).filter(f => f.id === 'levelDepth');
  return missingRequiredFields(rules, {
    levelDepth: line.orderKind !== 'recut' || validLevelDepth(line.levelDepthMicrons) ? NOT_APPLICABLE : '',
  }).map(f => f.id);
}

export interface AddOnSubmitValues {
  blockIds: readonly string[];
  lines: readonly AddOnLineValues[];
  cuttingInstructions?: string | null;
}

/** Submitting the order. */
export function addOnSubmitMissing(values: AddOnSubmitValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const recuts = values.lines.filter(l => l.orderKind === 'recut');
  const sendOuts = values.lines.filter(l => l.orderKind === 'molecular');
  return missingRequiredFields(orderGroup(requirements), {
    addOnBlocks: values.blockIds.length > 0 ? 'yes' : '',
    addOnLines: values.lines.length > 0 ? 'yes' : '',
    levelDepth: recuts.every(l => validLevelDepth(l.levelDepthMicrons)) ? NOT_APPLICABLE : '',
    cuttingInstructions: filled(values.cuttingInstructions),
    sendOutLab: sendOuts.every(l => filled(l.sendOutReferenceLabFacilityId)) ? NOT_APPLICABLE : '',
  }).map(f => f.id);
}

/** A tech flagging a block exception on an order. */
export function addOnExceptionMissing(note: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'addOnException'), { exceptionNote: filled(note) }).map(f => f.id);
}

/** The pathologist answering an exception (approve destructive cutting, modify, or cancel). */
export function addOnResponseMissing(note: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'addOnResponse'), { responseNote: filled(note) }).map(f => f.id);
}
