// src/services/organMapping/resolveRenalMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 466: the renal resection map, worked out from the kidney synoptic's
// answers (CAP/ICCR; it replaces R.E.N.A.L./PADUA nephrometry in the plan).
//
// • Where: the tumour's poles (upper, middle, lower) and halves (lateral,
//   medial; both when not given); its aspect (Pete: anterior / posterior) is
//   marked on those zones and printed.
// • Extent (AJCC 8th pT compartments): perinephric fat, renal sinus fat,
//   pelvicalyceal system, renal vein (or its segmental branches), vena cava
//   below / above the diaphragm, beyond Gerota's fascia, contiguous adrenal.
//   Each compartment answered shows carcinoma. The pT the extent and size
//   point to is printed (pT1a ≤ 4 cm, pT1b ≤ 7, pT2a ≤ 10, pT2b > 10 when
//   limited to the kidney; pT3a, pT3b, pT3c, pT4 by compartment) — a guide
//   beside the map, never the report's stage, which the pathologist records.
// • The three margins (Pete): renal vein and ureter by their status; the soft
//   tissue margin (radical) or parenchymal margin (partial nephrectomy) by its
//   distance and the site's rule (Batch 466b: a partial nephrectomy has the
//   parenchymal and perinephric / capsular soft tissue margins, each by its own
//   rule; its vein and ureter only as non-standard margins) (Pete: 0.0 mm with "=" — on ink — unless the
//   site sets another), so the status always follows the measurement.
// • Batch 466c: a partial nephrectomy's drawing leaves out the renal vein, the
//   vena cava and the ureter unless they're reported (a non-standard margin, or
//   carcinoma in the vein or vena cava); their sectors go with them. Batch 618
//   (PS-492, Pete): the same for Gerota's fascia and the adrenal gland, drawn only
//   when the extent says "beyond Gerota's fascia" / "contiguous adrenal"; the
//   perinephric fat always stays.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChoiceBinding, FieldInputsBinding, NumberBinding } from './organMapBindings';
import { RENAL_COMPARTMENTS, RENAL_HALVES, RENAL_POLES, renalCompartmentsDrawn, renalVariant, type RenalCompartment } from './renalGeometry';
import { chosen, numberOr, sectorOf, type Answers } from './mapResolveShared';
import { partialRenalAnatomy } from './renalAnatomy';
import { marginInvolved, type OrganMapThresholds } from './organMapScheme';
import type { MapCategory, OrganMapScheme, OrganMapSector } from './organMapTypes';

export interface RenalResolved { sectors: OrganMapSector[]; variant: string; meta: Record<string, string>; hasData: boolean }

const choiceOf = (b: FieldInputsBinding, key: string) => b.inputs[key] as ChoiceBinding | undefined;
const numberIn = (b: FieldInputsBinding, key: string, answers: Answers) => {
  const nb = b.inputs[key] as NumberBinding | undefined;
  const n = nb?.fieldId ? numberOr(answers[nb.fieldId]) : undefined;
  return n !== undefined && n >= 0 ? n : undefined;
};

/** The compartment each extent answer shows carcinoma in. */
const EXTENT_COMPARTMENT: Record<string, RenalCompartment> = {
  perinephricFat: 'perinephricFat', sinusFat: 'sinusFat', pelvicalyceal: 'pelvicalyceal', renalVein: 'renalVein',
  ivcBelow: 'ivcBelow', ivcAbove: 'ivcAbove', gerota: 'gerota', adrenal: 'adrenal',
};

/** The pT the extent and size point to (AJCC 8th): nothing when the extent isn't answered (the size alone can't
 *  say the tumour is limited to the kidney); `needsSize` when it is limited and no size is given. */
export function renalPtFromExtent(extent: ReadonlySet<string>, sizeCm: number | undefined): { pT?: string; needsSize?: boolean } {
  if (extent.has('gerota') || extent.has('adrenal')) return { pT: 'pT4' };
  if (extent.has('ivcAbove')) return { pT: 'pT3c' };
  if (extent.has('ivcBelow')) return { pT: 'pT3b' };
  if (['perinephricFat', 'sinusFat', 'pelvicalyceal', 'renalVein'].some(v => extent.has(v))) return { pT: 'pT3a' };
  // pT1–pT2 need the tumour stated as limited to the kidney; a size alone says nothing about extent.
  if (!extent.has('limited')) return {};
  if (sizeCm === undefined) return { needsSize: true };
  return { pT: sizeCm <= 4 ? 'pT1a' : sizeCm <= 7 ? 'pT1b' : sizeCm <= 10 ? 'pT2a' : 'pT2b' };
}

export function resolveRenalResection(binding: FieldInputsBinding, answers: Answers, scheme: OrganMapScheme, thresholds: OrganMapThresholds): RenalResolved {
  const procedure = chosen(choiceOf(binding, 'procedure'), answers)[0];
  const side = chosen(choiceOf(binding, 'kidney'), answers)[0];
  const poles = new Set(chosen(choiceOf(binding, 'poles'), answers));
  const halvesAnswer = chosen(choiceOf(binding, 'halves'), answers);
  const halves = new Set(halvesAnswer.length ? halvesAnswer : RENAL_HALVES);
  const aspect = chosen(choiceOf(binding, 'aspect'), answers).filter(a => a === 'anterior' || a === 'posterior').sort();
  const extent = new Set(chosen(choiceOf(binding, 'extent'), answers));
  const sizeCm = numberIn(binding, 'sizeCm', answers);
  const vein = chosen(choiceOf(binding, 'veinMargin'), answers)[0];
  const ureter = chosen(choiceOf(binding, 'ureterMargin'), answers)[0];
  // The third margin: the parenchymal one for a partial nephrectomy — or, with the procedure not answered, when
  // only a parenchymal distance is given (never silently ignored).
  const parenchymalOnly = numberIn(binding, 'parenchymalMarginMm', answers) !== undefined && numberIn(binding, 'softTissueMarginMm', answers) === undefined;
  const partial = procedure === 'partial' || (!procedure && parenchymalOnly);
  const jump = (key: string) => binding.inputs[key]?.fieldId || undefined;
  const aspectWord = aspect.length === 2 ? 'both' : aspect[0];

  const zones = RENAL_POLES.flatMap(p => RENAL_HALVES.map(h => {
    const tumour = poles.has(p) && halves.has(h);
    return sectorOf(`${p}_${h}`, tumour ? 'invasive' : 'benign', [], scheme, jump('poles'), tumour && aspectWord ? { aspect: aspectWord } : undefined);
  }));
  const involvedCompartments = new Set([...extent].map(v => EXTENT_COMPARTMENT[v]).filter(Boolean));
  const allCompartments = RENAL_COMPARTMENTS.map(c => sectorOf(c, involvedCompartments.has(c) ? 'invasive' : 'benign', [], scheme, jump('extent')));

  // The vein and ureter margins by their status (the category says it; no "site rule" detail).
  const status = (id: string, answer: string | undefined, key: string) =>
    sectorOf(id, answer === 'involved' ? 'marginPositive' : answer === 'notInvolved' ? 'marginClear' : 'notSampled', [], scheme, jump(key));
  // The margins judged by their distance and the site's rule (the status follows the measurement).
  const byDistance = (id: string, key: string, threshold: number, op: Parameters<typeof marginInvolved>[2]) => {
    const mm = numberIn(binding, key, answers);
    const involved = marginInvolved(mm, threshold, op);
    const category: MapCategory = involved === undefined ? 'notSampled' : involved ? 'marginPositive' : 'marginClear';
    return { mm, sector: sectorOf(id, category, [], scheme, jump(key), mm !== undefined ? { marginMm: mm, involved: !!involved } : undefined) };
  };
  const soft = byDistance('m_softTissue', 'softTissueMarginMm', thresholds.renalSoftTissueInvolvedMm, thresholds.renalSoftTissueInvolvedOperator);
  const parenchymal = byDistance('m_parenchymal', 'parenchymalMarginMm', thresholds.renalParenchymalInvolvedMm, thresholds.renalParenchymalInvolvedOperator);
  // Batch 466b (Pete): a radical nephrectomy has the renal vein, ureter and soft tissue margins; a partial one the
  // parenchymal and perinephric / capsular soft tissue margins — the vein and ureter only when the pathologist
  // added them as non-standard margins (an answer left from before isn't drawn: its question is hidden).
  const extra = new Set(chosen(choiceOf(binding, 'extraMargins'), answers));
  const boxes = partial
    ? `ps${extra.has('renalVein') ? 'v' : ''}${extra.has('ureter') ? 'u' : ''}`
    : 'vus';
  const sectorFor: Record<string, OrganMapSector> = {
    p: parenchymal.sector, s: soft.sector, v: status('m_vein', vein, 'veinMargin'), u: status('m_ureter', ureter, 'ureterMargin'),
  };
  const margins = [...boxes].map(b => sectorFor[b]);
  // Batch 466c / 618: a partial nephrectomy draws the vein, vena cava, ureter, Gerota's fascia and adrenal only when
  // reported (renalAnatomy.ts, renalGeometry); the perinephric fat always.
  const anatomy = partial ? partialRenalAnatomy({ boxes, involved: involvedCompartments }) : undefined;
  const variant = renalVariant(partial ? 'partial' : procedure, side, boxes, anatomy);
  const drawn = new Set<string>(renalCompartmentsDrawn(variant));
  const compartments = allCompartments.filter(c => drawn.has(c.id));
  const mm = partial ? parenchymal.mm ?? soft.mm : soft.mm;

  const pt = renalPtFromExtent(extent, sizeCm);
  const meta: Record<string, string> = {
    procedure: partial ? 'partial' : 'radical',
    rule: `${thresholds.renalSoftTissueInvolvedOperator}:${thresholds.renalSoftTissueInvolvedMm}`,
    ruleParenchymal: `${thresholds.renalParenchymalInvolvedOperator}:${thresholds.renalParenchymalInvolvedMm}`,
    ...(aspectWord ? { aspect: aspectWord } : {}),
    ...(pt.pT ? { pT: pt.pT } : {}),
    ...(pt.needsSize ? { pTNeedsSize: '1' } : {}),
    ...(sizeCm !== undefined ? { sizeCm: String(sizeCm) } : {}),
  };
  // The size alone (the template's own question, nearly always answered) doesn't make a map.
  const hasData = !!procedure || !!side || poles.size > 0 || halvesAnswer.length > 0 || aspect.length > 0 || extent.size > 0
    || !!vein || !!ureter || mm !== undefined || soft.mm !== undefined || extra.size > 0;
  return { sectors: [...compartments.slice(0, 2), ...zones, ...compartments.slice(2), ...margins], variant, meta, hasData };
}
