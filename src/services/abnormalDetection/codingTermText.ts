// src/services/abnormalDetection/codingTermText.ts
// Batch 652: the text of the coded terms on a confirmed finding, split into demonstration codes
// (the TEST- systems, never real SNOMED CT or ICD-O-3 codes) and real licensed codes, so the
// screen can label the first group "demonstration code" and leave the second alone.
import { isDemonstrationCode } from './resolveSyntheticCoding';

interface Term { system: string; code: string; display: string }

const text = (terms: Term[]): string => terms.map(c => `${c.code} (${c.display})`).join('; ');

export function codingTermText(terms: readonly Term[] | undefined): { demo: string; real: string } {
  const all = terms ?? [];
  return { demo: text(all.filter(isDemonstrationCode)), real: text(all.filter(c => !isDemonstrationCode(c))) };
}
