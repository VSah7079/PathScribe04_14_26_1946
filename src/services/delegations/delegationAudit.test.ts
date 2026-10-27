// Batch 651: delegations are written to the audit service (ids only, never the note).
import { describe, expect, it, vi } from 'vitest';
import { delegationAuditEntry, recordDelegation } from './delegationAudit';
import type { DelegationRequest } from './IDelegationService';

const req: DelegationRequest = { caseId: 'S26-1', requestorId: 'U1', delegationType: 'CASUAL_REVIEW', recipient: { kind: 'user', id: 'U2', name: 'Jane Roe' }, note: 'Mrs Smith, DOB 1/1/1950' };

describe('delegationAudit', () => {
  it('names the actor, case, facility, type, recipient id and delegation id; not the note or the recipient name', () => {
    const e = delegationAuditEntry(req, { id: 'd-9' }, 'Dr One', 'F1');
    expect(e).toMatchObject({ type: 'user', event: 'Case delegated', user: 'Dr One', caseId: 'S26-1', facilityId: 'F1' });
    expect(e.detail).toBe('Case delegated (type CASUAL_REVIEW) to user U2; delegation d-9; a note was added.');
    expect(JSON.stringify(e)).not.toMatch(/Smith|1950|Jane/);
  });

  it('a synoptic hand-off says which report; no note, no mention', () => {
    const e = delegationAuditEntry({ ...req, note: undefined, synopticInstanceId: 'I1', recipient: { kind: 'pool', id: 'P1' } }, { id: 'd-1' }, 'Dr One', null);
    expect(e.detail).toBe('Synoptic report I1 of the case delegated (type CASUAL_REVIEW) to pool P1; delegation d-1.');
  });

  it('recordDelegation writes once, resolves the name, and never throws when the audit fails', async () => {
    const auditService = { logEvent: vi.fn(async () => ({ ok: true }) as any) };
    await recordDelegation(req, { id: 'd-9' }, { auditService, actorName: async () => 'Dr One', facilityOf: async () => 'F1' });
    expect(auditService.logEvent).toHaveBeenCalledTimes(1);
    const failing = { logEvent: vi.fn(async () => { throw new Error('down'); }) as any };
    await expect(recordDelegation(req, { id: 'd-9' }, { auditService: failing, actorName: async () => 'x', facilityOf: async () => null })).resolves.toBeUndefined();
  });
});
