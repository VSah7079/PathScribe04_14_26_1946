// src/services/quality/qaActivityBoard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-120): the generic QA activity board — one tile and one table
// per activity, generated from the activity types instead of hard-coded per
// activity.
//
// Sources:
//   • every active QA activity type (Standard and Custom), with its records
//     (qaActivityRecordService). The table's columns come from the type's own
//     review fields (PS-125), so a Custom activity gets its columns for free.
//   • Countersign, through an adapter over countersignService (Pete's accepted
//     default, Oct 10: an adapter, not a data migration). Its rows are the
//     countersign records; it has a real "pending" count. Batch 530: so does
//     Clinical-Pathologic Correlation: the mismatches deferred to secondary
//     review and not yet reviewed (PS-554).
//
// A tile shows: pending (when the source knows it), completed in the period,
// turnaround compliance against the activity's TAT target (PS-116: a TAT
// entry whose type is the activity's id), and the discrepancy rate.
//
// What a source can't know is null, shown as "—", never 0:
//   • pending, for other review activities (nothing selects cases for a Custom
//     activity yet; the surgical QA worklist covers the two surgical ones);
//   • turnaround, for review records (a record keeps when it was recorded,
//     not when the review started).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { QaActivityType, QaReviewFieldDefinition } from '@/types/quality/QaActivityType';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { CountersignRecord } from '@/types/case/CountersignRecord';
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from './capaRecommendationRules';
import { mismatchesAwaitingSecondaryReview } from '../clinical/clinicalMismatchInputs';

export const COUNTERSIGN_SOURCE_ID = 'countersign';
export const BOARD_PERIOD_DAYS = 30;
const HOUR = 3_600_000;

export interface QaBoardColumn {
  id: string;
  /** A label as entered by an administrator (data), or a translation key when `labelKey` is set. */
  label?: string;
  labelKey?: string;
}

export interface QaBoardRow {
  id: string;
  caseId: string;
  /** When the work finished (recorded, countersigned or returned); undefined while pending. */
  completedAt?: string;
  /** When it started, where known (countersign: released). */
  startedAt?: string;
  by?: string;
  /** 'discordant' / 'returned' count as discrepancies. */
  discrepancy: boolean | null;
  /** One value per column id, ready to show. */
  values: Record<string, string>;
}

export interface QaBoardSource {
  id: string;
  name: string;
  /** 'standard' / 'custom' activity types, or 'adapter' (countersign). */
  scope: 'standard' | 'custom' | 'adapter';
  columns: QaBoardColumn[];
  rows: QaBoardRow[];
  /** Waiting work, when the source has a queue; null when it can't know. */
  pending: number | null;
}

export interface QaBoardTile {
  sourceId: string;
  pending: number | null;
  completed: number;
  /** Percent of completed work in the period finished within the TAT target; null with no target or no durations. */
  tatCompliance: number | null;
  /** Percent of completed work in the period that was a discrepancy; null when nothing completed. */
  discrepancyRate: number | null;
}

/** A field value as text: option ids become their labels; lists are joined. */
export function fieldValueText(field: QaReviewFieldDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const label = (id: unknown) => field.options.find(o => o.id === id)?.label ?? String(id);
  if (Array.isArray(value)) return value.map(label).join(', ');
  return field.options.length ? label(value) : String(value);
}

/** One source per active activity type, with its records. */
export function activityTypeSources(types: readonly QaActivityType[], records: readonly QaActivityRecord[]): QaBoardSource[] {
  return types.filter(t => t.active).map(t => ({
    id: t.id,
    name: t.name,
    scope: t.tabScope,
    columns: t.fields.map(f => ({ id: f.id, label: f.label })),
    rows: records.filter(r => r.activityTypeId === t.id).map(r => ({
      id: r.id,
      caseId: r.caseId,
      completedAt: r.recordedAt,
      by: r.recordedBy?.userName,
      discrepancy: r.outcome === 'discordant',
      values: Object.fromEntries(t.fields.map(f => [f.id, fieldValueText(f, r.fieldValues?.[f.id])])),
    })),
    // Batch 530 (PS-554): the clinical mismatches deferred to secondary review and not yet reviewed.
    pending: t.id === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID ? mismatchesAwaitingSecondaryReview(records).length : null,
  }));
}

/** Countersign through an adapter: pending = released and not yet countersigned or returned. */
export function countersignSource(records: readonly CountersignRecord[]): QaBoardSource {
  return {
    id: COUNTERSIGN_SOURCE_ID,
    name: 'Countersign',
    scope: 'adapter',
    columns: [
      { id: 'resident', labelKey: 'qaActivityBoard.countersign.resident' },
      { id: 'attending', labelKey: 'qaActivityBoard.countersign.attending' },
      { id: 'status', labelKey: 'qaActivityBoard.countersign.status' },
      { id: 'changedFields', labelKey: 'qaActivityBoard.countersign.changedFields' },
    ],
    rows: records.map(r => ({
      id: r.id,
      caseId: r.caseId,
      startedAt: r.releasedAt,
      completedAt: r.countersignedAt ?? r.returnedAt,
      by: r.attendingName,
      discrepancy: r.status === 'pending' ? null : r.status === 'returned' || (r.changedFieldCount ?? 0) > 0,
      values: {
        resident: r.residentName,
        attending: r.attendingName ?? '',
        status: r.status,
        changedFields: r.changedFieldCount === undefined ? '' : String(r.changedFieldCount),
      },
    })),
    pending: records.filter(r => r.status === 'pending').length,
  };
}

/** The activity's TAT target: an active TAT entry whose type is the source id, the most general one (no facility, specimen, subspecialty or role). */
export function activityTatTargetHours(entries: readonly TATEntry[], sourceId: string): number | null {
  const candidates = entries.filter(e => e.active && e.type === sourceId);
  const general = candidates.find(e => !e.facilityId && !e.performingLabFacilityId && !e.specimenId && !e.subspecialtyId && !e.roleId);
  return (general ?? candidates[0])?.targetHours ?? null;
}

/** The tile for a source, over the period ending at `now`. */
export function qaBoardTile(source: QaBoardSource, targetHours: number | null, now: number, periodDays = BOARD_PERIOD_DAYS): QaBoardTile {
  const since = now - periodDays * 24 * HOUR;
  const done = source.rows.filter(r => r.completedAt && Date.parse(r.completedAt) >= since && Date.parse(r.completedAt) <= now);
  const judged = done.filter(r => r.discrepancy !== null);
  const timed = done.filter(r => r.startedAt);
  const within = targetHours === null ? [] : timed.filter(r => (Date.parse(r.completedAt!) - Date.parse(r.startedAt!)) / HOUR <= targetHours);
  const pct = (n: number, d: number) => Math.round((n / d) * 1000) / 10;
  return {
    sourceId: source.id,
    pending: source.pending,
    completed: done.length,
    tatCompliance: targetHours === null || timed.length === 0 ? null : pct(within.length, timed.length),
    discrepancyRate: judged.length === 0 ? null : pct(judged.filter(r => r.discrepancy).length, judged.length),
  };
}

/** Sources in board order: Standard, then Custom (each by name), then adapters. */
export function orderedSources(sources: readonly QaBoardSource[]): QaBoardSource[] {
  const rank = { standard: 0, custom: 1, adapter: 2 } as const;
  return [...sources].sort((a, b) => rank[a.scope] - rank[b.scope] || a.name.localeCompare(b.name));
}
