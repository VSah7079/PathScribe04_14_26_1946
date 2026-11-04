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
  listForReview: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
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

// Batch 669 (mol-1): view-only without the permission.
const { caps } = vi.hoisted(() => ({ caps: { has: true } }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => caps.has, decide: () => null }) }));

import MolecularControlRulesPage from './MolecularControlRulesPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); caps.has = true; });
const rule = { id: 'rule-001', assayCode: 'st-hpv', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' }], allowedSampleRackSlotIds: ['SLOT_A1'], createdAt: '' };

describe('MolecularControlRulesPage', () => {
  it('every change is its own permission; the rule shows its assay by name and its rack slots', async () => {
    svc.listForReview.mockResolvedValue({ ok: true, data: [rule] });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    for (const b of ['molecularControlRulesPage.newRule', 'molecularControlRulesPage.edit', 'molecularControlRulesPage.delete']) {
      expect((screen.getByText(b).closest('button') as HTMLButtonElement).dataset.capability).toBe('config:molecular-control-rules:manage');
    }
    expect(screen.getByText('SLOT_A1')).not.toBeNull();
  });

  it('delete asks first, and a refusal is shown translated', async () => {
    svc.listForReview.mockResolvedValue({ ok: true, data: [rule] });
    svc.delete.mockResolvedValue({ ok: false, error: 'notPermitted' });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    fireEvent.click(screen.getByText('molecularControlRulesPage.delete'));
    expect(svc.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).not.toBeNull();
    // Batch 669 (mol-14): the delete button waits for a reason.
    const confirm = screen.getAllByText('molecularControlRulesPage.delete')[0].closest('button') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/molecularControlRulesPage.reasonLabel/), { target: { value: 'Assay retired' } });
    fireEvent.click(screen.getAllByText('molecularControlRulesPage.delete')[0]);
    await waitFor(() => expect(svc.delete).toHaveBeenCalledWith('rule-001', 'Assay retired'));
    expect(await screen.findByText('molecularControlRulesPage.errors.notPermitted:{"defaultValue":"molecularControlRulesPage.genericSaveError"}')).not.toBeNull();
  });

  it('editing saves the ticked deck slots with the rule', async () => {
    svc.listForReview.mockResolvedValue({ ok: true, data: [rule] });
    svc.update.mockResolvedValue({ ok: true, data: rule });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    fireEvent.click(screen.getByText('molecularControlRulesPage.edit'));
    fireEvent.click(await screen.findByLabelText('SLOT_A2'));
    fireEvent.change(screen.getByLabelText(/molecularControlRulesPage.reasonLabel/), { target: { value: 'Second rack position added' } });
    fireEvent.click(screen.getByText('molecularControlRulesPage.saveRule'));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('rule-001', expect.objectContaining({ allowedSampleRackSlotIds: ['SLOT_A1', 'SLOT_A2'] }), 'Second rack position added'));
  });

  it('Batch 669 (mol-1): without the permission the screen says it is view-only; with it, no such note', async () => {
    svc.listForReview.mockResolvedValue({ ok: true, data: [rule] });
    caps.has = false;
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    expect(screen.getByText('molecularControlRulesPage.viewOnly')).not.toBeNull();
    cleanup();
    caps.has = true;
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    expect(screen.queryByText('molecularControlRulesPage.viewOnly')).toBeNull();
  });

  it('Batch 669 (mol-14): saving without a reason, without controls, or onto another rule\'s assay is stopped before the service', async () => {
    const other = { ...rule, id: 'rule-2', assayCode: 'st-other' };
    svc.listForReview.mockResolvedValue({ ok: true, data: [rule, other] });
    render(<MolecularControlRulesPage />);
    await screen.findByText('HPV');
    fireEvent.click(screen.getAllByText('molecularControlRulesPage.edit')[0]);
    await screen.findByLabelText('SLOT_A1');
    fireEvent.click(screen.getByText('molecularControlRulesPage.saveRule'));
    expect(await screen.findByText('molecularControlRulesPage.draftProblem.reasonRequired')).not.toBeNull();
    fireEvent.change(screen.getByLabelText(/molecularControlRulesPage.reasonLabel/), { target: { value: 'r' } });
    fireEvent.click(screen.getByText('molecularControlRulesPage.removeButton'));
    fireEvent.click(screen.getByText('molecularControlRulesPage.saveRule'));
    expect(await screen.findByText('molecularControlRulesPage.draftProblem.controlsRequired')).not.toBeNull();
    expect(svc.update).not.toHaveBeenCalled();
    // A service refusal is shown translated, never silent.
    fireEvent.click(screen.getByText('molecularControlRulesPage.addRequiredControl'));
    svc.update.mockResolvedValue({ ok: false, error: 'duplicateAssay' });
    fireEvent.click(screen.getByText('molecularControlRulesPage.saveRule'));
    expect(await screen.findByText(/molecularControlRulesPage.errors.duplicateAssay/)).not.toBeNull();
  });

  it('Batch 669 (ctl): a refused read shows the permission message, not an empty list', async () => {
    svc.listForReview.mockResolvedValue({ ok: false, error: 'notPermitted' });
    render(<MolecularControlRulesPage />);
    expect(await screen.findByText('molecularControlRulesPage.listNotPermitted')).not.toBeNull();
  });
});
