// src/services/cases/caseTeamAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: the audit entry for a saved case-team change. Until now only the report's change log recorded it. Pure.
//
// PHI-free by construction: staff ids and participation-type ids only (never staff or patient names, never a note).
// Literal English (audit text is a compliance artifact, not UI). The case's accession number is the caseId, and the
// ordering facility rides on facilityId, as for the other case audit entries.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case, CaseParticipant } from '@/types/case/Case';
import type { NewAuditLog } from '../auditlog/IAuditService';

const slots = (list: readonly CaseParticipant[] | undefined): Set<string> => {
  const out = new Set<string>();
  for (const p of list ?? []) if (p.status === 'active') for (const t of p.participationTypeIds) out.add(`${p.staffId}|${t}`);
  return out;
};
const label = (key: string) => { const [staff, type] = key.split('|'); return `${staff} as ${type}`; };

/** Who was added to or taken off the team, by slot. Empty strings when nothing changed on that side. */
export function diffTeam(before: readonly CaseParticipant[] | undefined, after: readonly CaseParticipant[] | undefined): { added: string[]; removed: string[] } {
  const a = slots(before), b = slots(after);
  return {
    added: [...b].filter(k => !a.has(k)).sort().map(label),
    removed: [...a].filter(k => !b.has(k)).sort().map(label),
  };
}

/** The audit entry for the change, or null when the active team did not change (nothing to record). */
export function caseTeamAuditEntry(
  caseData: Pick<Case, 'id' | 'order'>,
  before: readonly CaseParticipant[] | undefined,
  after: readonly CaseParticipant[] | undefined,
  actorName: string,
): NewAuditLog | null {
  const { added, removed } = diffTeam(before, after);
  if (!added.length && !removed.length) return null;
  const parts = [added.length ? `Added: ${added.join(', ')}.` : '', removed.length ? `Removed: ${removed.join(', ')}.` : ''].filter(Boolean);
  return {
    type: 'user', event: 'Case team changed', detail: parts.join(' '),
    user: actorName, caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null, confidence: null,
  };
}
