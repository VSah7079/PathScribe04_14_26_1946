// src/services/molecular/IMolecularAssayControlRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the given specification's own §3.2 "Controls & Standards
// Injection Engine": "Dynamic Control Rules: Define required assay
// controls per plate run" and "Position Enforcements: Support fixed
// well assignment (e.g., A01 = NTC, A02 = PTC) or random position
// assignment (to prevent cross-contamination patterns)."
//
// Found via a full, direct re-read of the given spec against this
// app's own actual code — neither concept had any real implementation
// anywhere in this codebase before this. A batch could genuinely be
// created and dispatched with zero controls, or the wrong ones, with
// no real enforcement anywhere.
//
// Real, deliberate design: one real rule per real assay code, kept as
// its own, separate entity rather than folded into MolecularBatch —
// a rule is admin-configured, shared across every real batch of that
// assay, not per-batch data, matching this module's own established
// "genuinely different real object, genuinely separate entity"
// reasoning (services/molecular/README.md's own Phase 1 architecture
// decision).
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { MolecularSampleType } from './IMolecularBatchService';

export interface MolecularRequiredControl {
  sampleType: MolecularSampleType;
  /** Real, per the given specification's own §3.2 "Position
   *  Enforcements": 'fixed' requires this control at exactly
   *  fixedWellPosition every real run; 'random' only requires the
   *  control's own presence somewhere on the plate — deliberately not
   *  a fixed, predictable position, "to prevent cross-contamination
   *  patterns" the spec itself names as the real reason. */
  positionMode: 'fixed' | 'random';
  /** Required when positionMode is 'fixed'; must be undefined when
   *  'random' — a random-position rule that also pins a fixed well
   *  would contradict itself. */
  fixedWellPosition?: string;
}

export interface MolecularAssayControlRule {
  id: ID;
  /** Real, per direct follow-up ("wouldn't we use the existing
   *  process catalog to define the assays?") — same real reference
   *  to StainType.id as MolecularBatch.assayCode, never a free-typed
   *  string this rule's own admin screen used to accept. */
  assayCode: string;
  requiredControls: MolecularRequiredControl[];
  /** Batch 406 (Pete: "Assay templates map … sample racks to specific valid
   *  deck regions"): the deck slots (DeckSlot.id, e.g. SLOT_A1) a sample rack
   *  for this assay may go in. Empty or missing: any slot that takes a sample
   *  rack. See services/molecular/deckSlots.ts. */
  allowedSampleRackSlotIds?: string[];
  createdAt: string;
}

export type NewMolecularAssayControlRule = Pick<MolecularAssayControlRule, 'assayCode' | 'requiredControls' | 'allowedSampleRackSlotIds'>;

/** Batch 406: why a change was refused, as codes the Control Rules page
 *  translates (`molecularControlRules.errors.<code>`). */
/** The user lacks config:molecular-control-rules:manage. */
export const MOLECULAR_CONTROL_RULE_NOT_PERMITTED = 'notPermitted';
/** The assay already has a rule: update that one instead. */
export const MOLECULAR_CONTROL_RULE_DUPLICATE = 'duplicateAssay';
/** No rule with that id. */
export const MOLECULAR_CONTROL_RULE_NOT_FOUND = 'notFound';

export interface IMolecularAssayControlRuleService {
  getAll(): Promise<ServiceResult<MolecularAssayControlRule[]>>;
  getByAssayCode(assayCode: string): Promise<ServiceResult<MolecularAssayControlRule | null>>;
  create(rule: NewMolecularAssayControlRule): Promise<ServiceResult<MolecularAssayControlRule>>;
  update(id: ID, patch: Partial<NewMolecularAssayControlRule>): Promise<ServiceResult<MolecularAssayControlRule>>;
  delete(id: ID): Promise<ServiceResult<void>>;
}
