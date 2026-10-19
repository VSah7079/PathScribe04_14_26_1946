// src/services/cytology/resolveCytologyEuComplianceMatrixReport.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCytologyEuComplianceMatrixReport } from './resolveCytologyEuComplianceMatrixReport';

describe('resolveCytologyEuComplianceMatrixReport — real, per direct guidance\'s own EU-QA-01 specification', () => {
  it('a genuinely empty input produces zero rows, never a crash', () => {
    expect(resolveCytologyEuComplianceMatrixReport([], {})).toHaveLength(0);
  });

  it('real specimens correctly group by real country code, never mixing two different real countries into one row', () => {
    const rows = resolveCytologyEuComplianceMatrixReport(
      [{ countryCode: 'NL', hpvStatus: 'primary' }, { countryCode: 'FR', hpvStatus: 'co_test' }], {},
    );
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.countryCode).sort()).toEqual(['FR', 'NL']);
  });

  it('real primary vs. co-test HPV counts are correctly, independently tallied per country', () => {
    const [row] = resolveCytologyEuComplianceMatrixReport(
      [
        { countryCode: 'NL', hpvStatus: 'primary' },
        { countryCode: 'NL', hpvStatus: 'primary' },
        { countryCode: 'NL', hpvStatus: 'co_test' },
        { countryCode: 'NL', hpvStatus: 'not_applicable' },
      ], {},
    );
    expect(row.totalCases).toBe(4);
    expect(row.hpvPrimaryCount).toBe(2);
    expect(row.hpvCoTestCount).toBe(1);
  });

  it('a real non-conformity count is correctly joined from the given lookup, per real country', () => {
    const rows = resolveCytologyEuComplianceMatrixReport(
      [{ countryCode: 'DE', hpvStatus: 'primary' }],
      { DE: 3 },
    );
    expect(rows[0].internalAuditNonConformityCount).toBe(3);
  });

  it('a real country with no entry in the given non-conformity lookup gets an honest 0, not undefined or a crash', () => {
    const rows = resolveCytologyEuComplianceMatrixReport([{ countryCode: 'IE', hpvStatus: 'primary' }], {});
    expect(rows[0].internalAuditNonConformityCount).toBe(0);
  });
});

describe('Batch 608 (#52): registry IDs, platform and interval adherence columns', () => {
  it('lists distinct registry IDs, counts ThinPrep and SurePath, and carries the adherence percentage', () => {
    const [row] = resolveCytologyEuComplianceMatrixReport([
      { countryCode: 'NL', hpvStatus: 'primary', nationalRegistryId: 'NL-77', platform: 'ThinPrep' },
      { countryCode: 'NL', hpvStatus: 'co_test', nationalRegistryId: 'NL-77', platform: 'SurePath' },
      { countryCode: 'NL', hpvStatus: 'primary', platform: 'other' },
    ], {}, { NL: { evaluated: 2, onSchedule: 1, adherencePercent: 50 } });
    expect(row).toMatchObject({ nationalRegistryIds: ['NL-77'], thinPrepCount: 1, surePathCount: 1, intervalAdherencePercent: 50 });
  });
  it('without adherence data the percentage is undefined', () => {
    const [row] = resolveCytologyEuComplianceMatrixReport([{ countryCode: 'FR', hpvStatus: 'primary' }], {});
    expect(row.intervalAdherencePercent).toBeUndefined();
    expect(row.nationalRegistryIds).toEqual([]);
  });
});
