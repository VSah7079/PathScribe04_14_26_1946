// src/services/organMapping/organMapDerivedAnswers.ts
// Batch 466b: the generic margin answers a synoptic's map calculates (organMapDerived.ts), worked out from the
// answers — the map drawn, then its margins read. Kept apart from organMapDerived.ts so the bindings can use
// its pure parts without importing the resolvers.
import type { OrganMapBinding } from './organMapBindings';
import { derivedMarginPatch } from './organMapDerived';
import { resolveOrganMap } from './resolveProstateMap';
import type { OrganMapScheme } from './organMapTypes';
import type { OrganMapThresholds } from './organMapScheme';
import type { PartGridRow } from '../templates/partGrid';

type Answers = Record<string, string | string[]>;
type FieldLike = { id: string; type: string };

/** The whole calculation for a synoptic: draw the map from the answers, then the generic margin answers from it. */
export function derivedMarginAnswers(input: {
  /** The questions shown (only those are written). */
  binding: OrganMapBinding | null | undefined; answers: Answers; fields: readonly FieldLike[];
  scheme: OrganMapScheme; thresholds?: OrganMapThresholds; rows?: readonly PartGridRow[];
}): Answers {
  if (!input.binding?.derived) return {};
  const payload = resolveOrganMap({ binding: input.binding, answers: input.answers, scheme: input.scheme, thresholds: input.thresholds, rows: input.rows, templateId: '', instanceId: '' });
  return derivedMarginPatch(input.binding, payload, input.answers, input.fields);
}

