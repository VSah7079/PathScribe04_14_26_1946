// src/services/clinical/criticalAlertDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (demo baseline): one outstanding automated critical-finding alert,
// so the reference link and its acknowledgement can be demoed after a Full Reset.
//
// S26-4621 (Metro General, signed out by Pete Nimmo, held in its release
// buffer): basal cell carcinoma extending to the deep margin. The lab's
// trigger dictionary rates "Margin Status: Positive" Critical
// (services/abnormalDetection/mockAbnormalTriggerRuleService.ts), so at
// sign-out the alert went to the ordering physician, Dr. Jennifer Davis (ph2),
// by secure email, her only automated channel. Its reference link has been
// neither opened nor acknowledged.
//
//   Audit Log > Critical Alerts   the dispatch, joined to the link's status
//   /critical-alert/cat_demo4621margin   the physician's view: Acknowledge
//
// The email body is the real zero-PHI template (buildEmailBody). No verbal
// call-back record (CriticalResultNotification) is seeded: that is the
// pathologist's own log, made in the sign-out's critical-findings step.
// Dates are relative to now; the link stays valid for 7 days after a reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { CriticalAlertDispatchRecord } from '@/types/clinical/CriticalAlertDispatch';
import type { CriticalAlertReferenceToken } from './ICriticalAlertReferenceTokenService';
import { computeCriticalAlertReferenceTokenExpiry } from './computeCriticalAlertReferenceTokenExpiry';
import { buildEmailBody } from './alertChannels/sendSecureEmailAlert';

const MINUTE = 60_000;
const minutesAgo = (m: number) => new Date(Date.now() - m * MINUTE);

export const CRITICAL_ALERT_DEMO_TOKEN = 'cat_demo4621margin';
const DISPATCH_ID = 'cad-demo-4621';
const issuedAt = minutesAgo(20);

const finding = {
  caseId: 'S26-4621',
  findingTerm: 'Basal cell carcinoma extending to the deep margin',
  findingSeverity: 'Critical' as const,
  physicianId: 'ph2',
  physicianName: 'Jennifer Davis',
};

export const CRITICAL_ALERT_DEMO_DISPATCHES: CriticalAlertDispatchRecord[] = [{
  id: DISPATCH_ID,
  ...finding,
  channels: [{
    channel: 'secure_email', dispatched: true, method: 'stub',
    detail: `Secure email to jdavis@clinic.org: "PathScribe Alert" — "${buildEmailBody(`/critical-alert/${CRITICAL_ALERT_DEMO_TOKEN}`)}"`,
  }],
  dispatchedAt: issuedAt.toISOString(),
}];

export const CRITICAL_ALERT_DEMO_TOKENS: CriticalAlertReferenceToken[] = [{
  id: 'crit-alert-ref-demo-4621',
  token: CRITICAL_ALERT_DEMO_TOKEN,
  dispatchRecordId: DISPATCH_ID,
  accessionNumber: 'S26-4621',
  ...finding,
  issuedAt: issuedAt.toISOString(),
  expiresAt: computeCriticalAlertReferenceTokenExpiry(issuedAt).toISOString(),
  accessCount: 0,
}];
