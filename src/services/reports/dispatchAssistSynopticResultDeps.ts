// src/services/reports/dispatchAssistSynopticResultDeps.ts
// Batch 426: the real services behind dispatchAssistSynopticResult.ts.
import type { AssistSynopticDeps } from './dispatchAssistSynopticResult';
import { caseRouter } from '../cases/CaseRouter';
import { getTemplate } from '../templates/templateService';
import { mockUserService } from '../users/mockUserService';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockOutboundLisSyncQueueService } from './mockOutboundLisSyncQueueService';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { renderWorkupPdf } from './workupPdf';
import { resolveReportLocaleForFacility } from './resolveReportLocale';
import { surgicalReportLabelsFor, formatReportDateOfBirth } from './surgicalReportLabels';
import { formatDateTime } from '@/utils/formatDate';
import { resolvePerformingLabFacility } from './resolveReportLocale';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The code system releases this deployment has loaded (SNOMED CT edition, ICD-10-CM year, ICD-O). Unset is
 *  sent as null, never guessed; the API server sets these from its terminology release (PS-345). */
export const DEPLOYMENT_CODE_SYSTEM_VERSIONS: { snomed?: string; icd10?: string; icdO?: string } = {};

/** Batch 427: whether the lab performing a case ordered from this facility takes one PDF per accession. */
export async function labConsolidatesPdfs(orderingFacilityId: string | undefined): Promise<boolean> {
  const lab = await resolvePerformingLabFacility(orderingFacilityId).catch(() => undefined);
  return !!lab?.consolidateOutboundPdfs;
}

export const assistSynopticDeps: AssistSynopticDeps = {
  getCase: caseId => caseRouter.getCase(caseId) as any,
  getTemplate: async templateId => { const d = await getTemplate(templateId).catch(() => null); return (d?.template as any) ?? null; },
  getNpi: async userId => { const r = await mockUserService.getById(userId).catch(() => null); return r && r.ok ? r.data.npi || undefined : undefined; },
  organisationIdForPatient: async patientId => (await mockPatientIndexService.getById(patientId))?.organisationId,
  queue: mockOutboundLisSyncQueueService as any,
  dispatch: (id, payload) => dispatchInterfaceMessage(id, 'LIS_SYNC', payload),
  renderPdf: payload => renderWorkupPdf(payload),
  reportLanguage: async caseData => {
    const { language, locale } = await resolveReportLocaleForFacility(caseData?.order?.facilityId);
    return {
      language, labels: surgicalReportLabelsFor(language) as any,
      formatDate: iso => formatDateTime(iso, locale), formatDob: iso => formatReportDateOfBirth(iso, locale),
    };
  },
  codeVersions: () => DEPLOYMENT_CODE_SYSTEM_VERSIONS,
  now: () => new Date().toISOString(),
  // Batch 427: the performing lab's "one combined PDF per case" setting (Facility → LIS Integration).
  consolidatePdfs: caseData => labConsolidatesPdfs(caseData?.order?.facilityId),
};
