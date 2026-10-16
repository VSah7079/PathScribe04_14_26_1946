// src/services/auth/sessionProfile.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-60 (Batch 343): the signed-in user's session profile, and where it is
// kept. AuthContext re-exports SessionProfile as `User`, so the ~60 screens
// that call useAuth() are unchanged.
//
// The profile is stored under the same browser key as before
// ('pathscribe-user'), so getSessionUser() in caseAccessControl.ts, the
// scan-station fallback and existing tests keep reading it. It moved here
// from AuthContext so the UI layer no longer touches browser storage.
//
// The profile is a display and routing convenience. It is not proof of
// identity: with SSO, the API server decides who the caller is from the
// bearer token on every request (docs/architecture/AUTHENTICATION_OIDC.md).
// ─────────────────────────────────────────────────────────────────────────────

import type { VoiceProfileId } from '../../constants/voiceProfiles';
import type { StaffUser } from '../users/IUserService';
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';

export type AppRole = 'pathologist' | 'admin' | 'pathologist-admin' | 'superadmin';

/** How this session was signed in. */
export type AuthMethod = 'password' | 'sso';

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  initials: string;
  voiceProfile: VoiceProfileId;
  // Signature-block fields, resolved from the StaffUser record at sign-in.
  credentials?: string;
  signatureUrl?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  canViewPediatric?: boolean;
  canViewOrchestration?: boolean;
  /** Cross-tenant QA/compliance reporting (StaffUser.canAccessCrossTenantQa). */
  canAccessCrossTenantQa?: boolean;
  /** The tenant boundary (StaffUser.organisationId); read by caseAccessControl.ts. */
  organisationId?: string;
  /** The user's home scan station (StaffUser.defaultScanStationId). */
  defaultScanStationId?: string;
  /** PS-60. Absent on sessions stored before Batch 343, which were all password sign-ins. */
  authMethod?: AuthMethod;
  /** PS-60. The SSO provider this session came from ('microsoft', 'oidc'). */
  ssoProviderId?: string;
  /** PS-60 (Batch 344). The SSO account this session belongs to (token
   *  issuer + permanent account id), so a signature confirmation can
   *  check the same person signed in again. */
  ssoIssuer?: string;
  ssoSubject?: string;
}

export const SESSION_PROFILE_STORAGE_KEY = 'pathscribe-user';

/**
 * Batch 525 (PS-485): what is stored of the profile on a server deployment.
 * Who is signed in and how, nothing from the staff record (signature image,
 * credentials, names, access flags, tenant): those are kept in memory and,
 * after a reload, filled in again from the staff record (the session restore
 * in authSession.ts, via profileNeedsStaffFields). In the demo the whole
 * profile is stored, as before. The profile holds no patient data either way.
 */
export const MINIMAL_PROFILE_FIELDS = ['id', 'name', 'email', 'role', 'initials', 'voiceProfile', 'authMethod', 'ssoProviderId', 'ssoIssuer', 'ssoSubject'] as const;

export function minimalSessionProfile(profile: SessionProfile): SessionProfile {
  const out: Record<string, unknown> = {};
  for (const k of MINIMAL_PROFILE_FIELDS) if (profile[k] !== undefined) out[k] = profile[k];
  return out as unknown as SessionProfile;
}

/** The full profile for this tab (memory). */
let inMemory: SessionProfile | null = null;

/** The profile: this tab's copy, else the stored one; null when there is none or it can't be read. */
export function readSessionProfile(): SessionProfile | null {
  let stored: SessionProfile | null = null;
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    stored = parsed && typeof parsed.id === 'string' && parsed.id ? parsed as SessionProfile : null;
  } catch {
    stored = null;
  }
  if (dataMayPersistInBrowser()) return stored;
  // Server deployment: this tab's full copy while it is the same person
  // (signed out, or someone else signed in from another tab: the stored form wins).
  if (inMemory && stored && inMemory.id === stored.id) return inMemory;
  inMemory = null;
  return stored;
}

/** Stores the profile (only its minimal form on a server deployment), or removes it when given null. */
export function writeSessionProfile(profile: SessionProfile | null): void {
  const keepWhole = dataMayPersistInBrowser();
  inMemory = profile && !keepWhole ? { ...profile } : null;
  try {
    if (profile) localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify(keepWhole ? profile : minimalSessionProfile(profile)));
    else localStorage.removeItem(SESSION_PROFILE_STORAGE_KEY);
  } catch { /* storage unavailable: the session lives in memory only */ }
}

/** The StaffUser fields a session carries (signature block, access flags, tenant). */
export type StaffSessionFields = Pick<SessionProfile,
  'canViewPediatric' | 'canViewOrchestration' | 'canAccessCrossTenantQa' | 'credentials' | 'signatureUrl'
  | 'firstName' | 'middleName' | 'lastName' | 'organisationId' | 'defaultScanStationId'>;

/**
 * The session fields for a staff record. With no record, the access flags
 * are false and there is no organisation, which means no case access:
 * deny by default, never fall back to a default tenant.
 */
export function staffSessionFields(staff: StaffUser | null | undefined): StaffSessionFields {
  if (!staff) return { canViewPediatric: false, canViewOrchestration: false, canAccessCrossTenantQa: false };
  return {
    canViewPediatric:       staff.canViewPediatric ?? false,
    canViewOrchestration:   staff.canViewOrchestration ?? false,
    canAccessCrossTenantQa: staff.canAccessCrossTenantQa ?? false,
    credentials:            staff.credentials ?? undefined,
    signatureUrl:           staff.signatureUrl ?? undefined,
    firstName:              staff.firstName ?? undefined,
    middleName:             staff.middleName ?? undefined,
    lastName:               staff.lastName ?? undefined,
    organisationId:         staff.organisationId ?? undefined,
    defaultScanStationId:   staff.defaultScanStationId ?? undefined,
  };
}

/** True when a stored profile predates one of the staff-derived fields and needs them filled in. */
export function profileNeedsStaffFields(profile: SessionProfile): boolean {
  return profile.canViewPediatric === undefined || profile.canViewOrchestration === undefined
    || profile.canAccessCrossTenantQa === undefined || profile.organisationId === undefined;
}
