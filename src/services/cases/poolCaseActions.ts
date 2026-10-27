// src/services/cases/poolCaseActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: taking and passing a pool case, with their capabilities (one per action):
//
//   acceptPoolCase   case:pool:claim (high risk, audited): the case is assigned to the person who takes it.
//   passPoolCase     case:pool:pass: the person declines it; it stays in the pool for someone else.
//   claimPoolCase    the short "someone is looking at it" hold taken when the claim window opens (no capability:
//                    it assigns nothing, and lapses on its own after 30 seconds).
//   releasePoolClaim lets that hold go when the window closes without a decision (no capability: it is the
//                    person's own hold, not a pass).
//
// Pool membership (canUserClaimPoolCase) and the "first to accept wins" rule stay in mockCaseService, which these
// wrap; the API server makes the same capability checks (docs/architecture/AUTHORIZATION_API.md).
//
// Batch 651: every one of the four is written to the audit service here, in the service doing the work, once it has
// succeeded and never when it is refused or loses the race: "Pool case claimed", "Pool case passed", "Pool claim hold
// taken" and "Pool claim hold released" (the hold lapsing or the window closing without a decision). Ids only (case,
// staff, pool), no names of patients; the actor is the staff member. Session-local note: which holds this browser
// took is remembered in `holds` only so a close after Accept or Pass (which consumes the hold) is not recorded as a
// release; the API server owns hold state and its own audit.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import type { IAuditService } from '../auditlog/IAuditService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';
import * as poolStore from './mockCaseService';

export interface PoolCaseDeps {
  enforce: (capability: string, context?: { caseId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
  accept: (caseId: string, userId: string, userName?: string) => Promise<void>;
  pass: (caseId: string) => Promise<void>;
  /** Batch 651: where the successes are audited, and how the actor and the case's facility are looked up (all optional: no audit without `auditService`). */
  auditService?: Pick<IAuditService, 'logEvent'>;
  actorName?: (userId: string) => Promise<string>;
  facilityOf?: (caseId: string) => Promise<string | null>;
  poolOf?: (caseId: string) => Promise<string | null>;
}

export interface PoolHoldDeps {
  claim: (caseId: string, userId: string) => Promise<{ success: boolean }>;
  release: (caseId: string) => Promise<void>;
  auditService?: PoolCaseDeps['auditService'];
  actorName?: PoolCaseDeps['actorName'];
  facilityOf?: PoolCaseDeps['facilityOf'];
  poolOf?: PoolCaseDeps['poolOf'];
}

const defaultDeps: PoolCaseDeps = {
  enforce: (c, ctx) => authorizationService.enforce(c, ctx),
  accept: (caseId, userId, userName) => poolStore.acceptPoolCase(caseId, userId, userName),
  pass: caseId => poolStore.passPoolCase(caseId),
  ...auditLookups(),
};

/** The real audit service and lookups (lazy, so this file does not pull the router and user services in at load). */
function auditLookups(): Pick<PoolCaseDeps, 'auditService' | 'actorName' | 'facilityOf' | 'poolOf'> {
  const caseOf = async (caseId: string) => { const { caseRouter } = await import('./CaseRouter'); return caseRouter.getCase(caseId); };
  return {
    auditService: { logEvent: async entry => (await import('../auditlog/auditServiceInstance')).auditService.logEvent(entry) },
    actorName: async userId => {
      const { userService } = await import('../users/userServiceInstance');
      const r = await userService.getById(userId);
      return r.ok ? [r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || userId : userId;
    },
    facilityOf: async caseId => (await caseOf(caseId))?.order?.facilityId ?? null,
    poolOf: async caseId => ((await caseOf(caseId)) as { poolId?: string | null } | null)?.poolId ?? null,
  };
}

/** The holds this browser took (case id to staff id); see the header. */
const holds = new Map<string, string>();

/** One audit entry for a pool action. Never throws (an audit failure must not undo the action). Literal English, ids only. */
async function auditPool(
  deps: Pick<PoolCaseDeps, 'auditService' | 'actorName' | 'facilityOf' | 'poolOf'>,
  event: string, what: string, caseId: string, userId: string,
): Promise<void> {
  if (!deps.auditService) return;
  try {
    const [name, facilityId, poolId] = await Promise.all([
      deps.actorName?.(userId).catch(() => null), deps.facilityOf?.(caseId).catch(() => null), deps.poolOf?.(caseId).catch(() => null),
    ]);
    await deps.auditService.logEvent({
      type: 'user', event, detail: `${what}${poolId ? ` (pool ${poolId})` : ''}.`,
      user: name || userId, caseId, facilityId: facilityId ?? null, confidence: null,
    });
  } catch { /* never block the action */ }
}

async function sessionUserId(): Promise<string> {
  const { getSessionUser } = await import('../auth/caseAccessControl');
  return getSessionUser()?.id ?? 'unknown';
}

/** A refusal for want of the capability (the message is in the person's language). */
export class PoolActionNotPermittedError extends Error {
  constructor(message: string) { super(message); this.name = 'PoolActionNotPermittedError'; }
}
export const isPoolActionNotPermitted = (e: unknown): e is PoolActionNotPermittedError => e instanceof PoolActionNotPermittedError;

/** Take the case: it is assigned to this person. Throws PoolActionNotPermittedError without case:pool:claim. */
export async function acceptPoolCase(caseId: string, userId: string, userName?: string, deps: PoolCaseDeps = defaultDeps): Promise<void> {
  const decision = await deps.enforce('case:pool:claim', { caseId });
  if (!decision.allowed) throw new PoolActionNotPermittedError(i18n.t('caseActionPermissions.poolClaim'));
  await deps.accept(caseId, userId, userName);
  holds.delete(caseId);
  await auditPool(deps, 'Pool case claimed', 'Case taken from the pool and assigned to the person who took it', caseId, userId);
}

/** Pass on the case: it stays in the pool. Throws PoolActionNotPermittedError without case:pool:pass. */
export async function passPoolCase(caseId: string, deps: PoolCaseDeps = defaultDeps): Promise<void> {
  const decision = await deps.enforce('case:pool:pass', { caseId });
  if (!decision.allowed) throw new PoolActionNotPermittedError(i18n.t('caseActionPermissions.poolPass'));
  const holder = holds.get(caseId) ?? await sessionUserId();
  await deps.pass(caseId);
  holds.delete(caseId);
  await auditPool(deps, 'Pool case passed', 'Case passed on; it stays in the pool', caseId, holder);
}

/** The short hold while the claim window is open (see the header). Audited when it is taken. */
export async function claimPoolCase(caseId: string, userId: string, deps: PoolHoldDeps = { claim: poolStore.claimPoolCase, release: poolStore.passPoolCase, ...auditLookups() }) {
  const result = await deps.claim(caseId, userId);
  if (result.success) {
    holds.set(caseId, userId);
    await auditPool(deps, 'Pool claim hold taken', 'Case held for 30 seconds while its claim window is open', caseId, userId);
  }
  return result;
}

/**
 * Let the hold go when the window closes without a decision (see the header). Audited only when this browser held it
 * and no Accept or Pass consumed it first, so closing after a decision records nothing.
 */
export async function releasePoolClaim(caseId: string, deps: PoolHoldDeps = { claim: poolStore.claimPoolCase, release: poolStore.passPoolCase, ...auditLookups() }): Promise<void> {
  const holder = holds.get(caseId);
  holds.delete(caseId);
  await deps.release(caseId);
  if (holder) await auditPool(deps, 'Pool claim hold released', 'Hold released without a decision (window closed or 30 seconds passed)', caseId, holder);
}
