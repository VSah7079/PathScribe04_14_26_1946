// src/services/autopsy/dashboard/autopsyDashboardTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): the autopsy dashboards. PS-261 §2.6.3 names "three-tier
// BI and reporting dashboards" but the specification text is not in the
// repository, so the tiers are the ones the queue entry states: case,
// department (one facility) and enterprise (every facility and jurisdiction).
// Each tier shows turnaround, consent, retention and cause of death.
//
// A record is one autopsy: the real case (or a Simulated one) boiled down to
// what the dashboards need. The turnaround verdicts are never stored; they are
// worked out from the same engine the worklist chip uses
// (resolveAutopsyTatStatus.ts), so the two can never disagree.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutopsyCaseDetails, OrganRetentionTier } from '@/types/autopsy/AutopsyCaseDetails';
import type { Jurisdiction } from '@/types/systemConfig';
import type { AutopsyTatSummary } from '../resolveAutopsyTatStatus';

/** Broad categories only. A live case has no structured cause of death yet (it lives in the signed report text), so it shows as not recorded. */
export const CAUSE_OF_DEATH_CATEGORIES = [
  'cardiovascular', 'respiratory', 'infection', 'neoplasm', 'neurological', 'external', 'undetermined',
] as const;
export type CauseOfDeathCategory = typeof CAUSE_OF_DEATH_CATEGORIES[number] | 'not_recorded';

export type ConsentKind = 'not_applicable' | 'active' | 'narrowed' | 'revoked';
export type RetentionKind = 'none' | OrganRetentionTier;

export interface AutopsyDashboardRecord {
  /** Accession number for a real case; SIM-A-nnnn for a Simulated one. */
  id: string;
  simulated: boolean;
  facilityId: string;
  facilityName: string;
  jurisdiction: Jurisdiction;
  /** Body arrival (the turnaround clock start). */
  startedAt: string;
  autopsy: AutopsyCaseDetails;
  cause: CauseOfDeathCategory;
}

export interface EvaluatedAutopsyRecord extends AutopsyDashboardRecord {
  tat: AutopsyTatSummary;
  consent: ConsentKind;
  retention: RetentionKind;
}

export interface TatKpis {
  /** Reports whose outcome is known: signed in time, signed late, or overdue unsigned. */
  decided: number;
  /** Of the decided, how many were (or are) within target. */
  within: number;
  /** within / decided as a whole percentage, or null when nothing is decided yet. */
  withinPct: number | null;
  open: number;
  overdue: number;
  medianHours: number | null;
}

export interface TierSummary {
  count: number;
  pad: TatKpis;
  fad: TatKpis;
  consent: Record<ConsentKind, number>;
  retention: Record<RetentionKind, number>;
  causes: Array<{ cause: CauseOfDeathCategory; count: number }>;
  /** Cases with a report overdue right now (either tier). */
  overdueNow: number;
}
