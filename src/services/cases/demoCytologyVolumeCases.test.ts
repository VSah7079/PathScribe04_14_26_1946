// Batch 749 (Pete's seed rows S5 and S4): each of Priya Desai's GYN tiles gets its cases by the rules the Cytology
// Worklist applies (screening eligibility by strategy, HPV triage, recall, peer review), and the AI reads are there.
import { describe, expect, it } from 'vitest';
import { CYTOLOGY_VOLUME_SPECS, DEMO_CYTOLOGY_VOLUME_CASES } from './demoCytologyVolumeCases';
import { DEMO_BASELINE_CASES } from './demoBaselineCases';
import { resolveCytologyTriageState, isCytologyScreeningEligible } from '../cytology/resolveCytologyTriageState';
import { resolveCytologyPostSignOutPeerReviewPoolMembership } from '../cytology/resolveCytologyPostSignOutPeerReviewPoolMembership';
import { mockAiScreeningResultService } from '../digitalPathology/mockAiScreeningResultService';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';
import { DEMO_CYTOLOGY_PATIENTS } from '../patients/demoCytologyPatients';

const byId = (id: string) => DEMO_CYTOLOGY_VOLUME_CASES.find(c => c.id === id) as any;
const strategyOf = (id: string) => (CYTOLOGY_VOLUME_SPECS.find(s => s.id === id)!.facility.id === 'c3' ? 'primary_hpv_reflex' : 'co_testing');
const state = (id: string, selfCollected = false) =>
  resolveCytologyTriageState(strategyOf(id), byId(id).specimens[0].cytologyScreening?.hpvResult, selfCollected);

describe('S5 cytology volume', () => {
  it('My Worklist: five assigned to Priya and eligible to screen, the Video 3 case with HPV pending', () => {
    const mine = ['S26-5501-CYT-001', 'S26-5502-CYT-001', 'S26-5503-CYT-001', 'S26-5504-CYT-001', 'S26-5510-CYT-001'];
    for (const id of mine) {
      expect(byId(id).order.assignedTo, id).toBe('CT-001');
      expect(isCytologyScreeningEligible(state(id)), id).toBe(true);
    }
    expect(byId('S26-5501-CYT-001').specimens[0].cytologyScreening).toMatchObject({ hpvCoTestOrdered: true, hpvResult: 'Pending' });
  });

  it('Pool, HPV Triage, Recall and Peer Review each have a case', () => {
    expect(['S26-5505-CYT-001', 'S26-5506-CYT-001'].map(id => byId(id).status)).toEqual(['pool', 'pool']);
    expect(state('S26-5508-CYT-001')).toBe('awaiting_hpv_result');
    expect(state('S26-5509-CYT-001', true)).toBe('reflex_requires_new_specimen');
    const peer = byId('S26-5507-CYT-001');
    expect(peer.status).toBe('finalized');
    expect(resolveCytologyPostSignOutPeerReviewPoolMembership(peer.specimens[0].cytologyScreening.postSignOutPeerReviewFlag, [])).toBe(true);
  });

  it('dictionary entries exist (the self-collected one is self-collected), the AI reads are complete, patients indexed', async () => {
    const all: any = await mockSpecimenDictionaryService.getAll();
    const dict = new Map(((all.data ?? all) as any[]).map(e => [e.id, e]));
    for (const s of CYTOLOGY_VOLUME_SPECS) expect(dict.has(s.entryId), s.entryId).toBe(true);
    expect(dict.get('sp-cyto-hpv-self').isSelfCollected).toBe(true);
    const ai: any = await mockAiScreeningResultService.getAll();
    const done = (ai.data as any[]).filter(r => r.status === 'completed' && /^S26-5\d{3}-CYT-001$/.test(r.caseId)).map(r => r.caseId);
    expect(done).toEqual(expect.arrayContaining(['S26-5002-CYT-001', 'S26-5501-CYT-001', 'S26-5503-CYT-001']));
    for (const c of DEMO_CYTOLOGY_VOLUME_CASES as any[]) {
      expect((DEMO_BASELINE_CASES as any[]).some(x => x.id === c.id), c.id).toBe(true);
      expect(DEMO_CYTOLOGY_PATIENTS.find(p => p.id === c.patient.id)?.mrn, c.id).toBe(c.patient.mrn);
    }
  });
});
