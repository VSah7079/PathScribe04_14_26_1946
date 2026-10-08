import { describe, it, expect } from 'vitest';
import { buildFullPatientReportRows, resolveIntraopDiagnosisText } from './fullPatientReportRows';
import type { Case } from '@/types/case/Case';

const caseOf = (c: Record<string, unknown>) => ({ id: 'C1', ...c }) as unknown as Case;

describe('buildFullPatientReportRows (PS-318 Full Patient Report panel)', () => {
  it('lists the rows in the order Clinical History, Intraoperative, Gross, Microscopic, Preliminary, Ancillary', () => {
    const rows = buildFullPatientReportRows(caseOf({}), null);
    expect(rows.map(r => r.id)).toEqual([
      'clinicalHistory', 'intraopDiagnosis', 'grossDescription',
      'microscopicFindings', 'preliminaryDiagnosis', 'ancillaryStudies',
    ]);
  });

  it('shows the Preliminary Diagnosis row from diagnostic.preliminaryImpression', () => {
    const rows = buildFullPatientReportRows(caseOf({ diagnostic: { preliminaryImpression: 'Invasive ductal carcinoma, pending IHC' } }), null);
    expect(rows.find(r => r.id === 'preliminaryDiagnosis')?.text).toBe('Invasive ductal carcinoma, pending IHC');
  });

  it('marks the Preliminary Diagnosis row as not recorded (null) when there is no preliminary impression', () => {
    const rows = buildFullPatientReportRows(caseOf({ diagnostic: { grossDescription: 'gross' } }), null);
    expect(rows.find(r => r.id === 'preliminaryDiagnosis')?.text).toBeNull();
  });

  it('shows the Intraoperative Diagnosis row from the merged intraoperative text, null when there is none', () => {
    expect(buildFullPatientReportRows(caseOf({}), 'A: Benign').find(r => r.id === 'intraopDiagnosis')?.text).toBe('A: Benign');
    expect(buildFullPatientReportRows(caseOf({}), null).find(r => r.id === 'intraopDiagnosis')?.text).toBeNull();
  });

  it('reads every row from its own source field', () => {
    const rows = buildFullPatientReportRows(caseOf({
      order: { clinicalIndication: 'Mass' },
      diagnostic: { grossDescription: 'G', microscopicDescription: 'M', preliminaryImpression: 'P', ancillaryStudies: 'IHC' },
    }), 'A: Frozen');
    expect(rows.map(r => r.text)).toEqual(['Mass', 'A: Frozen', 'G', 'M', 'P', 'IHC']);
  });

  it('shows no rows when no case is loaded', () => {
    expect(buildFullPatientReportRows(null, 'x')).toEqual([]);
  });
});

describe('resolveIntraopDiagnosisText (PS-318 merged intraoperative entry)', () => {
  const entries = [
    { status: 'merged', mergedIntoCaseId: 'OTHER', specimens: [{ specimenLabel: 'A', frozenSectionDiagnosis: 'wrong case' }] },
    { status: 'in-progress', mergedIntoCaseId: 'C1', specimens: [{ specimenLabel: 'A', frozenSectionDiagnosis: 'not merged' }] },
    { status: 'merged', mergedIntoCaseId: 'C1', specimens: [
      { specimenLabel: 'A', frozenSectionDiagnosis: 'Benign' },
      { specimenLabel: 'B', frozenSectionDiagnosis: '' },
      { specimenLabel: 'C', frozenSectionDiagnosis: 'Carcinoma, defer to permanents' },
    ] },
  ] as any[];

  it("takes each frozen specimen's diagnosis from the entry merged into this case, one line each", () => {
    expect(resolveIntraopDiagnosisText(entries, 'C1')).toBe('A: Benign\nC: Carcinoma, defer to permanents');
  });

  it('returns null when no merged entry for this case has a frozen diagnosis', () => {
    expect(resolveIntraopDiagnosisText(entries, 'NONE')).toBeNull();
    expect(resolveIntraopDiagnosisText([{ status: 'merged', mergedIntoCaseId: 'C2', specimens: [{ specimenLabel: 'A' }] }] as any[], 'C2')).toBeNull();
  });
});
