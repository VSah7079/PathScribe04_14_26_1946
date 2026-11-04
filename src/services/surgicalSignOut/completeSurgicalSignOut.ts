// src/services/surgicalSignOut/completeSurgicalSignOut.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (sign-out audit): the writes that complete a surgical Sign Out
// Case, in an order that can't leave a version and a signature saved for a
// case whose status never moved.
//
// Before, the version and the signature record were written first and the
// status last; a concurrency conflict at the status write left a signed,
// versioned report on a case still "in progress". Now:
//
//   1. status (pending-release or finalized): the versioned write that can
//      conflict goes first; a conflict stops here with nothing else written;
//   2. the attending's countersign, on a case released for countersign
//      (a failure is reported, not swallowed);
//   3. corrections and addenda waiting on this sign-out (releaseRevisionsAtSignOut);
//   4. the immutable report version (PDF and its SHA-256);
//   5. the signature record, linked to that exact version and hash.
//
// A failure at 2-4 puts the status back as it was (compensation), so the case,
// its versions and its signatures stay consistent. Until the API server does
// all of this in one transaction (planned), a version already written stays
// (versions are append-only). The resident's release for countersign follows
// the same order (commitCountersignRelease). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { ReleaseBufferResolution } from '../reportRelease/IReportReleaseService';
import type { SignatureRecord, SignatureRecordLink } from '../signatures/ISignatureRecordService';

type StepResult<T = unknown> = { ok: true; data: T } | { ok: false; error?: string };

/** The signature's link to the exact version it signed. */
export function reportVersionLink(version: Pick<ReportVersionRecord, 'id' | 'versionNumber' | 'pdfSha256'> | null | undefined): SignatureRecordLink {
  return {
    kind: 'report-version',
    ...(version?.id ? { id: version.id } : {}),
    ...(typeof version?.versionNumber === 'number' ? { versionNumber: version.versionNumber } : {}),
    ...(version?.pdfSha256 ? { pdfSha256: version.pdfSha256 } : {}),
  };
}

const STATUS_FIELDS = ['status', 'finalizedAt', 'finalizedBy', 'releasedAt', 'releaseBufferExpiresAt', 'releaseBufferDurationMinutes', 'preReleaseBufferStatus'] as const;

/** The sign-out's status patch: held for the release delay, or released now. */
export function buildSignOutStatusPatch(caseData: Pick<Case, 'status'>, buffer: ReleaseBufferResolution, now: Date, signerId: string | null): Partial<Case> {
  const finalizedAt = now.toISOString();
  return {
    status: (buffer.applies ? 'pending-release' : 'finalized') as CaseStatus,
    finalizedAt,
    finalizedBy: signerId,
    releasedAt: buffer.applies ? undefined : finalizedAt,
    releaseBufferExpiresAt: buffer.applies ? new Date(now.getTime() + buffer.durationMinutes * 60_000).toISOString() : undefined,
    releaseBufferDurationMinutes: buffer.applies ? buffer.durationMinutes : undefined,
    preReleaseBufferStatus: buffer.applies ? caseData.status : undefined,
  } as Partial<Case>;
}

/** What puts the status fields back as they were before the sign-out. */
export function statusRevertPatch(before: Case): Partial<Case> {
  const out: Record<string, unknown> = {};
  for (const k of STATUS_FIELDS) out[k] = (before as unknown as Record<string, unknown>)[k];
  return out as Partial<Case>;
}

export interface CompleteSignOutDeps {
  /** A versioned write of the case at the caller's known version; throws on a conflict. */
  update: (patch: Partial<Case>) => Promise<void>;
  resolveBuffer: (c: Case) => Promise<ReleaseBufferResolution>;
  /** The attending's countersign (only called for a case in 'pending-countersign'). */
  completeCountersign?: () => Promise<StepResult>;
  /** Releases what waits on this sign-out; throws when its own write fails. */
  releaseRevisions: () => Promise<void>;
  createVersion: () => Promise<StepResult<ReportVersionRecord>>;
  commitSignature: (link?: SignatureRecordLink) => Promise<SignatureRecord | null>;
  now: () => Date;
}

export type SignOutStep = 'status' | 'countersign' | 'revisions' | 'version';

export type SignOutCompletion =
  | { ok: true; statusPatch: Partial<Case> | null; buffer: ReleaseBufferResolution | null; version: ReportVersionRecord | null; signature: SignatureRecord | null }
  | { ok: false; step: SignOutStep; error: unknown; statusPatch: Partial<Case> | null; compensated: boolean };

const errorOf = (r: StepResult | undefined, fallback: string) => (r && r.ok === false && r.error) || fallback;

/**
 * Completes a surgical sign-out. `orchestration` cases get the status write and
 * the whole-case version; otherwise (no PathScribe-owned status) only the
 * countersign, revisions and signature.
 */
export async function completeSurgicalSignOut(
  input: { caseData: Case; orchestration: boolean; signerId: string | null },
  deps: CompleteSignOutDeps,
): Promise<SignOutCompletion> {
  const { caseData, orchestration } = input;
  let statusPatch: Partial<Case> | null = null;
  let buffer: ReleaseBufferResolution | null = null;

  if (orchestration) {
    buffer = await deps.resolveBuffer(caseData);
    statusPatch = buildSignOutStatusPatch(caseData, buffer, deps.now(), input.signerId);
    try { await deps.update(statusPatch); } catch (error) { return { ok: false, step: 'status', error, statusPatch: null, compensated: true }; }
  }

  const fail = async (step: SignOutStep, error: unknown): Promise<SignOutCompletion> => {
    if (!statusPatch) return { ok: false, step, error, statusPatch, compensated: true };
    try { await deps.update(statusRevertPatch(caseData)); return { ok: false, step, error, statusPatch, compensated: true }; } catch (e) {
      console.error('[completeSurgicalSignOut] The status could not be put back after a failed sign-out step:', e);
      return { ok: false, step, error, statusPatch, compensated: false };
    }
  };

  if (caseData.status === 'pending-countersign' && deps.completeCountersign) {
    const r = await deps.completeCountersign().catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (r.ok === false) return fail('countersign', errorOf(r, 'countersign failed'));
  }

  try { await deps.releaseRevisions(); } catch (error) { return fail('revisions', error); }

  let version: ReportVersionRecord | null = null;
  if (orchestration) {
    const v = await deps.createVersion().catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (v.ok === false) return fail('version', errorOf(v, 'version not saved'));
    version = v.data;
  }

  const signature = await deps.commitSignature(orchestration ? reportVersionLink(version) : undefined);
  return { ok: true, statusPatch, buffer, version, signature };
}

export interface CountersignReleaseDeps {
  update: (patch: Partial<Case>) => Promise<void>;
  createVersion: () => Promise<StepResult<ReportVersionRecord>>;
  releaseForCountersign: () => Promise<StepResult>;
  commitSignature: (link?: SignatureRecordLink) => Promise<SignatureRecord | null>;
}

/** A trainee's release for countersign, in the same order: status first, then version, the countersign record and the linked signature. */
export async function commitCountersignRelease(caseData: Case, deps: CountersignReleaseDeps): Promise<SignOutCompletion> {
  const statusPatch: Partial<Case> = {
    status: 'pending-countersign' as CaseStatus,
    synopticReports: (caseData.synopticReports ?? []).map(r => (r.status === 'draft' ? { ...r, status: 'pending-countersign' as const } : r)),
  };
  try { await deps.update(statusPatch); } catch (error) { return { ok: false, step: 'status', error, statusPatch: null, compensated: true }; }
  const fail = async (step: SignOutStep, error: unknown): Promise<SignOutCompletion> => {
    try { await deps.update({ status: caseData.status, synopticReports: caseData.synopticReports }); return { ok: false, step, error, statusPatch, compensated: true }; } catch (e) {
      console.error('[commitCountersignRelease] The status could not be put back:', e);
      return { ok: false, step, error, statusPatch, compensated: false };
    }
  };
  const v = await deps.createVersion().catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
  if (v.ok === false) return fail('version', errorOf(v, 'version not saved'));
  const released = await deps.releaseForCountersign().catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
  if (released.ok === false) return fail('countersign', errorOf(released, 'countersign release failed'));
  const signature = await deps.commitSignature(reportVersionLink(v.data));
  return { ok: true, statusPatch, buffer: null, version: v.data, signature };
}
