// @vitest-environment happy-dom
// Batch 384 (PS-359): the message drawer's compose panel and the secure email
// window take what Send needs from the organisation's Field Requirements, and
// the secure email's Send can be said.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners, config, sendSecureEmail } = vi.hoisted(() => ({
  listeners: [] as Array<(id: string) => void>,
  config: { subjectRequired: true, allowed: true },
  sendSecureEmail: vi.fn(),
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: () => config.allowed, decide: () => ({ allowed: config.allowed }) }),
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/messagingChecks')>('@/services/fieldRequirements/messagingChecks');
  return {
    ...rules, ...checks,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('messaging', config.subjectRequired ? {} : { messageSubject: false, secureEmailSubject: false })) },
    actionRegistryService: { setCurrentContext: vi.fn(), onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
    messageService: { sendSecureEmail }, caseService: {},
    MESSAGE_NOT_PERMITTED: 'MESSAGE_NOT_PERMITTED',
    searchRecipients: (list: any[], q: string, ex: string[] = []) => list.filter(u => !ex.includes(u.id) && u.name.toLowerCase().includes(q.toLowerCase())),
    findRecipientByName: () => undefined,
  };
});

import { ComposePanel, SecureEmailModal } from './AppShell';

afterEach(() => { cleanup(); listeners.length = 0; config.subjectRequired = true; config.allowed = true; sendSecureEmail.mockReset(); });
beforeEach(() => { sendSecureEmail.mockResolvedValue({ ok: true, data: undefined }); });

const recipient = { id: 'u2', name: 'Lab Manager', role: 'Laboratory' };
function panel(over: Partial<React.ComponentProps<typeof ComposePanel>> = {}) {
  return render(<ComposePanel
    directory={[recipient]} recipients={[recipient]} toInput="" subject="" body="" isUrgent={false} showUserSearch={false}
    toDropdownOpen={false} toHighlightIdx={0} toInputRef={{ current: null } as any}
    onRecipientsChange={vi.fn()} onToInputChange={vi.fn()} onSubjectChange={vi.fn()} onBodyChange={vi.fn()}
    onUrgentToggle={vi.fn()} onToDropdownOpenChange={vi.fn()} onToHighlightIdxChange={vi.fn()} onShowUserSearch={vi.fn()}
    onCancel={vi.fn()} onSend={vi.fn()} onSecureEmail={vi.fn()} {...over}
  />);
}

describe('ComposePanel and Field Requirements (Batch 384)', () => {
  it('Send waits for the subject and the text, and says what is still required', async () => {
    panel({ body: 'Hello' });
    const send = screen.getByText('appShell.compose.sendButton').closest('button') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.messaging.messageSubject');
  });
  it('Send is ready when everything required is filled', async () => {
    panel({ subject: 'Case A26-1', body: 'Please review' });
    const send = screen.getByText('appShell.compose.sendButton').closest('button') as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('an organisation that switched the subject off can send without one', async () => {
    config.subjectRequired = false;
    panel({ body: 'Hello' });
    const send = screen.getByText('appShell.compose.sendButton').closest('button') as HTMLButtonElement;
    await waitFor(() => expect(send.disabled).toBe(false));
  });
});

describe('ComposePanel and permissions (Batch 385)', () => {
  it('without message:internal:send, Send and Secure email are off and it says why', () => {
    config.allowed = false;
    panel({ subject: 'S', body: 'Text' });
    expect((screen.getByText('appShell.compose.sendButton').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('appShell.compose.secureEmailButton').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('appShell.messaging.notPermitted')).toBeTruthy();
  });
  it('shows why the last send failed', () => {
    panel({ subject: 'S', body: 'Text', sendError: 'appShell.messaging.sendFailed' });
    expect(screen.getByRole('alert').textContent).toBe('appShell.messaging.sendFailed');
  });
});

describe('SecureEmailModal and Field Requirements (Batch 384)', () => {
  const open = async (props: Partial<React.ComponentProps<typeof SecureEmailModal>> = {}) => {
    const onSent = vi.fn();
    render(<SecureEmailModal isOpen fromName="Dr. A" fromEmail="a@example.org" onClose={vi.fn()} onSent={onSent} {...props} />);
    await waitFor(() => expect(listeners.length).toBe(1));
    return onSent;
  };
  const send = () => screen.getByText('appShell.secureEmailModal.sendButton').closest('button') as HTMLButtonElement;

  it('Send waits for an address, a subject and text', async () => {
    await open({ prefillTo: 'nobody', prefillBody: 'Text' });
    expect(send().disabled).toBe(true);
    const line = screen.getByRole('status').textContent ?? '';
    expect(line).toContain('fieldRequirements.fields.messaging.secureEmailTo');
    expect(line).toContain('fieldRequirements.fields.messaging.secureEmailSubject');
  });
  it('"submit secure email" sends only when nothing is missing', async () => {
    const onSent = await open({ prefillTo: 'dr@example.org', prefillSubject: '', prefillBody: 'Text' });
    act(() => listeners[0]('SECURE_EMAIL_SUBMIT'));
    expect(sendSecureEmail).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('appShell.secureEmailModal.subjectPlaceholder'), { target: { value: 'Subject' } });
    act(() => listeners[0]('SECURE_EMAIL_SUBMIT'));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('dr@example.org', 'Subject'));
    expect(sendSecureEmail).toHaveBeenCalledWith({ fromName: 'Dr. A', fromEmail: 'a@example.org', to: 'dr@example.org', subject: 'Subject', body: 'Text' });
  });
  it('without message:secure-email:send, Send is off and says why (Batch 385)', async () => {
    config.allowed = false;
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    expect(send().disabled).toBe(true);
    expect(screen.getByText('appShell.messaging.notPermittedSecureEmail')).toBeTruthy();
    act(() => listeners[0]('SECURE_EMAIL_SUBMIT'));
    expect(sendSecureEmail).not.toHaveBeenCalled();
  });
  it('a refused send keeps the email and shows the reason (Batch 385)', async () => {
    sendSecureEmail.mockResolvedValue({ ok: false, error: 'MESSAGE_NOT_PERMITTED' });
    const onSent = await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    fireEvent.click(send());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('appShell.messaging.notPermittedSecureEmail'));
    expect(onSent).not.toHaveBeenCalled();
    expect(send().disabled).toBe(false);
  });
});
