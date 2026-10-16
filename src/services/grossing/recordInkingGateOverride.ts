// src/services/grossing/recordInkingGateOverride.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up). The real enforcement + audit half of the
// Administrative Override action evaluateInkingGate.ts's OVERRIDE_REQUIRED
// mode surfaces — kept separate from that pure evaluator on purpose, same
// "decide vs. act" split grossingCompletion.ts keeps between its own pure
// checks and its one real authorizationService.enforce call.
//
// Only ever reachable for a Severity 3 issue at Gate B (SIGN_OUT) — Gate A
// has no bypass at all (evaluateInkingGate.ts never returns
// OVERRIDE_REQUIRED for GROSSING_COMPLETE), and Severity 2 never needs an
// override (it's advisory-only at both gates).
//
// Mock phase: records the InkOverrideAuditLogEntry shape (PS-519's own
// spec) as one auditService.logEvent() call, PHI-safe literal English
// detail text (standing rule: audit detail text stays literal English).
// Production (PS-345 API server): the real dbo.InkOverrideAuditLog SQL
// table, written by the real /inking/override endpoint — that endpoint,
// and its own server-side RBAC check, are genuinely backend-only and not
// built here (no API server exists yet to build them on).
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuthorizationService } from '../authorization/authorizationService';
import type { IAuditService } from '../auditlog/IAuditService';
import type { InkingGateIssue, InkingGateOverrideReasonCode, InkOverrideAuditLogEntry } from './evaluateInkingGate';
import type { InkingGateJurisdictionProfile } from './jurisdictionInkingGateMessages';
import type { InkingValidationMode } from './resolveInkingValidationSeverity';

export const INKING_GATE_OVERRIDE_CAPABILITY = 'case:inking-gate:override';

export interface RecordInkingGateOverrideInput {
  caseId: string;
  specimenId: string;
  facilityId: string;
  jurisdictionCode: InkingGateJurisdictionProfile;
  inkingValidationMode: InkingValidationMode;
  unresolvedIssues: InkingGateIssue[];
  overrideReasonCode: InkingGateOverrideReasonCode;
  /** Free text — only meaningful (and only ever sent by the UI) alongside 'OTHER'. */
  overrideReasonText?: string;
  overrideByUserId: string;
  overrideByUserName: string;
  overrideRole: string;
}

export type RecordInkingGateOverrideResult =
  | { ok: true; entry: InkOverrideAuditLogEntry }
  | { ok: false; notPermitted: true };

export interface RecordInkingGateOverrideDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  audit: Pick<IAuditService, 'logEvent'>;
}

/**
 * Enforces case:inking-gate:override, then records the override as an
 * audit entry. Severity 3 at Sign-Out ONLY — never called for Gate A
 * (which has no override at all) or for a Severity 2 issue (which never
 * needed one).
 */
export async function recordInkingGateOverride(
  input: RecordInkingGateOverrideInput,
  deps: RecordInkingGateOverrideDeps,
): Promise<RecordInkingGateOverrideResult> {
  const decision = await deps.authorization.enforce(INKING_GATE_OVERRIDE_CAPABILITY, { caseId: input.caseId, facilityId: input.facilityId });
  if (!decision.allowed) return { ok: false, notPermitted: true };

  const auditId = `inking-override-${input.caseId}-${input.specimenId}-${Date.now()}`;
  const timestampUTC = new Date().toISOString();
  const entry: InkOverrideAuditLogEntry = {
    auditId, timestampUTC,
    facilityId: input.facilityId, caseId: input.caseId,
    jurisdictionCode: input.jurisdictionCode, inkingValidationMode: input.inkingValidationMode,
    specimenId: input.specimenId,
    overrideByUserId: input.overrideByUserId, overrideRole: input.overrideRole,
    overrideReasonCode: input.overrideReasonCode, overrideReasonText: input.overrideReasonText,
    unresolvedIssues: input.unresolvedIssues,
  };

  const issueSummary = input.unresolvedIssues.map(i => `${i.code} (specimen ${i.specimenDisplayName ?? i.specimenId}, margin ${i.marginId})`).join('; ');
  await deps.audit.logEvent({
    type: 'user', event: 'Inking gate override', user: input.overrideByUserName, caseId: input.caseId, confidence: null,
    facilityId: input.facilityId,
    detail: `Administrative Override of the Structured Inking sign-out gate (Severity 3) by ${input.overrideByUserName} (${input.overrideRole}). `
      + `Reason: ${input.overrideReasonCode}${input.overrideReasonText ? ` — ${input.overrideReasonText}` : ''}. `
      + `Unresolved issue(s): ${issueSummary || 'none recorded'}. Audit ref ${auditId}.`,
  });

  return { ok: true, entry };
}
