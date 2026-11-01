// Batch 747 (S8): the demo display tokens are issued fresh, one revoked, shown once and audited without the tokens.
import { describe, expect, it, vi } from 'vitest';
import { issueDemoDisplayTokens, DEMO_DISPLAY_TOKEN_PLAN, DEMO_OR_SUITE_TERMINAL_ID } from './demoDisplayTokens';

const ok = <T>(data: T) => ({ ok: true as const, data });
function deps(allowed = true) {
  let n = 0;
  const issued = (id: string) => Promise.resolve(ok({ token: `psd_token${++n}_${id}`, binding: {} as never }));
  return {
    authorization: { enforce: vi.fn(async () => ({ allowed })) },
    displayAccess: {
      issueFacilityOpsToken: vi.fn(issued), issueOrSuiteToken: vi.fn(issued),
      revokeFacilityOpsToken: vi.fn(async () => ok({} as never)),
    },
    profiles: { getAll: async () => ok([{ id: 'dispprof-demo-dvmc-rotating', name: 'Desert Valley Lab — Main Wall (rotating)' }] as never) },
    terminals: { getAll: async () => ok([{ id: DEMO_OR_SUITE_TERMINAL_ID, name: 'OR-Suite-Theatre2' }] as never) },
    audit: { logEvent: vi.fn(async () => undefined) },
    user: 'Jordan Ellis',
  };
}

describe('issueDemoDisplayTokens', () => {
  it('issues one token per planned display, revokes the retired one, and audits without a token', async () => {
    const d = deps();
    const res = await issueDemoDisplayTokens(d as never);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.tokens.map(x => x.subjectId)).toEqual(DEMO_DISPLAY_TOKEN_PLAN.map(p => p.subjectId));
    expect(res.tokens.every(x => x.token.startsWith('psd_'))).toBe(true);
    expect(res.tokens[0].name).toBe('Desert Valley Lab — Main Wall (rotating)');
    expect(d.displayAccess.issueOrSuiteToken).toHaveBeenCalledWith(DEMO_OR_SUITE_TERMINAL_ID, 30);
    expect(d.displayAccess.revokeFacilityOpsToken).toHaveBeenCalledTimes(1);
    expect(d.displayAccess.revokeFacilityOpsToken).toHaveBeenCalledWith(DEMO_DISPLAY_TOKEN_PLAN.find(p => p.use === 'revoked')!.subjectId);
    const detail = (d.audit.logEvent.mock.calls[0] as any)[0].detail as string;
    for (const x of res.tokens) expect(detail).not.toContain(x.token);
  });

  it('issues nothing without config:demo-data:reset', async () => {
    const d = deps(false);
    expect(await issueDemoDisplayTokens(d as never)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(d.authorization.enforce).toHaveBeenCalledWith('config:demo-data:reset');
    expect(d.displayAccess.issueFacilityOpsToken).not.toHaveBeenCalled();
  });

  it('stops when the display access service refuses (its own capability check)', async () => {
    const d = deps();
    d.displayAccess.issueFacilityOpsToken.mockResolvedValueOnce({ ok: false, error: 'Not permitted' } as never);
    expect(await issueDemoDisplayTokens(d as never)).toEqual({ ok: false, reason: 'issueFailed' });
  });
});
