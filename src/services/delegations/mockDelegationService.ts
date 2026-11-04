// src/services/delegations/mockDelegationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 353: this build's delegation service. Records live in the browser
// (delegationStore.ts). delegate() updates the demo case the way the
// delegation type requires, through the demo case service's delegateCase /
// assignSynoptic, which also record the delegation.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { DelegationError, DelegationRecord, IDelegationService } from './IDelegationService';
import { loadDelegations, saveDelegations } from './delegationStore';
import { planDelegation } from './delegationRules';
import { assignSynoptic, delegateCase } from '../cases/mockCaseService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockUserService } from '../users/mockUserService';
import { mockRoleService } from '../roles/mockRoleService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { recordDelegation, type DelegationAuditDeps } from './delegationAudit';
import { isCytotechOnly } from '../participationTypes/cytotechParticipationRules';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function recipientIsCytotechOnly(userId: string): Promise<boolean> {
  const [staff, roles] = await Promise.all([mockUserService.getById(userId), mockRoleService.getAll()]);
  return staff.ok && roles.ok && isCytotechOnly(staff.data.roles, roles.data);
}

/** Batch 651: where a made delegation is audited (a lazy case lookup, so the case router is not imported at load). */
const auditDeps: DelegationAuditDeps = {
  auditService: mockAuditService,
  actorName: async userId => {
    const r = await mockUserService.getById(userId);
    return r.ok ? [r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || userId : userId;
  },
  facilityOf: async caseId => {
    const { caseRouter } = await import('../cases/CaseRouter');
    const c = await caseRouter.getCase(caseId);
    return c?.order?.facilityId ?? null;
  },
};
const fail = (error: DelegationError) => ({ ok: false as const, error });

export const mockDelegationService: IDelegationService = {
  async list(filter): Promise<ServiceResult<DelegationRecord[]>> {
    await delay(100);
    const all = loadDelegations();
    return { ok: true, data: filter?.caseId ? all.filter(d => d.caseId === filter.caseId) : all };
  },

  async delegate(request) {
    // Batch 381 (Pete: "Add, keep today's users"): delegating a case needs
    // case:delegation:create, seeded to every role that could before.
    const decision = await authorizationService.enforce('case:delegation:create', { caseId: request.caseId });
    if (!decision.allowed) return fail('notPermitted');
    const plan = planDelegation(request);
    // Batch 441 (Pete: "Cytotechs can not be selected for Pathologist
    // roles"): every delegation to a person makes them primary, second
    // opinion, consultant or the synoptic's drafter — all pathologist slots.
    const recipientId = plan.kind === 'assignSynoptic' ? plan.assignedTo : plan.payload.targetUserId;
    if (recipientId && await recipientIsCytotechOnly(recipientId)) return fail('recipientIsCytotechnologist');
    if (plan.kind === 'assignSynoptic') {
      const record = await assignSynoptic(
        plan.caseId, plan.instanceId, plan.assignedTo, plan.assignedToName, plan.assignedBy, plan.requiresCountersign, plan.note,
      );
      if (!record) return fail('caseNotFound');
      await recordDelegation(request, record, auditDeps);
      return { ok: true, data: record };
    }
    const record = await delegateCase(plan.payload);
    await recordDelegation(request, record, auditDeps);
    return { ok: true, data: record };
  },

  async complete(id) {
    await delay(150);
    const records = loadDelegations();
    const idx = records.findIndex(d => d.id === id);
    if (idx < 0) return fail('notFound');
    if (records[idx].status === 'completed') return { ok: true, data: records[idx] };
    records[idx] = { ...records[idx], status: 'completed', completedAt: new Date().toISOString() };
    saveDelegations(records);
    return { ok: true, data: records[idx] };
  },
};
