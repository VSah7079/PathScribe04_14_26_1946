// src/services/serverJobs/serverJobsInstance.ts
// Batch 551 (PS-539 phase 2d): the app's Server jobs service, exported from
// `@/services` as `serverJobsService`. With no API server (the demo) the
// browser does this work itself and there is nothing to list.
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { createHttpServerJobsApi, createServerJobsService } from './serverJobsService';
import { simulatedServerJobsApi } from './simulatedServerJobsApi';
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';

const apiBaseUrl = apiServerUrl('server jobs');

export const serverJobsService = createServerJobsService({
  api: apiBaseUrl ? createHttpServerJobsApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }) : null,
  // Batch 605: the demo (no API server) shows sample jobs, labelled Simulated.
  simulatedApi: dataMayPersistInBrowser() ? simulatedServerJobsApi : undefined,
  authorization: authorizationService,
});
