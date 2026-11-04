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
const { listeners, config, sendSecureEmail, gateways, auditLog } = vi.hoisted(() => ({
  auditLog: vi.fn(),
  listeners: [] as Array<(id: string) => void>,
  config: { subjectRequired: true, allowed: true },
  sendSecureEmail: vi.fn(),
  // Batch 517 (PS-143): a lab with one gateway covered by a BAA and one not.
  gateways: { current: null as unknown },
}));
const DVMC = {
  facilityId: 'c-ent-dvmc', defaultGatewayId: 'PAUBOX', gateways: [
    { gatewayId: 'PAUBOX', enabled: true, senderAddress: 'pathology@dvmc.example.org', agreement: { kind: 'BAA', reference: 'BAA-1', signedOn: '2025-03-01' } },
    { gatewayId: 'VIRTRU', enabled: true, senderAddress: 'admin@dvmc.example.org' },
  ],
};
vi.mock('@/components/Audit/useAuditLog', () => ({ useAuditLog: () => ({ log: auditLog }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Dr. A', organisationId: 'ORG-DVMC' } }) }));
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
    secureMessagingConfigService: { forOrganisation: vi.fn(async () => ({ ok: true, data: gateways.current })) },
    MESSAGE_NOT_PERMITTED: 'MESSAGE_NOT_PERMITTED',
    searchRecipients: (list: any[], q: string, ex: string[] = []) => list.filter(u => !ex.includes(u.id) && u.name.toLowerCase().includes(q.toLowerCase())),
    findRecipientByName: () => undefined,
  };
});

import { ComposePanel } from './AppShell';
import { SecureEmailModal } from '@/components/SecureEmail/SecureEmailModal';

afterEach(() => { cleanup(); listeners.length = 0; config.subjectRequired = true; config.allowed = true; sendSecureEmail.mockReset(); auditLog.mockReset(); });
beforeEach(() => { sendSecureEmail.mockResolvedValue({ ok: true, data: undefined }); gateways.current = DVMC; });

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
    await waitFor(() => expect(screen.queryByText(/secureEmailModal\.eyebrow:/)).toBeTruthy());
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
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('dr@example.org', 'Subject', 'PAUBOX'));
    expect(sendSecureEmail).toHaveBeenCalledWith({
      fromName: 'Dr. A', fromEmail: 'pathology@dvmc.example.org', to: 'dr@example.org', subject: 'Subject', body: 'Text',
      organisationId: 'ORG-DVMC', gatewayId: 'PAUBOX', containsPatientData: true,
    });
  });
  it('without message:secure-email:send, Send is off and says why (Batch 385)', async () => {
    config.allowed = false;
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    expect(send().disabled).toBe(true);
    expect(screen.getByText('appShell.messaging.notPermittedSecureEmail')).toBeTruthy();
    act(() => listeners[0]('SECURE_EMAIL_SUBMIT'));
    expect(sendSecureEmail).not.toHaveBeenCalled();
  });
  it('a sent email writes its own audit entry and then says so; a refused one does neither', async () => {
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    expect(screen.queryByTestId('secure-email-audit')).toBeNull();
    fireEvent.click(send());
    await waitFor(() => expect(screen.getByTestId('secure-email-audit').textContent).toBe('appShell.secureEmailModal.auditRecorded'));
    expect(auditLog).toHaveBeenCalledWith('secure_email_sent', { recipientEmail: 'dr@example.org', subject: 'S' });
  });
  it('a refused send writes no audit entry', async () => {
    sendSecureEmail.mockResolvedValue({ ok: false, error: 'MESSAGE_NOT_PERMITTED' });
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    fireEvent.click(send());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(auditLog).not.toHaveBeenCalled();
  });
  it('a refused send keeps the email and shows the reason (Batch 385)', async () => {
    sendSecureEmail.mockResolvedValue({ ok: false, error: 'MESSAGE_NOT_PERMITTED' });
    const onSent = await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    fireEvent.click(send());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('appShell.messaging.notPermittedSecureEmail'));
    expect(onSent).not.toHaveBeenCalled();
    expect(send().disabled).toBe(false);
  });

  // Batch 517 (PS-143): per-gateway agreements (Pete, Oct 2).
  it('patient data goes only through a gateway with its agreement; unticking allows the other', async () => {
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text' });
    fireEvent.change(screen.getByLabelText('appShell.secureEmailModal.gatewayLabel'), { target: { value: 'VIRTRU' } });
    expect(send().disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('appShell.secureEmailModal.problems.noAgreementForPatientData');
    fireEvent.click(screen.getByLabelText('appShell.secureEmailModal.containsPatientData'));
    expect(send().disabled).toBe(false);
    fireEvent.click(send());
    await waitFor(() => expect(sendSecureEmail).toHaveBeenCalledWith(expect.objectContaining({ gatewayId: 'VIRTRU', containsPatientData: false })));
  });
  it('a caller that sends patient data can\'t untick it, and the covered gateway is preselected', async () => {
    gateways.current = { ...DVMC, defaultGatewayId: 'VIRTRU' };
    await open({ prefillTo: 'dr@example.org', prefillSubject: 'S', prefillBody: 'Text', containsPatientData: true });
    expect((screen.getByLabelText('appShell.secureEmailModal.containsPatientData') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('appShell.secureEmailModal.gatewayLabel') as HTMLSelectElement).value).toBe('PAUBOX');
  });
  it('a lab with no gateway can\'t send, and says so', async () => {
    gateways.current = null;
    render(<SecureEmailModal isOpen fromName="Dr. A" fromEmail="a@example.org" onClose={vi.fn()} prefillTo="dr@example.org" prefillSubject="S" prefillBody="Text" />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('problems.noGatewayConfigured'));
    expect(send().disabled).toBe(true);
  });
});
