// src/services/followUp/followUpAlerts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: the lab's internal alerts. Each follow-up gets at most two: one
// when it enters the warning period ("due soon"), one when it is overdue. An
// item that goes straight to overdue gets only the overdue one. They go to
// the pathologist who signed the case out and to every active Lab Director
// and QA Reviewer, through the Messages inbox. Nothing goes outside the lab.
// ─────────────────────────────────────────────────────────────────────────────

import type { FollowUpItem } from './followUpTypes';

export type FollowUpAlertLevel = 'dueSoon' | 'overdue';

/** The role names whose holders hear about every follow-up. */
export const FOLLOW_UP_ALERT_ROLES = ['Lab Director', 'QA Reviewer'] as const;

export function followUpAlertsDue(items: readonly FollowUpItem[]): { item: FollowUpItem; level: FollowUpAlertLevel }[] {
  const out: { item: FollowUpItem; level: FollowUpAlertLevel }[] = [];
  for (const item of items) {
    const sent = item.record.alertsSent;
    if (item.status === 'overdue' && !sent.overdue) out.push({ item, level: 'overdue' });
    else if (item.status === 'dueSoon' && !sent.dueSoon && !sent.overdue) out.push({ item, level: 'dueSoon' });
  }
  return out;
}

export interface FollowUpAlertUser {
  id: string;
  firstName?: string;
  lastName?: string;
  roles?: readonly string[];
  status?: string;
}

/** Who hears about one follow-up: its sign-out pathologist and the alert roles, active only, once each. */
export function followUpAlertRecipients(item: Pick<FollowUpItem, 'signedOutBy'>, users: readonly FollowUpAlertUser[]): FollowUpAlertUser[] {
  const active = users.filter(u => (u.status ?? 'Active') === 'Active');
  const chosen = active.filter(u => u.id === item.signedOutBy || (u.roles ?? []).some(r => (FOLLOW_UP_ALERT_ROLES as readonly string[]).includes(r)));
  return chosen.filter((u, i) => chosen.findIndex(x => x.id === u.id) === i);
}
