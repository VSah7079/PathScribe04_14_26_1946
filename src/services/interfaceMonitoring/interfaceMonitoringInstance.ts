// src/services/interfaceMonitoring/interfaceMonitoringInstance.ts
// Batch 554 (PS-539 phase 2d): the app's interface monitoring service, exported
// from `@/services` as `interfaceMonitoringService`. With no API server (the
// demo) the browser handles interface messages itself and there is no engine.
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { createHttpInterfaceMonitoringApi, createInterfaceMonitoringService } from './interfaceMonitoringService';

const apiBaseUrl = apiServerUrl('interface monitoring');

export const interfaceMonitoringService = createInterfaceMonitoringService({
  api: apiBaseUrl ? createHttpInterfaceMonitoringApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }) : null,
  authorization: authorizationService,
});
