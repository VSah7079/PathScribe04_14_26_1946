// src/services/reports/dispatchAssistSynopticResultDeps.ts
// Batch 426: the real services behind dispatchAssistSynopticResult.ts.
import type { AssistSynopticDeps } from './dispatchAssistSynopticResult';
import { caseRouter } from '../cases/CaseRouter';
import { getTemplate } from '../templates/templateService';
import { userService } from '../users/userServiceInstance';
import { patientIndexService } from '../patients/patientServicesInstance';
import { outboundLisSyncQueueService } from './reportServicesInstance';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { renderWorkupPdf } from './workupPdf';
import { resolveReportLocaleForFacility } from './resolveReportLocale';
import { surgicalReportLabelsFor, formatReportDateOfBirth } from './surgicalReportLabels';
import { formatDateTime } from '@/utils/formatDate';
import { resolvePerformingLabFacility } from './resolveReportLocale';
import { reportTranslateFor } from './reportTranslate';
import { organMapDeliveryOf, organMapForDelivery, type OrganMapFileFormat } from '../organMapping/organMapDelivery';
import { svgToJpegDataUrl, svgToPngDataUrl } from '../documentRendering/svgToPng';
import { jpegPdfBase64 } from '../documentRendering/imagePdf';
import { auditService } from '../auditlog/auditServiceInstance';

/** Batch 751: the organ map drawn as the file the site asked for (a browser canvas; undefined where there is none). */
export async function drawOrganMapFile(svg: string, format: OrganMapFileFormat): Promise<{ base64: string } | undefined> {
  if (format === 'png') {
    const png = await svgToPngDataUrl(svg, 3);
    return png?.startsWith('data:image/png;base64,') ? { base64: png.slice('data:image/png;base64,'.length) } : undefined;
  }
  const jpeg = await svgToJpegDataUrl(svg, 3);
  if (!jpeg?.startsWith('data:image/jpeg;base64,')) return undefined;
  const pdf = jpegPdfBase64(jpeg.slice('data:image/jpeg;base64,'.length));
  return pdf ? { base64: pdf } : undefined;
}

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
  getNpi: async userId => { const r = await userService.getById(userId).catch(() => null); return r && r.ok ? r.data.npi || undefined : undefined; },
  organisationIdForPatient: async patientId => (await patientIndexService.getById(patientId))?.organisationId,
  queue: outboundLisSyncQueueService as any,
  dispatch: (id, payload) => dispatchInterfaceMessage(id, 'LIS_SYNC', payload),
  renderPdf: payload => renderWorkupPdf(payload),
  // Batch 538: each PDF sent to the LIS is stored once with its SHA-256; a retry sends the stored one.
  documents: {
    store: async input => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.store(input),
    read: async id => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.read(id),
  },
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
  // Batch 751: the performing lab's organ map delivery (Facility → LIS Integration), drawn in the report's language.
  organMap: {
    settings: async caseData => organMapDeliveryOf(await resolvePerformingLabFacility((caseData as { order?: { facilityId?: string } }).order?.facilityId).catch(() => undefined)),
    build: async (caseData, instance, settings, at) => {
      const c = caseData as Parameters<typeof organMapForDelivery>[0];
      return organMapForDelivery(c, instance as Parameters<typeof organMapForDelivery>[1], settings, at, { t: (await reportTranslateFor(c.order?.facilityId)) as never, drawFile: drawOrganMapFile });
    },
    audit: entry => {
      void auditService.logEvent({ type: 'system', event: entry.event, detail: entry.detail, user: 'System', caseId: entry.caseId, confidence: null })
        .catch(e => console.error('[organMapDelivery] could not audit:', e));
    },
  },
};
