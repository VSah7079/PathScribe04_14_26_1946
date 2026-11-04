// src/pages/Help/UserGuidePage.tsx
// ─────────────────────────────────────────────────────────
// Batch 657: the User Guide inside the app. /help is the contents and search; /help/<module> and
// /help/<module>/<screen> are articles, each with a "You are here" trail, the previous and next step and the
// related actions. What surrounds an article is decided in services/help/userGuideNavigation.ts; the article
// text is built from docs/user-guide/ and shown after sanitising.
// ─────────────────────────────────────────────────────────
import './userGuide.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { userGuideClient, withGuideImages } from '@/services/help/userGuideClient';
import { articleView, groupByModule, type UserGuideArticleMeta } from '@/services/help/userGuideNavigation';
import { searchUserGuide, type UserGuideIndexEntry } from '@/services/help/userGuideSearch';
import { userGuideSlugFromPath } from '@/services/help/userGuideLinks';
import { sanitizeRichHtml } from '@/services/security/sanitizeHtml';
import { LoadingState } from '@/components/Common/LoadingState';

const to = (slug: string | null) => (slug ? `/help/${slug}` : '/help');

const UserGuidePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const slug = userGuideSlugFromPath(pathname);
  const [articles, setArticles] = useState<UserGuideArticleMeta[] | null>(null);
  const [index, setIndex] = useState<UserGuideIndexEntry[]>([]);
  const [body, setBody] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { userGuideClient.manifest().then(setArticles).catch(() => setFailed(true)); userGuideClient.searchIndex().then(setIndex).catch(() => undefined); }, []);
  const view = useMemo(() => (articles && slug ? articleView(articles, slug) : null), [articles, slug]);
  useEffect(() => {
    setBody(null);
    if (view) userGuideClient.article(view.article.slug).then(h => setBody(withGuideImages(h, userGuideClient.imageBase()))).catch(() => setFailed(true));
  }, [view]);
  const hits = useMemo(() => searchUserGuide(index, query), [index, query]);
  const groups = useMemo(() => (articles ? groupByModule(articles) : []), [articles]);

  // A link inside an article to another article moves within the page (the links are real anchors, so the keyboard works as it does for any link).
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const follow = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      const href = a?.getAttribute('href') ?? '';
      if (a && href.startsWith('/help')) { e.preventDefault(); navigate(href); }
    };
    el.addEventListener('click', follow);
    return () => el.removeEventListener('click', follow);
  }, [navigate, body]);

  const crumbLabel = (label: string) => label || t('userGuide.title');
  return (
    <div className="ps-ug">
      <aside className="ps-ug-side" aria-label={t('userGuide.contents')}>
        <Link className="ps-ug-side-title" to="/help">{t('userGuide.title')}</Link>
        <input className="ps-ug-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
               aria-label={t('userGuide.searchLabel')} placeholder={t('userGuide.searchPlaceholder')} />
        {query.trim() ? (
          <ul className="ps-ug-list">
            {hits.length === 0 && <li className="ps-ug-muted">{t('userGuide.noResults')}</li>}
            {hits.map(h => <li key={h.slug}><Link to={to(h.slug)}>{h.title}</Link></li>)}
          </ul>
        ) : groups.map(g => (
          <div key={g.module} className="ps-ug-group">
            {g.landing ? <Link className="ps-ug-group-name" to={to(g.landing.slug)}>{g.module}</Link> : <span className="ps-ug-group-name">{g.module}</span>}
            <ul className="ps-ug-list">{g.screens.map(s => <li key={s.slug}><Link to={to(s.slug)} aria-current={s.slug === slug ? 'page' : undefined}>{s.screen}</Link></li>)}</ul>
          </div>
        ))}
      </aside>
      <main className="ps-ug-main">
        {i18n.language.split('-')[0] !== 'en' && <p className="ps-ug-note">{t('userGuide.englishOnly')}</p>}
        {failed && <p className="ps-ug-note">{t('userGuide.notFound')}</p>}
        {!failed && !articles && <LoadingState label={t('userGuide.loading')} variant="inline" />}
        {articles && !slug && (
          <div className="ps-ug-contents">
            <h1>{t('userGuide.title')}</h1>
            <p>{t('userGuide.intro')}</p>
            {groups.map(g => <section key={g.module}><h2>{g.landing ? <Link to={to(g.landing.slug)}>{g.module}</Link> : g.module}</h2><ul>{g.screens.map(s => <li key={s.slug}><Link to={to(s.slug)}>{s.screen}</Link> <span className="ps-ug-muted">{s.workflow}</span></li>)}</ul></section>)}
          </div>
        )}
        {articles && slug && !view && !failed && <p className="ps-ug-note">{t('userGuide.notFound')} {t('userGuide.notFoundHint')}</p>}
        {view && (
          <article>
            <nav className="ps-ug-trail" aria-label={t('userGuide.youAreHere')}>
              <span className="ps-ug-trail-label">{t('userGuide.youAreHere')}:</span>
              {view.breadcrumb.map((c, i) => (
                <React.Fragment key={`${c.label}-${i}`}>
                  {i > 0 && <span aria-hidden="true"> › </span>}
                  {i < view.breadcrumb.length - 1 ? <Link to={to(c.slug)}>{crumbLabel(c.label)}</Link> : <strong>{crumbLabel(c.label)}</strong>}
                </React.Fragment>
              ))}
            </nav>
            <p className="ps-ug-meta">
              <span>{t('userGuide.workflow')}: <strong>{view.article.workflow}</strong></span>
              <span>{t('userGuide.role')}: <strong>{view.article.roles.join(', ')}</strong></span>
            </p>
            {view.article.status === 'Draft' && <p className="ps-ug-note">{t('userGuide.draftNote')}</p>}
            {body === null ? <LoadingState label={t('userGuide.loading')} variant="inline" />
              : <div className="ps-ug-body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(body) }} />}
            <nav className="ps-ug-steps" aria-label={t('userGuide.relatedActions')}>
              {view.previous && <Link className="ps-ug-prev" to={to(view.previous.slug)}>← {t('userGuide.previous')}: {view.previous.title}</Link>}
              {view.next && <Link className="ps-ug-next" to={to(view.next.slug)}>{t('userGuide.next')}: {view.next.title} →</Link>}
            </nav>
            {view.related.length > 0 && (
              <section className="ps-ug-related"><h2>{t('userGuide.relatedActions')}</h2>
                <ul>{view.related.map(r => <li key={r.slug}><Link to={to(r.slug)}>{r.title}</Link></li>)}</ul></section>
            )}
          </article>
        )}
      </main>
    </div>
  );
};

export default UserGuidePage;
