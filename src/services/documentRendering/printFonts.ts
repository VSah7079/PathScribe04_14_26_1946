// src/services/documentRendering/printFonts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 391 (PS-340 follow-up, Pete). Which embedded font a report PDF is
// printed in. Liberation Sans (registerEmbeddedPrintFont.ts) covers the Latin
// languages; Korean needs Hangul, so a Korean report is printed in Pretendard
// (SIL Open Font License 1.1, files in public/fonts/pretendard/; see
// embeddedFonts/LICENSE_NOTICE.md), which also covers Latin text.
//
// The Pretendard files are the package's own, unmodified (the licence reserves
// the name "Pretendard" for the original), served from the app's own origin and
// fetched only when a Korean report is printed. jsPDF embeds only the glyphs a
// report uses, so a Korean PDF stays reasonable (about 300 KB per weight used, about 600 KB with both, against 2.7 MB per font file).
//
//   loadPrintFont(language, fetchBytes?)  → PrintFont | undefined (undefined =
//                                           Liberation Sans, as before)
//   registerPrintFont(doc, font)          → registers it on a jsPDF document
//
// `fetchBytes` is injectable so tests (and a server-side renderer) can read the
// files without a browser.
// ─────────────────────────────────────────────────────────────────────────────

import type { jsPDF } from 'jspdf';
// Batch 393 follow-up: the font files ship with the app in public/fonts/pretendard/
// (unmodified from the Pretendard release), served from the app's own origin.
// No import of a package: a missing package must never break unrelated code.
const PRETENDARD_REGULAR_URL = '/fonts/pretendard/Pretendard-Regular.ttf';
const PRETENDARD_BOLD_URL = '/fonts/pretendard/Pretendard-Bold.ttf';

export const PRETENDARD_PRINT_FONT_FAMILY = 'Pretendard';

/** A font to embed: family name and the two weights as base64 TrueType. */
export interface PrintFont {
  family: string;
  regularBase64: string;
  boldBase64: string;
}

/** Languages that need a font other than Liberation Sans. */
const FONT_FOR_LANGUAGE: Readonly<Record<string, { family: string; regularUrl: string; boldUrl: string }>> = {
  ko: { family: PRETENDARD_PRINT_FONT_FAMILY, regularUrl: PRETENDARD_REGULAR_URL, boldUrl: PRETENDARD_BOLD_URL },
};

export function needsPrintFont(language: string | undefined): boolean {
  return !!language && language in FONT_FOR_LANGUAGE;
}

const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;

/**
 * Batch 393: the language whose font a report needs. A Korean report, or any
 * report containing Hangul (a Korean patient's name in a US lab), needs
 * Pretendard; the surgical renderer (functions/main.py) applies the same rule.
 */
export function printFontLanguageFor(content: { language?: string } | undefined): string | undefined {
  if (!content) return undefined;
  if (needsPrintFont(content.language)) return content.language;
  return HANGUL.test(JSON.stringify(content)) ? 'ko' : content.language;
}

export type FetchFontBytes = (url: string) => Promise<Uint8Array>;

const defaultFetchBytes: FetchFontBytes = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the print font (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const cache = new Map<string, Promise<PrintFont>>();

export async function loadPrintFont(language: string | undefined, fetchBytes: FetchFontBytes = defaultFetchBytes): Promise<PrintFont | undefined> {
  if (!language || !needsPrintFont(language)) return undefined;
  const spec = FONT_FOR_LANGUAGE[language];
  const key = `${spec.family}|${fetchBytes === defaultFetchBytes ? 'default' : 'custom'}`;
  if (!cache.has(key) || fetchBytes !== defaultFetchBytes) {
    const loading = Promise.all([fetchBytes(spec.regularUrl), fetchBytes(spec.boldUrl)])
      .then(([r, b]) => ({ family: spec.family, regularBase64: toBase64(r), boldBase64: toBase64(b) }));
    if (fetchBytes !== defaultFetchBytes) return loading;
    cache.set(key, loading.catch(e => { cache.delete(key); throw e; }));
  }
  return cache.get(key)!;
}

/**
 * Registers the font on a document. Identity-H so any Unicode character can be
 * printed; jsPDF subsets the font to the glyphs the document uses.
 */
export function registerPrintFont(doc: jsPDF, font: PrintFont): void {
  const regular = `${font.family}-Regular.ttf`;
  const bold = `${font.family}-Bold.ttf`;
  if (!doc.existsFileInVFS(regular)) {
    doc.addFileToVFS(regular, font.regularBase64);
    doc.addFont(regular, font.family, 'normal', undefined, 'Identity-H');
  }
  if (!doc.existsFileInVFS(bold)) {
    doc.addFileToVFS(bold, font.boldBase64);
    doc.addFont(bold, font.family, 'bold', undefined, 'Identity-H');
  }
}
