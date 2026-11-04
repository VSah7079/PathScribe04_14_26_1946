// src/services/quality/qaTrendRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): discordance patterns, judged against each site's own
// policy (types/quality/QaTrend.ts). Pure.
//
//   • Policy: the organisation default, or the performing lab's own.
//     Defaults are the developer's proposal Pete reviewed (3 months, 20
//     reviews, 3 majors or 10%), all editable; "major" is severity high.
//   • Pathologist pattern: QA records naming the reviewed pathologist
//     (pre-sign-out peer review, outside consult, and from Batch 442
//     retrospective surgical peer review), grouped by pathologist and lab.
//   • Specimen-type pattern: every review record whose specimen resolves to
//     a dictionary entry, grouped by that entry and lab, whoever read it.
//   • Only a completed review counts (concordant or discordant); a major
//     discordance is a discordant one at a "major" severity.
//   • Triggers when the window holds at least minSampleSize reviews and
//     either test is crossed. One open recommendation per subject and lab.
// ─────────────────────────────────────────────────────────────────────────────

import type { QaActivityRecord, QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';
import type { QaTrendKind, QaTrendPolicy, QaTrendPolicySettings, QaTrendRecommendation, QaTrendStatus } from '@/types/quality/QaTrend';

export const DEFAULT_QA_TREND_POLICY: QaTrendPolicy = {
  pathologistTrendEnabled: true,
  specimenTypeTrendEnabled: true,
  rollingWindowMonths: 3,
  minSampleSize: 20,
  majorSeverities: ['high'],
  countThreshold: 3,
  rateThresholdPercent: 10,
  action: 'review-task',
};

export const DEFAULT_QA_TREND_POLICY_SETTINGS: QaTrendPolicySettings = { orgDefault: DEFAULT_QA_TREND_POLICY, performingLabs: {} };

export const SEVERITIES: readonly QaDiscordanceSeverity[] = ['low', 'medium', 'high'];

/** The policy for a performing lab: its own, or the organisation's. */
export function effectiveQaTrendPolicy(settings: QaTrendPolicySettings, performingLabId?: string): QaTrendPolicy {
  return (performingLabId && settings.performingLabs[performingLabId]) || settings.orgDefault;
}

export type QaTrendPolicyProblem =
  | 'windowOutOfRange' | 'sampleOutOfRange' | 'countOutOfRange' | 'rateOutOfRange' | 'noMajorSeverity' | 'noTest';

/** A policy that can't work. Pure. */
export function qaTrendPolicyProblem(p: QaTrendPolicy): QaTrendPolicyProblem | null {
  const whole = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!whole(p.rollingWindowMonths, 1, 36)) return 'windowOutOfRange';
  if (!whole(p.minSampleSize, 1, 10000)) return 'sampleOutOfRange';
  if (!whole(p.countThreshold, 0, 10000)) return 'countOutOfRange';
  if (!(p.rateThresholdPercent >= 0 && p.rateThresholdPercent <= 100)) return 'rateOutOfRange';
  if (p.majorSeverities.length === 0) return 'noMajorSeverity';
  if (p.countThreshold === 0 && p.rateThresholdPercent === 0) return 'noTest';
  return null;
}

/** The start of a window ending now, months back (calendar months). */
export function windowStart(now: Date, months: number): Date {
  const d = new Date(now);
  // Batch 504: UTC arithmetic, so the window is the same whatever device runs it.
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/** A QA record with what the trend needs resolved (by the loader). */
export interface TrendRecord {
  record: Pick<QaActivityRecord, 'id' | 'outcome' | 'severity' | 'recordedAt' | 'reviewedPathologist'>;
  performingLabId?: string;
  specimenType?: { id: string; name: string };
}

export interface TrendCandidate {
  kind: QaTrendKind;
  subjectId: string;
  subjectName: string;
  performingLabId?: string;
  policy: QaTrendPolicy;
  windowStart: string;
  windowEnd: string;
  totalReviewed: number;
  majorCount: number;
  ratePercent: number;
  trigger: 'count' | 'rate' | 'both' | null;
  qualifyingRecordIds: string[];
}

const isReview = (r: TrendRecord['record']) => r.outcome === 'concordant' || r.outcome === 'discordant';
const isMajor = (r: TrendRecord['record'], p: QaTrendPolicy) => r.outcome === 'discordant' && !!r.severity && p.majorSeverities.includes(r.severity);

/** Which test a group crosses, if any. */
export function trendTrigger(total: number, majors: number, p: QaTrendPolicy): 'count' | 'rate' | 'both' | null {
  if (total < p.minSampleSize || total === 0) return null;
  const byCount = p.countThreshold > 0 && majors >= p.countThreshold;
  const byRate = p.rateThresholdPercent > 0 && (majors / total) * 100 >= p.rateThresholdPercent;
  return byCount && byRate ? 'both' : byCount ? 'count' : byRate ? 'rate' : null;
}

/** Every group's numbers against its lab's policy (crossed or not). Pure. */
export function qaTrendCandidates(records: readonly TrendRecord[], settings: QaTrendPolicySettings, now: Date): TrendCandidate[] {
  const groups = new Map<string, { kind: QaTrendKind; subjectId: string; subjectName: string; lab?: string; items: TrendRecord['record'][] }>();
  const push = (kind: QaTrendKind, subjectId: string, subjectName: string, lab: string | undefined, r: TrendRecord['record']) => {
    const key = `${kind}|${subjectId}|${lab ?? ''}`;
    const g = groups.get(key) ?? { kind, subjectId, subjectName, lab, items: [] };
    g.items.push(r);
    groups.set(key, g);
  };
  for (const t of records) {
    if (!isReview(t.record)) continue;
    const p = effectiveQaTrendPolicy(settings, t.performingLabId);
    if (new Date(t.record.recordedAt) < windowStart(now, p.rollingWindowMonths)) continue;
    if (p.pathologistTrendEnabled && t.record.reviewedPathologist) {
      push('pathologist', t.record.reviewedPathologist.userId, t.record.reviewedPathologist.userName, t.performingLabId, t.record);
    }
    if (p.specimenTypeTrendEnabled && t.specimenType) {
      push('specimen-type', t.specimenType.id, t.specimenType.name, t.performingLabId, t.record);
    }
  }
  return [...groups.values()].map(g => {
    const p = effectiveQaTrendPolicy(settings, g.lab);
    const majors = g.items.filter(r => isMajor(r, p));
    const total = g.items.length;
    return {
      kind: g.kind, subjectId: g.subjectId, subjectName: g.subjectName, performingLabId: g.lab, policy: p,
      windowStart: windowStart(now, p.rollingWindowMonths).toISOString(), windowEnd: now.toISOString(),
      totalReviewed: total, majorCount: majors.length,
      ratePercent: total ? Math.round((majors.length / total) * 1000) / 10 : 0,
      trigger: trendTrigger(total, majors.length, p),
      qualifyingRecordIds: majors.map(r => r.id),
    };
  });
}

const OPEN: ReadonlySet<QaTrendStatus> = new Set(['recommended', 'noted', 'under-review']);
export const isOpenTrend = (r: Pick<QaTrendRecommendation, 'status'>) => OPEN.has(r.status);

/** New recommendations for crossed groups that don't already have an open one. Pure. */
export function newQaTrendRecommendations(
  candidates: readonly TrendCandidate[], existing: readonly QaTrendRecommendation[], now: Date, newId: () => string,
): QaTrendRecommendation[] {
  const key = (r: { kind: QaTrendKind; subjectId: string; performingLabId?: string }) => `${r.kind}|${r.subjectId}|${r.performingLabId ?? ''}`;
  const open = new Set(existing.filter(isOpenTrend).map(key));
  // A concluded one (CAPA or dismissed) covers the majors it was decided on:
  // the same subject is raised again only with a major discordance it
  // hasn't seen.
  const decided = new Map<string, Set<string>>();
  for (const r of existing.filter(r => !isOpenTrend(r))) {
    const seen = decided.get(key(r)) ?? new Set<string>();
    r.qualifyingRecordIds.forEach(id => seen.add(id));
    decided.set(key(r), seen);
  }
  const hasNewMajor = (c: TrendCandidate) => {
    const seen = decided.get(key(c));
    return !seen || c.qualifyingRecordIds.some(id => !seen.has(id));
  };
  return candidates
    .filter(c => c.trigger && !open.has(key(c)) && hasNewMajor(c))
    .map(c => ({
      id: newId(), kind: c.kind, subjectId: c.subjectId, subjectName: c.subjectName,
      ...(c.performingLabId ? { performingLabId: c.performingLabId } : {}),
      windowStart: c.windowStart, windowEnd: c.windowEnd, totalReviewed: c.totalReviewed, majorCount: c.majorCount,
      ratePercent: c.ratePercent, trigger: c.trigger!, qualifyingRecordIds: c.qualifyingRecordIds, policy: c.policy,
      status: c.policy.action === 'notify-only' ? 'noted' : 'recommended',
      createdAt: now.toISOString(),
    }));
}

export type QaTrendDecision =
  | { kind: 'start-review'; note?: string }
  | { kind: 'open-capa'; note: string }
  | { kind: 'dismiss'; note: string };

export type QaTrendDecisionProblem = 'notOpen' | 'notUnderReview' | 'noteRequired';

/** Start a review from recommended or noted; open a CAPA only from a review; dismiss from any open state, with a reason. */
export function qaTrendDecisionProblem(rec: Pick<QaTrendRecommendation, 'status'>, d: QaTrendDecision): QaTrendDecisionProblem | null {
  if (!isOpenTrend(rec)) return 'notOpen';
  if (d.kind === 'start-review' && rec.status === 'under-review') return 'notOpen';
  if (d.kind === 'open-capa' && rec.status !== 'under-review') return 'notUnderReview';
  if ((d.kind === 'open-capa' || d.kind === 'dismiss') && !d.note?.trim()) return 'noteRequired';
  return null;
}

export function applyQaTrendDecision(
  rec: QaTrendRecommendation, d: QaTrendDecision, by: { userId: string; userName: string }, at: string,
): QaTrendRecommendation {
  const status: QaTrendStatus = d.kind === 'start-review' ? 'under-review' : d.kind === 'open-capa' ? 'capa-opened' : 'dismissed';
  return { ...rec, status, decidedBy: by, decidedAt: at, ...(d.note?.trim() ? { note: d.note.trim() } : {}) };
}

/** The audit text for a policy change (literal English), or null when nothing changed. */
export function qaTrendPolicyChange(before: QaTrendPolicySettings, after: QaTrendPolicySettings, labName: (id: string) => string): string | null {
  const describe = (p: QaTrendPolicy) =>
    `pathologist ${p.pathologistTrendEnabled ? 'on' : 'off'}, specimen type ${p.specimenTypeTrendEnabled ? 'on' : 'off'}, ` +
    `${p.rollingWindowMonths} months, at least ${p.minSampleSize} reviews, major = ${p.majorSeverities.join('/')}, ` +
    `${p.countThreshold} majors or ${p.rateThresholdPercent}%, ${p.action}`;
  const parts: string[] = [];
  if (describe(before.orgDefault) !== describe(after.orgDefault)) parts.push(`Organisation: ${describe(after.orgDefault)}`);
  const labs = new Set([...Object.keys(before.performingLabs), ...Object.keys(after.performingLabs)]);
  for (const id of labs) {
    const b = before.performingLabs[id];
    const a = after.performingLabs[id];
    if (b && !a) parts.push(`${labName(id)}: uses the organisation's policy`);
    else if (a && (!b || describe(a) !== describe(b))) parts.push(`${labName(id)}: ${describe(a)}`);
  }
  return parts.length ? `Discordance trend policy changed. ${parts.join('; ')}.` : null;
}

/** A performing lab given its own policy (starting from the organisation's), or returned to the organisation's (null). Pure. */
export function withLabQaTrendPolicy(settings: QaTrendPolicySettings, labId: string, policy: QaTrendPolicy | null): QaTrendPolicySettings {
  const performingLabs = { ...settings.performingLabs };
  if (policy) performingLabs[labId] = policy; else delete performingLabs[labId];
  return { ...settings, performingLabs };
}

/** A severity toggled in or out of the "major" list, kept in severity order. Pure. */
export function toggledMajorSeverity(p: QaTrendPolicy, sev: QaDiscordanceSeverity): QaTrendPolicy {
  const has = p.majorSeverities.includes(sev);
  return { ...p, majorSeverities: SEVERITIES.filter(s => (s === sev ? !has : p.majorSeverities.includes(s))) };
}

/** The Lab Director's list: open ones first (waiting for a decision, then under review, then noted), newest first; closed ones only when asked. Pure. */
export function qaTrendQueueOrder(recs: readonly QaTrendRecommendation[], showClosed: boolean): QaTrendRecommendation[] {
  const rank: Record<QaTrendStatus, number> = { recommended: 0, 'under-review': 1, noted: 2, 'capa-opened': 3, dismissed: 3 };
  return recs
    .filter(r => showClosed || isOpenTrend(r))
    .slice()
    .sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt));
}

/** How many wait for the Lab Director's decision (the tile's count). */
export const qaTrendPendingCount = (recs: readonly QaTrendRecommendation[]) => recs.filter(r => r.status === 'recommended').length;
