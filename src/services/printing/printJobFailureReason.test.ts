import { describe, it, expect } from 'vitest';
import { printJobFailureReasonKey } from './printJobFailureReason';

describe('a failed print job\'s reason (Batch 549, F3)', () => {
  it('a job that needs the site agent shows a translated reason', () => {
    expect(printJobFailureReasonKey({ errorCode: 'NEEDS_SITE_AGENT' })).toBe('printQueueDashboard.failure.needsSiteAgent');
  });
  it('a printer\'s own message, or no code, is shown as stored', () => {
    expect(printJobFailureReasonKey({ errorCode: 'PRINTER_UNREACHABLE' })).toBeNull();
    expect(printJobFailureReasonKey({})).toBeNull();
  });
});

describe('a job\'s status label (Batch 552: sent is not printed)', async () => {
  const { printJobStatusKey } = await import('./printJobFailureReason');
  it('a PRINTED job the agent could only send shows "Sent to printer"; everything else as it is', () => {
    expect(printJobStatusKey({ status: 'PRINTED', confirmation: 'sent' })).toBe('printQueueDashboard.status.SENT_TO_PRINTER');
    expect(printJobStatusKey({ status: 'PRINTED', confirmation: 'printed' })).toBe('printQueueDashboard.status.PRINTED');
    expect(printJobStatusKey({ status: 'PRINTED' })).toBe('printQueueDashboard.status.PRINTED');
    expect(printJobStatusKey({ status: 'FAILED', confirmation: 'sent' })).toBe('printQueueDashboard.status.FAILED');
  });
});
