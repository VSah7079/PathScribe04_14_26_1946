// src/services/cases/postCaseComment.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: posting a case-level or specimen-level comment, moved out of SynopticReportPage (which only built the
// record and saved it) so the post can be audited where it is done.
//
// Comments are append-only (types/case/CaseComment.ts): a new record is added to the thread, nothing is overwritten.
// The save itself is the page's versioned patch save (`savePatch`: conflicts and merge reviews are thrown from it and
// stay the page's to handle); once it has succeeded one audit entry is written, never before and never when the save
// throws.
//
// PHI rule: the comment text is NEVER written to the audit entry (it is free text and routinely names the patient).
// The entry carries only that a comment was added, its id, its length, and for a specimen comment the specimen id.
// Literal English (audit text is a compliance artifact, not UI).
//
// LIS: a comment posted here is stored as origin 'pathscribe', syncStatus 'pending'. See KNOWN_GAPS.md: case and
// specimen comments are not printed on the report and no HL7 message carries them today.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { CaseComment } from '@/types/case/CaseComment';
import type { IAuditService, NewAuditLog } from '../auditlog/IAuditService';
import { auditService as defaultAuditService } from '../auditlog/auditServiceInstance';

export type CommentKind = 'case' | 'specimen';

export interface PostCommentInput {
  kind: CommentKind;
  caseData: Case;
  /** The case's current comment thread (kind 'case'); a specimen's own thread is read from the case. */
  caseComments?: readonly CaseComment[];
  /** Required for kind 'specimen'. */
  specimenId?: string | null;
  text: string;
  author: { id: string; name: string };
  stationId?: string | null;
}

export interface PostCommentDeps {
  savePatch: (caseId: string, patch: Partial<Case>) => Promise<void>;
  auditService?: Pick<IAuditService, 'logEvent'>;
  newId?: () => string;
  now?: () => string;
}

export type PostCommentResult =
  | { ok: true; patch: Partial<Case>; comment: CaseComment }
  | { ok: false; reason: 'noCase' | 'noSpecimen' };

const defaultId = () => `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** The audit entry for a posted comment. Pure; the text is not an input. */
export function commentAuditEntry(kind: CommentKind, caseData: Pick<Case, 'id' | 'order'>, comment: Pick<CaseComment, 'id' | 'text'>, authorName: string, specimenId?: string | null): NewAuditLog {
  const where = kind === 'specimen' ? `specimen ${specimenId}` : 'the case';
  return {
    type: 'user', event: kind === 'specimen' ? 'Specimen comment added' : 'Case comment added',
    detail: `Comment ${comment.id} (${comment.text.length} characters) added to ${where}. The text is not recorded in the audit log.`,
    user: authorName, caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null, confidence: null,
  };
}

export async function postCaseComment(input: PostCommentInput, deps: PostCommentDeps): Promise<PostCommentResult> {
  const { caseData, kind } = input;
  if (!caseData?.id) return { ok: false, reason: 'noCase' };
  const comment: CaseComment = {
    id: (deps.newId ?? defaultId)(),
    authorId: input.author.id,
    authorName: input.author.name,
    text: input.text,
    createdAt: (deps.now ?? (() => new Date().toISOString()))(),
    origin: 'pathscribe',
    syncStatus: 'pending',
    stationId: input.stationId ?? null,
  };
  let patch: Partial<Case>;
  if (kind === 'case') {
    patch = { order: { ...caseData.order, caseComments: [...(input.caseComments ?? []), comment] } } as Partial<Case>;
  } else {
    const specimens = caseData.specimens ?? [];
    if (!specimens.some(sp => sp.id === input.specimenId)) return { ok: false, reason: 'noSpecimen' };
    patch = { specimens: specimens.map(sp => (sp.id === input.specimenId ? { ...sp, comments: [...(sp.comments ?? []), comment] } : sp)) } as Partial<Case>;
  }
  await deps.savePatch(caseData.id, patch); // throws on a conflict or review: nothing is audited then
  try { await (deps.auditService ?? defaultAuditService).logEvent(commentAuditEntry(kind, caseData, comment, input.author.name, input.specimenId)); }
  catch { /* an audit failure never undoes a posted comment */ }
  return { ok: true, patch, comment };
}
