// Batch 745 (Pete's seed row S6, Video 4): the autopsy stages the video needs, checked against the gates the report
// page uses: written authorization pending, ready for body release, and final signed.
import { describe, expect, it } from 'vitest';
import { DEMO_BASELINE_CASES } from './demoBaselineCases';
import { resolveAutopsyGrossExaminationGate } from '../autopsy/resolveAutopsyGrossExaminationGate';
import { resolveAutopsyBodyReleaseGate } from '../autopsy/resolveAutopsyBodyReleaseGate';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';
import { DEMO_SURGICAL_PATIENTS } from '../patients/demoSurgicalPatients';

const byId = (id: string) => (DEMO_BASELINE_CASES as any[]).find(c => c.id === id);

describe('S6 autopsy stages', () => {
  it('A26-4665: temporary accession, the Medical Examiner order verbal only, so gross examination waits', () => {
    const c = byId('A26-4665');
    expect(c.intakeType).toBe('downtime');
    expect(c.autopsy.forensicAuthorization.verbalOrderReceivedFrom).toBeTruthy();
    expect(resolveAutopsyGrossExaminationGate(c.autopsy)).toEqual({ allowed: false, blockedReasons: ['missing_judicial_authorization'] });
    expect(resolveAutopsyGrossExaminationGate({ ...c.autopsy, forensicAuthorization: { ...c.autopsy.forensicAuthorization, orderReference: 'ME-2026-04665', orderDate: '2026-10-30' } }).allowed).toBe(true);
  });

  it('A26-4666: PAD signed, no hold, body still in the mortuary: ready for release; brain excluded, retention refused', () => {
    const c = byId('A26-4666');
    expect(resolveAutopsyBodyReleaseGate(c.autopsy)).toEqual({ allowed: true, blockedReasons: [] });
    expect(c.specimens[0].locationHistory.some((h: any) => h.action === 'Released')).toBe(false);
    expect(c.autopsy.hospitalConsent).toMatchObject({ excludedOrgans: ['brain'], retentionPermitted: false });
    expect(c.specimens[0].organCodes).not.toContain('brain');
  });

  it('A26-4667: PAD and FAD signed, finalized, the body released', () => {
    const c = byId('A26-4667');
    expect(c.status).toBe('finalized');
    expect([c.autopsy.padSnapshot.tier, c.autopsy.fadSnapshot.tier]).toEqual(['PAD', 'FAD']);
    const history = c.specimens[0].locationHistory;
    expect(history[history.length - 1].action).toBe('Released');
  });

  it('the whole-body autopsy entry opens the autopsy accession block, and the patients are in the index', async () => {
    const all: any = await mockSpecimenDictionaryService.getAll();
    const entry = ((all.data ?? all) as any[]).find(e => e.id === 'sp-autopsy-complete');
    expect(entry).toMatchObject({ name: 'Autopsy, Complete (Body)', specimenCategory: 'AUTOPSY' });
    for (const id of ['A26-4665', 'A26-4666', 'A26-4667']) {
      const c = byId(id);
      expect(DEMO_SURGICAL_PATIENTS.find(p => p.id === c.patient.id)?.mrn, id).toBe(c.patient.mrn);
      expect(c.specimens[0].specimenDictionaryEntryId).toBe('sp-autopsy-complete');
      expect(c.order.assignedTo).toBe('PATH-SJ-001');
    }
  });
});
