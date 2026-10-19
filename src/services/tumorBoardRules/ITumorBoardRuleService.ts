// src/services/tumorBoardRules/ITumorBoardRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (PS-359 follow-up — Module 2 of Pete's Tumor Board/MDT spec: the
// auto-flagging rules engine). Pete's confirmed Hybrid Inheritance Model
// (Oct 8, 2026): "org-wide baseline... facility-level settings inherit from
// the org-wide policy unless an explicit local override is authorized" —
// the same enterprise-then-facility-override pattern already used for the
// cyto-histo and biopsy-to-resection correlation windows
// (services/cytology/ICytologyHistologyCorrelationSettingsService.ts,
// services/quality/biopsyResectionCorrelationSettings.ts), minus the
// jurisdiction tier (not asked for here).
//
// Real, deliberate scope narrowing — disclosed, not a gap: Pete's own
// recommendation named three enterprise-level inputs ("core clinical
// quality indicators, mandatory case flags, standard tumor board inclusion
// criteria") and three facility-level ones ("thresholds, operational
// routing, scheduling parameters"). The only one of those this app can
// evaluate automatically today is a margin-distance threshold — Batch 490's
// marginExtraction/ shadow attributes are the one piece of structured,
// rule-readable clinical data this app produces at sign-out. Diagnosis/
// biomarker-combination criteria (Pete's own worked example, "Invasive
// Ductal Carcinoma, ER Negative, Margin < 1mm") would need a much broader
// structured-answer reader across every template's own option set — a
// real, separate module, not attempted here. "Operational routing" and
// "scheduling parameters" have no concrete settings to attach yet (there's
// no routing/scheduling concept elsewhere in the app for this engine to
// hook into); only the threshold and on/off switch are modeled as facility
// overrides. One rule per board, fixed set (same closed-vocabulary
// reasoning as TUMOR_BOARD_NAMES itself) — an admin edits a rule's
// threshold and active flag, never adds or removes a board/rule.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { TumorBoardName } from '../tumorBoard/ITumorBoardService';

export interface TumorBoardAutoFlagRule {
  /** Fixed id, one per board — never created/removed via the service. */
  id: string;
  board: TumorBoardName;
  /** Admin-facing description of what the rule checks, shown on the
   *  Configuration screen (not translated — same as other admin-entered
   *  config labels, data not chrome; see CLAUDE.md rule 3). */
  label: string;
  /** Flags a case when a margin shadow attribute's valueMm is strictly
   *  less than this. */
  marginThresholdMm: number;
  active: boolean;
}

/** The enterprise-baseline rule, one per board — Pete's own "Margin < 1mm"
 *  example, applied to all four boards until an admin changes it. */
export const DEFAULT_TUMOR_BOARD_RULES: readonly TumorBoardAutoFlagRule[] = [
  { id: 'margin-breast-mdt', board: 'Breast MDT', label: 'Close or positive margin (< 1mm)', marginThresholdMm: 1, active: true },
  { id: 'margin-gi-mdt', board: 'GI MDT', label: 'Close or positive margin (< 1mm)', marginThresholdMm: 1, active: true },
  { id: 'margin-thoracic-mdm', board: 'Thoracic MDM', label: 'Close or positive margin (< 1mm)', marginThresholdMm: 1, active: true },
  { id: 'margin-gyn-onc', board: 'Gyn-Onc', label: 'Close or positive margin (< 1mm)', marginThresholdMm: 1, active: true },
];

export interface FacilityTumorBoardRuleOverride {
  id: ID;
  facilityId: string;
  /** A margin rule's id (DEFAULT_TUMOR_BOARD_RULES) or an admin-added criteria rule's id. */
  ruleId: string;
  /** Margin rules only; ignored for a criteria rule. */
  marginThresholdMm?: number;
  active?: boolean;
  /** Batch 610 (#71): routing override. When set, a case this facility's rule
   *  flags goes to this board instead of the rule's own board. */
  board?: TumorBoardName;
  updatedAt: string;
}

export type TumorBoardRuleChange = Partial<Pick<TumorBoardAutoFlagRule, 'marginThresholdMm' | 'active' | 'board'>>;

// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#71): admin-added diagnosis and biomarker rules. A rule holds a
// list of criteria that must ALL match (Pete's worked example: "Invasive Ductal
// Carcinoma, ER Negative, Margin < 1mm"), and flags the case to one board at
// sign-out with a trigger reason. The criteria are matched against the signed
// synoptic answers by field label, see criteriaRuleEvaluation.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type TumorBoardCriterion =
  /** The diagnosis text of the signed workup contains this text (any case). */
  | { kind: 'diagnosis'; text: string }
  /** A field whose label contains `marker` has an answer containing `result` as a whole word. */
  | { kind: 'biomarker'; marker: string; result: string }
  /** A recorded margin distance is below this many mm (the same extraction the margin rules use). */
  | { kind: 'margin'; belowMm: number };

export const MAX_CRITERIA_RULES = 25;
export const MAX_CRITERIA_PER_RULE = 6;

export interface TumorBoardCriteriaRule {
  id: ID;
  /** Admin-entered description, shown on the Configuration screen (data, not chrome). */
  label: string;
  board: TumorBoardName;
  criteria: TumorBoardCriterion[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewTumorBoardCriteriaRule {
  label: string;
  board: TumorBoardName;
  criteria: TumorBoardCriterion[];
  active?: boolean;
}

export type TumorBoardCriteriaRuleChange = Partial<NewTumorBoardCriteriaRule>;

export interface ITumorBoardCriteriaRuleService {
  getAll(): Promise<ServiceResult<TumorBoardCriteriaRule[]>>;
  /** Protected (config:tumor-board-rules:manage). */
  create(input: NewTumorBoardCriteriaRule): Promise<ServiceResult<TumorBoardCriteriaRule>>;
  /** Protected (config:tumor-board-rules:manage). */
  update(id: string, changes: TumorBoardCriteriaRuleChange): Promise<ServiceResult<TumorBoardCriteriaRule>>;
  /** Protected (config:tumor-board-rules:manage). */
  remove(id: string): Promise<ServiceResult<void>>;
}

export interface ITumorBoardRuleService {
  /** The enterprise baseline — the fixed 4 rules, admin-editable fields only. */
  getAll(): Promise<ServiceResult<TumorBoardAutoFlagRule[]>>;
  /** Protected (config:tumor-board-rules:manage). */
  update(id: string, changes: TumorBoardRuleChange): Promise<ServiceResult<TumorBoardAutoFlagRule>>;
}

export interface IFacilityTumorBoardRuleOverrideService {
  getAll(): Promise<ServiceResult<FacilityTumorBoardRuleOverride[]>>;
  getForFacility(facilityId: string): Promise<ServiceResult<FacilityTumorBoardRuleOverride[]>>;
  /** Protected (config:tumor-board-rules:manage). */
  set(facilityId: string, ruleId: string, changes: TumorBoardRuleChange): Promise<ServiceResult<FacilityTumorBoardRuleOverride>>;
  /** Protected (config:tumor-board-rules:manage). */
  remove(facilityId: string, ruleId: string): Promise<ServiceResult<void>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): "A system rule should lock the batch at a set
// interval before the meeting time (e.g., 2 days prior)." The admin-
// editable cut-off interval itself — see services/tumorBoard/
// tumorBoardBatchLock.ts for the real, enforced rule this configures, and
// that file's own header comment for why this is ONE enterprise-wide
// number rather than a per-facility override like the rules above: a
// board meeting happens at this organisation regardless of which external
// facility referred a given case into it.
// ─────────────────────────────────────────────────────────────────────────────

export interface TumorBoardBatchSettings {
  /** Hours before a session's meeting date+time (or end-of-day, for a
   *  date-only session) at which its batch locks — see
   *  tumorBoardBatchLock.ts's isTumorBoardBatchLocked(). Pete's own
   *  example range was "48-72 hours"; defaults to the lower (more
   *  permissive) bound. */
  cutoffHours: number;
}

export const DEFAULT_TUMOR_BOARD_BATCH_SETTINGS: TumorBoardBatchSettings = { cutoffHours: 48 };

export interface ITumorBoardBatchSettingsService {
  get(): Promise<ServiceResult<TumorBoardBatchSettings>>;
  /** Protected (config:tumor-board-rules:manage) — same admin surface as
   *  the auto-flag rules above (Config → System → Tumor Board Rules). */
  update(changes: Partial<TumorBoardBatchSettings>): Promise<ServiceResult<TumorBoardBatchSettings>>;
}
