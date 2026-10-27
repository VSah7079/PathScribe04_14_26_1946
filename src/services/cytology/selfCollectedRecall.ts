// src/services/cytology/selfCollectedRecall.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 631 (Australia/NZ groundwork, after PS-178). What a self-collected hrHPV result means for the patient's recall, in
// the National Cervical Screening Program (Australia) and the National Cervical Screening Programme (New Zealand):
//   • Positive, HPV 16 or 18: urgent. Colposcopy referral, with a clinician-collected cervical sample (LBC): two codes.
//   • Positive, another oncogenic type: routine. A clinician-collected cervical sample (LBC) for cytology triage.
//   • Positive, genotype not reported (or only the 18/45 group): urgent window, clinician-collected LBC. Unresolved is never
//     the reassuring answer, and a colposcopy referral is not claimed without the type.
//   • Invalid: never goes to cytology. Repeat self-collection, or a clinician-collected sample.
// Reflex cytology is impossible on a self-collected sample (vaginal, not cervical, cells), so every one of these is a recall.
//
// The target windows and the wording (locale keys cytologyWorklist.recall.*) are starting points: the laboratory's administrator sets
// both per country (recallWindows.ts, recallWording.ts; Batch 640). The recommendation codes are Pete's developer specification
// (recommendationCodes.ts): PathScribe's own keys, labelled PLACEHOLDER_MAPPED; the interface engine maps them to each register's codes. The default windows are 2–4 weeks (urgent), 6–12 weeks (routine and an unsatisfactory Australian repeat) and, for an
// invalid New Zealand HPV swab, "as soon as practicable" (no fixed period). Nothing here talks to a register: the interface engine
// maps these fields onto the register's own message (docs/architecture/HPV_RESULT_INBOUND.md).
// ─────────────────────────────────────────────────────────────────────────────
import type { HpvGenotypeDetail } from '@/types/case/HpvGenotype';
import type { Jurisdiction } from '@/types/systemConfig';
import type { RecallRecommendationCode } from './recommendationCodes';
import { DEFAULT_RECALL_WINDOWS, type RecallWindows, type WeeksWindow } from './recallWindows';

export type RecallPriority = 'urgent' | 'routine';
/** Why the priority is what it is. */
export type RecallBasis = 'hpv16_18' | 'other_oncogenic' | 'genotype_not_reported';
export type RecallKind = 'clinician_lbc' | 'repeat_collection';
export type RecallJurisdiction = 'AU' | 'NZ';

export type { RecallRecommendationCode } from './recommendationCodes';

/** The default target weeks (recallWindows.ts): Urgent and Routine. The lab can change them in Configuration. */
export const RECALL_TARGET_WEEKS = { urgent: DEFAULT_RECALL_WINDOWS.urgent!, routine: DEFAULT_RECALL_WINDOWS.routine! };

export function isRecallJurisdiction(j: Jurisdiction | string | undefined): j is RecallJurisdiction {
  return j === 'AU' || j === 'NZ';
}

/** What the genotype says. Only an explicit HPV 18, or HPV 16, makes it 16/18; the 18/45 group alone is unresolved. */
export function classifyHpvGenotype(g: HpvGenotypeDetail | undefined): RecallBasis {
  if (!g) return 'genotype_not_reported';
  if (g.hpv16 || g.hpv18 === true) return 'hpv16_18';
  const groupOnly = g.hpv18Or45 && g.hpv18 === undefined && g.hpv45 === undefined;
  if (groupOnly) return 'genotype_not_reported';
  if (g.hpv45 === true || g.otherHighRisk) return 'other_oncogenic';
  return 'genotype_not_reported';
}

export interface SelfCollectedRecall {
  jurisdiction: RecallJurisdiction;
  kind: RecallKind;
  priority: RecallPriority;
  basis: RecallBasis | null;
  /** Internal recommendation codes (recommendationCodes.ts). HPV 16/18 carries the colposcopy referral and the clinician LBC. */
  codes: RecallRecommendationCode[];
  /** Weeks from the result; null means "as soon as practicable" (no fixed period). */
  targetWeeks: WeeksWindow | null;
  /** The colposcopy referral is part of the recommendation (HPV 16/18 only). */
  colposcopy: boolean;
}

function codesFor(j: RecallJurisdiction, kind: RecallKind, basis: RecallBasis | null): RecallRecommendationCode[] {
  if (kind === 'repeat_collection') return [`${j}_RECALL_REPEAT_COLLECTION`];
  return basis === 'hpv16_18' ? [`${j}_REFER_COLPOSCOPY`, `${j}_RECALL_CLINICIAN_LBC`] : [`${j}_RECALL_CLINICIAN_LBC`];
}

export function selfCollectedRecallFor(
  jurisdiction: RecallJurisdiction, hpvResult: string | undefined, genotype: HpvGenotypeDetail | undefined,
  windows: RecallWindows = DEFAULT_RECALL_WINDOWS,
): SelfCollectedRecall | null {
  if (hpvResult === 'Invalid') {
    return { jurisdiction, kind: 'repeat_collection', priority: 'routine', basis: null, codes: codesFor(jurisdiction, 'repeat_collection', null), targetWeeks: jurisdiction === 'AU' ? windows.repeatAU : windows.repeatNZ, colposcopy: false };
  }
  if (hpvResult !== 'Positive') return null;
  const basis = classifyHpvGenotype(genotype);
  const priority: RecallPriority = basis === 'other_oncogenic' ? 'routine' : 'urgent';
  return { jurisdiction, kind: 'clinician_lbc', priority, basis, codes: codesFor(jurisdiction, 'clinician_lbc', basis), targetWeeks: windows[priority], colposcopy: basis === 'hpv16_18' };
}

type ScreeningSpecimen = { cytologyScreening?: { hpvResult?: string; hpvGenotypeDetail?: HpvGenotypeDetail } };

/** A Recall needed row's recall. Only Australia and New Zealand have programme-specific recall; elsewhere there is none. */
export function selfCollectedRecallOfSpecimens(specimens: readonly ScreeningSpecimen[] | undefined, jurisdiction: Jurisdiction | string | undefined, windows: RecallWindows = DEFAULT_RECALL_WINDOWS): SelfCollectedRecall | null {
  if (!isRecallJurisdiction(jurisdiction)) return null;
  const list = specimens ?? [];
  const positive = list.find(sp => sp.cytologyScreening?.hpvResult === 'Positive');
  const hit = positive ?? list.find(sp => sp.cytologyScreening?.hpvResult === 'Invalid');
  return hit ? selfCollectedRecallFor(jurisdiction, hit.cytologyScreening?.hpvResult, hit.cytologyScreening?.hpvGenotypeDetail, windows) : null;
}

/** What a Recall needed row is for, in any jurisdiction: a clinician-collected sample (Positive), or a repeat collection (only Invalid). */
export function recallKindOfSpecimens(specimens: readonly ScreeningSpecimen[] | undefined): RecallKind {
  const list = specimens ?? [];
  if (list.some(sp => sp.cytologyScreening?.hpvResult === 'Positive')) return 'clinician_lbc';
  return list.some(sp => sp.cytologyScreening?.hpvResult === 'Invalid') ? 'repeat_collection' : 'clinician_lbc';
}
