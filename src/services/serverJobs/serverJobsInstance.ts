// src/services/serverJobs/serverJobsInstance.ts
// Batch 551 (PS-539 phase 2d): the app's Server jobs service, exported from
// `@/services` as `serverJobsService`. With no API server (the demo) the
// browser does this work itself and there is nothing to list.
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { createHttpServerJobsApi, createServerJobsService } from './serverJobsService';

const apiBaseUrl = apiServerUrl('server jobs');

export const serverJobsService = createServerJobsService({
  api: apiBaseUrl ? createHttpServerJobsApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }) : null,
  authorization: authorizationService,
});
