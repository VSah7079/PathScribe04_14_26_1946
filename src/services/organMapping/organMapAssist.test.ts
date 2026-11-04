// src/services/organMapping/organMapAssist.test.ts
// Batch 751 (Pete, Oct 31, 2026, spec section 12.2): on an Assist case the primary LIS writes the report, so the map
// is a working aid only: no insert or remove, no figure in a report version or preview (Mohs included), and a map
// never holds up finalising.
import { describe, expect, it, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { mockCaseService } from '../cases/mockCaseService';
import {
  insertOrganMapFigure, lisOwnsReport, organMapFiguresForVersion, organMapReportFigures, organMapReportState, removeOrganMapFigure,
  type OrganMapFigure, type OrganMapFigureDeps,
} from './organMapFigures';
import { autoOrganMapFigures, reportFiguresWithAuto } from './organMapAutoFigures';
import { findStaleOrganMapFigures } from './organMapLive';

const figure: OrganMapFigure = {
  id: 'omf-1', instanceId: 'i1', mapType: 'prostateSectors', svg: '<svg width="10" height="10"/>', pngDataUrl: 'data:image/png;base64,AAAA',
  fingerprint: 'old', insertedAt: '2026-10-31T10:00:00Z', insertedBy: 'u', insertedByName: 'U',
};
const user = { id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson' };
const t = ((k: string) => k) as never;

function deps(c: Case): OrganMapFigureDeps & { enforce: ReturnType<typeof vi.fn>; updateCase: ReturnType<typeof vi.fn> } {
  return {
    getCase: vi.fn().mockResolvedValue(c), updateCase: vi.fn().mockResolvedValue(undefined),
    enforce: vi.fn().mockResolvedValue({ allowed: true }), logAudit: vi.fn(), now: () => new Date('2026-10-31T12:00:00Z'), newId: () => 'n1',
  } as never;
}

describe('organ map on an Assist case (Batch 751)', () => {
  const assist = { id: 'S26-4631', status: 'in-progress', reportingMode: 'assist', version: 1, organMapFigures: [figure], synopticReports: [{ instanceId: 'i1', templateId: 't' }] } as unknown as Case;
  const orchestrator = { ...assist, id: 'S26-9999', reportingMode: 'orchestrator', organMapFigures: [] } as unknown as Case;

  it('the laboratory system owns the report only on an Assist case', () => {
    expect(lisOwnsReport(assist)).toBe(true);
    expect(lisOwnsReport(orchestrator)).toBe(false);
    expect(lisOwnsReport({})).toBe(false);
  });

  it('the panel offers no insert: the state says the laboratory system writes the report, Mohs included', () => {
    expect(organMapReportState('prostateSectors', undefined, 'fp', 'in-progress', true, true)).toBe('lisOwnsReport');
    expect(organMapReportState('mohsStages', undefined, 'fp', 'in-progress', true, true)).toBe('lisOwnsReport');
    expect(organMapReportState('prostateSectors', figure, 'new', 'in-progress', true, true)).toBe('lisOwnsReport');
    expect(organMapReportState('prostateSectors', figure, 'new', 'in-progress', true, false)).toBe('stale');
  });

  it('insert and remove are refused before any write or permission check', async () => {
    const d = deps(assist);
    const ins = await insertOrganMapFigure({ caseData: assist, instanceId: 'i1', mapType: 'prostateSectors', svg: '<svg/>', pngDataUrl: 'data:image/png;base64,A', fingerprint: 'fp', user }, d);
    expect(ins).toEqual({ ok: false, reason: 'lisOwnsReport' });
    expect(await removeOrganMapFigure({ caseData: assist, instanceId: 'i1', user }, d)).toEqual({ ok: false, reason: 'lisOwnsReport' });
    expect(d.enforce).not.toHaveBeenCalled();
    expect(d.updateCase).not.toHaveBeenCalled();
  });

  it('a case that became Assist while the page was open is refused at the write', async () => {
    const d = deps(assist);
    const r = await insertOrganMapFigure({ caseData: orchestrator, instanceId: 'i1', mapType: 'prostateSectors', svg: '<svg/>', pngDataUrl: 'data:image/png;base64,A', fingerprint: 'fp', user }, d);
    expect(r).toEqual({ ok: false, reason: 'lisOwnsReport' });
    expect(d.updateCase).not.toHaveBeenCalled();
  });

  it('no figure reaches a report version or the report preview, even one stored before', async () => {
    expect(organMapFiguresForVersion(assist)).toEqual([]);
    expect(organMapReportFigures(assist)).toEqual([]);
    expect(await reportFiguresWithAuto(assist, t)).toEqual([]);
    expect(organMapFiguresForVersion({ ...assist, reportingMode: 'orchestrator' } as Case)).toHaveLength(1);
  });

  it('a Mohs map is not drawn into an Assist report, and a map never holds up finalising', async () => {
    const mohs = (await mockCaseService.getCase('S26-4463'))!;
    expect((await autoOrganMapFigures(mohs, t)).length).toBeGreaterThan(0);
    expect(await autoOrganMapFigures({ ...mohs, reportingMode: 'assist' }, t)).toEqual([]);
    expect(await findStaleOrganMapFigures(assist)).toEqual([]);
  });
});

describe('seed row S15: the Assist case with a map (Batch 751)', () => {
  it('S26-5405 is an Assist case whose complete colon checklist draws the rectal map, with nothing to fix before finalising', async () => {
    const { loadOrganMapContext, findDerivedMarginConflicts } = await import('./organMapLive');
    const { resolveOrganMap } = await import('./resolveProstateMap');
    const { partGridRowsOf } = await import('../templates/partGrid');
    const c = (await mockCaseService.getCase('S26-5405'))!;
    expect(c.reportingMode).toBe('assist');
    const instance = c.synopticReports![0];
    const context = await loadOrganMapContext({ templateId: instance.templateId, facilityId: c.order?.facilityId ?? null });
    expect(context.binding?.mapType).toBe('rectalResection');
    const payload = resolveOrganMap({
      binding: context.binding!, answers: instance.answers as Record<string, string | string[]>, scheme: context.scheme.scheme,
      thresholds: context.scheme.thresholds, templateId: instance.templateId, instanceId: instance.instanceId, rows: partGridRowsOf(c.specimens),
    });
    expect(payload.hasData).toBe(true);
    expect(await findDerivedMarginConflicts(c)).toEqual([]);
    expect(await findStaleOrganMapFigures(c)).toEqual([]);
  });

  it('the Video 9 cases where the map goes into the report are Orchestrator cases; the Manchester prostatectomy stays as it was', async () => {
    for (const id of ['S26-4404', 'S26-4463', 'S26-5407']) expect((await mockCaseService.getCase(id))?.reportingMode).toBe('orchestrator');
    expect((await mockCaseService.getCase('MFT26-8804-PR-RP'))?.reportingMode).toBe('assist');
  });

  it('S26-5407 (Dr. Sarah Johnson) starts with a current map image in its report, the same map as MFT26-8804-PR-RP', async () => {
    const c = (await mockCaseService.getCase('S26-5407'))!;
    expect(c.order?.assignedTo).toBe('PATH-SJ-001');
    expect(c.organMapFigures).toHaveLength(1);
    expect(c.organMapFigures![0].pngDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(c.organMapFigures![0].instanceId).toBe(c.synopticReports![0].instanceId);
    expect(await findStaleOrganMapFigures(c)).toEqual([]);
    const mft = (await mockCaseService.getCase('MFT26-8804-PR-RP'))!;
    // Batch 753: S26-5407 also has the rest of its checklist answered; its map answers are MFT26-8804's.
    const mapAnswers = (a: Record<string, unknown> | undefined) => Object.fromEntries(Object.entries(a ?? {}).filter(([k]) => k.startsWith('psmap_')));
    expect(mapAnswers(c.synopticReports![0].answers)).toEqual(mapAnswers(mft.synopticReports![0].answers));
    expect(c.synopticReports![0].answers).toMatchObject({ grade_group: 'grade_group_opt_3', margin_status: 'margin_status_opt_2', t_category: 't_category_opt_2' });
  });
});

describe('seed row S15: the Video 9 maps as the demo guide describes them (Batch 751)', () => {
  async function mapOf(id: string) {
    const { loadOrganMapContext } = await import('./organMapLive');
    const { resolveOrganMap } = await import('./resolveProstateMap');
    const { partGridRowsOf } = await import('../templates/partGrid');
    const c = (await mockCaseService.getCase(id))!;
    const inst = c.synopticReports![0];
    const ctx = await loadOrganMapContext({ templateId: inst.templateId, facilityId: c.order?.facilityId ?? null });
    const p = resolveOrganMap({ binding: ctx.binding!, answers: inst.answers as Record<string, string | string[]>, scheme: ctx.scheme.scheme, thresholds: ctx.scheme.thresholds, templateId: inst.templateId, instanceId: inst.instanceId, rows: partGridRowsOf(c.specimens) });
    return Object.fromEntries(p.sectors.map(s => [s.id, { category: s.category, overlays: s.overlays.map(o => o.key) }]));
  }
  it('S26-4404: the right-side cores Grade Group 2, the left benign', async () => {
    const m = await mapOf('S26-4404');
    for (const s of ['r_base_lat', 'r_mid_lat', 'r_apex_lat']) expect(m[s].category).toBe('gg2');
    for (const s of ['l_base_lat', 'l_mid_lat', 'l_apex_lat']) expect(m[s].category).toBe('benign');
  });
  it('MFT26-8804-PR-RP: high grade in the right peripheral zone, with extension outside the prostate and a positive margin', async () => {
    const m = await mapOf('MFT26-8804-PR-RP');
    expect(m.r_mid_pzpl).toEqual({ category: 'ggHigh', overlays: ['epe', 'positiveMargin'] });
    expect(m.l_mid_pza.category).toBe('benign');
  });
  it('S26-4463: stage 1 residual tumour at 12 and 1 o’clock and the deep margin, stage 2 clear', async () => {
    const m = await mapOf('S26-4463');
    for (const s of ['s1_c12', 's1_c1', 's1_deep']) expect(m[s].category).toBe('residualTumour');
    expect(Object.entries(m).filter(([k]) => k.startsWith('s2_')).every(([, v]) => v.category === 'marginClear')).toBe(true);
  });
});
