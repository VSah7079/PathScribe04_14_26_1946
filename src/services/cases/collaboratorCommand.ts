// src/services/cases/collaboratorCommand.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 664 (Pete): "Add Collaborator [name]" on the report screen: an in-lab consultation request. The named person joins the
// case team as a Consultant / Subspecialist (participation type `consultant`: reviews, cannot finalise, does not own the case).
// The Worklist's Collaborating Cases tile then shows the case to them.
//
// The rules, all pure; the report screen listens and saves (useCollaboratorCommand.ts → saveCaseTeam, which checks
// case:team:manage and the cytotech rule and refuses to overwrite a newer team):
//   - the name is what was said after the command words, with titles (Dr, Doctor, Prof...) dropped;
//   - every spoken word must be a first or last name word of exactly one ACTIVE staff member: no match, or more than one,
//     adds nobody (the person is told, and says the full name);
//   - someone already active on the team is not added twice; someone removed earlier is brought back as a consultant.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaseParticipant } from '@/types/case/Case';
import { fold, textAfterCommand } from '../voice/spokenAfterCommand';

export { fold };

export const ADD_COLLABORATOR_ACTION_ID = 'ADD_COLLABORATOR';
export const ADD_COLLABORATOR_EVENT = 'PATHSCRIBE_ADD_COLLABORATOR';
export const COLLABORATOR_PARTICIPATION_TYPE_ID = 'consultant';

export interface CollaboratorCandidate {
  id: string; firstName: string; lastName: string; status: 'Active' | 'Inactive'; npi?: string; gmcNumber?: string;
}

export type CollaboratorMatch =
  | { kind: 'match'; staff: CollaboratorCandidate }
  | { kind: 'noName' }
  | { kind: 'none'; spoken: string }
  | { kind: 'ambiguous'; spoken: string; count: number };

const TITLES = new Set(['dr', 'doctor', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', 'docteur', 'professeur', 'herr', 'frau', 'doktor', 'dokter', 'mevrouw', 'meneer', 'doctora', 'señor', 'señora', '박사', '교수', 'de', 'der', 'den']);

/** What was said once the command words are taken out: the longest of `phrases` found in the transcript is removed. */
export function spokenName(transcript: string, phrases: readonly string[]): string {
  return textAfterCommand(transcript, phrases).split(' ').filter(w => w && !TITLES.has(w)).join(' ');
}

export function matchCollaborator(spoken: string, staff: readonly CollaboratorCandidate[]): CollaboratorMatch {
  const words = spoken.split(' ').filter(Boolean);
  if (!words.length) return { kind: 'noName' };
  const hits = staff.filter(s => {
    if (s.status !== 'Active') return false;
    const own = new Set(fold(`${s.firstName} ${s.lastName}`).split(' '));
    return words.every(w => own.has(w));
  });
  if (hits.length === 1) return { kind: 'match', staff: hits[0] };
  return hits.length === 0 ? { kind: 'none', spoken } : { kind: 'ambiguous', spoken, count: hits.length };
}

export type AddCollaboratorResult =
  | { kind: 'added'; participants: CaseParticipant[] }
  | { kind: 'already' };

/** The team with this person added as a consultant. Pure. */
export function withCollaborator(
  participants: readonly CaseParticipant[], staff: CollaboratorCandidate, addedBy: string, at: string,
): AddCollaboratorResult {
  if (participants.some(p => p.staffId === staff.id && p.status === 'active')) return { kind: 'already' };
  const added: CaseParticipant = {
    staffId: staff.id, staffName: `${staff.firstName} ${staff.lastName}`,
    externalId: staff.gmcNumber || staff.npi || undefined,
    externalIdType: staff.gmcNumber ? 'GMC' : staff.npi ? 'NPI' : undefined,
    source: 'manual', participationTypeIds: [COLLABORATOR_PARTICIPATION_TYPE_ID], addedBy, addedAt: at, status: 'active',
  };
  return { kind: 'added', participants: [...participants.filter(p => p.staffId !== staff.id), added] };
}

/** Whether the command may run now: a case is open and no window is in front of it. */
export function collaboratorCommandAllowed(s: { caseLoaded: boolean; modalOpen: boolean }): boolean {
  return s.caseLoaded && !s.modalOpen;
}

export interface CollaboratorNotice {
  senderId: string; senderName: string; recipientId: string; recipientName: string;
  subject: string; body: string; caseNumber: string; timestamp: Date; isUrgent: false;
}

/**
 * The message the new collaborator receives (Batch 665; stored data, so English, as the review-request message is). Sent by the
 * app on the person's behalf, not composed by them, so it needs no messaging permission; the case link comes from `caseNumber`.
 */
export function collaboratorNotice(input: { caseId: string; caseLabel?: string; from: { id: string; name: string }; to: { id: string; name: string }; at: Date }): CollaboratorNotice {
  const label = input.caseLabel || input.caseId;
  return {
    senderId: input.from.id, senderName: input.from.name, recipientId: input.to.id, recipientName: input.to.name,
    subject: `Consultation requested — ${label}`,
    body: `${input.from.name} added you to the case team for case ${label} as a Consultant.\n\nPlease open the case link below to review the report and leave an internal note.`,
    caseNumber: input.caseId, timestamp: input.at, isUrgent: false,
  };
}
