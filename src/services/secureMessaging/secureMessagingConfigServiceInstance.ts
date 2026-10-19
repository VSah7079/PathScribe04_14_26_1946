// src/services/secureMessaging/secureMessagingConfigServiceInstance.ts
// Batch 616: the app's secure messaging settings service, exported from `@/services` as `secureMessagingConfigService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSecureMessagingConfigService } from './httpSecureMessagingConfigService';
import { mockSecureMessagingConfigService } from './mockSecureMessagingConfigService';
import type { ISecureMessagingConfigService } from './ISecureMessagingConfigService';

export const secureMessagingConfigService: ISecureMessagingConfigService = chooseService<ISecureMessagingConfigService>('secure-messaging', mockSecureMessagingConfigService, createHttpSecureMessagingConfigService);
