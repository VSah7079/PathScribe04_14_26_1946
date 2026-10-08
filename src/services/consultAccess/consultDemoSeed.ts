// src/services/consultAccess/consultDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (demo baseline): one active outside-consult link, so the issued
// links list has something to show after a Full Reset.
//
//   S26-4602  Dr. Sarah Johnson's skin excision (compound melanocytic
//             proliferation with architectural disorder and focal atypia,
//             services/cases/demoBaselineCases.ts) sent for an outside
//             dermatopathology opinion: issued two hours ago, valid for 72
//             hours, viewed once.
//
// Shown in the External consult window on the case's report page (bottom
// action bar), signed in as Dr. Sarah Johnson (or anyone who can open it).
//
// The bearer string is generated when the seed is first read and stored
// with it, the way issue() stores one (this mock keeps the token itself,
// not a hash; see IConsultTokenService.ts's header). It is never written in
// source, and the screen shows a link only when it is created, so the
// seeded link can't be opened from the demo: issue a new one to show the
// consultant's view.
// ─────────────────────────────────────────────────────────────────────────────

import type { ConsultToken } from './IConsultTokenService';

const HOUR = 3_600_000;

export const DEMO_CONSULT_TOKEN_ID = 'consult-tok-demo-4602';
export const DEMO_CONSULT_CASE_ID = 'S26-4602';

export function demoConsultTokens(newToken: () => string, now: number = Date.now()): ConsultToken[] {
  const issuedAt = now - 2 * HOUR;
  return [{
    id: DEMO_CONSULT_TOKEN_ID,
    token: newToken(),
    // caseAccessionNumber as the issue window stores it (accession.accessionNumber).
    scope: { caseId: DEMO_CONSULT_CASE_ID, caseAccessionNumber: '4602' },
    issuedByUserId: 'PATH-SJ-001',
    issuedByName: 'Dr. Sarah Johnson',
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(issuedAt + 72 * HOUR).toISOString(),
    isActive: true,
    consultantIdentifier: 'Dr. Miguel Ortega',
    consultantOrganization: 'Sonoran Dermatopathology Associates',
    note: 'Melanocytic lesion with architectural disorder and focal cytologic atypia. Opinion requested: dysplastic nevus versus melanoma in situ.',
    lastAccessedAt: new Date(now - 1 * HOUR).toISOString(),
    accessCount: 1,
  }];
}
