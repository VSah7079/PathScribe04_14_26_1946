// src/services/delivery/mockReportDeliveryQueueService.ts
// Batch 520 (PS-280): the report delivery queue, browser-storage backed like the other
// outbound queues (mockReferralOutboundQueueService.ts), with an audit entry on every change.
// Audit detail names the channel and the case, never the PDF.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IReportDeliveryQueueService } from './IReportDeliveryQueueService';
import type { ReportDeliveryQueueEntry } from '@/types/delivery/ReportDeliveryQueueEntry';
import { mockAuditService as auditService } from '@/services/auditlog/mockAuditService';

export const REPORT_DELIVERY_QUEUE_KEY = 'report_delivery_queue_v1';

const load = (): ReportDeliveryQueueEntry[] => storageGet<ReportDeliveryQueueEntry[]>(REPORT_DELIVERY_QUEUE_KEY, []);
const persist = (data: ReportDeliveryQueueEntry[]) => storageSet(REPORT_DELIVERY_QUEUE_KEY, data);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const what = (e: ReportDeliveryQueueEntry) => `${e.channel === 'FAX' ? 'Fax' : 'File drop'} of the ${e.reportType} report for case ${e.accession}`;

function update(id: string, change: (e: ReportDeliveryQueueEntry) => ReportDeliveryQueueEntry): ServiceResult<ReportDeliveryQueueEntry> & { prior?: ReportDeliveryQueueEntry } {
  const all = load();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return err(`Report delivery queue entry ${id} not found`);
  const prior = all[idx];
  const next = [...all];
  next[idx] = change(prior);
  persist(next);
  return { ...ok(next[idx]), prior };
}

export const mockReportDeliveryQueueService: IReportDeliveryQueueService = {
  async getAll() { return ok(load()); },
  async getByCaseId(caseId) { return ok(load().filter(e => e.caseId === caseId)); },
  async getFailed() { return ok(load().filter(e => e.status === 'FAILED')); },

  async enqueue(entry) {
    const created: ReportDeliveryQueueEntry = { ...entry, id: crypto.randomUUID(), status: 'QUEUED', queuedAt: new Date().toISOString(), retryCount: 0, maxRetriesExceeded: false };
    persist([...load(), created]);
    auditService.logEvent({ type: 'system', event: 'Report delivery queued', detail: `${what(created)} queued (${created.role}).`, user: 'system', caseId: created.caseId, confidence: null });
    return ok(created);
  },

  async markFailed(id, failure) {
    const r = update(id, e => ({ ...e, status: 'FAILED', errorCode: failure.errorCode, errorMessage: failure.errorMessage, maxRetriesExceeded: failure.maxRetriesExceeded, lastAttemptAt: new Date().toISOString() }));
    if (r.ok) auditService.logEvent({ type: 'system', event: 'Report delivery failed', detail: `${what(r.data)} failed: ${failure.errorCode} — ${failure.errorMessage}`, user: 'system', caseId: r.data.caseId, confidence: null });
    return r;
  },

  async retryDispatch(id) {
    const r = update(id, e => ({ ...e, status: 'QUEUED', errorCode: undefined, errorMessage: undefined, maxRetriesExceeded: false, retryCount: e.retryCount + 1, lastAttemptAt: new Date().toISOString() }));
    if (r.ok) auditService.logEvent({ type: 'user', event: 'Report delivery re-queued', detail: `${what(r.data)} re-queued (attempt ${r.data.retryCount}), was: ${r.prior?.errorMessage ?? 'no reason recorded'}`, user: 'system', caseId: r.data.caseId, confidence: null });
    return r;
  },

  async markSent(id, sent) {
    const now = new Date().toISOString();
    const r = update(id, e => ({ ...e, status: 'SENT', errorCode: undefined, errorMessage: undefined, lastAttemptAt: now, sentAt: now, ...(sent?.pdfSha256 ? { pdfSha256: sent.pdfSha256 } : {}) }));
    if (r.ok) auditService.logEvent({ type: 'system', event: 'Report delivered', detail: `${what(r.data)} accepted by the interface server${r.data.channel === 'FAX' ? ' and submitted to the fax gateway' : ' and written to the drop target'}${sent?.pdfSha256 ? ` (PDF SHA-256 ${sent.pdfSha256})` : ''}.`, user: 'system', caseId: r.data.caseId, confidence: null });
    return r;
  },

  async setFaxRecipient(id, fax) { return update(id, e => ({ ...e, fax })); },

  async setTransmission(id, transmission) {
    const r = update(id, e => ({ ...e, transmission }));
    if (r.ok) auditService.logEvent({ type: 'system', event: transmission.status === 'TRANSMITTED' ? 'Fax transmitted' : 'Fax transmission failed', detail: `${what(r.data)}: the fax provider reported ${transmission.status}${transmission.detail ? ` (${transmission.detail})` : ''}.`, user: 'system', caseId: r.data.caseId, confidence: null });
    return r;
  },
};
