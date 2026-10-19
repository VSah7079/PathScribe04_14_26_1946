// src/services/scheduledReports/createScheduledReportService.ts
// ─────────────────────────────────────────────────
// Batch 613: the schedule service, built from its dependencies so it tests without module mocks.
// A run is Simulated: the saved report is built through the case search service (same access
// rules as the user's own search) and the counts are kept as the last run; nothing is mailed.
// ─────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { IScheduledReportService } from './IScheduledReportService';
import { cleanScheduleDraft, isDue, lookbackRange, nextRunAfter, outcomeForRecipient, recipientChoiceOf, validateScheduleDraft } from './scheduledReportRules';
import {
  scheduleChangedAudit, scheduleCreatedAudit, scheduleDeletedAudit, scheduleFailedAudit, schedulePausedAudit, scheduleRanAudit,
} from './scheduledReportAudit';
import {
  MAX_SCHEDULES_PER_USER, type RecipientAssessment, type RecipientRunOutcome, type ScheduledReport, type ScheduledReportDraft,
  type ScheduledReportError, type ScheduledRunRecord,
} from './scheduledReportTypes';

export const SCHEDULED_REPORTS_STORAGE_KEY = 'pathscribe_scheduledReports';

export interface ScheduledReportDeps {
  load(key: string, fallback: ScheduledReport[]): ScheduledReport[];
  save(key: string, value: ScheduledReport[]): void;
  audit(entry: NewAuditLog): void | Promise<unknown>;
  actor(): { id: string; name: string } | null;
  now(): Date;
  newId(): string;
  /** The saved report's name, or null when the user has no such report. */
  savedReportName(savedReportId: string): Promise<string | null>;
  /** Builds the saved report as the user and returns its counts. */
  runReport(savedReportId: string, lookback?: { dateFrom: string; dateTo: string }): Promise<ServiceResult<{ groupCount: number; rowCount: number; total: number }>>;
  /** The ids that are real, active users. */
  existingUserIds(ids: string[]): Promise<string[]>;
  /**
   * The report's case count as its owner sees it, and how many of those cases each of these people may see
   * (the owner's cases filtered by that person's own access rules, evaluated now). Absent: everyone sees everything.
   */
  recipientTotals?(
    savedReportId: string, userIds: string[], lookback?: { dateFrom: string; dateTo: string },
  ): Promise<ServiceResult<{ ownerTotal: number; visibleTotals: Record<string, number> }>>;
}

const fail = <T,>(error: ScheduledReportError): ServiceResult<T> => ({ ok: false, error });

export function createScheduledReportService(deps: ScheduledReportDeps): IScheduledReportService {
  const all = () => deps.load(SCHEDULED_REPORTS_STORAGE_KEY, []);
  const write = (list: ScheduledReport[]) => deps.save(SCHEDULED_REPORTS_STORAGE_KEY, list);
  const mine = (userId: string) => all().filter(s => s.ownerId === userId);
  const replace = (s: ScheduledReport) => write(all().map(x => (x.id === s.id ? s : x)));

  async function check(draft: ScheduledReportDraft): Promise<ScheduledReportError | { name: string; clean: ScheduledReportDraft }> {
    const clean = cleanScheduleDraft(draft);
    const problem = validateScheduleDraft(clean);
    if (problem) return problem;
    const name = await deps.savedReportName(clean.savedReportId);
    if (name === null) return 'REPORT_NOT_FOUND';
    const known = await deps.existingUserIds(clean.recipientUserIds);
    const recipients = clean.recipientUserIds.filter(id => known.includes(id));
    if (recipients.length === 0) return 'NO_RECIPIENTS';
    return { name, clean: { ...clean, recipientUserIds: recipients } };
  }

  function assessmentsFrom(ids: string[], totals: { ownerTotal: number; visibleTotals: Record<string, number> }): RecipientAssessment[] {
    return ids.map(userId => {
      const visibleCount = Math.min(totals.ownerTotal, totals.visibleTotals[userId] ?? 0);
      return { userId, seesAll: visibleCount >= totals.ownerTotal, visibleCount, totalCount: totals.ownerTotal };
    });
  }

  /** What this run does for each recipient, as the schedule's owner chose. Access is checked now, not when the schedule was saved. */
  async function recipientOutcomes(s: ScheduledReport, ownerTotal: number, lookback?: { dateFrom: string; dateTo: string }): Promise<RecipientRunOutcome[] | null> {
    if (!deps.recipientTotals) return s.recipientUserIds.map(userId => ({ userId, outcome: 'full' as const, caseCount: ownerTotal }));
    const res = await deps.recipientTotals(s.savedReportId, s.recipientUserIds, lookback);
    if (res.ok === false) return null;
    return assessmentsFrom(s.recipientUserIds, res.data).map(a => {
      const outcome = outcomeForRecipient(recipientChoiceOf(s, a.userId), a.seesAll);
      return { userId: a.userId, outcome, caseCount: outcome === 'skipped' ? 0 : a.visibleCount };
    });
  }

  async function runOne(s: ScheduledReport): Promise<ScheduledReport> {
    const at = deps.now();
    const lookback = s.lookbackDays === null ? undefined : lookbackRange(s.lookbackDays, at, s.timeZone);
    const res = await deps.runReport(s.savedReportId, lookback);
    const outcomes = res.ok ? await recipientOutcomes(s, res.data.total, lookback) : null;
    // If a recipient's access cannot be worked out, nothing is built for anyone: a run never guesses what a person may see.
    const failed = !res.ok || outcomes === null;
    const built = (outcomes ?? []).filter(o => o.outcome !== 'skipped').length;
    const base = { ranAt: at.toISOString(), simulated: true as const, recipientCount: failed ? 0 : built };
    const lastRun: ScheduledRunRecord = res.ok && outcomes
      ? { ...base, status: 'simulated', groupCount: res.data.groupCount, rowCount: res.data.rowCount, total: res.data.total, recipients: outcomes, message: '' }
      : { ...base, status: 'failed', groupCount: 0, rowCount: 0, total: 0, message: res.ok ? 'RECIPIENT_ACCESS_UNKNOWN' : String(res.error) };
    const next: ScheduledReport = { ...s, lastRun, nextRunAt: s.active ? nextRunAfter(s, at) : s.nextRunAt };
    replace(next);
    await deps.audit(res.ok
      ? scheduleRanAudit(s.savedReportName, { ...lastRun }, s.ownerName)
      : scheduleFailedAudit(s.savedReportName, lastRun.message, s.ownerName));
    return next;
  }

  return {
    async assessRecipients(savedReportId, recipientUserIds) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      if (await deps.savedReportName(savedReportId) === null) return fail('REPORT_NOT_FOUND');
      const ids = [...new Set(recipientUserIds.filter(Boolean))];
      if (ids.length === 0 || !deps.recipientTotals) return { ok: true, data: [] };
      const res = await deps.recipientTotals(savedReportId, ids);
      if (res.ok === false) return fail('RUN_FAILED');
      return { ok: true, data: assessmentsFrom(ids, res.data) };
    },

    async list() {
      const me = deps.actor();
      return { ok: true, data: me ? mine(me.id).map(s => ({ ...s })) : [] };
    },

    async create(draft) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      if (mine(me.id).length >= MAX_SCHEDULES_PER_USER) return fail('TOO_MANY_SCHEDULES');
      const checked = await check(draft);
      if (typeof checked === 'string') return fail(checked);
      const s: ScheduledReport = {
        ...checked.clean, id: deps.newId(), ownerId: me.id, ownerName: me.name, savedReportName: checked.name,
        active: true, createdAt: deps.now().toISOString(), nextRunAt: nextRunAfter(checked.clean, deps.now()),
      };
      write([...all(), s]);
      await deps.audit(scheduleCreatedAudit(s.savedReportName, s.frequency, s.recipientUserIds.length, me.name));
      return { ok: true, data: { ...s } };
    },

    async update(id, draft) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      const current = mine(me.id).find(s => s.id === id); if (!current) return fail('SCHEDULE_NOT_FOUND');
      const checked = await check(draft);
      if (typeof checked === 'string') return fail(checked);
      const s: ScheduledReport = { ...current, ...checked.clean, savedReportName: checked.name, nextRunAt: current.active ? nextRunAfter(checked.clean, deps.now()) : null };
      replace(s);
      await deps.audit(scheduleChangedAudit(s.savedReportName, s.frequency, s.recipientUserIds.length, me.name));
      return { ok: true, data: { ...s } };
    },

    async setActive(id, active) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      const current = mine(me.id).find(s => s.id === id); if (!current) return fail('SCHEDULE_NOT_FOUND');
      const s: ScheduledReport = { ...current, active, nextRunAt: active ? nextRunAfter(current, deps.now()) : null };
      replace(s);
      await deps.audit(schedulePausedAudit(s.savedReportName, active, me.name));
      return { ok: true, data: { ...s } };
    },

    async remove(id) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      const current = mine(me.id).find(s => s.id === id); if (!current) return fail('SCHEDULE_NOT_FOUND');
      write(all().filter(s => s.id !== id));
      await deps.audit(scheduleDeletedAudit(current.savedReportName, me.name));
      return { ok: true, data: undefined };
    },

    async runNow(id) {
      const me = deps.actor(); if (!me) return fail('NOT_SIGNED_IN');
      const current = mine(me.id).find(s => s.id === id); if (!current) return fail('SCHEDULE_NOT_FOUND');
      return { ok: true, data: await runOne(current) };
    },

    async runDue() {
      const me = deps.actor(); if (!me) return { ok: true, data: [] };
      const due = mine(me.id).filter(s => isDue(s, deps.now()));
      const ran: ScheduledReport[] = [];
      for (const s of due) ran.push(await runOne(s));
      return { ok: true, data: ran };
    },
  };
}
