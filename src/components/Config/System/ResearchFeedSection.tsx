// src/components/Config/System/ResearchFeedSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin management for the PubMed literature feed shown on the Home
// dashboard.
//
// Built for the same reason ExternalResourcesSection.tsx was: the CAP
// protocol URL was once hardcoded, 404'd, and nobody could fix it
// without a code change. Every URL this feed depends on is editable
// here, so an NCBI restructure is an admin edit rather than a release.
//
// Deliberately NOT stored as an ExternalResource. Those are curated
// links pathologists click, surfaced in the Resources panel by
// resolveForViewer() — an eUtils API endpoint would appear there as a
// broken-looking entry. Same pattern, different shape, so the config
// lives with the feed it configures in services/research/.
//
// The URL fields are validated against an allow-list (see
// mockResearchFeedConfigService.ALLOWED_HOSTS). This is not paranoia:
// articleUrlTemplate decides where a clinician's browser goes on click,
// so without a constraint an admin — or anyone who compromises an admin
// account — could point the dashboard at a phishing host.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import '../../../pathscribe.css';
import {
  mockResearchFeedConfigService,
  ALLOWED_HOSTS,
  isAllowedUrl,
} from '@/services/research/mockResearchFeedConfigService';
import type {
  ResearchFeedConfig,
  ResearchFeedHealth,
} from '@/services/research/IResearchFeedConfigService';

const OUTCOME_LABELS: Record<string, string> = {
  success: 'Succeeded',
  empty: 'No matching article',
  'rate-limited': 'Rate limited by NCBI',
  error: 'Failed',
};

function formatWhen(ts: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString();
}

/** Surfaces a silently-dead feed. Everything here fails quietly by design,
 *  so without an explicit staleness read nobody would ever notice. */
function stalenessNote(health: ResearchFeedHealth): string | null {
  if (!health.lastSuccessAt) {
    return health.lastAttemptAt
      ? 'This feed has never successfully retrieved an article.'
      : null;
  }
  const days = Math.floor((Date.now() - health.lastSuccessAt) / 86_400_000);
  return days >= 3
    ? `No successful retrieval for ${days} days — the feed may be blocked or the endpoint may have moved.`
    : null;
}

const ResearchFeedSection: React.FC = () => {
  const defaults = mockResearchFeedConfigService.getDefaults();
  const [config, setConfig] = useState<ResearchFeedConfig>(defaults);
  const [health, setHealth] = useState<ResearchFeedHealth>(
    mockResearchFeedConfigService.getHealth(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    mockResearchFeedConfigService.getConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof ResearchFeedConfig>(key: K, value: ResearchFeedConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!isAllowedUrl(config.apiBaseUrl)) {
      setError(`API endpoint must be https and on an approved host (${ALLOWED_HOSTS.join(', ')}).`);
      return;
    }
    if (!config.articleUrlTemplate.includes('{PMID}')) {
      setError('Article URL must contain {PMID}, or every article would link to the same page.');
      return;
    }
    if (!isAllowedUrl(config.articleUrlTemplate)) {
      setError(`Article URL must be https and on an approved host (${ALLOWED_HOSTS.join(', ')}).`);
      return;
    }
    if (!config.query.trim()) {
      setError('Search query cannot be empty.');
      return;
    }
    const stored = await mockResearchFeedConfigService.saveConfig(config);
    setConfig(stored);
    setHealth(mockResearchFeedConfigService.getHealth());
    setError(null);
    setSaved(true);
  };

  const handleReset = () => {
    setConfig(defaults);
    setSaved(false);
    setError(null);
  };

  if (loading) return <div className="ps-rf-loading">Loading…</div>;

  const staleness = stalenessNote(health);

  return (
    <div className="ps-rf">
      <header className="ps-rf-header">
        <h1 className="ps-rf-title">Research Feed</h1>
        <p className="ps-rf-subtitle">
          The literature headline shown on the Home dashboard. Articles come
          straight from NCBI PubMed, sorted by publication date — this is an
          automated feed, not a curated or reviewed selection, and should never
          be presented to clinicians as guidance.
        </p>
      </header>

      {/* Health — the whole reason this panel is worth opening */}
      <section className="ps-rf-health">
        <div className="ps-rf-health-row">
          <span className="ps-rf-health-label">Last successful retrieval</span>
          <span className="ps-rf-health-value">{formatWhen(health.lastSuccessAt)}</span>
        </div>
        <div className="ps-rf-health-row">
          <span className="ps-rf-health-label">Last attempt</span>
          <span className="ps-rf-health-value">
            {formatWhen(health.lastAttemptAt)}
            {health.lastOutcome && ` — ${OUTCOME_LABELS[health.lastOutcome] ?? health.lastOutcome}`}
          </span>
        </div>
        {staleness && <div className="ps-rf-health-warning">{staleness}</div>}
      </section>

      <div className="ps-rf-field ps-rf-field--inline">
        <label className="ps-conf-label" htmlFor="rf-enabled">Show the feed on the dashboard</label>
        <input
          id="rf-enabled"
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update('enabled', e.target.checked)}
        />
      </div>

      <div className="ps-rf-field">
        <label className="ps-conf-label" htmlFor="rf-query">Search query</label>
        <textarea
          id="rf-query"
          className="ps-conf-input ps-rf-textarea"
          rows={4}
          value={config.query}
          onChange={(e) => update('query', e.target.value)}
        />
        <p className="ps-rf-hint">
          PubMed search syntax. The exclusions for retracted publications,
          preprints, editorials, comments and letters are the only quality
          filter this feed has — removing them means the dashboard can surface
          a retracted paper.
        </p>
      </div>

      <div className="ps-rf-field">
        <label className="ps-conf-label" htmlFor="rf-article">Article URL</label>
        <input
          id="rf-article"
          className="ps-conf-input ps-rf-input"
          value={config.articleUrlTemplate}
          onChange={(e) => update('articleUrlTemplate', e.target.value)}
        />
        <p className="ps-rf-hint">
          Where the headline links. Must contain <code>{'{PMID}'}</code>.
          Approved hosts: {ALLOWED_HOSTS.join(', ')}.
        </p>
      </div>

      <div className="ps-rf-field">
        <label className="ps-conf-label" htmlFor="rf-api">API endpoint</label>
        <input
          id="rf-api"
          className="ps-conf-input ps-rf-input"
          value={config.apiBaseUrl}
          onChange={(e) => update('apiBaseUrl', e.target.value)}
        />
        <p className="ps-rf-hint">
          NCBI eUtils base URL, no trailing slash. Change this only if NCBI
          moves the service.
        </p>
      </div>

      {error && <div className="ps-rf-error" role="alert">{error}</div>}
      {saved && <div className="ps-rf-saved" role="status">Saved. Existing cached articles refresh within 24 hours.</div>}

      <div className="ps-rf-actions">
        <button type="button" className="ps-conf-btn-secondary" onClick={handleReset}>
          Restore defaults
        </button>
        <button type="button" className="ps-conf-btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};

export default ResearchFeedSection;
