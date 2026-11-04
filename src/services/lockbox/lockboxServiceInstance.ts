// src/services/lockbox/lockboxServiceInstance.ts
// Batch 645: the app's Lockbox Drop-Off service, exported from `@/services` as `lockboxService`. The mock in the demo; the
// API server's version when a server address is configured (docs/architecture/LOCKBOX_API.md, HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLockboxService } from './httpLockboxService';
import { mockLockboxService } from './mockLockboxService';
import type { ILockboxService } from './ILockboxService';

export const lockboxService: ILockboxService = chooseService<ILockboxService>('lockbox', mockLockboxService, createHttpLockboxService);
