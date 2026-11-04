// src/types/quality/QaTrend.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): discordance patterns over time, set per site.
//
// Pete (Oct 2): hard-coded thresholds are an anti-pattern for enterprise lab
// software; sites differ in regulatory reading, case volume and QA SOPs. So
// every threshold is a site setting (QaTrendPolicy): the organisation's
// default, overridden per performing lab.
//
// Two patterns (Pete, Sep 2): one pathologist's reviewed work, and one
// specimen type (whoever read it). Crossing a threshold produces a
// recommendation for the Lab Director — never a CAPA by itself (Pete: CAPAs
// are always recommended, never automatic).
// ─────────────────────────────────────────────────────────────────────────────

import type { QaDiscordanceSeverity } from './QaActivityRecord';

/**
 * What crossing a threshold produces.
 *   review-task  — a recommendation in the Lab Director's queue, waiting for
 *                  a decision (start a review, or dismiss).
 *   notify-only  — a note on the trend list; no decision is asked for, but
 *                  the director can still start a review from it.
 * Neither opens a CAPA.
 */
export type QaTrendAction = 'review-task' | 'notify-only';

export interface QaTrendPolicy {
  /** Watch each pathologist's reviewed work. */
  pathologistTrendEnabled: boolean;
  /** Watch each specimen type, whoever read it (a process signal, not a personnel one). */
  specimenTypeTrendEnabled: boolean;
  /** How far back the window reaches. */
  rollingWindowMonths: number;
  /** Reviews needed in the window before anything is judged (protects low-volume and part-time staff). */
  minSampleSize: number;
  /** Which reviewer severities count as a major discordance. */
  majorSeverities: QaDiscordanceSeverity[];
  /** Major discordances in the window that trigger (0 = this test is off). */
  countThreshold: number;
  /** Major-discordance rate, as a percent, that triggers (0 = this test is off). */
  rateThresholdPercent: number;
  action: QaTrendAction;
}

/** The organisation's policy, and any performing lab's own. */
export interface QaTrendPolicySettings {
  orgDefault: QaTrendPolicy;
  performingLabs: Record<string, QaTrendPolicy>;
}

export type QaTrendKind = 'pathologist' | 'specimen-type';

/**
 *   recommended   — waiting for the Lab Director (review-task).
 *   noted         — on the list for information (notify-only).
 *   under-review  — the director started a review of the underlying cases.
 *   capa-opened   — the review concluded a CAPA is needed (the director's decision).
 *   dismissed     — no action, with a reason.
 */
export type QaTrendStatus = 'recommended' | 'noted' | 'under-review' | 'capa-opened' | 'dismissed';

export interface QaTrendRecommendation {
  id: string;
  kind: QaTrendKind;
  /** The pathologist's user id, or the specimen dictionary entry id. */
  subjectId: string;
  subjectName: string;
  /** The performing lab whose policy applied; absent for the organisation default. */
  performingLabId?: string;
  windowStart: string;
  windowEnd: string;
  totalReviewed: number;
  majorCount: number;
  ratePercent: number;
  /** Which test was crossed. */
  trigger: 'count' | 'rate' | 'both';
  qualifyingRecordIds: string[];
  /** The policy as it stood when this was raised. */
  policy: QaTrendPolicy;
  status: QaTrendStatus;
  createdAt: string;
  decidedBy?: { userId: string; userName: string };
  decidedAt?: string;
  note?: string;
}
