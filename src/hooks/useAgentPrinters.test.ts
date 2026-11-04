// @vitest-environment happy-dom
// src/hooks/useAgentPrinters.test.ts (Batch 553)
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services', () => ({ siteAgentAdminService: {} }));
import { useAgentPrinters } from './useAgentPrinters';

const printer = (id: string, name?: string) => ({ destinationId: id, kind: 'report' as const, protocol: 'IPPS' as const, host: 'h', port: 631, ...(name ? { displayName: name } : {}) });

describe('useAgentPrinters', () => {
  it('loads the site\'s report printers for the screen asking, and is loading until then', async () => {
    const service = { reportPrinters: vi.fn(async () => ({ ok: true as const, data: [printer('rep-1', 'Front desk')] })) };
    const { result } = renderHook(() => useAgentPrinters('S1', 'routing', service as never));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.printers).toEqual([{ destinationId: 'rep-1', label: 'Front desk' }]));
    expect(service.reportPrinters).toHaveBeenCalledWith('S1', 'routing');
  });

  it('drops an answer for a site no longer chosen', async () => {
    let releaseS1: (v: unknown) => void = () => undefined;
    const service = {
      reportPrinters: vi.fn((site: string) => site === 'S1'
        ? new Promise(r => { releaseS1 = r; })
        : Promise.resolve({ ok: true, data: [printer('rep-2', 'North desk')] })),
    };
    const { result, rerender } = renderHook(({ site }) => useAgentPrinters(site, 'redirect', service as never), { initialProps: { site: 'S1' } });
    rerender({ site: 'S2' });
    await waitFor(() => expect(result.current.printers.map(p => p.destinationId)).toEqual(['rep-2']));
    releaseS1({ ok: true, data: [printer('rep-1', 'Old')] });
    await new Promise(r => setTimeout(r, 0));
    expect(result.current.printers.map(p => p.destinationId)).toEqual(['rep-2']);
  });

  it('reports a refusal, and nothing without a site', async () => {
    const service = { reportPrinters: vi.fn(async () => ({ ok: false as const, error: 'NOT_PERMITTED' as const })) };
    const { result, rerender } = renderHook(({ site }) => useAgentPrinters(site, 'facilityDefault', service as never), { initialProps: { site: 'S1' as string | null } });
    await waitFor(() => expect(result.current.error).toBe('NOT_PERMITTED'));
    rerender({ site: null });
    expect(result.current).toEqual({ printers: [], loading: false, error: null });
  });
});
