// src/services/authorization/authorizationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 369): the permission check with the data it needs.
//
//   evaluate(capability, context)  the decision, nothing written. For
//                                  screens deciding whether to offer an
//                                  action (useCapabilities / CapabilityButton).
//   enforce(capability, context)   the decision at the action itself. A
//                                  high-risk capability's check is written to
//                                  the audit log, allowed or refused, naming
//                                  the role that allowed it. Callers carry
//                                  out the action only when it's allowed.
//   grantedCapabilities()          everything the signed-in user holds.
//
// The subject is the signed-in session, with its staff record's roles, and
// the role catalog, both read fresh on every call so a change in Staff →
// Roles applies at once.
//
// This is the mock phase's enforcement point. In production the API server
// makes the same check with the same catalog before doing the work and
// writes the audit entry itself (docs/architecture/AUTHORIZATION_API.md);
// the browser's check then only decides what to show.
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuditService } from '../auditlog/IAuditService';
import type { IRoleService, Role } from '../roles/IRoleService';
import type { IUserService } from '../users/IUserService';
import { readSessionProfile, type SessionProfile } from '../auth/sessionProfile';
import { capabilityDefinition } from './capabilityCatalog';
import {
  capabilityAuditEntry, evaluateCapability, grantedCapabilities,
  type AuthzSubject, type CapabilityContext, type CapabilityDecision,
} from './evaluateCapability';

export interface AuthorizationDeps {
  roleService: Pick<IRoleService, 'getAll'>;
  userService: Pick<IUserService, 'getById'>;
  auditService: Pick<IAuditService, 'logEvent'>;
  /** The signed-in session (defaults to the stored session profile). */
  session?: () => Pick<SessionProfile, 'id' | 'name' | 'role'> | null;
  /**
   * Batch 653: the facility a case belongs to (its ordering facility). Used when a
   * check names a case but not its facility, so a person limited to one facility
   * is judged against the case's own facility, not refused as "facility unknown".
   * Returns null when the case or its facility cannot be found (the check then
   * stays refused for a facility-limited person, as before).
   */
  caseFacility?: (caseId: string) => Promise<string | null>;
}

/** Who is signed in and the role catalog, for a screen to decide what to offer. */
export interface AuthorizationSnapshot {
  subject: AuthzSubject | null;
  roles: Role[];
}

export interface IAuthorizationService {
  evaluate(capability: string, context?: CapabilityContext): Promise<CapabilityDecision>;
  enforce(capability: string, context?: CapabilityContext): Promise<CapabilityDecision>;
  grantedCapabilities(): Promise<Set<string>>;
  /** PS-356: the data a screen evaluates against (useCapabilities), read fresh. */
  snapshot(): Promise<AuthorizationSnapshot>;
}

export function createAuthorizationService(deps: AuthorizationDeps): IAuthorizationService {
  const session = deps.session ?? readSessionProfile;

  const load = async (): Promise<{ subject: AuthzSubject | null; roles: Role[] }> => {
    const s = session();
    const rolesRes = await deps.roleService.getAll();
    const roles = rolesRes.ok ? rolesRes.data : [];
    if (!s?.id) return { subject: null, roles };
    // No staff record: only what the session itself brings (Superadmin for a
    // support sign-in), never a default.
    const staffRes = await deps.userService.getById(s.id);
    const staffRoles = staffRes.ok ? (staffRes.data.roles ?? []) : [];
    // PS-356: facility scope comes from the staff record's assignment.
    const facilityIds = staffRes.ok ? (staffRes.data.facilityIds ?? []) : [];
    return { subject: { userId: s.id, userName: s.name, sessionRole: s.role, staffRoles, facilityIds }, roles };
  };

  /** Add the case's facility to a context that names a case and no facility. */
  const withCaseFacility = async (subject: AuthzSubject | null, context: CapabilityContext): Promise<CapabilityContext> => {
    if (!deps.caseFacility || !context.caseId) return context;
    if (context.facilityId || (context.facilityIds?.length ?? 0) > 0 || context.allFacilities) return context;
    // Only a facility-limited person is judged by facility; skip the lookup for everyone else.
    if (!subject || (subject.facilityIds ?? []).length === 0) return context;
    try {
      const facilityId = await deps.caseFacility(context.caseId);
      return facilityId ? { ...context, facilityId } : context;
    } catch {
      return context;
    }
  };

  return {
    async evaluate(capability, context = {}) {
      const { subject, roles } = await load();
      return evaluateCapability(subject, capability, roles, await withCaseFacility(subject, context));
    },

    async enforce(capability, context = {}) {
      const { subject, roles } = await load();
      const decision = evaluateCapability(subject, capability, roles, await withCaseFacility(subject, context));
      // Unknown keys are audited too: a check against a key that isn't in the
      // catalog is a defect worth seeing in the log.
      const risk = capabilityDefinition(capability)?.risk ?? 'high';
      if (risk === 'high') await deps.auditService.logEvent(capabilityAuditEntry(subject, decision));
      return decision;
    },

    async grantedCapabilities() {
      const { subject, roles } = await load();
      return grantedCapabilities(subject, roles);
    },

    snapshot: load,
  };
}
