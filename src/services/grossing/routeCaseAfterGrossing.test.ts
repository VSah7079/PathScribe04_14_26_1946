import { describe, it, expect, vi } from 'vitest';
vi.mock('../cases/casePoolAssignmentService', () => ({ routeCase: vi.fn(), routeStatCase: vi.fn() }));
import { routeCaseAfterGrossing } from './routeCaseAfterGrossing';
import type { Case } from '@/types/case/Case';

const c = (priority: string) => ({ id: 'C1', order: { priority } } as unknown as Case);
const deps = () => ({ routeCase: vi.fn().mockResolvedValue({ outcome: 'routed_to_pool', poolName: 'GI' }), routeStatCase: vi.fn().mockResolvedValue({ outcome: 'routed_to_fallback', poolName: 'General' }) });

describe('routeCaseAfterGrossing', () => {
  it('routes a routine case with routeCase', async () => {
    const d = deps();
    expect(await routeCaseAfterGrossing(c('Routine'), d)).toMatchObject({ routed: true, poolName: 'GI' });
    expect(d.routeCase).toHaveBeenCalledTimes(1);
    expect(d.routeStatCase).not.toHaveBeenCalled();
  });
  it('routes STAT with routeStatCase', async () => {
    const d = deps();
    expect(await routeCaseAfterGrossing(c('STAT'), d)).toMatchObject({ routed: true, poolName: 'General' });
    expect(d.routeCase).not.toHaveBeenCalled();
  });
  it('an unrouted outcome is not routed, and a throw is contained', async () => {
    const d = deps();
    d.routeCase.mockResolvedValueOnce({ outcome: 'unrouted', reason: 'off' });
    expect((await routeCaseAfterGrossing(c('Routine'), d)).routed).toBe(false);
    d.routeCase.mockRejectedValueOnce(new Error('down'));
    const r = await routeCaseAfterGrossing(c('Routine'), d);
    expect(r.routed).toBe(false);
    expect(r.error).toBeInstanceOf(Error);
  });
});
