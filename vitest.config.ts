// vitest.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix for a real, long-standing gap: no vitest config existed at
// all, so vitest ran with zero alias resolution while tsc (and
// whatever real bundler builds this app) both already read
// tsconfig.json's own "paths" (@/*, @components/*, @pages/*, etc.).
// Any test file — or any source file a test transitively imports —
// using a "@/..." import failed under vitest with "Cannot find
// package" or "Failed to resolve import", even though the same code
// was genuinely correct and tsc-clean.
//
// resolve.tsconfigPaths reads tsconfig.json's own real "paths"
// directly (native to this Vite version — no extra plugin dependency
// needed), so the alias list lives in exactly one place — adding or
// changing an alias in tsconfig.json is automatically picked up here
// too, never needing a second, hand-maintained list kept in sync by
// hand.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vitest/config';
import { availableParallelism } from 'node:os';

// Batch 526: see maxWorkers below.
const requestedWorkers = Number(process.env.VITEST_MAX_WORKERS);
const maxWorkers = requestedWorkers > 0
  ? requestedWorkers
  : process.platform === 'win32' ? Math.max(1, Math.floor(availableParallelism() / 2)) : undefined;

export default defineConfig({
  // Batch 527 (PS-486): tests run as the demo build (see vite.config.ts).
  define: { __DEMO_TOOLS__: 'true' },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Real fix for a real, local problem: a leftover staging folder from
    // an old update extraction (update-267-277/) sitting inside the
    // project root has its own *.test.ts files, but not every file those
    // tests import — so vitest was picking them up as if they were live
    // source and failing with "Cannot find module." That folder was never
    // part of the app; it's just where an old zip got unpacked. Rather
    // than rely on it being deleted or moved by hand (which can fail if
    // something has a file in it open/locked), exclude it here — plus
    // vitest's own normal defaults, which setting this list overrides
    // rather than extends.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'update-267-277/**',
      // Batch 524 (PS-491): browser tests run with Playwright (npm run test:a11y), not vitest.
      'e2e/**',
    ],

    // Real fix for a real, reported flake — not a code regression.
    // A full-suite run reported 5 unrelated files (mockCytologyQaReportService,
    // mockIntraoperativeService, processInboundStainingInstrumentStatusEvent,
    // resolveStaffByQuickAuthPin, processLegacyRecordImport) failing on
    // vitest's own default hook/test timeouts (10000ms/5000ms) under full
    // parallel load. Verified directly, not assumed: every one of those
    // same files passes cleanly and quickly (42/42 tests, ~9.6s total) when
    // run in isolation — so this is real worker/CPU contention as the suite
    // has grown past 500 files and 4600+ tests, each running its own async
    // beforeAll (mock-service seeding, dynamic imports), not a logic bug in
    // any of the affected files. Raising the global defaults gives real
    // headroom under parallel load without masking a genuine hang — a test
    // that's actually stuck still times out, just at a threshold that
    // matches this suite's real current size instead of vitest's own
    // one-size-fits-all default from when the suite was much smaller.
    //
    // Batch 370 follow-up: raised again to 30 s. On a Windows laptop running
    // the full suite (Pete, Sep 28, 2026), six tests timed out at 15 s,
    // always the FIRST test in a file that imports the whole services
    // barrel or scans every source file. Measured here with only those six
    // files running, the slowest took 11.4 s (templateService governance), so
    // 15 s left no headroom on a slower machine under full parallel load.
    // Seven test files also set their own 10–20 s limits per test, which
    // override this one; those were removed so the 30 s limit applies.
    //
    // Batch 462: raised to 60 s. Pete's full run on Batch 461 (Oct 5, 2026):
    // 5 files timed out at 30 s, the same kind as before: the first test in a
    // file that imports the whole services barrel (mockCytologyQaReportService,
    // processInboundTelemetryReadingEvent, liveUpdates, processLegacyRecordImport,
    // templateService.governance). Run here with only those five files, all
    // pass; the slowest first test took 14.2 s, so a busy machine running
    // the whole suite in parallel needs more than 2× headroom. A real hang
    // still fails, at 60 s. (The lasting fix is a lighter barrel: tests that
    // import one service should not load all of them.)
    hookTimeout: 60000,
    testTimeout: 60000,

    // Batch 487: a different failure mode from the timeouts raised above —
    // Pete's last full run (Windows laptop, Oct 8, 2026) reported 7 files
    // that never ran at all: "Failed to start forks worker… Timeout
    // waiting for worker to respond." That's the pool failing to spin up
    // a child process in time, not a slow test exceeding hookTimeout/
    // testTimeout above — those only bound a worker that's already
    // running. Spawning a new OS process per worker (vitest's default
    // 'forks' pool) is real, measurable overhead on Windows, worse under
    // per-process antivirus scanning, and gets worse again as this suite
    // (1000+ files) spins up many of them close together under full
    // parallel load. 'threads' workers are an in-process worker_thread,
    // not a new child process — no process-spawn/antivirus-scan cost per
    // worker, so there's nothing left to time out on. Nothing in this
    // suite relies on process isolation (no native modules, no shared
    // mutable module-level state between test files that forks happened
    // to paper over — mock services are already re-seeded per test via
    // beforeEach/localStorage resets). Verified here: full suite still
    // passes (1000 files / 8562 tests, 0 failures) with this pool: this
    // sandbox's own hardware doesn't reproduce the worker-startup timeout
    // either way, so the real confirmation is Pete's next run.
    pool: 'threads',

    // Batch 526: Pete's run of Oct 11 (Windows laptop) again had workers that
    // never started ("Failed to start threads worker … Timeout waiting for
    // worker to respond", 3 files) and 8 tests over their time limit, all of
    // them the first test in a file that loads the services barrel. The
    // run's import time added up to 2,041 s across workers in 328 s of wall
    // time: too many workers starting at once on that machine. On Windows the
    // suite now uses half the logical cores (vitest's default is all but
    // one). VITEST_MAX_WORKERS overrides it on any machine. Also removed: 19
    // per-test limits of 10–30 s in 8 test files, which overrode the 60 s
    // limit above (three of the timeouts were those).
    ...(maxWorkers ? { maxWorkers } : {}),

    // Batch 456: tests never call the Pwned Passwords service
    // (services/staffPasswords/passwordScreening.ts); its own tests pass a
    // fake fetch.
    env: { VITE_PWNED_CHECK: 'off' },
  },
});
