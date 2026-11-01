// @vitest-environment happy-dom
//
// Batch 729 (Lab Workflow & Batch spec §7.4): the scan trail at a station: closed until opened, only with the
// permission, newest first, with the outcome and the carrier.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const query = vi.fn();
let allowed = true;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, v?: Record<string, unknown>) => (v ? `${k} ${JSON.stringify(v)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ has: () => allowed, loading: false }) }));
vi.mock('@/services', () => ({ stationScanEventService: { query: (...a: unknown[]) => query(...a) } }));

const ev = (id: string, at: string, over: Record<string, unknown> = {}) => ({ id, at, itemId: `S26-1-${id}`, materialType: 'block', caseAccession: 'S26-1', stationId: 's', stationName: 'Embedding 1', facilityId: 'f', node: 'Embedding', userId: 'u', userName: 'Tech A', action: 'received', result: 'ok', ...over });

describe('ScanTrailPanel', () => {
  beforeEach(() => { query.mockReset(); allowed = true; });

  it('loads nothing until opened, then lists the case\'s scans newest first', async () => {
    query.mockResolvedValue({ ok: true, data: [ev('A1', '2026-10-30T08:00:00Z'), ev('A2', '2026-10-30T09:00:00Z', { result: 'wrong-item', carrierId: 'CONT-1' })] });
    const { default: ScanTrailPanel } = await import('./ScanTrailPanel');
    render(<ScanTrailPanel caseAccession="S26-1" />);
    expect(query).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('scanTrail.show'));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    expect(query).toHaveBeenCalledWith({ caseAccession: 'S26-1' });
    const rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('S26-1-A2');
    expect(rows[1].textContent).toContain('scanTrail.results.wrong-item');
    expect(rows[1].textContent).toContain('CONT-1');
  });

  it('is not shown without station:scan-history:view', async () => {
    allowed = false;
    const { default: ScanTrailPanel } = await import('./ScanTrailPanel');
    const { container } = render(<ScanTrailPanel caseAccession="S26-1" />);
    expect(container.textContent).toBe('');
  });

  it('says so when the service refuses', async () => {
    query.mockResolvedValue({ ok: false, error: 'NOT_PERMITTED' });
    const { default: ScanTrailPanel } = await import('./ScanTrailPanel');
    render(<ScanTrailPanel caseAccession="S26-1" />);
    fireEvent.click(screen.getByText('scanTrail.show'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('scanTrail.refused'));
  });
});
