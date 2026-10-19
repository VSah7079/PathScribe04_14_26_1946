// Batch 590 (PS-469): Sentry is reached only through the app's own scrubbing reporter.
//   - Only sentrySink.ts and the one dynamic import in startApp.tsx mention the SDK.
//   - Nothing calls Sentry.init or captureException except the sink.
//   - No Session Replay, tracing or feedback integration is named anywhere.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const f = resolve(d, n);
  return statSync(f).isDirectory() ? walk(f) : /\.(tsx?)$/.test(n) ? [f] : [];
});
const files = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));
const prod = files.filter(f => !/\.test\.tsx?$/.test(f.rel));

describe('Sentry stays behind the scrubbing reporter (PS-469)', () => {
  it('only startApp.tsx names the SDK package, and only as a dynamic import', () => {
    const named = prod.filter(f => /@sentry\//.test(f.text)).map(f => f.rel);
    expect(named).toEqual(['startApp.tsx']);
    const start = prod.find(f => f.rel === 'startApp.tsx')!.text;
    expect(start).toMatch(/import\('@sentry\/browser'\)/);
    expect(start).not.toMatch(/^import .*@sentry/m);
  });
  it('nothing outside the sink calls init or captureException on the SDK', () => {
    const offenders = prod.filter(f => f.rel !== 'services/errorReporting/sentrySink.ts' && /\b(?:Sentry|sdk)\.(?:init|captureException|captureMessage)\b/.test(f.text)).map(f => f.rel);
    expect(offenders).toEqual([]);
  });
  it('no replay, tracing, feedback or breadcrumb integration is named', () => {
    const offenders = prod.filter(f => /replayIntegration|browserTracingIntegration|feedbackIntegration|breadcrumbsIntegration|globalHandlersIntegration|httpClientIntegration/.test(f.text)).map(f => f.rel);
    expect(offenders).toEqual([]);
  });
});
