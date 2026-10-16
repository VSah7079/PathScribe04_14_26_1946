// @vitest-environment happy-dom
// Batch 456 (demo baseline): after a Full Reset there are autopsies at each
// stage for Pete Nimmo and Sarah Johnson, and the Molecular workcenter Daniel
// Kim uses has a rack awaiting extraction, a run in progress and a blocked run.
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_BASELINE_CASES, DEMO_BASELINE_CASE_IDS } from '../cases/demoBaselineCases';
import { mockCaseService } from '../cases/mockCaseService';
import { resolveAutopsyAccessionStatus } from '../autopsy/resolveAutopsyAccessionStatus';
import { resolveAutopsyGrossExaminationGate } from '../autopsy/resolveAutopsyGrossExaminationGate';
import { resolveAutopsyBodyReleaseGate } from '../autopsy/resolveAutopsyBodyReleaseGate';
import { resolveAutopsyBodyAlreadyReleased } from '../autopsy/resolveAutopsyBodyAlreadyReleased';
import { resolveMortuaryStorageOccupancy } from '../autopsy/resolveMortuaryStorageOccupancy';
import { getMainBodySpecimen } from '../autopsy/getMainBodySpecimen';
import { mockAssetLocationDictionaryService } from '../assetLocation/mockAssetLocationDictionaryService';
import { canFinalizeCase } from '../auth/caseAccessControl';
import { mockMolecularBatchService } from '../molecular/mockMolecularBatchService';
import { mockMolecularExtractionRackService } from '../molecular/mockMolecularExtractionRackService';
import { mockMolecularAssayControlRuleService } from '../molecular/mockMolecularAssayControlRuleService';
import { MOLECULAR_DEMO_BATCHES, MOLECULAR_DEMO_RACKS, MOLECULAR_DEMO_VIALS } from '../molecular/molecularDemoSeed';
import { resolveMolecularControlRequirementValidation } from '../molecular/resolveMolecularControlRequirementValidation';
import { resolveMolecularReagentLotGating } from '../molecular/resolveMolecularReagentLotGating';
import { resolveMolecularRunValidationGating } from '../molecular/resolveMolecularRunValidationGating';
import { rackWorklistRows } from '../molecular/rackWorklist';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

beforeEach(() => localStorage.clear());

const cases = DEMO_BASELINE_CASES as any[];
const byId = (id: string) => cases.find(c => c.id === id);
const autopsy = (id: string) => byId(id).autopsy as AutopsyCaseDetails;

describe('Batch 456: autopsy cases', () => {
  it('five autopsies at Metro General (four hospital-consented, one forensic), ids unique among the baseline', () => {
    expect(new Set(DEMO_BASELINE_CASE_IDS).size).toBe(DEMO_BASELINE_CASE_IDS.length);
    const autopsies = cases.filter(c => c.autopsy);
    expect(autopsies.map(c => c.id)).toEqual(['A26-4660', 'A26-4661', 'A26-4662', 'A26-4663', 'A26-4664']);
    for (const c of autopsies) {
      expect(c.order.facilityId, c.id).toBe('c1');
      expect(c.accession).toEqual(expect.objectContaining({ accessionPrefix: 'A', fullAccession: c.id }));
      // Batch 469: A26-4664 is an HTA-governed jurisdiction (GB_EW), not US.
      expect(c.autopsy, c.id).toEqual(expect.objectContaining({ scope: 'full' }));
      expect(resolveAutopsyAccessionStatus(c.autopsy), c.id).toBe('fully_authorized');
      expect(getMainBodySpecimen(c.specimens)?.description, c.id).toMatch(/^Body/);
    }
    expect(autopsies.filter(c => c.autopsy.caseAuthority === 'hospital_consented').map(c => c.id)).toEqual(['A26-4660', 'A26-4661', 'A26-4662', 'A26-4664']);
    expect(autopsies.filter(c => c.autopsy.caseAuthority === 'statutory_judicial').map(c => c.id)).toEqual(['A26-4663']);
  });

  it('Batch 469: A26-4664 is an HTA-governed (GB_EW) case with full organ retention consented and a tier on file, disposal not yet recorded', () => {
    const c = byId('A26-4664');
    expect(c.autopsy.jurisdiction).toBe('GB_EW');
    expect(c.autopsy.caseAuthority).toBe('hospital_consented');
    expect(c.autopsy.organRetentionTier).toBe('tier_2_full_organ_retention');
    expect(c.autopsy.organRetentionDisposal).toBeUndefined();
  });

  it('Batch 469: A26-4663 carries a still-pending toxicology order alongside its earlier custody transfer', () => {
    const c = byId('A26-4663');
    expect(c.autopsy.toxicologyOrders).toHaveLength(1);
    expect(c.autopsy.toxicologyOrders[0]).toEqual(expect.objectContaining({ status: 'ordered', labName: 'County Medical Examiner Toxicology Lab' }));
  });

  it('A26-4660 is awaiting prosection: consent logged, gross examination allowed, nothing signed', () => {
    const c = byId('A26-4660');
    expect(c.status).toBe('accessioned');
    expect(c.order.assignedTo).toBe('PATH-001');
    expect(resolveAutopsyGrossExaminationGate(c.autopsy)).toEqual({ allowed: true, blockedReasons: [] });
    expect(c.autopsy.padSnapshot).toBeUndefined();
  });

  it('Batch 468: A26-4663 is a forensic autopsy under a Medical Examiner order, with one custody transfer already on record', () => {
    const c = byId('A26-4663');
    expect(c.autopsy.caseAuthority).toBe('statutory_judicial');
    expect(c.autopsy.hospitalConsent).toBeUndefined();
    expect(c.autopsy.forensicAuthorization).toEqual(expect.objectContaining({ orderReference: 'ME-2026-04663' }));
    expect(c.autopsy.custodyLog).toHaveLength(1);
    expect(c.autopsy.custodyLog[0]).toEqual(expect.objectContaining({
      toCustodianType: 'medical_examiner', fromCustodianType: 'pathology_department',
    }));
  });

  it('A26-4661 has its PAD drafted for Pete to sign; the body waits for that before release', () => {
    const c = byId('A26-4661');
    expect(c.order.assignedTo).toBe('PATH-001');
    expect(autopsy('A26-4661').padSnapshot).toBeUndefined();
    expect(c.orchSections.find((s: any) => s.label === 'Preliminary Anatomic Diagnosis').text).toMatch(/pulmonary thromboembol/i);
    expect(resolveAutopsyBodyReleaseGate(c.autopsy).allowed).toBe(false);
    // Pete may sign it (attending participant); Connor Whitlock prosected it.
    expect(canFinalizeCase({ id: 'PATH-001', role: 'pathologist' }, c.participants).granted).toBe(true);
    expect(c.participants.some((p: any) => p.staffId === 'PA-001' && p.participationTypeIds.includes('grossing'))).toBe(true);
    // Once the PAD exists the body can be released.
    expect(resolveAutopsyBodyReleaseGate({ ...c.autopsy, padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Pete Nimmo', isPathologist: true }, signedAt: new Date().toISOString() } }).allowed).toBe(true);
  });

  it('A26-4662 has its PAD signed and body released; the FAD waits on neuropathology (Sarah Johnson)', () => {
    const c = byId('A26-4662');
    expect(c.order.assignedTo).toBe('PATH-SJ-001');
    expect(c.autopsy.padSnapshot.signedBy.name).toBe('Dr. Sarah Johnson');
    expect(c.autopsy.fadSnapshot).toBeUndefined();
    expect(c.autopsy.ancillaryHold.active).toBe(true);
    const history = getMainBodySpecimen(c.specimens)!.locationHistory!;
    expect(resolveAutopsyBodyAlreadyReleased(history)).toBe(true);
    // Released before the hold began (the release gate refuses during a hold).
    const releasedAt = history.find(h => h.action === 'Released')!.at;
    expect(releasedAt < c.autopsy.ancillaryHold.startedAt).toBe(true);
    expect(canFinalizeCase({ id: 'PATH-SJ-001', role: 'pathologist' }, c.participants).granted).toBe(true);
  });

  it('the bodies still in the mortuary occupy Tray A (A26-4660, A26-4663) and Tray B (A26-4661)', async () => {
    const locations = await mockAssetLocationDictionaryService.getAll();
    const histories = cases.filter(c => c.autopsy).map(c => getMainBodySpecimen(c.specimens)!.locationHistory ?? []);
    const occupancy = resolveMortuaryStorageOccupancy(locations.ok ? locations.data : [], histories);
    const occupied = occupancy.filter(o => o.occupied).map(o => o.location.name).sort();
    expect(occupied).toEqual(['Mortuary Cooler 1 — Tray A', 'Mortuary Cooler 1 — Tray B']);
  });

  it('they reach the right worklists through the case service', async () => {
    const pete = await mockCaseService.listCasesForUser('PATH-001');
    const sarah = await mockCaseService.listCasesForUser('PATH-SJ-001');
    expect(pete.filter(c => c.autopsy).map(c => c.id).sort()).toEqual(['A26-4660', 'A26-4661', 'A26-4663']);
    expect(sarah.filter(c => c.autopsy).map(c => c.id)).toEqual(['A26-4662', 'A26-4664']);
    expect((await mockCaseService.getCase('A26-4661') as any)?.orchSections).toHaveLength(3);
  });
});

describe('Batch 456: Molecular workcenter queue', () => {
  const papIds = ['S26-4650-CYT-001', 'S26-4651-CYT-001', 'S26-4652-CYT-001'];

  it('every specimen is a baseline Pap with its HPV co-test pending', () => {
    for (const id of papIds) {
      expect(byId(id).specimens[0].cytologyScreening, id).toEqual(expect.objectContaining({ hpvCoTestOrdered: true, hpvResult: 'Pending' }));
    }
    const wellAccessions = MOLECULAR_DEMO_BATCHES.flatMap(b => b.wells.filter(w => w.sampleType === 'PATIENT_SPECIMEN').map(w => w.accessionNumber));
    const rackAccessions = MOLECULAR_DEMO_RACKS.flatMap(r => r.positions.map(p => p.accessionNumber).filter(Boolean));
    expect([...wellAccessions, ...rackAccessions].sort()).toEqual(papIds);
    for (const b of MOLECULAR_DEMO_BATCHES) for (const w of b.wells.filter(w => w.accessionNumber)) {
      expect(w.containerBarcode).toBe(MOLECULAR_DEMO_VIALS[w.accessionNumber as keyof typeof MOLECULAR_DEMO_VIALS]);
    }
  });

  it('the batches show on the Active tab: one running, one blocked for the technologist', async () => {
    const res = await mockMolecularBatchService.getAll();
    const all = res.ok ? res.data : [];
    expect(all.map(b => b.id)).toEqual(['mb-001', 'mb-demo-456-run', 'mb-demo-456-fail', 'mb-demo-467-egfr']); // Batch 467: the draft EGFR plate
    const run = all.find(b => b.id === 'mb-demo-456-run')!;
    const fail = all.find(b => b.id === 'mb-demo-456-fail')!;
    expect(run.status).toBe('active');
    expect(run.worklistDispatchedAt).toBeTruthy();
    expect(run.results).toBeUndefined();
    expect(fail.status).toBe('awaiting_results');
    expect(fail.reviewStatus).toBe(resolveMolecularRunValidationGating(false));
    expect(fail.results?.find(r => r.accession_number === 'S26-4651-CYT-001')?.flag).toBe('REPEAT_REQUIRED');
    for (const b of [run, fail]) expect(b.createdByUserId).toBe('MT-001');
  });

  it('each batch passes the same reagent-lot and control checks a new batch must', async () => {
    const rules = await mockMolecularAssayControlRuleService.getAll();
    for (const b of MOLECULAR_DEMO_BATCHES) {
      expect(resolveMolecularReagentLotGating(b.reagentLots, b.wells).allowed, b.id).toBe(true);
      expect(resolveMolecularControlRequirementValidation(b.assayCode, b.wells, rules.ok ? rules.data : []).satisfied, b.id).toBe(true);
    }
  });

  it('the rack holds S26-4652 awaiting extraction, not yet on an instrument', async () => {
    const res = await mockMolecularExtractionRackService.getAll();
    const row = rackWorklistRows(res.ok ? res.data : []).find(r => r.id === 'rack-demo-456')!;
    expect(row).toEqual(expect.objectContaining({ rackBarcode: 'RACK-MOLE-00456', occupied: 1, status: 'loading' }));
    expect(row.instrumentCode).toBeUndefined();
  });

  it('a browser that stored molecular batches before this batch gets the demo ones added', async () => {
    localStorage.setItem('pathscribe_mock_molecular_batches', JSON.stringify([{ id: 'mb-001', status: 'completed' }]));
    const res = await mockMolecularBatchService.getAll();
    const all = res.ok ? res.data : [];
    expect(all.map(b => b.id)).toEqual(['mb-001', 'mb-demo-456-run', 'mb-demo-456-fail', 'mb-demo-467-egfr']); // Batch 467: the draft EGFR plate
    expect(all[0].status).toBe('completed'); // what the browser had is kept
  });
});
