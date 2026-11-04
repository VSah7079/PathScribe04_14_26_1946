// src/services/staffPasswords/passwordResetRequestService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 711 (Pete, Oct 28, 2026: "Need a mechanism, when not SSO, to notify
// Admin to reset the Password"): the sign-in screen's "Ask my administrator to
// reset my password".
//
// DEMO BUILD ONLY. A server deployment signs in through the customer's identity
// provider and has no password to reset; this action is not shown there and the
// service refuses ('unavailable'). docs/architecture/PASSWORD_RESET_REQUEST_API.md
// is the contract for a server version.
//
// request(email), called before anyone is signed in:
//   1. A request for an email already used in the last 10 minutes is dropped
//      (a per-email limit) and answered exactly like a new one.
//   2. PASSWORD_RESET_REQUESTED is written to the audit log (no password is
//      involved; the detail is literal English, services/auditlog/README.md).
//   3. If the email belongs to an active staff record, an urgent internal
//      message goes to every other active staff member who holds
//      config:staff-password:manage (the capability behind Staff → Sign-in
//      password), naming the person and email and linking to their Staff record.
//   4. The caller always gets the same answer ('accepted') whether or not the
//      email matches an account, so the form cannot be used to find out who has
//      an account. Only a malformed address is refused ('invalidEmail'), which
//      says nothing about accounts.
//
// markHandled(staffId, by): called by the staff password service when an
// administrator sets the password. The open request is marked handled, each
// administrator's message gets a reply saying who handled it and when (the
// message model has no handled flag of its own), and the audit log records it.
//
// Unauthenticated by design: there is no signed-in person to check a capability
// for, so request() enforces none. It exposes nothing (it returns no data about
// any account) and changes nothing except adding a message and an audit entry
// for administrators, limited by the per-email rate limit. The admin-side steps
// stay protected: only a holder of config:staff-password:manage can set the
// password, and only that holder is notified.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { IAuditService } from '../auditlog/IAuditService';
import type { IMessageService } from '../messages/IMessageService';
import type { IRoleService } from '../roles/IRoleService';
import type { IUserService, StaffUser } from '../users/IUserService';
import { dataStorage } from '../browserData/dataStorage';
import { readSessionProfile } from '../auth/sessionProfile';
import { evaluateCapability } from '../authorization/evaluateCapability';
import { passwordSignInAvailable } from './passwordSignInAvailable';
import {
  RESET_EMAIL_MAX_LENGTH, isThrottled, looksLikeEmail, normaliseResetEmail, recordThrottle, staffRecordLink, type ResetThrottle,
} from './passwordResetRequestRules';

export const PASSWORD_RESET_CAPABILITY = 'config:staff-password:manage';
export const RESET_REQUEST_STORAGE_KEY = 'password_reset_requests';
export const RESET_THROTTLE_STORAGE_KEY = 'password_reset_throttle';

/** Sender of the notices: not a person, so there is no inbox behind it. */
export const RESET_NOTICE_SENDER = { id: 'system-sign-in', name: 'PathScribe sign-in' } as const;

export type PasswordResetRequestOutcome = 'accepted' | 'invalidEmail' | 'unavailable';

/** A request that matched an active staff record. Unknown emails are audited but never stored. */
export interface PasswordResetRequestRecord {
  id: string;
  staffId: string;
  email: string;
  requestedAt: string;
  status: 'open' | 'handled';
  handledAt?: string;
  handledBy?: string;
  /** The administrators' messages, so a reply can be added when it is handled. */
  messageIds: string[];
}

export interface IPasswordResetRequestService {
  /** From the sign-in screen, before sign-in. The same answer whether or not the email matches an account. */
  request(email: string): Promise<ServiceResult<PasswordResetRequestOutcome>>;
  /** An administrator set this person's password: close the open request. Returns how many were closed. */
  markHandled(staffId: string): Promise<number>;
  /** Open requests, newest first (for the Staff screen). */
  openRequests(): Promise<PasswordResetRequestRecord[]>;
}

export interface PasswordResetRequestDeps {
  users: Pick<IUserService, 'getAll'>;
  roles: Pick<IRoleService, 'getAll'>;
  messages: Pick<IMessageService, 'send' | 'reply'>;
  audit: Pick<IAuditService, 'logEvent'>;
  store?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
  /** Who is signed in when an administrator sets the password. */
  session?: () => { id: string; name: string } | null;
  /** Built-in demo sign-in emails (email → staff id); they can differ from the staff record's email. */
  demoEmails?: () => Promise<{ email: string; id: string }[]>;
  available?: () => boolean;
}

const readJson = <T,>(store: Pick<Storage, 'getItem'>, key: string, fallback: T): T => {
  try { const raw = store.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};

const defaultDemoEmails = async () => (__DEMO_TOOLS__ && passwordSignInAvailable()
  ? (await import('../auth/demo/demoAccounts')).DEMO_ACCOUNTS.map(a => ({ email: a.email, id: a.id }))
  : []);

const fullName = (u: StaffUser) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;

export function createPasswordResetRequestService(deps: PasswordResetRequestDeps): IPasswordResetRequestService {
  const store = deps.store ?? dataStorage;
  const now = deps.now ?? Date.now;
  const available = deps.available ?? passwordSignInAvailable;
  const session = deps.session ?? readSessionProfile;
  const demoEmails = deps.demoEmails ?? defaultDemoEmails;

  const loadRequests = () => readJson<PasswordResetRequestRecord[]>(store, RESET_REQUEST_STORAGE_KEY, []);
  const saveRequests = (all: PasswordResetRequestRecord[]) => store.setItem(RESET_REQUEST_STORAGE_KEY, JSON.stringify(all));
  const log = (event: string, detail: string, user: string) =>
    deps.audit.logEvent({ type: 'user', event, detail, user, caseId: null, confidence: null }).catch(() => {});

  /** The active staff record this sign-in email belongs to (the staff email, or a built-in demo sign-in email). */
  async function activeStaffFor(email: string, all: StaffUser[]): Promise<StaffUser | null> {
    const byEmail = all.find(u => normaliseResetEmail(u.email ?? '') === email);
    const demoId = byEmail ? null : (await demoEmails()).find(d => normaliseResetEmail(d.email) === email)?.id;
    const staff = byEmail ?? (demoId ? all.find(u => u.id === demoId) : undefined);
    return staff && staff.status === 'Active' ? staff : null;
  }

  /** Active staff other than the requester who hold the capability, judged by their own roles. */
  async function administratorsFor(requester: StaffUser, all: StaffUser[]): Promise<StaffUser[]> {
    const rolesRes = await deps.roles.getAll();
    const roles = rolesRes.ok ? rolesRes.data : [];
    return all.filter(u => u.status === 'Active' && u.id !== requester.id
      && evaluateCapability({ userId: u.id, userName: fullName(u), sessionRole: null, staffRoles: u.roles ?? [], facilityIds: u.facilityIds ?? [] }, PASSWORD_RESET_CAPABILITY, roles).allowed);
  }

  return {
    async request(rawEmail) {
      if (!available()) return { ok: true, data: 'unavailable' };
      if (!looksLikeEmail(rawEmail)) return { ok: true, data: 'invalidEmail' };
      const email = normaliseResetEmail(rawEmail);
      const nowMs = now();

      const throttle = readJson<ResetThrottle>(store, RESET_THROTTLE_STORAGE_KEY, {});
      if (isThrottled(throttle, email, nowMs)) return { ok: true, data: 'accepted' };
      store.setItem(RESET_THROTTLE_STORAGE_KEY, JSON.stringify(recordThrottle(throttle, email, nowMs)));

      const usersRes = await deps.users.getAll();
      const all = usersRes.ok ? usersRes.data : [];
      const staff = await activeStaffFor(email, all);
      const shown = email.slice(0, RESET_EMAIL_MAX_LENGTH);

      if (!staff) {
        await log('PASSWORD_RESET_REQUESTED', `Sign-in password reset requested from the sign-in screen for ${shown}: no active staff record matches. No message sent.`, 'Sign-in screen (not signed in)');
        return { ok: true, data: 'accepted' };
      }

      const admins = await administratorsFor(staff, all);
      const requestedAt = new Date(nowMs).toISOString();
      const name = fullName(staff);
      const sent = await Promise.all(admins.map(a => deps.messages.send({
        senderId: RESET_NOTICE_SENDER.id,
        senderName: RESET_NOTICE_SENDER.name,
        recipientId: a.id,
        recipientName: fullName(a),
        subject: `Password reset requested: ${name}`,
        body: `${name} (${email}) asked on the sign-in screen for an administrator to reset their password. Open their Staff record, choose Sign-in password and set a new one. Confirm it is really them before you pass the new password on.`,
        configLink: staffRecordLink(staff.id),
        timestamp: new Date(nowMs),
        isUrgent: true,
      })));
      const messageIds = sent.flatMap(r => (r.ok ? [r.data.id] : []));
      saveRequests([{ id: `rr-${nowMs}-${staff.id}`, staffId: staff.id, email, requestedAt, status: 'open', messageIds }, ...loadRequests()]);
      await log('PASSWORD_RESET_REQUESTED',
        `Sign-in password reset requested from the sign-in screen for staff record ${staff.id}. Urgent message sent to ${messageIds.length} administrator${messageIds.length === 1 ? '' : 's'}${admins.length === 0 ? ' (nobody holds ' + PASSWORD_RESET_CAPABILITY + ')' : ''}.`,
        'Sign-in screen (not signed in)');
      return { ok: true, data: 'accepted' };
    },

    async markHandled(staffId) {
      const all = loadRequests();
      const open = all.filter(r => r.staffId === staffId && r.status === 'open');
      if (open.length === 0) return 0;
      const by = session();
      const handledAt = new Date(now()).toISOString();
      saveRequests(all.map(r => (open.includes(r) ? { ...r, status: 'handled', handledAt, handledBy: by?.id ?? 'unknown' } : r)));
      for (const r of open) {
        for (const id of r.messageIds) {
          await deps.messages.reply(id, by?.id ?? RESET_NOTICE_SENDER.id, by?.name ?? RESET_NOTICE_SENDER.name, `Handled: a new sign-in password was set in Staff at ${handledAt}.`);
        }
        await log('PASSWORD_RESET_REQUEST_HANDLED', `Sign-in password reset request for staff record ${staffId} handled: a password was set in Staff.`, by?.name ?? by?.id ?? 'unknown');
      }
      return open.length;
    },

    async openRequests() {
      return loadRequests().filter(r => r.status === 'open');
    },
  };
}
