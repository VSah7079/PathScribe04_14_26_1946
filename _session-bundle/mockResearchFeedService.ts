/**
 * mockResearchFeedService.ts — src/services/research/mockResearchFeedService.ts
 *
 * Offline stand-in for the PubMed feed. Completes the interface/mock/real
 * triplet, and lets the ticker be exercised in tests, in Storybook, or on a
 * machine with no route to NIH.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

import type { IResearchFeedService, ResearchArticle } from './IResearchFeedService';

const SAMPLE: ResearchArticle = {
  id: '00000000',
  title: 'Structured synoptic reporting and diagnostic concordance in digital pathology workflows',
  source: 'Arch Pathol Lab Med',
  pubdate: '2026 Jul',
  url: 'https://pubmed.ncbi.nlm.nih.gov/00000000/',
};

/** Latency, so loading states are visible during development. */
const SIMULATED_DELAY_MS = 400;

export const mockResearchFeedService: IResearchFeedService = {
  getLatestArticle(signal?: AbortSignal): Promise<ResearchArticle | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(SAMPLE), SIMULATED_DELAY_MS);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  },
};

export default mockResearchFeedService;
