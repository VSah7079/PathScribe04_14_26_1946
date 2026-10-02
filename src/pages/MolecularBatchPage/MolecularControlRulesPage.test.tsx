// @vitest-environment happy-dom
// Batch 406: Control Rules need config:molecular-control-rules:manage (Pete:
// Admin by default, assignable), deleting asks first, and a rule can name the
// deck slots its assay's sample rack may use.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('react-router', () => ({ useNavigate: () => () => {} }));
const { svc } = vi.hoisted(() => ({ svc: {
  getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
} }));
vi.mock('@/services', async () => ({
  ...(await vi.importActual<typeof import('@/services/molecular/controlRuleDraft')>('@/services/molecular/controlRuleDraft')),
  ...(await vi.importActual<typeof import('@/services/molecular/molecularAssays')>('@/services/molecular/molecularAssays')),
  molecularAssayControlRuleService: svc,
  stainTypeService: { getAll: async () => ({ ok: true, data: [{ id: 'st-hpv', name: 'HPV', category: 'Molecular', active: true }] }) },
  equipmentService: { getActive: async () => ({ ok: true, data: [{ id: 'e1', code: 'P1', deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }, { id: 'SLOT_A2', rackTypes: ['sample_tube_rack'] }] }] }) },
}));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className: string; capability: string }) =>
    <button className={className} disabled={disabled} data-capability={capability} onClick={onClick}>{children}</button>,
}));

import MolecularControlRulesPage from './MolecularControlRulesPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const rule = { id: 'rule-001', assayCode: 'st-hpv', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' }], allowedSampleRackSlotIds: ['SLOT_A1'], createdAt: '' };

describe('MolecularControlRulesPage', () => {
  it('every change is its own permission; the rule shows its assay by name and its rack slots', async () => {
    svc.getAll.mockResolvedValue({ ok: true, data: [rule] });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    for (const b of ['molecularControlRulesPage.newRule', 'molecularControlRulesPage.edit', 'molecularControlRulesPage.delete']) {
      expect((screen.getByText(b).closest('button') as HTMLButtonElement).dataset.capability).toBe('config:molecular-control-rules:manage');
    }
    expect(screen.getByText('SLOT_A1')).not.toBeNull();
  });

  it('delete asks first, and a refusal is shown translated', async () => {
    svc.getAll.mockResolvedValue({ ok: true, data: [rule] });
    svc.delete.mockResolvedValue({ ok: false, error: 'notPermitted' });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    fireEvent.click(screen.getByText('molecularControlRulesPage.delete'));
    expect(svc.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).not.toBeNull();
    fireEvent.click(screen.getAllByText('molecularControlRulesPage.delete')[0]);
    await waitFor(() => expect(svc.delete).toHaveBeenCalledWith('rule-001'));
    expect(await screen.findByText('molecularControlRulesPage.errors.notPermitted:{"defaultValue":"molecularControlRulesPage.genericSaveError"}')).not.toBeNull();
  });

  it('editing saves the ticked deck slots with the rule', async () => {
    svc.getAll.mockResolvedValue({ ok: true, data: [rule] });
    svc.update.mockResolvedValue({ ok: true, data: rule });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    fireEvent.click(screen.getByText('molecularControlRulesPage.edit'));
    fireEvent.click(await screen.findByLabelText('SLOT_A2'));
    fireEvent.click(screen.getByText('molecularControlRulesPage.saveRule'));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('rule-001', expect.objectContaining({ allowedSampleRackSlotIds: ['SLOT_A1', 'SLOT_A2'] })));
  });
});
