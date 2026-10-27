// src/services/screens/routeGating.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 427 (Pete: "If you don't have permission to access configuration, you
// should [not] be able to backdoor in and see individual config pages"). Every
// route in App.tsx opens through a ScreenGate, so typing an address never gets
// round the screen permissions. The few that don't are listed below, each with
// the reason; a new route has to be gated or added here on purpose.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPEN_ROUTES: Record<string, string> = {
  '/login': 'sign-in',
  '/auth/callback/:providerId': 'sign-in (single sign-on return)',
  '/': 'Home: shows only the tiles the user may open',
  '/consult': 'external consult link (token after #, Batch 522); the token is the check',
  '/consult/:token': 'external consult link; the token is the check',
  '/critical-alert/:token': 'critical-value acknowledgement link; the token is the check',
  '/or-suite-dashboard': 'station display on a wall screen (no sign-in by design)',
  '/facility-ops-dashboard': 'station display on a wall screen (no sign-in by design)',
  '/cytology-qc-queue': 'redirect to the Worklist view, which is gated',
  '/surgical-qa-worklist': 'redirect to the Worklist view, which is gated',
  '/case/:caseId/synoptic': 'case page: per-case access check (synopticLoader / resolveCaseAccessGate)',
  '/case/:caseId/grossing': 'case page: per-case access check (grossingLoader, the same loader for the grossing view, Batch 564 / resolveCaseAccessGate)',
  '/report/:caseId': 'case page: per-case access check (synopticLoader / resolveCaseAccessGate)',
  '/mock-emr': 'stand-in for the hospital EMR, opened from a case (demo)',
  '/wsi-viewer': 'stand-in for the slide viewer, opened from a case (demo)',
  '/help/*': 'Batch 657: the User Guide is read-only help text (static files, nothing about a person or a case) for every signed-in user',
  '/my-exports': 'Batch 550: the signed-in user\'s own exports only (the API server answers for the requester); each download checks the export\'s capability again',
  '*': 'not-found; in App.tsx, everything else goes to SignedInApp.tsx',
};

// Batch 527 (PS-486): the routes are in App.tsx (sign-in and the token links)
// and SignedInApp.tsx (everything else).
const routeSource = () => ['../../App.tsx', '../../SignedInApp.tsx']
  .map(f => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), f), 'utf8')).join('\n');

function routes(): { path: string; gated: boolean }[] {
  const app = routeSource();
  return [...app.matchAll(/<Route\b([\s\S]*?)\/>/g)]
    .map(m => ({ body: m[1], path: /path="([^"]+)"/.exec(m[1])?.[1] }))
    .filter((r): r is { body: string; path: string } => !!r.path)
    .map(r => ({ path: r.path, gated: /<ScreenGate\b/.test(r.body) }));
}

describe('route gating (Batch 427)', () => {
  it('every route is screen-gated unless listed as open on purpose', () => {
    expect(routes().filter(r => !r.gated && !(r.path in OPEN_ROUTES)).map(r => r.path)).toEqual([]);
  });
  it('the pages opened from Configuration carry the Configuration gate', () => {
    const app = routeSource();
    for (const path of ['/admin/parts/new', '/admin/parts/:partId/edit', '/admin/templates/new', '/admin/templates/:templateId/edit',
      '/template-editor/new', '/template-editor/:templateId', '/template-review/:templateId', '/migration-jobs',
      '/molecular-order-queue', '/dev/mock-interface-engine']) {
      const route = [...app.matchAll(/<Route\b([\s\S]*?)\/>/g)].map(m => m[1]).find(b => b.includes(`path="${path}"`));
      expect(route, path).toMatch(/<ScreenGate screen="configuration">/);
    }
  });
  it('the open list names only routes that exist', () => {
    const paths = routes().map(r => r.path);
    expect(Object.keys(OPEN_ROUTES).filter(p => !paths.includes(p))).toEqual([]);
  });
});
