// src/services/auth/authorizeSurgicalSignOut.test.ts
// Batch 649: surgical sign-out needs the capability AND the case relationship; no role bypasses either.
import { describe, expect, it, vi } from 'vitest';
import { authorizeSurgicalSignOut } from './authorizeSurgicalSignOut';
import { canFinalizeCase, type CaseFinalizeParticipant } from './caseAccessControl';

const primary: CaseFinalizeParticipant = { staffId: 'P1', status: 'active', participationTypeIds: ['primary'] };
const caseData = { id: 'C1', order: { facilityId: 'F1' } };

describe('authorizeSurgicalSignOut (Batch 649)', () => {
  it('checks surgical:report:sign-out with the case and its facility, then keeps the participation decision', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    const decision = await authorizeSurgicalSignOut(caseData, canFinalizeCase({ id: 'P1', role: 'pathologist' }, [primary]), { enforce });
    expect(enforce).toHaveBeenCalledWith('surgical:report:sign-out', { caseId: 'C1', facilityId: 'F1' });
    expect(decision.granted).toBe(true);
  });

  it('without the capability the assigned primary is refused (not-permitted)', async () => {
    const decision = await authorizeSurgicalSignOut(caseData, canFinalizeCase({ id: 'P1', role: 'pathologist' }, [primary]), { enforce: async () => ({ allowed: false }) });
    expect(decision).toMatchObject({ granted: false, dimension: 'not-permitted' });
    expect(decision.reason).toBeTruthy();
  });

  it('the capability alone is not enough: a Superadmin or administrator who is not on the case is refused', async () => {
    for (const role of ['superadmin', 'admin', 'pathologist-admin'] as const) {
      const decision = await authorizeSurgicalSignOut(caseData, canFinalizeCase({ id: 'X', role }, [primary]), { enforce: async () => ({ allowed: true }) });
      expect(decision).toMatchObject({ granted: false, dimension: 'not-a-participant' });
    }
  });
});
