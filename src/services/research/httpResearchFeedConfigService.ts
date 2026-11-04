// src/services/research/httpResearchFeedConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IResearchFeedConfigService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/REFERRAL_RESEARCH_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, required, value } from '../apiServer/httpServiceKit';
import type { IResearchFeedConfigService } from './IResearchFeedConfigService';
import { researchFeedConfigService as defaultResearchFeedConfigService } from './researchFeedConfigServiceInstance';

type P<K extends keyof IResearchFeedConfigService> = Parameters<IResearchFeedConfigService[K]>;
const BASE = '/api/research/research-feed-config';

export const createHttpResearchFeedConfigService = (client: ApiHttpClient, local: Pick<IResearchFeedConfigService, 'getDefaults' | 'getHealth' | 'recordHealth'> = defaultResearchFeedConfigService): IResearchFeedConfigService =>
  // getDefaults, getHealth, recordHealth answer from memory in the browser (no server call): researchFeedConfigService keeps them local.
  ({ ...buildHttpService<Omit<IResearchFeedConfigService, 'getDefaults' | 'getHealth' | 'recordHealth'>>(client, {
    getConfig: value('GET', () => `${BASE}/get-config`, { missing: local.getDefaults(), fallback: local.getDefaults() }),
    saveConfig: required('POST', () => `${BASE}/save-config`, { body: (config: P<'saveConfig'>[0]) => (config) }),
  }),
    getDefaults: (...a: P<'getDefaults'>) => local.getDefaults(...a),
    getHealth: (...a: P<'getHealth'>) => local.getHealth(...a),
    recordHealth: (...a: P<'recordHealth'>) => local.recordHealth(...a),
  } as IResearchFeedConfigService);
