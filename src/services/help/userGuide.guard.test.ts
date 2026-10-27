// src/services/help/userGuide.guard.test.ts
// Batch 657: the User Guide stays in step with the app. The published guide (public/help/user-guide/, built from
// docs/user-guide/src/ by scripts/user-guide/build.py) lists the same articles as the generated route table; every
// address an article claims is a real screen; and no screen opens both this guide and the Administrator Guide.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { USER_GUIDE_ROUTES, USER_GUIDE_SLUGS } from './userGuideRoutes.generated';
import { userGuideSlugForRoute, userGuideSlugFromPath, userGuideUrl } from './userGuideLinks';
import { adminGuideAnchorForRoute } from './adminGuideLinks';
import { resolveHelpTargets } from './helpTargets';

const root = process.cwd();
const published = resolve(root, 'public/help/user-guide');
const manifest: { articles: { slug: string; routes: string[]; previous?: string; next?: string; related: string[] }[] } =
  JSON.parse(readFileSync(resolve(published, 'manifest.json'), 'utf8'));

describe('User Guide (Batch 657)', () => {
  it('the published manifest and the generated route table list the same articles and routes', () => {
    expect(manifest.articles.map(a => a.slug)).toEqual([...USER_GUIDE_SLUGS]);
    expect(manifest.articles.flatMap(a => a.routes.map(r => `${r}=${a.slug}`)).sort())
      .toEqual(USER_GUIDE_ROUTES.map(r => `${r.route}=${r.slug}`).sort());
  });
  it('every article has its published page, and its links lead to articles', () => {
    for (const a of manifest.articles) {
      expect(existsSync(resolve(published, 'articles', `${a.slug.replace(/\//g, '__')}.html`)), a.slug).toBe(true);
      for (const l of [a.previous, a.next, ...a.related].filter(Boolean) as string[]) expect(USER_GUIDE_SLUGS, `${a.slug} -> ${l}`).toContain(l);
    }
  });
  it('every address an article claims is a real route of the app (or Home)', () => {
    const app = ['src/SignedInApp.tsx', 'src/App.tsx'].map(f => readFileSync(resolve(root, f), 'utf8')).join('\n');
    for (const { route } of USER_GUIDE_ROUTES) {
      if (route === '/') continue;
      expect(app.includes(`path="${route}"`), route).toBe(true);
    }
  });
  it('every screen route of the app has an article, or is listed with a reason in route-exemptions.json (Batch 666)', () => {
    const exempt: Record<string, string> = JSON.parse(readFileSync(resolve(root, 'docs/user-guide/route-exemptions.json'), 'utf8'));
    const app = ['src/SignedInApp.tsx', 'src/App.tsx'].map(f => readFileSync(resolve(root, f), 'utf8')).join('\n');
    const routes = [...new Set([...app.matchAll(/path="(\/[^"]*)"/g)].map(m => m[1]))];
    const claimed = new Set(USER_GUIDE_ROUTES.map(r => r.route));
    expect(routes.filter(r => !claimed.has(r) && !(r in exempt))).toEqual([]);
    for (const [r, why] of Object.entries(exempt)) {
      if (r !== '*') expect(app.includes(`path="${r}"`), `${r} is exempt but is not a route`).toBe(true);
      expect(why.length, r).toBeGreaterThan(10);
    }
  });
  it('screens that have both guides (every screen with an Administrator Guide section) get both top-bar buttons', () => {
    const both = USER_GUIDE_ROUTES.filter(r => adminGuideAnchorForRoute(r.route, '') !== null).map(r => r.route);
    expect(both).toEqual(expect.arrayContaining(['/lockbox-drop-off', '/quality-assurance', '/batch-management', '/outbound-queue', '/audit']));
    for (const route of both) {
      const t = resolveHelpTargets(route, '', '/');
      expect(t.userSlug, route).not.toBeNull();
      expect(t.adminUrl, route).not.toBeNull();
    }
    expect(resolveHelpTargets('/worklist', '', '/').adminUrl).toBeNull();
  });
  it('the help page itself has no button, and addresses round-trip', () => {
    expect(userGuideSlugForRoute('/help/accession')).toBeNull();
    expect(userGuideSlugFromPath('/help/accession/new-case')).toBe('accession/new-case');
    expect(userGuideSlugFromPath('/help')).toBe('');
    expect(userGuideUrl('accession/new-case')).toBe('/help/accession/new-case');
    expect(userGuideUrl(null, '/app')).toBe('/app/help');
  });
});

describe('the guide window shows only the guide (Batch 669b)', () => {
  it('registers /help/* inside the shell that hides the top bar', () => {
    const src = readFileSync(resolve(__dirname, '../../SignedInApp.tsx'), 'utf8');
    const hiddenShell = src.indexOf('<AppShell hideNav />');
    const guideRoute = src.indexOf('path="/help/*"');
    expect(hiddenShell).toBeGreaterThan(-1);
    expect(guideRoute).toBeGreaterThan(hiddenShell);
    expect(src.match(/path="\/help\/\*"/g)).toHaveLength(1);
  });
});
