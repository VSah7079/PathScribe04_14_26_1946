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
import { readSessionProfile } from '../auth/sessionProfile';
import { createHttpExportApi } from './httpExportApi';
import { createDemoExportApi } from './demoExportApi';
import { createExportTracker } from './exportTracker';

const isProduction = isProductionBuild();
const apiBaseUrl = apiServerUrl('exports');

// Batch 611 (#194): with no API server, the demo has a simulated export server
// (demoExportApi.ts), so a long export shows Preparing, appears in My exports
// and downloads, as it will with the real one. Labelled Simulated on screen.
const demoApi = apiBaseUrl ? null : createDemoExportApi({
  now: () => new Date(),
  user: () => { const p = readSessionProfile(); return { userId: p?.id ?? 'unknown', userName: p?.name ?? p?.id ?? 'unknown' }; },
});

export const exportService = createExportTracker({
  api: apiBaseUrl ? createHttpExportApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }) : demoApi,
  simulation: demoApi ? { longBuilds: () => demoApi.longBuilds(), setLongBuilds: on => demoApi.setLongBuilds(on) } : null,
  subscribeStatus: onEvent => demoApi ? demoApi.subscribe(onEvent) : liveUpdateService.subscribeExports(onEvent),
  openDownload: (url, filename) => demoApi
    ? demoApi.openDownload(url)
    : !!apiBaseUrl && downloadFromUrl(absoluteDownloadUrl(url, apiBaseUrl), filename, { allowLocalHttp: !isProduction }),
});

onSessionEnd(() => { exportService.reset(); demoApi?.reset(); });
