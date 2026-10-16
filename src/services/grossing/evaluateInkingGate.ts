// src/services/grossing/evaluateInkingGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up). The frontend-buildable half of Pete's own gate-engine
// spec — the real decision logic, as a pure function in the established
// resolveXGate.ts shape (same posture as resolveInkingValidationSeverity.ts
// and resolveAutopsyGrossExaminationGate.ts: no authorizationService call
// inside, no audit write inside — a caller decides what to do with the
// result, same as grossingCompletion.ts's completeGrossing does with its
// own pure sub-checks). What's genuinely backend-only (the real
// /inking/validate /inking/override REST endpoints, server-side RBAC on
// those endpoints, the real dbo.InkOverrideAuditLog SQL table) is NOT
// here — see this batch's README entry for the full split.
//
// Wraps the real, already-shipped resolveInkingValidationSeverity.ts
// (Structured Inking Module 1/3) rather than re-deriving severity from
// scratch — that function's own Severity 1/2/3 table is exactly Pete's
// "Validation Severity Engine Hierarchy." What this file adds on top,
// per the spec, is the two missing pieces that function deliberately
// doesn't do: (1) a genuine GateActionContext split (it was always
// SIGN_OUT-shaped; Gate A/GROSSING_COMPLETE needed its own rules — Severity
// 2 never hard-blocks there, only a soft "Proceed with Advisory Note"; and
// unlike Gate B, Gate A evaluates every specimen on the case even when
// only one triggered the check, since completing grossing is a
// whole-case action) and (2) fail-closed PALETTE_UNAVAILABLE when the
// ink-colour dictionary genuinely couldn't be read — resolveInkingValidationSeverity
// just silently skips its Severity-3 check when activeInkColorCodes is
// omitted (an honest "can't check what we don't have"), which is correct
// for that function's own narrower contract but NOT safe for a gate that's
// about to let a case move past Grossing or Sign-Out — this file is the
// one responsible for refusing to pass a case through on missing data
// rather than silently treating it as clean.
// ─────────────────────────────────────────────────────────────────────────────

import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import {
  resolveInkingValidationSeverity,
  type InkingValidationMode,
  type InkingValidationIssue,
} from './resolveInkingValidationSeverity';
import { resolveInkingGateJurisdictionProfile, type InkingGateJurisdictionProfile } from './jurisdictionInkingGateMessages';
import type { Jurisdiction } from '@/types/systemConfig';

export type GateActionContext = 'GROSSING_COMPLETE' | 'SIGN_OUT';

export type GateEvaluationMode = 'WARN' | 'BLOCK' | 'OVERRIDE_REQUIRED' | 'PALETTE_UNAVAILABLE';

/** One specimen's worth of margin data the gate needs — same narrow shape
 *  resolveInkingValidationSeverity.ts itself takes, plus the specimen's own
 *  display label (that function doesn't need it; the gate's issue list,
 *  surfaced in UI, does). */
export type GateSpecimen = Pick<Specimen, 'id' | 'label' | 'margins' | 'blocks'>;

export interface EvaluateInkingGateParams {
  caseId: string;
  /** Present only when the gate is evaluating a single, already-known
   *  specimen (e.g. a margin-ink entry just saved) — purely informational,
   *  carried through to the result; Gate A/B both still evaluate every
   *  specimen on the case regardless (see this file's own header). */
  specimenId?: string;
  facilityId: string;
  actionContext: GateActionContext;
  /** Role ids of the acting user — carried through for display/audit only.
   *  Real RBAC enforcement for the Administrative Override action itself
   *  happens where the override is actually executed
   *  (recordInkingGateOverride.ts's own authorizationService.enforce call),
   *  never inside this pure evaluator — same separation grossingCompletion.ts
   *  keeps between its own pure checks and its one real enforce() call. */
  userRoles?: readonly string[];
  specimens: readonly GateSpecimen[];
  mode: InkingValidationMode;
  jurisdiction?: Jurisdiction;
  /** The active ink-colour dictionary's own codes. Required for a real
   *  pass; omitting it is treated the same as the palette genuinely being
   *  unavailable (fail-closed — see this file's own header), NOT as
   *  "nothing to check against." Pass an explicit empty set only if the
   *  dictionary was read and is genuinely empty. */
  activeInkColorCodes: ReadonlySet<string> | undefined;
  /** False when the ink-colour dictionary read itself failed/errored
   *  (service unreachable) — distinct from activeInkColorCodes being
   *  omitted because nothing has loaded yet. Defaults to true. */
  paletteAvailable?: boolean;
}

export interface InkingGateIssue {
  marginId: string;
  specimenId: string;
  specimenDisplayName?: string;
  severity: InkingValidationIssue['severity'];
  code: InkingValidationIssue['code'];
  /** PHI-safe, literal English — audit/log text, same posture as
   *  AuditLog.detail (standing rule: audit detail text stays literal
   *  English). UI-facing copy is rendered from `code` via i18n, not from
   *  this field. */
  message: string;
}

export interface InkOverrideAuditLogEntry {
  auditId: string;
  timestampUTC: string;
  facilityId: string;
  caseId: string;
  jurisdictionCode: InkingGateJurisdictionProfile;
  inkingValidationMode: InkingValidationMode;
  specimenId: string;
  overrideByUserId: string;
  overrideRole: string;
  overrideReasonCode: InkingGateOverrideReasonCode;
  overrideReasonText?: string;
  unresolvedIssues: InkingGateIssue[];
}

export type InkingGateOverrideReasonCode =
  | 'FOREIGN_OBJECT_PRE_INKED'
  | 'EMERGENCY_INTRAOP_CONSULTATION'
  | 'SPECIMEN_CONSUMED_UNAVAILABLE'
  | 'OTHER';

export const INKING_GATE_OVERRIDE_REASON_CODES: readonly InkingGateOverrideReasonCode[] = [
  'FOREIGN_OBJECT_PRE_INKED', 'EMERGENCY_INTRAOP_CONSULTATION', 'SPECIMEN_CONSUMED_UNAVAILABLE', 'OTHER',
];

export interface InkingGateResult {
  canProceed: boolean;
  mode: GateEvaluationMode;
  highestSeverity: InkingValidationIssue['severity'] | null;
  jurisdictionCode: InkingGateJurisdictionProfile;
  inkingValidationMode: InkingValidationMode;
  caseId: string;
  facilityId: string;
  actionContext: GateActionContext;
  issues: InkingGateIssue[];
  /** True only for SIGN_OUT + a Severity 3 issue + a role allowed to
   *  attempt an Administrative Override (per userRoles) — i.e. exactly
   *  when mode === 'OVERRIDE_REQUIRED'. The override itself still needs a
   *  real authorizationService.enforce('case:inking-gate:override') check
   *  at the point it's executed; this is a display hint only. */
  overrideEligible: boolean;
}

const MESSAGE_BY_CODE: Record<InkingValidationIssue['code'], (m: InkingValidationIssue) => string> = {
  margin_not_examined: m => `Margin "${m.marginName}" on specimen ${m.specimenId} has not been marked examined.`,
  margin_no_ink_applied: m => `Margin "${m.marginName}" on specimen ${m.specimenId} has no ink application recorded.`,
  margin_ink_color_unmapped: m => `Margin "${m.marginName}" on specimen ${m.specimenId} recorded an ink colour code ("${m.colorCode ?? ''}") that does not map to any colour in the active ink-colour dictionary.`,
};

function toGateIssue(issue: InkingValidationIssue, labelBySpecimenId: ReadonlyMap<string, string>): InkingGateIssue {
  return {
    marginId: issue.marginId,
    specimenId: issue.specimenId,
    specimenDisplayName: labelBySpecimenId.get(issue.specimenId),
    severity: issue.severity,
    code: issue.code,
    message: MESSAGE_BY_CODE[issue.code](issue),
  };
}

/** Roles the spec names as eligible to attempt an Administrative Override
 *  ("Clinical Admin, Lead Pathologist") — mapped onto this app's real,
 *  existing role ids. A standard Pathologist, Fellow or Resident is never
 *  eligible, regardless of userRoles passed in. */
const OVERRIDE_ELIGIBLE_ROLES = new Set(['admin', 'lab-director']);

/**
 * The gate engine's real decision, given everything it needs already
 * resolved by the caller (same "caller gathers, this decides" shape as
 * every other resolveXGate.ts in this app). Pure and synchronous — no
 * network calls, no authorization checks, no audit writes.
 */
export function evaluateInkingGate(params: EvaluateInkingGateParams): InkingGateResult {
  const { caseId, facilityId, actionContext, specimens, mode, jurisdiction, activeInkColorCodes, paletteAvailable = true } = params;
  const jurisdictionCode = resolveInkingGateJurisdictionProfile(jurisdiction);
  const labelBySpecimenId = new Map(specimens.map(sp => [sp.id, sp.label] as const));

  // Fail-closed: a palette that couldn't be read (service unreachable or
  // errored) or was never supplied at all blocks BOTH gates immediately,
  // with no retry — see this file's own header. This check runs before
  // anything else, deliberately: an unreadable dictionary means the
  // Severity-3 margin_ink_color_unmapped check below cannot be trusted
  // either way (it would silently skip, not silently pass), so nothing
  // past this point is safe to evaluate.
  if (!paletteAvailable || activeInkColorCodes === undefined) {
    return {
      canProceed: false, mode: 'PALETTE_UNAVAILABLE', highestSeverity: null,
      jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext,
      issues: [], overrideEligible: false,
    };
  }

  // Gate A/B both evaluate every specimen on the case (not just
  // params.specimenId) — completing grossing or signing out is a
  // whole-case action; see this file's own header.
  const { issues: rawIssues } = resolveInkingValidationSeverity(specimens, mode, { activeInkColorCodes });
  const issues = rawIssues.map(i => toGateIssue(i, labelBySpecimenId));
  const hasSeverity3 = issues.some(i => i.severity === 3);
  const hasSeverity2 = issues.some(i => i.severity === 2);
  const highestSeverity: InkingValidationIssue['severity'] | null = hasSeverity3 ? 3 : hasSeverity2 ? 2 : issues.length ? 1 : null;

  const userRoles = params.userRoles ?? [];
  const overrideEligible = userRoles.some(r => OVERRIDE_ELIGIBLE_ROLES.has(r));

  if (actionContext === 'GROSSING_COMPLETE') {
    // Severity 3 at Gate A has NO bypass, ever (Pete's spec, verbatim).
    if (hasSeverity3) {
      return { canProceed: false, mode: 'BLOCK', highestSeverity, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues, overrideEligible: false };
    }
    // Severity 2 at Gate A is a soft warning ("Proceed with Advisory
    // Note") regardless of inking_validation_mode — Gate A never hard-
    // blocks on Severity 2, unlike the plain resolveInkingValidationSeverity
    // check the Grossing screen already displays (which does respect
    // STRICT_ENFORCE for its own, separate "is this clean" indicator).
    if (hasSeverity2) {
      return { canProceed: true, mode: 'WARN', highestSeverity, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues, overrideEligible: false };
    }
    return { canProceed: true, mode: 'WARN', highestSeverity: null, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues: [], overrideEligible: false };
  }

  // SIGN_OUT (Gate B). Severity 2 never blocks here — advisory only.
  if (hasSeverity3) {
    return {
      canProceed: false,
      mode: overrideEligible ? 'OVERRIDE_REQUIRED' : 'BLOCK',
      highestSeverity, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues, overrideEligible,
    };
  }
  if (hasSeverity2) {
    return { canProceed: true, mode: 'WARN', highestSeverity, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues, overrideEligible: false };
  }
  return { canProceed: true, mode: 'WARN', highestSeverity: null, jurisdictionCode, inkingValidationMode: mode, caseId, facilityId, actionContext, issues: [], overrideEligible: false };
}

/** Every margin/block on a case, in the narrow shape evaluateInkingGate needs. */
export function gateSpecimensOf(c: { specimens?: readonly Specimen[] }): GateSpecimen[] {
  return (c.specimens ?? []).map(sp => ({
    id: sp.id, label: sp.label, margins: sp.margins,
    blocks: (sp.blocks ?? []) as HistologyBlock[],
  }));
}
