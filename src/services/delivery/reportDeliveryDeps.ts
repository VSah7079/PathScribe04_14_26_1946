// src/services/delivery/reportDeliveryDeps.ts
// Batch 520 (PS-280): the real services deliverReport.ts uses, wired once (deployment-neutral:
// screens and the release path take these, never the mock files).
import type { Case } from '@/types/case/Case';
import type { ReportDeliveryDeps } from './deliverReport';
import { reportDeliveryQueueService } from './reportDeliveryQueueServiceInstance';
import { savedReportPdf, type GenerateReportPdf } from '../reports/resolveOruReportPdf';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';

/**
 * A cytology case's report PDF, rebuilt for a delivery retry. Batch 532 (Pete,
 * Oct 12): the consolidated case report, every specimen as it stands. It used
 * to rebuild the newest record on the case, which could be another specimen's.
 */
function cytologyReportPdf(caseId: string, _reportType: string): GenerateReportPdf {
  return async () => {
    const [{ cytologySignOutRecordService }, { caseRouter }, { resolveCytologyCaseReport }, { generateCytologyCaseReportPdfSnapshot }] = await Promise.all([
      import('../cytology/cytologySignOutRecordServiceInstance'), import('../cases/CaseRouter'),
      import('../cytology/resolveCytologyCaseReport'), import('../cytology/generateCytologyCaseReportPdf'),
    ]);
    const [records, caseData] = await Promise.all([cytologySignOutRecordService.getByCaseId(caseId), caseRouter.getCase(caseId)]);
    if (!caseData || !records.ok || !records.data.length) return { generationError: 'no cytology sign-out record for this case' };
    return generateCytologyCaseReportPdfSnapshot(resolveCytologyCaseReport(caseData, records.data));
  };
}

export const reportDeliveryDeps: ReportDeliveryDeps = {
  async getCase(caseId) {
    const { caseRouter } = await import('../cases/CaseRouter');
    return (await caseRouter.getCase(caseId)) as Case | undefined;
  },
  async getPhysician(id) {
    const { physicianService } = await import('../physicians/physicianServiceInstance');
    const r = await physicianService.getById(id).catch(() => null);
    return r && r.ok ? r.data : undefined;
  },
  async getFacility(id) {
    const { facilityService } = await import('../facilities/facilityServiceInstance');
    const r = await facilityService.getById(id).catch(() => null);
    return r && r.ok ? r.data : undefined;
  },
  reportPdf: (caseId, reportType, source) => (source === 'CYTOLOGY' ? cytologyReportPdf(caseId, reportType) : savedReportPdf(caseId, reportType)),
  // Batch 538: a resend sends the release's own stored document.
  documentPdf: documentId => async () => {
    const [{ documentPdf }, { reportDocumentService }] = await Promise.all([
      import('../reportDocuments/reportDocumentService'), import('../reportDocuments/reportDocumentInstance'),
    ]);
    return documentPdf(documentId, reportDocumentService)();
  },
  queue: reportDeliveryQueueService,
  send: (id, payload) => dispatchInterfaceMessage(id, 'REPORT_DELIVERY', payload),
};
