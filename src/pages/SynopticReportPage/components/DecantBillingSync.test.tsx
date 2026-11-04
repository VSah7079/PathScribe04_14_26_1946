// @vitest-environment happy-dom
//
// Batch 452 (Pete, Oct 4 2026): integration test for decant ↔ billing sync.
// Renders the real MaterialTreePanel and BillingReviewPanel together, bound
// to the real case material store through useCaseMaterialStore, the way the
// report page binds them (useSpecimenBlockManagement). The "server" is the
// real atomic save (applyDecantChangeAtomic) over an in-memory case, with a
// gate so the test can look at the screen before a save lands, and a switch
// to make a save fail.
//
// A multi-level split: Pap specimen A → D1 (residual fluid) → D2 and D3 (cell
// blocks split from D1); stains go on D2 and D3. Billing shows each decant
// and its expected charges straight away, with IHC sequenced across the
// decants, without a tab switch or reload; a failed save rolls both panels
// back.
// ─────────────────────────────────────────────────────────────────────────────
import '@/i18n/config';
import React, { useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('@/services', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services')>()),
  stainTypeService: {
    getAll: async () => ({
      ok: true,
      data: [
        { id: 'type-he', name: 'H&E', category: 'Routine', active: true },
        { id: 'type-ttf1', name: 'TTF-1', category: 'IHC', active: true },
        { id: 'type-er', name: 'ER', category: 'IHC', active: true },
        { id: 'type-pr', name: 'PR', category: 'IHC', active: true },
      ],
    }),
  },
}));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ decide: () => ({ allowed: true }), can: () => true, loading: false }) }));

import BillingReviewPanel from './BillingReviewPanel';
import MaterialTreePanel from './MaterialTreePanel';
import { useCaseMaterialStore } from '../hooks/useCaseMaterialStore';
import { applyDecantChangeAtomic } from '@/services/material/caseMaterialService';
import { nextDecantLabel, type DecantChange } from '@/services/material/materialTree';
import type { CaseMaterialStore } from '@/services/material/caseMaterialStore';

afterEach(() => cleanup());

const PAP = { id: 'sp-a', label: 'A', description: 'Cervical Pap', coding: { cpt: ['88142'] }, blocks: [], decants: [] };

/** An in-memory case behind the real atomic save. */
function makeServer() {
  const db = { id: 'CASE-452', version: 4, specimens: [PAP] as any[] };
  let gate: Promise<void> = Promise.resolve();
  let failNext = false;
  const save = vi.fn(async (caseId: string, change: DecantChange, expectedVersion: number) => {
    await gate;
    if (failNext) { failNext = false; return { ok: false as const, error: 'saveFailed' as const }; }
    return applyDecantChangeAtomic(caseId, change, expectedVersion, {
      getCase: async () => ({ ...db }),
      updateCase: async (_id, patch, v) => { if (v !== db.version) throw Object.assign(new Error('conflict'), { actualVersion: db.version }); db.specimens = (patch as any).specimens; db.version++; },
      getStainTypes: async () => [
        { id: 'type-ttf1', name: 'TTF-1', category: 'IHC', active: true },
        { id: 'type-er', name: 'ER', category: 'IHC', active: true },
        { id: 'type-pr', name: 'PR', category: 'IHC', active: true },
      ] as any,
      enforce: async () => ({ allowed: true }),
      now: () => new Date('2026-10-04T12:00:00Z'),
    });
  });
  return {
    db, save,
    hold() { let release!: () => void; gate = new Promise<void>(r => { release = r; }); return () => release(); },
    failNextSave() { failNext = true; },
  };
}

const noop = () => {};
const materialProps = {
  onOpenBlockEditor: noop, onOpenMatrixBlockEditor: noop, onAddSpecimen: noop, onAddBlock: noop, onUpdateBlock: noop,
  onReleaseGrossingBlocks: noop, onConfirmTriageChecklistItem: noop, onOverrideTriage: noop, onRemovePendingBlock: noop,
  onAssignBaseCode: noop, onCreateBiopsyArray: noop, onEditBiopsyArray: noop, onReprintAllSlides: noop,
} as any;
const billingProps = {
  onApprove: noop, onOverride: noop, onRejectOnly: noop, onDelete: noop, onDeleteBaseCode: noop,
  onAddBaseCode: noop, onApproveAll: noop, onHighlight: noop,
} as any;

/** The two panels bound to the case's material store, as on the report page. */
const Workspace: React.FC<{ server: ReturnType<typeof makeServer>; storeOut: { current: CaseMaterialStore | null } }> = ({ server, storeOut }) => {
  const [caseData, setCaseData] = useState<Case | null>({ id: 'CASE-452', status: 'in-progress', accession: { fullAccession: 'C26-452' }, specimens: [PAP] } as unknown as Case);
  const knownVersionRef = useRef(4);
  const store = useCaseMaterialStore(caseData, setCaseData as any, knownVersionRef, server.save);
  storeOut.current = store;
  let n = 0;
  const addDecant = (specimenId: string, decantType: 'residual_fluid' | 'cell_block', parentDecantId?: string) => {
    const sp = store!.getState().specimens.find((s: any) => s.id === specimenId);
    const label = nextDecantLabel(sp.decants);
    void store!.dispatch({ kind: 'add', specimenId, decant: { id: `dc-${label}-${n++}`, label, decantType, ...(parentDecantId ? { parentDecantId } : {}), stains: [], createdAt: 't' } as any });
  };
  return (
    <>
      <div data-testid="material"><MaterialTreePanel caseData={caseData} isOrchestrationMode {...materialProps} onAddDecant={addDecant} onDeleteDecant={(id: string) => void store!.dispatch({ kind: 'delete', decantId: id })} /></div>
      <div data-testid="billing"><BillingReviewPanel specimens={(caseData?.specimens as any) ?? []} caseId="CASE-452" {...billingProps} /></div>
    </>
  );
};

const billingRows = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-testid="billing"] .ps-billing-tree-block-row')) as HTMLElement[];
const rowFor = (c: HTMLElement, label: string) => billingRows(c).find(r => r.querySelector('.ps-billing-tree-block-name')?.textContent?.startsWith(label));
const pendingOf = (row: HTMLElement | undefined) => Number(row?.querySelector('.ps-billing-tree-count-badge--pending')?.textContent ?? 0);
const decantIdByLabel = (store: CaseMaterialStore, label: string) => store.getState().specimens[0].decants.find((d: any) => d.label === label).id;
const notice = (c: HTMLElement) => c.querySelector('[data-testid="billing"] .ps-billing-material-notice')?.textContent ?? '';

describe('decant ↔ billing sync (Batch 452)', () => {
  it('a multi-level split shows in billing at once, with charges recalculated, before any save lands', async () => {
    const server = makeServer();
    const storeOut = { current: null as CaseMaterialStore | null };
    const { container } = render(<Workspace server={server} storeOut={storeOut} />);
    await waitFor(() => expect(container.querySelector('.ps-material-tree-add-decant-link')).not.toBeNull());

    // Hold every save: what follows is the optimistic state only.
    const release = server.hold();

    // Level 1: residual fluid D1, from the "+ Add decant" menu.
    fireEvent.click(container.querySelector('.ps-material-tree-add-decant-link')!);
    fireEvent.click(container.querySelectorAll('.ps-decant-add-menu-item')[0]);
    expect(rowFor(container, 'AD1')).toBeDefined();
    expect(notice(container)).toMatch(/decant was added/i);

    // Level 2: two cell blocks split from D1.
    const cellBlockFromD1 = () => Array.from(container.querySelectorAll('.ps-material-tree-decant-action')).find(b => /D1/.test(b.textContent ?? '')) as HTMLElement;
    fireEvent.click(cellBlockFromD1());
    fireEvent.click(cellBlockFromD1());
    expect(billingRows(container).map(r => r.querySelector('.ps-billing-tree-block-name')!.textContent)).toEqual(['AD1', 'AD2', 'AD3']);
    const store = storeOut.current!;
    expect(store.getState().specimens[0].decants.map((d: any) => [d.label, d.parentDecantId ? store.getState().specimens[0].decants.find((p: any) => p.id === d.parentDecantId).label : null]))
      .toEqual([['D1', null], ['D2', 'D1'], ['D3', 'D1']]);

    // Stains on the split cell blocks: billing recalculates synchronously,
    // IHC sequenced across decants (D2 TTF-1 first, D3 ER + PR additional).
    await waitFor(() => expect(container.querySelector('[data-testid="billing"]')).not.toBeNull());
    act(() => { void store.dispatch({ kind: 'update', decantId: decantIdByLabel(store, 'D2'), patch: { stains: [{ id: 'st-ttf1', stainName: 'TTF-1' }] as any } }); });
    act(() => { void store.dispatch({ kind: 'update', decantId: decantIdByLabel(store, 'D3'), patch: { stains: [{ id: 'st-er', stainName: 'ER' }, { id: 'st-pr', stainName: 'PR' }] as any } }); });
    await waitFor(() => expect(pendingOf(rowFor(container, 'AD2'))).toBe(1));
    expect(pendingOf(rowFor(container, 'AD3'))).toBe(2);
    expect(rowFor(container, 'AD3')!.getAttribute('title')).toBe('AD3 (ER, PR)');
    expect(server.db.version).toBe(4); // nothing saved yet: all of this was on screen first
    expect(store.getState().pending).toBe(5);

    // Let the saves land: the server ends with the same tree, five versions on.
    await act(async () => { release(); await new Promise(r => setTimeout(r, 0)); });
    await waitFor(() => expect(store.getState().pending).toBe(0));
    expect(server.db.version).toBe(9);
    expect(server.db.specimens[0].decants.map((d: any) => d.label)).toEqual(['D1', 'D2', 'D3']);
    expect(server.save.mock.calls.map(c => c[2])).toEqual([4, 5, 6, 7, 8]);
    expect(pendingOf(rowFor(container, 'AD3'))).toBe(2);
  });

  it('a failed save rolls back the Material tab and billing together', async () => {
    const server = makeServer();
    const storeOut = { current: null as CaseMaterialStore | null };
    const { container } = render(<Workspace server={server} storeOut={storeOut} />);
    await waitFor(() => expect(storeOut.current).not.toBeNull());
    const store = storeOut.current!;
    await act(async () => { await store.dispatch({ kind: 'add', specimenId: 'sp-a', decant: { id: 'dc-1', label: 'D1', decantType: 'cell_block', stains: [{ id: 'st-er', stainName: 'ER' }], createdAt: 't' } as any }); });
    await waitFor(() => expect(pendingOf(rowFor(container, 'AD1'))).toBe(1));

    // Remove D1, but the save fails.
    const release = server.hold();
    server.failNextSave();
    let outcome: any;
    act(() => { void store.dispatch({ kind: 'delete', decantId: 'dc-1' }).then(o => { outcome = o; }); });
    expect(rowFor(container, 'AD1')).toBeUndefined();                     // gone at once, optimistically
    expect(container.querySelectorAll('[data-testid="material"] .ps-material-tree-decant')).toHaveLength(0);
    await act(async () => { release(); await new Promise(r => setTimeout(r, 0)); });
    await waitFor(() => expect(outcome).toMatchObject({ ok: false, rolledBack: true }));
    await waitFor(() => expect(pendingOf(rowFor(container, 'AD1'))).toBe(1)); // back, with its charge
    expect(container.querySelectorAll('[data-testid="material"] .ps-material-tree-decant')).toHaveLength(1);
    expect(store.getState().specimens[0].decants.map((d: any) => d.id)).toEqual(['dc-1']);
    expect(notice(container)).toMatch(/could not be saved and was undone/i);
    expect(server.db.specimens[0].decants.map((d: any) => d.id)).toEqual(['dc-1']);
  });

  it('a newly added decant has its billing row selected', async () => {
    const server = makeServer();
    const storeOut = { current: null as CaseMaterialStore | null };
    const { container } = render(<Workspace server={server} storeOut={storeOut} />);
    await waitFor(() => expect(storeOut.current).not.toBeNull());
    await act(async () => { await storeOut.current!.dispatch({ kind: 'add', specimenId: 'sp-a', decant: { id: 'dc-9', label: 'D1', decantType: 'cell_block', stains: [], createdAt: 't' } as any }); });
    await waitFor(() => expect(rowFor(container, 'AD1')!.classList.contains('ps-billing-tree-row--selected')).toBe(true));
  });
});
