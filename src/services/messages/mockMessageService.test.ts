// @vitest-environment happy-dom
// Batch 385: sending needs message:internal:send / message:secure-email:send, checked in the service.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce, store } = vi.hoisted(() => ({ enforce: vi.fn(), store: new Map<string, unknown>() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
vi.mock('../mockStorage', () => ({
  storageGet: (k: string, d: unknown) => (store.has(k) ? store.get(k) : d),
  storageSet: (k: string, v: unknown) => { store.set(k, v); },
}));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async () => undefined) } }));

import { mockMessageService } from './mockMessageService';
import { MESSAGE_NOT_PERMITTED } from './IMessageService';

const draft = { senderId: 'u1', senderName: 'Dr. A', recipientId: 'u2', recipientName: 'Lab Manager', subject: 'S', body: 'B', timestamp: new Date(), isUrgent: false };

beforeEach(() => { enforce.mockReset(); enforce.mockResolvedValue({ allowed: true }); store.clear(); });

describe('mockMessageService permissions', () => {
  it('lists the recipients', async () => {
    const r = await mockMessageService.listRecipients();
    expect(r.ok === true && r.data.length > 10 && r.data[0].id === 'u2').toBe(true);
  });
  it('send needs message:internal:send', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const r = await mockMessageService.send(draft, { composedByPerson: true });
    expect(enforce).toHaveBeenCalledWith('message:internal:send');
    expect(r.ok === false && r.error).toBe(MESSAGE_NOT_PERMITTED);
    enforce.mockResolvedValue({ allowed: true });
    expect((await mockMessageService.send(draft, { composedByPerson: true })).ok).toBe(true);
  });
  it('a notice the app sends itself is not held to the permission, so access requests still work', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect((await mockMessageService.send(draft)).ok).toBe(true);
    expect(enforce).not.toHaveBeenCalled();
  });
  it('reply needs message:internal:send', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const r = await mockMessageService.reply('m1', 'u1', 'Dr. A', 'text', { composedByPerson: true });
    expect(enforce).toHaveBeenCalledWith('message:internal:send');
    expect(r.ok === false && r.error).toBe(MESSAGE_NOT_PERMITTED);
  });
  it('a secure email needs message:secure-email:send', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const r = await mockMessageService.sendSecureEmail({ fromName: 'A', fromEmail: 'a@x.org', to: 'b@x.org', subject: 'S', body: 'B' });
    expect(enforce).toHaveBeenCalledWith('message:secure-email:send');
    expect(r.ok === false && r.error).toBe(MESSAGE_NOT_PERMITTED);
  });
});
