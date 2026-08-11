/**
 * PubMedTicker.tsx — src/components/Common/PubMedTicker.tsx
 *
 * Displays the most recent peer-reviewed article matching the pathology
 * domain query, opening it in a companion window.
 *
 * Presentation only. Fetching, sanitising, caching and rate-limit backoff all
 * live in src/services/research; window placement and position memory come
 * from the shared useCompanionWindow hook — the same launcher the EMR Sidecar
 * uses, rather than a second parallel mechanism.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

import React, { useState } from 'react';
import { useLatestResearch } from '@hooks/useLatestResearch';
import { useCompanionWindow } from '@hooks/useCompanionWindow';

const ExternalLinkIcon: React.FC = () => (
  <svg
    className="ps-litfeed-external"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const PubMedTicker: React.FC = () => {
  const { article, isLoading } = useLatestResearch();

  // Reference material, not patient context: closeOnUnmount is false so
  // navigating away from the dashboard does not shut a paper the user is
  // still reading.
  const { openCompanion } = useCompanionWindow({
    windowName: 'PathScribePubMedRef',
    preferredWidth: 900,
    preferredHeight: 800,
    closeOnUnmount: false,
  });

  // Once a launch has been blocked, stop intercepting clicks and let the
  // anchor behave normally. The EMR Sidecar answers 'blocked' with an
  // embedded drawer; PubMed sets X-Frame-Options and cannot be embedded, so
  // an ordinary new tab is the honest fallback here.
  const [popupBlocked, setPopupBlocked] = useState(false);

  if (isLoading) {
    return (
      <div className="ps-litfeed" aria-hidden="true">
        <span className="ps-litfeed-badge">
          <span className="ps-litfeed-dot" />
          From PubMed
        </span>
        <span className="ps-litfeed-skeleton" />
      </div>
    );
  }

  // Nothing to show — no feed, no network, nothing published. Collapse
  // silently rather than leaving an empty shell on the dashboard.
  if (!article) return null;

  const metadata = [article.source, article.pubdate].filter(Boolean).join(' · ');

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (popupBlocked) return;                                   // let the anchor work
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    // preventDefault has to happen synchronously, before openCompanion is
    // awaited — the click gesture is spent by the time the promise settles.
    event.preventDefault();

    void openCompanion(article.url).then((result) => {
      if (result !== 'blocked') return;
      setPopupBlocked(true);
      // One best-effort attempt at a plain tab; if enterprise policy blocks
      // popups outright this also fails, and the next click falls through to
      // the anchor's own navigation.
      window.open(article.url, '_blank', 'noopener,noreferrer');
    });
  };

  return (
    <div className="ps-litfeed">
      {/* Names the source rather than implying endorsement. This is an
          automated feed of the most recent matching article, not a curated
          or reviewed selection. */}
      <span
        className="ps-litfeed-badge"
        title="Most recent matching article from PubMed. Automated feed, not a curated selection."
      >
        <span className="ps-litfeed-dot" />
        From PubMed
      </span>

      <a
        className="ps-litfeed-link"
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Open the PubMed listing for "${article.title}" in a companion window`}
      >
        <span className="ps-litfeed-title">{article.title}</span>
        {metadata && <span className="ps-litfeed-meta">{metadata}</span>}
        <ExternalLinkIcon />
      </a>
    </div>
  );
};

export default PubMedTicker;
