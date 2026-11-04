// Batch 621 (Pete: "saved as meta data, not for output, just for the Pathologist to look at"): AI-extracted synoptic fields of a
// historical report are ADVISORY ONLY. No report, print, registry feed, billing rule, rules engine or export may read them.
// This fails the build if any module outside the extraction and display code imports the extraction services, uses their
// storage keys, or names their types, or if a case or report type carries an extraction.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');
const IGNORED = /(\.test\.|\.d\.ts$|__tests__|__mocks__)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !IGNORED.test(p)) out.push(p);
  }
  return out;
}

/** The only code that may touch an extraction: producing it, and showing/flagging it for the pathologist (and its setting). */
const ALLOWED = [
  /^services\/historyExtraction\//,
  /^components\/PatientHistory\/(HistoryExtractionPanel\.tsx|useHistoryExtraction\.ts)$/,
  /^components\/Config\/System\/HistoryExtractionSection\.tsx$/,
  /^services\/index\.ts$/,           // the re-export of the two services
  /^services\/demoReset\/demoReset\.ts$/, // the storage keys, so a demo reset clears them
];

/** What reading an extraction looks like: its folder, its services, its storage keys and its type names. */
const READS = [
  /historyExtraction\//,
  /\bhistoryExtractionService\b/,
  /\bhistoryExtractionSettingsService\b/,
  /history_extraction(s|_flags|_settings)_v1/,
  /\b(HistoryExtraction|ExtractedField|HistoryExtractionFlag)\b/,
];

const files = walk(SRC).map(f => ({ rel: relative(SRC, f).split('\\').join('/'), text: readFileSync(f, 'utf8') }));
const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

describe('AI-extracted historical synoptic fields are advisory only (Batch 621)', () => {
  it('scans the whole app and finds the extraction code', () => {
    expect(files.length).toBeGreaterThan(1000);
    expect(files.filter(f => ALLOWED.some(a => a.test(f.rel))).length).toBeGreaterThan(8);
  });

  it('no module outside the extraction and display code reads an extraction', () => {
    const offenders = files
      .filter(f => !ALLOWED.some(a => a.test(f.rel)))
      .filter(f => READS.some(r => r.test(strip(f.text))))
      .map(f => f.rel);
    expect(offenders).toEqual([]);
  });

  it('the history view only shows the panel; it never imports the services', () => {
    const modal = files.find(f => f.rel === 'components/PatientHistory/PatientHistoryModal.tsx');
    expect(modal?.text).toContain("from './HistoryExtractionPanel'");
  });

  it('no case, report or export type carries an extraction', () => {
    const typed = files.filter(f => /^(types\/|services\/(cases|reports|exports|reportDocuments|reportRelease|billing|cancerRegistry|registrySubmission|usEpath|cosd)\/)/.test(f.rel));
    expect(typed.length).toBeGreaterThan(20);
    expect(typed.filter(f => /historyExtract|HistoryExtract/.test(f.text)).map(f => f.rel)).toEqual([]);
  });

  it('the check is live: it would catch a report module reading an extraction', () => {
    const sample = "import { historyExtractionService } from '@/services';";
    expect(READS.some(r => r.test(sample))).toBe(true);
    expect(READS.some(r => r.test("import { callAi } from '../aiIntegration/aiProviderService';"))).toBe(false);
  });

  it('every extraction is stored unverified and the AI-extracted label is shown', () => {
    const types = readFileSync(join(SRC, 'services/historyExtraction/historyExtraction.ts'), 'utf8');
    expect(types).toContain("HISTORY_EXTRACTION_VERIFICATION = 'ai-unverified'");
    const panel = readFileSync(join(SRC, 'components/PatientHistory/HistoryExtractionPanel.tsx'), 'utf8');
    expect(panel).toContain("t('historyExtraction.aiLabel')");
  });
});
