// src/services/cases/saveCaseTeam.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 441: saving a case's team (the Case Team modal), moved out of the
// modal so it can be checked.
//
//   1. Permission: case:team:manage, for the case. Seeded to every role that
//      could open a case report before (Pete's "keep today's users", as for
//      delegation in Batch 381).
//   2. Pete (Oct 2): "Cytotechs can not be selected for Pathologist roles."
//      A cytotech-only staff member in a pathologist slot is refused
//      (cytotechParticipationRules.ts).
//   3. If the primary changed, order.assignedTo follows it
//      (syncPrimaryAssignee), so the case moves to the new primary's
//      worklist; otherwise only the participants change.
//   4. PS-71 (Batch 458): the save is versioned. The case is read, the team
//      write is built from THAT read and saved with its version
//      (updateCaseWithRetry). If, in the newest case, the team is no longer
//      the one this person opened (someone else changed it meanwhile), it
//      is NOT saved over theirs: `teamChanged`, and the modal asks them to
//      reopen. Changes to other parts of the case don't block the save.
//
// Deps are passed in so this is testable without module mocks.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case, CaseParticipant } from '@/types/case/Case';
import { syncPrimaryAssignee } from './caseAssignmentSync';
import { updateCaseWithRetry, type CaseWriteDeps, type CaseWriteResult } from './caseWrite';
import { CYTOTECHNOLOGIST_PARTICIPATION_TYPE_ID, cytotechInPathologistSlot, isCytotechOnly, type StaffRef } from '../participationTypes/cytotechParticipationRules';

export type SaveCaseTeamResult =
  | { ok: true; updates: Partial<Case>; version: number }
  | { ok: false; reason: 'notPermitted' }
  | { ok: false; reason: 'teamChanged' | 'notFound' }
  | { ok: false; reason: 'cytotechPathologistType'; staffName: string; typeId: string };

export interface SaveCaseTeamDeps {
  enforce: (capability: string, context: { caseId: string }) => Promise<{ allowed: boolean }>;
  listStaff: () => Promise<StaffRef[]>;
  listRoles: () => Promise<Array<{ id: string; name: string }>>;
  listParticipationTypes: () => Promise<Array<{ id: string; canFinalize?: boolean }>>;
  /** PS-71 (Batch 458): versioned reads and writes (was: updateCase(caseId, updates), no version). */
  getCase: CaseWriteDeps['getCase'];
  updateCase: CaseWriteDeps['updateCase'];
}

/**
 * The team as the modal opens it: when the assigned person isn't on it yet,
 * they're added, as primary, or as cytotechnologist when they're a
 * cytotech-only staff member (Batch 441; before, always primary). Returns
 * null when nothing needs adding. Pure.
 */
export function withAssigneeOnTeam(
  caseData: Case,
  staff: ReadonlyArray<StaffRef & { firstName: string; lastName: string; npi?: string; gmcNumber?: string }>,
  roles: ReadonlyArray<{ id: string; name: string }>,
): CaseParticipant[] | null {
  const existing = caseData.participants ?? [];
  const assignedId = caseData.order?.assignedTo;
  if (!assignedId || existing.some(p => p.staffId === assignedId && p.status === 'active')) return null;
  const s = staff.find(u => u.id === assignedId);
  if (!s) return null;
  return [{
    staffId: s.id,
    staffName: `${s.firstName} ${s.lastName}`,
    externalId: s.gmcNumber || s.npi || undefined,
    externalIdType: s.gmcNumber ? 'GMC' : s.npi ? 'NPI' : undefined,
    source: 'system',
    participationTypeIds: [isCytotechOnly(s.roles, roles) ? CYTOTECHNOLOGIST_PARTICIPATION_TYPE_ID : 'primary'],
    addedBy: 'system', addedAt: caseData.createdAt, status: 'active',
  }, ...existing];
}

/** The team as a comparable key (who, active or not, in which slots), ignoring order. Pure. */
export function teamKey(participants: ReadonlyArray<CaseParticipant> | undefined): string {
  return (participants ?? [])
    .map(p => `${p.staffId}|${p.status}|${[...p.participationTypeIds].sort().join(',')}`)
    .sort()
    .join(';');
}

/**
 * PS-71 (Batch 458): the assignee joins the team when the modal opens, as a
 * versioned system write built from the newest case (was: an unversioned
 * caseRouter.updateCase from the modal). Nothing is written when, in the
 * newest case, the assignee is already on the team.
 */
export function addAssigneeToTeam(
  caseId: string,
  staff: Parameters<typeof withAssigneeOnTeam>[1],
  roles: Parameters<typeof withAssigneeOnTeam>[2],
  deps: Pick<SaveCaseTeamDeps, 'getCase' | 'updateCase'>,
): Promise<CaseWriteResult> {
  return updateCaseWithRetry(caseId, current => {
    const participants = withAssigneeOnTeam(current, staff, roles);
    return participants ? { participants } : null;
  }, deps);
}

/** What a case team save writes. Pure. */
export function caseTeamUpdates(caseData: Case, participants: CaseParticipant[], updatedBy: string): Partial<Case> {
  const newPrimary = participants.find(p => p.status === 'active' && p.participationTypeIds.includes('primary'));
  if (newPrimary && newPrimary.staffId !== caseData.order?.assignedTo) {
    return syncPrimaryAssignee({ ...caseData, participants }, newPrimary.staffId, updatedBy, newPrimary.staffName);
  }
  return { participants };
}

export async function saveCaseTeam(
  input: {
    caseData: Case; participants: CaseParticipant[]; updatedBy: string;
    /** The team as the modal showed it when opened (after the assignee was added). Defaults to caseData.participants. */
    openedWith?: CaseParticipant[];
  },
  deps: SaveCaseTeamDeps,
): Promise<SaveCaseTeamResult> {
  const decision = await deps.enforce('case:team:manage', { caseId: input.caseData.id });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };

  const [staff, roles, types] = await Promise.all([deps.listStaff(), deps.listRoles(), deps.listParticipationTypes()]);
  const bad = cytotechInPathologistSlot(input.participants, staff, roles, types);
  if (bad) return { ok: false, reason: 'cytotechPathologistType', staffName: bad.staffName, typeId: bad.typeId };

  // PS-71 (Batch 458): versioned, built from the newest case; never over
  // someone else's newer team.
  const seen = new Set([teamKey(input.openedWith ?? input.caseData.participants), teamKey(input.caseData.participants)]);
  const r = await updateCaseWithRetry(input.caseData.id, current =>
    seen.has(teamKey(current.participants)) ? caseTeamUpdates(current, input.participants, input.updatedBy) : null,
  deps);
  if (r.ok === true) return { ok: true, updates: r.updates, version: r.version };
  if (r.ok === false && r.reason === 'notFound') return { ok: false, reason: 'notFound' };
  // 'noChange' (the team changed under us) or 'conflict' (the case kept
  // changing): nothing saved; the person reopens and sees the newest team.
  return { ok: false, reason: 'teamChanged' };
}
