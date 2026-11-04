import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail, postTemplateLifecycleEvent } from './notificationService';
import { clearSimulatedEmails, listSimulatedEmails, resetSimulatedMailForTests, isNoMailServerStatus } from './simulatedMailOutbox';

const mail = { to: ['a@lab.example'], subject: 'Hello', bodyText: 'text', bodyHtml: '<p>text</p>', metadata: { k: 'v' } };
const evt = { action: 'submitted_for_review', templateId: 't1', templateName: 'Breast', triggeredByName: 'Dr X', occurredAt: '2026-10-17T10:00:00Z', appBaseUrl: 'https://app.example' } as never;

describe('simulated mail outbox (Batch 604)', () => {
  beforeEach(() => { resetSimulatedMailForTests(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('keeps the e-mail when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await sendEmail(mail)).toBe(true);
    const [m] = listSimulatedEmails();
    expect(m.simulated).toBe(true);
    expect(m.subject).toBe('Hello');
    expect(m.to).toEqual(['a@lab.example']);
  });

  it('keeps the e-mail when the server says there is no such endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }));
    expect(await sendEmail(mail)).toBe(true);
    expect(listSimulatedEmails()).toHaveLength(1);
  });

  it('does NOT simulate a real refusal from a real server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'no' }));
    expect(await sendEmail(mail)).toBe(false);
    expect(listSimulatedEmails()).toHaveLength(0);
    expect(isNoMailServerStatus(403)).toBe(false);
  });

  it('records nothing when the server accepts the message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' }));
    expect(await sendEmail(mail)).toBe(true);
    expect(listSimulatedEmails()).toHaveLength(0);
  });

  it('keeps a template lifecycle event as a labelled e-mail with server-chosen recipients', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(await postTemplateLifecycleEvent(evt)).toBe(true);
    const [m] = listSimulatedEmails();
    expect(m.kind).toBe('template-event');
    expect(m.to).toEqual([]);
    expect(m.bodyText).toContain('Breast');
  });

  it('can be cleared', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await sendEmail(mail);
    clearSimulatedEmails('tester');
    expect(listSimulatedEmails()).toHaveLength(0);
  });
});
