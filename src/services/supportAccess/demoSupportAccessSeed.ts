// src/services/supportAccess/demoSupportAccessSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 372: the demo organisations' starting support access settings.
//
// Every organisation starts at Approval required (Pete's default), except
// the demo organisations that have no staff member who could approve a
// request. Left at Approval required, their cases could never be reached by
// support in a demo. They start at Always allowed, so their cases stay
// visible to ForMedrixAI demo accounts and every look is still recorded in
// their support audit.
//
//   Approval required: Desert Valley, Manchester, Midwest (each has an Admin
//                      who can approve)
//   Always allowed:    Henry Ford, Fenwick and the ten
//                      international screening labs
//
// An organisation's own saved settings replace these. Demo data only: a
// real deployment has no seed, so every organisation starts at Approval
// required.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupportAccessRequest, SupportAccessSettings } from './supportAccessRules';

const ALWAYS_ALLOWED_IN_DEMO = [
  'c-ent-hfhs', 'c-trust-fenwick',
  'c-kr-seoul-general', 'c-de-berlin-frauenklinik', 'c-nl-amsterdam-cyto', 'c-fr-paris-cyto', 'c-be-brussels-cyto',
  'c-ca-vancouver-cyto', 'c-nz-auckland-cyto', 'c-au-sydney-cyto', 'c-ie-ncsl-dublin', 'c-ni-lagan-valley',
];

export const DEMO_SUPPORT_ACCESS_SETTINGS: Readonly<Record<string, Partial<SupportAccessSettings>>> =
  Object.fromEntries(ALWAYS_ALLOWED_IN_DEMO.map(id => [id, { policy: 'alwaysAllowed' }]));

// ─────────────────────────────────────────────────────────────────────────────
// Batch 456: one support access request waiting for Desert Valley's decision,
// so approving (or rejecting) it can be demoed straight after a Full Reset.
//
// The requester is Amber Fehrs-Battey (PATH-US-001): a Superadmin, so
// ForMedrixAI support, whose staff organisation is Midwest (ORG-MPA), which
// makes Desert Valley another organisation for her. Pete Nimmo's own staff
// record is at Desert Valley, so a request from him wouldn't be support
// access at all. Approver: Michelle Nimmo (Admin), at Configuration → System
// → Support access; Pete Nimmo can approve as well (a Desert Valley member,
// not the requester). Dr. Rachel Okafor (Lab Director) can't by default:
// config:support-access:approve is seeded to Admin only, and the hospital
// grants it to other roles if it chooses.
//
// Seeded only as the fallback while no requests are stored, so it returns
// after every Full Reset. The approvers' in-app message and the "requested"
// entry in the organisation's support audit aren't seeded: the audit stream
// survives a reset (DELIBERATELY_NOT_RESET) and is hash-chained, so it is
// only ever written through the service.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_PENDING_SUPPORT_REQUEST_ID = 'sa-demo-dvmc-pending';

export function demoSupportAccessRequests(now: number = Date.now()): SupportAccessRequest[] {
  return [{
    id: DEMO_PENDING_SUPPORT_REQUEST_ID,
    tenantId: 'c-ent-dvmc',
    agentId: 'PATH-US-001',
    agentName: 'Amber Fehrs-Battey',
    ticketId: 'FMX-20417',
    reason: 'Signed-out breast resection reports print without the margin table in the PDF. Need to reproduce on the affected case and compare its template version with the one in use.',
    requestedAt: new Date(now - 25 * 60_000).toISOString(),
    status: 'pending',
  }];
}
