// src/services/cases/caseAssignmentSync.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for keeping order.assignedTo / assignedParticipationTypeId
// in sync with the 'primary' participant in participants[] — the fix for the
// "split-brain assignment" gap: CaseTeamModal used to write participants[]
// without touching order.assignedTo, so listCasesForUser() (which filters on
// assignedTo, not participants[]) would keep showing a case under its old
// owner even after the team roster changed. Any code that changes who's
// primary on a case — delegateCase's ownership-transfer branch,
// acceptPoolCase, or CaseTeamModal's own primary-role change — should call
// this rather than writing order.assignedTo or participants[] directly.
//
// 'primary' is the real, seeded participation type ID (see
// mockParticipationTypeService.ts) — not an invented role. Demoting the
// outgoing primary drops the 'primary' tag and keeps whatever other roles
// they already had; if that leaves them with none, they default to
// 'attending' (a real attending physician of record on the case doesn't
// stop being one just because someone else is now primary — inventing a
// synthetic "contributor" role would misrepresent that under CAP/CLIA
// sign-off terms). See AMENDMENT_STATUS_REDESIGN_BRIEF.md-adjacent design
// notes for the full history of this decision.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case, CaseParticipant } from '@/types/case/Case';

export function syncPrimaryAssignee(
  caseData: Case,
  newPrimaryStaffId: string,
  updatedBy: string,
  newPrimaryStaffName?: string,
): Partial<Case> {
  const existingParticipants: CaseParticipant[] = caseData.participants ?? [];

  const updatedParticipants = existingParticipants.map(p => {
    if (p.status === 'active' && p.participationTypeIds.includes('primary') && p.staffId !== newPrimaryStaffId) {
      const remainingTypes = p.participationTypeIds.filter(t => t !== 'primary');
      return { ...p, participationTypeIds: remainingTypes.length > 0 ? remainingTypes : ['attending'] };
    }
    return p;
  });

  const targetIndex = updatedParticipants.findIndex(p => p.staffId === newPrimaryStaffId && p.status !== 'removed');
  if (targetIndex >= 0) {
    const types = new Set(updatedParticipants[targetIndex].participationTypeIds);
    types.add('primary');
    updatedParticipants[targetIndex] = {
      ...updatedParticipants[targetIndex],
      participationTypeIds: Array.from(types),
      status: 'active',
    };
  } else {
    updatedParticipants.push({
      staffId: newPrimaryStaffId,
      staffName: newPrimaryStaffName ?? newPrimaryStaffId,
      source: 'manual',
      participationTypeIds: ['primary'],
      addedBy: updatedBy,
      addedAt: new Date().toISOString(),
      status: 'active',
    });
  }

  return {
    order: {
      ...caseData.order,
      assignedTo: newPrimaryStaffId,
      assignedParticipationTypeId: 'primary',
    },
    participants: updatedParticipants,
  };
}
