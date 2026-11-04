// src/services/serverJobs/browserStandIns.guard.test.ts
// Batch 555 (PS-539 phase 2d; readiness review §7): every server job the browser
// stands in for stops in the browser once the deployment says its API server runs it.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { BROWSER_STAND_INS, browserRunsServerJob, parseServerJobs, resetBrowserStandIns, runsInBrowser } from './browserStandIns';
import { RECURRING_JOBS } from './serverJobsContract';

const SRC = resolve(__dirname, '../..');
const src = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');
const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC).filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)).map(f => ({ rel: relative(SRC, f).replace(/\\/g, '/'), text: readFileSync(f, 'utf8') }));

afterEach(() => { resetBrowserStandIns(); vi.restoreAllMocks(); });

describe('browser stand-ins for server jobs (Batch 555)', () => {
  it('each stand-in names a recurring server job and checks it by name where it starts', () => {
    for (const s of BROWSER_STAND_INS) {
      expect(Object.keys(RECURRING_JOBS), s.serverJob).toContain(s.serverJob);
      expect(src(s.file), s.file).toContain(`browserRunsServerJob('${s.serverJob}')`);
    }
    expect(new Set(BROWSER_STAND_INS.map(s => s.file)).size).toBe(BROWSER_STAND_INS.length);
  });

  it('the work itself is started only from the listed files (a new caller must be gated and listed)', () => {
    const starters: Record<string, string[]> = {
      'startDeliveryBackgroundWork(': ['hooks/useDeliveryBackgroundWork.ts'],
      'startReleaseBackgroundWork(': ['hooks/useReleaseBackgroundWork.ts'],
      'checkAndReleaseIfExpired(': ['services/reportRelease/releaseReportDeps.ts', 'pages/SynopticReportPage/components/ReleaseBufferBanner.tsx'],
      'escalateStaleRegistrySubmissions(': ['services/registrySubmission/registryExceptionsService.ts'],
      'refreshCytologyHistologyCorrelationCandidates(': ['services/cytology/cytologyHistologyCorrelationLive.ts'],
      'runFollowUpAlertSweep(': ['services/followUp/followUpLive.ts'],
      'expireRequests(': ['services/supportAccess/supportAccessService.ts'],
    };
    const stripComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [call, allowed] of Object.entries(starters)) {
      const name = call.slice(0, -1);
      // A call, not the function's own definition or an interface's or class's declaration of it.
      const declaration = new RegExp(`(function\\s+|async\\s+)${name}\\(|^\\s*${name}\\([^)]*\\)\\s*(:|\\{)`);
      const callers = files.filter(f => stripComments(f.text).split('\n')
        .some(line => line.includes(call) && !declaration.test(line))).map(f => f.rel);
      expect(callers.sort(), call).toEqual([...allowed].sort());
    }
    // The banner's countdown goes through releaseCountdown.ts, which is gated.
    expect(src('pages/SynopticReportPage/components/ReleaseBufferBanner.tsx')).toContain('onReleaseCountdownEnd(');
  });

  it('the browser runs a job unless an API server is configured and the deployment lists the job as the server\'s', () => {
    const listed = parseServerJobs(' delivery.retrySweep, release.dueSweep ,bogus.job,, ');
    expect([...listed.jobs].sort()).toEqual(['delivery.retrySweep', 'release.dueSweep']);
    expect(listed.unknown).toEqual(['bogus.job']);
    expect(parseServerJobs(undefined).jobs.size).toBe(0);
    expect(parseServerJobs('constructor').unknown).toEqual(['constructor']);
    expect(runsInBrowser('delivery.retrySweep', null, listed.jobs)).toBe(true);               // the demo
    expect(runsInBrowser('delivery.retrySweep', 'https://api.example', new Set())).toBe(true); // a server that runs nothing yet
    expect(runsInBrowser('delivery.retrySweep', 'https://api.example', listed.jobs)).toBe(false);
    expect(runsInBrowser('followUp.dailyAlerts', 'https://api.example', listed.jobs)).toBe(true);
    expect(browserRunsServerJob('delivery.retrySweep')).toBe(true); // tests have no API server
  });

  it('the docs name the register and the setting', () => {
    expect(readFileSync(resolve(SRC, '../docs/architecture/DEPLOYMENT_READINESS_REVIEW.md'), 'utf8')).toContain('browserStandIns.ts');
    expect(readFileSync(resolve(SRC, '../docs/architecture/RUNTIME_CONFIG.md'), 'utf8')).toContain('VITE_SERVER_JOBS');
  });
});
