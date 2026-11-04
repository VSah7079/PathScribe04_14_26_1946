// Batch 433: what the billing correction dialog needs about a case (pure parts).
import { describe, it, expect } from 'vitest';
import { addableBillingCodes, caseMatchesQuery, correctionFromForm, initialCorrection, toCorrectionCase, type CorrectionForm } from './billingCorrectionCase';
import type { BillingRuleVersion } from '@/types/billing/BillingRuleVersion';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';

const form = (f: Partial<CorrectionForm>): CorrectionForm => ({ kind: 'changeCode', chargeId: '', newCptCode: '', newModifier: '', specimenId: '', blockId: '', billingCode: '', ...f });

describe('billingCorrectionCase', () => {
  it('finds a case by its exact case id or accession number, ignoring case', () => {
    const c = { id: 'LIS-1', accession: { accessionNumber: 's26-100', fullAccession: 'S26-100-MAIN' } };
    expect(caseMatchesQuery(c, 'lis-1')).toBe(true);
    expect(caseMatchesQuery(c, ' S26-100 ')).toBe(true);
    expect(caseMatchesQuery(c, 's26-100-main')).toBe(true);
    expect(caseMatchesQuery(c, 'S26-10')).toBe(false);
    expect(caseMatchesQuery(c, '')).toBe(false);
  });

  it('offers each billing code with an active rule once', () => {
    const r = (billingCode: string, status: string, description?: string) => ({ billingCode, status, cpt: '1', description } as unknown as BillingRuleVersion);
    expect(addableBillingCodes([r('B', 'ACTIVE', 'b'), r('A', 'ACTIVE', 'a'), r('A', 'ACTIVE', 'a2'), r('C', 'RETIRED')])).toEqual([{ code: 'A', description: 'a' }, { code: 'B', description: 'b' }]);
  });

  it('lists only the charges not yet reversed', () => {
    const charges = [
      { id: 'c1', transactionType: 'charge' }, { id: 'c2', transactionType: 'charge' }, { id: 'cr', transactionType: 'credit', reversesTransactionId: 'c1' },
    ] as ServiceChargeRecord[];
    const cc = toCorrectionCase({ id: 'X', specimens: [{ id: 's', label: 'A', blocks: [{ id: 'b', label: '1' }] }] }, charges, [], true);
    expect(cc.charges.map(c => c.id)).toEqual(['c2']);
    expect(cc.specimens).toEqual([{ id: 's', label: 'A', blocks: [{ id: 'b', label: '1' }] }]);
    expect(cc.accession).toBe('X');
  });

  it('starts from the deficiency: reversal, missing charge, modifier, code', () => {
    expect(initialCorrection({ chargeRecordId: 'c1', deficiencyType: 'UNSUPPORTED_CPT_LEVEL' }, 'CHARGE_REVERSED')).toEqual({ kind: 'reverse', chargeId: 'c1' });
    expect(initialCorrection({ missingCharge: true, deficiencyType: 'UNSUPPORTED_CPT_LEVEL' }, 'CODE_CORRECTED')).toEqual({ kind: 'addMissing', chargeId: '' });
    expect(initialCorrection({ deficiencyType: 'MISSING_CHARGE' }, 'CODE_CORRECTED')).toEqual({ kind: 'addMissing', chargeId: '' });
    expect(initialCorrection({ chargeRecordId: 'c1', deficiencyType: 'MODIFIER_MISMATCH' }, 'CODE_CORRECTED')).toEqual({ kind: 'changeModifier', chargeId: 'c1' });
    expect(initialCorrection(undefined)).toEqual({ kind: 'changeCode', chargeId: '' });
  });

  it('turns the form into a correction only when it has what it needs', () => {
    expect(correctionFromForm(form({ chargeId: 'c1' }))).toBeNull();
    expect(correctionFromForm(form({ chargeId: 'c1', newCptCode: ' 88305 ' }))).toEqual({ kind: 'changeCode', chargeId: 'c1', newCptCode: '88305' });
    expect(correctionFromForm(form({ kind: 'reverse', chargeId: 'c1' }))).toEqual({ kind: 'reverse', chargeId: 'c1' });
    expect(correctionFromForm(form({ kind: 'changeModifier', chargeId: 'c1', newModifier: '' }))).toEqual({ kind: 'changeModifier', chargeId: 'c1', newModifier: '' });
    expect(correctionFromForm(form({ kind: 'addMissing', specimenId: 's' }))).toBeNull();
    expect(correctionFromForm(form({ kind: 'addMissing', specimenId: 's', billingCode: 'X' }))).toEqual({ kind: 'addMissing', specimenId: 's', blockId: undefined, billingCode: 'X' });
  });
});
