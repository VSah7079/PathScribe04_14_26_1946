// src/services/surgicalSignOut/releaseSurgicalFinal.test.ts
// Batch 649: the cancer registry submission goes with the FINAL's release, never before it.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { releaseSurgicalFinal, surgicalFinalGoesToRegistry } from './releaseSurgicalFinal';

const event = { caseId: 'C1', reportType: 'FINAL' as const, releasedAt: '2026-10-22T10:00:00Z' };
const orch = { id: 'C1', reportingMode: 'orchestrator', order: { facilityId: 'F1', facilityName: 'Lab' } } as unknown as Case;

describe('releaseSurgicalFinal', () => {
  it('publishes the FINAL, then sends the registry submission', async () => {
    const order: string[] = [];
    const deps = { publish: vi.fn(async () => { order.push('publish'); }), dispatchRegistry: vi.fn(async () => { order.push('registry'); }) };
    await releaseSurgicalFinal(orch, event, deps);
    expect(order).toEqual(['publish', 'registry']);
    expect(deps.dispatchRegistry).toHaveBeenCalledWith(orch, 'F1', 'Lab');
  });
  it('a failed publish still lets the registry follow; failures never throw to the caller', async () => {
    const deps = { publish: vi.fn(async () => { throw new Error('down'); }), dispatchRegistry: vi.fn(async () => { throw new Error('down'); }) };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(releaseSurgicalFinal(orch, event, deps)).resolves.toBeUndefined();
    expect(deps.dispatchRegistry).toHaveBeenCalled();
  });
  it('Assist cases and cases with no facility send no registry submission', async () => {
    expect(surgicalFinalGoesToRegistry({ reportingMode: 'assist', order: { facilityId: 'F1' } } as never)).toBe(false);
    expect(surgicalFinalGoesToRegistry({ reportingMode: 'orchestrator', order: {} } as never)).toBe(false);
    const deps = { publish: vi.fn(async () => {}), dispatchRegistry: vi.fn() };
    await releaseSurgicalFinal({ ...orch, reportingMode: 'assist' } as Case, event, deps);
    expect(deps.dispatchRegistry).not.toHaveBeenCalled();
  });
});
