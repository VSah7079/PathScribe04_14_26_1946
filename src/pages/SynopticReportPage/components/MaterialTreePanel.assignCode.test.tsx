// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/components/MaterialTreePanel.assignCode.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-310): the Material tab's per-specimen code button reads
// "🏷️ Assign Code" (tag icon, spelled-out label) instead of the old "+ Code"
// pill that looked like the bottom bar's "# Codes" button, and it assigns
// that one specimen's base code. Real English locale, so the wording is checked.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Case } from '@/types/case/Case';
import MaterialTreePanel from './MaterialTreePanel';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const caseData = {
  id: 'CASE-310', status: 'in-progress', accession: { fullAccession: 'S26-310' },
  specimens: [
    { id: 'sp-a', label: 'A', description: 'Skin, shave', coding: { cpt: ['88305'] }, blocks: [] },
    { id: 'sp-b', label: 'B', description: 'FNA, thyroid', blocks: [] },
  ],
} as unknown as Case;

function renderTree(onAssignBaseCode = vi.fn()) {
  render(
    <MaterialTreePanel
      caseData={caseData} isOrchestrationMode onAssignBaseCode={onAssignBaseCode}
      onOpenBlockEditor={vi.fn()} onOpenMatrixBlockEditor={vi.fn()} onAddSpecimen={vi.fn()} onAddBlock={vi.fn()}
      onUpdateBlock={vi.fn()} onReleaseGrossingBlocks={vi.fn()} onConfirmTriageChecklistItem={vi.fn()} onOverrideTriage={vi.fn()}
      onRemovePendingBlock={vi.fn()} onAddDecant={vi.fn()} onCreateBiopsyArray={vi.fn()} onEditBiopsyArray={vi.fn()} onReprintAllSlides={vi.fn()}
    />,
  );
  return onAssignBaseCode;
}

describe('MaterialTreePanel per-specimen code button (PS-310)', () => {
  it('reads "🏷️ Assign Code" on every specimen, with no "#" or "+" sigil that would make it look like the "# Codes" button', () => {
    renderTree();
    const buttons = screen.getAllByRole('button').filter(b => b.classList.contains('ps-material-tree-assign-code-btn'));
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      expect(b.textContent).toBe('🏷️ Assign Code');
      expect(b.textContent).not.toMatch(/^[#+]/);
      expect(b.getAttribute('title')).toBe("Assign this specimen's base CPT code");
    }
  });

  it('assigns the code for that one specimen (its id and position on the case)', () => {
    const onAssign = renderTree();
    fireEvent.click(screen.getAllByText('Assign Code')[1].closest('button')!);
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledWith('sp-b', 1);
  });
});
