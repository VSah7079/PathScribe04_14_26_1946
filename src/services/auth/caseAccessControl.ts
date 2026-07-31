// src/services/auth/caseAccessControl.ts
// ─────────────────────────────────────────────────────────────
// Lives alongside institutionService.ts (this folder's existing
// "current session tenant" helper — see that file's own header for why
// its previous implementation was broken and got fixed alongside this).
// The real hospital/organisation access-control boundary — replaces the
// hardcoded USER_HOSPITAL_MAP that used to live inside mockCaseService.ts's
// listCasesForUser() and was NEVER enforced on getCase()/getAll(), meaning
// any user with a case ID (via search, a shared link, etc.) could open a
// case belonging to any hospital, in any organisation, regardless of that
// map. That was found and is being closed here.
//
// Design principles (standard multi-tenant SaaS / healthcare access model,
// chosen specifically to hold up under HIPAA "minimum necessary," UK
// GDPR/DSPT, EU GDPR data minimisation, and equivalent AU/CA frameworks —
// none of these are unique, all are the same shape: deny by default,
// explicit scope, auditable):
//
//   1. DENY BY DEFAULT. No organisationId resolved on the session → no
//      case access, full stop. Never fall back to "show everything" on a
//      missing/failed lookup.
//   2. Organisation is the tenant wall. A case belongs to exactly one
//      Organisation (resolved via getOrganisationByHospitalId — Case.
//      originHospitalId legacy-maps 1:1 to an Organisation, not a Site;
//      see that function's own comment). A user can only see cases whose
//      Organisation matches their own organisationId.
//   3. Enterprise-wide visibility within your own organisation is the
//      DEFAULT once the tenant check passes — not a separate opt-in flag.
//      This matches both the actual data granularity available today
//      (Case doesn't carry a real Site-level identifier, only the
//      Organisation-granularity legacy hospital ID) and the explicit
//      requirement that a Trust-wide pathologist can see across their own
//      enterprise. True single-site-only restriction within one
//      organisation isn't buildable without Case carrying a real Site.id
//      instead — flagged as a deliberate limitation, not built here.
//   4. role: 'superadmin' bypasses the organisation check entirely — the
//      standard "platform admin" pattern (a genuine PathScribe-internal
//      support role needs cross-tenant visibility; an ordinary user's
//      home organisation should not). This is a real, if blunt,
//      instrument — see this file's own note in the accompanying
//      conversation about how many existing demo login credentials are
//      already hardcoded to this role.
//   5. Single enforcement point. This module is called from CaseRouter.ts
//      — the one façade every case-read path in the app already funnels
//      through (getCase/getAll/listCasesForUser) — rather than being
//      duplicated inside each underlying mock service. Duplicated
//      authorization logic is exactly how the old narrow hospital-map
//      hack happened: written once for one list view, never applied
//      anywhere else, and nobody could easily tell it wasn't real
//      enforcement.
//   6. Denied access returns "not found," not an explicit "forbidden."
//      This is a deliberate choice (OWASP-aligned) to avoid confirming a
//      case exists to someone not authorized to see it — but the audit
//      log entry underneath still distinguishes an actual not-found from
//      a denied access, so the compliance record stays accurate even
//      though the API surface is deliberately vague to the caller.
//
// IMPORTANT CAVEAT — read before treating this as "solved":
// This is a client-side mock. A real backend MUST enforce this
// server-side; a check running in the browser can be bypassed by anyone
// editing their own JS. What's built here models the correct SHAPE of
// the access-control decision (deny by default, explicit tenant scope,
// audited) so the real backend implementation has a clear, already-
// reasoned spec to match — it is not itself a security boundary against
// a malicious client.
// ─────────────────────────────────────────────────────────────

import { getOrganisationByHospitalId } from '../organisation/organisationService';

const SESSION_STORAGE_KEY = 'pathscribe-user';

export interface SessionUser {
  id: string;
  role?: 'pathologist' | 'admin' | 'pathologist-admin' | 'superadmin';
  organisationId?: string;
  canAccessCrossTenantQa?: boolean;
}

/**
 * Reads the current session user directly from localStorage — the mock
 * services here are plain TS modules outside the React tree and can't use
 * useAuth()/AuthContext, so they read the same persisted session object
 * AuthContext itself writes to. Synchronous by design (no network round
 * trip needed for a mock), matching how the rest of this mock layer reads/
 * writes localStorage directly (see mockStorage.ts's storageGet/Set).
 */
export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return { id: parsed.id, role: parsed.role, organisationId: parsed.organisationId, canAccessCrossTenantQa: parsed.canAccessCrossTenantQa };
  } catch {
    // Fail safe, not fail open — a corrupted/unreadable session resolves
    // to "no session," which denies access, not "assume trusted."
    return null;
  }
}

/**
 * The actual decision: can this session see this case?
 *
 * `caseRecord` only needs enough shape to resolve organisation + who it's
 * assigned to — kept minimal deliberately so this doesn't need to import
 * the full Case type and create a circular dependency with case services.
 */
export function canAccessCase(
  session: SessionUser | null,
  caseRecord: { originHospitalId?: string | null } | null | undefined
): boolean {
  if (!caseRecord) return false;       // nothing to check — treat as inaccessible, not "allowed by omission"
  if (!session) return false;          // no session — deny by default

  if (session.role === 'superadmin') return true; // platform-admin bypass — see module doc comment

  if (!session.organisationId) return false; // no organisation resolved on this session — deny by default, never fall back to "show everything"

  const caseOrg = getOrganisationByHospitalId(caseRecord.originHospitalId ?? '');
  if (!caseOrg) {
    // originHospitalId didn't resolve to any known Organisation — either
    // missing data or a hospital ID outside the legacy map (see that
    // function's own comment for the four IDs it currently knows).
    // Deny by default rather than guess; this is a data-integrity signal
    // worth surfacing, not silently working around.
    return false;
  }

  return caseOrg.id === session.organisationId;
}

/**
 * Whether this session is permitted to see cross-tenant data specifically
 * in QA/compliance reporting views (see qaReportUtils.ts's QaScope
 * 'enterprise' level). Distinct from canAccessCase's superadmin bypass —
 * superadmin still qualifies (a platform admin can see everything), but
 * so does anyone explicitly granted canAccessCrossTenantQa without
 * needing full superadmin case-access privileges. Deny by default, same
 * principle as canAccessCase — no session, no role, no explicit grant
 * means no cross-tenant visibility, full stop.
 */
export function canViewCrossTenantQaData(session: SessionUser | null): boolean {
  if (!session) return false;
  return session.role === 'superadmin' || session.canAccessCrossTenantQa === true;
}

/** Convenience wrapper — filters a list of cases down to only the ones
 *  the current session is allowed to see. Used by getAll()/
 *  listCasesForUser() in CaseRouter.ts. */
export function filterAccessibleCases<T extends { originHospitalId?: string | null }>(
  session: SessionUser | null,
  cases: T[]
): T[] {
  return cases.filter(c => canAccessCase(session, c));
}
