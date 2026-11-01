// Batch 728 (Lab Workflow & Batch spec, Decision 4): a research case's material runs on its own retention clock,
// from accessioning; any other case's from sign-out.
import { describe, it, expect, beforeEach } from 'vitest';
import { caseDisposalClock, resolveCaseDisposalDate } from './resolveCaseDisposalDate';
import { saveLabSetting } from '../labSettings/labSettingsStore';
import { RESEARCH_CASE_SETTINGS_KEY } from '../researchCases/researchCaseSettings';
import { DEFAULT_RESEARCH_CASE_SETTINGS } from '../researchCases/researchCaseRules';

const research = { accession: { accessionNumber: 'RES26-1', fullAccession: 'RES26-1', accessionedAt: '2026-01-01T00:00:00Z' }, patient: { id: 'p', mrn: 'X' } } as never;
const clinical = (finalizedAt?: string) => ({ accession: { accessionNumber: 'S26-1', fullAccession: 'S26-1' }, patient: { id: 'p', mrn: 'X' }, finalizedAt }) as never;

describe('disposal clock (Decision 4)', () => {
  beforeEach(() => saveLabSetting(RESEARCH_CASE_SETTINGS_KEY, { ...DEFAULT_RESEARCH_CASE_SETTINGS, retentionDays: 30 }));

  it('research: the lab\'s retention days from accessioning, with or without a sign-out', async () => {
    expect(caseDisposalClock(research)).toBe('research');
    const d = await resolveCaseDisposalDate(research, 'block', 'US' as never, []);
    expect(d?.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('clinical: no clock before sign-out', async () => {
    expect(caseDisposalClock(clinical())).toBe('notStarted');
    expect(await resolveCaseDisposalDate(clinical(), 'block', 'US' as never, ['x'])).toBeNull();
    expect(caseDisposalClock(clinical('2026-01-01T00:00:00Z'))).toBe('clinical');
  });

  it('research cases switched off: the clinical clock applies', () => {
    saveLabSetting(RESEARCH_CASE_SETTINGS_KEY, { ...DEFAULT_RESEARCH_CASE_SETTINGS, enabled: false });
    expect(caseDisposalClock(research)).toBe('notStarted');
  });
});
