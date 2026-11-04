import { describe, it, expect } from 'vitest';
import { buildTechnicalFacilityAuditEntry } from './technicalFacilityAudit';

describe('buildTechnicalFacilityAuditEntry (Batch 618, PS-336)', () => {
  it('names set, changed and cleared, with ids only', () => {
    expect(buildTechnicalFacilityAuditEntry('C1', undefined, 'f2', 'dr.x')?.event).toBe('Technical Component Facility Set');
    expect(buildTechnicalFacilityAuditEntry('C1', 'f1', 'f2', 'dr.x')?.event).toBe('Technical Component Facility Changed');
    const cleared = buildTechnicalFacilityAuditEntry('C1', 'f1', undefined, 'dr.x');
    expect(cleared?.event).toBe('Technical Component Facility Cleared');
    expect(cleared?.detail).toBe('Case C1: technical component facility f1 -> none');
    expect(cleared?.caseId).toBe('C1');
  });
  it('writes nothing when nothing changed', () => {
    expect(buildTechnicalFacilityAuditEntry('C1', 'f1', 'f1', 'u')).toBeNull();
    expect(buildTechnicalFacilityAuditEntry('C1', undefined, '', 'u')).toBeNull();
  });
});
