// @vitest-environment happy-dom
// src/pages/DeliveryExceptionsPanel.test.tsx
// Batch 521 (PS-281 §3.2.2): the delivery exception queue in the Outbound view.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const rec = (id: string, status: string, at?: string, fallback = false) => ({
  id, kind: 'print', entryId: 'pj', channel: 'PRINT', role: 'primary', releaseKey: 'k', status, failures: 4, lastError: 'printer offline',
  release: { caseId: `S26-${id}`, reportType: 'FINAL', releasedAt: 'x', source: 'SURGPATH' }, fallbackChannels: fallback ? ['FAX'] : [],
  ...(fallback ? { fallbackSentAt: at } : {}), ...(at ? { deadLetteredAt: at } : {}), createdAt: 'x', updatedAt: 'x',
});
const svc = vi.hoisted(() => ({ deliveryRetryService: { getAll: vi.fn() } }));
vi.mock('@/services', async () => {
  const { deliveryExceptions } = await import('@/services/delivery/deliveryRetries');
  return { ...svc, deliveryExceptions };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));

import { DeliveryExceptionsPanel } from './DeliveryExceptionsPanel';

const K = 'deliveryExceptions';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DeliveryExceptionsPanel (Batch 521, PS-281)', () => {
  it('lists dead-lettered deliveries only, newest first, with the case tagged as PHI and the fallback sent', async () => {
    svc.deliveryRetryService.getAll.mockResolvedValue({ ok: true, data: [
      rec('1', 'dead_lettered', '2026-10-10T20:21:00Z'), rec('2', 'scheduled'), rec('3', 'dead_lettered', '2026-10-10T21:00:00Z', true), rec('4', 'delivered'),
    ] });
    render(<DeliveryExceptionsPanel />);
    expect(await screen.findByText(`${K}.title{"count":2}`)).toBeTruthy();
    const cases = screen.getAllByText(/^S26-/);
    expect(cases.map(c => c.textContent)).toEqual(['S26-3', 'S26-1']);
    expect(cases.every(c => c.getAttribute('data-phi') === 'accession')).toBe(true);
    expect(screen.getByText(`${K}.fallbackSent{"channels":"deliveryRulesSection.channelNames.FAX"}`)).toBeTruthy();
    expect(screen.getAllByText('printer offline')).toHaveLength(2);
  });
  it('says so when there are none', async () => {
    svc.deliveryRetryService.getAll.mockResolvedValue({ ok: true, data: [rec('2', 'scheduled')] });
    render(<DeliveryExceptionsPanel />);
    expect(await screen.findByText(`${K}.empty`)).toBeTruthy();
  });
});
