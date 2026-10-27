// src/services/auth/signOutPolicy/signOutPolicy.ts
// ─────────────────────────────────────────────────────────────────
// Batch 642: the sign-out authentication policy. Pure.
//
// How a person proves who they are when they sign a case out:
//   strict   a password (and a second factor, when asked) every time
//   session  once, then no prompt until the sign-out session ends
//
// One enterprise default; each performing facility may override it; an
// enterprise administrator can lock the overrides so every facility follows
// the default. The facility that applies is the case's performing facility.
//
// A sign-out session ends on: timeout, logout, a change of role (privilege
// elevation), or a workstation lock. The browser cannot see a workstation
// lock; phase 2e supplies it from the server (docs/architecture/
// SIGN_OUT_AUTHENTICATION.md), and expireSignOutSession('workstation_lock')
// is the entry point it will use. Remote sign-out restriction by network is
// also phase 2e: the server classifies the client address.
// ─────────────────────────────────────────────────────────────────

import type { SigningAction } from '../signerConfirmation';

export const SIGN_OUT_MODES = ['strict', 'session'] as const;
export type SignOutMode = typeof SIGN_OUT_MODES[number];

/** The session lengths an administrator can choose (minutes). */
export const SIGN_OUT_TIMEOUT_MINUTES = [15, 30, 60, 240] as const;
export type SignOutTimeoutMinutes = typeof SIGN_OUT_TIMEOUT_MINUTES[number];

export interface SignOutAuthPolicy {
  mode: SignOutMode;
  /** Ask for a second factor at sign-out (after the password). */
  mfa: boolean;
  /** How long a sign-out session lasts (session mode only). */
  timeoutMinutes: SignOutTimeoutMinutes;
}

export const SIGN_OUT_POLICY_DEFAULT: SignOutAuthPolicy = { mode: 'strict', mfa: false, timeoutMinutes: 30 };

export interface SignOutPolicyConfig {
  enterprise: SignOutAuthPolicy;
  /** Facility id → that facility's own policy. */
  overrides: Record<string, SignOutAuthPolicy>;
  /** When true the overrides are kept but not used. */
  overridesLocked: boolean;
}

export const SIGN_OUT_CONFIG_DEFAULT: SignOutPolicyConfig = { enterprise: SIGN_OUT_POLICY_DEFAULT, overrides: {}, overridesLocked: false };

/** The signing actions this policy governs: every sign-out workflow. */
export const SIGN_OUT_POLICY_ACTIONS: readonly SigningAction[] = ['case-sign-out', 'countersign', 'cytology-sign-out'];
export const isSignOutPolicyAction = (action: SigningAction): boolean => SIGN_OUT_POLICY_ACTIONS.includes(action);

export function normaliseSignOutPolicy(raw: Partial<SignOutAuthPolicy> | null | undefined): SignOutAuthPolicy {
  return {
    mode: SIGN_OUT_MODES.includes(raw?.mode as SignOutMode) ? raw!.mode as SignOutMode : SIGN_OUT_POLICY_DEFAULT.mode,
    mfa: raw?.mfa === true,
    timeoutMinutes: SIGN_OUT_TIMEOUT_MINUTES.includes(raw?.timeoutMinutes as SignOutTimeoutMinutes)
      ? raw!.timeoutMinutes as SignOutTimeoutMinutes : SIGN_OUT_POLICY_DEFAULT.timeoutMinutes,
  };
}

export function normaliseSignOutConfig(raw: Partial<SignOutPolicyConfig> | null | undefined): SignOutPolicyConfig {
  const overrides: Record<string, SignOutAuthPolicy> = {};
  for (const [id, p] of Object.entries(raw?.overrides ?? {})) if (id) overrides[id] = normaliseSignOutPolicy(p);
  return { enterprise: normaliseSignOutPolicy(raw?.enterprise), overrides, overridesLocked: raw?.overridesLocked === true };
}

export interface ActiveSignOutPolicy {
  policy: SignOutAuthPolicy;
  source: 'enterprise' | 'facility';
  facilityId: string | null;
  /** The facility has an override, but the lock means it is not used. */
  overrideIgnored: boolean;
}

/** The policy that applies to a case performed at `facilityId`. */
export function resolveSignOutPolicy(config: SignOutPolicyConfig, facilityId: string | null | undefined): ActiveSignOutPolicy {
  const id = facilityId || null;
  const override = id ? config.overrides[id] : undefined;
  if (override && !config.overridesLocked) return { policy: override, source: 'facility', facilityId: id, overrideIgnored: false };
  return { policy: config.enterprise, source: 'enterprise', facilityId: id, overrideIgnored: !!override };
}

// ── The sign-out session ────────────────────────────────────────────────────

export const SIGN_OUT_EXPIRY_REASONS = ['timeout', 'workstation_lock', 'logout', 'privilege_elevation'] as const;
export type SignOutExpiryReason = typeof SIGN_OUT_EXPIRY_REASONS[number];

export interface SignOutSession {
  /** Ties the audit entries of one session together. */
  sessionId: string;
  userId: string;
  /** For the audit entry when the session ends after the profile is gone (logout). */
  userName: string;
  role: string;
  facilityId: string | null;
  authenticatedAt: string;
  method: 'password' | 'sso' | 'biometric';
  /** A second factor was part of this authentication. */
  mfa: boolean;
}

export type SignOutSessionState =
  | { kind: 'prompt'; why: 'strict' | 'none' }
  | { kind: 'prompt'; why: 'expired'; reason: SignOutExpiryReason }
  | { kind: 'valid'; session: SignOutSession };

/** Does this person still hold a sign-out session under this policy? */
export function evaluateSignOutSession(
  active: ActiveSignOutPolicy,
  session: SignOutSession | null,
  who: { userId: string; role: string },
  now: Date,
): SignOutSessionState {
  if (active.policy.mode === 'strict') return { kind: 'prompt', why: 'strict' };
  if (!session) return { kind: 'prompt', why: 'none' };
  if (session.userId !== who.userId) return { kind: 'prompt', why: 'none' };
  if (session.role !== who.role) return { kind: 'prompt', why: 'expired', reason: 'privilege_elevation' };
  // A session proved under one facility's rules does not carry to another's.
  if (session.facilityId !== active.facilityId) return { kind: 'prompt', why: 'none' };
  const age = (now.getTime() - Date.parse(session.authenticatedAt)) / 60_000;
  if (!Number.isFinite(age) || age < 0 || age >= active.policy.timeoutMinutes) return { kind: 'prompt', why: 'expired', reason: 'timeout' };
  return { kind: 'valid', session };
}

/** What the Sign Out button says and why (story: the button reflects the state). */
export interface SignOutButtonState {
  passwordRequired: boolean;
  /** Translation key suffix for the tooltip. */
  tooltip: 'authenticated' | 'strict' | 'expired' | 'none';
}

export function signOutButtonState(state: SignOutSessionState): SignOutButtonState {
  if (state.kind === 'valid') return { passwordRequired: false, tooltip: 'authenticated' };
  return { passwordRequired: true, tooltip: state.why };
}

// ── Audit text ──────────────────────────────────────────────────────────────

export const describePolicy = (p: SignOutAuthPolicy): string =>
  `${p.mode === 'strict' ? 'password every sign-out' : `password once per session (${p.timeoutMinutes} min)`}${p.mfa ? ', second factor at sign-out' : ''}`;

/** The configuration, as rows an auditor can read and export. */
export interface SignOutPolicyExportRow {
  scope: 'Enterprise default' | 'Facility override';
  facilityId: string;
  facilityName: string;
  mode: SignOutMode;
  mfa: boolean;
  timeoutMinutes: number | '';
  /** The row that governs cases at that facility today. */
  active: boolean;
}

export function signOutPolicyExportRows(config: SignOutPolicyConfig, facilities: ReadonlyArray<{ id: string; name: string }>): SignOutPolicyExportRow[] {
  const rows: SignOutPolicyExportRow[] = [{
    scope: 'Enterprise default', facilityId: '', facilityName: '', mode: config.enterprise.mode, mfa: config.enterprise.mfa,
    timeoutMinutes: config.enterprise.mode === 'session' ? config.enterprise.timeoutMinutes : '', active: true,
  }];
  for (const f of facilities) {
    const o = config.overrides[f.id];
    if (!o) continue;
    rows.push({
      scope: 'Facility override', facilityId: f.id, facilityName: f.name, mode: o.mode, mfa: o.mfa,
      timeoutMinutes: o.mode === 'session' ? o.timeoutMinutes : '', active: !config.overridesLocked,
    });
  }
  return rows;
}

const csvCell = (v: string | number | boolean): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function signOutPolicyCsv(rows: SignOutPolicyExportRow[]): string {
  const head = ['Scope', 'Facility ID', 'Facility', 'Mode', 'Second factor', 'Session minutes', 'Governs cases'];
  const lines = rows.map(r => [r.scope, r.facilityId, r.facilityName, r.mode, r.mfa ? 'yes' : 'no', r.timeoutMinutes, r.active ? 'yes' : 'no'].map(csvCell).join(','));
  return [head.join(','), ...lines].join('\n') + '\n';
}

/** What is known about the device (a browser hint only; the server records the real address in phase 2e). */
export function deviceFingerprintOf(parts: { userAgent?: string; platform?: string; language?: string; screen?: string }): string {
  const text = [parts.userAgent, parts.platform, parts.language, parts.screen].map(x => x ?? '').join('|');
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `dev-${h.toString(16).padStart(8, '0')}`;
}

export interface SignOutAuditContext {
  user: string;
  facilityId: string | null;
  facilityName?: string | null;
  enterprise: SignOutAuthPolicy;
  facilityOverride: SignOutAuthPolicy | null;
  overrideIgnored: boolean;
  sessionId: string | null;
  methods: string[];
  at: string;
  caseId: string | null;
  deviceFingerprint: string;
  network: string;
}

/** One line carrying every fact the audit trail needs for a sign-out authentication. */
export function signOutAuditDetail(c: SignOutAuditContext): string {
  return [
    `user ${c.user}`,
    `facility ${c.facilityName || c.facilityId || 'none'}`,
    `enterprise policy: ${describePolicy(c.enterprise)}`,
    `facility override: ${c.facilityOverride ? `${describePolicy(c.facilityOverride)}${c.overrideIgnored ? ' (locked, not used)' : ''}` : 'none'}`,
    `session ${c.sessionId ?? 'none'}`,
    `authentication ${c.methods.join(' + ') || 'none'}`,
    `at ${c.at}`,
    `case ${c.caseId ?? 'none'}`,
    `device ${c.deviceFingerprint}`,
    `network ${c.network}`,
  ].join('; ');
}
