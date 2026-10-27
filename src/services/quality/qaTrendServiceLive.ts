// src/services/quality/qaTrendServiceLive.ts
// Batch 442 (PS-147): the trend service wired to this build's mock services.
// trendRecords() resolves each QA record's performing lab (from the case's
// ordering facility) and specimen type (the specimen's dictionary entry).
import type { QaTrendRecommendation } from '@/types/quality/QaTrend';
import type { TrendRecord } from './qaTrendRules';
import { createQaTrendService } from './qaTrendService';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { qaTrendPolicyService } from './qaTrendPolicyServiceInstance';
import { DEFAULT_QA_TREND_POLICY_SETTINGS } from './qaTrendRules';

const KEY = 'pathscribe_qa_trend_recommendations';

async function trendRecords(): Promise<TrendRecord[]> {
  const { qaActivityRecordService } = await import('./qaActivityRecordServiceInstance');
  const { caseRouter } = await import('../cases/CaseRouter');
  const { facilityService } = await import('../facilities/facilityServiceInstance');
  const { resolvePerformingLabFacilityId } = await import('../facilities/IFacilityService');
  const { specimenDictionaryService } = await import('../specimenDictionary/specimenDictionaryServiceInstance');
  const [recordsRes, facilitiesRes, dictRes, casesRes] = await Promise.all([
    qaActivityRecordService.getAll(), facilityService.getAll(), specimenDictionaryService.getAll(),
    caseRouter.getAll(undefined, { includeOrchestration: true }),
  ]);
  if (!recordsRes.ok) return [];
  const facilities = new Map((facilitiesRes.ok ? facilitiesRes.data : []).map(f => [f.id, f]));
  const dict = new Map((dictRes.ok ? dictRes.data : []).map(e => [e.id, e]));
  const cases = new Map((casesRes.ok ? casesRes.data : []).map(c => [c.id, c]));
  return recordsRes.data.map(record => {
    const c = cases.get(record.caseId);
    const facility = c?.order?.facilityId ? facilities.get(c.order.facilityId) : undefined;
    const specimen = (c?.specimens ?? []).find(s => s.id === record.specimenId) as { specimenDictionaryEntryId?: string } | undefined;
    const entry = specimen?.specimenDictionaryEntryId ? dict.get(specimen.specimenDictionaryEntryId) : undefined;
    return {
      record,
      performingLabId: facility ? resolvePerformingLabFacilityId(facility) : undefined,
      specimenType: entry ? { id: entry.id, name: entry.name || entry.id } : undefined,
    };
  });
}

export const qaTrendService = createQaTrendService({
  load: () => storageGet<QaTrendRecommendation[]>(KEY, []),
  persist: all => storageSet(KEY, all),
  trendRecords,
  policy: async () => { const r = await qaTrendPolicyService.get(); return r.ok ? r.data : DEFAULT_QA_TREND_POLICY_SETTINGS; },
  enforce: capability => authorizationService.enforce(capability),
  audit: entry => auditService.logEvent(entry),
  actor: () => { const s = readSessionProfile(); return { userId: s?.id ?? 'unknown', userName: s?.name ?? 'unknown' }; },
});
