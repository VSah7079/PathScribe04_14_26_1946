// src/services/followUp/followUpDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 455 (demo baseline): follow-up tracking starts with something to show.
// Three surgical cases were marked "follow-up expected" at sign-out
// (services/cases/demoBaselineCases.ts):
//   S26-4630  received: the mastectomy S26-4631 arrived inside the window
//   S26-4632  overdue: no excision ~20 days after the window closed
//   S26-4633  due soon: re-excision due in ~20 days (warning period 30)
// The two abnormal Paps (S26-4640 overdue, S26-4641 received) need no seed:
// their windows are on the specimens. Metro General Hospital (c1) has
// "Email ordering clinician" turned on, so that action can be demoed; every
// other facility keeps the default (off). Dates are relative to today.
// ─────────────────────────────────────────────────────────────────────────────

import type { FollowUpExpectation } from './followUpTypes';
import type { FacilityFollowUpOverride } from './followUpSettings';

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const expectation = (caseId: string, collectedDaysAgo: number, markedBy: string, markedByName: string): FollowUpExpectation => ({
  id: `fue-${caseId}`,
  caseId,
  specimenId: `${caseId}-SP-1`,
  window: {
    anchor: 'collection', anchorUsed: 'collection', windowDays: 180, ruleSource: 'enterprise',
    startsAt: ago(collectedDaysAgo), endsAt: ago(collectedDaysAgo - 180),
  },
  markedBy, markedByName,
  markedAt: ago(collectedDaysAgo - 3),
});

export const FOLLOW_UP_DEMO_EXPECTATIONS: FollowUpExpectation[] = [
  expectation('S26-4630', 40, 'PATH-001', 'Pete Nimmo'),
  expectation('S26-4632', 200, 'PATH-001', 'Pete Nimmo'),
  expectation('S26-4633', 160, 'PATH-SJ-001', 'Dr. Sarah Johnson'),
];

export const FOLLOW_UP_DEMO_FACILITY_OVERRIDES: FacilityFollowUpOverride[] = [
  { id: 'fac-followup-c1', facilityId: 'c1', overrides: { clinicianEmailEnabled: true }, createdAt: ago(30), updatedAt: ago(30) },
];
