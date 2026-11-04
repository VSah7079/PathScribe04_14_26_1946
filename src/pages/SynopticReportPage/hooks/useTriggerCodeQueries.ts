// src/pages/SynopticReportPage/hooks/useTriggerCodeQueries.ts
// PS-138: the searches the Code Manager offers for the case's matched abnormal-detection triggers.
// Runs only while the Code Manager is open (no network call on every rule match) and only where abnormal detection is on.
import { useEffect, useState } from 'react';
import { abnormalTriggerRuleService, facilityService } from '@/services';
import { resolvePerformingLabFacilityId } from '@/services/facilities/IFacilityService';
import { resolveAbnormalDetectionEnabled } from '@/services/abnormalDetection/resolveAbnormalDetectionEnabled';
import { triggerCodeQueries, type TriggerCodeQuery } from '@/services/abnormalDetection/triggerCodeQueries';
import { getTemplate } from '@/services/templates/templateService';
import { partGridRowsOf } from '@/services/templates/partGrid';
import { resolveAnswers } from '@/orchestrator/contextBuilder';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import type { Case } from '@/types/case/Case';

export function useTriggerCodeQueries(caseData: Case | null | undefined, open: boolean): TriggerCodeQuery[] {
  const enterpriseEnabled = useSystemConfig().enterpriseConfig.features.abnormalDetectionEnabled;
  const [queries, setQueries] = useState<TriggerCodeQuery[]>([]);
  useEffect(() => {
    if (!open || !caseData?.synopticReports?.length) { setQueries([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const facilityId = caseData.order?.facilityId;
        let labId: string | undefined;
        let facilityEnabled: boolean | undefined;
        if (facilityId) {
          const f = await facilityService.getById(facilityId);
          if (f.ok) { labId = resolvePerformingLabFacilityId(f.data); facilityEnabled = f.data.abnormalDetectionEnabled; }
        }
        if (!resolveAbnormalDetectionEnabled(enterpriseEnabled, facilityEnabled)) { if (!cancelled) setQueries([]); return; }
        const rules = await abnormalTriggerRuleService.getAll();
        if (!rules.ok) { if (!cancelled) setQueries([]); return; }
        const active = rules.data.filter(r => r.status === 'Active' && (!r.performingLabFacilityId || r.performingLabFacilityId === labId));
        const perReport = await Promise.all((caseData.synopticReports ?? []).map(async report => {
          const detail = await getTemplate(report.templateId);
          const resolved = resolveAnswers(report.answers ?? {}, detail?.template ?? null, partGridRowsOf(caseData.specimens));
          return triggerCodeQueries(report.specimenId, resolved, active);
        }));
        if (!cancelled) setQueries(perReport.flat());
      } catch { if (!cancelled) setQueries([]); }
    })();
    return () => { cancelled = true; };
  }, [caseData, open, enterpriseEnabled]);
  return queries;
}
