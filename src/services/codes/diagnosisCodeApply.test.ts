// src/services/codes/diagnosisCodeApply.test.ts
// Batch 649: saving diagnosis codes needs case:diagnosis-code:apply.
import { describe, expect, it, vi } from 'vitest';
import { assertDiagnosisCodeApply } from './diagnosisCodeApply';

describe('assertDiagnosisCodeApply (Batch 649)', () => {
  it('allowed: passes, having checked the capability for the case', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    await expect(assertDiagnosisCodeApply('C1', { enforce })).resolves.toBeUndefined();
    expect(enforce).toHaveBeenCalledWith('case:diagnosis-code:apply', { caseId: 'C1' });
  });

  it('refused: throws the reason (the Codes window shows it and stays open)', async () => {
    await expect(assertDiagnosisCodeApply('C1', { enforce: async () => ({ allowed: false }) })).rejects.toThrow();
  });
});
