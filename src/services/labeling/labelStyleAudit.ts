// src/services/labeling/labelStyleAudit.ts
// Batch 715: the audit entry for changing a facility's (or the enterprise's)
// letters-or-numbers choice. Facility name and the old and new choice per level;
// no patient data. Returns null when nothing about labelling changed.

import type { NewAuditLog } from '../auditlog/IAuditService';
import { LABEL_LEVELS, ownLabelStyle, type LabelStyleCarrier } from './labelStyle';

const show = (v: string | undefined) => v ?? 'not set';

export function buildLabelStyleAuditEntry(
  facility: LabelStyleCarrier & { name: string; isEnterprise?: boolean },
  before: LabelStyleCarrier | null | undefined,
  after: LabelStyleCarrier,
  userName: string,
): NewAuditLog | null {
  const was = ownLabelStyle(before);
  const now = ownLabelStyle(after);
  const changes = LABEL_LEVELS.filter(l => (was[l] ?? null) !== (now[l] ?? null)).map(l => `${l} ${show(was[l])} -> ${show(now[l])}`);
  if (changes.length === 0) return null;
  return {
    type: 'user',
    event: facility.isEnterprise ? 'Enterprise label style changed' : 'Facility label style changed',
    detail: `${facility.name}: ${changes.join('; ')} (applies to new cases only; existing labels unchanged)`,
    user: userName,
    caseId: null,
    confidence: null,
  } as NewAuditLog;
}
