// @vitest-environment happy-dom
// src/pages/BatchManagement/LabelReprintPage.test.tsx
// Batch 518 (PS-123): Batch Management → Label reprint.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ reprintLabels: vi.fn(), retryFailedLabels: vi.fn() }));
vi.mock('@/services', async () => {
  const pure = await vi.importActual<typeof import('@/services/labels/batchLabelReprint')>('@/services/labels/batchLabelReprint');
  return {
    ...pure, ...svc,
    caseService: { getAll: vi.fn(async () => ({ ok: true, data: [
      { id: 'c1', accession: { accessionNumber: 'S26-0101', fullAccession: 'S26-0101', accessionedAt: '2026-10-01T09:00:00Z' }, specimens: [{ label: 'A', blocks: [{ label: '1' }] }] },
      { id: 'c2', accession: { accessionNumber: 'S26-0102', fullAccession: 'S26-0102', accessionedAt: '2026-10-02T09:00:00Z' }, specimens: [{ label: 'A', blocks: [] }] },
    ] })) },
    printerProfileService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'p1', printerId: 'Cassette-1' }] })) },
    batchLabelReprintDeps: { tag: 'deps' },
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'histo' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));

import LabelReprintPage from './LabelReprintPage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const K = 'labelReprint';

describe('LabelReprintPage (Batch 518, PS-123)', () => {
  it('finds cases by date, lets one be left out, and reprints the rest with the permission', async () => {
    svc.reprintLabels.mockImplementation(async (_input, _deps, onProgress) => {
      onProgress(1, 2);
      return { id: 'r1', startedAt: 'x', startedBy: 'histo', items: [
        { key: 'a', caseId: 'c1', accession: 'S26-0101', kind: 'requisition', status: 'printed' },
        { key: 'b', caseId: 'c1', accession: 'S26-0101', kind: 'container', target: 'A', status: 'failed', message: 'offline' },
      ] };
    });
    render(<LabelReprintPage />);
    await waitFor(() => expect(screen.getByLabelText(`${K}.accessionedFrom`)).toBeTruthy());
    await new Promise(r => setTimeout(r, 0));
    fireEvent.change(screen.getByLabelText(`${K}.accessionedFrom`), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByText(`${K}.find`));
    expect(screen.getByText('S26-0101').getAttribute('data-phi')).toBe('accession');
    fireEvent.click(screen.getAllByLabelText(`${K}.includeAria`)[1]);
    const reprint = screen.getByText(`${K}.reprint`);
    expect(reprint.getAttribute('data-capability')).toBe('label:batch:reprint');
    fireEvent.click(reprint);
    await waitFor(() => expect(svc.reprintLabels).toHaveBeenCalled());
    const [input] = svc.reprintLabels.mock.calls[0];
    expect(input.items.map((i: { caseId: string; kind: string }) => `${i.caseId}:${i.kind}`)).toEqual(['c1:requisition', 'c1:container']);
    await waitFor(() => expect(screen.getByText(new RegExp(`${K}.retryFailed`))).toBeTruthy());
  });

  it('shows a refusal in words', async () => {
    svc.reprintLabels.mockResolvedValue('notPermitted');
    render(<LabelReprintPage />);
    await new Promise(r => setTimeout(r, 0));
    fireEvent.change(screen.getByLabelText(`${K}.accessionFrom`), { target: { value: 'S26-0101' } });
    fireEvent.click(screen.getByText(`${K}.find`));
    fireEvent.click(screen.getByText(`${K}.reprint`));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(`${K}.refusals.notPermitted`));
  });
});
