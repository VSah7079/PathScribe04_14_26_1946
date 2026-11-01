// src/services/quality/demoDiscordanceSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 589): demo discordance data, so peer review sign-offs, the QA
// lead's CAPA queue and a pathologist's pattern of discordance can be shown
// without typing cases in by hand. Five post-sign-out peer reviews (3 minor,
// 2 major) across three pathologists:
//   • Oliver Pemberton is the reviewed pathologist on three of them (two
//     minor, one major), so a "pattern" has something to show;
//   • Pete Nimmo and Imogen Hartley are each reviewed once.
// Both major ones recommend a CAPA (the QA lead confirms or dismisses it).
// Demo data only: names are staff, never patient identifiers.
// ─────────────────────────────────────────────────────────────────────────────

import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { CapaRecommendation } from '@/types/quality/CapaRecommendation';

const ACTIVITY = 'qa-activity-surgical-peer-review';
const PETE = { userId: 'PATH-001', userName: 'Pete Nimmo' };
const HARTLEY = { userId: 'PATH-UK-001', userName: 'Imogen Hartley' };
const OLIVER = { userId: 'PATH-UK-002', userName: 'Oliver Pemberton' };

export const DEMO_DISCORDANCE_RECORDS: QaActivityRecord[] = [
  {
    id: 'qa-rec-demo-disc-001', activityTypeId: ACTIVITY, caseId: 'S26-4401', caseType: 'Breast Core Bx',
    fieldValues: { originalSignOutDx: 'Invasive ductal carcinoma, grade 2', reviewerIndependentDx: 'Invasive ductal carcinoma, grade 3', selectionReason: 'random_selection' },
    outcome: 'discordant', delta: 'minor_variance', severity: 'low', rootCause: 'interpretation_error',
    comments: 'Grade differs by one level; the diagnosis and the treatment path are the same.',
    postSignOut: true, reviewedPathologist: OLIVER, recordedAt: '2026-10-02T15:10:00.000Z', recordedBy: PETE,
  },
  {
    id: 'qa-rec-demo-disc-002', activityTypeId: ACTIVITY, caseId: 'S26-4403', caseType: 'Prostate Bx',
    fieldValues: { originalSignOutDx: 'Gleason score 3+4=7', reviewerIndependentDx: 'Gleason score 3+3=6', selectionReason: 'random_selection' },
    outcome: 'discordant', delta: 'downgrade', severity: 'low', rootCause: 'interpretation_error',
    comments: 'Gleason pattern read one step lower on review; both are within accepted variance.',
    postSignOut: true, reviewedPathologist: OLIVER, recordedAt: '2026-10-05T16:30:00.000Z', recordedBy: PETE,
  },
  {
    id: 'qa-rec-demo-disc-003', activityTypeId: ACTIVITY, caseId: 'S26-4405', caseType: 'Skin Excision',
    fieldValues: { originalSignOutDx: 'Compound nevus', reviewerIndependentDx: 'Compound nevus with mild atypia', selectionReason: 'manual' },
    outcome: 'discordant', delta: 'minor_variance', severity: 'low', rootCause: 'technical_artifact',
    comments: 'Tangential cut of the section made the atypia hard to judge on the original slide.',
    postSignOut: true, reviewedPathologist: PETE, recordedAt: '2026-10-07T14:05:00.000Z', recordedBy: HARTLEY,
  },
  {
    id: 'qa-rec-demo-disc-004', activityTypeId: ACTIVITY, caseId: 'S26-4406', caseType: 'Colon Biopsy',
    fieldValues: { originalSignOutDx: 'Tubular adenoma, low-grade dysplasia', reviewerIndependentDx: 'Adenocarcinoma, intramucosal', selectionReason: 'targeted_high_risk' },
    outcome: 'discordant', delta: 'upgrade', severity: 'high', rootCause: 'interpretation_error',
    comments: 'Invasive carcinoma missed on the original read; the patient needs follow-up.',
    escalationRequired: true, postSignOut: true, reviewedPathologist: OLIVER, recordedAt: '2026-10-09T17:45:00.000Z', recordedBy: PETE,
  },
  {
    id: 'qa-rec-demo-disc-005', activityTypeId: ACTIVITY, caseId: 'S26-4407', caseType: 'Lung Core Bx',
    fieldValues: { originalSignOutDx: 'Squamous cell carcinoma', reviewerIndependentDx: 'Adenocarcinoma', selectionReason: 'random_selection' },
    outcome: 'discordant', delta: 'downgrade', severity: 'high', rootCause: 'interpretation_error', consensus: 'unresolved',
    comments: 'Different tumor type on review and no agreement after discussion; a third opinion was not reached.',
    escalationRequired: true, postSignOut: true, reviewedPathologist: HARTLEY, recordedAt: '2026-10-12T13:20:00.000Z', recordedBy: OLIVER,
  },
];

/** The CAPA recommendations the two major discordances raise (both pending in the QA lead's queue). */
export const DEMO_DISCORDANCE_CAPA_RECOMMENDATIONS: CapaRecommendation[] = [
  {
    id: 'capa-rec-demo-disc-004', caseId: 'S26-4406', source: 'post-signout-discordance',
    deficiencyTypeId: 'def-peer-review-discordance', sourceRecordId: 'qa-rec-demo-disc-004',
    summary: 'QA activity "Surgical Post-Sign-Out Peer Review" found a high severity discordance after sign-out: Invasive carcinoma missed on the original read; the patient needs follow-up.',
    severity: 'high', rootCause: 'Interpretation error', status: 'pending', createdBy: PETE.userId, createdAt: '2026-10-09T17:45:00.000Z',
  },
  {
    id: 'capa-rec-demo-disc-005', caseId: 'S26-4407', source: 'unresolved-disagreement',
    deficiencyTypeId: 'def-peer-review-discordance', sourceRecordId: 'qa-rec-demo-disc-005',
    summary: 'QA activity "Surgical Post-Sign-Out Peer Review" found a disagreement with no consensus: Different tumor type on review and no agreement after discussion; a third opinion was not reached.',
    severity: 'high', rootCause: 'Interpretation error', status: 'pending', createdBy: OLIVER.userId, createdAt: '2026-10-12T13:20:00.000Z',
  },
];
