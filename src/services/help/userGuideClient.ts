// src/services/help/userGuideClient.ts
// ─────────────────────────────────────────────────────────
// Batch 657: reads the published guide (public/help/user-guide/, built by scripts/user-guide/build.py).
// Static files only: nothing about a person or a case is sent, and nothing is kept in the browser.
// ─────────────────────────────────────────────────────────
import type { UserGuideArticleMeta } from './userGuideNavigation';
import type { UserGuideIndexEntry } from './userGuideSearch';

const folder = (base: string) => `${base.endsWith('/') ? base : `${base}/`}help/user-guide`;
const cache = new Map<string, Promise<unknown>>();

function get<T>(url: string, kind: 'json' | 'text'): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return kind === 'json' ? r.json() : r.text();
    }).catch(e => { cache.delete(url); throw e; }));
  }
  return cache.get(url) as Promise<T>;
}

export const userGuideClient = {
  manifest: (base = import.meta.env.BASE_URL) => get<{ articles: UserGuideArticleMeta[] }>(`${folder(base)}/manifest.json`, 'json').then(m => m.articles),
  searchIndex: (base = import.meta.env.BASE_URL) => get<UserGuideIndexEntry[]>(`${folder(base)}/search-index.json`, 'json'),
  article: (slug: string, base = import.meta.env.BASE_URL) => get<string>(`${folder(base)}/articles/${slug.replace(/\//g, '__')}.html`, 'text'),
  /** Where the guide's screenshots are served from (the article HTML names them relative to this). */
  imageBase: (base = import.meta.env.BASE_URL) => `${folder(base)}/`,
};

/** Points the screenshots in an article (written as `img/<id>.png`) at the guide's folder, whatever address the page is shown at. */
export function withGuideImages(html: string, imageBase: string): string {
  return html.replace(/(<img[^>]*\ssrc=")img\//g, `$1${imageBase}img/`);
}
