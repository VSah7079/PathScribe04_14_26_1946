// src/services/interfaceExceptions/interfaceExceptionServiceInstance.ts
// Batch 616: the app's interface exceptions (messages the interface could not file) service, exported from `@/services` as `interfaceExceptionService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpInterfaceExceptionService } from './httpInterfaceExceptionService';
import { mockInterfaceExceptionService } from './mockInterfaceExceptionService';
import type { IInterfaceExceptionService } from './IInterfaceExceptionService';

export const interfaceExceptionService: IInterfaceExceptionService = chooseService<IInterfaceExceptionService>('interface-exceptions', mockInterfaceExceptionService, createHttpInterfaceExceptionService);
