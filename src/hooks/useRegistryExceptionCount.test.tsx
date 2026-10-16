// @vitest-environment happy-dom
// src/hooks/useRegistryExceptionCount.test.tsx (Batch 561)
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const caps = vi.hoisted(() => ({ allowed: true }));
vi.mock('./useCapabilities', () => ({ useCapabilities: () => ({ has: () => caps.allowed }) }));
const count = vi.hoisted(() => vi.fn());
vi.mock('@/services/registrySubmission/registryExceptionsService', () => ({ countRegistryExceptionsForUser: count }));
vi.mock('@/services/registrySubmission/registryExceptionsDeps', () => ({ registryExceptionsLoadDeps: {} }));

import { useRegistryExceptionCount } from './useRegistryExceptionCount';

describe('useRegistryExceptionCount (Batch 561)', () => {
  it('shows the count, and nothing once the capability goes, even if a read was still on its way', async () => {
    caps.allowed = true;
    let late!: (n: number) => void;
    count.mockResolvedValueOnce(3);
    const { result, rerender } = renderHook(() => useRegistryExceptionCount());
    await waitFor(() => expect(result.current).toBe(3));
    count.mockImplementationOnce(() => new Promise<number>(r => { late = r; }));
    window.dispatchEvent(new Event('focus'));
    caps.allowed = false;
    rerender();
    expect(result.current).toBeNull();
    late(7);
    await new Promise(r => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });
});
