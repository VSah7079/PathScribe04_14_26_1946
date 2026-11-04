// src/services/clinical/aiInstructions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-554, Pete's decisions of Oct 11, 2026): the instructions the
// mismatch check gives the AI become configuration, governed like a protocol.
// Pure.
//
// What is governed: for each discipline (surgical, cytology, autopsy), the
// instructions that say what counts as a mismatch. What stays fixed in code:
// the case data block the check fills in and the JSON answer format, because
// the check reads that answer (parseMismatchResponse) and an edit there would
// break it silently.
//
//   - PathScribe's own text (version 0) is approved with the release;
//   - an edit makes a new version, pending approval; the check keeps using the
//     last approved version until it is approved (the edited text is never
//     used unapproved);
//   - a new edit replaces a pending version (it is withdrawn): an approval
//     always covers the exact text approved;
//   - approving or rejecting needs config:ai-prompt:approve, and nobody who
//     edited the pending text (since the last approval) can approve it;
//   - approving supersedes the previously approved version;
//   - a rejection keeps the approved version in use and records why.
// Every edit, approval and rejection is audited (AI_PROMPT_EDITED,
// AI_PROMPT_APPROVED, AI_PROMPT_REJECTED), with the version number.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';

export const AI_INSTRUCTION_DISCIPLINES = ['surgical', 'cytology', 'autopsy'] as const;
export type AiInstructionDiscipline = (typeof AI_INSTRUCTION_DISCIPLINES)[number];

export type AiInstructionStatus = 'pending' | 'approved' | 'rejected' | 'superseded' | 'withdrawn';

export interface AiInstructionActor { userId: string; userName: string }

export interface AiInstructionVersion {
  id: string;
  discipline: AiInstructionDiscipline;
  /** 0 is PathScribe's own text; each edit adds one. */
  version: number;
  text: string;
  status: AiInstructionStatus;
  editedBy: AiInstructionActor;
  editedAt: string;
  /** Everyone who edited this text since the last approval: none of them may approve it. */
  editors: string[];
  approvedBy?: AiInstructionActor;
  approvedAt?: string;
  rejectedBy?: AiInstructionActor;
  rejectedAt?: string;
  rejectionReason?: string;
  /** When it stopped being in use (superseded) or was replaced before a decision (withdrawn). */
  closedAt?: string;
}

/** Longest instruction text accepted (the model's prompt has a budget). */
export const MAX_AI_INSTRUCTION_LENGTH = 6000;

const MALIGNANCY_RULES = (discipline: 'surgical' | 'cytology') => `Flag a mismatch only when the findings meaningfully contradict the clinical picture:
- "unexpected-malignancy": a malignancy in a case the clinician plainly expected to be routine or benign. If the clinician raised malignancy at all (including "rule out", "suspicious for", "concern for"), it is NOT unexpected.${discipline === 'cytology' ? `
  An abnormal or malignant result in a screening or surveillance specimen (a cervical screen, for example) is what screening is for: NOT unexpected.` : ''}
- "expected-malignancy-absent": the clinician clearly expected a malignancy (e.g. a known mass on imaging) and none is found, in a way that suggests a sampling or specimen problem.
- "site-or-organ": the ${discipline === 'cytology' ? 'cells or site do' : 'tissue or site does'} not match the procedure or site the order describes.
- "other": any other contradiction a reasonable pathologist would want to reconcile before sign-out.
A finding that merely adds detail, or a benign result in a benign workup, is NOT a mismatch.`;

/** PathScribe's own instructions (version 0), as used since Batch 523. */
export const BUILT_IN_AI_INSTRUCTIONS: Readonly<Record<AiInstructionDiscipline, string>> = {
  surgical: MALIGNANCY_RULES('surgical'),
  cytology: MALIGNANCY_RULES('cytology'),
  autopsy: `Flag a mismatch only when the autopsy meaningfully contradicts what was known in life:
- "cause-of-death": the cause of death, or a major clinical diagnosis, found at autopsy differs from the clinical one in a way that could have changed treatment or outcome (Goldman class I or II).
- "unexpected-malignancy": a malignancy found at autopsy that was never diagnosed or suspected in life.
- "other": any other major discrepancy a reasonable pathologist would want to record.
Incidental findings that wouldn't have changed management are NOT a mismatch.`,
};

export const BUILT_IN_AUTHOR: AiInstructionActor = { userId: 'pathscribe', userName: 'PathScribe (built in)' };

export function builtInInstructionVersion(discipline: AiInstructionDiscipline): AiInstructionVersion {
  return {
    id: `ai-instruction-${discipline}-0`, discipline, version: 0, text: BUILT_IN_AI_INSTRUCTIONS[discipline], status: 'approved',
    editedBy: BUILT_IN_AUTHOR, editedAt: '2026-10-11T00:00:00.000Z', editors: [],
    approvedBy: BUILT_IN_AUTHOR, approvedAt: '2026-10-11T00:00:00.000Z',
  };
}

/** Every version of a discipline's instructions, the built-in one first (version order). */
export function instructionHistory(stored: readonly AiInstructionVersion[], discipline: AiInstructionDiscipline): AiInstructionVersion[] {
  const own = stored.filter(v => v.discipline === discipline);
  const builtIn = builtInInstructionVersion(discipline);
  // Once another version is approved, the built-in one is no longer in use.
  const anyApproved = own.some(v => v.status === 'approved' || v.status === 'superseded');
  const zero = anyApproved ? { ...builtIn, status: 'superseded' as const } : builtIn;
  return [zero, ...own].sort((a, b) => a.version - b.version);
}

/** The approved instructions the check uses: the latest approved version, else PathScribe's own. */
export function approvedInstruction(stored: readonly AiInstructionVersion[], discipline: AiInstructionDiscipline): AiInstructionVersion {
  const approved = stored.filter(v => v.discipline === discipline && v.status === 'approved').sort((a, b) => b.version - a.version);
  return approved[0] ?? builtInInstructionVersion(discipline);
}

/** The version awaiting approval, if any. */
export function pendingInstruction(stored: readonly AiInstructionVersion[], discipline: AiInstructionDiscipline): AiInstructionVersion | null {
  return stored.filter(v => v.discipline === discipline && v.status === 'pending').sort((a, b) => b.version - a.version)[0] ?? null;
}

export type AiInstructionDraftProblem = 'empty' | 'tooLong' | 'unchanged';

/** Why this text can't be saved as a new version, or null. */
export function aiInstructionDraftProblem(stored: readonly AiInstructionVersion[], discipline: AiInstructionDiscipline, text: string): AiInstructionDraftProblem | null {
  const t = text.trim();
  if (!t) return 'empty';
  if (t.length > MAX_AI_INSTRUCTION_LENGTH) return 'tooLong';
  const latest = pendingInstruction(stored, discipline) ?? approvedInstruction(stored, discipline);
  if (latest.text.trim() === t) return 'unchanged';
  return null;
}

/**
 * The new version for an edit, and the pending one it replaces (withdrawn).
 * Its editors carry over from the version it replaces, so no one who touched
 * the text since the last approval can approve it.
 */
export function newInstructionVersion(
  stored: readonly AiInstructionVersion[], discipline: AiInstructionDiscipline, text: string,
  by: AiInstructionActor, now: string, id: string,
): { version: AiInstructionVersion; withdrawn: AiInstructionVersion | null } {
  const pending = pendingInstruction(stored, discipline);
  const next = Math.max(0, ...stored.filter(v => v.discipline === discipline).map(v => v.version)) + 1;
  const editors = [...new Set([...(pending?.editors ?? []), by.userId])];
  return {
    version: { id, discipline, version: next, text: text.trim(), status: 'pending', editedBy: by, editedAt: now, editors },
    withdrawn: pending ? { ...pending, status: 'withdrawn', closedAt: now } : null,
  };
}

export type AiInstructionDecisionRefusal = 'notFound' | 'notPending' | 'SELF_APPROVAL' | 'reasonRequired';

/** Why this person can't approve or reject this version now, or null. */
export function aiInstructionDecisionRefusal(
  version: AiInstructionVersion | undefined, by: AiInstructionActor, decision: 'approve' | 'reject', reason?: string,
): AiInstructionDecisionRefusal | null {
  if (!version) return 'notFound';
  if (version.status !== 'pending') return 'notPending';
  if (decision === 'approve' && version.editors.includes(by.userId)) return 'SELF_APPROVAL';
  if (decision === 'reject' && !reason?.trim()) return 'reasonRequired';
  return null;
}

/** The stored versions after approving one: it is approved, the one in use before is superseded. */
export function applyApproval(stored: readonly AiInstructionVersion[], id: string, by: AiInstructionActor, now: string): AiInstructionVersion[] {
  const target = stored.find(v => v.id === id)!;
  return stored.map(v => {
    if (v.id === id) return { ...v, status: 'approved' as const, approvedBy: by, approvedAt: now };
    if (v.discipline === target.discipline && v.status === 'approved') return { ...v, status: 'superseded' as const, closedAt: now };
    return v;
  });
}

export function applyRejection(stored: readonly AiInstructionVersion[], id: string, by: AiInstructionActor, reason: string, now: string): AiInstructionVersion[] {
  return stored.map(v => (v.id === id ? { ...v, status: 'rejected' as const, rejectedBy: by, rejectedAt: now, rejectionReason: reason.trim(), closedAt: now } : v));
}

const DISCIPLINE_TEXT: Record<AiInstructionDiscipline, string> = { surgical: 'surgical', cytology: 'cytology', autopsy: 'autopsy' };
const quote = (t: string) => (t.length > 300 ? `${t.slice(0, 300)}…` : t);

/** Audit entries (literal English). Pure. */
export function aiInstructionAudit(
  kind: 'edited' | 'approved' | 'rejected', version: AiInstructionVersion, actorName: string, extra: { previousText?: string; reason?: string; supersededVersion?: number } = {},
): NewAuditLog {
  const what = `AI instructions for the ${DISCIPLINE_TEXT[version.discipline]} mismatch check, version ${version.version}`;
  const detail = kind === 'edited'
    ? `${what} saved, pending approval (the check keeps using the approved version until then). Was: "${quote(extra.previousText ?? '')}". Now: "${quote(version.text)}".`
    : kind === 'approved'
      ? `${what} approved; the check now uses it${extra.supersededVersion !== undefined ? ` (replaces version ${extra.supersededVersion})` : ''}. Edited by ${version.editedBy.userName}.`
      : `${what} rejected: ${extra.reason ?? ''}. The approved version stays in use.`;
  return {
    type: 'user', event: kind === 'edited' ? 'AI_PROMPT_EDITED' : kind === 'approved' ? 'AI_PROMPT_APPROVED' : 'AI_PROMPT_REJECTED',
    caseId: null, user: actorName, confidence: null, detail,
  };
}
