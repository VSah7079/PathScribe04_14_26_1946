// src/services/registrySubmission/registryTransmissionAudit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registryTransmissionAuditRows, registryTransmissionAuditCsvRows } from './registryTransmissionAudit';
import { exportRegistryTransmissionAudit, countRegistryExceptionsForUser } from './registryExceptionsService';

const cyto = [{ id: 'c1', caseId: 'CASE-1', registryId: 'csms_uk', status: 'SENT' as const, queuedAt: '2026-10-01T09:00:00Z', sentAt: '2026-10-01T09:01:00Z', registryStatus: 'accepted' as const,
  submission: { submissionGuid: 'g1', submissionVersion: 2, messageType: 'CORRECTION', environment: 'production', masterTransactionId: 'm1' } as any,
  acknowledgements: [{ submissionGuid: 'g1', outcome: 'accepted', findings: [], format: 'statusJson', responseCode: 'AA', receivedAt: '2026-10-01T10:00:00Z', raw: '{}' }] as any }];
const cancer = [{ id: 'k1', caseId: 'CASE-2', registryId: 'naaccr_us', status: 'FAILED' as const, queuedAt: '2026-10-02T09:00:00Z', errorCode: 'HOLD_MISSING_MANDATORY_DATA', maxRetriesExceeded: false }];

describe('registry transmission audit (Batch 425)', () => {
  it('one column set for both queues: sent time, registry status, response code', () => {
    const rows = registryTransmissionAuditRows({ cytology: cyto, cancer });
    expect(rows.map(r => r.queue)).toEqual(['cancer', 'cytology']);
    expect(rows[1]).toMatchObject({ sentAt: '2026-10-01T09:01:00Z', registryStatus: 'accepted', responseCode: 'AA', answeredAt: '2026-10-01T10:00:00Z', submissionVersion: '2', messageType: 'CORRECTION' });
    expect(rows[0]).toMatchObject({ sentAt: '', transmissionStatus: 'FAILED', errorReasonCode: 'HOLD_MISSING_MANDATORY_DATA', responseCode: '' });
    expect(Object.keys(registryTransmissionAuditCsvRows(rows)[0])).toEqual(['Queue', 'Registry', 'Case_ID', 'Submission_ID', 'Submission_Version', 'Message_Type', 'Environment', 'Queued_At', 'Sent_At', 'Transmission_Status', 'Error_Reason_Code', 'Registry_Status', 'Response_Code', 'Answered_At', 'Revisions_After_Acceptance']);
    expect(registryTransmissionAuditRows({ cytology: cyto, cancer }, { queue: 'cytology' })).toHaveLength(1);
  });
  it('the export checks its capability and covers only the user\'s own cases', async () => {
    const exportQaReport = vi.fn(async (_c: string, rows: any[]) => ({ ok: true, rowCount: rows.length }));
    const r = await exportRegistryTransmissionAudit({ today: '2026-10-01' }, {
      getAll: { cytology: async () => ({ ok: true, data: cyto }), cancer: async () => ({ ok: true, data: cancer }) },
      visibleCaseIds: async () => new Set(['CASE-1']),
      exportQaReport,
    });
    expect(r).toEqual({ ok: true, rowCount: 1 });
    expect(exportQaReport).toHaveBeenCalledWith('qa:registry-transmission-audit:export', [expect.objectContaining({ Case_ID: 'CASE-1' })], 'registry-transmission-audit-2026-10-01.csv');
  });
  it('the badge counts only the user\'s own cases', async () => {
    const held = { id: 'h1', caseId: 'CASE-9', registryId: 'naaccr_us', status: 'FAILED', errorCode: 'REGISTRY_NOT_READY', errorMessage: 'x', queuedAt: '2026-10-01T00:00:00Z', maxRetriesExceeded: false };
    const mine = { ...held, id: 'h2', caseId: 'CASE-1' };
    const ack = { queues: { cytology: { getAll: async () => ({ ok: true as const, data: [] }), setRegistryStatus: vi.fn(), markFailed: vi.fn() }, cancer: { getAll: async () => ({ ok: true as const, data: [] }), setRegistryStatus: vi.fn(), markFailed: vi.fn() } }, logAudit: () => {}, now: () => new Date('2026-10-01T12:00:00Z') } as any;
    const n = await countRegistryExceptionsForUser({ ack, getAll: { cytology: async () => ({ ok: true, data: [] }), cancer: async () => ({ ok: true, data: [held, mine] as any }) }, visibleCaseIds: async () => new Set(['CASE-1']) });
    expect(n).toBe(1);
  });
});
