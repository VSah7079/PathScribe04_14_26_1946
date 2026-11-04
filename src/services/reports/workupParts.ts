// src/services/reports/workupParts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 427 (Pete: "Multi-Part Single Workup"). A synoptic workup covers its
// own part (specimenId) and, when combined, further parts
// (additionalSpecimenIds): one resection protocol over Part A and Part B, say.
// The structured result lists every part (synopticResultPayload.ts
// specimen_ids), the AI's template proposals don't add a second workup of
// the same protocol for a part already covered
// (assistMilestoneRules.applyTemplateProposals), and the AI is told which
// parts each workup covers. Pure.
//
// Rules:
//   - only a draft workup's parts can change (a released one is what was sent);
//   - a part can be added only if it's on the case;
//   - a part can't be covered twice by the same protocol: if another workup
//     already reports it with this template, combine that one instead.
// ─────────────────────────────────────────────────────────────────────────────

import type { SynopticReportInstance } from '@/types/case/Case';

export type WorkupPartsMode = 'independent' | 'combined';

/** Every part a workup covers, its own first. */
export const workupParts = (inst: Pick<SynopticReportInstance, 'specimenId' | 'additionalSpecimenIds'>): string[] =>
  [inst.specimenId, ...(inst.additionalSpecimenIds ?? []).filter(id => id !== inst.specimenId)];

/** Whether any workup of this template already covers the part. */
export function partCoveredBy(reports: SynopticReportInstance[], specimenId: string, templateId: string, exceptInstanceId?: string): SynopticReportInstance | undefined {
  return reports.find(r => r.instanceId !== exceptInstanceId && r.templateId === templateId && workupParts(r).includes(specimenId));
}

export type SetWorkupPartsResult =
  | { ok: true; reports: SynopticReportInstance[]; added: string[]; removed: string[] }
  | { ok: false; reason: 'notFound' | 'notDraft' | 'unknownPart' | 'alreadyCovered'; specimenId?: string; coveredBy?: string };

/** Sets which further parts a draft workup covers (independent = none). */
export function setWorkupParts(
  reports: SynopticReportInstance[],
  specimenIds: string[],
  instanceId: string,
  choice: { mode: WorkupPartsMode; additionalSpecimenIds: string[] },
  now: string,
): SetWorkupPartsResult {
  const inst = reports.find(r => r.instanceId === instanceId);
  if (!inst) return { ok: false, reason: 'notFound' };
  if (inst.status !== 'draft') return { ok: false, reason: 'notDraft' };
  const wanted = choice.mode === 'independent' ? [] : [...new Set(choice.additionalSpecimenIds)].filter(id => id !== inst.specimenId);
  const unknown = wanted.find(id => !specimenIds.includes(id));
  if (unknown) return { ok: false, reason: 'unknownPart', specimenId: unknown };
  for (const id of wanted) {
    const other = partCoveredBy(reports, id, inst.templateId, inst.instanceId);
    if (other) return { ok: false, reason: 'alreadyCovered', specimenId: id, coveredBy: other.instanceId };
  }
  const before = inst.additionalSpecimenIds ?? [];
  const { additionalSpecimenIds: _old, ...rest } = inst;
  const next: SynopticReportInstance = { ...rest, ...(wanted.length ? { additionalSpecimenIds: wanted } : {}), updatedAt: now };
  return {
    ok: true,
    reports: reports.map(r => (r.instanceId === instanceId ? next : r)),
    added: wanted.filter(id => !before.includes(id)),
    removed: before.filter(id => !wanted.includes(id)),
  };
}
