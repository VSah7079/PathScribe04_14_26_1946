/**
 * IResearchFeedConfigService.ts — src/services/research/IResearchFeedConfigService.ts
 *
 * Admin-editable configuration for the PubMed literature feed.
 *
 * Exists for the same reason services/externalResources/ exists: the CAP
 * protocol link was once hardcoded, 404'd, and nobody could fix it without a
 * code change. Every URL this feed depends on is therefore editable, so an
 * NCBI restructure is an admin edit rather than a release.
 *
 * Deliberately NOT stored as an ExternalResource. Those are curated links
 * pathologists click, and resolveForViewer() surfaces them in the Resources
 * panel — an eUtils API endpoint would appear there as a broken-looking
 * entry. Same pattern, different shape, so it lives with the feed it
 * configures.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

export interface ResearchFeedConfig {
  /** Master switch. Off means the ticker never renders and no call is made. */
  enabled: boolean;
  /** eUtils base, no trailing slash. */
  apiBaseUrl: string;
  /** Article URL, with {PMID} substituted at click time. */
  articleUrlTemplate: string;
  /** PubMed search expression. A product knob as much as a break-fix one —
   *  a GI-heavy lab may want GI terms. */
  query: string;
}

/** Observability, so a permanently dead feed is distinguishable from a
 *  transient one. Everything about this feature fails silently by design;
 *  without this, nobody would ever know it had stopped working. */
export interface ResearchFeedHealth {
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  lastOutcome: 'success' | 'empty' | 'rate-limited' | 'error' | null;
}

export interface IResearchFeedConfigService {
  /** Never rejects, never returns partial config. Missing, malformed or
   *  rejected values fall back to the built-in defaults field by field. */
  getConfig(): Promise<ResearchFeedConfig>;
  saveConfig(config: ResearchFeedConfig): Promise<ResearchFeedConfig>;
  getDefaults(): ResearchFeedConfig;
  getHealth(): ResearchFeedHealth;
  recordHealth(outcome: NonNullable<ResearchFeedHealth['lastOutcome']>): void;
}
