// @vitest-environment jsdom
// Batch 747 (Pete's seed row S8, Video 6): after a reset each Desert Valley department view has eight to fifteen items,
// with a STAT item, and the times give near-target and overdue states; the profiles are there for each view.
import { beforeAll, describe, expect, it } from 'vitest';
import { computeGrossingIntakeSummary } from './computeGrossingIntakeSummary';
import { computeEmbeddingMicrotomySummary } from './computeEmbeddingMicrotomySummary';
import { computeStainingIhcSummary } from './computeStainingIhcSummary';
import { computeSendOutReferenceSummary } from './computeSendOutReferenceSummary';
import { computeDiagnosticSignOutSummary } from './computeDiagnosticSignOutSummary';
import { mockDisplayProfileService, DEMO_DISPLAY_PROFILE_IDS } from './mockDisplayProfileService';
import { WALL_VOLUME_CASE_SPECS } from '../cases/demoWallVolumeCases';
import { DEMO_SURGICAL_PATIENTS } from '../patients/demoSurgicalPatients';

const DVMC = 'c-ent-dvmc';
beforeAll(() => localStorage.clear()); // once: the batch service adds its demo batches on its first read

describe('S8 wall display volume at Desert Valley', () => {
  it('every department view has eight to fifteen queue items and a STAT item (the scanner view: a failed scan)', async () => {
    const views = {
      grossing: await computeGrossingIntakeSummary(DVMC),
      embedding: await computeEmbeddingMicrotomySummary(DVMC),
      staining: await computeStainingIhcSummary(DVMC),
      sendOut: await computeSendOutReferenceSummary(DVMC),
      signOut: await computeDiagnosticSignOutSummary(DVMC),
    };
    for (const [name, v] of Object.entries(views)) {
      expect(v.queue.length, name).toBeGreaterThanOrEqual(8);
      expect(v.queue.length, name).toBeLessThanOrEqual(30); // the embedding view adds the open add-on orders
      if (name !== 'signOut') expect(v.queue.some(q => q.isStat), name).toBe(true);
    }
    expect(views.grossing.queue.map(q => q.slaState)).toEqual(expect.arrayContaining(['overdue', 'warning', 'normal']));
    expect(views.sendOut.alerts.some(a => a.kind === 'Cold-Chain Excursion')).toBe(true);
    expect(views.staining.alerts.some(a => a.kind === 'Run Failed')).toBe(true);
    expect(views.signOut.alerts.map(a => a.kind)).toEqual(expect.arrayContaining(['Scan Failed', 'Scan QC Failed']));
  });

  it('the second facility shows only its own, quieter lab', async () => {
    const [g, e, s] = [await computeGrossingIntakeSummary('c-ent-mpa'), await computeEmbeddingMicrotomySummary('c-ent-mpa'), await computeStainingIhcSummary('c-ent-mpa')];
    expect([g, e, s].map(v => v.queue.filter(q => String(q.label).includes('WALL-MPA')).length)).toEqual([1, 2, 2]);
    const dvmc = await computeStainingIhcSummary(DVMC);
    expect(dvmc.queue.some(q => String(q.label).includes('WALL-MPA'))).toBe(false);
  });

  it('a single-view profile per department, a rotating five-view profile, a spare and a retired one, at Desert Valley', async () => {
    const res = await mockDisplayProfileService.getAll();
    const all = res.ok ? res.data : [];
    const byId = (id: string) => all.find(p => p.id === id)!;
    expect(byId(DEMO_DISPLAY_PROFILE_IDS.rotating).assignedViews).toHaveLength(5);
    for (const id of [DEMO_DISPLAY_PROFILE_IDS.grossing, DEMO_DISPLAY_PROFILE_IDS.embedding, DEMO_DISPLAY_PROFILE_IDS.staining, DEMO_DISPLAY_PROFILE_IDS.sendOut, DEMO_DISPLAY_PROFILE_IDS.signOut]) {
      expect(byId(id).assignedViews, id).toHaveLength(1);
    }
    expect(new Set(Object.values(DEMO_DISPLAY_PROFILE_IDS).map(id => byId(id).facilityId))).toEqual(new Set([DVMC, 'c-ent-mpa']));
  });

  it('the wall-volume patients are in the patient index', () => {
    for (const s of WALL_VOLUME_CASE_SPECS) expect(DEMO_SURGICAL_PATIENTS.find(p => p.id === s.patient.id)?.mrn, s.id).toBe(s.patient.mrn);
  });
});
