// @vitest-environment happy-dom
// Batch 383 (PS-359): the collection/receipt date gate takes what Continue
// needs from the organisation's Field Requirements, and Continue can be said.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  const gate = await vi.importActual<typeof import('@/services/signoutGates/preAnalyticGate')>('@/services/signoutGates/preAnalyticGate');
  return {
    ...rules, ...checks, ...gate,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('report')) },
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { PreAnalyticDateGateModal } from './PreAnalyticDateGateModal';

afterEach(() => { cleanup(); listeners.length = 0; });

const config = { standardReference: 'ISO 15189', administrativeOverrideLabel: 'Not recorded' } as any;
const specimens = [{ specimenId: 's1', label: 'A', description: 'Breast', missingCollectedAt: true, missingReceivedAt: false }];
async function open() {
  const onContinue = vi.fn();
  const { container } = render(<PreAnalyticDateGateModal specimens={specimens} config={config} onContinue={onContinue} onCancel={vi.fn()} />);
  await waitFor(() => expect(listeners.length).toBe(1));
  return { onContinue, container };
}
const cont = () => screen.getByText('preAnalyticDateGateModal.continueButton') as HTMLButtonElement;

describe('PreAnalyticDateGateModal and Field Requirements (Batch 383)', () => {
  it('Continue waits for the missing date, and says what is still required', async () => {
    const { onContinue, container } = await open();
    expect(cont().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.preAnalyticCollectedAt');
    fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-09-01T07:00' } });
    expect(cont().disabled).toBe(false);
    fireEvent.click(cont());
    expect(onContinue.mock.calls[0][0][0]).toEqual({ specimenId: 's1', collectedAt: new Date('2026-09-01T07:00').toISOString() });
  });

  it('an administrative override needs its justification', async () => {
    const { onContinue } = await open();
    fireEvent.click(screen.getByText(/preAnalyticDateGateModal.notRecoverableApply/));
    expect(cont().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.preAnalyticOverrideComment');
    fireEvent.change(screen.getByPlaceholderText('preAnalyticDateGateModal.commentPlaceholder'), { target: { value: 'Lost in transit' } });
    fireEvent.click(cont());
    expect(onContinue.mock.calls[0][0][0]).toEqual({ specimenId: 's1', collectedAtAdministrativeOverride: true, overrideComment: 'Lost in transit' });
  });

  it('"continue date gate" continues only when nothing is missing', async () => {
    const { onContinue, container } = await open();
    act(() => listeners[0]('PREANALYTIC_GATE_CONTINUE'));
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-09-01T07:00' } });
    act(() => listeners[0]('PREANALYTIC_GATE_CONTINUE'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
