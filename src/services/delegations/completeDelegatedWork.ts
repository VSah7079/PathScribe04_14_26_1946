// src/services/delegations/completeDelegatedWork.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#83). When the person a case was delegated to finishes the work
// (signs the case out), their pending delegations on that case are marked
// completed, so the case leaves "Delegated to me" and the consultation TAT
// has its completion time. Only delegations sent to that user for that case
// are touched; completing twice is a no-op (IDelegationService.complete).
// ─────────────────────────────────────────────────────────────────────────────
import type { IDelegationService } from './IDelegationService';
import { pendingDelegationsTo } from './delegationRules';

/** Completes this user's pending delegations on the case. Returns how many were completed. */
export async function completeDelegatedWork(service: IDelegationService, caseId: string, userId: string): Promise<number> {
  if (!caseId || !userId) return 0;
  const listed = await service.list({ caseId });
  if (!listed.ok) return 0;
  const mine = pendingDelegationsTo(listed.data, userId);
  const results = await Promise.all(mine.map(d => service.complete(d.id)));
  return results.filter(r => r.ok).length;
}
