import { describe, it, expect } from 'vitest';
import { resolveSplitTechnicalFacility, resolveChargePerformingFacilityId } from './resolveChargeFacilities';
import { sweepChargesForOutbox } from './sweepChargesForOutbox';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { Facility } from '../facilities/IFacilityService';

const fac = (id: string, over: Partial<Facility> = {}): Facility => ({ id, name: id, roles: ['performing_lab'], status: 'Active', ...over } as Facility);

describe('resolveChargeFacilities (Batch 618, PS-336)', () => {
  const reporting = fac('rep');
  const technical = fac('tech');

  it('a genuinely split case sends the technical charge to the technical lab and the rest to the reporting lab', () => {
    const split = resolveSplitTechnicalFacility(reporting, technical);
    expect(split?.id).toBe('tech');
    expect(resolveChargePerformingFacilityId('TC', 'rep', split)).toBe('tech');
    expect(resolveChargePerformingFacilityId('26', 'rep', split)).toBe('rep');
    expect(resolveChargePerformingFacilityId('Global', 'rep', split)).toBe('rep');
  });

  it('a single-facility case is unaffected', () => {
    expect(resolveSplitTechnicalFacility(reporting, undefined)).toBeUndefined();
    expect(resolveSplitTechnicalFacility(reporting, fac('rep'))).toBeUndefined();
    expect(resolveChargePerformingFacilityId('TC', 'rep', undefined)).toBe('rep');
  });

  it('holds the professional line until sign-out but releases the technical charge at grossing', () => {
    const base = { caseId: 'C', transactionType: 'charge', sourceLevel: 'specimen', sourceLabel: 'A', specimenId: 'S', billingCode: '88305', cptCode: '88305', level: 'stain', ruleVersion: 1, resolvedAt: '2026-10-01T00:00:00.000Z', resolvedBy: 'system' };
    const charges = [{ ...base, id: 'tc', billingType: 'TC' }, { ...base, id: 'pro', billingType: '26' }] as ServiceChargeRecord[];
    expect(sweepChargesForOutbox(charges, 'SPECIMEN_GROSSED', new Set()).map(r => r.serviceChargeRecordId)).toEqual(['tc']);
    expect(sweepChargesForOutbox(charges, 'CASE_SIGNED_OUT', new Set()).map(r => r.serviceChargeRecordId)).toEqual(['pro']);
  });
});
