// @vitest-environment happy-dom
// Batch 404: the reason dialog for aborting, force-completing and cold-chain acknowledgement.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/batchChecks')>('@/services/fieldRequirements/batchChecks');
  return { ...rules, ...checks };
});
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className: string; capability: string }) =>
    <button className={className} disabled={disabled} data-capability={capability} onClick={onClick}>{children}</button>,
}));

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import { batchAbortMissing } from '@/services/fieldRequirements/batchChecks';
import BatchReasonModal from './BatchReasonModal';

afterEach(cleanup);

describe('BatchReasonModal (Batch 404)', () => {
  it('abort needs a reason: starred, "Still required", greyed; then sends the trimmed reason', () => {
    const onConfirm = vi.fn();
    render(<BatchReasonModal title="Abort" text="Sure?" label="Reason" placeholder="" confirmLabel="Abort batch" fieldId="abortReason"
      missing={batchAbortMissing} requirements={resolveFieldRequirements('batchManagement')} capability="batch:run:abort"
      busy={false} onConfirm={onConfirm} onCancel={() => {}} />);
    const confirm = screen.getByText('Abort batch').closest('button') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(confirm.dataset.capability).toBe('batch:run:abort');
    expect(document.querySelector('.ps-conf-required')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.batchManagement.abortReason');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Wrong protocol ' } });
    fireEvent.click(confirm);
    // Batch 736: typed only, so no reason code.
    expect(onConfirm).toHaveBeenCalledWith('Wrong protocol', undefined);
  });

  it('Batch 736: a tapped reason from the Reason Dictionary is enough, and goes with its code; a note is added to it', async () => {
    localStorage.clear();
    const onConfirm = vi.fn();
    render(<BatchReasonModal title="Abort" text="Sure?" label="Reason" placeholder="" confirmLabel="Abort batch" fieldId="abortReason"
      missing={batchAbortMissing} requirements={resolveFieldRequirements('batchManagement')} capability="batch:run:abort"
      busy={false} onConfirm={onConfirm} onCancel={() => {}} />);
    const pick = await screen.findByRole('radio', { name: 'benchReasons.BA_RUN_CANCELLED' });
    fireEvent.click(pick);
    expect(pick.getAttribute('aria-checked')).toBe('true');
    const confirm = screen.getByText('Abort batch').closest('button') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'per Dr P' } });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('quickReasons.withNote:{"reason":"benchReasons.BA_RUN_CANCELLED","note":"per Dr P"}', 'BA_RUN_CANCELLED');
  });
});
