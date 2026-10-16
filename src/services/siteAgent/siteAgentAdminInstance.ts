// src/services/siteAgent/siteAgentAdminInstance.ts
// Batch 552 (PS-539 phase 2d): the app's site agent administration, exported
// from `@/services` as `siteAgentAdminService`. With the API server it calls
// it; in the demo the configuration is kept with the other demo settings.
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { readSessionProfile } from '../auth/sessionProfile';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { storageGet, storageSet } from '../mockStorage';
import type { SiteAgentConfig } from './siteAgentAdmin';
import { createDemoSiteAgentAdminApi, createHttpSiteAgentAdminApi, createSiteAgentAdminService } from './siteAgentAdminService';

const apiBaseUrl = apiServerUrl('site agents');
const KEY = 'site_agent_config';

export const siteAgentAdminService = createSiteAgentAdminService({
  viaServer: !!apiBaseUrl,
  authorization: authorizationService,
  api: apiBaseUrl
    ? createHttpSiteAgentAdminApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken })
    : createDemoSiteAgentAdminApi({
      read: siteId => storageGet<Record<string, SiteAgentConfig>>(KEY, {})[siteId] ?? null,
      write: config => storageSet(KEY, { ...storageGet<Record<string, SiteAgentConfig>>(KEY, {}), [config.siteId]: config }),
      random: n => globalThis.crypto.getRandomValues(new Uint8Array(n)),
      now: () => new Date(),
      userName: () => { const p = readSessionProfile(); return p?.name ?? p?.id ?? 'unknown'; },
    }),
});
