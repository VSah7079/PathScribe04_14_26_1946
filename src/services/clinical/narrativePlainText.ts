// src/services/clinical/narrativePlainText.ts
// Batch 452: narrative fields can hold editor HTML. The negation check
// (negatedFindingCheck.ts) and the inline highlight matcher
// (findingHighlight.ts) both read the words, not the markup. Block-level
// tags and <br> become line breaks so sentences don't run together.

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

export function narrativePlainText(text: string): string {
  if (!text) return '';
  if (!/[<&]/.test(text)) return text;
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m] ?? m);
}
