// @vitest-environment happy-dom
// Batch 385: sending needs message:internal:send / message:secure-email:send, checked in the service.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce, store } = vi.hoisted(() => ({ enforce: vi.fn(), store: new Map<string, unknown>() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
vi.mock('../mockStorage', () => ({
  storageGet: (k: string, d: unknown) => (store.has(k) ? store.get(k) : d),
  storageSet: (k: string, v: unknown) => { store.set(k, v); },
  storageClear: (k: string) => { store.delete(k); },
  storageRemove: (k: string) => { store.delete(k); },
}));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async () => undefined) } }));
// Batch 517 (PS-143): a lab with Paubox (BAA on file) and Virtru (none).
const { forOrganisation } = vi.hoisted(() => ({ forOrganisation: vi.fn() }));
vi.mock('../secureMessaging/mockSecureMessagingConfigService', () => ({ mockSecureMessagingConfigService: { forOrganisation } }));
const LAB = { facilityId: 'c-ent-dvmc', defaultGatewayId: 'PAUBOX', gateways: [
  { gatewayId: 'PAUBOX', enabled: true, agreement: { kind: 'BAA', reference: 'BAA-1', signedOn: '2020-01-01' } },
  { gatewayId: 'VIRTRU', enabled: true },
] };

import { mockMessageService } from './mockMessageService';
import { MESSAGE_NOT_PERMITTED } from './IMessageService';

const EMAIL = { fromName: 'A', fromEmail: 'a@x.org', to: 'b@x.org', subject: 'S', body: 'B', organisationId: 'ORG-DVMC' };
const draft = { senderId: 'u1', senderName: 'Dr. A', recipientId: 'u2', recipientName: 'Lab Manager', subject: 'S', body: 'B', timestamp: new Date(), isUrgent: false };

beforeEach(() => { enforce.mockReset(); enforce.mockResolvedValue({ allowed: true }); store.clear(); forOrganisation.mockResolvedValue({ ok: true, data: LAB }); });

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
    const r = await mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'PAUBOX', containsPatientData: true });
    expect(enforce).toHaveBeenCalledWith('message:secure-email:send');
    expect(r.ok === false && r.error).toBe(MESSAGE_NOT_PERMITTED);
  });
  it('patient data goes only through a gateway with its agreement in force, each gateway checked on its own (Batch 517)', async () => {
    expect(await mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'VIRTRU', containsPatientData: true })).toEqual({ ok: false, error: 'noAgreementForPatientData' });
    expect(await mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'ZIX', containsPatientData: false })).toEqual({ ok: false, error: 'gatewayNotAvailable' });
    forOrganisation.mockResolvedValue({ ok: true, data: null });
    expect(await mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'PAUBOX', containsPatientData: false })).toEqual({ ok: false, error: 'noGatewayConfigured' });
    forOrganisation.mockResolvedValue({ ok: true, data: LAB });
    // The simulated send takes 1.8 s; both run together.
    const [covered, uncoveredNoPhi] = await Promise.all([
      mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'PAUBOX', containsPatientData: true }),
      mockMessageService.sendSecureEmail({ ...EMAIL, gatewayId: 'VIRTRU', containsPatientData: false }),
    ]);
    expect(covered.ok).toBe(true);
    expect(uncoveredNoPhi.ok).toBe(true);
  });
});
