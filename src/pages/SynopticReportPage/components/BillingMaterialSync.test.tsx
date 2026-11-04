// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/components/BillingMaterialSync.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-316): the AI Billing Code Review panel and the Material tab
// stay in step. Renders the real BillingReviewPanel and MaterialTreePanel,
// each on its own and then side by side, wired the way SynopticReportPage
// wires them (Material click → resolveMaterialAssetClick →
// materialSelectedBlockId; billing selection → onHighlightStain →
// highlightedStainId). The decisions are tested in
// services/billing/billingMaterialSync.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
import '@/i18n/config';
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('@/services', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services')>()),
  stainTypeService: {
    getAll: async () => ({
      ok: true,
      data: [
        { id: 'type-he', name: 'H&E', category: 'Routine', active: true },
        { id: 'type-ki67', name: 'Ki-67', category: 'IHC', active: true },
        { id: 'type-mlh1', name: 'MLH1', category: 'IHC', active: true },
      ],
    }),
  },
}));

import BillingReviewPanel from './BillingReviewPanel';
import MaterialTreePanel from './MaterialTreePanel';
import { resolveMaterialAssetClick } from '@/services/billing/billingMaterialSync';

afterEach(() => cleanup());

const stain = (id: string, stainName: string) => ({ id, stainName, status: 'Ready for Review' });
const specimens = [
  {
    id: 'sp-a', label: 'A', description: 'Colon, right, resection', coding: { cpt: ['88309'] },
    blocks: [
      { id: 'blk-a1', label: '1', status: 'Embedded', stains: [stain('st-a1-he', 'H&E'), stain('st-ki67', 'Ki-67')] },
      { id: 'blk-a2', label: '2', status: 'Embedded', stains: [stain('st-a2-he', 'H&E'), stain('st-mlh1', 'MLH1')] },
    ],
  },
  {
    id: 'sp-b', label: 'B', description: 'Lymph node', coding: { cpt: ['88305'] },
    blocks: [{ id: 'blk-b1', label: '1', status: 'Embedded', stains: [stain('st-b1-he', 'H&E')] }],
  },
];
const caseData = { id: 'CASE-316', status: 'in-progress', accession: { fullAccession: 'S26-316' }, specimens } as unknown as Case;

const billingHandlers = () => ({
  onApprove: vi.fn(), onOverride: vi.fn(), onRejectOnly: vi.fn(), onDelete: vi.fn(), onDeleteBaseCode: vi.fn(),
  onAddBaseCode: vi.fn(), onApproveAll: vi.fn(), onHighlight: vi.fn(),
});
const materialHandlers = () => ({
  onOpenMatrixBlockEditor: vi.fn(), onAddSpecimen: vi.fn(), onAddBlock: vi.fn(), onUpdateBlock: vi.fn(),
  onReleaseGrossingBlocks: vi.fn(), onConfirmTriageChecklistItem: vi.fn(), onOverrideTriage: vi.fn(),
  onRemovePendingBlock: vi.fn(), onAddDecant: vi.fn(), onAssignBaseCode: vi.fn(), onCreateBiopsyArray: vi.fn(),
  onEditBiopsyArray: vi.fn(), onReprintAllSlides: vi.fn(),
});

/** The billing panel's block rows, keyed by the row's label (specimen label + block label). */
const blockRow = (container: HTMLElement, label: string) => {
  const row = Array.from(container.querySelectorAll('.ps-billing-tree-block-row'))
    .find(r => r.querySelector('.ps-billing-tree-block-name')?.textContent?.startsWith(label));
  if (!row) throw new Error(`no billing row ${label}`);
  return row as HTMLElement;
};
const isSelected = (row: HTMLElement) => row.classList.contains('ps-billing-tree-row--selected');
/** The Material tab's slide chips, keyed by stain name, within one block (in tree order). */
const slideChips = (container: HTMLElement) => Array.from(container.querySelectorAll('.ps-material-tree-slide-chip')) as HTMLElement[];
const isHighlighted = (chip: HTMLElement) => !!chip.querySelector('.ps-material-tree-slide-chip__body--highlighted');

describe('PS-316 Material tab selection selects the matching row in the AI Billing Code Review panel', () => {
  it('a block selected on the Material tab selects and highlights that block\'s row (and only that row)', async () => {
    const handlers = billingHandlers();
    const { container, rerender } = render(<BillingReviewPanel specimens={specimens} {...handlers} />);
    // Opens on the first block with something pending (A1, its Ki-67 suggestion).
    await waitFor(() => expect(isSelected(blockRow(container, 'A1'))).toBe(true));

    rerender(<BillingReviewPanel specimens={specimens} {...handlers} materialSelectedBlockId="blk-a2" />);
    await waitFor(() => expect(isSelected(blockRow(container, 'A2'))).toBe(true));
    expect(isSelected(blockRow(container, 'A1'))).toBe(false);

    rerender(<BillingReviewPanel specimens={specimens} {...handlers} materialSelectedBlockId="blk-b1" />);
    await waitFor(() => expect(isSelected(blockRow(container, 'B1'))).toBe(true));
    expect(isSelected(blockRow(container, 'A2'))).toBe(false);
  });

  it('Batch 452: clicking the same Material block again brings its billing row back after another row was picked in billing', async () => {
    const handlers = billingHandlers();
    const { container, rerender } = render(<BillingReviewPanel specimens={specimens} {...handlers} materialSelectedBlockId="blk-a2" materialSelectionSeq={1} />);
    await waitFor(() => expect(isSelected(blockRow(container, 'A2'))).toBe(true));
    fireEvent.click(blockRow(container, 'B1').querySelector('.ps-billing-tree-block-label')!);
    await waitFor(() => expect(isSelected(blockRow(container, 'B1'))).toBe(true));
    // Same block id; only the click counter moves.
    rerender(<BillingReviewPanel specimens={specimens} {...handlers} materialSelectedBlockId="blk-a2" materialSelectionSeq={2} />);
    await waitFor(() => expect(isSelected(blockRow(container, 'A2'))).toBe(true));
    expect(isSelected(blockRow(container, 'B1'))).toBe(false);
  });

  it('a slide click on the Material tab reports its own block, so the stain\'s block row is the one selected', () => {
    const onOpenBlockEditor = vi.fn();
    const { container } = render(<MaterialTreePanel caseData={caseData} onOpenBlockEditor={onOpenBlockEditor} isOrchestrationMode {...materialHandlers()} />);
    const mlh1 = slideChips(container).find(c => c.textContent?.includes('MLH1'))!;
    fireEvent.click(mlh1);
    expect(onOpenBlockEditor).toHaveBeenCalledWith('blk-a2');
  });
});

describe('PS-316 a Billing Review row highlights the matching stain on the Material tab', () => {
  it('selecting a block row reports the stain behind its suggestion; a specimen row clears the stain highlight', async () => {
    const handlers = billingHandlers();
    const onHighlightStain = vi.fn();
    const onFocusBlock = vi.fn();
    const { container } = render(<BillingReviewPanel specimens={specimens} {...handlers} onHighlightStain={onHighlightStain} onFocusBlock={onFocusBlock} />);
    await waitFor(() => expect(onHighlightStain).toHaveBeenLastCalledWith('st-ki67'));

    fireEvent.click(blockRow(container, 'A2').querySelector('.ps-billing-tree-block-label')!);
    await waitFor(() => expect(onHighlightStain).toHaveBeenLastCalledWith('st-mlh1'));
    expect(onFocusBlock).toHaveBeenLastCalledWith('sp-a');

    fireEvent.click(container.querySelectorAll('.ps-billing-tree-specimen-label')[1]);
    await waitFor(() => expect(onHighlightStain).toHaveBeenLastCalledWith(undefined));
    expect(onFocusBlock).toHaveBeenLastCalledWith('sp-b');
  });

  it('the Material tab highlights exactly the slide whose id it is given', () => {
    const { container } = render(<MaterialTreePanel caseData={caseData} highlightedStainId="st-mlh1" onOpenBlockEditor={vi.fn()} isOrchestrationMode {...materialHandlers()} />);
    const highlighted = slideChips(container).filter(isHighlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain('MLH1');
  });
});

/** The two panels wired the way SynopticReportPage wires them. */
const ReportPageWiring: React.FC = () => {
  const [materialSelectedBlockId, setMaterialSelectedBlockId] = useState<string | undefined>();
  const [highlightedStainId, setHighlightedStainId] = useState<string | undefined>();
  const blockIds = specimens.flatMap(sp => sp.blocks.map(b => b.id));
  return (
    <>
      <div data-testid="material">
        <MaterialTreePanel
          caseData={caseData}
          highlightedStainId={highlightedStainId}
          onOpenBlockEditor={id => {
            const target = resolveMaterialAssetClick(id, blockIds, []);
            if (target.kind === 'block') setMaterialSelectedBlockId(target.blockId);
          }}
          isOrchestrationMode
          {...materialHandlers()}
        />
      </div>
      <div data-testid="billing">
        <BillingReviewPanel specimens={specimens} {...billingHandlers()} onHighlightStain={setHighlightedStainId} materialSelectedBlockId={materialSelectedBlockId} />
      </div>
    </>
  );
};

describe('PS-316 the two panels side by side, as on the report page', () => {
  it('clicking a slide on the Material tab selects its block in billing, and the slide behind that suggestion lights up', async () => {
    const { getByTestId } = render(<ReportPageWiring />);
    const material = getByTestId('material');
    const billing = getByTestId('billing');
    await waitFor(() => expect(isHighlighted(slideChips(material).find(c => c.textContent?.includes('Ki-67'))!)).toBe(true));

    fireEvent.click(slideChips(material).find(c => c.textContent?.includes('MLH1'))!);
    await waitFor(() => expect(isSelected(blockRow(billing, 'A2'))).toBe(true));
    expect(isSelected(blockRow(billing, 'A1'))).toBe(false);
    await waitFor(() => expect(isHighlighted(slideChips(material).find(c => c.textContent?.includes('MLH1'))!)).toBe(true));
    expect(slideChips(material).filter(isHighlighted)).toHaveLength(1);
  });

  it('selecting a billing row lights up its stain on the Material tab', async () => {
    const { getByTestId } = render(<ReportPageWiring />);
    const material = getByTestId('material');
    const billing = getByTestId('billing');
    await waitFor(() => expect(slideChips(material).filter(isHighlighted)).toHaveLength(1));
    fireEvent.click(blockRow(billing, 'A2').querySelector('.ps-billing-tree-block-label')!);
    await waitFor(() => expect(isHighlighted(slideChips(material).find(c => c.textContent?.includes('MLH1'))!)).toBe(true));
    expect(isHighlighted(slideChips(material).find(c => c.textContent?.includes('Ki-67'))!)).toBe(false);
  });
});
