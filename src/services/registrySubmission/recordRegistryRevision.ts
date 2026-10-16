// src/services/registrySubmission/recordRegistryRevision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer, Oct 1 2026: "Post-acceptance registry
// revisions"). A registry can revise data it had already accepted (a TNM
// stage, a site code). The engine sends the normalised REGISTRY_RESPONSE_UPDATED
// JSON (registryAcknowledgement.ts); this takes it in:
//
//   1. finds the submission: by submissionGuid, or the case's accession and the
//      registry (the latest version the registry accepted);
//   2. refuses a revision of something not accepted, and a repeat of the same
//      revision (same payloadHash);
//   3. stores it on the queue entry, raises a CAPA deficiency on the case
//      ("Registry Revised Post-Acceptance", into Quality Assurance), audits;
//   4. the Registry Exceptions worklist shows it ("Revised after acceptance")
//      until someone with registry:revision:review marks it reviewed.
//
// System to system: no person's permission is involved in the intake (the API
// server authenticates the engine, PS-345). The review is a person's action.
// ─────────────────────────────────────────────────────────────────────────────

import { isRegistryRevision, parseRegistryRevisionEvent, type RegistryRevision } from './registryAcknowledgement';
import type { RegistryQueueName } from './registryExceptions';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export const REGISTRY_REVISION_DEFICIENCY_TYPE = 'def-registry-revised-post-acceptance';

interface QueueEntry {
  id: string; caseId: string; registryId: string; registryStatus?: string;
  submission?: { submissionGuid: string; submissionVersion: number };
  registryRevisions?: RegistryRevision[];
}

export interface RegistryRevisionDeps {
  queues: Record<RegistryQueueName, {
    getAll: () => Promise<Result<QueueEntry[]>>;
    setRegistryRevisions: (id: string, revisions: RegistryRevision[]) => Promise<unknown>;
  }>;
  /** The case id for an accession number (the engine names cases by accession). */
  caseIdForAccession: (accessionId: string) => Promise<string | undefined>;
  raiseDeficiency: (d: { caseId: string; deficiencyTypeId: string; comment: string; raisedBy: string }) => Promise<{ ok: boolean; data?: { id: string } }>;
  logAudit: (event: any) => unknown;
  now: () => Date;
}

export interface RecordRevisionOutcome {
  outcome: 'unparseable' | 'noSubmission' | 'unknownSubmission' | 'notAccepted' | 'duplicate' | 'recorded';
  queue?: RegistryQueueName;
  entryId?: string;
  deficiencyId?: string;
}

const ACCEPTED = ['accepted', 'acceptedWithWarnings'];

export async function recordRegistryRevision(input: { body: string }, deps: RegistryRevisionDeps): Promise<RecordRevisionOutcome> {
  const parsed = parseRegistryRevisionEvent(input.body);
  if (parsed.ok === false) {
    deps.logAudit({ type: 'system', event: 'Registry revision rejected', detail: `A registry revision event could not be read (${parsed.reason}).`, user: 'system', caseId: null, confidence: null });
    return { outcome: parsed.reason };
  }
  const caseId = parsed.submissionGuid ? undefined : await deps.caseIdForAccession(parsed.accessionId!);
  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    const all = await deps.queues[queue].getAll();
    const entries = all.ok ? all.data : [];
    const entry = parsed.submissionGuid
      ? entries.find(e => e.submission?.submissionGuid === parsed.submissionGuid)
      : entries.filter(e => (e.caseId === caseId || e.caseId === parsed.accessionId) && e.registryId === parsed.registryId && ACCEPTED.includes(e.registryStatus ?? ''))
        .sort((a, b) => (b.submission?.submissionVersion ?? 0) - (a.submission?.submissionVersion ?? 0))[0];
    if (!entry) continue;
    const where = `${entry.registryId} queue entry ${entry.id}`;
    if (!ACCEPTED.includes(entry.registryStatus ?? '')) {
      deps.logAudit({ type: 'system', event: 'Registry revision for a submission not accepted', detail: `${where}: revision ignored; the submission is ${entry.registryStatus ?? 'not answered'}.`, user: 'system', caseId: entry.caseId, confidence: null });
      return { outcome: 'notAccepted', queue, entryId: entry.id };
    }
    const prior = entry.registryRevisions ?? [];
    if (prior.some(r => r.payloadHash === parsed.revision.payloadHash)) return { outcome: 'duplicate', queue, entryId: entry.id };
    const fields = parsed.revision.updatedFields.map(f => `${f.field} → ${f.value}`).join('; ') || 'no fields listed';
    const raised = await deps.raiseDeficiency({
      caseId: entry.caseId, deficiencyTypeId: REGISTRY_REVISION_DEFICIENCY_TYPE, raisedBy: 'system',
      comment: `Registry ${entry.registryId} revised data it had accepted (submission ${entry.submission?.submissionGuid ?? entry.id}): ${fields}. [registry ${queue}:${entry.id}]`,
    });
    const revision: RegistryRevision = { ...parsed.revision, receivedAt: deps.now().toISOString(), ...(raised.ok && raised.data ? { deficiencyId: raised.data.id } : {}) };
    await deps.queues[queue].setRegistryRevisions(entry.id, [...prior, revision]);
    deps.logAudit({
      type: 'system', event: 'Registry revised after acceptance',
      detail: `${where}: the registry revised accepted data (was ${revision.previousStatus || 'accepted'}): ${fields}; payload ${revision.payloadHash}${revision.deficiencyId ? `; deficiency ${revision.deficiencyId} raised for CAPA review` : ''}.`,
      user: 'system', caseId: entry.caseId, confidence: null,
    });
    return { outcome: 'recorded', queue, entryId: entry.id, deficiencyId: revision.deficiencyId };
  }
  deps.logAudit({ type: 'system', event: 'Registry revision for an unknown submission', detail: `No accepted submission matches ${parsed.submissionGuid ?? `${parsed.accessionId} / ${parsed.registryId}`}.`, user: 'system', caseId: null, confidence: null });
  return { outcome: 'unknownSubmission' };
}

/** A person marks the revisions on a submission reviewed (registry:revision:review); the row leaves the worklist. */
export async function reviewRegistryRevision(
  input: { queue: RegistryQueueName; entryId: string },
  user: { id: string; name: string },
  deps: Pick<RegistryRevisionDeps, 'queues' | 'logAudit' | 'now'> & { enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }> },
): Promise<'notPermitted' | 'notFound' | 'nothingToReview' | 'reviewed'> {
  if (!(await deps.enforce('registry:revision:review', { queueEntryId: input.entryId })).allowed) return 'notPermitted';
  const all = await deps.queues[input.queue].getAll();
  const entry = all.ok ? all.data.find(e => e.id === input.entryId) : undefined;
  if (!entry) return 'notFound';
  const open = (entry.registryRevisions ?? []).filter(r => !r.reviewedAt);
  if (!open.length) return 'nothingToReview';
  const at = deps.now().toISOString();
  await deps.queues[input.queue].setRegistryRevisions(entry.id, (entry.registryRevisions ?? []).map(r => (r.reviewedAt ? r : { ...r, reviewedAt: at, reviewedBy: user.name || user.id })));
  deps.logAudit({ type: 'user', event: 'Registry revision reviewed', detail: `${entry.registryId} queue entry ${entry.id}: ${open.length} revision(s) after acceptance reviewed.`, user: user.name || user.id, caseId: entry.caseId, confidence: null });
  return 'reviewed';
}

/**
 * Batch 425: the one endpoint the engine posts every registry message to
 * (POST /api/registry/acknowledgements, normalised JSON only). A revision goes
 * to recordRegistryRevision, an answer to recordRegistryAcknowledgement.
 */
export async function recordRegistryResponse(
  body: string,
  deps: { revision: RegistryRevisionDeps; answer: (body: string) => Promise<{ outcome: string }> },
): Promise<{ kind: 'revision' | 'answer'; outcome: string }> {
  let parsed: any;
  try { parsed = JSON.parse(body); } catch { parsed = null; }
  if (parsed && isRegistryRevision(parsed)) return { kind: 'revision', outcome: (await recordRegistryRevision({ body }, deps.revision)).outcome };
  return { kind: 'answer', outcome: (await deps.answer(body)).outcome };
}
