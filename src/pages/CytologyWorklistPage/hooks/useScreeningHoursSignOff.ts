// src/pages/CytologyWorklistPage/hooks/useScreeningHoursSignOff.ts
// Batch 572 (Pete, Oct 14, 2026; F7 option C): today's recorded screening hours for the signed-in person and
// their end-of-day sign-off. Batch 574 (Pete, Oct 15): yesterday too while it still needs signing off (a night
// shift that crossed the lab's start of day), and the lab's start-of-day hour. Orchestration only; the rules
// are services/cytology/screeningHoursRules.ts and the service checks the capability and the date.
import { useCallback, useEffect, useState } from 'react';
import { cytologyScreeningHoursService, signOffProblem, type ScreeningHoursCurrentDays } from '@/services';
import type { ScreeningHoursReason } from '@/types/cytology/CytologyScreeningHoursSignOff';

export type SignOffResult = 'saved' | 'hoursInvalid' | 'reasonRequired' | 'noteRequired' | 'noteTooLong' | 'dateNotAllowed' | 'failed';
const KNOWN: readonly string[] = ['hoursInvalid', 'reasonRequired', 'noteRequired', 'noteTooLong', 'dateNotAllowed'];

export function useScreeningHoursSignOff(user: { id: string; name?: string } | null | undefined, enabled: boolean, timezone: string) {
  const [days, setDays] = useState<ScreeningHoursCurrentDays | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !enabled) { setDays(null); return; }
    const r = await cytologyScreeningHoursService.currentDays(user.id, timezone);
    setDays(r.ok ? r.data : null);
  }, [user?.id, enabled, timezone]);

  // Batch 574: read again when the window is shown and every few minutes, so the days follow the clock.
  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 5 * 60_000);
    const onShow = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onShow); };
  }, [load]);

  const signOff = useCallback(async (date: string, signedHours: number, reasonId?: ScreeningHoursReason, note?: string): Promise<SignOffResult> => {
    const day = days && [days.today, days.yesterday].find(d => d?.date === date);
    if (!user?.id || !day) return 'failed';
    const problem = signOffProblem(day.recordedHours, signedHours, reasonId, note);
    if (problem) return problem;
    setSaving(true);
    try {
      const r = await cytologyScreeningHoursService.signOff(user, { date, signedHours, reasonId, note }, timezone);
      // Batch 574: the day moved on while the panel was open: show the days as they are now.
      if (!r.ok && r.error === 'dateNotAllowed') await load();
      if (!r.ok) return KNOWN.includes(r.error as string) ? (r.error as SignOffResult) : 'failed';
      await load();
      return 'saved';
    } finally {
      setSaving(false);
    }
  }, [user, days, load, timezone]);

  return { today: days?.today ?? null, yesterday: days?.yesterday ?? null, saving, signOff, reload: load };
}
