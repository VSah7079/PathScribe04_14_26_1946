// @vitest-environment happy-dom
// src/pages/Synoptic/Codes/AddCodeModal.triggers.test.tsx
// PS-138: matched triggers offer a live search in the Code Manager. Nothing is searched, and nothing is applied, until the user chooses.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AddCodeModal } from './AddCodeModal';
import type { TriggerCodeQuery } from '../../../services/abnormalDetection/triggerCodeQueries';

const searchCodes = vi.fn();
vi.mock('../../../services/terminologySearch/codeSearchService', async importOriginal => ({
  ...(await importOriginal<object>()),
  searchCodes: (...a: unknown[]) => searchCodes(...a),
}));
// Batch 649: Save is a CapabilityButton (case:diagnosis-code:apply); useCapabilities needs the signed-in session.
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));

const trigger: TriggerCodeQuery = {
  ruleId: 'r1', specimenId: 'sp-2', fieldLabel: 'Margin Status', matchedValue: 'Positive',
  query: 'Margin Status Positive', severity: 'Critical',
};
const specimens = [
  { index: 0, id: 1, specimenId: 'sp-1', name: 'A: skin' },
  { index: 1, id: 2, specimenId: 'sp-2', name: 'B: colon' },
];
const base = { existingCodes: [], allSpecimens: specimens, onAddToSpecimens: vi.fn(), onClose: vi.fn() };

afterEach(cleanup);
beforeEach(() => { searchCodes.mockReset(); searchCodes.mockResolvedValue([{ code: '1', display: 'Margin positive', system: 'SNOMED' }]); });

describe('Code Manager trigger searches (PS-138)', () => {
  it('shows nothing when no trigger matched', () => {
    render(<AddCodeModal {...base} />);
    expect(screen.queryByTestId('trigger-code-queries')).toBeNull();
  });
  it('lists the matched finding without searching', () => {
    render(<AddCodeModal {...base} triggerQueries={[trigger]} />);
    expect(screen.getByText('Margin Status: Positive')).toBeTruthy();
    expect(searchCodes).not.toHaveBeenCalled();
  });
  it('choosing a finding runs the live search with its field and value, and applies nothing', async () => {
    const onAdd = vi.fn();
    render(<AddCodeModal {...base} onAddToSpecimens={onAdd} triggerQueries={[trigger]} />);
    fireEvent.click(screen.getByText('Margin Status: Positive'));
    await waitFor(() => expect(searchCodes).toHaveBeenCalledWith('SNOMED', 'Margin Status Positive', expect.anything()), { timeout: 3000 });
    expect(onAdd).not.toHaveBeenCalled();
  });
});
