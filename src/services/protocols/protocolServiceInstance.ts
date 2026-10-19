// src/services/protocols/protocolServiceInstance.ts
// Batch 616: the app's processing protocols service, exported from `@/services` as `protocolService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpProtocolService } from './httpProtocolService';
import { mockProtocolService } from './mockProtocolService';
import type { IProtocolService } from './IProtocolService';

export const protocolService: IProtocolService = chooseService<IProtocolService>('protocols', mockProtocolService, createHttpProtocolService);
