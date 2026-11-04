// src/services/organMapping/organMapActions.test.ts
// Batch 461: the protected organ-map actions — inserting the map into the
// report (report:organ-map:insert; a snapshot, stale when the answers change,
// locked at sign-out) and the two Configuration saves (colours by layer,
// question bindings), each checked, validated and audited.
import { describe, expect, it } from 'vitest';
import radical from '@/data/templates/generic/prostate_radical_prostatectomy.json';
import type { Case } from '@/types/case/Case';
import {
  figureForInstance, insertOrganMapFigure, organMapFigureOutcomeKey, organMapFigureState, organMapFiguresForVersion,
  organMapReportFigures, removeOrganMapFigure, type OrganMapFigure, type OrganMapFigureDeps,
} from './organMapFigures';
import { organMapSchemeFor, saveOrganMapBinding, saveOrganMapSchemeLayer, type OrganMapConfigDeps, type OrganMapConfigStore } from './organMapConfig';
import { pathScribeDefaultBinding } from './organMapBindings';
import { sha256Hex } from '../registrySubmission/sha256';

const user = { id: 'u1', name: 'Dr One' };

function figureDeps(initial: Partial<Case>, allowed = true) {
  let stored = { id: 'C1', version: 3, status: 'in-progress', accession: { fullAccession: 'S26-1' }, synopticReports: [{ instanceId: 'i1' }, { instanceId: 'i2' }], ...initial } as unknown as Case;
  const audits: { event: string; detail: string; caseId: string | null }[] = [];
  const checks: { capability: string; context: unknown }[] = [];
  const deps: OrganMapFigureDeps = {
    getCase: async () => stored,
    updateCase: async (_id, updates, expected) => { expect(expected).toBe(stored.version); stored = { ...stored, ...updates, version: (stored.version ?? 0) + 1 }; },
    enforce: async (capability, context) => { checks.push({ capability, context }); return { allowed }; },
    logAudit: e => { audits.push(e); },
    now: () => new Date('2026-10-05T10:00:00Z'),
    newId: () => 'abc',
  };
  return { deps, audits, checks, get stored() { return stored; } };
}

const figure = (over: Partial<OrganMapFigure> = {}): OrganMapFigure => ({
  id: 'f', instanceId: 'i1', mapType: 'prostateSectors', svg: '<svg width="660" height="380"></svg>', fingerprint: 'fp1',
  insertedAt: '', insertedBy: 'u1', insertedByName: 'Dr One', ...over,
});

describe('report figure state', () => {
  it('none → current → stale when the answers change → locked at sign-out', () => {
    expect(organMapFigureState(undefined, 'fp1', 'in-progress')).toBe('none');
    expect(organMapFigureState(figure(), 'fp1', 'in-progress')).toBe('current');
    expect(organMapFigureState(figure(), 'fp2', 'in-progress')).toBe('stale');
    for (const status of ['finalized', 'closed', 'pending-release', 'pending-countersign']) expect(organMapFigureState(figure(), 'fp2', status)).toBe('locked');
  });
});

describe('insert / remove the map', () => {
  it('stores a snapshot for the synoptic, replacing that synoptic’s earlier one, and audits', async () => {
    const env = figureDeps({ organMapFigures: [figure({ id: 'old' }), figure({ id: 'other', instanceId: 'i2' })] });
    const r = await insertOrganMapFigure({ caseData: env.stored, instanceId: 'i1', mapType: 'prostateSectors', svg: '<svg/>', pngDataUrl: 'data:image/png;base64,AAAA', fingerprint: 'fp9', user }, env.deps);
    expect(r.ok).toBe(true);
    expect(env.checks).toEqual([{ capability: 'report:organ-map:insert', context: { caseId: 'C1', facilityId: null } }]);
    expect(env.stored.organMapFigures!.map(f => f.id)).toEqual(['other', 'omf-abc']);
    expect(figureForInstance(env.stored, 'i1')).toMatchObject({ fingerprint: 'fp9', insertedBy: 'u1', insertedByName: 'Dr One', insertedAt: '2026-10-05T10:00:00.000Z', pngDataUrl: 'data:image/png;base64,AAAA' });
    expect(env.audits).toEqual([expect.objectContaining({ event: 'Organ map inserted into report', caseId: 'S26-1' })]);
    expect(r.ok && r.caseData.version).toBe(4);
    expect(organMapFigureOutcomeKey(r, 'insert')).toBe('organMap.panel.toast.inserted');

    const removed = await removeOrganMapFigure({ caseData: env.stored, instanceId: 'i1', user }, env.deps);
    expect(removed.ok).toBe(true);
    expect(env.stored.organMapFigures!.map(f => f.id)).toEqual(['other']);
    expect(env.audits[1].event).toBe('Organ map removed from report');
  });
  it('is refused without the capability, and once the report is signed out', async () => {
    const denied = figureDeps({}, false);
    const r1 = await insertOrganMapFigure({ caseData: denied.stored, instanceId: 'i1', mapType: 'prostateSectors', svg: '', fingerprint: 'x', user }, denied.deps);
    expect(r1).toEqual({ ok: false, reason: 'notPermitted' });
    expect(denied.stored.organMapFigures).toBeUndefined();
    expect(organMapFigureOutcomeKey(r1, 'insert')).toBe('organMap.panel.toast.notPermitted');

    const signed = figureDeps({ status: 'finalized' as never, organMapFigures: [figure()] });
    const r2 = await removeOrganMapFigure({ caseData: signed.stored, instanceId: 'i1', user }, signed.deps);
    expect(r2).toEqual({ ok: false, reason: 'locked' });
    expect(signed.stored.organMapFigures).toHaveLength(1);
    expect(signed.audits).toEqual([]);
  });
});

describe('figures in the report', () => {
  it('a report version keeps each figure with its SHA-256', () => {
    const c = { organMapFigures: [figure({ pngDataUrl: 'data:image/png;base64,QQ==' }), figure({ instanceId: 'i2' })] };
    const v = organMapFiguresForVersion(c, 'i1');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ svgSha256: sha256Hex(figure().svg), pngSha256: sha256Hex('data:image/png;base64,QQ==') });
    expect(organMapFiguresForVersion(c)).toHaveLength(2);
  });
  it('the PDF payload has the PNG without its prefix and the drawing’s size, in synoptic order', () => {
    const c = { synopticReports: [{ instanceId: 'i2' }, { instanceId: 'i1' }], organMapFigures: [figure({ pngDataUrl: 'data:image/png;base64,QQ==' }), figure({ instanceId: 'i2', svg: '<svg x="1" width="460" height="326"/>' })] } as never;
    expect(organMapReportFigures(c)).toEqual([
      { instanceId: 'i2', mapType: 'prostateSectors', svg: '<svg x="1" width="460" height="326"/>', width: 460, height: 326 },
      { instanceId: 'i1', mapType: 'prostateSectors', svg: figure().svg, pngBase64: 'QQ==', width: 660, height: 380 },
    ]);
    expect(organMapReportFigures(null)).toEqual([]);
  });
});

function configDeps(allowed: (cap: string) => boolean = () => true) {
  let layers = {}; let bindings = {};
  const store: OrganMapConfigStore = { getLayers: () => layers, setLayers: l => { layers = l; }, getBindings: () => bindings, setBindings: b => { bindings = b; } };
  const audits: { event: string; detail: string; facilityId?: string | null }[] = [];
  const checks: unknown[] = [];
  const deps: OrganMapConfigDeps = { enforce: async (c, ctx) => { checks.push([c, ctx]); return { allowed: allowed(c) }; }, logAudit: e => { audits.push(e); }, userName: 'Admin', store };
  return { deps, store, audits, checks };
}

describe('Configuration saves', () => {
  it('a facility layer: checked for that facility, stored, audited, and used by its maps', async () => {
    const env = configDeps();
    const r = await saveOrganMapSchemeLayer({ scope: { kind: 'facility', facilityId: 'F1' }, layer: { gg2: { colour: '#123456' } } }, env.deps);
    expect(r).toEqual({ ok: true });
    expect(env.checks).toEqual([['config:organ-map-scheme:manage', { facilityId: 'F1' }]]);
    expect(organMapSchemeFor(env.store, { facilityId: 'F1' }).scheme.gg2.colour).toBe('#123456');
    expect(organMapSchemeFor(env.store, { facilityId: 'F2' }).scheme.gg2.colour).not.toBe('#123456');
    expect(env.audits).toEqual([expect.objectContaining({ event: 'Organ map colours changed', facilityId: 'F1' })]);
    await saveOrganMapSchemeLayer({ scope: { kind: 'facility', facilityId: 'F1' }, layer: null }, env.deps);
    expect(env.store.getLayers()).toEqual({ facilities: {} });
  });
  it('refuses without permission, and an invalid layer, storing nothing', async () => {
    const env = configDeps(() => false);
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'enterprise' }, layer: { gg1: { colour: '#000000' } } }, env.deps)).toEqual({ ok: false, reason: 'notPermitted' });
    const env2 = configDeps();
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'jurisdiction', code: 'GB' }, layer: { gg1: { pattern: 'none' } } }, env2.deps)).toEqual({ ok: false, reason: 'invalid', problems: [{ key: 'gg1', problem: 'patternRequired' }] });
    expect(env.store.getLayers()).toEqual({});
    expect(env2.store.getLayers()).toEqual({});
  });
  it('Batch 465: a layer’s thresholds are validated with what it inherits (its jurisdiction’s included)', async () => {
    const env = configDeps();
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'jurisdiction', code: 'GB' }, layer: { thresholds: { oralInvolvedMarginMm: 3 } } }, env.deps)).toEqual({ ok: true });
    // The facility inherits involved 3 mm from GB: close at 2 mm is refused; without its jurisdiction, 1 mm is inherited and 2 mm is fine.
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'facility', facilityId: 'F1' }, layer: { thresholds: { oralCloseMarginMm: 2 } }, facilityJurisdiction: 'GB' }, env.deps))
      .toEqual({ ok: false, reason: 'invalid', problems: [{ key: 'oralCloseMarginMm', problem: 'closeBelowInvolved' }] });
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'facility', facilityId: 'F2' }, layer: { thresholds: { oralCloseMarginMm: 2 } } }, env.deps)).toEqual({ ok: true });
    // "=" set alone against an inherited 1 mm is refused too.
    expect(await saveOrganMapSchemeLayer({ scope: { kind: 'facility', facilityId: 'F3' }, layer: { thresholds: { polypInvolvedMarginOperator: 'eq' } } }, env.deps))
      .toEqual({ ok: false, reason: 'invalid', problems: [{ key: 'polypInvolvedMarginOperator', problem: 'equalsNeedsZero' }] });
  });
  it('a binding: checked, validated against the template, stored and audited; removing it goes back to PathScribe’s', async () => {
    const env = configDeps();
    const binding = pathScribeDefaultBinding(radical as never)!;
    expect(await saveOrganMapBinding({ template: radical as never, binding }, env.deps)).toEqual({ ok: true });
    expect(env.checks[0]).toEqual(['config:organ-map-bindings:manage', undefined]);
    expect(env.store.getBindings()).toEqual({ [radical.id]: binding });
    expect(await saveOrganMapBinding({ template: radical as never, binding: { mapType: 'prostateSectors' } }, env.deps)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await saveOrganMapBinding({ template: radical as never, binding: null }, env.deps)).toEqual({ ok: true });
    expect(env.store.getBindings()).toEqual({});
    expect(env.audits.map(a => a.event)).toEqual(['Organ map binding changed', 'Organ map binding changed']);
    const denied = configDeps(c => c !== 'config:organ-map-bindings:manage');
    expect(await saveOrganMapBinding({ template: radical as never, binding }, denied.deps)).toEqual({ ok: false, reason: 'notPermitted' });
  });
});
