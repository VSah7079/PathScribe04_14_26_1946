// src/services/apiServer/productionBuild.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-486, PS-488): what a server (production) build may and may not
// contain, and which outside hosts the browser may call itself.
//   PS-486: demo and developer screens, demo accounts and the Simulated
//           authenticator are tied to __DEMO_TOOLS__, which the build sets to
//           false for a server build.
//   PS-488: AI calls and the licensed terminology (UMLS) go to same-origin
//           /api routes (the proxy / API server holds the keys). Batch 617
//           (Pete's decision): the public NLM look-ups (ICD-10-CM, ICD-11,
//           LOINC) go through the API server too; the browser calls NLM
//           itself only in the demonstration (no API address), and a server
//           deployment's security headers don't name the NLM host.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string): string => readFileSync(join(process.cwd(), p), 'utf8');
const code = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
function sources(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(join(process.cwd(), dir))) {
    const rel = `${dir}/${n}`;
    if (statSync(join(process.cwd(), rel)).isDirectory()) { sources(rel, out); continue; }
    if (/\.(ts|tsx)$/.test(n) && !/\.test\.(ts|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

describe('a server build leaves the demonstration tools out (PS-486)', () => {
  it('the build turns __DEMO_TOOLS__ off in server mode and whenever an API address is set', () => {
    const v = read('vite.config.ts');
    expect(v).toMatch(/__DEMO_TOOLS__:\s*JSON\.stringify\(mode !== 'server' && !\(env\.VITE_API_BASE_URL \?\? ''\)\.trim\(\)\)/);
  });
  it('the demo screens are loaded only behind __DEMO_TOOLS__', () => {
    const s = read('src/SignedInApp.tsx');
    for (const page of ['MockInterfaceEnginePage', 'MockEMRPage', 'MockWsiViewerPage']) {
      expect(s).toMatch(new RegExp(`const ${page} = __DEMO_TOOLS__ \\? lazy\\(`));
    }
  });
  it('demo accounts and the Simulated authenticator are loaded only behind __DEMO_TOOLS__', () => {
    expect(read('src/services/auth/authSessionInstance.ts')).toMatch(/__DEMO_TOOLS__ \? \(await import\('\.\/demo\/demoAccounts'\)\)/);
    expect(read('src/services/auth/mfa/mfaInstance.ts')).toMatch(/__DEMO_TOOLS__ &&/);
    const importers = sources('src').filter(f => /from ['"][^'"]*auth\/demo\/demoAccounts['"]/.test(read(f)) && f !== 'src/services/auth/authSessionInstance.ts');
    expect(importers).toEqual([]);
  });
});

describe('AI and terminology calls go to same-origin routes (PS-488)', () => {
  it('no AI or terminology-search code names an outside host', () => {
    const offenders: string[] = [];
    for (const f of [...sources('src/services/ai'), ...sources('src/services/aiIntegration'), ...sources('src/services/terminologySearch')]) {
      if (/['"`]https?:\/\//.test(code(read(f)))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
  it('the licensed terminology (UMLS) is reached through /api/terminology/umls', () => {
    expect(read('src/services/terminologySearch/codeSearchService.ts')).toContain("'/api/terminology/umls/search/current'");
  });
  it('the AI proxy routes are all under /api/ai', () => {
    const status = read('src/services/aiIntegration/aiProxyStatus.ts');
    for (const m of status.matchAll(/:\s*'(\/api\/[^']+)'/g)) expect(m[1].startsWith('/api/ai/')).toBe(true);
  });
  it('Batch 617: with an API address the NLM look-ups use /api/terminology/nlm routes, and only the demo path names the NLM host', () => {
    const route = code(read('src/services/terminologySearch/nlmLookupRoute.ts'));
    expect(route).toContain("'/api/terminology/nlm'");
    expect(route).toMatch(/nlmViaServer\(\)\) return `\$\{NLM_PROXY_BASE\}/);
    expect(route).not.toMatch(/['"`]https?:\/\//);
    const search = code(read('src/services/terminologySearch/codeSearchService.ts'));
    expect(search).not.toContain('TERMINOLOGY_CONFIG.nlm');
    expect(search.match(/nlmLookupUrl\('/g)?.length).toBe(3);
  });
  it('Batch 617: the server deployment policy leaves the NLM host out of connect-src; the demo keeps it', () => {
    const example = JSON.parse(read('deploy/security-headers/origins.example.json'));
    expect(example.terminologyViaServer).toBe(true);
    expect(read('deploy/security-headers/generated/headers.txt')).not.toContain('clinicaltables.nlm.nih.gov');
    expect(read('deploy/security-headers/generated-demo/headers.txt')).toContain('clinicaltables.nlm.nih.gov');
    expect(read('vercel.json')).toContain('clinicaltables.nlm.nih.gov');
  });
  it('the one outside host in the terminology settings is the public NLM look-up service (the demonstration path)', () => {
    const hosts = [...code(read('src/components/Config/Terminology/terminologyConfig.ts')).matchAll(/https?:\/\/([^/'"`\s]+)/g)].map(m => m[1]);
    expect([...new Set(hosts)]).toEqual(['clinicaltables.nlm.nih.gov']);
  });
});
