// src/hooks/useAutopsyDashboard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): loads the autopsy cases and the turnaround targets for
// the autopsy dashboards page and holds the page's choices (tier, period,
// department, case, Simulated cases on or off). Everything the page shows is
// worked out by services/autopsy/dashboard/autopsyDashboardView.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { caseService, tatTargetService } from '@/services';
import type { Case } from '@/types/case/Case';
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { buildAutopsyDashboardRecords } from '@/services/autopsy/dashboard/buildAutopsyDashboardRecords';
import {
  buildAutopsyDashboardView, type AutopsyDashboardPeriod, type AutopsyDashboardTier,
} from '@/services/autopsy/dashboard/autopsyDashboardView';

export function useAutopsyDashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [tatEntries, setTatEntries] = useState<TATEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [tier, setTier] = useState<AutopsyDashboardTier>('enterprise');
  const [period, setPeriod] = useState<AutopsyDashboardPeriod>('90');
  const [includeSimulated, setIncludeSimulated] = useState(true);
  const [facilityId, setFacilityId] = useState<string | undefined>(undefined);
  const [caseId, setCaseId] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    const [c, tat] = await Promise.all([caseService.getAll(), tatTargetService.getAll()]);
    setCases(c.ok ? c.data : []);
    setTatEntries(tat.ok ? tat.data : []);
    setNow(new Date());
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const records = useMemo(
    () => buildAutopsyDashboardRecords({ cases, includeSimulated, now }),
    [cases, includeSimulated, now],
  );
  const view = useMemo(
    () => buildAutopsyDashboardView({ records, tatEntries, tier, period, facilityId, caseId, now }),
    [records, tatEntries, tier, period, facilityId, caseId, now],
  );

  return {
    view, loading, reload,
    tier, setTier, period, setPeriod, includeSimulated, setIncludeSimulated,
    facilityId, setFacilityId, caseId, setCaseId,
  };
}
