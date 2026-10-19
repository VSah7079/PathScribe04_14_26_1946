// src/services/interfaceEngine/interfaceEngineServiceInstance.ts
// Batch 616: the app's interface engine: order-created events service, exported from `@/services` as `interfaceEngineService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpInterfaceEngineService } from './httpInterfaceEngineService';
import { mockInterfaceEngineService } from './mockInterfaceEngineService';
import type { IInterfaceEngineService } from './IInterfaceEngineService';

export const interfaceEngineService: IInterfaceEngineService = chooseService<IInterfaceEngineService>('interface-engine', mockInterfaceEngineService, createHttpInterfaceEngineService);
