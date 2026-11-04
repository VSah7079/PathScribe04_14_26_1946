import { describe, it, expect } from 'vitest';
import { FAILED_CHARGE_DISPATCHES_LINK, financialAuditViewFromParams } from './auditLogLinks';

const params = (q: string) => new URLSearchParams(q);

describe('auditLogLinks (Batch 499)', () => {
  it('the failed-dispatches link lands on Audit Log → Financial → Outbound DLQ', () => {
    const [path, query] = FAILED_CHARGE_DISPATCHES_LINK.split('?');
    expect(path).toBe('/audit');
    expect(financialAuditViewFromParams(params(query))).toBe('outbound_dlq');
  });

  it('reads only a known view, and only on the Financial tab', () => {
    expect(financialAuditViewFromParams(params('tab=financial&view=billing_logs'))).toBe('billing_logs');
    expect(financialAuditViewFromParams(params('tab=financial&view=nonsense'))).toBeNull();
    expect(financialAuditViewFromParams(params('tab=financial'))).toBeNull();
    expect(financialAuditViewFromParams(params('tab=errors&view=outbound_dlq'))).toBeNull();
  });
});
