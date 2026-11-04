// src/services/authorization/roleCapabilityRules.ts
// PS-355 (Batch 369): what a role's capability list must satisfy before it
// is saved. Every key is in the catalog, and every capability's
// requirements are granted too, so no role can hold a capability that
// can't work. The Role Dictionary offers to fix a missing requirement
// before it gets here; this is the backstop.
//
// Messages are for the service result (English, like other service
// errors); the Role Dictionary shows its own translated text.
// Pure.

import type { NewAuditLog } from '../auditlog/IAuditService';
import { unknownCapabilities, unmetRequirements } from './capabilityDependencies';
import { isPlatformOnly, separationOfDutiesConflicts } from './capabilityCatalog';

/** The start of roleCapabilityProblem's message for a separation-of-duty refusal (the API server's refusal code). */
export const SEPARATION_OF_DUTIES_PROBLEM = 'SEPARATION_OF_DUTIES';

/**
 * The separation-of-duty pairs a person would hold through these roles
 * (Batch 536): roles are matched by id or name, as on the staff record. Pure.
 */
export function personSeparationOfDutiesConflicts(
  staffRoles: readonly string[],
  roles: readonly { id: string; name: string; capabilities?: readonly string[] }[],
): ReturnType<typeof separationOfDutiesConflicts> {
  const held = roles.filter(r => staffRoles.includes(r.id) || staffRoles.includes(r.name)).flatMap(r => r.capabilities ?? []);
  return separationOfDutiesConflicts(held);
}

/** Why this capability list can't be saved, or null when it can. */
export function roleCapabilityProblem(capabilities: readonly string[], role: { assignable?: boolean } = {}): string | null {
  const unknown = unknownCapabilities(capabilities);
  if (unknown.length) return `Unknown capability: ${unknown.join(', ')}`;
  // Batch 371: ForMedrixAI platform capabilities never go on a hospital role.
  const platform = role.assignable === false ? [] : capabilities.filter(isPlatformOnly);
  if (platform.length) return `Platform-only capability on a hospital role: ${platform.join(', ')}`;
  const unmet = unmetRequirements(capabilities);
  if (unmet.length) return unmet.map(u => `${u.capability} requires ${u.missing.join(', ')}`).join('; ');
  // Batch 536 (PS-554, Pete): no role holds both duties of a separation-of-duty
  // pair, Superadmin included.
  const sod = separationOfDutiesConflicts(capabilities);
  if (sod.length) return `${SEPARATION_OF_DUTIES_PROBLEM}: ${sod.map(([a, b]) => `${a} and ${b}`).join('; ')}`;
  return null;
}


/**
 * The audit entry for a change to a role's capabilities, or null when
 * nothing changed. Granting and removing access is itself a high-risk act,
 * so it is recorded with who did it. Detail is literal English.
 */
export function roleCapabilityChangeAudit(
  roleName: string,
  before: readonly string[] | undefined,
  after: readonly string[] | undefined,
  actorName: string,
): NewAuditLog | null {
  const was = new Set(before ?? []);
  const now = new Set(after ?? []);
  const added = [...now].filter(k => !was.has(k)).sort();
  const removed = [...was].filter(k => !now.has(k)).sort();
  if (added.length === 0 && removed.length === 0) return null;
  const parts = [
    added.length ? `granted ${added.join(', ')}` : '',
    removed.length ? `removed ${removed.join(', ')}` : '',
  ].filter(Boolean);
  return {
    type: 'user',
    event: 'Role capabilities changed',
    detail: `Role "${roleName}": ${parts.join('; ')}.`,
    user: actorName,
    caseId: null,
    confidence: null,
  };
}
