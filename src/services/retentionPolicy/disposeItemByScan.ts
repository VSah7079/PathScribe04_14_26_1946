// src/services/retentionPolicy/disposeItemByScan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up: "As the user scans each specimen
// container it gets updated to disposed and comes off the list. If the
// scan doesn't match what the system expects, the screen turns red."
//
// Deliberately RE-validates every real check computeDisposalQueue.ts
// itself applies, rather than trusting that a scanned item was still on
// the last-rendered queue — the queue is a real, point-in-time
// snapshot; a hold could have been set, or another tech could have
// already disposed the same item, in the seconds since it was last
// fetched. A stale "it was on the list a moment ago" is not the same
// real guarantee as "it's genuinely eligible right now" — and this is
// the one action in the whole app that's genuinely irreversible.
//
// Real, architectural fix, per direct follow-up: "actually, blocks
// don't generally get disposed of" — same real posture as
// computeDisposalQueue.ts's own identical header note. A real matrix
// block/matrix slide now gets full, real support here — resolved via
// resolveRetentionEligibility.ts's own resolveMostConservativeEligibleDate,
// the MOST conservative (latest) real eligible date across every real
// participant's own, individual retention clock.
//
// Batch 407: disposing needs retention:material:dispose (Pete: keep today's
// users), checked first, with the station's facility. Each refusal carries a
// `code` and `values` the Disposal Queue page translates
// (disposalQueue.refusals.<code>); `reason` stays as English text for logs.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { caseRouter } from '@/services/cases/CaseRouter';
import { mockAuditService } from '@/services/auditlog/mockAuditService';
import { authorizationService } from '@/services/authorization/defaultAuthorizationService';
import { getCurrentJurisdiction } from './RetentionPolicy';
import { resolveMostConservativeEligibleDate, resolveFacilityIdForLocation } from './resolveRetentionEligibility';
import type { HistologyBlock, StainOrder, Specimen } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { Case } from '@/types/case/Case';
import type { MaterialLocation, Decant } from '@/types/case/Material';

/** Why a scan didn't dispose anything (Batch 407). */
export type DisposalRefusal =
  | 'notPermitted' | 'noMatch' | 'notFound' | 'alreadyDisposed' | 'notSignedOut' | 'onHold' | 'notEligible' | 'wrongFacility';

export type DisposeItemOutcome =
  | { outcome: 'disposed'; displayId: string }
  | {
      outcome: 'rejected';
      code: DisposalRefusal;
      /** For the screen: the item's id, a date (ISO) and the hold's note, when the refusal names them. */
      values: { displayId?: string; date?: string; note?: string };
      /** English, for logs. */
      reason: string;
    };

const refuse = (code: DisposalRefusal, reason: string, values: { displayId?: string; date?: string; note?: string } = {}): DisposeItemOutcome =>
  ({ outcome: 'rejected', code, values, reason });

interface ResolvedTargetRecord {
  disposedAt: string | undefined;
  locationHistory: MaterialLocation[] | undefined;
  /** One label per real participant — a single-element array for an
   *  ordinary block/slide, one per real participant for a matrix
   *  block/slide. */
  specimenLabels: string[];
  specimenDictionaryEntryIds: (string | undefined)[];
}

/** Real, single resolution point — every real participant on a real
 *  matrix block, resolved back to their own real Specimen record. */
function resolveMatrixParticipants(caseData: Case, matrixBlock: MatrixBlock): { labels: string[]; dictionaryEntryIds: (string | undefined)[] } {
  const labels: string[] = [];
  const dictionaryEntryIds: (string | undefined)[] = [];
  for (const p of matrixBlock.participants) {
    const sp = caseData.specimens?.find(s => s.id === p.specimenId);
    labels.push(sp?.label ?? '?');
    dictionaryEntryIds.push(sp?.specimenDictionaryEntryId);
  }
  return { labels, dictionaryEntryIds };
}

/** Real, single scan-to-dispose action — see this file's own header
 *  for why every check is re-run live, not trusted from a cached
 *  queue. `facilityId` — undefined means "no location restriction,"
 *  same real meaning as computeDisposalQueue's own parameter. */
export async function disposeItemByScan(scannedValue: string, facilityId: string | undefined, byUserId: string, byUserName: string): Promise<DisposeItemOutcome> {
  // Batch 407: the irreversible step needs its own permission, at this station's facility.
  const decision = await authorizationService.enforce('retention:material:dispose', facilityId ? { facilityId } : {});
  if (!decision.allowed) return refuse('notPermitted', 'Not permitted to dispose of retained material.');

  const resolved = await resolveMaterialFromScan(scannedValue);
  if (!resolved) {
    return refuse('noMatch', `"${scannedValue}" doesn't match any real cassette or slide on any case.`);
  }
  const { caseData, specimenLetter, target, displayId, fullAccession } = resolved;

  // Real, single resolution point per real target shape — the rest of
  // this function (finalized/hold/eligibility/facility checks, audit
  // log) is genuinely identical regardless of which real kind of
  // material this scan resolved to.
  let record: ResolvedTargetRecord;
  let materialType: 'block' | 'slide' | 'wet_tissue';
  let matrixBlock: MatrixBlock | undefined;
  let matrixSlideIndex: number | undefined;
  let specimen: Specimen | undefined;
  let block: HistologyBlock | undefined;
  let decant: Decant | undefined;

  if (target.level === 'specimen') {
    specimen = caseData.specimens?.find(s => s.label === specimenLetter);
    if (!specimen) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    materialType = 'wet_tissue';
    record = {
      disposedAt: specimen.disposedAt,
      locationHistory: specimen.locationHistory,
      specimenLabels: [specimen.label],
      specimenDictionaryEntryIds: [specimen.specimenDictionaryEntryId],
    };
  } else if (target.level === 'decant' || target.level === 'decant_slide') {
    // Real feature, per direct follow-up: "please wire decants for
    // disposal." Same real, parallel structure as the block/slide
    // branch immediately below — the decant itself is the real
    // 'wet_tissue' item (its own container); decant.stains[] are the
    // real, physical slides cut from it, on the same real 'slide'
    // window as an ordinary block's own stains.
    specimen = caseData.specimens?.find(s => s.label === specimenLetter);
    decant = specimen?.decants?.find(d => d.label === target.decantLabel);
    if (!specimen || !decant) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    const decantSlide = target.level === 'decant_slide' ? decant.stains?.find((_, i) => `L${i + 1}` === target.slideLevel) : undefined;
    if (target.level === 'decant_slide' && !decantSlide) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    materialType = target.level === 'decant' ? 'wet_tissue' : 'slide';
    record = {
      disposedAt: target.level === 'decant' ? decant.disposedAt : decantSlide?.disposedAt,
      locationHistory: target.level === 'decant' ? decant.locationHistory : decantSlide?.locationHistory,
      specimenLabels: [specimen.label],
      specimenDictionaryEntryIds: [specimen.specimenDictionaryEntryId],
    };
  } else if (target.level === 'block' || target.level === 'slide') {
    specimen = caseData.specimens?.find(s => s.label === specimenLetter);
    block = specimen?.blocks?.find(b => b.label === target.blockNumber);
    if (!specimen || !block) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    const slide = target.level === 'slide' ? block.stains?.find((_, i) => `L${i + 1}` === target.slideLevel) : undefined;
    if (target.level === 'slide' && !slide) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    materialType = target.level === 'block' ? 'block' : 'slide';
    record = {
      disposedAt: target.level === 'block' ? block.disposedAt : slide?.disposedAt,
      locationHistory: target.level === 'block' ? block.locationHistory : slide?.locationHistory,
      specimenLabels: [specimen.label],
      specimenDictionaryEntryIds: [specimen.specimenDictionaryEntryId],
    };
  } else {
    // target.level is 'matrix_block' or 'matrix_slide'
    matrixBlock = caseData.matrixBlocks?.find(m => m.id === target.matrixBlockId);
    if (!matrixBlock) {
      return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
    }
    const { labels, dictionaryEntryIds } = resolveMatrixParticipants(caseData, matrixBlock);
    if (target.level === 'matrix_block') {
      materialType = 'block';
      record = {
        disposedAt: matrixBlock.disposedAt,
        locationHistory: matrixBlock.locationHistory,
        specimenLabels: labels,
        specimenDictionaryEntryIds: dictionaryEntryIds,
      };
    } else {
      materialType = 'slide';
      matrixSlideIndex = Number(target.slideLevel.replace(/^L/i, '')) - 1;
      const matrixSlide = (matrixBlock.slides ?? [])[matrixSlideIndex];
      if (!matrixSlide) {
        return refuse('notFound', `${displayId} couldn't be located in its own case record.`, { displayId });
      }
      record = {
        disposedAt: matrixSlide.disposedAt,
        locationHistory: matrixSlide.locationHistory,
        specimenLabels: labels,
        specimenDictionaryEntryIds: dictionaryEntryIds,
      };
    }
  }

  if (record.disposedAt) {
    return refuse('alreadyDisposed', `${displayId} was already disposed on ${record.disposedAt.slice(0, 10)}.`, { displayId, date: record.disposedAt });
  }

  if (!caseData.finalizedAt) {
    return refuse('notSignedOut', `${displayId}'s case hasn't been signed out yet — no real retention clock has started.`, { displayId });
  }
  const activeHold = (caseData.retentionHolds ?? []).find(h => h.active);
  if (activeHold) {
    return refuse('onHold', `${displayId} cannot be disposed — this case has an active retention hold: ${activeHold.note}`, { displayId, note: activeHold.note });
  }

  const jurisdiction = getCurrentJurisdiction();
  const eligibleDate = await resolveMostConservativeEligibleDate(materialType, jurisdiction, caseData.finalizedAt, record.specimenDictionaryEntryIds);
  if (!eligibleDate || eligibleDate.getTime() > Date.now()) {
    return refuse('notEligible', `${displayId} isn't retention-eligible for disposal until ${eligibleDate ? eligibleDate.toISOString().slice(0, 10) : 'an unknown date'}.`, { displayId, date: eligibleDate?.toISOString() });
  }

  if (facilityId) {
    const lastLocation = record.locationHistory && record.locationHistory.length > 0 ? record.locationHistory[record.locationHistory.length - 1] : undefined;
    const itemFacilityId = await resolveFacilityIdForLocation(lastLocation?.location);
    if (itemFacilityId !== facilityId) {
      return refuse('wrongFacility', `${displayId}'s last known location isn't at this facility — expected here, not scanned here before.`, { displayId });
    }
  }

  const nowIso = new Date().toISOString();

  // Real, immutable update — only the one matching real record
  // changes; everything else in the case's own tree is passed through
  // unchanged.
  const updates: Partial<Case> = {};
  if (target.level === 'specimen') {
    updates.specimens = caseData.specimens?.map(s => {
      if (s.label !== specimenLetter) return s;
      return { ...s, disposedAt: nowIso, disposedBy: byUserId };
    });
  } else if (target.level === 'decant' || target.level === 'decant_slide') {
    updates.specimens = caseData.specimens?.map(s => {
      if (s.label !== specimenLetter) return s;
      return {
        ...s,
        decants: s.decants?.map((d): Decant => {
          if (d.label !== decant!.label) return d;
          if (target.level === 'decant') {
            return { ...d, disposedAt: nowIso, disposedBy: byUserId };
          }
          return {
            ...d,
            stains: d.stains?.map((st, i): StainOrder => {
              if (`L${i + 1}` !== target.slideLevel) return st;
              return { ...st, disposedAt: nowIso, disposedBy: byUserId };
            }),
          };
        }),
      };
    });
  } else if (target.level === 'block' || target.level === 'slide') {
    updates.specimens = caseData.specimens?.map(s => {
      if (s.label !== specimenLetter) return s;
      return {
        ...s,
        blocks: s.blocks?.map((b): HistologyBlock => {
          if (b.label !== target.blockNumber) return b;
          if (target.level === 'block') {
            return { ...b, disposedAt: nowIso, disposedBy: byUserId };
          }
          return {
            ...b,
            stains: b.stains?.map((st, i): StainOrder => {
              if (`L${i + 1}` !== target.slideLevel) return st;
              return { ...st, disposedAt: nowIso, disposedBy: byUserId };
            }),
          };
        }),
      };
    });
  } else {
    updates.matrixBlocks = caseData.matrixBlocks?.map((m): MatrixBlock => {
      if (m.id !== matrixBlock!.id) return m;
      if (target.level === 'matrix_block') {
        return { ...m, disposedAt: nowIso, disposedBy: byUserId };
      }
      return {
        ...m,
        slides: (m.slides ?? []).map((s, i): StainOrder => {
          if (i !== matrixSlideIndex) return s;
          return { ...s, disposedAt: nowIso, disposedBy: byUserId };
        }),
      };
    });
  }

  await caseRouter.updateCase(caseData.id, updates);

  mockAuditService.logEvent({
    type: 'system', event: 'Specimen Material Disposed',
    detail: `${displayId} disposed — retention-eligible since ${eligibleDate.toISOString().slice(0, 10)}, no active hold, verified at scan.`,
    user: byUserName, caseId: fullAccession, confidence: null,
  }).catch(() => {});

  return { outcome: 'disposed', displayId };
}
