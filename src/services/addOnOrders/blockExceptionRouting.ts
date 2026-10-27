// src/services/addOnOrders/blockExceptionRouting.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (ws-3; Pete, Oct 24, 2026). A block-exception notice (Block exhausted and the other reasons) goes to the
// slide's ordering pathologist. When the slide was not placed through Add-On Orders (an original H&E, say) nobody is
// recorded, and before this nobody was told while cutting stayed blocked. Now the notice goes to the Supervisor /
// Accessioning Desk instead.
//
// There was no supervisor routing anywhere in the app to copy (searched Oct 24, 2026), so "Supervisor" and
// "Accessioning Desk" are taken as the built-in roles that stand for them: the Lab Director (the supervisory role;
// there is no built-in "Histology Supervisor") and the Accessioner (the accessioning desk). Active staff only, with an
// e-mail address, limited to the case's facility when the person is assigned to facilities. A site can change who
// holds those roles in the Role Dictionary and Users; a dedicated "exception desk" address setting is not built.
// Pure; the caller supplies the staff list.
// ─────────────────────────────────────────────────────────────────────────────

import type { StaffUser } from '../users/IUserService';
import { SYSTEM_ROLE_IDS } from '../roles/systemRoles';

/** The roles that stand for the Supervisor / Accessioning Desk. */
export const EXCEPTION_DESK_ROLE_IDS: readonly string[] = [SYSTEM_ROLE_IDS.LAB_DIRECTOR, SYSTEM_ROLE_IDS.ACCESSIONER];

/** The e-mail addresses of the Supervisor / Accessioning Desk for a case at `facilityId`. Sorted, no duplicates. */
export function exceptionDeskEmails(users: readonly StaffUser[], facilityId?: string): string[] {
  const emails = users
    .filter(u => u.status === 'Active' && !!u.email?.trim())
    .filter(u => (u.roles ?? []).some(r => EXCEPTION_DESK_ROLE_IDS.includes(r)))
    .filter(u => !facilityId || !u.facilityIds?.length || u.facilityIds.includes(facilityId))
    .map(u => u.email.trim());
  return [...new Set(emails)].sort();
}

/** A person's name as shown on screen, or the stored text when the value is not a known user id (it may already be a name). */
export function staffDisplayName(idOrName: string | undefined, users: readonly StaffUser[]): string | undefined {
  if (!idOrName) return undefined;
  const user = users.find(u => u.id === idOrName);
  if (!user) return idOrName;
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || idOrName;
}

/** What flagAddOnException needs when there is no ordering pathologist to e-mail. */
export function deskRecipientsFor(
  caseData: { order?: { facilityId?: string; assignedTo?: string } },
  users: readonly StaffUser[],
): { emails: string[]; primaryPathologistName?: string } {
  return {
    emails: exceptionDeskEmails(users, caseData.order?.facilityId),
    primaryPathologistName: staffDisplayName(caseData.order?.assignedTo, users),
  };
}
