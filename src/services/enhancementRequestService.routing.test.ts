// @vitest-environment happy-dom
// Feedback routing: the 'AI / Template validation' category (study and template links, the validation
// recipients, the QA fallback, the audit event), and enhancement requests delivered to the configured
// destination (the demo build never sends; a real failure is plain and fixed).
import { describe, expect, it, vi } from 'vitest';
import { submitEnhancementRequest, loadEnhancementConfigForSubmit, type EnhancementRequestConfig, type EnhancementRequestPayload, type SubmitDeps } from './enhancementRequestService';
import { buildEnhancementHtml, buildEnhancementText, buildEnhancementSubject } from './communications/emailTemplates/enhancementEmailTemplates';
import { DEFAULT_FEEDBACK_SETTINGS } from './feedback/feedbackSettingsRules';
import type { FeedbackSettings } from './feedback/feedbackSettingsRules';

const base: EnhancementRequestConfig = {
  mode: 'email', emailRecipients: ['product@example.org'], qaEmailRecipients: ['qa@example.org'], qaAdminCc: ['admin@example.org'],
  validationRecipients: ['validation@example.org'], qaEnabled: true, emailConfirmation: true, portalUrl: '', portalApiKey: '', portalProjectKey: '',
};
const links = { studyId: 'VS-1', studyName: 'Breast model 2026', templateId: 'TPL-9', templateName: 'Breast core biopsy', templateVersion: '3.1' };
const qa = (over: Partial<EnhancementRequestPayload> = {}): EnhancementRequestPayload => ({
  title: 'Wrong grade shown', description: 'The grade differs from the template.', category: 'AI / Template validation', attachments: [], includeSystem: false, mode: 'qa', validationLinks: links, ...over,
});
const enh = (over: Partial<EnhancementRequestPayload> = {}): EnhancementRequestPayload => ({
  title: 'Add a thing', description: 'Please.', category: 'Workflow', attachments: [], includeSystem: true, mode: 'enhancement',
  metadata: { userId: 'PATH-001', userName: 'Pete Nimmo', userRole: 'superadmin', timestamp: '', appVersion: '1', browser: 'Chrome', os: 'Linux', currentPage: '/worklist' }, ...over,
});

function deps(over: Partial<SubmitDeps> = {}) {
  const sendEmail = vi.fn(async (_p: unknown) => ({ accepted: true, simulated: false } as never));
  const deliver = vi.fn(async () => ({ ok: true as const }));
  const recordSimulated = vi.fn();
  const logAudit = vi.fn(async () => undefined);
  const all: SubmitDeps = { sendEmail: sendEmail as never, deliver, recordSimulated: recordSimulated as never, logAudit, demoBuild: false, ...over };
  return { all, sendEmail, deliver, recordSimulated, logAudit };
}

describe('AI / Template validation feedback', () => {
  it('goes to the validation recipients (not the QA list), with the admin cc, and names the study and template in the email', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(qa(), base, d.all);
    expect(r).toMatchObject({ success: true, routedTo: 'validation', validationFallback: false });
    const sent = d.sendEmail.mock.calls[0][0] as { to: string[]; cc: string[]; bodyHtml: string; bodyText: string; subject: string };
    expect(sent.to).toEqual(['validation@example.org']);
    expect(sent.cc).toEqual(['admin@example.org']);
    for (const body of [sent.bodyHtml, sent.bodyText]) {
      expect(body).toContain('Breast model 2026');
      expect(body).toContain('VS-1');
      expect(body).toContain('Breast core biopsy');
      expect(body).toContain('TPL-9');
      expect(body).toContain('3.1');
    }
    expect(sent.subject).toContain('Validation Feedback');
  });

  it('falls back to the QA recipients when no validation recipients are set, and says so', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(qa(), { ...base, validationRecipients: [] }, d.all);
    expect((d.sendEmail.mock.calls[0][0] as { to: string[] }).to).toEqual(['qa@example.org']);
    expect(r).toMatchObject({ success: true, routedTo: 'qa', validationFallback: true });
  });

  it('keeps "No recipients configured." when both lists are empty, and sends nothing', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(qa(), { ...base, validationRecipients: [], qaEmailRecipients: [] }, d.all);
    expect(r).toMatchObject({ success: false, error: 'No recipients configured.' });
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(d.logAudit).not.toHaveBeenCalled();
  });

  it('audits FEEDBACK_ROUTED_TO_VALIDATION in plain English with the title and ids only', async () => {
    const d = deps();
    await submitEnhancementRequest(qa({ description: 'SECRET DESCRIPTION TEXT' }), base, d.all);
    expect(d.logAudit).toHaveBeenCalledTimes(1);
    const [event, detail] = d.logAudit.mock.calls[0] as unknown as [string, string, string];
    expect(event).toBe('FEEDBACK_ROUTED_TO_VALIDATION');
    expect(detail).toContain('Wrong grade shown');
    expect(detail).toContain('VS-1');
    expect(detail).toContain('TPL-9');
    expect(detail).not.toContain('SECRET DESCRIPTION TEXT');
    expect(detail).not.toContain('@');
  });

  it('the audit says when the QA list took it', async () => {
    const d = deps();
    await submitEnhancementRequest(qa({ validationLinks: undefined }), { ...base, validationRecipients: [] }, d.all);
    expect((d.logAudit.mock.calls[0] as unknown as string[])[1]).toContain('no validation recipients are set');
  });

  it('other QA categories still go to the QA list with no validation audit, and the links are optional', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(qa({ category: 'UI Bug', validationLinks: undefined }), base, d.all);
    expect((d.sendEmail.mock.calls[0][0] as { to: string[] }).to).toEqual(['qa@example.org']);
    expect(r.routedTo).toBeUndefined();
    expect(d.logAudit).not.toHaveBeenCalled();
    const none = buildEnhancementText(qa({ validationLinks: undefined }));
    expect(none).not.toContain('Validation study');
  });

  it('a refused email is not audited as routed', async () => {
    const d = deps({ sendEmail: (async () => ({ accepted: false })) as never });
    const r = await submitEnhancementRequest(qa(), base, d.all);
    expect(r.success).toBe(false);
    expect(d.logAudit).not.toHaveBeenCalled();
  });

  it('escapes the study and template names in the HTML body', () => {
    const html = buildEnhancementHtml(qa({ validationLinks: { ...links, studyName: '<b>x</b>' } }));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(buildEnhancementSubject(qa())).toContain('Wrong grade shown');
  });
});

describe('enhancement requests and the destination', () => {
  const portal: EnhancementRequestConfig = { ...base, mode: 'portal', portalUrl: 'https://site.test/requests?form=7' };

  it('a real build delivers to the configured address, once, with no user id, and does not email', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(enh(), portal, d.all);
    expect(r).toMatchObject({ success: true, destinationHost: 'site.test' });
    expect(r.simulated).toBeFalsy();
    expect(d.deliver).toHaveBeenCalledTimes(1);
    const [url, body] = d.deliver.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(url).toBe('https://site.test/requests?form=7');
    expect(body).toMatchObject({ title: 'Add a thing', category: 'Workflow', kind: 'enhancement-request' });
    expect(JSON.stringify(body)).not.toContain('PATH-001');
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it('the demo build never sends: the request is kept in the simulated outbox and the result says so', async () => {
    const d = deps({ demoBuild: true });
    const r = await submitEnhancementRequest(enh(), portal, d.all);
    expect(r).toMatchObject({ success: true, simulated: true, destinationHost: 'site.test' });
    expect(d.deliver).not.toHaveBeenCalled();
    expect(d.recordSimulated).toHaveBeenCalledTimes(1);
  });

  it('an unreachable destination is a plain, fixed failure that says nothing was sent', async () => {
    const d = deps({ deliver: (async () => ({ ok: false })) as never });
    const r = await submitEnhancementRequest(enh(), portal, d.all);
    expect(r).toMatchObject({ success: false, errorCode: 'DELIVERY_FAILED', error: 'The request could not be delivered to the destination. Nothing was sent.' });
  });

  it('a throwing delivery is the same fixed failure, never the raw error', async () => {
    const d = deps({ deliver: (async () => { throw new Error('ECONNRESET secret.internal'); }) as never });
    const r = await submitEnhancementRequest(enh(), portal, d.all);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r)).not.toContain('secret.internal');
  });

  it('QA feedback is still emailed when a destination is set', async () => {
    const d = deps();
    await submitEnhancementRequest(qa({ category: 'UI Bug' }), portal, d.all);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
    expect(d.deliver).not.toHaveBeenCalled();
  });

  it('portal mode with no address fails plainly', async () => {
    const d = deps();
    const r = await submitEnhancementRequest(enh(), { ...portal, portalUrl: '' }, d.all);
    expect(r).toMatchObject({ success: false, errorCode: 'NO_DESTINATION' });
  });
});

describe('the configuration used to send', () => {
  const settings = (over: Partial<FeedbackSettings>) => ({
    get: async () => ({ ok: true as const, data: { ...DEFAULT_FEEDBACK_SETTINGS, qaRecipients: ['qa@example.org'], ...over } }),
    qaButtonShown: async () => true,
  });
  it('takes the validation recipients and the administrator\'s destination from the Feedback settings', async () => {
    const c = await loadEnhancementConfigForSubmit(settings({ validationRecipients: ['v@example.org'], enhancementUrl: 'https://admin-set.test/in' }));
    expect(c).toMatchObject({ validationRecipients: ['v@example.org'], mode: 'portal', portalUrl: 'https://admin-set.test/in' });
  });
  it('with no address anywhere, enhancement requests stay email', async () => {
    const c = await loadEnhancementConfigForSubmit(settings({}));
    expect(c.mode).toBe('email');
    expect(c.portalUrl).toBe('');
  });
  it('an address that is not https is ignored', async () => {
    const c = await loadEnhancementConfigForSubmit(settings({ enhancementUrl: 'http://plain.test/in' }));
    expect(c.mode).toBe('email');
  });
});
