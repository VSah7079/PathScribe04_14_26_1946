// Batch 740 (Pete, fluid decision 1): which bench takes what, and the cell block hand-off scans.
import { describe, it, expect, vi } from 'vitest';
import { benchTakesBlock, benchTakesDecant, checkHandoffScans, handOffCellBlock, newCellBlockFrom } from './cellBlockHandoff';
import type { Decant } from '@/types/case/Material';

const fluid = { id: 'd1', label: 'D1', decantType: 'residual_fluid', displayId: 'S26-9-A-D1', stains: [] } as unknown as Decant;
const aliquot = { id: 'd3', label: 'D3', decantType: 'aliquot', aliquotPurpose: 'flow_cytometry', displayId: 'S26-9-A-D3', stains: [] } as unknown as Decant;
const cb = { id: 'd2', label: 'D2', decantType: 'cell_block', parentDecantId: 'd1', displayId: 'S26-9-A-D2', stains: [] } as unknown as Decant;
const planned = { id: 'd4', label: 'D4', decantType: 'cell_block', displayId: 'S26-9-A-D4', stains: [] } as unknown as Decant;

describe('which bench takes what (Batch 740)', () => {
  it('the Microtome cuts blocks and handed-off cell blocks; fluids and aliquots go to Cytology Preparation', () => {
    expect([benchTakesBlock('microtome'), benchTakesBlock('cytologyPrep')]).toEqual([null, 'cutAtMicrotome']);
    expect(benchTakesDecant('microtome', fluid)).toBe('prepareAtCytology');
    expect(benchTakesDecant('microtome', aliquot)).toBe('prepareAtCytology');
    expect(benchTakesDecant('microtome', cb)).toBe('notHandedOff');
    expect(benchTakesDecant('microtome', { ...cb, handoff: { at: 'x', byId: 'u', byName: 'U', sourceItemId: 'S26-9-A-D1' } })).toBeNull();
    expect([fluid, aliquot, cb].map(d => benchTakesDecant('cytologyPrep', d))).toEqual([null, null, null]);
  });
});

describe('the hand-off scans (Batch 740)', () => {
  const all = [fluid, cb, aliquot, planned];
  it('needs the cell block’s own source, then its own cassette', () => {
    expect(checkHandoffScans(cb, all, { source: 's26-9-a-d1', cassette: 'S26-9-A-D2' })).toMatchObject({ ok: true, source: { id: 'd1' } });
    expect(checkHandoffScans(cb, all, { source: 'S26-9-A-D3', cassette: 'S26-9-A-D2' })).toEqual({ ok: false, problem: 'sourceMismatch' });
    expect(checkHandoffScans(cb, all, { source: 'S26-9-A-D1', cassette: 'S26-9-A-D4' })).toEqual({ ok: false, problem: 'cassetteMismatch' });
    expect(checkHandoffScans(fluid, all, { source: 'x', cassette: 'y' })).toEqual({ ok: false, problem: 'notCellBlock' });
  });
  it('a cell block planned at Accession (no parent) takes any fluid or aliquot of the specimen as its source, never another cell block', () => {
    expect(checkHandoffScans(planned, all, { source: 'S26-9-A-D3', cassette: 'S26-9-A-D4' }).ok).toBe(true);
    expect(checkHandoffScans(planned, all, { source: 'S26-9-A-D2', cassette: 'S26-9-A-D4' })).toEqual({ ok: false, problem: 'sourceMismatch' });
  });
  it('checks the permission, saves the hand-off and audits it; refuses a second hand-off', async () => {
    const saveHandoff = vi.fn(async () => ({ ok: true as const }));
    const audit = vi.fn();
    const deps = { enforce: vi.fn(async () => ({ allowed: true })), saveHandoff, audit, now: () => new Date('2026-10-30T12:00:00Z') };
    const input = { caseId: 'c', accession: 'S26-9', cellBlock: cb, specimenDecants: all, scans: { source: 'S26-9-A-D1', cassette: 'S26-9-A-D2' }, actor: { id: 'u1', name: 'Priya Desai' }, stationId: 'station-cytoprep-1' };
    const r = await handOffCellBlock(input, deps);
    expect(r).toEqual({ ok: true, handoff: { at: '2026-10-30T12:00:00.000Z', byId: 'u1', byName: 'Priya Desai', sourceItemId: 'S26-9-A-D1', stationId: 'station-cytoprep-1' } });
    expect(deps.enforce).toHaveBeenCalledWith('cytology:cell-block:hand-off', { caseId: 'c' });
    expect(audit.mock.calls[0][0]).toMatchObject({ event: 'Cell Block Handed Off To Histology', caseId: 'S26-9' });
    expect(await handOffCellBlock({ ...input, cellBlock: { ...cb, handoff: r.ok ? r.handoff : undefined } }, deps)).toEqual({ ok: false, problem: 'alreadyHandedOff' });
    expect(await handOffCellBlock(input, { ...deps, enforce: async () => ({ allowed: false }) })).toEqual({ ok: false, problem: 'notPermitted' });
  });
  it('a new cell block is the fluid’s child, labelled and with an H&E waiting', () => {
    const made = newCellBlockFrom(fluid, { id: 'sp', label: 'A' }, 'S26-9', { stamp: '1', createdBy: 'Priya', now: 'n', label: 'D5' });
    expect([made.decantType, made.parentDecantId, made.displayId, made.stains[0].stainName, made.stains[0].status, made.handoff]).toEqual(['cell_block', 'd1', 'S26-9-AD5', 'H&E', 'Pending Cut', undefined]);
  });
});
