// src/services/templates/synopticEntryChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 465b (Pete): the checks run on a case's synoptic answers before a draft
// is saved and before sign-out.
// • Blocking: a grid count above the column it can't exceed (nodes positive >
//   nodes examined at a level). The draft isn't saved and the case isn't signed
//   out until it is corrected.
// • Warning: a hand-entered total that differs from its grid's total. The
//   person is asked to reconcile and may go on.
// Only questions shown (by their and their section's visibility condition)
// count, as in the panel. Instances with no answers load no template.
// • Batch 466 (Pete): a node count (a grid column or a question marked
//   `wholeNumber`) that isn't a whole number of 0 or more blocks too.
// ─────────────────────────────────────────────────────────────────────────────

import { getTemplateCached } from './templateService';
import { isVisible, type VisibilityCondition } from './fieldVisibility';
import { nodeCountBelowSum, textNodeCountExceeds, textNodeCountProblem } from './nodeCountText';
import { fieldExceedsProblem, partGridCountProblems, partGridRowsOf, sumMismatches, wholeNumberFieldProblem, type PartGridCountProblem, type PartGridField, type PartGridRow, type SumMismatch, type SumOfSpec } from './partGrid';
import type { Case } from '@/types/case/Case';

type Field = PartGridField & { visibleWhen?: VisibilityCondition; sumOf?: SumOfSpec; wholeNumber?: boolean; notMoreThan?: string; nodeCount?: boolean; atLeastSumOf?: string[] };
type Section = { visibleWhen?: VisibilityCondition; fields?: Field[] };
type Answers = Record<string, string | string[]>;

/** A blocking problem: a grid row's (kind 'exceeds' | 'notWhole'), or (Batch 466) a node-count question's own
 *  value that isn't a whole number of 0 or more (kind 'fieldNotWhole'; the row and column fields are empty). */
/** Batch 519 (PS-494): 'fieldNotCount', a free-text node count that isn't a count, "cannot be determined" or
 *  "at least N"; 'fieldBelowSum', a total below the counts it covers (`limit` is the sum). */
export interface SynopticCountBlock extends Omit<PartGridCountProblem, 'kind'> { kind: PartGridCountProblem['kind'] | 'fieldNotWhole' | 'fieldExceeds' | 'fieldNotCount' | 'fieldBelowSum'; instanceId: string; fieldId: string; fieldLabel: string }
export interface SynopticTotalWarning extends SumMismatch { instanceId: string }
export interface SynopticEntryChecks { blocking: SynopticCountBlock[]; warnings: SynopticTotalWarning[] }

/** The questions shown with these answers (their own and their section's visibility conditions). */
export function shownSynopticFields<F extends { visibleWhen?: VisibilityCondition }>(sections: readonly { visibleWhen?: VisibilityCondition; fields?: F[] }[], answers: Answers): F[] {
  return sections.filter(s => isVisible(s.visibleWhen, answers)).flatMap(s => s.fields ?? []).filter(f => isVisible(f.visibleWhen, answers));
}

/** The checks for one synoptic's answers, given its template's sections (and the case's parts, for a grid
 *  with a row per part). */
export function synopticEntryChecksFor(instanceId: string, sections: readonly Section[], answers: Answers, parts?: readonly PartGridRow[]): SynopticEntryChecks {
  const shown = shownSynopticFields(sections, answers);
  const blocking: SynopticCountBlock[] = shown.flatMap(f => partGridCountProblems(f, answers, f.rows ? undefined : parts).map(p => ({ ...p, instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id })));
  for (const f of shown) {
    const entered = wholeNumberFieldProblem(f, answers);
    if (entered !== undefined) blocking.push({ kind: 'fieldNotWhole', instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id, rowId: '', rowLabel: '', columnId: '', columnLabel: '', limitColumnId: '', limitLabel: '', value: Number(entered), limit: Number.NaN, entered });
    // Batch 466b: a count above the question it can't exceed (the limit question's label in the message).
    const over = entered === undefined ? fieldExceedsProblem(f, answers) : undefined;
    if (over) {
      const limitField = shown.find(x => x.id === f.notMoreThan);
      blocking.push({ kind: 'fieldExceeds', instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id, rowId: '', rowLabel: '', columnId: '', columnLabel: '', limitColumnId: f.notMoreThan!, limitLabel: limitField?.label ?? f.notMoreThan!, value: over.value, limit: over.limit });
    }
    // Batch 519 (PS-494): free-text node counts.
    const notCount = textNodeCountProblem(f, answers);
    if (notCount !== undefined) blocking.push({ kind: 'fieldNotCount', instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id, rowId: '', rowLabel: '', columnId: '', columnLabel: '', limitColumnId: '', limitLabel: '', value: Number.NaN, limit: Number.NaN, entered: notCount });
    const textOver = notCount === undefined ? textNodeCountExceeds(f, answers) : undefined;
    if (textOver) {
      const limitField = shown.find(x => x.id === f.notMoreThan);
      blocking.push({ kind: 'fieldExceeds', instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id, rowId: '', rowLabel: '', columnId: '', columnLabel: '', limitColumnId: f.notMoreThan!, limitLabel: limitField?.label ?? f.notMoreThan!, value: textOver.value, limit: textOver.limit });
    }
    const below = nodeCountBelowSum(f, answers);
    if (below) {
      const parts = (f.atLeastSumOf ?? []).map(id => shown.find(x => x.id === id)?.label ?? id);
      blocking.push({ kind: 'fieldBelowSum', instanceId, fieldId: f.id, fieldLabel: f.label ?? f.id, rowId: '', rowLabel: '', columnId: '', columnLabel: '', limitColumnId: '', limitLabel: parts.join(' + '), value: below.value, limit: below.sum });
    }
  }
  const warnings = sumMismatches(shown, answers, parts).map(m => ({ ...m, instanceId }));
  return { blocking, warnings };
}

/** The checks over every synoptic of the case. A template that can't be loaded is skipped (nothing to check
 *  its answers against). */
export async function findSynopticEntryChecks(
  caseData: (Pick<Case, 'synopticReports'> & { specimens?: Case['specimens'] }) | null | undefined,
  loadTemplate: (id: string) => Promise<{ template?: unknown } | null> = id => getTemplateCached(id),
): Promise<SynopticEntryChecks> {
  const out: SynopticEntryChecks = { blocking: [], warnings: [] };
  const parts = caseData?.specimens ? partGridRowsOf(caseData.specimens) : undefined;
  for (const instance of caseData?.synopticReports ?? []) {
    const answers = (instance.answers ?? {}) as Answers;
    // Something to check: a grid answer, or (Batch 466) an answer that isn't a whole number of 0 or more (a node
    // count's problem needs no grid). Otherwise no template is loaded.
    // Batch 466b: a count can also exceed another question's (5 positive of 3 examined, both whole numbers), so
    // any answered synoptic is checked (the template load is cached).
    if (!Object.keys(answers).length) continue;
    let detail: { template?: unknown } | null = null;
    try { detail = await loadTemplate(instance.templateId); } catch { detail = null; }
    const sections = (detail?.template as { sections?: Section[] } | undefined)?.sections;
    if (!sections) continue;
    const r = synopticEntryChecksFor(instance.instanceId, sections, answers, parts);
    out.blocking.push(...r.blocking);
    out.warnings.push(...r.warnings);
  }
  return out;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** One blocking count, in words ("Nodes by level, Right level IIa: Nodes positive (3) can't exceed Nodes examined (2)."). */
export const countBlockMessage = (t: Translate, b: SynopticCountBlock) =>
  b.kind === 'fieldNotWhole' ? t('synopticChecks.fieldNotWhole', { field: b.fieldLabel, value: b.entered })
    : b.kind === 'fieldNotCount' ? t('synopticChecks.fieldNotCount', { field: b.fieldLabel, value: b.entered })
    : b.kind === 'fieldBelowSum' ? t('synopticChecks.fieldBelowSum', { field: b.fieldLabel, value: b.value, parts: b.limitLabel, sum: b.limit })
    : b.kind === 'fieldExceeds' ? t('synopticChecks.fieldExceeds', { field: b.fieldLabel, value: b.value, limit: b.limitLabel, limitValue: b.limit })
    : b.kind === 'notWhole' ? t('synopticChecks.cellNotWhole', { field: b.fieldLabel, row: b.rowLabel, column: b.columnLabel, value: b.entered })
      : t('synopticChecks.countExceeds', { field: b.fieldLabel, row: b.rowLabel, column: b.columnLabel, value: b.value, limit: b.limitLabel, limitValue: b.limit });

/** The totals warning, one line per total that differs from its grid. */
export const totalWarningsMessage = (t: Translate, warnings: readonly SynopticTotalWarning[]) =>
  [...warnings.map(w => t('synopticChecks.totalMismatch', { field: w.fieldLabel, entered: w.entered, total: w.gridTotal })), t('synopticChecks.totalsPrompt')].join('\n');
