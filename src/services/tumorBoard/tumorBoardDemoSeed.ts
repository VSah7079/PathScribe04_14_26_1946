// src/services/tumorBoard/tumorBoardDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 516 (Pete, Oct 10, 2026): Tumor Board / MDT demo data, so the demo team
// can show the workspace end to end. Like the other demo seeds, it is written
// when nothing is stored yet — first run, or after a Full Reset — so the same
// agenda comes back every time. Dates are relative to today.
//
// The four boards, every status, both sources:
//
//   Thoracic MDM   S26-4670  lung lobectomy, adenocarcinoma pT2a pN2;
//                            meeting in 2 days 07:30, Pete Nimmo presenting
//   GI MDT         S26-4671  right hemicolectomy, pT3 pN1b; meeting in 2 days
//                            12:00, NO presenter yet (claim it); flagged by the
//                            margin rule (circumferential margin 0.6 mm)
//                  S26-4673  Whipple, PDAC; presented a week ago
//   Gyn-Onc        S26-4672  hysterectomy, endometrioid carcinoma; nominated,
//                            NOT yet scheduled (schedule it)
//                  S26-4642  cervical LEEP (the HSIL Pap follow-up); deferred
//                            at last week's meeting for the final pathology
//   Breast MDT     S26-4631  mastectomy (biopsy S26-4630); meeting in 6 days
//                            08:00, Dr. Sarah Johnson presenting
//                  S26-4630  the core biopsy; presented at diagnosis, 5 weeks ago
//
// The cases are in services/cases/demoBaselineCases.ts (Metro General
// Hospital), so they also come back on a Full Reset.
// ─────────────────────────────────────────────────────────────────────────────
import type { TumorBoardListing, TumorBoardName, TumorBoardCaseStatus } from './ITumorBoardService';

const DAY = 86_400_000;
const PETE = { id: 'PATH-001', name: 'Pete Nimmo' };
const SARAH = { id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson' };

/** A meeting date, `days` from today ('YYYY-MM-DD'). */
const meetingDay = (now: number, days: number) => new Date(now + days * DAY).toISOString().slice(0, 10);
const at = (now: number, days: number) => new Date(now + days * DAY).toISOString();

interface DemoListing {
  caseId: string;
  accession: string;
  board: TumorBoardName;
  status: TumorBoardCaseStatus;
  /** Days from today; undefined: not scheduled yet. */
  meetingInDays?: number;
  meetingTime?: string;
  presenter?: { id: string; name: string };
  nominatedDaysAgo: number;
  nominatedBy: { id: string; name: string };
  rule?: string;
}

const DEMO_LISTINGS: DemoListing[] = [
  { caseId: 'S26-4670', accession: 'S26-4670', board: 'Thoracic MDM', status: 'Pending Presentation', meetingInDays: 2, meetingTime: '07:30', presenter: PETE, nominatedDaysAgo: 4, nominatedBy: PETE },
  { caseId: 'S26-4671', accession: 'S26-4671', board: 'GI MDT', status: 'Pending Presentation', meetingInDays: 2, meetingTime: '12:00', nominatedDaysAgo: 3, nominatedBy: SARAH, rule: 'Margin: Distance to closest margin < 1 mm (0.6 mm)' },
  { caseId: 'S26-4673', accession: 'S26-4673', board: 'GI MDT', status: 'Presented', meetingInDays: -7, meetingTime: '12:00', presenter: SARAH, nominatedDaysAgo: 12, nominatedBy: SARAH },
  { caseId: 'S26-4672', accession: 'S26-4672', board: 'Gyn-Onc', status: 'Pending Presentation', nominatedDaysAgo: 1, nominatedBy: PETE },
  { caseId: 'S26-4642', accession: 'S26-4642', board: 'Gyn-Onc', status: 'Deferred', meetingInDays: -6, meetingTime: '16:00', presenter: SARAH, nominatedDaysAgo: 20, nominatedBy: SARAH },
  { caseId: 'S26-4631', accession: 'S26-4631', board: 'Breast MDT', status: 'Pending Presentation', meetingInDays: 6, meetingTime: '08:00', presenter: SARAH, nominatedDaysAgo: 2, nominatedBy: PETE },
  { caseId: 'S26-4630', accession: 'S26-4630', board: 'Breast MDT', status: 'Presented', meetingInDays: -35, meetingTime: '08:00', presenter: PETE, nominatedDaysAgo: 37, nominatedBy: PETE },
];

export const DEMO_TUMOR_BOARD_CASE_IDS = DEMO_LISTINGS.map(l => l.caseId);

/** The demo agenda, dated relative to `now`. */
export function demoTumorBoardListings(now: number = Date.now()): TumorBoardListing[] {
  return DEMO_LISTINGS.map((l, i) => {
    const nominated = at(now, -l.nominatedDaysAgo);
    const presenterAssigned = l.presenter ? at(now, -Math.max(0, l.nominatedDaysAgo - 1)) : undefined;
    const lastChange = l.status === 'Presented' || l.status === 'Deferred'
      ? at(now, l.meetingInDays ?? 0) : (presenterAssigned ?? nominated);
    return {
      id: `tb-demo-${i + 1}-${l.caseId}`,
      caseId: l.caseId,
      caseAccession: l.accession,
      board: l.board,
      meetingDate: l.meetingInDays === undefined ? undefined : meetingDay(now, l.meetingInDays),
      meetingTime: l.meetingInDays === undefined ? undefined : l.meetingTime,
      status: l.status,
      presenterUserId: l.presenter?.id,
      presenterUserName: l.presenter?.name,
      presenterAssignedAt: presenterAssigned,
      presenterAssignedByUserId: l.presenter ? l.presenter.id : undefined,
      presenterAssignedByUserName: l.presenter ? l.presenter.name : undefined,
      source: l.rule ? 'Rule' : 'Manual',
      triggerReason: l.rule,
      createdAt: nominated,
      createdByUserId: l.rule ? 'system' : l.nominatedBy.id,
      createdByUserName: l.rule ? 'Tumor board rules' : l.nominatedBy.name,
      updatedAt: lastChange,
      updatedByUserId: l.presenter?.id ?? l.nominatedBy.id,
      updatedByUserName: l.presenter?.name ?? l.nominatedBy.name,
    };
  });
}
