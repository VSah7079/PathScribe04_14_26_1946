// src/services/labWorkflowReports/labWorkflowReportDeps.ts
// Batch 730: the app's services behind the lab workflow reports (labWorkflowReportService.ts). Cases are read with
// every case in view, as the Contribution dashboards do for their totals; the rows hold totals, and accession
// numbers only in the reconciliation exceptions. Station scan events need station:scan-history:view (checked by
// that service); a refusal comes back as null.
import { authorizationService, batchService, stationScanEventService, specimenDictionaryService } from '@/services';
import { caseRouter } from '../cases/CaseRouter';
import { resolveCaseDisciplineBranch } from '../specimenDictionary/resolveCaseDisciplineBranch';
import { withoutResearchCasesNow } from '../researchCases/researchCaseSettings';
import type { Case } from '@/types/case/Case';
import type { LabWorkflowReportDeps } from './labWorkflowReportService';

export async function labWorkflowReportDeps(): Promise<LabWorkflowReportDeps> {
  const dictRes = await specimenDictionaryService.getAll();
  const dictionary = dictRes.ok ? dictRes.data : [];
  return {
    enforce: key => authorizationService.enforce(key as never),
    loadCases: async () => {
      const res = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
      return res.ok ? (res.data as Case[]) : [];
    },
    loadBatches: async () => {
      const res = await batchService.getAll();
      return res.ok ? res.data : [];
    },
    loadEvents: async range => {
      const res = await stationScanEventService.query({ since: range.from, until: range.to });
      return res.ok === true ? res.data : null;
    },
    caseTypeOf: c => resolveCaseDisciplineBranch(c.specimens, dictionary, !!c.autopsy),
    withoutResearch: cases => withoutResearchCasesNow(cases),
  };
}
