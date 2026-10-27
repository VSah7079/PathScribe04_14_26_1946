// src/services/cytology/recordManualHpvResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 630. The service behind the worklist's "Record Positive / Negative" buttons and the second sign-off.
// The rules are in manualHpvResult.ts; this checks the capability (cytology:hpv-result:record-manual, which writes its own
// audit line, allowed or refused), saves through the same case write every other specimen change uses, and audits the
// entry with who, when, the source, and what the specimen held before. In production the API server repeats the check
// and writes the audit entry itself.
// ─────────────────────────────────────────────────────────────────────────────
import { caseRouter } from '../cases/CaseRouter';
import { updateCaseWithRetryOrThrow } from '../cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import type { HpvManualEntryRecord } from '@/types/case/HpvManualEntry';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import {
  applyManualEntry, buildManualEntryRecord, decideOverride, manualEntryAuditDetail, manualEntryProblem, manualEntryRoute,
  overrideDecisionAuditDetail, overrideDecisionProblem, proposeOverride, type ManualEntryRoute,
} from './manualHpvResult';

export interface ManualHpvActor { id: string; name: string }

export type RecordManualHpvOutcome =
  | { outcome: 'recorded' | 'pending-second-signoff'; record: HpvManualEntryRecord }
  | { outcome: 'refused' | 'source-required' | 'result-invalid' | 'already-pending' | 'case-not-found' | 'specimen-not-found' };

export type DecideManualHpvOutcome =
  | { outcome: 'approved' | 'rejected' }
  | { outcome: 'refused' | 'same-user' | 'no-pending' | 'case-not-found' | 'specimen-not-found' };

function logAudit(event: string, detail: string, actor: ManualHpvActor, caseId: string): void {
  // The user field names the person; the detail carries the id, time and states, with no patient data.
  auditService.logEvent({ type: 'user', event, detail, user: actor.name, caseId, confidence: null }).catch(() => {});
}

export async function recordManualHpvResult(args: {
  caseId: string; specimenLetter: string; result: 'Positive' | 'Negative'; source: string; actor: ManualHpvActor;
}): Promise<RecordManualHpvOutcome> {
  const { caseId, specimenLetter, result, source, actor } = args;
  const allowed = await authorizationService.enforce('cytology:hpv-result:record-manual', { caseId });
  if (!allowed.allowed) return { outcome: 'refused' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { outcome: 'case-not-found' };

  let problem: RecordManualHpvOutcome | null = null;
  let record: HpvManualEntryRecord | null = null;
  let route: ManualEntryRoute = 'direct';
  const at = new Date().toISOString();
  const write = await updateCaseWithRetryOrThrow(caseData.id, current => {
    problem = null; record = null;
    const specimens = (current.specimens ?? []) as Specimen[];
    const target = specimens.find(sp => sp.label === specimenLetter);
    if (!target) return null;
    const screening = target.cytologyScreening;
    const p = manualEntryProblem(screening, result, source);
    if (p) { problem = { outcome: p }; return null; }
    route = manualEntryRoute(screening);
    record = buildManualEntryRecord(screening, { result, source: source as HpvManualEntryRecord['source'], userId: actor.id, userName: actor.name, at });
    const next = route === 'direct' ? applyManualEntry(screening, record) : proposeOverride(screening, record);
    return { specimens: specimens.map(sp => (sp === target ? { ...sp, cytologyScreening: next } : sp)) } as Partial<Case>;
  }, caseRouter);

  if (problem) return problem;
  if (!write.ok || !record) return { outcome: 'specimen-not-found' };

  const saved: HpvManualEntryRecord = record;
  logAudit(route === 'direct' ? 'Manual hrHPV Result Entered' : 'Manual hrHPV Result Awaiting Second Sign-Off',
    manualEntryAuditDetail(saved, specimenLetter, route), actor, caseData.id);
  return { outcome: route === 'direct' ? 'recorded' : 'pending-second-signoff', record: saved };
}

/** The second person's approval or rejection of a pending override. It must be someone other than the one who entered it. */
export async function decideManualHpvOverride(args: {
  caseId: string; specimenLetter: string; decision: 'approved' | 'rejected'; actor: ManualHpvActor;
}): Promise<DecideManualHpvOutcome> {
  const { caseId, specimenLetter, decision, actor } = args;
  const allowed = await authorizationService.enforce('cytology:hpv-result:record-manual', { caseId });
  if (!allowed.allowed) return { outcome: 'refused' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { outcome: 'case-not-found' };

  let problem: DecideManualHpvOutcome | null = null;
  let pending: HpvManualEntryRecord | null = null;
  const at = new Date().toISOString();
  const write = await updateCaseWithRetryOrThrow(caseData.id, current => {
    problem = null; pending = null;
    const specimens = (current.specimens ?? []) as Specimen[];
    const target = specimens.find(sp => sp.label === specimenLetter);
    if (!target) return null;
    const screening = target.cytologyScreening;
    const p = overrideDecisionProblem(screening, actor.id);
    if (p) { problem = { outcome: p }; return null; }
    pending = screening?.hpvPendingOverride ?? null;
    const next = decideOverride(screening, decision, { userId: actor.id, userName: actor.name, at });
    return { specimens: specimens.map(sp => (sp === target ? { ...sp, cytologyScreening: next } : sp)) } as Partial<Case>;
  }, caseRouter);

  if (problem) return problem;
  if (!write.ok || !pending) return { outcome: 'specimen-not-found' };

  logAudit(decision === 'approved' ? 'Manual hrHPV Result Override Approved' : 'Manual hrHPV Result Override Rejected',
    overrideDecisionAuditDetail(pending, { decidedById: actor.id, decidedByName: actor.name, decidedAt: at, decision }, specimenLetter), actor, caseData.id);
  return { outcome: decision };
}
