// src/services/signoutGates/fixativeGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 383. The decisions behind FixativeTimeGateModal: when each
// specimen is resolved, what is still required (the organisation's Field
// Requirements, page "report", group signoutGates), and the resolutions the
// sign-out saves. The modal used to decide all of this inline.
//
// A specimen is resolved one of three ways: the documented time, an estimate
// (the time plus the "estimated" flag), or "no time is possible". The
// fixation time rule (locked, CAP/ASCO) means one of those must be chosen; an
// organisation can also require a comment on the last-resort path.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';

export interface FixativeGateSpecimen {
  specimenId: string;
  label: string;
  description: string;
}

export interface FixativeResolution {
  specimenId: string;
  processedAt?: string;          // undefined only for the unrecoverable path
  processedAtIsEstimated: boolean;
  resolutionTypeId: 'res-fixation-documented' | 'res-fixation-estimated' | 'res-fixation-unrecoverable';
  resolutionComment?: string;
}

export type FixativeRowState =
  | { mode: 'unset' }
  | { mode: 'time'; value: string; estimated: boolean }
  | { mode: 'unrecoverable'; comment: string };

const filled = (v: string): string => v.trim();

/** Required fields still missing on any specimen, once each, in catalog order. */
export function fixativeGateMissing(
  specimens: readonly FixativeGateSpecimen[],
  rows: Readonly<Record<string, FixativeRowState>>,
  requirements: readonly ResolvedFieldRequirement[],
): string[] {
  const applicable = requirements.filter(f => f.group === 'signoutGates' && f.id.startsWith('fixation'));
  const missing = new Set<string>();
  for (const s of specimens) {
    const r = rows[s.specimenId] ?? { mode: 'unset' as const };
    const values = {
      fixationTime: r.mode === 'time' ? filled(r.value) : r.mode === 'unrecoverable' ? 'unrecoverable' : '',
      fixationUnrecoverableComment: r.mode === 'unrecoverable' ? filled(r.comment) : 'n/a',
    };
    for (const f of missingRequiredFields(applicable, values)) missing.add(f.id);
  }
  return applicable.filter(f => missing.has(f.id)).map(f => f.id);
}

export function buildFixativeResolutions(
  specimens: readonly FixativeGateSpecimen[],
  rows: Readonly<Record<string, FixativeRowState>>,
): FixativeResolution[] {
  return specimens.map(s => {
    const r = rows[s.specimenId];
    if (r?.mode === 'time') {
      return {
        specimenId: s.specimenId,
        processedAt: new Date(r.value).toISOString(),
        processedAtIsEstimated: r.estimated,
        resolutionTypeId: r.estimated ? 'res-fixation-estimated' : 'res-fixation-documented',
      };
    }
    return {
      specimenId: s.specimenId,
      processedAtIsEstimated: false,
      resolutionTypeId: 'res-fixation-unrecoverable',
      resolutionComment: (r?.mode === 'unrecoverable' && r.comment.trim()) || undefined,
    };
  });
}
