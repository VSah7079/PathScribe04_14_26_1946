// Batch 653: a permission check that names only a case is judged against that case's own facility.
import { describe, it, expect } from 'vitest';
import { createAuthorizationService } from './authorizationService';

const roles = [{ id: 'qa-reviewer', name: 'QA Reviewer', assignable: true, capabilities: ['qa:fppe-tracking:export'] }];

function build(facilityIds: string[], caseFacility?: (id: string) => Promise<string | null>) {
  return createAuthorizationService({
    roleService: { getAll: async () => ({ ok: true, data: roles as never }) },
    userService: { getById: async () => ({ ok: true, data: { roles: ['QA Reviewer'], facilityIds } as never }) },
    auditService: { logEvent: async e => ({ ok: true, data: e as never }) },
    session: () => ({ id: 'U1', name: 'Dr A', role: 'pathologist' }),
    caseFacility,
  });
}
const lookup = async (id: string) => ({ C1: 'F1', C2: 'F9' } as Record<string, string>)[id] ?? null;

describe('case-only permission checks resolve the case facility', () => {
  it('allows a facility-limited person on a case at their facility', async () => {
    const d = await build(['F1'], lookup).enforce('qa:fppe-tracking:export', { caseId: 'C1' });
    expect(d.allowed).toBe(true);
    expect(d.context.facilityId).toBe('F1');
  });
  it('refuses the same person on a case at another facility', async () => {
    const d = await build(['F1'], lookup).enforce('qa:fppe-tracking:export', { caseId: 'C2' });
    expect(d).toMatchObject({ allowed: false, reason: 'outOfScope', outsideFacilities: ['F9'] });
  });
  it('still refuses (facility unknown) when the case cannot be found', async () => {
    const d = await build(['F1'], lookup).enforce('qa:fppe-tracking:export', { caseId: 'nope' });
    expect(d).toMatchObject({ allowed: false, reason: 'facilityUnknown' });
  });
  it('still refuses when the lookup throws', async () => {
    const d = await build(['F1'], async () => { throw new Error('x'); }).evaluate('qa:fppe-tracking:export', { caseId: 'C1' });
    expect(d).toMatchObject({ allowed: false, reason: 'facilityUnknown' });
  });
  it('does not look up when the caller already gave a facility, or the person has no facility limit', async () => {
    let calls = 0;
    const counting = async (id: string) => { calls++; return lookup(id); };
    await build(['F1'], counting).evaluate('qa:fppe-tracking:export', { caseId: 'C2', facilityId: 'F1' });
    await build([], counting).evaluate('qa:fppe-tracking:export', { caseId: 'C2' });
    expect(calls).toBe(0);
  });
  it('without a resolver behaves as before', async () => {
    const d = await build(['F1']).evaluate('qa:fppe-tracking:export', { caseId: 'C1' });
    expect(d).toMatchObject({ allowed: false, reason: 'facilityUnknown' });
  });
});
