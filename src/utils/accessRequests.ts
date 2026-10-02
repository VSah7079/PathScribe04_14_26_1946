// src/utils/accessRequests.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared admin-notification helper for any "request access" flow. Originally
// lived privately inside WorklistTable.tsx (built for the Pediatric Access
// modal); extracted here so a second, genuinely separate flow — Pool
// membership access requests, per direct product decision: pool-restricted
// cases should stay visible with a real request-access path, the same as
// Pediatric, rather than being hidden entirely — can reuse the exact same,
// already-fixed recipient-resolution logic rather than duplicating it.
//
// Real bug fix (carried forward from the original, Pediatric-only version):
// both Pediatric and Orchestration access-request buttons used to send a
// message to a hardcoded `recipientId: 'u3'`, `recipientName: 'System
// Admin'` — but no user with id 'u3' exists anywhere in the real, canonical
// services/users/mockUserService.ts directory (confirmed directly: real ids
// are '1'-'10', 'PATH-xxx', 'PA-001'). 'u3' was only ever a stand-in id from
// AppShell.tsx's own, separate, hand-maintained INTERNAL_USERS messaging
// directory — the exact same real ID-collision pattern
// RequestReviewModal.tsx's own header comment already documents and fixed
// ('u3'/'u4' meaning different people in different, disconnected lists).
// Sending to 'u3' here meant these access-request messages were silently
// vanishing — no real inbox anywhere ever received them.
//
// Real fix: sources real, active Admin-role users from the same canonical
// userService RequestReviewModal.tsx, StaffTab.tsx, and CaseTeamModal.tsx
// all already use. Scoped to the requesting user's own organisation first —
// the UI copy says "your System Admin", and an admin at an unrelated
// hospital across the world has no real authority to grant a facility-level
// or staff-record permission for a different organisation's case. Falls
// back to every real admin system-wide only if that organisation genuinely
// has none configured yet, so the request is never silently dropped the way
// it was before. messageService.send() takes one recipient at a time, so a
// real admin pool sends one message per real admin, not just the first one
// found.
//
// Batch 431: every request is also saved as an access request record
// (accessRequestService), before the messages go out. Until now nothing
// created those records, so the "access requested" badges and the QA
// Access Request Response tab had nothing to read; the pool badge was kept
// per computer in the browser instead. A second request for the same thing
// while the first is still pending reuses the pending record.
// ─────────────────────────────────────────────────────────────────────────────

import { accessRequestService, messageService, userService } from '@/services';
import type { AccessRequest, NewAccessRequest } from '@/types/access/AccessRequest';

/** What the request is for (the requester is passed separately). */
export type AccessRequestSubject = Pick<NewAccessRequest, 'type' | 'caseId' | 'facilityId' | 'facilityName' | 'poolId' | 'poolName'>;

/** Whether a pending request already covers this subject (pure; tested).
 *  Pool requests match on the pool, the others on the case. */
export function isSameAccessRequest(r: AccessRequest, subject: AccessRequestSubject): boolean {
  if (r.status !== 'pending' || r.type !== subject.type) return false;
  if (subject.type === 'pool') return (r.poolId ?? r.poolName) === (subject.poolId ?? subject.poolName);
  return r.caseId === subject.caseId;
}

/** The signed-in person's pending requests (for the "access requested" badges). */
export async function pendingAccessRequestsFor(userId: string): Promise<AccessRequest[]> {
  const res = await accessRequestService.getAllForUser(userId);
  return res.ok ? res.data.filter(r => r.status === 'pending') : [];
}

export async function sendAccessRequestToAdmins(
  requestingUser: { id: string; name: string; organisationId?: string },
  subject: string,
  body: string,
  configLink: string,
  request: AccessRequestSubject,
): Promise<void> {
  const pending = await pendingAccessRequestsFor(requestingUser.id);
  if (!pending.some(r => isSameAccessRequest(r, request))) {
    await accessRequestService.create({
      ...request,
      requestingUserId: requestingUser.id,
      requestingUserName: requestingUser.name,
      organisationId: requestingUser.organisationId,
    });
  }
  const usersRes = await userService.getAll();
  if (!usersRes.ok) return;
  const allAdmins = usersRes.data.filter(u =>
    u.status === 'Active' && u.roles.includes('Admin') && u.id !== requestingUser.id
  );
  const orgAdmins = requestingUser.organisationId
    ? allAdmins.filter(u => u.organisationId === requestingUser.organisationId)
    : [];
  const recipients = orgAdmins.length > 0 ? orgAdmins : allAdmins;
  await Promise.all(recipients.map(admin => messageService.send({
    senderId: requestingUser.id,
    senderName: requestingUser.name,
    recipientId: admin.id,
    recipientName: `${admin.firstName} ${admin.lastName}`.trim(),
    subject,
    body,
    configLink,
    timestamp: new Date(),
    isUrgent: false,
  })));
}
