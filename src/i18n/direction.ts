// src/i18n/direction.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-293): the page direction follows the language. A right-to-left
// language (Arabic, Hebrew, Persian, Urdu) sets <html dir="rtl">, and the
// stylesheet's logical properties (inline-start / inline-end) mirror the whole
// layout from that one attribute. None of the five languages in use is
// right-to-left, so today the attribute is always "ltr"; adding a right-to-left
// language is then a matter of its translations (see src/i18n/README.md).
// ─────────────────────────────────────────────────────────────────────────────

export type TextDirection = 'ltr' | 'rtl';

/** Primary language subtags written right to left. */
export const RTL_LANGUAGES: readonly string[] = ['ar', 'he', 'fa', 'ur'];

/** The direction text in a language is written (`ar`, `ar-EG` and `he-IL` are rtl; anything else ltr). */
export function directionFor(language: string | undefined | null): TextDirection {
  const primary = (language ?? '').toLowerCase().split(/[-_]/)[0];
  return RTL_LANGUAGES.includes(primary) ? 'rtl' : 'ltr';
}

/** Sets lang and dir on the document element. Safe where there is no document (tests of services, the print agent). */
export function applyDocumentDirection(language: string | undefined | null, doc: Pick<Document, 'documentElement'> | undefined = typeof document === 'undefined' ? undefined : document): TextDirection {
  const dir = directionFor(language);
  if (doc && language) {
    doc.documentElement.setAttribute('lang', language);
    doc.documentElement.setAttribute('dir', dir);
  }
  return dir;
}
