// @vitest-environment happy-dom
// Batch 380 (PS-359): the critical-findings modal takes what Record needs
// from the organisation's Field Requirements, and Record can be said.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));

const { settings, listeners } = vi.hoisted(() => ({
  settings: { current: {} as Record<string, boolean> },
  listeners: [] as Array<(id: string) => void>,
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  return {
    ...rules, ...checks,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('report', settings.current)) },
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

// Batch 517 (PS-143): the secure email window, as a stand-in that "sends".
const email = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('@/components/SecureEmail/SecureEmailModal', () => ({
  SecureEmailModal: (props: Record<string, any>) => {
    email.props = props;
    return props.isOpen ? <button onClick={() => props.onSent('dr.lee@example.org', props.prefillSubject, 'PAUBOX')}>stub-send</button> : null;
  },
}));

import { CriticalFindingsModal } from './CriticalFindingsModal';

afterEach(() => { cleanup(); settings.current = {}; listeners.length = 0; });

const FINDINGS = [{ term: 'malignant', sourceField: 'diagnosis', sourceQuote: 'invasive carcinoma', severity: 'critical' }] as any;

async function open(onRecord = vi.fn()) {
  render(<CriticalFindingsModal findings={FINDINGS} defaultNotifiedByName="Pete Nimmo" onRecord={onRecord} onAcknowledge={vi.fn()} />);
  await waitFor(() => expect(listeners.length).toBe(1));
  return onRecord;
}

describe('CriticalFindingsModal and Field Requirements (Batch 380)', () => {
  it('by default, Record waits for the clinician and the method, and lists what\'s missing', async () => {
    const onRecord = await open();
    const record = screen.getByText('criticalFindingsModal.recordButton') as HTMLButtonElement;
    expect(record.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.criticalClinician');
    fireEvent.change(screen.getByPlaceholderText('criticalFindingsModal.clinicianNotifiedPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'verbal_phone' } });
    expect(record.disabled).toBe(false);
    fireEvent.click(record);
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith({ clinicianName: 'Dr Lee', method: 'verbal_phone', readBackConfirmed: false, notifiedByName: 'Pete Nimmo' }));
  });

  it('an organisation that requires read-back holds Record until it\'s ticked', async () => {
    settings.current = { criticalReadBack: true };
    await open();
    fireEvent.change(screen.getByPlaceholderText('criticalFindingsModal.clinicianNotifiedPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fax' } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('criticalReadBack'));
    const record = screen.getByText('criticalFindingsModal.recordButton') as HTMLButtonElement;
    expect(record.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(record.disabled).toBe(false);
  });

  it('"record notification" records only when nothing is missing', async () => {
    const onRecord = await open();
    act(() => listeners[0]('CRITICAL_NOTIFICATION_RECORD'));
    expect(onRecord).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('criticalFindingsModal.clinicianNotifiedPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'secure_page' } });
    act(() => listeners[0]('CRITICAL_NOTIFICATION_RECORD'));
    await waitFor(() => expect(onRecord).toHaveBeenCalledTimes(1));
  });

  it('secure email: no read-back, opens the email window pre-filled, and records only once it is sent (Batch 517)', async () => {
    settings.current = { criticalReadBack: true };
    render(<CriticalFindingsModal findings={FINDINGS} defaultNotifiedByName="Pete Nimmo" caseReference="S26-4671" onRecord={vi.fn()} onAcknowledge={vi.fn()} />);
    await waitFor(() => expect(listeners.length).toBe(1));
    fireEvent.change(screen.getByPlaceholderText('criticalFindingsModal.clinicianNotifiedPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'secure_email' } });
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('criticalFindingsModal.secureEmailNote')).toBeTruthy();
    fireEvent.click(screen.getByText('criticalFindingsModal.composeEmailButton'));
    expect(email.props?.isOpen).toBe(true);
    expect(email.props?.containsPatientData).toBe(true);
    expect(email.props?.prefillSubject).toContain('S26-4671');
    expect(email.props?.prefillBody).toContain('invasive carcinoma');
  });

  it('closing the email window records nothing; sending it records the notification', async () => {
    const onRecord = vi.fn();
    render(<CriticalFindingsModal findings={FINDINGS} defaultNotifiedByName="Pete Nimmo" onRecord={onRecord} onAcknowledge={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('criticalFindingsModal.clinicianNotifiedPlaceholder'), { target: { value: 'Dr Lee' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'secure_email' } });
    fireEvent.click(screen.getByText('criticalFindingsModal.composeEmailButton'));
    act(() => email.props?.onClose());
    expect(onRecord).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('criticalFindingsModal.composeEmailButton'));
    fireEvent.click(screen.getByText('stub-send'));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith({ clinicianName: 'Dr Lee', method: 'secure_email', notifiedByName: 'Pete Nimmo' }));
  });
});
