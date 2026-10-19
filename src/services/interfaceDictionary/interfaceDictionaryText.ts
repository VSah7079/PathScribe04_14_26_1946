// src/services/interfaceDictionary/interfaceDictionaryText.ts
// ─────────────────────────────────────────────────
// Batch 612: small pure helpers the Interface Dictionary screens use, kept out of the
// components: turning the services' codes into locale key names, and reading and
// writing a code-translation table as one line of text ("A=B, C=D").
// ─────────────────────────────────────────────────
import type { FieldMapping } from './interfaceDictionaryTypes';

/** TARGET_CORE_STRUCTURE → targetCoreStructure: the locale key for a refusal or problem code. */
export function codeKey(code: string): string {
  return code.toLowerCase().replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

/** `{ F: 'Female', M: 'Male' }` → `F=Female, M=Male`. */
export function formatValueMap(map: FieldMapping['valueMap']): string {
  return map ? Object.entries(map).map(([k, v]) => `${k}=${v}`).join(', ') : '';
}

/** `F=Female, M=Male` → `{ F: 'Female', M: 'Male' }`; blank gives none. A pair missing "=" is kept with an empty
 *  value so the definition check can name it, rather than being dropped silently. */
export function parseValueMap(text: string): FieldMapping['valueMap'] {
  const out: Record<string, string> = {};
  for (const part of text.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf('=');
    const key = (eq < 0 ? p : p.slice(0, eq)).trim();
    out[key] = eq < 0 ? '' : p.slice(eq + 1).trim();
  }
  return Object.keys(out).length ? out : undefined;
}
