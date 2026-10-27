// src/services/help/userGuideNavigation.test.ts — Batch 657
import { describe, it, expect } from 'vitest';
import { articleView, groupByModule, type UserGuideArticleMeta } from './userGuideNavigation';
import { searchUserGuide, type UserGuideIndexEntry } from './userGuideSearch';
import { withGuideImages } from './userGuideClient';

const art = (o: Partial<UserGuideArticleMeta> & { slug: string; module: string }): UserGuideArticleMeta => ({
  title: o.slug, screen: '', workflow: 'w', roles: ['r'], keywords: [], routes: [], related: [], status: 'Draft', ...o,
});
const ARTICLES = [
  art({ slug: 'home', module: 'Home', next: 'accession' }),
  art({ slug: 'accession', module: 'Accession', previous: 'home', next: 'accession/new-case', related: ['search', 'missing'] }),
  art({ slug: 'accession/new-case', module: 'Accession', screen: 'New Case', previous: 'accession' }),
  art({ slug: 'search', module: 'Search' }),
];

describe('articleView: the trail, previous and next, and related actions', () => {
  it('a module page: contents, then the module', () => {
    const v = articleView(ARTICLES, 'accession')!;
    expect(v.breadcrumb).toEqual([{ label: '', slug: null }, { label: 'Accession', slug: 'accession' }]);
    expect(v.previous?.slug).toBe('home');
    expect(v.next?.slug).toBe('accession/new-case');
  });
  it('a screen page: contents, module (linked to its own page), screen', () => {
    const v = articleView(ARTICLES, 'accession/new-case')!;
    expect(v.breadcrumb.map(c => c.label)).toEqual(['', 'Accession', 'New Case']);
    expect(v.breadcrumb[1].slug).toBe('accession');
  });
  it('related lists only articles that exist; an unknown slug gives nothing', () => {
    expect(articleView(ARTICLES, 'accession')!.related.map(r => r.slug)).toEqual(['search']);
    expect(articleView(ARTICLES, 'nope')).toBeNull();
  });
  it('the contents group each module with its own page first, in manifest order', () => {
    const g = groupByModule(ARTICLES);
    expect(g.map(x => x.module)).toEqual(['Home', 'Accession', 'Search']);
    expect(g[1].landing?.slug).toBe('accession');
    expect(g[1].screens.map(s => s.slug)).toEqual(['accession/new-case']);
  });
});

describe('searchUserGuide', () => {
  const idx: UserGuideIndexEntry[] = [
    { slug: 'accession', title: 'Accession', module: 'Accession', screen: '', keywords: ['new case', 'intake'], roles: [], headings: ['Standard workflow'], text: 'Log a new specimen.' },
    { slug: 'search', title: 'Search', module: 'Search', screen: '', keywords: ['find case'], roles: [], headings: [], text: 'Find a case by accession number.' },
  ];
  it('finds by keyword and ranks a title or keyword hit above a text hit', () => {
    expect(searchUserGuide(idx, 'new case').map(e => e.slug)).toEqual(['accession']);
    expect(searchUserGuide(idx, 'accession').map(e => e.slug)).toEqual(['accession', 'search']);
  });
  it('every word must be found; a blank or one-letter query finds nothing', () => {
    expect(searchUserGuide(idx, 'case zebra')).toEqual([]);
    expect(searchUserGuide(idx, ' a ')).toEqual([]);
  });
});

describe('withGuideImages', () => {
  it('points screenshots at the guide folder, leaving other pictures alone', () => {
    const out = withGuideImages('<img alt="x" src="img/a.png"><img src="/other.png">', '/help/user-guide/');
    expect(out).toBe('<img alt="x" src="/help/user-guide/img/a.png"><img src="/other.png">');
  });
});
