// @vitest-environment happy-dom
// Batch 759 (spec §2.2): a typed entry is flagged with the case, the module, the workstation and the user.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import React from 'react';

const h = vi.hoisted(() => ({ audit: vi.fn(async () => ({ ok: true })), station: vi.fn(async () => ({ ok: true })), resolve: vi.fn(), getCase: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-7', name: 'Kevin Brooks' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: 'st-emb-1' }) }));
vi.mock('@/services', () => ({ auditService: { logEvent: h.audit }, stationScanEventService: { recordMany: h.station } }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase: h.getCase } }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({ resolveMaterialFromScan: h.resolve }));

import { useManualEntryRecorder } from './useManualEntryRecorder';

const at = (path: string) => ({ wrapper: ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });

beforeEach(() => { h.audit.mockClear(); h.station.mockClear(); h.resolve.mockReset(); h.getCase.mockReset(); });

describe('useManualEntryRecorder (Batch 759)', () => {
  it('a typed block at Embedding: audit and station log, with the case it resolved to', async () => {
    h.resolve.mockResolvedValue({ fullAccession: 'S26-0001', displayId: 'S26-0001-A3', target: { level: 'block' } });
    const { result } = renderHook(() => useManualEntryRecorder(), at('/workstations/embedding'));
    await act(() => result.current('S26-0001-A3'));
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Manual Entry', caseId: 'S26-0001', stationId: 'st-emb-1', user: 'Kevin Brooks' }));
    expect((h.audit.mock.calls as unknown as [{ detail: string }][])[0][0].detail).toContain('Embedding scan field');
    expect(h.station).toHaveBeenCalledWith([expect.objectContaining({ itemId: 'S26-0001-A3', materialType: 'block', action: 'typed' })]);
  });

  it('a typed accession (no material) is found by its number; a typed miss is audited only', async () => {
    h.resolve.mockResolvedValue(null);
    h.getCase.mockResolvedValueOnce({ accession: { fullAccession: 'S26-0001' } }).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useManualEntryRecorder(), at('/workstations/grossing'));
    await act(() => result.current('s26-0001'));
    expect(h.audit).toHaveBeenLastCalledWith(expect.objectContaining({ caseId: 'S26-0001' }));
    expect(h.station).toHaveBeenCalledTimes(1);
    await act(() => result.current('NOPE-1'));
    expect(h.audit).toHaveBeenLastCalledWith(expect.objectContaining({ caseId: null }));
    expect(h.station).toHaveBeenCalledTimes(1);
  });
});
