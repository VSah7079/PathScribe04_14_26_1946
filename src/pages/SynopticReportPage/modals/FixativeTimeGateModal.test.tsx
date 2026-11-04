// @vitest-environment happy-dom
// Batch 383 (PS-359): the fixation-time gate takes what Continue needs from
// the organisation's Field Requirements, and Continue can be said.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  const gate = await vi.importActual<typeof import('@/services/signoutGates/fixativeGate')>('@/services/signoutGates/fixativeGate');
  return {
    ...rules, ...checks, ...gate,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('report')) },
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { FixativeTimeGateModal } from './FixativeTimeGateModal';

afterEach(() => { cleanup(); listeners.length = 0; });

const specimens = [{ specimenId: 's1', label: 'A', description: 'Breast' }];
async function open() {
  const onContinue = vi.fn();
  const { container } = render(<FixativeTimeGateModal specimens={specimens} onContinue={onContinue} onCancel={vi.fn()} />);
  await waitFor(() => expect(listeners.length).toBe(1));
  return { onContinue, container };
}
const cont = () => screen.getByText('preAnalyticDateGateModal.continueButton') as HTMLButtonElement;

describe('FixativeTimeGateModal and Field Requirements (Batch 383)', () => {
  it('Continue waits for a time or the confirmation, and says what is still required', async () => {
    const { onContinue, container } = await open();
    expect(cont().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.fixationTime');
    fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-09-01T08:00' } });
    expect(cont().disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(cont());
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue.mock.calls[0][0][0]).toMatchObject({ specimenId: 's1', resolutionTypeId: 'res-fixation-documented' });
  });

  it('the last-resort path takes an optional reason that is saved with the resolution', async () => {
    const { onContinue } = await open();
    fireEvent.click(screen.getByText('fixativeTimeGateModal.unrecoverableButton'));
    fireEvent.change(screen.getByPlaceholderText('fixativeTimeGateModal.unrecoverableCommentPlaceholder'), { target: { value: 'Not documented' } });
    fireEvent.click(cont());
    expect(onContinue.mock.calls[0][0][0]).toMatchObject({ resolutionTypeId: 'res-fixation-unrecoverable', resolutionComment: 'Not documented' });
  });

  it('"continue fixation gate" continues only when nothing is missing', async () => {
    const { onContinue, container } = await open();
    act(() => listeners[0]('FIXATIVE_GATE_CONTINUE'));
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-09-01T08:00' } });
    act(() => listeners[0]('FIXATIVE_GATE_CONTINUE'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
