// src/services/help/userGuideLinks.ts
// ─────────────────────────────────────────────────────────
// Batch 657: which User Guide article opens for the screen a person is on, and the address it lives at.
// The route-to-article table is generated from each article's front matter (userGuideRoutes.generated.ts),
// so an article claims its own screens and a screen cannot be linked to an article that does not exist.
// Configuration and the other administrator screens are not here: they open the Administrator Guide
// (adminGuideLinks.ts). Where the screen has both, the top bar shows two buttons (helpTargets.ts).
// ─────────────────────────────────────────────────────────
import { USER_GUIDE_ROUTES } from './userGuideRoutes.generated';

const segments = (path: string): string[] => path.split(/[?#]/)[0].split('/').filter(Boolean);

/** How well a route pattern fits a path: -1 when it does not, otherwise the number of fixed words matched (more is better). A pattern may be the beginning of a longer path. */
function fit(pattern: string, path: string[]): number {
  const p = segments(pattern);
  if (p.length > path.length) return -1;
  let score = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) continue;
    if (p[i] !== path[i]) return -1;
    score += 2;
  }
  return p.length === path.length ? score + 1 : score; // an exact length match beats a beginning match
}

/** The article for the screen at `pathname` (the Home page is `/`), or null when no article covers it. */
export function userGuideSlugForRoute(pathname: string): string | null {
  const path = segments(pathname);
  if (path[0] === 'help') return null;
  let best: { slug: string; score: number } | null = null;
  for (const r of USER_GUIDE_ROUTES) {
    const score = segments(r.route).length === 0 ? (path.length === 0 ? 1 : -1) : fit(r.route, path);
    if (score >= 0 && (!best || score > best.score)) best = { slug: r.slug, score };
  }
  return best?.slug ?? null;
}

/** The address of an article (`/help/accession/new-case`), or of the guide's contents page when no slug is given. */
export function userGuideUrl(slug?: string | null, baseUrl: string = '/'): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}help${slug ? `/${slug}` : ''}`;
}

/** The article slug in an in-app help address (`/help/accession/new-case` gives `accession/new-case`; `/help` gives ''). */
export function userGuideSlugFromPath(pathname: string): string {
  const parts = segments(pathname);
  return parts[0] === 'help' ? parts.slice(1).join('/') : '';
}
