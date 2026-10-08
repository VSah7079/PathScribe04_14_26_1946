// src/services/organMapping/organMapDerived.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 466b (Pete: "making data conflicts between the visual map and form
// inputs structurally impossible"; derive the form from the map, for every
// mapped organ). A template's own generic margin questions — "Margin status"
// and "Margin(s) involved" — are calculated from the map's margin questions
// and locked, as the neck's node totals are calculated from their grid. One
// place to enter a margin; the generic answers follow it.
//
// A lab binds them in Configuration → Organ maps → Map bindings: which
// question is the margin status (and what each of its answers means:
// involved, close, not involved), and which lists the margins involved (and
// which map margin each answer names). The generic templates' answers carry no
// meaning PathScribe can read, so nothing binds itself.
//
// Batch 466d (Pete: "the solution needs to handle multi-component pathology
// natively"): margins are reported per component, as CAP does — the invasive
// carcinoma's margins apart from its precursor's (a polyp's adenoma, the
// breast's DCIS, the oral mucosa's dysplasia). Each component has its own
// status and margins-involved questions, calculated only from its own
// findings, so adenoma at an edge can never make the carcinoma "involved". A
// map with one component (renal, rectal) has only the invasive pair. One
// question can't be bound to two of them (no blanket status). This replaces
// Batch 466c's switch that counted adenoma at the margin as involved.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChoiceBinding, OrganMapBinding } from './organMapBindings';
import type { OrganMapPayload, OrganMapType } from './organMapTypes';

export interface DerivedMarginBindings {
  /** The invasive carcinoma's margin status question (a single-component map: the margin status); answer option
   *  id → 'involved' | 'close' | 'notInvolved'. */
  marginStatus?: ChoiceBinding;
  /** The invasive carcinoma's margins involved question; answer option id → a margin of the map (marginKeysFor). */
  marginsInvolved?: ChoiceBinding;
  /** Batch 466d: the precursor's (adenoma, DCIS, dysplasia) margin status question. */
  precursorMarginStatus?: ChoiceBinding;
  /** Batch 466d: the precursor's margins involved question; answer option id → a margin (precursorMarginKeysFor). */
  precursorMarginsInvolved?: ChoiceBinding;
}
export type DerivedKey = keyof DerivedMarginBindings;
export const DERIVED_KEYS: readonly DerivedKey[] = ['marginStatus', 'marginsInvolved', 'precursorMarginStatus', 'precursorMarginsInvolved'];
export const MARGIN_STATUS_VALUES: readonly string[] = ['involved', 'close', 'notInvolved'];
export type MarginComponent = 'invasive' | 'precursor';
export const componentOfKey = (key: DerivedKey): MarginComponent => (key.startsWith('precursor') ? 'precursor' : 'invasive');
export const isStatusKey = (key: DerivedKey) => key === 'marginStatus' || key === 'precursorMarginStatus';

/** Batch 466d: the precursor component each map reports apart from the invasive carcinoma (none: one component). */
export const PRECURSOR_OF: Partial<Record<OrganMapType, 'adenoma' | 'dcis' | 'dysplasia'>> = {
  colorectalPolyp: 'adenoma', breastClock: 'dcis', oralCavity: 'dysplasia',
};
/** The derived questions a map type can have: the invasive pair, and the precursor pair where it has one. */
export const derivedKeysFor = (mapType: OrganMapType): DerivedKey[] =>
  (marginKeysFor(mapType).length === 0 ? [] : PRECURSOR_OF[mapType] ? [...DERIVED_KEYS] : ['marginStatus', 'marginsInvolved']);

/** Each map's margin sectors and the margin each one is (several sectors can be one margin). */
const MARGIN_KEYS: Partial<Record<OrganMapType, Record<string, string>>> = {
  renalResection: { m_vein: 'renalVein', m_ureter: 'ureter', m_softTissue: 'softTissue', m_parenchymal: 'parenchymal' },
  colorectalPolyp: { deep: 'deep', lateralL: 'lateral', lateralR: 'lateral' },
  rectalResection: { crm_anterior: 'crm', crm_left: 'crm', crm_posterior: 'crm', crm_right: 'crm', long_distal: 'distal' },
  oralCavity: { mPeripheral: 'peripheral', mDeep: 'deep' },
};
const BREAST_FACES = ['superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior'];

/** The margins a map type reports (empty: it has none to derive from). */
export function marginKeysFor(mapType: OrganMapType): string[] {
  if (mapType === 'breastClock') return BREAST_FACES;
  return [...new Set(Object.values(MARGIN_KEYS[mapType] ?? {}))];
}

/** Batch 466d: the margins a precursor is reported at (CAP: adenoma at the mucosal margin; dysplasia at the
 *  mucosal margin; DCIS at each face). */
export function precursorMarginKeysFor(mapType: OrganMapType): string[] {
  if (mapType === 'colorectalPolyp') return ['lateral'];
  if (mapType === 'oralCavity') return ['peripheral'];
  if (mapType === 'breastClock') return BREAST_FACES;
  return [];
}
/** The margins a derived question's answers can name. */
export const marginKeysOfComponent = (mapType: OrganMapType, component: MarginComponent) =>
  (component === 'precursor' ? precursorMarginKeysFor(mapType) : marginKeysFor(mapType));

/** The margin a sector is, or undefined (a breast margin sector is `m_<face>_<invasive|dcis>`). */
export function marginKeyOf(mapType: OrganMapType, sectorId: string): string | undefined {
  if (mapType === 'breastClock') return /^m_([a-z]+)_/.exec(sectorId)?.[1];
  return MARGIN_KEYS[mapType]?.[sectorId];
}

type MarginState = { status?: 'involved' | 'close' | 'notInvolved'; involved: string[] };
type PayloadLike = Pick<OrganMapPayload, 'mapType' | 'sectors'> & { meta?: Record<string, string> };

/** The status from margins as (key, category) pairs. Involved as soon as any margin is; otherwise a status only
 *  once every margin drawn is reported (a margin with several sectors — the CRM's quadrants — counts once any of
 *  its sectors is), so "not involved" never goes out while a margin is still blank: close when one is close, else
 *  not involved. */
function stateOf(margins: { key: string; category: string }[]): MarginState {
  const isReported = (c: string) => c === 'marginPositive' || c === 'marginClose' || c === 'marginClear';
  const involved = [...new Set(margins.filter(m => m.category === 'marginPositive').map(m => m.key))];
  if (involved.length) return { status: 'involved', involved };
  const keys = [...new Set(margins.map(m => m.key))];
  if (!keys.length || keys.some(k => !margins.some(m => m.key === k && isReported(m.category)))) return { involved: [] };
  return { status: margins.some(m => m.category === 'marginClose') ? 'close' : 'notInvolved', involved: [] };
}

/** Batch 466d: a breast margin sector's component (`m_<face>_inv` invasive, `m_<face>_dcis` DCIS). */
const breastComponentOf = (sectorId: string): MarginComponent | undefined =>
  (sectorId.endsWith('_inv') ? 'invasive' : sectorId.endsWith('_dcis') ? 'precursor' : undefined);

/** Batch 466d: the faces a breast binding's margins grid reports for each component (its rows, where that column
 *  is bound). A face the lab's grid doesn't have can never be reported, so it isn't waited for. */
export type MarginScope = { invasive?: ReadonlySet<string>; precursor?: ReadonlySet<string> };
export function marginScopeOf(binding: Pick<OrganMapBinding, 'mapType'> | null | undefined): MarginScope | undefined {
  if (binding?.mapType !== 'breastClock') return undefined;
  const m = (binding as { margins?: { rows?: Record<string, string>; columns?: { invasive?: string; dcis?: string } } }).margins;
  const faces = new Set(Object.values(m?.rows ?? {}));
  return { invasive: m?.columns?.invasive ? faces : new Set(), precursor: m?.columns?.dcis ? faces : new Set() };
}
const inScope = (scope: MarginScope | undefined, component: MarginComponent, key: string | undefined) =>
  !!key && (!scope?.[component] || scope[component]!.has(key));

/** What the map says about one component's margins (Batch 466d). The invasive carcinoma: its margin sectors'
 *  categories (a precursor's mark on a sector — adenoma or dysplasia at the margin — is ignored). The precursor:
 *  the breast's DCIS sectors; a polyp's "adenoma at the lateral margin" and the oral mucosa's dysplasia at the
 *  peripheral margin, from their answers (present → involved; absent → not involved; not answered → no status;
 *  Batch 466e: oral dysplasia involves the margin only when high-grade). */
export function derivedMarginState(payload: PayloadLike, component: MarginComponent = 'invasive', scope?: MarginScope): MarginState {
  const { mapType } = payload;
  if (component === 'precursor') {
    if (mapType === 'breastClock') {
      return stateOf(payload.sectors.filter(s => breastComponentOf(s.id) === 'precursor' && inScope(scope, 'precursor', marginKeyOf(mapType, s.id))).map(s => ({ key: marginKeyOf(mapType, s.id)!, category: s.category })));
    }
    const answer = mapType === 'colorectalPolyp' ? payload.meta?.adenomaAtMargin : mapType === 'oralCavity' ? payload.meta?.dysplasia : undefined;
    const key = precursorMarginKeysFor(mapType)[0];
    if (!answer || !key) return { involved: [] };
    // Batch 466e (Pete, per CAP / RCPath / ESP / RCPA / KSP): only high-grade dysplasia (severe / CIS) involves the
    // oral mucosal margin; low-grade dysplasia there is recorded on the map but counts as not involved.
    const involved = mapType === 'oralCavity' ? answer === 'highGrade' : answer === 'present';
    return involved ? { status: 'involved', involved: [key] } : { status: 'notInvolved', involved: [] };
  }
  // A polyp answered as having no invasive carcinoma: its margins have no status (not "not involved").
  if (mapType === 'colorectalPolyp' && payload.meta?.invasiveCarcinoma === 'absent') return { involved: [] };
  const sectors = mapType === 'breastClock' ? payload.sectors.filter(s => breastComponentOf(s.id) === 'invasive' && inScope(scope, 'invasive', marginKeyOf(mapType, s.id))) : payload.sectors;
  return stateOf(sectors.map(s => ({ key: marginKeyOf(mapType, s.id) ?? '', category: s.category })).filter(m => m.key));
}

/** Batch 466d: whether the map records invasive carcinoma (a sector drawn as carcinoma). */
export const mapShowsInvasiveCarcinoma = (payload: Pick<OrganMapPayload, 'sectors'>): boolean => payload.sectors.some(s => s.category === 'invasive');

/** Batch 466d (Pete): the invasive carcinoma's margins not yet reported, when the map records invasive carcinoma
 *  and gives no status (none involved, and a margin still blank). Empty: nothing to warn about. */
export function invasiveMarginGaps(payload: PayloadLike, scope?: MarginScope): string[] {
  if (!mapShowsInvasiveCarcinoma(payload)) return [];
  const state = derivedMarginState(payload, 'invasive', scope);
  if (state.status) return [];
  const isReported = (c: string) => c === 'marginPositive' || c === 'marginClose' || c === 'marginClear';
  const sectors = payload.mapType === 'breastClock' ? payload.sectors.filter(s => breastComponentOf(s.id) === 'invasive' && inScope(scope, 'invasive', marginKeyOf(payload.mapType, s.id))) : payload.sectors;
  const keys = [...new Set(sectors.map(s => marginKeyOf(payload.mapType, s.id)).filter((k): k is string => !!k))];
  return keys.filter(k => !sectors.some(s => marginKeyOf(payload.mapType, s.id) === k && isReported(s.category)));
}

/** The questions a binding calculates (locked on the form). */
export function derivedFieldIds(binding: OrganMapBinding | null | undefined): string[] {
  const d = binding?.derived;
  return [...new Set(DERIVED_KEYS.map(k => d?.[k]?.fieldId).filter((id): id is string => !!id))];
}

type Answers = Record<string, string | string[]>;
type FieldLike = { id: string; type: string };

/** The calculated answers as a patch (only what differs). While the map can't give a component's status yet (a
 *  margin still blank, the precursor not answered), its answers are cleared — they are locked, so they never keep
 *  a stale call. A "close" status uses the question's close answer, else its not-involved one. Only the questions
 *  in `fields` (those shown) are written; `fields` gives each one's type. Batch 466d: each component's pair from
 *  its own margins. */
export function derivedMarginPatch(binding: OrganMapBinding, payload: PayloadLike, answers: Answers, fields: readonly FieldLike[]): Answers {
  const d = binding.derived;
  const patch: Answers = {};
  if (!d) return patch;
  const set = (fieldId: string, next: string | string[]) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const empty = field.type === 'checkboxes' ? [] : '';
    if (JSON.stringify(answers[fieldId] ?? empty) !== JSON.stringify(next)) patch[fieldId] = next;
  };
  const optionFor = (values: Record<string, string>, meaning: string) => Object.entries(values).find(([, v]) => v === meaning)?.[0];
  const allowed = new Set(derivedKeysFor(binding.mapType));
  for (const component of ['invasive', 'precursor'] as const) {
    const [statusKey, involvedKey] = component === 'invasive' ? ['marginStatus', 'marginsInvolved'] as const : ['precursorMarginStatus', 'precursorMarginsInvolved'] as const;
    if (!allowed.has(statusKey) || (!d[statusKey]?.fieldId && !d[involvedKey]?.fieldId)) continue;
    const state = derivedMarginState(payload, component, marginScopeOf(binding));
    const st = d[statusKey];
    if (st?.fieldId) {
      const v = st.values;
      const option = state.status ? optionFor(v, state.status) ?? (state.status === 'close' ? optionFor(v, 'notInvolved') : undefined) : undefined;
      const isMulti = fields.find(f => f.id === st.fieldId)?.type === 'checkboxes';
      set(st.fieldId, option ? (isMulti ? [option] : option) : (isMulti ? [] : ''));
    }
    const mi = d[involvedKey];
    if (mi?.fieldId && mi.fieldId !== st?.fieldId) {
      set(mi.fieldId, Object.entries(mi.values).filter(([, key]) => state.involved.includes(key)).map(([id]) => id));
    }
  }
  return patch;
}

export type DerivedBindingProblem = { input: `derived.${DerivedKey}`; problem: 'fieldMissing' | 'noValues' | 'unknownValue' | 'sharedQuestion' };

/** A derived binding's problems: a choice question the template has, not a map input, with meanings for its own
 *  answers that are known. Batch 466d: a precursor question only on a map with a precursor; one question bound
 *  to a single derived role (no blanket margin question shared by the carcinoma and its precursor). */
export function validateDerivedBindings(binding: OrganMapBinding, fields: readonly (FieldLike & { options?: { id: string }[] })[], mapInputFieldIds: ReadonlySet<string>): DerivedBindingProblem[] {
  const problems: DerivedBindingProblem[] = [];
  const d = binding.derived;
  if (!d) return problems;
  const allowed = new Set(derivedKeysFor(binding.mapType));
  const has = (key: DerivedKey) => problems.some(p => p.input === `derived.${key}`);
  for (const key of DERIVED_KEYS) {
    const b = d[key];
    if (!b) continue;
    const input = `derived.${key}` as const;
    if (!allowed.has(key)) { problems.push({ input, problem: 'unknownValue' }); continue; }
    const field = fields.find(f => f.id === b.fieldId);
    if (!field || !['dropdown', 'radio', 'checkboxes'].includes(field.type) || mapInputFieldIds.has(field.id)) { problems.push({ input, problem: 'fieldMissing' }); continue; }
    const own = new Set((field.options ?? []).map(o => o.id));
    const meanings = isStatusKey(key) ? MARGIN_STATUS_VALUES : marginKeysOfComponent(binding.mapType, componentOfKey(key));
    if (!Object.keys(b.values).some(o => own.has(o))) problems.push({ input, problem: 'noValues' });
    if (Object.keys(b.values).some(o => !own.has(o)) || Object.values(b.values).some(v => !meanings.includes(v))) problems.push({ input, problem: 'unknownValue' });
    // A status needs both its involved and not-involved answers (else a call could stay unanswered); a margins
    // involved question lists several, so it's a checkboxes question.
    if (!has(key) && isStatusKey(key) && !['involved', 'notInvolved'].every(m => Object.values(b.values).includes(m))) problems.push({ input, problem: 'noValues' });
    if (!has(key) && !isStatusKey(key) && field.type !== 'checkboxes') problems.push({ input, problem: 'fieldMissing' });
  }
  // One question, one role.
  const seen = new Map<string, DerivedKey>();
  for (const key of DERIVED_KEYS) {
    const id = d[key]?.fieldId;
    if (!id) continue;
    if (seen.has(id) && !has(key)) problems.push({ input: `derived.${key}`, problem: 'sharedQuestion' });
    else seen.set(id, key);
  }
  return problems;
}
