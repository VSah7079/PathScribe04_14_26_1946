// src/services/molecularOrders/molecularSignOutCheck.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467b (Pete's "Engine Delta" tag, closing the gap 467 left): at
// sign-out, a synoptic question whose answer still differs from the in-house
// or reference lab molecular result recorded for it asks the pathologist first
// (a warning they may go past — the answer stays theirs). The differences are
// the same ones the synoptic shows beside each question
// (templates/molecularResultBinding.ts, molecularResultDeltas).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { molecularResultDeltas } from '../templates/molecularResultBinding';
import { getTemplateCached } from '../templates/templateService';

type TemplateLike = { name?: string; sections: { fields: { id: string; type: string; label?: string; options?: { id: string; label?: string }[] }[] }[] };
type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface MolecularResultDifference {
  instanceId: string;
  templateName: string;
  fieldId: string;
  fieldLabel: string;
  assayName: string;
  orderId: string;
  resultLabel: string;
}

/** The questions, across the case's synoptics still being reported, whose answer differs from their molecular result. */
export async function findMolecularResultDifferences(
  caseData: Pick<Case, 'synopticReports'> | null | undefined,
  deps: { getTemplate: (templateId: string) => Promise<TemplateLike | null> },
): Promise<MolecularResultDifference[]> {
  const out: MolecularResultDifference[] = [];
  for (const inst of caseData?.synopticReports ?? []) {
    if (!inst.resultSources || !Object.keys(inst.resultSources).length) continue;
    if ((inst as { deletedAt?: string | null }).deletedAt || inst.status !== 'draft') continue; // only synoptics still being reported
    const template = await deps.getTemplate(inst.templateId).catch(() => null);
    if (!template) continue;
    const answers = (inst.answers ?? {}) as Record<string, string | string[]>;
    const fields = template.sections.flatMap(s => s.fields);
    for (const d of molecularResultDeltas(template, answers, inst.resultSources)) {
      const field = fields.find(f => f.id === d.fieldId);
      out.push({
        instanceId: inst.instanceId, templateName: template.name ?? inst.templateName ?? inst.templateId,
        fieldId: d.fieldId, fieldLabel: field?.label ?? d.fieldId, assayName: d.assayName, orderId: d.orderId,
        resultLabel: field?.options?.find(o => o.id === d.resultValue)?.label ?? d.resultValue,
      });
    }
  }
  return out;
}

/** The same, with the app's template cache. */
export function findMolecularResultDifferencesLive(caseData: Pick<Case, 'synopticReports'> | null | undefined): Promise<MolecularResultDifference[]> {
  return findMolecularResultDifferences(caseData, { getTemplate: async id => (await getTemplateCached(id)).template as unknown as TemplateLike });
}

/** The sign-out question: one line per difference, then whether to sign out anyway. */
export function molecularDifferencesMessage(t: Translate, differences: readonly MolecularResultDifference[]): string {
  return [
    ...differences.map(d => t('molecularOrders.signOut.difference', { synoptic: d.templateName, question: d.fieldLabel, assay: d.assayName, order: d.orderId, result: d.resultLabel })),
    t('molecularOrders.signOut.prompt'),
  ].join('\n');
}
