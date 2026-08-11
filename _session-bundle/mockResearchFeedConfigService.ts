/**
 * mockResearchFeedConfigService.ts — src/services/research/mockResearchFeedConfigService.ts
 *
 * localStorage-backed configuration for the literature feed, matching this
 * codebase's mock-is-the-active-implementation convention.
 *
 * Two rules this file exists to enforce:
 *
 * 1. A bad config can never disable the feed. Every field falls back to its
 *    built-in default independently, so a blank or malformed value degrades
 *    to today's behaviour rather than to nothing. Relocating a hardcoded
 *    value into config must not relocate the failure with it.
 *
 * 2. An admin-editable URL is an attack surface. articleUrlTemplate decides
 *    where a clinician's browser goes on click, so an admin — or anyone who
 *    compromises an admin account — could point it at a phishing host. Both
 *    URLs are therefore validated against an allow-list, and a rejected
 *    value silently reverts to the default.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

import type {
  IResearchFeedConfigService,
  ResearchFeedConfig,
  ResearchFeedHealth,
} from './IResearchFeedConfigService';

const CONFIG_KEY = 'pathscribe_research_feed_config';
const HEALTH_KEY = 'pathscribe_research_feed_health';

const DEFAULTS: ResearchFeedConfig = {
  enabled: true,
  apiBaseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
  articleUrlTemplate: 'https://pubmed.ncbi.nlm.nih.gov/{PMID}/',
  query:
    '((digital pathology[Title/Abstract]) OR (synoptic reporting[Title/Abstract]))'
    + ' AND english[Language]'
    + ' NOT retracted publication[Publication Type]'
    + ' NOT preprint[Publication Type]'
    + ' NOT editorial[Publication Type]'
    + ' NOT comment[Publication Type]'
    + ' NOT letter[Publication Type]',
};

/**
 * Hosts this feed may talk to or send a clinician to. Exported so the admin
 * screen can show the rule rather than just rejecting input without saying
 * why. Extend deliberately — every entry is somewhere a pathologist can be
 * sent by an admin edit alone.
 */
export const ALLOWED_HOSTS = ['nih.gov', 'nlm.nih.gov', 'doi.org'];

export function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value.replace('{PMID}', '1'));
    if (url.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- config */

function sanitise(raw: Partial<ResearchFeedConfig> | null): ResearchFeedConfig {
  if (!raw) return { ...DEFAULTS };

  const apiBaseUrl =
    typeof raw.apiBaseUrl === 'string' && isAllowedUrl(raw.apiBaseUrl)
      ? raw.apiBaseUrl.replace(/\/+$/, '')
      : DEFAULTS.apiBaseUrl;

  // The template must also still contain the placeholder — without it every
  // article would link to the same page, which is worse than a dead link
  // because it looks like it works.
  const articleUrlTemplate =
    typeof raw.articleUrlTemplate === 'string'
    && raw.articleUrlTemplate.includes('{PMID}')
    && isAllowedUrl(raw.articleUrlTemplate)
      ? raw.articleUrlTemplate
      : DEFAULTS.articleUrlTemplate;

  const query =
    typeof raw.query === 'string' && raw.query.trim().length > 0
      ? raw.query.trim()
      : DEFAULTS.query;

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    apiBaseUrl,
    articleUrlTemplate,
    query,
  };
}

/* ----------------------------------------------------------------- health */

const EMPTY_HEALTH: ResearchFeedHealth = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastOutcome: null,
};

/* ---------------------------------------------------------------- service */

export const mockResearchFeedConfigService: IResearchFeedConfigService = {
  async getConfig(): Promise<ResearchFeedConfig> {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return sanitise(raw ? (JSON.parse(raw) as Partial<ResearchFeedConfig>) : null);
    } catch {
      return { ...DEFAULTS };
    }
  },

  async saveConfig(config: ResearchFeedConfig): Promise<ResearchFeedConfig> {
    const clean = sanitise(config);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
    } catch {
      /* storage unavailable — the caller still gets the sanitised value back */
    }
    return clean;
  },

  getDefaults(): ResearchFeedConfig {
    return { ...DEFAULTS };
  },

  getHealth(): ResearchFeedHealth {
    try {
      const raw = localStorage.getItem(HEALTH_KEY);
      if (!raw) return { ...EMPTY_HEALTH };
      return { ...EMPTY_HEALTH, ...(JSON.parse(raw) as Partial<ResearchFeedHealth>) };
    } catch {
      return { ...EMPTY_HEALTH };
    }
  },

  recordHealth(outcome): void {
    try {
      const current = this.getHealth();
      const now = Date.now();
      const next: ResearchFeedHealth = {
        lastAttemptAt: now,
        lastSuccessAt: outcome === 'success' ? now : current.lastSuccessAt,
        lastOutcome: outcome,
      };
      localStorage.setItem(HEALTH_KEY, JSON.stringify(next));
    } catch {
      /* observability is best-effort; never let it break the feed */
    }
  },
};

export default mockResearchFeedConfigService;
