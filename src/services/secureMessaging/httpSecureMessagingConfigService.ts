// src/services/secureMessaging/httpSecureMessagingConfigService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of ISecureMessagingConfigService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/FLAGS_AND_MESSAGES_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ISecureMessagingConfigService } from './ISecureMessagingConfigService';

type Args<K extends keyof ISecureMessagingConfigService> = Parameters<ISecureMessagingConfigService[K]>;
const BASE = '/api/secure-messaging/secure-messaging-config';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpSecureMessagingConfigService = (client: ApiHttpClient): ISecureMessagingConfigService =>
  buildHttpService<ISecureMessagingConfigService>(client, {
    getForFacility: result('GET', (facilityId: Args<'getForFacility'>[0]) => `${route('getForFacility')}${queryString({ facilityId })}`),
    forOrganisation: result('GET', (organisationId: Args<'forOrganisation'>[0]) => `${route('forOrganisation')}${queryString({ organisationId })}`),
    save: result('POST', () => route('save'), { body: (config: object, _actor?: unknown) => config }),
  });
