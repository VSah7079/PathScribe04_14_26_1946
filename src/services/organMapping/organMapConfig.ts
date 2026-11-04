// src/services/organMapping/organMapConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the stored organ-map settings and the two Configuration actions.
// • Colours and patterns, by layer (enterprise, jurisdiction, facility):
//   config:organ-map-scheme:manage.
// • A lab's own question bindings, by template: config:organ-map-bindings:manage.
// Each change is checked, validated, stored and audited (before → after).
// Browser storage today (mock); the API contract is docs/architecture/
// ORGAN_MAPPING_API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import {
  organMapSchemeChangeDetail, validateOrganMapScheme, resolveOrganMapScheme,
  type OrganMapSchemeLayers, type OrganMapSchemeProblem, type PartialScheme, type ResolvedOrganMapScheme,
} from './organMapScheme';
import {
  organMapBindingChangeDetail, validateOrganMapBinding,
  type OrganMapBinding, type OrganMapBindingProblem,
} from './organMapBindings';
import { PRECURSOR_OF } from './organMapDerived';

const SCHEME_KEY = 'organMapSchemeLayers';
const BINDINGS_KEY = 'organMapBindings';

export interface OrganMapConfigStore {
  getLayers(): OrganMapSchemeLayers;
  setLayers(layers: OrganMapSchemeLayers): void;
  getBindings(): Record<string, OrganMapBinding>;
  setBindings(bindings: Record<string, OrganMapBinding>): void;
}

export const browserOrganMapConfigStore: OrganMapConfigStore = {
  getLayers: () => storageGet<OrganMapSchemeLayers>(SCHEME_KEY, {}),
  setLayers: layers => storageSet(SCHEME_KEY, layers),
  getBindings: () => storageGet<Record<string, OrganMapBinding>>(BINDINGS_KEY, {}),
  setBindings: bindings => storageSet(BINDINGS_KEY, bindings),
};

export interface OrganMapConfigDeps {
  enforce: (capability: string, context?: { facilityId?: string | null }) => Promise<{ allowed: boolean }>;
  logAudit: (entry: { type: 'user'; event: string; detail: string; user: string; caseId: null; confidence: null; facilityId?: string | null }) => unknown;
  userName: string;
  store: OrganMapConfigStore;
}

export type OrganMapSchemeScope = { kind: 'enterprise' } | { kind: 'jurisdiction'; code: string } | { kind: 'facility'; facilityId: string };

const scopeLabel = (s: OrganMapSchemeScope) => (s.kind === 'enterprise' ? 'enterprise' : s.kind === 'jurisdiction' ? `jurisdiction ${s.code}` : `facility ${s.facilityId}`);

export function schemeLayerOf(layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope): PartialScheme | undefined {
  if (scope.kind === 'enterprise') return layers.enterprise;
  if (scope.kind === 'jurisdiction') return layers.jurisdictions?.[scope.code];
  return layers.facilities?.[scope.facilityId];
}

function withLayer(layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope, layer: PartialScheme | null): OrganMapSchemeLayers {
  const clean = layer && Object.keys(layer).length ? layer : undefined;
  if (scope.kind === 'enterprise') return { ...layers, enterprise: clean };
  const field = scope.kind === 'jurisdiction' ? 'jurisdictions' : 'facilities';
  const id = scope.kind === 'jurisdiction' ? scope.code : scope.facilityId;
  const map = { ...(layers[field] ?? {}) };
  if (clean) map[id] = clean; else delete map[id];
  return { ...layers, [field]: map };
}

export type OrganMapConfigResult<P> = { ok: true; warnings?: OralThresholdConflict[] } | { ok: false; reason: 'notPermitted' } | { ok: false; reason: 'invalid'; problems: P[] };

/** Batch 465b (Pete): a layer whose oral cavity rules, with what it inherits, no longer keep the involved
 *  distance below the close distance — e.g. after a higher layer raised its involved distance. Maps there fall
 *  back to PathScribe's close rule until the layer is reconciled (resolveHeadNeckMap.effectiveOralThresholds). */
export interface OralThresholdConflict { scope: OrganMapSchemeScope; involvedMm: number; closeMm: number }

/** Every layer that sets an oral cavity distance and, with what it inherits, has its involved distance at or
 *  above its close distance. `facilityJurisdictions`: each facility's jurisdiction (for what it inherits). */
export function organMapThresholdConflicts(layers: OrganMapSchemeLayers, facilityJurisdictions: Record<string, string | null | undefined> = {}): OralThresholdConflict[] {
  const scopes: OrganMapSchemeScope[] = [
    ...(layers.enterprise ? [{ kind: 'enterprise' } as const] : []),
    ...Object.keys(layers.jurisdictions ?? {}).sort().map(code => ({ kind: 'jurisdiction', code } as const)),
    ...Object.keys(layers.facilities ?? {}).sort().map(facilityId => ({ kind: 'facility', facilityId } as const)),
  ];
  const out: OralThresholdConflict[] = [];
  for (const scope of scopes) {
    const own = schemeLayerOf(layers, scope)?.thresholds;
    if (own?.oralInvolvedMarginMm === undefined && own?.oralCloseMarginMm === undefined) continue;
    const t = scope.kind === 'enterprise' ? resolveOrganMapScheme({ enterprise: layers.enterprise }, {}).thresholds
      : scope.kind === 'jurisdiction' ? resolveOrganMapScheme(layers, { jurisdiction: scope.code }).thresholds
        : resolveOrganMapScheme(layers, { facilityId: scope.facilityId, jurisdiction: facilityJurisdictions[scope.facilityId] ?? null }).thresholds;
    if (t.oralCloseMarginMm <= t.oralInvolvedMarginMm) out.push({ scope, involvedMm: t.oralInvolvedMarginMm, closeMm: t.oralCloseMarginMm });
  }
  return out;
}

/** What a layer inherits: the built-in scheme with the layers above it (a facility also inherits its jurisdiction's). */
export function inheritedOrganMapResolution(layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope, facilityJurisdiction?: string | null): ResolvedOrganMapScheme {
  if (scope.kind === 'enterprise') return resolveOrganMapScheme({}, {});
  if (scope.kind === 'jurisdiction') return resolveOrganMapScheme({ enterprise: layers.enterprise }, {});
  return resolveOrganMapScheme({ enterprise: layers.enterprise, jurisdictions: layers.jurisdictions }, { jurisdiction: facilityJurisdiction ?? null });
}

/** Saves one layer of colours and patterns (null = back to inherited). Batch 465: its thresholds are
 *  validated together with what it inherits (a facility's from its jurisdiction, when given). */
export async function saveOrganMapSchemeLayer(
  input: { scope: OrganMapSchemeScope; layer: PartialScheme | null; facilityJurisdiction?: string | null; facilityJurisdictions?: Record<string, string | null | undefined> },
  deps: OrganMapConfigDeps,
): Promise<OrganMapConfigResult<OrganMapSchemeProblem>> {
  const facilityId = input.scope.kind === 'facility' ? input.scope.facilityId : null;
  if (!(await deps.enforce('config:organ-map-scheme:manage', { facilityId })).allowed) return { ok: false, reason: 'notPermitted' };
  const layers = deps.store.getLayers();
  const ownJurisdiction = input.facilityJurisdiction ?? (input.scope.kind === 'facility' ? input.facilityJurisdictions?.[input.scope.facilityId] : null);
  const inherited = inheritedOrganMapResolution(layers, input.scope, ownJurisdiction).thresholds;
  const problems = input.layer ? validateOrganMapScheme(input.layer, inherited) : [];
  if (problems.length) return { ok: false, reason: 'invalid', problems };
  const before = schemeLayerOf(layers, input.scope);
  const next = withLayer(layers, input.scope, input.layer);
  deps.store.setLayers(next);
  // Batch 465b (Pete): a change can leave a lower layer's oral rules in conflict with what it now inherits; the
  // save goes ahead, the conflicts come back as warnings, and the audit names them.
  const conflicts = organMapThresholdConflicts(next, input.facilityJurisdictions ?? {});
  // The audit names only the conflicts this save caused; the warnings list them all.
  const existing = new Set(organMapThresholdConflicts(layers, input.facilityJurisdictions ?? {}).map(c => scopeLabel(c.scope)));
  const caused = conflicts.filter(c => !existing.has(scopeLabel(c.scope)));
  const changed = organMapSchemeChangeDetail(scopeLabel(input.scope), before, schemeLayerOf(next, input.scope));
  const detail = changed && caused.length
    ? `${changed}; oral cavity rules now in conflict (involved not below close): ${caused.map(c => `${scopeLabel(c.scope)} (${c.involvedMm} mm / ${c.closeMm} mm)`).join(', ')}`
    : changed;
  if (detail) await deps.logAudit({ type: 'user', event: 'Organ map colours changed', detail, user: deps.userName, caseId: null, confidence: null, facilityId });
  return conflicts.length ? { ok: true, warnings: conflicts } : { ok: true };
}

/** Saves (or, with null, removes) a lab's binding for one template. */
export async function saveOrganMapBinding(
  input: { template: Parameters<typeof validateOrganMapBinding>[1]; binding: OrganMapBinding | null },
  deps: OrganMapConfigDeps,
): Promise<OrganMapConfigResult<OrganMapBindingProblem>> {
  if (!(await deps.enforce('config:organ-map-bindings:manage')).allowed) return { ok: false, reason: 'notPermitted' };
  // Batch 466d: saved from the per-component picker, a binding with margin questions on a map with a precursor has
  // them assigned per component (it no longer waits for review).
  if (input.binding?.derived && PRECURSOR_OF[input.binding.mapType]) input = { ...input, binding: { ...input.binding, marginComponents: true } };
  const problems = input.binding ? validateOrganMapBinding(input.binding, input.template) : [];
  if (problems.length) return { ok: false, reason: 'invalid', problems };
  const all = { ...deps.store.getBindings() };
  const before = all[input.template.id];
  if (input.binding) all[input.template.id] = input.binding; else delete all[input.template.id];
  deps.store.setBindings(all);
  await deps.logAudit({
    type: 'user', event: 'Organ map binding changed',
    detail: organMapBindingChangeDetail(input.template.id, before, input.binding ?? undefined),
    user: deps.userName, caseId: null, confidence: null,
  });
  return { ok: true };
}

/** The colours and patterns for one facility (its jurisdiction's in between). */
export function organMapSchemeFor(store: OrganMapConfigStore, where: { facilityId?: string | null; jurisdiction?: string | null }): ResolvedOrganMapScheme {
  return resolveOrganMapScheme(store.getLayers(), where);
}
