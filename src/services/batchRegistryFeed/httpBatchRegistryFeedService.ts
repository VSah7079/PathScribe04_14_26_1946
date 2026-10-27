// src/services/batchRegistryFeed/httpBatchRegistryFeedService.ts
// Batch 620 part S (PS-800): the API server's version of IBatchRegistryFeedService (HTTP_SERVICES_PATTERN.md §7).
// One route per method; a refusal is a fixed code. The file comes back in the answer to build-run and is never stored by the browser.
// Contract: docs/architecture/BATCH_REGISTRY_FEED_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IBatchRegistryFeedService } from './IBatchRegistryFeedService';

type P<K extends keyof IBatchRegistryFeedService> = Parameters<IBatchRegistryFeedService[K]>;
const BASE = '/api/registry/batch-registry-feed';

export const createHttpBatchRegistryFeedService = (client: ApiHttpClient): IBatchRegistryFeedService =>
  buildHttpService<IBatchRegistryFeedService>(client, {
    getProfiles: result('GET', () => `${BASE}/get-profiles`),
    saveProfile: result('POST', () => `${BASE}/save-profile`, { body: (input: P<'saveProfile'>[0]) => input }),
    removeProfile: result('POST', () => `${BASE}/remove-profile`, { body: (id: P<'removeProfile'>[0]) => ({ id }) }),
    isBatchProgram: result('GET', (screeningRegistryId: P<'isBatchProgram'>[0]) => `${BASE}/is-batch-program${queryString({ screeningRegistryId })}`),
    getRuns: result('GET', (profileId?: P<'getRuns'>[0]) => `${BASE}/get-runs${queryString({ profileId })}`),
    preview: result('POST', () => `${BASE}/preview`, { body: (profileId: P<'preview'>[0]) => ({ profileId }) }),
    buildRun: result('POST', () => `${BASE}/build-run`, { body: (profileId: P<'buildRun'>[0], options?: P<'buildRun'>[1]) => ({ profileId, manual: options?.manual === true }) }),
    recordFileAcknowledgement: result('POST', () => `${BASE}/record-file-acknowledgement`, { body: (runId: P<'recordFileAcknowledgement'>[0], ack: P<'recordFileAcknowledgement'>[1]) => ({ runId, ...ack }) }),
  });
