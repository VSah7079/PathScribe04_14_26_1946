// src/services/cytology/saveScreeningDayStart.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 574 (Pete, Oct 15, 2026; review): changing when the lab's screening
// day starts. It decides which day screening belongs to on the CLIA hours
// record, so it needs `config:cytology-workload-cap:manage` and is audited
// with the hour before and after. It applies from now on (the settings keep
// the history; past days are never re-dated).
// ─────────────────────────────────────────────────────────────────────────────
import { normaliseDayStartHour } from './screeningHoursRules';

export interface ScreeningDayStartSaveDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  get: () => Promise<{ ok: boolean; data?: { screeningDayStartHour?: number } }>;
  update: (patch: { screeningDayStartHour: number }) => Promise<{ ok: boolean }>;
  logAudit: (event: Record<string, unknown>) => unknown;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export async function saveScreeningDayStart(hour: number, user: { id: string; name?: string }, deps: ScreeningDayStartSaveDeps): Promise<'saved' | 'unchanged' | 'notPermitted' | 'invalid' | 'failed'> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'invalid';
  if (!(await deps.enforce('config:cytology-workload-cap:manage')).allowed) return 'notPermitted';
  const current = await deps.get();
  const before = normaliseDayStartHour(current.ok ? current.data?.screeningDayStartHour : 0);
  if (before === hour) return 'unchanged';
  const r = await deps.update({ screeningDayStartHour: hour });
  if (!r.ok) return 'failed';
  deps.logAudit({
    type: 'user', event: 'Cytology screening day start changed',
    detail: `Screening day start changed from ${hh(before)} to ${hh(hour)} (lab local time), from now on; earlier days keep ${hh(before)}.`,
    user: user.name || user.id, caseId: null, confidence: null,
  });
  return 'saved';
}
