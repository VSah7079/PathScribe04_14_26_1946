// src/services/delivery/deliverReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 520 (PS-280): sends a released report by e-fax or file drop.
//
// The browser can't fax or write to a hospital's server, so the report PDF and
// its metadata go to the interface server as a REPORT_DELIVERY message, and
// the server delivers it (functions/report_delivery.py today; the API server's
// contract is docs/architecture/REPORT_DELIVERY_API.md). The server answers
// only once the fax gateway has accepted the fax, or the files are written; so
// "sent" here means delivered to the gateway or the folder.
//
// Every delivery is a queue entry first (report delivery queue), so a failure
// shows in Audit Log → Interfaces → Outbound with its reason and can be sent
// again (interface:outbound:resend). The PDF isn't stored in the entry: it is
// the release's PDF, or, on a resend, the case's signed report read again.
//
// Fax recipient: the rule's fax number, else the ordering physician's, else
// the ordering facility's. With none, the entry fails saying so; a resend
// looks again, so adding the number to the physician is the fix.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { ReportDeliveryQueueEntry, ReportDeliveryChannel } from '@/types/delivery/ReportDeliveryQueueEntry';
import type { IReportDeliveryQueueService } from './IReportDeliveryQueueService';
import type { GenerateReportPdf } from '../reports/resolveOruReportPdf';
import type { ReportPdf } from '../reportDocuments/reportDocuments';
import type { InterfaceDispatchResult } from '../interfaceDispatch/dispatchInterfaceMessage';
import type { ReportReleasedEventType } from '../reports/publishReportReleasedEvent';
import { deliveryDocumentName, faxRecipient, type ChannelOutcome, type ChannelRole } from './deliveryPlan';
import { isResearchCaseNow } from '../researchCases/researchCaseSettings';

export interface ReportDeliveryDeps {
  getCase(caseId: string): Promise<Case | undefined>;
  getPhysician(id: string): Promise<{ fax?: string; firstName?: string; lastName?: string } | undefined>;
  getFacility(id: string): Promise<{ fax?: string; name?: string } | undefined>;
  /** The case's signed report PDF, when the release didn't bring one (and on a resend). */
  reportPdf(caseId: string, reportType: ReportReleasedEventType, source: 'SURGPATH' | 'CYTOLOGY'): GenerateReportPdf | undefined;
  /** Batch 538: a stored release document, by id (a resend sends the release's own document). */
  documentPdf?(documentId: string): GenerateReportPdf;
  queue: IReportDeliveryQueueService;
  /** dispatchInterfaceMessage(queueEntryId, 'REPORT_DELIVERY', payload). */
  send(queueEntryId: string, payload: object): Promise<InterfaceDispatchResult>;
}

export interface DeliverReportInput {
  caseId: string;
  reportType: ReportReleasedEventType;
  source: 'SURGPATH' | 'CYTOLOGY';
  releasedAt: string;
  channel: ReportDeliveryChannel;
  role: ChannelRole;
  ruleFaxNumber?: string;
  fileDropTargetId?: string;
  /** The release's own PDF, when it has one. */
  generatePdf?: GenerateReportPdf;
  /** Batch 521 (PS-281): kept on the entry for a later fallback (a primary fax whose transmission fails). */
  fallbackChannels?: ReportDeliveryQueueEntry['fallbackChannels'];
  release?: ReportDeliveryQueueEntry['release'];
}

/** The REPORT_DELIVERY message the interface server receives. */
export interface ReportDeliveryPayload {
  channel: ReportDeliveryChannel;
  caseId: string;
  reportType: ReportReleasedEventType;
  releasedAt: string;
  documentName: string;
  pdfBase64: string;
  /** Batch 538: the report document's id and SHA-256, so the receiver can record and check what it sent. */
  reportDocumentId?: string;
  pdfSha256?: string;
  metadata: Record<string, string>;
  fax?: { number: string; recipientName?: string };
  fileDrop?: { targetId: string };
}

const accessionOf = (c: Case) => c.accession?.fullAccession ?? c.accession?.accessionNumber ?? c.id;

/** What the metadata file and the record carry: accession, MRN, ordering physician and facility, when known. */
async function metadataFor(c: Case, deps: ReportDeliveryDeps): Promise<Record<string, string>> {
  const order = (c as { order?: { orderingPhysicianId?: string; facilityId?: string } }).order;
  const [physician, facility] = await Promise.all([
    order?.orderingPhysicianId ? deps.getPhysician(order.orderingPhysicianId) : undefined,
    order?.facilityId ? deps.getFacility(order.facilityId) : undefined,
  ]);
  const meta: Record<string, string> = { accession: accessionOf(c) };
  const mrn = (c as { patient?: { mrn?: string } }).patient?.mrn;
  if (mrn) meta.mrn = mrn;
  const doctor = [physician?.firstName, physician?.lastName].filter(Boolean).join(' ');
  if (doctor) meta.orderingPhysician = doctor;
  if (facility?.name) meta.orderingFacility = facility.name;
  return meta;
}

/** Who the fax goes to, for this case. */
async function findFaxRecipient(c: Case, ruleFax: string | undefined, deps: ReportDeliveryDeps) {
  const order = (c as { order?: { orderingPhysicianId?: string; facilityId?: string } }).order;
  const [physician, facility] = await Promise.all([
    order?.orderingPhysicianId ? deps.getPhysician(order.orderingPhysicianId) : undefined,
    order?.facilityId ? deps.getFacility(order.facilityId) : undefined,
  ]);
  return faxRecipient(ruleFax, physician, facility);
}

export const NO_FAX_NUMBER = 'No fax number to send to: the rule sets none, and neither the ordering physician nor the ordering facility has one.';
export const NO_REPORT_PDF = 'The signed report PDF is not available yet';

/** The message for an entry (first send or resend): its PDF, and for a fax its recipient
 *  (looked up again if the entry has none). `held` says why it can't be sent now. */
export async function buildReportDeliveryPayload(
  entry: ReportDeliveryQueueEntry, deps: ReportDeliveryDeps, generatePdf?: GenerateReportPdf,
): Promise<{ payload: ReportDeliveryPayload } | { held: string }> {
  let fax = entry.fax;
  if (entry.channel === 'FAX' && !fax) {
    const c = await deps.getCase(entry.caseId);
    const found = c ? await findFaxRecipient(c, entry.ruleFaxNumber, deps) : null;
    if (!found) return { held: NO_FAX_NUMBER };
    fax = { number: found.number, ...(found.name ? { recipientName: found.name } : {}) };
    await deps.queue.setFaxRecipient(entry.id, fax);
  }
  // Batch 538: the release's own document when it has one (a correction's retry used to send the
  // case's newest signed PDF, the pre-correction one; a preliminary's was held for good).
  const pdfSource = generatePdf
    ?? (entry.release?.documentId && deps.documentPdf ? deps.documentPdf(entry.release.documentId) : deps.reportPdf(entry.caseId, entry.reportType, entry.source));
  const pdf: ReportPdf = pdfSource
    ? await pdfSource().catch(e => ({ generationError: e instanceof Error ? e.message : String(e) }))
    : { generationError: 'no PDF is made for this kind of report' };
  if (!pdf.pdfBase64) return { held: `${NO_REPORT_PDF} (${pdf.generationError ?? 'unknown'}).` };
  return {
    payload: {
      channel: entry.channel, caseId: entry.caseId, reportType: entry.reportType, releasedAt: entry.releasedAt,
      documentName: entry.documentName, pdfBase64: pdf.pdfBase64, metadata: entry.metadata,
      ...(pdf.documentId ? { reportDocumentId: pdf.documentId } : {}),
      ...(pdf.sha256 ? { pdfSha256: pdf.sha256 } : {}),
      ...(entry.channel === 'FAX' ? { fax } : { fileDrop: entry.fileDrop }),
    },
  };
}

/** Sends one queued entry and records how it went. */
export async function sendReportDelivery(entry: ReportDeliveryQueueEntry, deps: ReportDeliveryDeps, generatePdf?: GenerateReportPdf): Promise<'sent' | 'failed'> {
  const built = await buildReportDeliveryPayload(entry, deps, generatePdf);
  if ('held' in built) {
    await deps.queue.markFailed(entry.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: built.held, maxRetriesExceeded: false });
    return 'failed';
  }
  const result = await deps.send(entry.id, built.payload);
  if (result.ok) {
    await deps.queue.markSent(entry.id, built.payload.pdfSha256 ? { pdfSha256: built.payload.pdfSha256 } : undefined);
    return 'sent';
  }
  await deps.queue.markFailed(entry.id, { errorCode: result.errorCode ?? 'DISPATCH_REJECTED', errorMessage: result.error ?? 'unknown error', maxRetriesExceeded: false });
  return 'failed';
}

/** Queues and sends a release by fax or file drop. 'not_configured': a file drop with no target. */
export async function deliverReport(input: DeliverReportInput, deps: ReportDeliveryDeps): Promise<ChannelOutcome> {
  if (input.channel === 'FILE_DROP' && !input.fileDropTargetId?.trim()) return 'not_configured';
  const c = await deps.getCase(input.caseId);
  if (!c) return 'failed';
  // Batch 728 (Lab Workflow spec, Decision 4): a research case's report is not delivered by fax or file drop.
  if (isResearchCaseNow(c)) return 'not_configured';
  const accession = accessionOf(c);
  const recipient = input.channel === 'FAX' ? await findFaxRecipient(c, input.ruleFaxNumber, deps) : null;
  const queued = await deps.queue.enqueue({
    caseId: input.caseId, accession, reportType: input.reportType, source: input.source, channel: input.channel, role: input.role,
    releasedAt: input.releasedAt, documentName: deliveryDocumentName(accession, input.reportType, input.releasedAt),
    metadata: await metadataFor(c, deps),
    ...(recipient ? { fax: { number: recipient.number, ...(recipient.name ? { recipientName: recipient.name } : {}) } } : {}),
    ...(input.ruleFaxNumber ? { ruleFaxNumber: input.ruleFaxNumber } : {}),
    ...(input.channel === 'FILE_DROP' ? { fileDrop: { targetId: input.fileDropTargetId!.trim() } } : {}),
    ...(input.fallbackChannels?.length ? { fallbackChannels: input.fallbackChannels } : {}),
    ...(input.release ? { release: input.release } : {}),
  });
  if (!queued.ok) return 'failed';
  return sendReportDelivery(queued.data, deps, input.generatePdf);
}

/** deliverReport, with the queue entry it made (Batch 521: a failure is scheduled for retry by entry). */
export async function deliverReportWithEntry(input: DeliverReportInput, deps: ReportDeliveryDeps): Promise<{ outcome: ChannelOutcome; entryId?: string; error?: string }> {
  let entryId: string | undefined;
  const queue = { ...deps.queue, enqueue: async (e: Parameters<IReportDeliveryQueueService['enqueue']>[0]) => { const r = await deps.queue.enqueue(e); if (r.ok) entryId = r.data.id; return r; } };
  const outcome = await deliverReport(input, { ...deps, queue });
  let error: string | undefined;
  if (outcome === 'failed' && entryId) {
    const all = await deps.queue.getAll();
    error = all.ok ? all.data.find(e => e.id === entryId)?.errorMessage : undefined;
  }
  return { outcome, entryId, error };
}
