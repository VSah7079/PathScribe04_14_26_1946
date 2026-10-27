// src/services/coding/opcs4Sample.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#139, #183): OPCS-4 is licensed by NHS Digital (TRUD) and is not bundled. Until a licence and the server
// feed are in place, the OPCS-4 tab shows a notice and this short reference list. The list is a SAMPLE for orientation,
// labelled Simulated, and cannot be applied to a case.
// Batch 651: DEMONSTRATION DATA. The OPCS-4 search (codeSearchService) and the AI code check read this list so an AI-suggested
// code that is in it is not silently dropped; such a code is labelled Simulated and still cannot be applied. Loading the real
// licensed reference (NHS TRUD) stays Planned. No code was added to this list.
// ─────────────────────────────────────────────────────────────────────────────

export const OPCS4_SAMPLE: readonly { code: string; display: string }[] = [
  { code: 'H07', display: 'Right hemicolectomy' },
  { code: 'J18', display: 'Cholecystectomy' },
  { code: 'M61', display: 'Total excision of prostate' },
  { code: 'Q07', display: 'Abdominal excision of uterus' },
  { code: 'T20', display: 'Primary repair of inguinal hernia' },
];

/** Batch 651: systems whose only reference data in this build is demonstration data. A code found there is shown labelled Simulated and cannot be applied. */
export const DEMONSTRATION_ONLY_SYSTEMS: readonly string[] = ['OPCS4'];
export const isDemonstrationOnlySystem = (system: string): boolean => DEMONSTRATION_ONLY_SYSTEMS.includes(system);

/** Search the demonstration list by code prefix or words in the title (case-insensitive). */
export function searchOpcs4Sample(query: string, max = 20): { code: string; display: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return OPCS4_SAMPLE.filter(r => r.code.toLowerCase().startsWith(q) || r.display.toLowerCase().includes(q)).slice(0, max).map(r => ({ ...r }));
}
