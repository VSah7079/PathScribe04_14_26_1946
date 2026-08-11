/**
 * useLatestResearch.ts — src/hooks/useLatestResearch.ts
 *
 * Boundary between the research feed service and the UI. The component that
 * consumes this holds no fetching, parsing, caching or error handling — it
 * receives an article or it does not.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

import { useEffect, useState } from 'react';
import type { IResearchFeedService, ResearchArticle } from '@/services/research/IResearchFeedService';
import { pubmedResearchFeedService } from '@/services/research/pubmedResearchFeedService';

interface LatestResearchState {
  article: ResearchArticle | null;
  isLoading: boolean;
}

export function useLatestResearch(
  service: IResearchFeedService = pubmedResearchFeedService,
): LatestResearchState {
  const [article, setArticle] = useState<ResearchArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // Fire and forget: the dashboard renders immediately and the ticker
    // appears underneath it if and when the feed resolves.
    service
      .getLatestArticle(controller.signal)
      .then((result) => {
        if (!active) return;
        setArticle(result);
        setIsLoading(false);
      })
      .catch(() => {
        // The service contract says it never rejects; this is belt and braces
        // so a future implementation cannot take the dashboard down with it.
        if (!active) return;
        setArticle(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [service]);

  return { article, isLoading };
}

export default useLatestResearch;
