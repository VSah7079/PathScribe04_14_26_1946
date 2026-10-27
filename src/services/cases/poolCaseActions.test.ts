// src/services/cases/poolCaseActions.test.ts
// Batch 649: taking and passing a pool case need case:pool:claim and case:pool:pass.
import { describe, expect, it, vi } from 'vitest';
import { acceptPoolCase, passPoolCase, claimPoolCase, releasePoolClaim, isPoolActionNotPermitted, type PoolCaseDeps, type PoolHoldDeps } from './poolCaseActions';

const deps = (allowed: boolean): PoolCaseDeps & { accept: ReturnType<typeof vi.fn>; pass: ReturnType<typeof vi.fn>; enforce: ReturnType<typeof vi.fn> } => ({
  enforce: vi.fn(async () => ({ allowed })), accept: vi.fn(async () => undefined), pass: vi.fn(async () => undefined),
});

describe('poolCaseActions (Batch 649)', () => {
  it('accept checks case:pool:claim and then takes the case', async () => {
    const d = deps(true);
    await acceptPoolCase('C1', 'U1', 'Dr U', d);
    expect(d.enforce).toHaveBeenCalledWith('case:pool:claim', { caseId: 'C1' });
    expect(d.accept).toHaveBeenCalledWith('C1', 'U1', 'Dr U');
  });

  it('accept refused: nothing is assigned, and the refusal is recognisable', async () => {
    const d = deps(false);
    const err = await acceptPoolCase('C1', 'U1', 'Dr U', d).catch(e => e);
    expect(isPoolActionNotPermitted(err)).toBe(true);
    expect(d.accept).not.toHaveBeenCalled();
  });

  it('pass checks case:pool:pass; refused, the case is not passed', async () => {
    const ok = deps(true);
    await passPoolCase('C1', ok);
    expect(ok.enforce).toHaveBeenCalledWith('case:pool:pass', { caseId: 'C1' });
    expect(ok.pass).toHaveBeenCalledWith('C1');
    const no = deps(false);
    await expect(passPoolCase('C1', no)).rejects.toSatisfy(isPoolActionNotPermitted);
    expect(no.pass).not.toHaveBeenCalled();
  });
});

// Batch 651: the four pool actions are audited when they succeed, with ids only, and never when refused or lost.
describe('poolCaseActions audit (Batch 651)', () => {
  const audited = (allowed: boolean) => {
    const auditService = { logEvent: vi.fn(async () => ({ ok: true }) as any) };
    return { auditService, d: { ...deps(allowed), auditService, actorName: async () => 'Dr U', facilityOf: async () => 'F1', poolOf: async () => 'POOL-GI' } as PoolCaseDeps };
  };
  const hold = (success = true) => {
    const { auditService, d } = audited(true);
    const h: PoolHoldDeps = { claim: vi.fn(async () => ({ success })), release: vi.fn(async () => undefined), auditService, actorName: d.actorName, facilityOf: d.facilityOf, poolOf: d.poolOf };
    return { auditService, h };
  };
  const entry = (a: { auditService: { logEvent: ReturnType<typeof vi.fn> } }, n = 0) => (a.auditService.logEvent.mock.calls[n] as any[])[0];

  it('accept writes "Pool case claimed" with actor, case id, facility and pool; refused writes nothing', async () => {
    const ok = audited(true);
    await acceptPoolCase('C1', 'U1', 'Dr U', ok.d);
    expect(entry(ok)).toMatchObject({ type: 'user', event: 'Pool case claimed', user: 'Dr U', caseId: 'C1', facilityId: 'F1' });
    expect(entry(ok).detail).toContain('pool POOL-GI');
    const no = audited(false);
    await acceptPoolCase('C1', 'U1', 'Dr U', no.d).catch(() => undefined);
    expect(no.auditService.logEvent).not.toHaveBeenCalled();
  });

  it('a lost race (the store throws) writes nothing', async () => {
    const a = audited(true);
    a.d.accept = vi.fn(async () => { throw new Error('taken'); });
    await expect(acceptPoolCase('C1', 'U1', 'Dr U', a.d)).rejects.toThrow('taken');
    expect(a.auditService.logEvent).not.toHaveBeenCalled();
  });

  it('pass writes "Pool case passed"; refused writes nothing', async () => {
    const ok = audited(true);
    await passPoolCase('C1', ok.d);
    expect(entry(ok)).toMatchObject({ event: 'Pool case passed', caseId: 'C1', facilityId: 'F1' });
    const no = audited(false);
    await passPoolCase('C1', no.d).catch(() => undefined);
    expect(no.auditService.logEvent).not.toHaveBeenCalled();
  });

  it('the hold: taken and released are each written once, by the person who held it', async () => {
    const { auditService, h } = hold();
    expect(await claimPoolCase('C2', 'U1', h)).toEqual({ success: true });
    await releasePoolClaim('C2', h);
    await releasePoolClaim('C2', h); // the window's cleanup can run again: nothing more to record
    const events = auditService.logEvent.mock.calls.map((c: any[]) => c[0].event);
    expect(events).toEqual(['Pool claim hold taken', 'Pool claim hold released']);
    expect(entry({ auditService }, 1)).toMatchObject({ user: 'Dr U', caseId: 'C2', facilityId: 'F1' });
    expect(h.release).toHaveBeenCalledTimes(2);
  });

  it('a hold that was not granted, or one consumed by Accept, records no release', async () => {
    const lost = hold(false);
    await claimPoolCase('C3', 'U1', lost.h);
    await releasePoolClaim('C3', lost.h);
    expect(lost.auditService.logEvent).not.toHaveBeenCalled();

    const { auditService, h } = hold();
    await claimPoolCase('C4', 'U1', h);
    await acceptPoolCase('C4', 'U1', 'Dr U', { ...audited(true).d, auditService });
    await releasePoolClaim('C4', h);
    expect(auditService.logEvent.mock.calls.map((c: any[]) => c[0].event)).toEqual(['Pool claim hold taken', 'Pool case claimed']);
  });
});
