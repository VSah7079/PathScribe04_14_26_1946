// src/services/exports/exportTrackerInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d): the app's export service, exported from
// `@/services` as `exportService`. With an API server configured
// (VITE_API_BASE_URL, checked as sign-in checks it: https, or http only to
// this computer in development) exports are requested from it and its hub
// says when they're ready; without one (the demo) they are built in the
// browser, as before. Signing out forgets every notice (sessionEndHooks).
// ─────────────────────────────────────────────────────────────────────────────
import { apiServerUrl, isProductionBuild } from '../apiServer/apiServerUrl';
import { absoluteDownloadUrl, downloadFromUrl } from '@/utils/downloadFromUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { onSessionEnd } from '../auth/sessionEndHooks';
import { liveUpdateService } from '../liveUpdates/liveUpdateService';
import { createHttpExportApi } from './httpExportApi';
import { createExportTracker } from './exportTracker';

const isProduction = isProductionBuild();
const apiBaseUrl = apiServerUrl('exports');

export const exportService = createExportTracker({
  api: apiBaseUrl ? createHttpExportApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }) : null,
  subscribeStatus: onEvent => liveUpdateService.subscribeExports(onEvent),
  openDownload: (url, filename) => !!apiBaseUrl && downloadFromUrl(absoluteDownloadUrl(url, apiBaseUrl), filename, { allowLocalHttp: !isProduction }),
});

onSessionEnd(() => exportService.reset());
