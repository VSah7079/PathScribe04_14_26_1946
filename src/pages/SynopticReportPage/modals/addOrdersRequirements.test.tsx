// @vitest-environment happy-dom
// Batch 397 (PS-359): Add Orders → Blocks / Recut takes what it needs from the
// organisation's Field Requirements (page "report"): Add Block stays off and the
// form says what's still required until a specimen and cassette label are given,
// and "confirm block order" does exactly what the button does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});
vi.mock('@/hooks/useFieldRequirements', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  return { useFieldRequirements: (page: any) => rules.resolveFieldRequirements(page) };
});

import AddOrdersModal from './AddOrdersModal';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => listeners.forEach(cb => cb(id));
const caseData = { id: 'S26-1', status: 'accessioned', specimens: [{ id: 'sp-a', label: 'A', description: 'Colon biopsy' }] } as any;
const open = (onAddBlock = vi.fn()) => {
  render(<AddOrdersModal show caseData={caseData} onClose={() => {}} onGoToAddSpecimen={() => {}} onGoToAddStain={() => {}} onAddBlock={onAddBlock} />);
  return onAddBlock;
};
const addBtn = () => screen.getByText('addOrdersModal.addBlockButton').closest('button') as HTMLButtonElement;

describe('AddOrdersModal: Blocks / Recut (Batch 397)', () => {
  it('Add Block is off and the form lists what is still required; both labels are marked', () => {
    open();
    expect(addBtn().disabled).toBe(true);
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('fieldRequirements.fields.report.addOrdersSpecimen');
    expect(status).toContain('fieldRequirements.fields.report.addOrdersCassetteLabel');
    expect(document.querySelectorAll('.ps-conf-required').length).toBe(2);
  });

  it('with a specimen and a label it adds the block and the English sentence', () => {
    const onAddBlock = open();
    fireEvent.change(screen.getByLabelText(/qualityAssurance.common.specimen/), { target: { value: 'sp-a' } });
    fireEvent.change(screen.getByLabelText(/addOrdersModal.blocksTab.cassetteLabel/), { target: { value: ' A3 ' } });
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(addBtn());
    expect(onAddBlock).toHaveBeenCalledWith('sp-a', 'A3', 'Specimen A represents deeper levels cut from Block A3, ordered for advanced microscopic evaluation.');
  });

  it('the voice command acts only when the button would', () => {
    const onAddBlock = open();
    say('ADD_ORDERS_ADD_BLOCK');
    expect(onAddBlock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/qualityAssurance.common.specimen/), { target: { value: 'sp-a' } });
    fireEvent.change(screen.getByLabelText(/addOrdersModal.blocksTab.cassetteLabel/), { target: { value: 'A4' } });
    say('ADD_ORDERS_ADD_BLOCK');
    expect(onAddBlock).toHaveBeenCalledTimes(1);
  });
});
