// src/services/templates/molecularResultBinding.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467 (Pete's spec: result hydration, "ENGINE_PUSH_TO_SYNOPTIC" into the
// synoptic's biomarker answers). A synoptic choice question names the in-house
// molecular tests that answer it and which of its answers each call means
// (field property `molecularResult`), e.g. Lung Adeno's "EGFR mutation status":
// EGFR mutation PCR, POSITIVE → "Detected", NEGATIVE → "Not detected". Set in
// the Synoptic Editor or the template file. When a run's result arrives, the
// engine finds the question and decides the change here:
//   - an empty question (or one already saying the same) takes the answer;
//   - a question holding another answer keeps it — the result is shown beside
//     it as a difference the pathologist accepts or leaves (never overwritten);
//   - a call with no mapped answer (invalid, indeterminate) changes nothing.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export type MolecularCall = 'POSITIVE' | 'NEGATIVE';
export const MOLECULAR_CALLS: readonly MolecularCall[] = ['POSITIVE', 'NEGATIVE'];

export interface MolecularResultBinding {
  /** The tests (StainType ids, category Molecular) whose result answers this question. */
  assayCodes: string[];
  /** The question's answer (option id) each call means. */
  values: Partial<Record<MolecularCall, string>>;
}

type Field = { id: string; type: string; options?: { id: string; label?: string }[]; molecularResult?: MolecularResultBinding };
type TemplateLike = { sections: { fields: Field[] }[] };

/** The template's question bound to this test, if any (the first one). */
export function boundFieldFor(template: TemplateLike, assayCode: string): Field | undefined {
  return template.sections.flatMap(s => s.fields).find(f => f.molecularResult?.assayCodes.includes(assayCode));
}

export type HydrationDecision =
  | { kind: 'answer'; fieldId: string; value: string | string[] }
  | { kind: 'same'; fieldId: string }
  | { kind: 'suggest'; fieldId: string; value: string }
  | { kind: 'none' };

/** What the result does to the question. */
export function decideHydration(field: Field, call: string, answers: Record<string, string | string[]>): HydrationDecision {
  const value = field.molecularResult?.values[call as MolecularCall];
  if (!value || !(field.options ?? []).some(o => o.id === value)) return { kind: 'none' };
  const current = answers[field.id];
  const multi = field.type === 'checkboxes';
  const empty = current === undefined || current === '' || (Array.isArray(current) && current.length === 0);
  if (empty) return { kind: 'answer', fieldId: field.id, value: multi ? [value] : value };
  const same = Array.isArray(current) ? current.length === 1 && current[0] === value : current === value;
  return same ? { kind: 'same', fieldId: field.id } : { kind: 'suggest', fieldId: field.id, value };
}

// ── Editor helpers ─────────────────────────────────────────────────────────

/** The patch for a question's molecular binding: a test chosen ('' removes the binding), its meanings kept. */
export function withMolecularAssay(binding: MolecularResultBinding | undefined, assayCode: string): { molecularResult?: MolecularResultBinding } {
  if (!assayCode) return { molecularResult: undefined };
  return { molecularResult: { assayCodes: [assayCode], values: binding?.values ?? {} } };
}
/** The patch for what a call means ('' clears it). */
export function withMolecularValue(binding: MolecularResultBinding | undefined, call: MolecularCall, optionId: string): { molecularResult?: MolecularResultBinding } {
  if (!binding) return {};
  const values = { ...binding.values };
  if (optionId) values[call] = optionId; else delete values[call];
  return { molecularResult: { ...binding, values } };
}
/** A binding the engine can use: a test, and a meaning for at least one call that is one of the question's answers. */
export function molecularBindingProblem(field: Field): 'noAssay' | 'noValues' | undefined {
  const b = field.molecularResult;
  if (!b) return undefined;
  if (!b.assayCodes.length) return 'noAssay';
  const own = new Set((field.options ?? []).map(o => o.id));
  return MOLECULAR_CALLS.some(c => b.values[c] && own.has(b.values[c]!)) ? undefined : 'noValues';
}

// ── Batch 467 (Pete): the "engine delta" — a molecular result that differs from the answer ──

export interface MolecularResultDelta { fieldId: string; resultValue: string; orderId: string; assayName: string; call: string }

/** The questions whose answer differs from the molecular result recorded for them: the pathologist sees the result
 *  beside the answer and accepts it or keeps theirs. */
export function molecularResultDeltas(
  template: TemplateLike,
  answers: Record<string, string | string[]>,
  resultSources: Record<string, { orderId: string; assayName: string; call: string }> | undefined,
): MolecularResultDelta[] {
  const fields = template.sections.flatMap(s => s.fields);
  return Object.entries(resultSources ?? {}).flatMap(([fieldId, src]) => {
    const field = fields.find(f => f.id === fieldId);
    const value = field?.molecularResult?.values[src.call as MolecularCall];
    if (!field || !value) return [];
    const current = answers[fieldId];
    const same = Array.isArray(current) ? current.length === 1 && current[0] === value : current === value;
    return same ? [] : [{ fieldId, resultValue: value, orderId: src.orderId, assayName: src.assayName, call: src.call }];
  });
}

/** What a synoptic question shows about its molecular result: the test and order it came from, and — when the answer
 *  differs — the result's answer (id and label) and the value accepting it sets (a list for a checkbox question).
 *  Undefined: no result for this question. */
export function molecularFieldNotice(
  template: TemplateLike,
  answers: Record<string, string | string[]>,
  resultSources: Record<string, { orderId: string; assayName: string; call: string }> | undefined,
  fieldId: string,
): { assayName: string; orderId: string; delta?: { resultValue: string; resultLabel: string; answer: string | string[] } } | undefined {
  const src = resultSources?.[fieldId];
  if (!src) return undefined;
  const delta = molecularResultDeltas(template, answers, resultSources).find(d => d.fieldId === fieldId);
  if (!delta) return { assayName: src.assayName, orderId: src.orderId };
  const field = template.sections.flatMap(sec => sec.fields).find(f => f.id === fieldId);
  const label = field?.options?.find(o => o.id === delta.resultValue)?.label;
  const answer = field?.type === 'checkboxes' ? [delta.resultValue] : delta.resultValue;
  return { assayName: src.assayName, orderId: src.orderId, delta: { resultValue: delta.resultValue, resultLabel: label ?? delta.resultValue, answer } };
}
