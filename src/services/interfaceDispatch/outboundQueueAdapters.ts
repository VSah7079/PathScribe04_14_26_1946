// src/services/interfaceDispatch/outboundQueueAdapters.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-122): one adapter per outbound interface queue, so the single
// Outbound view (Audit Log → Interfaces) can list, resend and simulate
// failures for all of them the same way.
//
// Before this batch the screen covered three queues (patient ADT, results,
// LIS sync) and held this per-queue knowledge itself. Four more queues had
// getFailed/retryDispatch and no screen at all: accession events, cytology
// results, referral manifests and molecular orders. Pete's accepted default
// (Oct 10): one unified view with all seven.
//
// Each adapter knows how to read its queue, mark an entry, describe it, and
// build the message it stands for:
//   • patient ADT, result, LIS sync: rebuilt from the patient or case (as before)
//   • cytology result: rebuilt from its sign-out record, like the release does
//   • accession, referral, molecular order: the entry stores its message
//   • report delivery (Batch 520, PS-280: e-fax and file drop): the entry
//     stores everything but the PDF, which is the case's signed report, read
//     again (and, for a fax with no number yet, the recipient looked up again)
// The actions that use these (and check interface:outbound:resend) are in
// outboundQueueActions.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { InterfaceTransactionType } from './dispatchInterfaceMessage';
import type { OutboundPatientAdtQueueEntry } from '@/types/patients/OutboundPatientAdtQueueEntry';
import type { OutboundResultQueueEntry } from '@/types/case/OutboundResultQueueEntry';
import type { OutboundLisSyncQueueEntry } from '@/types/case/OutboundLisSyncQueueEntry';
import type { AccessionOutboundQueueEntry } from '@/types/case/AccessionOutboundQueueEntry';
import type { CytologyOutboundResultQueueEntry } from '@/types/case/CytologyOutboundResultQueueEntry';
import type { MolecularOrderOutboundQueueEntry } from '@/types/case/MolecularOrderOutboundQueueEntry';
import type { ReferralOutboundQueueEntry } from '../referral/IReferralOutboundQueueService';
import type { ReportDeliveryQueueEntry } from '@/types/delivery/ReportDeliveryQueueEntry';

export const OUTBOUND_QUEUE_TYPES = ['patient_adt', 'result', 'lis_sync', 'accession', 'cytology_result', 'referral', 'molecular_order', 'report_delivery'] as const;
export type OutboundQueueType = typeof OUTBOUND_QUEUE_TYPES[number];

export type OutboundFailureCode = 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED';
export interface OutboundFailure { errorCode: OutboundFailureCode; errorMessage: string; maxRetriesExceeded: boolean }

/** What every queue entry has in common. */
export interface OutboundQueueEntry {
  id: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  errorCode?: OutboundFailureCode;
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
}

/** A message that can't be sent yet, with the reason (a result without its report PDF). */
export interface HeldMessage { held: string }

export interface OutboundQueueAdapter {
  getAll(): Promise<ServiceResult<OutboundQueueEntry[]>>;
  retryDispatch(id: string): Promise<ServiceResult<unknown>>;
  markFailed(id: string, failure: OutboundFailure): Promise<ServiceResult<unknown>>;
  markSent(id: string): Promise<ServiceResult<unknown>>;
  transactionType(e: OutboundQueueEntry): InterfaceTransactionType | null;
  /** What the row shows to identify the message (a patient, case, batch or barcode). */
  identifier(e: OutboundQueueEntry): string;
  /** The message's kind within the queue (ADT event, result state, order type…). */
  kind(e: OutboundQueueEntry): string;
  /** The case (or patient, or batch) a CAPA raised from this failure is filed against. */
  subjectId(e: OutboundQueueEntry): string;
  /** The CAPA comment (stored text, English like other records). */
  capaLabel(e: OutboundQueueEntry): string;
  /** The message to send; null when it can't be built (a referenced record is gone). */
  buildPayload(e: OutboundQueueEntry): Promise<object | HeldMessage | null>;
}

const retries = (n: number) => `${n} retr${n === 1 ? 'y' : 'ies'}`;
const failureText = (what: string, e: OutboundQueueEntry) =>
  `Outbound ${what} dispatch failure (${e.errorCode ?? 'unknown'}): ${e.errorMessage ?? ''}, ${retries(e.retryCount)}.`;

/** The adapters, built on first use (they load the queue services and payload builders). */
export async function loadOutboundQueueAdapters(): Promise<Record<OutboundQueueType, OutboundQueueAdapter>> {
  const [
    services, adt, oru, assist, assistDeps, cytoRecords, cytoQueue, cytoBuilder, cytoPdf, referral, delivery, deliveryDeps,
  ] = await Promise.all([
    import('../index'),
    import('../patients/buildPatientAdtPayload'),
    import('../reports/prepareOruR01Dispatch'),
    import('../reports/dispatchAssistSynopticResult'),
    import('../reports/dispatchAssistSynopticResultDeps'),
    import('../cytology/mockCytologySignOutRecordService'),
    import('../cytology/mockCytologyOutboundResultQueueService'),
    import('../cytology/buildCytologyOruR01Payload'),
    import('../cytology/generateCytologyReportPdfSnapshot'),
    import('../referral/mockReferralOutboundQueueService'),
    import('../delivery/deliverReport'),
    import('../delivery/reportDeliveryDeps'),
  ]);
  const queue = <S extends { getAll(): Promise<ServiceResult<unknown[]>>; retryDispatch(id: string): Promise<ServiceResult<unknown>>; markFailed(id: string, f: never): Promise<ServiceResult<unknown>>; markSent(id: string): Promise<ServiceResult<unknown>> }>(s: S) => ({
    getAll: () => s.getAll() as Promise<ServiceResult<OutboundQueueEntry[]>>,
    retryDispatch: (id: string) => s.retryDispatch(id),
    markFailed: (id: string, f: OutboundFailure) => s.markFailed(id, f as never),
    markSent: (id: string) => s.markSent(id),
  });

  return {
    patient_adt: {
      ...queue(services.outboundPatientAdtQueueService),
      transactionType: e => {
        const t = (e as OutboundPatientAdtQueueEntry).eventType;
        return t === 'A08_DEMOGRAPHIC_UPDATE' ? 'A08' : t === 'A40_MERGE_PATIENT' ? 'A40' : t === 'A47_CHANGE_IDENTIFIER' ? 'A47' : null;
      },
      identifier: e => (e as OutboundPatientAdtQueueEntry).sourcePatientId,
      kind: e => (e as OutboundPatientAdtQueueEntry).eventType,
      subjectId: e => (e as OutboundPatientAdtQueueEntry).sourcePatientId,
      capaLabel: e => failureText((e as OutboundPatientAdtQueueEntry).eventType, e),
      buildPayload: async e => {
        const entry = e as OutboundPatientAdtQueueEntry;
        if (entry.eventType === 'A08_DEMOGRAPHIC_UPDATE') return adt.buildAdt08Payload(entry.sourcePatientId, entry.organisationId);
        if (!entry.targetPatientId) return null;
        if (entry.eventType === 'A40_MERGE_PATIENT') {
          return adt.buildAdt40Payload(entry.sourcePatientId, entry.targetPatientId, entry.organisationId, entry.casesRepointed ?? 0, entry.encountersRepointed ?? 0);
        }
        if (entry.eventType === 'A47_CHANGE_IDENTIFIER') {
          return adt.buildAdt47Payload(entry.sourcePatientId, entry.targetPatientId, entry.organisationId, entry.reasonCode ?? '', entry.notes ?? '', entry.casesRepointed ?? 0);
        }
        return null;
      },
    },
    result: {
      ...queue(services.outboundResultQueueService),
      transactionType: () => 'ORU_R01',
      identifier: e => (e as OutboundResultQueueEntry).caseId,
      kind: e => (e as OutboundResultQueueEntry).resultState,
      subjectId: e => (e as OutboundResultQueueEntry).caseId,
      capaLabel: e => failureText(`ORU^R01 (${(e as OutboundResultQueueEntry).resultState})`, e),
      // Batch 392: the release's own message, with its report PDF, or held without one.
      buildPayload: async e => {
        const entry = e as OutboundResultQueueEntry;
        const prepared = await oru.prepareOruR01Dispatch(entry.caseId, entry.instanceId, entry.resultState, entry.reportDocumentId ? { documentId: entry.reportDocumentId } : {});
        // Batch 559: 'version_unknown' is held too (the server's report versions couldn't be read).
        if (prepared.ok === false) return prepared.reason === 'not_found' ? null : { held: prepared.error };
        // Batch 559: the entry records the hash of the PDF this retry carries (a newer signed version, say).
        const sha = prepared.document?.sha256 ?? prepared.pdfSha256;
        if (sha) await services.outboundResultQueueService.recordPdfSha256(entry.id, sha).catch(() => undefined);
        return prepared.payload;
      },
    },
    lis_sync: {
      ...queue(services.outboundLisSyncQueueService),
      transactionType: () => 'LIS_SYNC',
      identifier: e => (e as OutboundLisSyncQueueEntry).caseId,
      kind: e => (e as OutboundLisSyncQueueEntry).kind,
      subjectId: e => (e as OutboundLisSyncQueueEntry).caseId,
      capaLabel: e => failureText(`LIS sync (${(e as OutboundLisSyncQueueEntry).kind})`, e),
      // Batch 426: an Assist workup's message is rebuilt from the case.
      buildPayload: e => assist.rebuildAssistSynopticMessage(e as OutboundLisSyncQueueEntry, assistDeps.assistSynopticDeps),
    },
    accession: {
      ...queue(services.accessionOutboundQueueService),
      transactionType: () => 'ACCESSION_EVENT',
      identifier: e => (e as AccessionOutboundQueueEntry).caseId,
      kind: e => (e as AccessionOutboundQueueEntry).eventType,
      subjectId: e => (e as AccessionOutboundQueueEntry).caseId,
      capaLabel: e => failureText(`accession event (${(e as AccessionOutboundQueueEntry).eventType})`, e),
      buildPayload: async e => {
        const entry = e as AccessionOutboundQueueEntry;
        return { eventType: entry.eventType, organisationId: entry.organisationId, ...entry.payload };
      },
    },
    cytology_result: {
      ...queue(cytoQueue.mockCytologyOutboundResultQueueService),
      transactionType: () => 'ORU_R01',
      identifier: e => (e as CytologyOutboundResultQueueEntry).caseId,
      kind: e => (e as CytologyOutboundResultQueueEntry).resultState,
      subjectId: e => (e as CytologyOutboundResultQueueEntry).caseId,
      capaLabel: e => failureText(`cytology ORU^R01 (${(e as CytologyOutboundResultQueueEntry).resultState})`, e),
      // Rebuilt from the sign-out record the entry names, as the release and a
      // correction build it (the record keeps its own "previously reported as").
      buildPayload: async e => {
        const entry = e as CytologyOutboundResultQueueEntry;
        const records = await cytoRecords.mockCytologySignOutRecordService.getByCaseId(entry.caseId);
        // Batch 533: an urgent preliminary, rebuilt from the release kept on the case.
        if (entry.scope === 'preliminary') {
          const { caseRouter } = await import('../cases/CaseRouter');
          const { buildCytologyPreliminaryMessage } = await import('../cytology/dispatchCytologyPreliminary');
          const caseData = await caseRouter.getCase(entry.caseId);
          if (!caseData) return null;
          const docPdf = entry.reportDocumentId
            ? (await import('../reportDocuments/reportDocumentService')).documentPdf(entry.reportDocumentId, (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService)
            : undefined;
          const built = await buildCytologyPreliminaryMessage(caseData, entry.signOutRecordId, docPdf);
          return 'held' in built ? { held: built.held } : built.payload as unknown as object;
        }
        const resultState = entry.resultState;
        if (resultState === 'PRELIMINARY') return null;
        // Batch 532: one consolidated message for the accession, rebuilt from the case as it stands.
        if (entry.scope === 'case') {
          const { caseRouter } = await import('../cases/CaseRouter');
          const { buildCytologyCaseReportMessage } = await import('../cytology/cytologyCaseReportMessage');
          const caseData = await caseRouter.getCase(entry.caseId);
          if (!caseData || !records.ok) return null;
          const changed = records.data.find(r => r.id === entry.signOutRecordId);
          const previouslyReportedAs = (changed?.reportContent as { revision?: { previouslyReportedAs?: string } } | undefined)?.revision?.previouslyReportedAs;
          // Batch 538: a release that stored its report document resends that document.
          const docPdf = entry.reportDocumentId
            ? (await import('../reportDocuments/reportDocumentService')).documentPdf(entry.reportDocumentId, (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService)
            : undefined;
          const built = await buildCytologyCaseReportMessage(caseData, records.data, resultState, {
            ...(resultState !== 'FINAL' ? { changedRecordId: entry.signOutRecordId } : {}),
            ...(previouslyReportedAs ? { previouslyReportedAs } : {}),
            ...(docPdf ? { pdf: docPdf } : {}),
          });
          return 'held' in built ? { held: built.held } : built.payload as unknown as object;
        }
        const record = records.ok ? records.data.find(r => r.id === entry.signOutRecordId) : undefined;
        if (!record) return null;
        // Batch 539: the report renderer makes the PDF; if it can't, the message stays held.
        const pdf = await cytoPdf.generateCytologyReportPdfSnapshot(record.reportContent);
        if (!pdf.pdfBase64) return { held: `The report PDF could not be made: ${pdf.generationError ?? 'unknown error'}` };
        const previouslyReportedAs = (record.reportContent as { revision?: { previouslyReportedAs?: string } }).revision?.previouslyReportedAs;
        return cytoBuilder.buildCytologyOruR01Payload(record, resultState, previouslyReportedAs, pdf.pdfBase64) as unknown as object;
      },
    },
    referral: {
      ...queue(referral.mockReferralOutboundQueueService),
      transactionType: () => 'REFERRAL_MANIFEST',
      identifier: e => (e as ReferralOutboundQueueEntry).payload.masterBarcode,
      kind: e => (e as ReferralOutboundQueueEntry).payload.priority,
      subjectId: e => (e as ReferralOutboundQueueEntry).batchId,
      capaLabel: e => failureText(`referral manifest (batch ${(e as ReferralOutboundQueueEntry).batchId})`, e),
      buildPayload: async e => (e as ReferralOutboundQueueEntry).payload,
    },
    molecular_order: {
      ...queue(services.molecularOrderOutboundQueueService),
      transactionType: () => 'MOLECULAR_ORDER',
      identifier: e => {
        const p = (e as MolecularOrderOutboundQueueEntry).payload;
        return 'accessionNumber' in p ? `${p.accessionNumber}-${p.specimenLetter}` : p.masterBarcode;
      },
      kind: e => {
        const p = (e as MolecularOrderOutboundQueueEntry).payload;
        return 'assayCode' in p ? p.assayCode : (e as MolecularOrderOutboundQueueEntry).eventType;
      },
      subjectId: e => (e as MolecularOrderOutboundQueueEntry).caseId ?? (e as MolecularOrderOutboundQueueEntry).id,
      capaLabel: e => failureText(`molecular order (${(e as MolecularOrderOutboundQueueEntry).eventType})`, e),
      buildPayload: async e => {
        const entry = e as MolecularOrderOutboundQueueEntry;
        return { eventType: entry.eventType, ...entry.payload };
      },
    },
    report_delivery: {
      ...queue(deliveryDeps.reportDeliveryDeps.queue),
      transactionType: () => 'REPORT_DELIVERY',
      identifier: e => (e as ReportDeliveryQueueEntry).accession,
      kind: e => `${(e as ReportDeliveryQueueEntry).channel} · ${(e as ReportDeliveryQueueEntry).reportType}`,
      subjectId: e => (e as ReportDeliveryQueueEntry).caseId,
      capaLabel: e => failureText(`report delivery (${(e as ReportDeliveryQueueEntry).channel === 'FAX' ? 'e-fax' : 'file drop'}, ${(e as ReportDeliveryQueueEntry).reportType})`, e),
      buildPayload: async e => {
        const built = await delivery.buildReportDeliveryPayload(e as ReportDeliveryQueueEntry, deliveryDeps.reportDeliveryDeps);
        return 'held' in built ? { held: built.held } : built.payload;
      },
    },
  };
}
