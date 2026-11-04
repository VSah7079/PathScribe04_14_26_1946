// src/services/scheduledReports/scheduledReportAudit.ts
// ─────────────────────────────────────────────────
// Batch 613: audit entries for report schedules. Pure. Literal English and PHI-free: the saved
// report's name, the frequency and counts. Never a recipient's name or address, never a row.
// ─────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { ScheduleFrequency } from './scheduledReportTypes';

const entry = (event: string, detail: string, user: string): NewAuditLog =>
  ({ type: 'user', event, detail, user, caseId: null, confidence: null });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const scheduleCreatedAudit = (report: string, freq: ScheduleFrequency, recipients: number, user: string) =>
  entry('Report Schedule Created', `Report "${report}" scheduled ${freq} for ${plural(recipients, 'recipient')}. Simulated: nothing is sent until the API server runs schedules.`, user);
export const scheduleChangedAudit = (report: string, freq: ScheduleFrequency, recipients: number, user: string) =>
  entry('Report Schedule Changed', `Schedule for report "${report}" changed to ${freq} for ${plural(recipients, 'recipient')}.`, user);
export const schedulePausedAudit = (report: string, active: boolean, user: string) =>
  entry(active ? 'Report Schedule Resumed' : 'Report Schedule Paused', `Schedule for report "${report}" ${active ? 'resumed' : 'paused'}.`, user);
export const scheduleDeletedAudit = (report: string, user: string) =>
  entry('Report Schedule Deleted', `Schedule for report "${report}" deleted.`, user);
export const scheduleRanAudit = (
  report: string,
  r: { groupCount: number; rowCount: number; total: number; recipientCount: number; recipients?: { outcome: 'full' | 'narrowed' | 'skipped' }[] },
  user: string,
) => {
  const narrowed = (r.recipients ?? []).filter(x => x.outcome === 'narrowed').length;
  const skipped = (r.recipients ?? []).filter(x => x.outcome === 'skipped').length;
  const access = narrowed || skipped ? ` Access: ${narrowed} narrowed to what the recipient may see, ${skipped} skipped, as the schedule's owner chose.` : '';
  return entry('Report Schedule Run', `Simulated: report "${report}" run for ${plural(r.recipientCount, 'recipient')} (${plural(r.total, 'case')} matched, ${plural(r.groupCount, 'group')}, ${plural(r.rowCount, 'row')}).${access} Nothing was sent.`, user);
};
export const scheduleFailedAudit = (report: string, reason: string, user: string) =>
  entry('Report Schedule Failed', `Simulated run of report "${report}" failed: ${reason}.`, user);
