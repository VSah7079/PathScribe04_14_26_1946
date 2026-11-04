// src/services/apiServer/serviceSelection.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-481): how a service is chosen, mock or server, for a
// deployment. One rule for every service: with an API server address in the
// settings (VITE_API_BASE_URL, or config.json) the server version is used;
// without one (the demo) the mock is. The runtime-config rules already
// guarantee a demo build never has an address and a server build always does,
// so the choice can't drift from the build.
//
//   export const caseService = chooseService('cases', mockCaseService, c => createHttpCaseService(c));
//
// The server version is built once, when the service module loads, from the
// shared HTTP client (token, time-out, fixed error codes, no PHI in errors).
// ─────────────────────────────────────────────────────────────────────────────
import { getAccessToken } from '../auth/accessTokenSource';
import { apiServerUrl } from './apiServerUrl';
import { createApiHttpClient, selectByConfiguration, type ApiHttpClient } from './apiHttpClient';

/** True when this deployment has an API server (so services use the server versions). */
export const usesApiServer = (component = 'services'): boolean => apiServerUrl(component) !== null;

/** The shared client for an address; fetch is looked up at call time so tests can replace it. */
export const clientFor = (baseUrl: string): ApiHttpClient =>
  createApiHttpClient({ baseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken });

/** The mock when there is no API server address, otherwise the server version built on the shared client. */
export function chooseService<T>(component: string, mock: T, makeHttp: (client: ApiHttpClient) => T): T {
  return selectByConfiguration(apiServerUrl(component), mock, baseUrl => makeHttp(clientFor(baseUrl)));
}
