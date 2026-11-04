// src/services/clinical/aiInstructionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-554): the governed AI instructions for the mismatch check
// (Configuration → System → AI Instructions). Rules in aiInstructions.ts.
//
//   list()               needs config:ai-prompt:view (Lab Director and QA
//                        Reviewer by default);
//   saveDraft()          needs config:ai-prompt:edit (no built-in role; each
//                        hospital grants it). A new version, pending;
//                        AI_PROMPT_EDITED;
//   approve() / reject() need config:ai-prompt:approve (Lab Director; never
//                        Superadmin, Pete Oct 11). Not by anyone who edited the
//                        text (SELF_APPROVAL); AI_PROMPT_APPROVED / _REJECTED;
//   test()               runs the check on a sample with a draft, before it
//                        is approved, for someone who may edit or approve. The
//                        draft is never used for a real case;
//   instructionsForCheck() the approved text the check uses: a system read.
//
// In production the API server holds the versions and makes the same checks
// (docs/architecture/AUTHORIZATION_API.md). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { ClinicalMismatchInput, ClinicalMismatchSuggestion } from './detectClinicalPathologicMismatch';
import {
  AI_INSTRUCTION_DISCIPLINES, aiInstructionAudit, aiInstructionDecisionRefusal, aiInstructionDraftProblem, applyApproval, applyRejection,
  approvedInstruction, instructionHistory, newInstructionVersion, pendingInstruction,
  type AiInstructionActor, type AiInstructionDecisionRefusal, type AiInstructionDiscipline, type AiInstructionDraftProblem, type AiInstructionVersion,
} from './aiInstructions';

export const AI_PROMPT_VIEW = 'config:ai-prompt:view';
export const AI_PROMPT_EDIT = 'config:ai-prompt:edit';
export const AI_PROMPT_APPROVE = 'config:ai-prompt:approve';
export const AI_INSTRUCTIONS_STORAGE_KEY = 'pathscribe_ai_instructions';

export type AiInstructionError = 'CONFIG_NOT_PERMITTED' | AiInstructionDraftProblem | AiInstructionDecisionRefusal;

export interface AiInstructionsView {
  discipline: AiInstructionDiscipline;
  approved: AiInstructionVersion;
  pending: AiInstructionVersion | null;
  /** Every version, newest first. */
  history: AiInstructionVersion[];
}

export type AiInstructionTestResult =
  | { outcome: 'mismatch'; suggestion: ClinicalMismatchSuggestion }
  | { outcome: 'none' }
  /** The AI service isn't allowed for this jurisdiction (PS-558). */
  | { outcome: 'notAllowed' }
  /** The AI couldn't be reached or gave no usable answer. */
  | { outcome: 'unavailable'; message: string };

export interface IAiInstructionService {
  list(): Promise<ServiceResult<AiInstructionsView[]>>;
  saveDraft(discipline: AiInstructionDiscipline, text: string): Promise<ServiceResult<AiInstructionsView[]>>;
  approve(versionId: string): Promise<ServiceResult<AiInstructionsView[]>>;
  reject(versionId: string, reason: string): Promise<ServiceResult<AiInstructionsView[]>>;
  test(discipline: AiInstructionDiscipline, text: string, sample: ClinicalMismatchInput): Promise<ServiceResult<AiInstructionTestResult>>;
  instructionsForCheck(discipline: AiInstructionDiscipline): Promise<{ text: string; version: number }>;
}

export interface AiInstructionDeps {
  read(): AiInstructionVersion[] | null;
  write(versions: AiInstructionVersion[]): void;
  enforce(capability: string): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actor(): AiInstructionActor;
  now(): Date;
  newId(): string;
  /** Asks the AI with these instructions (the Test panel): the answer, or null for no mismatch; throws when the AI can't be asked. */
  runCheck(input: ClinicalMismatchInput, instructions: { text: string; version: number }): Promise<ClinicalMismatchSuggestion | null>;
  /** Whether a thrown error means the jurisdiction's AI vendor policy refused the call. */
  notAllowed(e: unknown): boolean;
  refused?(capability: string): void;
}

const fail = <T>(error: AiInstructionError): ServiceResult<T> => ({ ok: false, error });

export function aiInstructionsView(stored: readonly AiInstructionVersion[]): AiInstructionsView[] {
  return AI_INSTRUCTION_DISCIPLINES.map(discipline => ({
    discipline,
    approved: approvedInstruction(stored, discipline),
    pending: pendingInstruction(stored, discipline),
    history: instructionHistory(stored, discipline).reverse(),
  }));
}

export function createAiInstructionService(deps: AiInstructionDeps): IAiInstructionService {
  const stored = () => deps.read() ?? [];
  const permitted = async (decision: Promise<{ allowed: boolean }>, capability: string) => {
    const d = await decision;
    if (!d.allowed) deps.refused?.(capability);
    return d.allowed;
  };
  const decide = async (versionId: string, decision: 'approve' | 'reject', reason?: string): Promise<ServiceResult<AiInstructionsView[]>> => {
    if (!(await permitted(deps.enforce('config:ai-prompt:approve'), AI_PROMPT_APPROVE))) return fail('CONFIG_NOT_PERMITTED');
    const versions = stored();
    const target = versions.find(v => v.id === versionId);
    const by = deps.actor();
    const refusal = aiInstructionDecisionRefusal(target, by, decision, reason);
    if (refusal) return fail(refusal);
    const now = deps.now().toISOString();
    if (decision === 'approve') {
      const before = approvedInstruction(versions, target!.discipline);
      const next = applyApproval(versions, versionId, by, now);
      deps.write(next);
      await deps.audit(aiInstructionAudit('approved', target!, by.userName, { supersededVersion: before.version })).catch(() => {});
      return { ok: true, data: aiInstructionsView(next) };
    }
    const next = applyRejection(versions, versionId, by, reason!, now);
    deps.write(next);
    await deps.audit(aiInstructionAudit('rejected', target!, by.userName, { reason: reason!.trim() })).catch(() => {});
    return { ok: true, data: aiInstructionsView(next) };
  };

  return {
    async list() {
      if (!(await permitted(deps.enforce('config:ai-prompt:view'), AI_PROMPT_VIEW))) return fail('CONFIG_NOT_PERMITTED');
      return { ok: true, data: aiInstructionsView(stored()) };
    },

    async saveDraft(discipline, text) {
      if (!(await permitted(deps.enforce('config:ai-prompt:edit'), AI_PROMPT_EDIT))) return fail('CONFIG_NOT_PERMITTED');
      const versions = stored();
      const problem = aiInstructionDraftProblem(versions, discipline, text);
      if (problem) return fail(problem);
      const previous = pendingInstruction(versions, discipline) ?? approvedInstruction(versions, discipline);
      const by = deps.actor();
      const { version, withdrawn } = newInstructionVersion(versions, discipline, text, by, deps.now().toISOString(), `ai-instruction-${deps.newId()}`);
      const next = [...versions.map(v => (withdrawn && v.id === withdrawn.id ? withdrawn : v)), version];
      deps.write(next);
      await deps.audit(aiInstructionAudit('edited', version, by.userName, { previousText: previous.text })).catch(() => {});
      return { ok: true, data: aiInstructionsView(next) };
    },

    approve: versionId => decide(versionId, 'approve'),
    reject: (versionId, reason) => decide(versionId, 'reject', reason),

    async test(discipline, text, sample) {
      const edit = await deps.enforce('config:ai-prompt:edit');
      const approve = edit.allowed ? edit : await deps.enforce('config:ai-prompt:approve');
      if (!approve.allowed) { deps.refused?.(AI_PROMPT_EDIT); return fail('CONFIG_NOT_PERMITTED'); }
      if (!text.trim()) return fail('empty');
      try {
        const suggestion = await deps.runCheck({ ...sample, discipline }, { text, version: -1 });
        return { ok: true, data: suggestion ? { outcome: 'mismatch', suggestion } : { outcome: 'none' } };
      } catch (e) {
        if (deps.notAllowed(e)) return { ok: true, data: { outcome: 'notAllowed' } };
        return { ok: true, data: { outcome: 'unavailable', message: e instanceof Error ? e.message : String(e) } };
      }
    },

    async instructionsForCheck(discipline) {
      const v = approvedInstruction(stored(), discipline);
      return { text: v.text, version: v.version };
    },
  };
}
