// src/services/surgicalSignOut/releaseRevisionsAtSignOut.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: the corrections waiting on a re-sign-out (an instance carrying
// pendingAmendmentId), moved out of useSignOutWorkflow.finalizeSignOut.
//
//   - Assist: released first (the amendment service checks the release
//     permission), and sent to the LIS only if the release was accepted, so a
//     refused revision never goes out; then its per-instance version is saved.
//     A send that fails after the release is counted in notTransmitted (the
//     instance stays released).
//   - Orchestration: released, then sent as CORRECTED / ADDENDUM through the
//     release delay (publishReleasedRevision).
//
// What changed (sign-out audit): the release result is checked. A release the
// amendment service refuses is no longer marked finalized or published; the
// instance stays unlocked with its draft, and the caller is told how many. A
// revision is published only after the instances are saved, so a refused save
// sends nothing.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case, SynopticReportInstance } from '@/types/case/Case';
import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';

type RevisionType = AmendmentRecord['type'];
type Released = { ok: true; data: AmendmentRecord } | { ok: false; error?: string };

export interface ReleaseRevisionsDeps {
  release: (amendmentId: string, body: string) => Promise<Released>;
  /** Orchestration: CORRECTED / ADDENDUM through the release delay. */
  publish: (instance: SynopticReportInstance, record: AmendmentRecord) => Promise<unknown>;
  /** Assist: the LIS send, made only after the release was accepted. */
  sendToLis: (instance: SynopticReportInstance, body: string) => Promise<{ ok: boolean }>;
  /** Assist: the per-instance version saved after the release. */
  createAssistVersion: (instance: SynopticReportInstance) => Promise<unknown>;
  /** Saves the released instances (a versioned write; throws on a conflict). */
  saveReports: (patch: Partial<Case>) => Promise<void>;
}

export interface RevisionsOutcome {
  /** Instances released whose LIS send failed (Assist). */
  notTransmitted: number;
  /** Instances whose release the amendment service refused: left as they were. */
  notReleased: number;
  /** The saved patch, or null when nothing was released. */
  patch: Partial<Case> | null;
}

export const revisionBody = (instanceId: string) => `Synoptic instance ${instanceId} corrected and re-signed out.`;

export async function releaseRevisionsAtSignOut(caseData: Case, deps: ReleaseRevisionsDeps): Promise<RevisionsOutcome> {
  const pending = (caseData.synopticReports ?? []).filter(r => r.pendingAmendmentId);
  const releasedIds = new Set<string>();
  const releasedTypes = new Map<string, RevisionType>();
  const toPublish: { instance: SynopticReportInstance; record: AmendmentRecord }[] = [];
  let notTransmitted = 0;
  let notReleased = 0;

  for (const instance of pending) {
    const body = revisionBody(instance.instanceId);
    const released = await deps.release(instance.pendingAmendmentId!, body).catch((e: unknown) => ({ ok: false as const, error: String(e) }));
    if (released.ok === false) { notReleased += 1; continue; }
    releasedIds.add(instance.instanceId);
    if (caseData.reportingMode === 'assist') {
      const sent = await deps.sendToLis(instance, body).catch(() => ({ ok: false }));
      if (!sent.ok) notTransmitted += 1;
      await deps.createAssistVersion(instance);
      continue;
    }
    // Batch 535: the header then shows Final (Corrected / Amended).
    releasedTypes.set(instance.instanceId, released.data.type);
    toPublish.push({ instance, record: released.data });
  }

  if (releasedIds.size === 0) return { notTransmitted, notReleased, patch: null };
  const synopticReports = (caseData.synopticReports ?? []).map(r => (releasedIds.has(r.instanceId)
    ? { ...r, status: 'finalized' as const, pendingAmendmentId: undefined, previouslyFinalizedForAmendment: undefined,
        ...(releasedTypes.has(r.instanceId) ? { lastRevisionType: releasedTypes.get(r.instanceId) } : {}) }
    : r));
  const caseRevision = [...releasedTypes.values()].pop();
  const patch: Partial<Case> = { synopticReports, ...(caseRevision ? { lastRevisionType: caseRevision } : {}) };
  await deps.saveReports(patch);
  for (const p of toPublish) {
    void deps.publish(p.instance, p.record).catch(e => console.error('[releaseRevisionsAtSignOut] Correction released at sign-out not sent:', e));
  }
  return { notTransmitted, notReleased, patch };
}
