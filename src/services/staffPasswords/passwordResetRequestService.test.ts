// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPasswordResetRequestService, PASSWORD_RESET_CAPABILITY, RESET_REQUEST_STORAGE_KEY, RESET_NOTICE_SENDER } from './passwordResetRequestService';
import { RESET_REQUEST_WINDOW_MS, isThrottled, looksLikeEmail, recordThrottle, staffIdFromAddress, staffRecordLink } from './passwordResetRequestRules';
import { createMockStaffPasswordService } from './mockStaffPasswordService';
import { MemoryStorage } from '../browserData/dataStorage';

vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

const ROLES = [
  { id: 'r-admin', name: 'Admin', capabilities: [PASSWORD_RESET_CAPABILITY, 'config:staff:edit'] },
  { id: 'r-path', name: 'Pathologist', capabilities: [] },
];
const staff = (id: string, roles: string[], over: Record<string, unknown> = {}) =>
  ({ id, firstName: id, lastName: 'Test', email: `${id.toLowerCase()}@lab.org`, roles, status: 'Active', ...over });
const USERS = [staff('Sam', ['Pathologist']), staff('Ada', ['Admin']), staff('Bo', ['Admin']), staff('Gone', ['Admin'], { status: 'Inactive' }), staff('Off', ['Pathologist'], { status: 'Inactive' })];

function setup(over: { users?: unknown[] } = {}) {
  let t = Date.parse('2026-10-28T10:00:00Z');
  const sent: Record<string, unknown>[] = [];
  const replies: { id: string; sender: string; text: string }[] = [];
  const audit: { event: string; detail: string; user: string }[] = [];
  const svc = createPasswordResetRequestService({
    users: { getAll: async () => ({ ok: true, data: (over.users ?? USERS) as never }) },
    roles: { getAll: async () => ({ ok: true, data: ROLES as never }) },
    messages: {
      send: async m => { sent.push(m as never); return { ok: true, data: { ...m, id: `m${sent.length}` } as never }; },
      reply: async (id, _s, sender, text) => { replies.push({ id, sender, text }); return { ok: true, data: {} as never }; },
    },
    audit: { logEvent: async e => { audit.push(e as never); return { ok: true, data: undefined } as never; } },
    store: new MemoryStorage(),
    now: () => t,
    session: () => ({ id: 'Ada', name: 'Ada Test' }),
    demoEmails: async () => [{ email: 'sam.demo@pathscribe.ai', id: 'Sam' }],
    available: () => true,
  });
  return { svc, sent, replies, audit, advance: (ms: number) => { t += ms; } };
}

describe('password reset request (Batch 711)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('a known email sends an urgent message to every other active holder of the capability, linking the Staff record', async () => {
    const { svc, sent } = setup();
    expect(await svc.request(' Sam@Lab.org ')).toEqual({ ok: true, data: 'accepted' });
    expect(sent.map(m => m.recipientId).sort()).toEqual(['Ada', 'Bo']); // not Sam, not the inactive admin
    expect(sent[0]).toMatchObject({ isUrgent: true, senderId: RESET_NOTICE_SENDER.id, configLink: staffRecordLink('Sam') });
    expect(String(sent[0].body)).toContain('sam@lab.org');
    expect(String(sent[0].subject)).toContain('Sam Test');
  });

  it('a built-in demo sign-in email is matched to its staff record', async () => {
    const { svc, sent } = setup();
    await svc.request('Sam.Demo@pathscribe.ai');
    expect(sent).toHaveLength(2);
  });

  it('an unknown or inactive email gets the same neutral answer and sends nothing', async () => {
    const { svc, sent, audit } = setup();
    const known = await svc.request('sam@lab.org');
    const unknown = await svc.request('nobody@lab.org');
    const inactive = await svc.request('off@lab.org');
    expect(unknown).toEqual(known);
    expect(inactive).toEqual(known);
    expect(sent).toHaveLength(2); // only Sam's two
    expect(audit.filter(a => a.event === 'PASSWORD_RESET_REQUESTED')).toHaveLength(3); // all three attempts audited
    expect(await svc.openRequests()).toHaveLength(1); // unknown emails are never stored as requests
  });

  it('writes PASSWORD_RESET_REQUESTED with literal English detail and no password', async () => {
    const { svc, audit } = setup();
    await svc.request('sam@lab.org');
    const a = audit.find(e => e.event === 'PASSWORD_RESET_REQUESTED')!;
    expect(a.detail).toBe('Sign-in password reset requested from the sign-in screen for staff record Sam. Urgent message sent to 2 administrators.');
    expect(a.user).toBe('Sign-in screen (not signed in)');
  });

  it('allows one request per email per 10 minutes, answering the repeat the same way', async () => {
    const { svc, sent, advance } = setup();
    await svc.request('sam@lab.org');
    expect(await svc.request('SAM@lab.org')).toEqual({ ok: true, data: 'accepted' });
    expect(sent).toHaveLength(2);
    advance(RESET_REQUEST_WINDOW_MS - 1000);
    await svc.request('sam@lab.org');
    expect(sent).toHaveLength(2);
    advance(2000);
    await svc.request('sam@lab.org');
    expect(sent).toHaveLength(4);
  });

  it('refuses only a malformed address, and nothing at all when password sign-in is not available (SSO)', async () => {
    const { svc, sent } = setup();
    expect(await svc.request('not an email')).toEqual({ ok: true, data: 'invalidEmail' });
    const sso = createPasswordResetRequestService({ users: { getAll: async () => ({ ok: true, data: USERS as never }) }, roles: { getAll: async () => ({ ok: true, data: ROLES as never }) },
      messages: { send: async () => { throw new Error('must not send'); }, reply: async () => { throw new Error('no'); } }, audit: { logEvent: async () => { throw new Error('no'); } }, store: new MemoryStorage(), available: () => false });
    expect(await sso.request('sam@lab.org')).toEqual({ ok: true, data: 'unavailable' });
    expect(sent).toHaveLength(0);
  });

  it('with nobody holding the capability, still accepts, audits it and says so', async () => {
    const { svc, sent, audit } = setup({ users: [staff('Sam', ['Pathologist'])] });
    expect(await svc.request('sam@lab.org')).toEqual({ ok: true, data: 'accepted' });
    expect(sent).toHaveLength(0);
    expect(audit[0].detail).toContain('nobody holds config:staff-password:manage');
  });

  it('handled: marking closes the request, replies to each administrator message and audits it', async () => {
    const { svc, replies, audit } = setup();
    await svc.request('sam@lab.org');
    expect(await svc.openRequests()).toHaveLength(1);
    expect(await svc.markHandled('Sam')).toBe(1);
    expect(await svc.openRequests()).toHaveLength(0);
    expect(replies.map(r => r.id).sort()).toEqual(['m1', 'm2']);
    expect(replies[0]).toMatchObject({ sender: 'Ada Test' });
    expect(replies[0].text).toContain('Handled');
    expect(audit.some(a => a.event === 'PASSWORD_RESET_REQUEST_HANDLED')).toBe(true);
    expect(await svc.markHandled('Sam')).toBe(0); // nothing left to close
  });

  it('an administrator setting the password in Staff marks the open request handled', async () => {
    const { svc } = setup();
    await svc.request('sam@lab.org');
    const passwords = createMockStaffPasswordService({ resetRequests: svc });
    vi.spyOn(await import('../users/mockUserService'), 'mockUserService', 'get').mockReturnValue({ getById: async () => ({ ok: true, data: { id: 'Sam', email: 'sam@lab.org' } }), getAll: async () => ({ ok: true, data: [] }) } as never);
    expect((await passwords.set('Sam', 'correct horse battery', { mustChange: true })).ok).toBe(true);
    expect(await svc.openRequests()).toHaveLength(0);
    expect(JSON.stringify(localStorage.getItem(RESET_REQUEST_STORAGE_KEY))).not.toContain('correct horse');
  });
});

describe('password reset request rules', () => {
  it('checks the shape of an email, the window and the link', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
    const t = recordThrottle({}, 'A@b.co', 1000);
    expect(isThrottled(t, 'a@b.co', 1000 + RESET_REQUEST_WINDOW_MS - 1)).toBe(true);
    expect(isThrottled(t, 'a@b.co', 1000 + RESET_REQUEST_WINDOW_MS)).toBe(false);
    expect(staffIdFromAddress(staffRecordLink('PATH-001').split('?')[1] ? '?' + staffRecordLink('PATH-001').split('?')[1] : '')).toBe('PATH-001');
  });
});
