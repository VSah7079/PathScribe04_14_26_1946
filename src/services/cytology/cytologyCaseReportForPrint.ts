// src/services/cytology/cytologyCaseReportForPrint.ts
// Batch 532 (Pete, Oct 12, 2026: "a Master Case Report View"): the
// consolidated case report for the Cytology Workspace's "Print case report",
// once the case has been released; null before (each specimen's own Print
// still shows its report or preview while the case is being worked).
//
// Batch 539 (PS-539 D2: the browser only shows what was sent): the case
// report as released, its stored report document (the newest final,
// correction or addendum), byte for byte. A case released before Batch 538
// has no stored document; its report is made by the report renderer.
import type { Case } from '@/types/case/Case';
import type { IReportDocumentService } from '../reportDocuments/reportDocumentService';
import { cytologySignOutRecordService } from './cytologySignOutRecordServiceInstance';
import { cytologyCaseIsReleased } from './cytologyCaseReportMessage';
import { resolveCytologyCaseReport } from './resolveCytologyCaseReport';
import { base64ToBytes } from '../reportDocuments/reportDocuments';

const lazyDocuments: Pick<IReportDocumentService, 'listByCase' | 'read'> = {
  listByCase: async id => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.listByCase(id),
  read: async id => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.read(id),
};

/** The newest released cytology case document's bytes, or null when there is none. Throws when it fails its check. */
export async function releasedCytologyCaseDocument(caseId: string, documents: Pick<IReportDocumentService, 'listByCase' | 'read'> = lazyDocuments): Promise<Uint8Array | null> {
  const list = await documents.listByCase(caseId);
  if (!list.ok) return null;
  // Batch 556: the server's list couldn't be read. Never print a fresh render or an older document in place of what was sent.
  if (list.meta?.partial) throw new Error('The released case report could not be read (the PathScribe server did not answer).');
  const newest = list.data
    .filter(d => d.source === 'CYTOLOGY' && d.reportType !== 'PRELIMINARY')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .pop();
  if (!newest) return null;
  const read = await documents.read(newest.id);
  if (read.ok === false) throw new Error(`The released case report could not be read (${read.error}).`);
  return base64ToBytes(read.data.pdfBase64);
}

export async function cytologyCaseReportForPrint(
  caseData: Case,
  cytologySpecimenIds: readonly string[],
  documents: Pick<IReportDocumentService, 'listByCase' | 'read'> = lazyDocuments,
): Promise<Uint8Array | null> {
  if (!cytologyCaseIsReleased(caseData)) return null;
  const sent = await releasedCytologyCaseDocument(caseData.id, documents);
  if (sent) return sent;
  const records = await cytologySignOutRecordService.getByCaseId(caseData.id);
  if (!records.ok || !records.data.length) return null;
  const { generateCytologyCaseReportPdf } = await import('./generateCytologyCaseReportPdf');
  return generateCytologyCaseReportPdf(resolveCytologyCaseReport(caseData, records.data, cytologySpecimenIds));
}
