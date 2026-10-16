// src/services/reportRelease/releaseReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 534 (Pete, Oct 12, 2026: "Any report output, unless it's a
// resubmission to an output failure, should follow the consistent delay
// rule"; recall "reopens, like sign-out"; only the person who released it may
// recall it; the STAT bypass applies the same way to every output).
//
// Every report release that isn't the surgical FINAL sign-out (which keeps
// its own buffer on the case: mockReportReleaseService) goes through
// releaseReport():
//
//   - the laboratory's delay doesn't apply (switched off, or STAT with the
//     STAT bypass on): the report is published at once, with what goes with
//     it (a registry submission);
//   - it applies: the report waits (HeldRelease, mockHeldReleaseService),
//     with its PDF as it was when released, until releaseDueReports() sends it,
//     or the person who released it recalls it (recallHeldRelease), which
//     reopens what was released (reopenHeldRelease.ts) and sends nothing.
//
// A resend after a failed output (the outbound and delivery queues' retries)
// never comes through here, so it is never delayed. Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';
import type { ReportReleasedEvent, ReportReleasedEventResult } from '../reports/publishReportReleasedEvent';
import type { ReleaseBufferResolution } from './IReportReleaseService';
import type { IHeldReleaseService } from './mockHeldReleaseService';
import type { HeldRelease, HeldReleaseFollowUp, HeldReleaseKind } from '@/types/reportRelease/HeldRelease';
import { heldRecallRefusal, heldReleaseDue, type HeldRecallRefusal } from './heldReleaseRules';

export interface ReleaseReportDeps {
  /** The delay for this case (enterprise default, performing-lab override, STAT bypass). */
  resolveDelay: (caseId: string) => Promise<ReleaseBufferResolution>;
  held: IHeldReleaseService;
  publish: (event: ReportReleasedEvent) => Promise<ReportReleasedEventResult>;
  runFollowUp: (followUp: HeldReleaseFollowUp, caseId: string) => Promise<void>;
  reopen: (held: HeldRelease, by: { userId: string; userName: string }) => Promise<void>;
  /** Batch 535: a reason it can't be reopened now (a PAD the FAD is already signed on), or null. */
  recallBlocked?: (held: HeldRelease) => Promise<'superseded' | null>;
  audit: (entry: NewAuditLog) => Promise<unknown>;
  /** A surgical FINAL sign-out's buffer has run out: release it on the case (reportReleaseService.checkAndReleaseIfExpired). */
  releaseSignOut: (caseId: string) => Promise<unknown>;
  now: () => Date;
  newId: () => string;
}

export interface ReleaseHold {
  kind: HeldReleaseKind;
  releasedBy: { userId: string; userName: string };
  followUps?: HeldReleaseFollowUp[];
  subject?: HeldRelease['subject'];
}

export type ReleaseReportOutcome =
  | { held: HeldRelease }
  | { published: ReportReleasedEventResult };

const KIND_TEXT: Record<HeldReleaseKind, string> = {
  'surgical-sign-out': 'signed-out report',
  'cytology-sign-out': 'cytology case report', 'cytology-late-sign-out': 'cytology specimen added after early finalization',
  'cytology-finalize-early': 'cytology case report (finalized early)', 'cytology-revision': 'cytology correction or addendum',
  'cytology-preliminary': 'urgent cytology preliminary report', 'surgical-preliminary': 'preliminary report',
  'surgical-amendment': 'report correction or addendum', autopsy: 'autopsy report',
};

async function runFollowUps(followUps: readonly HeldReleaseFollowUp[], caseId: string, deps: Pick<ReleaseReportDeps, 'runFollowUp'>): Promise<void> {
  for (const f of followUps) await deps.runFollowUp(f, caseId).catch(e => console.error('[releaseReport] Follow-up not sent:', e));
}

/** Publishes a report now, or holds it for the laboratory's release delay. */
export async function releaseReport(event: ReportReleasedEvent, hold: ReleaseHold, deps: ReleaseReportDeps): Promise<ReleaseReportOutcome> {
  const followUps = hold.followUps ?? [];
  const delay = await deps.resolveDelay(event.caseId).catch(() => ({ applies: false, durationMinutes: 0 }) as ReleaseBufferResolution);
  if (!delay.applies || delay.durationMinutes <= 0) {
    const published = await deps.publish(event);
    await runFollowUps(followUps, event.caseId, deps);
    return { published };
  }

  // The PDF as it is now, so what goes out later is what was released.
  const pdf = event.generatePdf ? await event.generatePdf().catch((e: unknown) => ({ generationError: e instanceof Error ? e.message : 'unknown error' }) as { pdfBase64?: string; generationError?: string }) : undefined;
  const now = deps.now();
  const { generatePdf: _fn, ...stored } = event;
  // Batch 538: the bytes stay with the hold. When the delay ends they are published and stored then as
  // the release's report document (publishReportReleasedEvent), so a report recalled in the delay
  // leaves no document behind, and every retry after release sends these exact bytes.
  const held: HeldRelease = {
    id: `held-${deps.newId()}`, caseId: event.caseId, kind: hold.kind, event: stored,
    ...(pdf?.pdfBase64 ? { pdfBase64: pdf.pdfBase64 } : {}),
    ...(pdf?.generationError ? { pdfError: pdf.generationError } : {}),
    followUps, ...(hold.subject ? { subject: hold.subject } : {}),
    heldAt: now.toISOString(), expiresAt: new Date(now.getTime() + delay.durationMinutes * 60_000).toISOString(),
    releasedBy: hold.releasedBy, status: 'held',
  };
  await deps.held.add(held);
  await deps.audit({
    type: 'user', event: 'REPORT_RELEASE_HELD', caseId: event.caseId, user: hold.releasedBy.userName || hold.releasedBy.userId, confidence: null,
    detail: `${event.reportType} ${KIND_TEXT[hold.kind]} held for the ${delay.durationMinutes}-minute release delay (goes out ${held.expiresAt}).`,
  }).catch(() => {});
  return { held };
}

/** Sends every held report whose delay has run out. Returns how many were sent. */
export async function releaseDueReports(deps: ReleaseReportDeps): Promise<number> {
  const all = await deps.held.getAll();
  if (!all.ok) return 0;
  const now = deps.now();
  let sent = 0;
  for (const h of all.data.filter(x => heldReleaseDue(x, now)).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))) {
    // Settled first, so two open screens never send the same report twice.
    if (!(await deps.held.settle(h.id, 'released', now.toISOString()))) continue;
    if (h.kind === 'surgical-sign-out') {
      // Its own release (status, audit and the FINAL) is the case buffer's; nothing else goes with it.
      await deps.releaseSignOut(h.caseId).catch(e => console.error('[releaseReport] Sign-out not released:', e));
      sent += 1;
      continue;
    }
    const pdfBase64 = h.pdfBase64;
    await deps.publish({
      ...h.event,
      ...(pdfBase64 ? { generatePdf: async () => ({ pdfBase64 }) } : h.pdfError ? { generatePdf: async () => ({ generationError: h.pdfError }) } : {}),
    }).catch(e => console.error('[releaseReport] Held report not published:', e));
    await runFollowUps(h.followUps, h.caseId, deps);
    await deps.audit({
      type: 'system', event: 'REPORT_RELEASE_SENT', caseId: h.caseId, user: 'system-release-buffer', confidence: null,
      detail: `Release delay ended: ${h.event.reportType} ${KIND_TEXT[h.kind]} released by ${h.releasedBy.userName} sent.`,
    }).catch(() => {});
    sent += 1;
  }
  return sent;
}

/** Recall within the delay (Pete: by the person who released it; it reopens what was released). */
export async function recallHeldRelease(
  heldId: string, by: { userId: string; userName: string }, deps: ReleaseReportDeps,
): Promise<{ ok: true } | { ok: false; refusal: HeldRecallRefusal | 'notFound' }> {
  const all = await deps.held.getAll();
  const h = all.ok ? all.data.find(x => x.id === heldId) : undefined;
  if (!h) return { ok: false, refusal: 'notFound' };
  const refusal = heldRecallRefusal(h, by.userId, deps.now());
  if (refusal) return { ok: false, refusal };
  const blocked = deps.recallBlocked ? await deps.recallBlocked(h) : null;
  if (blocked) return { ok: false, refusal: blocked };
  if (!(await deps.held.settle(h.id, 'recalled', deps.now().toISOString()))) return { ok: false, refusal: 'notHeld' };
  await deps.reopen(h, by);
  await deps.audit({
    type: 'user', event: 'REPORT_RELEASE_RECALLED', caseId: h.caseId, user: by.userName || by.userId, confidence: null,
    detail: `${h.event.reportType} ${KIND_TEXT[h.kind]} recalled within the release delay; nothing was sent, and it is reopened.`,
  }).catch(() => {});
  return { ok: true };
}

/**
 * A surgical FINAL sign-out held on the case ('pending-release'): tracked so the
 * sweep releases it when its time is up, whether or not its report page is open.
 * Its recall stays the report page's (reportReleaseService.recall settles this).
 */
export async function trackSignOutBuffer(
  input: { caseId: string; expiresAt: string; releasedBy: { userId: string; userName: string }; performingFacilityId?: string },
  deps: Pick<ReleaseReportDeps, 'held' | 'now' | 'newId'>,
): Promise<void> {
  const now = deps.now().toISOString();
  await deps.held.add({
    id: `held-${deps.newId()}`, caseId: input.caseId, kind: 'surgical-sign-out',
    event: { caseId: input.caseId, reportType: 'FINAL', releasedAt: now, ...(input.performingFacilityId ? { performingFacilityId: input.performingFacilityId } : {}) },
    followUps: [], heldAt: now, expiresAt: input.expiresAt, releasedBy: input.releasedBy, status: 'held',
  });
}

/**
 * Batch 535: recalling a surgical sign-out (its own banner) also recalls what
 * was released on it during its buffer and is still held (a correction made
 * straight after Finalize), so nothing goes out for a report that was taken back.
 * The person recalling the sign-out is its signer; these are reopened the same way.
 */
export async function recallHeldForCase(
  caseId: string, kinds: readonly HeldReleaseKind[], by: { userId: string; userName: string }, deps: ReleaseReportDeps,
): Promise<number> {
  const res = await deps.held.getByCaseId(caseId);
  if (!res.ok) return 0;
  let n = 0;
  for (const h of res.data.filter(x => x.status === 'held' && kinds.includes(x.kind))) {
    if (!(await deps.held.settle(h.id, 'recalled', deps.now().toISOString()))) continue;
    await deps.reopen(h, by);
    await deps.audit({
      type: 'user', event: 'REPORT_RELEASE_RECALLED', caseId, user: by.userName || by.userId, confidence: null,
      detail: `${h.event.reportType} ${KIND_TEXT[h.kind]} recalled with the signed-out report it was released on; nothing was sent, and it is reopened.`,
    }).catch(() => {});
    n += 1;
  }
  return n;
}
