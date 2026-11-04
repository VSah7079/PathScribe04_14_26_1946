// src/services/cytology/mockCytologyScreeningHoursService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (F7, option C): the demo's screening-hours service. The recorded
// figure comes from the workload ledger's active seconds (the browser's
// visible-tab count, standing in for the server's own screening events);
// sign-offs are kept append-only and audited. With the API server the
// recorded figure and the sign-off are the server's (CYTOLOGY_QC_API.md §5).
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { ICytologyScreeningHoursService } from './ICytologyScreeningHoursService';
import type { CytologyScreeningHoursSignOff } from '@/types/cytology/CytologyScreeningHoursSignOff';
import { mockCytologyWorkloadLedgerService } from './mockCytologyWorkloadLedgerService';
import { mockAuditService as auditService } from '@/services/auditlog/mockAuditService';
import { dayStartFromSettings, dayStartHourAt, isCorrection, isFlagged, latestSignOff, recordedHoursForDay, signOffDays, signOffProblem, yesterdayNeedsSignOff, type DayStart } from './screeningHoursRules';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';

const KEY = 'cytology_screening_hours_signoff_v1';
const load = (): CytologyScreeningHoursSignOff[] => storageGet<CytologyScreeningHoursSignOff[]>(KEY, []);
const persist = (data: CytologyScreeningHoursSignOff[]) => storageSet(KEY, data);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

/** Batch 574: the lab's start of day (the workload settings, with its history of changes). */
async function dayStart(): Promise<DayStart> {
  const s = await mockCytologyWorkloadCapSettingsService.get();
  return dayStartFromSettings(s.ok ? s.data : null);
}

async function recorded(userId: string, date: string, timezone: string, startHour: DayStart): Promise<number> {
  const ledger = await mockCytologyWorkloadLedgerService.getAll();
  return ledger.ok ? recordedHoursForDay(ledger.data, userId, date, timezone, startHour) : 0;
}

async function dayOf(userId: string, date: string, timezone: string, startHour: DayStart) {
  return { date, recordedHours: await recorded(userId, date, timezone, startHour), signOff: latestSignOff(load(), userId, date) };
}

/**
 * Batch 576: the service with its clock passed in, so "today" and "yesterday" can be tested at any moment
 * (a day boundary, a time-zone change). The app uses the instance below, on the real clock.
 */
export function createMockCytologyScreeningHoursService(clock: () => Date = () => new Date()): ICytologyScreeningHoursService {
  return {
  async forDay(userId, date, timezone) {
    return ok(await dayOf(userId, date, timezone, await dayStart()));
  },

  async currentDays(userId, timezone) {
    const start = await dayStart();
    const now = clock();
    const { today, yesterday } = signOffDays(now, timezone, start);
    const [t, y] = await Promise.all([dayOf(userId, today, timezone, start), dayOf(userId, yesterday, timezone, start)]);
    return ok({ today: t, yesterday: yesterdayNeedsSignOff(y) ? y : null, dayStartHour: dayStartHourAt(start, now) });
  },

  async signOff(user, input, timezone) {
    // Loaded here, not at the top: the authorization service reads the role store, which reads this module's neighbours.
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce('cytology:screening-hours:sign-off', {})).allowed) return { ok: false, error: 'NOT_PERMITTED' };
    const startHour = await dayStart();
    // Batch 574: today, or yesterday while it still needs signing off (a night shift's first part); older days,
    // and a yesterday already signed off, are the supervisor's.
    const now = clock();
    const days = signOffDays(now, timezone, startHour);
    if (input.date !== days.today && input.date !== days.yesterday) return { ok: false, error: 'dateNotAllowed' };
    if (input.date === days.yesterday && !yesterdayNeedsSignOff(await dayOf(user.id, input.date, timezone, startHour))) return { ok: false, error: 'dateNotAllowed' };
    const recordedHours = await recorded(user.id, input.date, timezone, startHour);
    const problem = signOffProblem(recordedHours, input.signedHours, input.reasonId, input.note);
    if (problem) return { ok: false, error: problem };
    const correction = isCorrection(recordedHours, input.signedHours);
    const record: CytologyScreeningHoursSignOff = {
      // A confirmation stores the recorded figure itself (6.04 shown as "6.0" and confirmed is 6.04, not 6.0).
      id: crypto.randomUUID(), userId: user.id, date: input.date, recordedHours, signedHours: correction ? Math.round(input.signedHours * 100) / 100 : recordedHours,
      ...(correction ? { reasonId: input.reasonId, ...(input.note?.trim() ? { note: input.note.trim() } : {}) } : {}),
      flagged: correction && isFlagged(recordedHours, input.signedHours), signedAt: now.toISOString(),
      // Batch 574: the start of day in force when signed (what "the day" meant to the person).
      dayStartHour: dayStartHourAt(startHour, now),
    };
    persist([...load(), record]);
    auditService.logEvent({
      type: 'user', event: 'Cytology screening hours signed off',
      detail: `${user.name ?? user.id} signed off ${record.signedHours} h of screening for ${record.date} (recorded ${recordedHours} h)${correction ? `, corrected: ${record.reasonId}${record.flagged ? ', flagged for review' : ''}` : ''}.`,
      user: user.id, caseId: null, confidence: null,
    });
    return ok(record);
  },

  async getAll() {
    return ok(load());
  },
};
}

export const mockCytologyScreeningHoursService: ICytologyScreeningHoursService = createMockCytologyScreeningHoursService();
