// src/services/help/userGuideNavigation.ts
// ─────────────────────────────────────────────────────────
// Batch 657: what the help page shows around an article (from the guide's manifest): the "You are here" trail,
// the previous and next steps, the related actions, and the contents grouped by module. Pure, so it is tested
// without the page.
// ─────────────────────────────────────────────────────────

export interface UserGuideArticleMeta {
  slug: string; title: string; module: string; screen: string; workflow: string;
  roles: string[]; keywords: string[]; routes: string[];
  previous?: string | null; next?: string | null; related: string[]; status: 'Draft' | 'Reviewed';
}

export interface UserGuideCrumb { label: string; slug: string | null }

export interface UserGuideArticleView {
  article: UserGuideArticleMeta;
  /** Contents page first (slug null), then the module, then the screen when it is not the module's own page. */
  breadcrumb: UserGuideCrumb[];
  previous: UserGuideArticleMeta | null;
  next: UserGuideArticleMeta | null;
  related: UserGuideArticleMeta[];
}

export function articleView(articles: readonly UserGuideArticleMeta[], slug: string): UserGuideArticleView | null {
  const by = new Map(articles.map(a => [a.slug, a]));
  const article = by.get(slug);
  if (!article) return null;
  const moduleLanding = articles.find(a => a.module === article.module && !a.screen);
  const breadcrumb: UserGuideCrumb[] = [{ label: '', slug: null }, { label: article.module, slug: moduleLanding?.slug ?? null }];
  if (article.screen) breadcrumb.push({ label: article.screen, slug: article.slug });
  const pick = (s?: string | null) => (s ? by.get(s) ?? null : null);
  return { article, breadcrumb, previous: pick(article.previous), next: pick(article.next), related: article.related.map(r => by.get(r)).filter((a): a is UserGuideArticleMeta => !!a) };
}

export interface UserGuideModuleGroup { module: string; landing: UserGuideArticleMeta | null; screens: UserGuideArticleMeta[] }

/** The contents: one group per module in the order the manifest lists them, the module's own page first. */
export function groupByModule(articles: readonly UserGuideArticleMeta[]): UserGuideModuleGroup[] {
  const order: string[] = [];
  articles.forEach(a => { if (!order.includes(a.module)) order.push(a.module); });
  return order.map(module => {
    const inModule = articles.filter(a => a.module === module);
    return { module, landing: inModule.find(a => !a.screen) ?? null, screens: inModule.filter(a => a.screen) };
  });
}
