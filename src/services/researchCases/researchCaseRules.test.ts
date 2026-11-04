// Batch 728 (Lab Workflow & Batch spec, Decision 4): recognising research cases, and their settings.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RESEARCH_CASE_SETTINGS as D, isResearchCase, withoutResearchCases, normaliseResearchSettings,
  researchSettingsProblems, researchDisposalEligibleDate, normalisePrefixes,
} from './researchCaseRules';

const kase = (acc: Record<string, string | undefined>, mrn?: string) => ({ accession: acc, patient: { mrn } });

describe('research cases (Decision 4)', () => {
  it('a case is a research case by its accession prefix, its full accession, or the research patient\'s MRN', () => {
    expect(isResearchCase(kase({ accessionPrefix: 'res' }), D)).toBe(true);
    expect(isResearchCase(kase({ fullAccession: 'RES26-0042' }), D)).toBe(true);
    expect(isResearchCase(kase({ fullAccession: 'S26-0042' }, 'rsch-0001'), D)).toBe(true);
    expect(isResearchCase(kase({ fullAccession: 'S26-0042', accessionPrefix: 'S' }, 'MRN-1'), D)).toBe(false);
    expect(isResearchCase(null, D)).toBe(false);
  });

  it('off: nothing is a research case, and nothing is left out', () => {
    const off = { ...D, enabled: false };
    expect(isResearchCase(kase({ fullAccession: 'RES26-1' }), off)).toBe(false);
    expect(withoutResearchCases([kase({ fullAccession: 'RES26-1' })], off)).toHaveLength(1);
  });

  it('leaves research cases out of a list', () => {
    const list = [kase({ fullAccession: 'RES26-1' }), kase({ fullAccession: 'S26-1' }), kase({ fullAccession: 'S26-2' }, 'RSCH-9')];
    expect(withoutResearchCases(list, D).map(c => c.accession.fullAccession)).toEqual(['S26-1']);
  });

  it('settings: prefixes trimmed and de-duplicated; at least one prefix and a financial class when on; whole days', () => {
    expect(normalisePrefixes([' RES ', 'res', '', 'TRL'])).toEqual(['RES', 'TRL']);
    expect(normaliseResearchSettings(null)).toEqual(D);
    expect(researchSettingsProblems(D)).toEqual([]);
    expect(researchSettingsProblems({ ...D, accessionPrefixes: [], mrnPrefixes: [] })).toEqual(['noMarker']);
    expect(researchSettingsProblems({ ...D, enabled: false, accessionPrefixes: [], mrnPrefixes: [], noChargeFinancialClass: '' })).toEqual([]);
    expect(researchSettingsProblems({ ...D, noChargeFinancialClass: ' ' })).toEqual(['financialClassRequired']);
    expect(researchSettingsProblems({ ...D, retentionDays: 1.5 })).toEqual(['retentionDaysInvalid']);
    expect(researchSettingsProblems({ ...D, retentionDays: -1 })).toEqual(['retentionDaysInvalid']);
    expect(researchSettingsProblems({ ...D, accessionPrefixes: ['R S'] })).toEqual(['prefixInvalid']);
  });

  it('material is kept for the retention days from accessioning', () => {
    const d = researchDisposalEligibleDate({ accession: { accessionedAt: '2026-01-01T00:00:00Z' } }, { ...D, retentionDays: 10 });
    expect(d?.toISOString()).toBe('2026-01-11T00:00:00.000Z');
    expect(researchDisposalEligibleDate({ accession: {} }, D)).toBeUndefined();
  });
});
