// Batch 441: the Cytology Workspace worklist's decisions, moved out of the page.
import { describe, it, expect } from 'vitest';
import {
  aggregateCytologySpecimenFacts, availableOrganSites, cytologySpecimenScreeningFacts, cytologySpecimensOf,
  cytologyWorklistRow, cytologyWorklistView, effectiveCytologySettingsFor,
  latestCompletedAiResults, simulatedHpvResultEvent, type CytologyWorklistCase,
} from './cytologyWorklist';
import type { Case } from '@/types/case/Case';

const facts = { isQcPending: false, isRetrospectiveReviewPending: false, isPostSignOutPeerReviewPending: false, isHistologyCorrelationPending: false, isCellBlockAncillaryPending: false, isRoseActive: false };
const row = (id: string, over: Partial<CytologyWorklistCase> = {}, caseOver: Record<string, unknown> = {}): CytologyWorklistCase => ({
  caseData: { id, status: 'in-progress', order: { assignedTo: 'CT1' }, ...caseOver } as unknown as Case,
  specimenId: `${id}-SP`, isGynCytology: true, isCsmsQaPending: false, hasFinalDiagnosis: false, ...facts, ...over,
});

describe('per-case settings', () => {
  const inputs = {
    enterpriseRouting: { nonGynCytologyRouting: 'surgical_pathology_worklist' as const },
    enterpriseStrategy: { screeningStrategy: 'co_testing' },
    routingOverrideByFacility: new Map([['F2', { overrides: { nonGynCytologyRouting: 'cytology_worklist' } }]]),
    strategyOverrideByFacility: new Map(),
  };
  it('a facility override wins over the enterprise default; no facility keeps the default', () => {
    expect(effectiveCytologySettingsFor({ order: { facilityId: 'F2' } } as unknown as Case, inputs as never).routing).toBe('cytology_worklist');
    expect(effectiveCytologySettingsFor({ order: {} } as unknown as Case, inputs as never).routing).toBe('surgical_pathology_worklist');
  });
});

describe('rows', () => {
  it('keeps the newest completed AI result per case', () => {
    const r = (caseId: string, completedAt: string, status = 'completed') => ({ caseId, completedAt, status }) as never;
    const m = latestCompletedAiResults([r('C1', '2026-10-01'), r('C1', '2026-10-02'), r('C1', '2026-10-03', 'pending'), r('C2', '2026-09-01')]);
    expect((m.get('C1') as { completedAt: string }).completedAt).toBe('2026-10-02');
    expect(m.size).toBe(2);
  });

  it('finds the Cytology / FNA specimen and reads GYN, organ site, QC reason, final diagnosis and the CSMS flag', () => {
    const dict = new Map<string, unknown>([['D-H', { type: 'Histology' }], ['D-G', { type: 'Cytology', specimenCategory: 'GYN_CYTOLOGY' }]]);
    const c = { id: 'C1', specimens: [{ id: 'S0', specimenDictionaryEntryId: 'D-H' }, { id: 'S1', specimenDictionaryEntryId: 'D-G', cytologyScreening: { qcFlag: { reason: 'targeted_high_risk' }, finalDiagnosis: 'NILM' } }], caseFlags: [{ flagDefinitionId: 'f36' }] } as unknown as Case;
    const found = cytologySpecimensOf(c, dict);
    expect(found).toHaveLength(1);
    const { specimen, entry } = found[0];
    expect(specimen.id).toBe('S1');
    const r = cytologyWorklistRow(c, specimen, entry, facts);
    expect(r).toMatchObject({ specimenId: 'S1', isGynCytology: true, qcReason: 'targeted_high_risk', hasFinalDiagnosis: true, isCsmsQaPending: true });
  });
});

describe('Batch 483 — a case with more than one cytology/FNA specimen', () => {
  const dict = new Map<string, unknown>([
    ['D-H', { type: 'Histology' }],
    ['D-FNA-1', { type: 'FNA' }],
    ['D-FNA-2', { type: 'FNA' }],
  ]);

  it('cytologySpecimensOf returns every cytology/FNA specimen, not just the first', () => {
    const c = {
      id: 'C1',
      specimens: [
        { id: 'S0', specimenDictionaryEntryId: 'D-H' },
        { id: 'S1', specimenDictionaryEntryId: 'D-FNA-1' },
        { id: 'S2', specimenDictionaryEntryId: 'D-FNA-2' },
      ],
    } as unknown as Case;
    expect(cytologySpecimensOf(c, dict).map(s => s.specimen.id)).toEqual(['S1', 'S2']);
  });

  it('ORs flags across every specimen — a flag on the SECOND specimen alone still surfaces the case', () => {
    const first = cytologySpecimenScreeningFacts({ id: 'S1' }, { type: 'FNA' }, []);
    const second = cytologySpecimenScreeningFacts({ id: 'S2', cytologyScreening: { retrospectiveReviewFlag: { } } }, { type: 'FNA' }, []);
    expect(first.isRetrospectiveReviewPending).toBe(false);
    const agg = aggregateCytologySpecimenFacts([first, second]);
    expect(agg.isRetrospectiveReviewPending).toBe(true);
  });

  it('represents the row with the specimen that is itself QC-pending, not just the first', () => {
    const notQc = cytologySpecimenScreeningFacts({ id: 'S1', cytologyScreening: {} }, { type: 'FNA' }, []);
    const qcPending = cytologySpecimenScreeningFacts({ id: 'S2', cytologyScreening: { qcFlag: { reason: 'qc_random_selection' } } }, { type: 'FNA' }, []);
    const agg = aggregateCytologySpecimenFacts([notQc, qcPending]);
    expect(agg.specimen.id).toBe('S2');
    expect(agg.isQcPending).toBe(true);
  });

  it('a known specimen id (from the QC/Rescreen queue) wins over the QC-pending guess', () => {
    const a = cytologySpecimenScreeningFacts({ id: 'S1', cytologyScreening: { qcFlag: { reason: 'qc_random_selection' } } }, { type: 'FNA' }, []);
    const b = cytologySpecimenScreeningFacts({ id: 'S2' }, { type: 'FNA' }, []);
    const agg = aggregateCytologySpecimenFacts([a, b], 'S2');
    expect(agg.specimen.id).toBe('S2');
  });

  it('falls back to the first specimen when none has any flag, and is a safe no-op with no cytology specimens at all', () => {
    const plain = cytologySpecimenScreeningFacts({ id: 'S1' }, { type: 'FNA' }, []);
    expect(aggregateCytologySpecimenFacts([plain]).specimen.id).toBe('S1');
    const empty = aggregateCytologySpecimenFacts([]);
    expect(empty.specimen).toBeUndefined();
    expect(empty.isQcPending).toBe(false);
  });
});

describe('the tabs', () => {
  const rows = [
    row('mine'),
    row('pool', {}, { status: 'pool', order: {} }),
    row('mine-qc', { isQcPending: true }),
    row('csms', { isCsmsQaPending: true }),
    row('ng-thyroid', { isGynCytology: false, organSite: 'THYROID' }),
    row('ng-urine', { isGynCytology: false, organSite: 'URINE' }),
  ];
  const view = (domain: 'gyn' | 'non_gyn', site: string | null = null) =>
    cytologyWorklistView({ rows, qcRows: [row('shared-qc')], triageCount: 2, recallCount: 1, scansCompletedCount: 0 }, domain, site, 'CT1');

  it('My Worklist and Pool leave out cases waiting on a QA tile; QC / Rescreen is the shared queue (GYN only)', () => {
    const v = view('gyn');
    expect(v.lists.assigned.map(r => r.caseData.id)).toEqual(['mine']);
    expect(v.lists.pool.map(r => r.caseData.id)).toEqual(['pool']);
    expect(v.lists.qc.map(r => r.caseData.id)).toEqual(['shared-qc']);
    expect(view('non_gyn').lists.qc).toEqual([]);
  });

  it('the QA tiles span both domains; counts include the case lists', () => {
    const v = view('non_gyn');
    expect(v.lists.csms_qa.map(r => r.caseData.id)).toEqual(['csms']);
    expect(v.counts).toMatchObject({ hpv_triage: 2, recall_needed: 1, scans_completed: 0, csms_qa: 1 });
  });

  it('the organ-site filter narrows non-GYN only; the chips list the sites present', () => {
    expect(view('non_gyn', 'URINE').lists.assigned.map(r => r.caseData.id)).toEqual(['ng-urine']);
    expect(availableOrganSites(rows)).toEqual(['THYROID', 'URINE']);
  });
});

describe('the simulated HPV result', () => {
  it('builds the event an interface engine would send; none without a dictionary specimen', () => {
    const c = { id: 'C1', accession: { fullAccession: 'S26-1' }, specimens: [{ id: 'S1', label: 'A', specimenDictionaryEntryId: 'D' }] } as unknown as Case;
    expect(simulatedHpvResultEvent(c, 'Positive', 'm1', 't1')).toMatchObject({ internalCaseId: 'C1', accessionNumber: 'S26-1', specimenLetter: 'A', hrHpvResult: 'Positive', abnormalFlag: 'A' });
    expect(simulatedHpvResultEvent({ id: 'C2', specimens: [{ id: 'S' }] } as unknown as Case, 'Negative', 'm', 't')).toBeNull();
  });
});
