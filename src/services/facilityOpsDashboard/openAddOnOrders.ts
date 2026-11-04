// src/services/facilityOpsDashboard/openAddOnOrders.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 727 (Lab Workflow & Batch spec, Decisions 2 and 3, §6.4, §10.1): the
// add-on orders waiting at the microtome, across cases, for the Embedding &
// Microtome wall view. An add-on creates slides and no batch, so a batch-based
// feed cannot see it; this reads the slides themselves.
//
//   open      a slide ordered as an add-on (an ordered time and a priority) that
//             is still Pending Cut. Control slides are part of their order and
//             are not counted separately. Orders made before the routed stamp
//             existed are included (the status decides, not the stamp).
//   type      from the routed queue the builder stamped (recut / levels,
//             special stain, IHC, send-out, molecular); "other" when missing.
//   facility  the order's performing-lab stamp, else the case's facility.
//   colour    one time X per lab (the Display Profile): amber in the last
//             stretch before X, red past X (Decision 2).
//   pinned    STAT, or older than X (Decision 3). Not every add-on, so the top
//             of the list stays meaningful.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { PathologyCase } from '../cases/ICaseService';
import type { StainOrder } from '@/types/case/Specimen';
import type { SlaState } from './IFacilityOpsDashboardTypes';

/** Default X (minutes) when a Display Profile has none set. */
export const DEFAULT_ADD_ON_AGE_LIMIT_MINUTES = 120;
/** The amber stretch before X: 30 minutes, or half of X when X is an hour or less. */
export const addOnWarningMinutes = (limit: number): number => Math.min(30, Math.floor(limit / 2));

export const ADD_ON_ROW_TYPES = ['recut', 'specialStain', 'ihc', 'sendOut', 'molecular', 'other'] as const;
export type AddOnRowType = typeof ADD_ON_ROW_TYPES[number];

export const TYPE_BY_QUEUE: Readonly<Record<string, AddOnRowType>> = {
  'Histology Cutting Queue': 'recut',
  'Special Stains Bench Queue': 'specialStain',
  'IHC/Special Histochemistry Queue': 'ihc',
  'Reference/Send-Out Lab Queue': 'sendOut',
  'Molecular In-House Queue': 'molecular',
};

export interface OpenAddOnOrder {
  key: string;
  caseId: string;
  accession: string;
  /** Specimen and block label, e.g. "A1". */
  block: string;
  stainName: string;
  type: AddOnRowType;
  isStat: boolean;
  orderedAt: string;
  ageMinutes: number;
  facilityId?: string;
  state: SlaState;
  /** Minutes left before X (negative once past it). */
  remainingMinutes: number;
  pinned: boolean;
}

/** Whether a slide is an add-on still waiting to be cut. */
export function isOpenAddOn(s: Pick<StainOrder, 'orderedAt' | 'addOnPriority' | 'status' | 'isControlSlide'>): boolean {
  return !!s.orderedAt && !!s.addOnPriority && s.status === 'Pending Cut' && !s.isControlSlide;
}

/** Every open add-on across the cases, for one facility (or all), oldest first with the pinned ones on top. */
export function listOpenAddOnOrders(
  cases: Iterable<PathologyCase>,
  opts: { facilityId?: string; accessionToFacilityId: ReadonlyMap<string, string>; limitMinutes?: number; now?: number },
): OpenAddOnOrder[] {
  const now = opts.now ?? Date.now();
  const limit = opts.limitMinutes && opts.limitMinutes > 0 ? opts.limitMinutes : DEFAULT_ADD_ON_AGE_LIMIT_MINUTES;
  const warn = addOnWarningMinutes(limit);
  const out: OpenAddOnOrder[] = [];
  for (const c of cases) {
    const accession = c.accession?.fullAccession ?? c.id;
    for (const specimen of c.specimens ?? []) {
      for (const block of specimen.blocks ?? []) {
        for (const s of block.stains ?? []) {
          if (!isOpenAddOn(s)) continue;
          const facilityId = s.performingLabFacilityId ?? opts.accessionToFacilityId.get(accession);
          if (opts.facilityId && facilityId !== opts.facilityId) continue;
          const ageMinutes = Math.max(0, Math.round((now - new Date(s.orderedAt!).getTime()) / 60000));
          const remainingMinutes = limit - ageMinutes;
          const state: SlaState = remainingMinutes <= 0 ? 'overdue' : remainingMinutes <= warn ? 'warning' : 'normal';
          const isStat = s.addOnPriority === 'STAT/Urgent';
          out.push({
            key: `${c.id}:${s.id}`, caseId: c.id, accession, block: `${specimen.label}${block.label}`, stainName: s.stainName,
            type: (s.routedQueueLabel && TYPE_BY_QUEUE[s.routedQueueLabel]) || 'other', isStat, orderedAt: s.orderedAt!,
            ageMinutes, facilityId, state, remainingMinutes, pinned: isStat || state === 'overdue',
          });
        }
      }
    }
  }
  return out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.isStat) - Number(a.isStat) || b.ageMinutes - a.ageMinutes);
}
