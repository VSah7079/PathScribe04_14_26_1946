/**
 * pubmedResearchFeedService.ts — src/services/research/pubmedResearchFeedService.ts
 *
 * NCBI eUtils implementation of IResearchFeedService, tuned for VDI estates
 * where many concurrent sessions share one public egress IP.
 *
 * Two-stage pipeline, as eUtils requires:
 *   1. esearch.fcgi  -> most recent PMID matching the domain query
 *   2. esummary.fcgi -> title, journal and publication date for that PMID
 *
 * Rate-limit posture:
 *
 * - A 24 hour localStorage cache means a returning user costs zero network
 *   calls. First visit of the day costs two.
 *
 * - A 429 response parks the feed for 30 minutes. Without this, every session
 *   behind a throttled gateway retries on every dashboard mount and keeps the
 *   shared IP pinned at the limit. This matters more than the success cache:
 *   it is the difference between one slow morning and a self-sustaining
 *   throttle.
 *
 * - VITE_NCBI_API_KEY, when set, raises the shared limit from 3 to 10 req/sec.
 *   Note this key is inlined into the client bundle and is therefore public.
 *
 * - Endpoints, the article URL template and the search query are NOT
 *   hardcoded here. They come from mockResearchFeedConfigService, so an NCBI
 *   restructure is an admin edit rather than a release — the same lesson
 *   services/externalResources/ was built from. Every outcome is stamped via
 *   recordHealth(), so a permanently dead feed is distinguishable from a
 *   transient blip.
 *
 * Never throws. Every failure path resolves to null.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

import type { IResearchFeedService, ResearchArticle } from './IResearchFeedService';
import { mockResearchFeedConfigService } from './mockResearchFeedConfigService';

/** Identifies us to NCBI, per their usage guidelines. */
const TOOL = 'PathScribe';
const CONTACT = 'support@formedrixai.com';



/** Per request. Two sequential calls, so the worst case before giving up is 6s. */
const REQUEST_TIMEOUT_MS = 3_000;

const CACHE_KEY = 'pathscribe_pubmed_ticker_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** How long to stop calling NCBI after a 429. */
const BACKOFF_KEY = 'pathscribe_pubmed_ticker_backoff';
const BACKOFF_MS = 30 * 60 * 1000;

/** Matches the schema in the VDI addendum. */
interface CacheEnvelope {
  timestamp: number;
  data: ResearchArticle | null;
}

function apiKey(): string | undefined {
  const key = (import.meta as unknown as { env?: Record<string, string> })
    .env?.VITE_NCBI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

/* ------------------------------------------------------------------ cache */

function readCache(): ResearchArticle | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return undefined;
    return parsed.data;
  } catch {
    // Corrupt entry, storage disabled, private browsing — all mean "no
    // cache", never "fail".
    return undefined;
  }
}

function writeCache(data: ResearchArticle | null): void {
  try {
    const envelope: CacheEnvelope = { timestamp: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    /* caching is an optimisation, not a requirement */
  }
}

function isBackedOff(): boolean {
  try {
    const until = Number(localStorage.getItem(BACKOFF_KEY) ?? 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function startBackoff(): void {
  try {
    localStorage.setItem(BACKOFF_KEY, String(Date.now() + BACKOFF_MS));
  } catch {
    /* no storage: the request simply retries next mount */
  }
}

/* ------------------------------------------------------------- sanitising */

/**
 * Reduces a PubMed title to plain text. PubMed returns inline markup for
 * taxonomic names and superscripts, plus HTML entities. DOMParser decodes and
 * strips both without executing anything, unlike innerHTML on a live node.
 */
function toPlainText(raw: string): string {
  if (!raw) return '';
  let text = raw;
  try {
    text = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? raw;
  } catch {
    text = raw.replace(/<[^>]*>/g, '');
  }
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');   // PubMed titles carry a trailing period
}

/* ------------------------------------------------------------- networking */

class RateLimitedError extends Error {}

function buildUrl(baseUrl: string, endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${baseUrl}/${endpoint}`);
  const key = apiKey();
  Object.entries({
    ...params,
    tool: TOOL,
    email: CONTACT,
    ...(key ? { api_key: key } : {}),
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

/**
 * Fetch with a hard timeout, honouring an externally supplied abort signal.
 * The signal alone does not cover a connection the hospital proxy accepts and
 * then never answers, which would leave the ticker loading indefinitely.
 */
async function getJson(url: string, signal?: AbortSignal): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 429) throw new RateLimitedError('eUtils rate limit');
    if (!response.ok) throw new Error(`eUtils responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/* ----------------------------------------------------------------- service */

export const pubmedResearchFeedService: IResearchFeedService = {
  async getLatestArticle(signal?: AbortSignal): Promise<ResearchArticle | null> {
    // URLs and query come from admin config, so an NCBI restructure is an
    // admin edit rather than a release. Every field falls back to its
    // built-in default independently — see the config service.
    const config = await mockResearchFeedConfigService.getConfig();
    if (!config.enabled) return null;

    const cached = readCache();
    if (cached !== undefined) return cached;

    // Shared egress IP is currently throttled; do not add to it.
    if (isBackedOff()) return null;

    try {
      // Stage 1 — most recent PMID for the domain query.
      const search = await getJson(
        buildUrl(config.apiBaseUrl, 'esearch.fcgi', {
          db: 'pubmed',
          term: config.query,
          retmode: 'json',
          retmax: '1',
          sort: 'pub_date',
        }),
        signal,
      );

      const pmid: string | undefined = search?.esearchresult?.idlist?.[0];
      if (!pmid) {
        mockResearchFeedConfigService.recordHealth('empty');
        writeCache(null);
        return null;
      }

      // Stage 2 — metadata for that PMID.
      const summary = await getJson(
        buildUrl(config.apiBaseUrl, 'esummary.fcgi', { db: 'pubmed', id: pmid, retmode: 'json' }),
        signal,
      );

      const record = summary?.result?.[pmid];
      const title = toPlainText(record?.title ?? '');
      if (!title) {
        mockResearchFeedConfigService.recordHealth('empty');
        writeCache(null);
        return null;
      }

      const article: ResearchArticle = {
        id: pmid,
        title,
        source: toPlainText(record?.source ?? ''),
        pubdate: toPlainText(record?.pubdate ?? ''),
        url: config.articleUrlTemplate.replace('{PMID}', pmid),
      };

      mockResearchFeedConfigService.recordHealth('success');
      writeCache(article);
      return article;
    } catch (error) {
      if (error instanceof RateLimitedError) {
        startBackoff();
        mockResearchFeedConfigService.recordHealth('rate-limited');
      } else {
        mockResearchFeedConfigService.recordHealth('error');
      }
      // Offline, blocked by network policy, timed out, rate limited,
      // malformed payload, or aborted on unmount. All are non-events: the
      // ticker does not render. Failures are not cached, so the next visit
      // retries — except after a 429, which parks the feed above.
      return null;
    }
  },
};

export default pubmedResearchFeedService;
