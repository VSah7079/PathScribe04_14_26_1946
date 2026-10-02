// src/services/registryGoLive/registryOverlay.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424 (Pete, Oct 1 2026: baseline vs overlay). ForMedrixAI's release
// ships the baseline template (vYYYY.Q.X). A site's local customisations are
// an overlay on it, each stamped with the baseline version it was made
// against:
//
//   codeMapping   the lab's code for one of its result categories
//                 (screening registry configuration), element codes:<field>
//   holdRule      "hold results without the national identifier", element
//                 identifier
//   adapterRule   a consultant's local rule in the engine adapter (a
//                 facility-specific mapping, a custom segment rule, a local
//                 data transform). Modelled here until the engine team's
//                 hooks land: recorded with the element it touches.
//
// A release never overwrites any of these (they are stored apart from the
// definitions). When a later version's change list touches an element a
// local change depends on, that change needs review: it is flagged, blocks
// go-live (pre-check overridesReviewed), and makes a minor version need
// re-approval for this site. Confirming re-stamps it to the latest version.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryCodeMapping } from '../screeningRegistry/IScreeningRegistryConfigService';
import {
  compareRegistryTemplateVersions, versionsSince,
  type RegistryTemplateElement, type RegistryTemplateVersion,
} from './registryTemplateVersions';
import type { RegistryDomain } from './registryTemplateVersions';

export const FIRST_TEMPLATE_VERSION = 'v2026.4.1';

export interface RegistryAdapterRule {
  id: string;
  domain: RegistryDomain;
  registryId: string;
  element: RegistryTemplateElement;
  /** What the rule does (the consultant's words; data, shown as entered). */
  description: string;
  baselineVersion: string;
  recordedBy: string;
  recordedAt: string;
}

export interface RegistryLocalChange {
  kind: 'codeMapping' | 'holdRule' | 'adapterRule';
  /** Unique within the registry: the mapping's field and category, 'identifierHold', or the rule id. */
  id: string;
  element: RegistryTemplateElement;
  baselineVersion: string;
  /** For a code mapping: the code; for an adapter rule: its description. */
  detail: string;
}

export interface RegistryLocalChangeReview extends RegistryLocalChange {
  /** Later versions whose change list touches this element (a minor or breaking version without a list counts). */
  touchedBy: { version: string; changeClass: string; note?: string }[];
}

export const codeMappingChangeId = (m: Pick<RegistryCodeMapping, 'field' | 'categoryId'>) => `${m.field}:${m.categoryId}`;

/** Every local change on a registry, from the screening configuration (if any) and the adapter rules. */
export function registryLocalChanges(
  screening: { codeMappings: RegistryCodeMapping[]; requirePatientIdentifier?: boolean; identifierHoldBaselineVersion?: string } | undefined,
  adapterRules: RegistryAdapterRule[],
): RegistryLocalChange[] {
  const out: RegistryLocalChange[] = [];
  for (const m of screening?.codeMappings ?? []) {
    out.push({ kind: 'codeMapping', id: codeMappingChangeId(m), element: `codes:${m.field}` as RegistryTemplateElement, baselineVersion: m.baselineVersion ?? FIRST_TEMPLATE_VERSION, detail: m.code });
  }
  if (screening?.requirePatientIdentifier) {
    out.push({ kind: 'holdRule', id: 'identifierHold', element: 'identifier', baselineVersion: screening.identifierHoldBaselineVersion ?? FIRST_TEMPLATE_VERSION, detail: '' });
  }
  for (const r of adapterRules) out.push({ kind: 'adapterRule', id: r.id, element: r.element, baselineVersion: r.baselineVersion, detail: r.description });
  return out;
}

/** The elements this site has customised. */
export const customisedElements = (changes: RegistryLocalChange[]): RegistryTemplateElement[] => [...new Set(changes.map(c => c.element))];

/** The local changes a later version touches, with the versions that touch each. */
export function localChangesNeedingReview(changes: RegistryLocalChange[], history: readonly RegistryTemplateVersion[], today: Date): RegistryLocalChangeReview[] {
  const out: RegistryLocalChangeReview[] = [];
  for (const c of changes) {
    const touchedBy: RegistryLocalChangeReview['touchedBy'] = [];
    for (const v of versionsSince(c.baselineVersion, history, today)) {
      if (v.changeClass === 'editorial' || v.changeClass === 'initial') continue;
      const hit = v.changes?.length ? v.changes.find(x => x.element === c.element && x.changeClass !== 'editorial') : undefined;
      if (hit) touchedBy.push({ version: v.version, changeClass: hit.changeClass, note: hit.note });
      else if (!v.changes?.length) touchedBy.push({ version: v.version, changeClass: v.changeClass });
    }
    if (touchedBy.length) out.push({ ...c, touchedBy });
  }
  return out;
}

/**
 * Batch 424: a save's code mappings, stamped. A mapping the save didn't change
 * keeps its stamp (so saving never quietly clears a review); a new or changed
 * one is stamped with the version it was made against.
 */
export function stampCodeMappings(next: RegistryCodeMapping[], previous: RegistryCodeMapping[], latestVersion: string): RegistryCodeMapping[] {
  return next.map(m => {
    const before = previous.find(p => p.field === m.field && p.categoryId === m.categoryId);
    const unchanged = before && before.code === m.code && (before.display ?? '') === (m.display ?? '');
    return { ...m, baselineVersion: unchanged ? (before!.baselineVersion ?? FIRST_TEMPLATE_VERSION) : latestVersion };
  });
}

/** The newer of two versions (for re-stamping on confirm). */
export const laterVersion = (a: string, b: string) => (compareRegistryTemplateVersions(a, b) >= 0 ? a : b);
