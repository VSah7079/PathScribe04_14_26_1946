// src/services/signoutGates/preAnalyticGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 383. The decisions behind PreAnalyticDateGateModal: which
// dates a specimen still needs, what is still required (Field Requirements,
// page "report", group signoutGates), and the resolutions the sign-out saves.
// Collection and receipt are independent: only the dates a specimen is
// missing are asked for, each answered with the documented date/time or the
// jurisdiction's administrative override; any override needs a comment (the
// audited justification).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';

export interface PreAnalyticDateGateSpecimen {
  specimenId: string;
  label: string;
  description: string;
  missingCollectedAt: boolean;
  missingReceivedAt: boolean;
}

export interface PreAnalyticDateResolution {
  specimenId: string;
  collectedAt?: string;
  collectedAtAdministrativeOverride?: boolean;
  receivedAt?: string;
  receivedAtAdministrativeOverride?: boolean;
  /** Required whenever either override flag above is true — the real,
   *  audited justification for why neither a documented date nor a
   *  reasonable estimate could be established. */
  overrideComment?: string;
}

export type PreAnalyticFieldState =
  | { mode: 'unset' }
  | { mode: 'time'; value: string }
  | { mode: 'override' };

export interface PreAnalyticRowState {
  collected: PreAnalyticFieldState;
  received: PreAnalyticFieldState;
  comment: string;
}

export const emptyPreAnalyticRow = (): PreAnalyticRowState => ({ collected: { mode: 'unset' }, received: { mode: 'unset' }, comment: '' });

export const preAnalyticRowUsesOverride = (row: PreAnalyticRowState): boolean =>
  row.collected.mode === 'override' || row.received.mode === 'override';

const answer = (f: PreAnalyticFieldState): string => (f.mode === 'time' ? f.value.trim() : f.mode === 'override' ? 'override' : '');

/** Required fields still missing on any specimen, once each, in catalog order. */
export function preAnalyticGateMissing(
  specimens: readonly PreAnalyticDateGateSpecimen[],
  rows: Readonly<Record<string, PreAnalyticRowState>>,
  requirements: readonly ResolvedFieldRequirement[],
): string[] {
  const applicable = requirements.filter(f => f.group === 'signoutGates' && f.id.startsWith('preAnalytic'));
  const missing = new Set<string>();
  for (const s of specimens) {
    const row = rows[s.specimenId] ?? emptyPreAnalyticRow();
    const values = {
      preAnalyticCollectedAt: s.missingCollectedAt ? answer(row.collected) : 'n/a',
      preAnalyticReceivedAt: s.missingReceivedAt ? answer(row.received) : 'n/a',
      preAnalyticOverrideComment: preAnalyticRowUsesOverride(row) ? row.comment.trim() : 'n/a',
    };
    for (const f of missingRequiredFields(applicable, values)) missing.add(f.id);
  }
  return applicable.filter(f => missing.has(f.id)).map(f => f.id);
}

export function buildPreAnalyticResolutions(
  specimens: readonly PreAnalyticDateGateSpecimen[],
  rows: Readonly<Record<string, PreAnalyticRowState>>,
): PreAnalyticDateResolution[] {
  return specimens.map(s => {
    const row = rows[s.specimenId] ?? emptyPreAnalyticRow();
    const resolution: PreAnalyticDateResolution = { specimenId: s.specimenId };
    if (s.missingCollectedAt) {
      if (row.collected.mode === 'time') resolution.collectedAt = new Date(row.collected.value).toISOString();
      else if (row.collected.mode === 'override') resolution.collectedAtAdministrativeOverride = true;
    }
    if (s.missingReceivedAt) {
      if (row.received.mode === 'time') resolution.receivedAt = new Date(row.received.value).toISOString();
      else if (row.received.mode === 'override') resolution.receivedAtAdministrativeOverride = true;
    }
    if (preAnalyticRowUsesOverride(row)) resolution.overrideComment = row.comment.trim();
    return resolution;
  });
}
