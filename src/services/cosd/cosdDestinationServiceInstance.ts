// src/services/cosd/cosdDestinationServiceInstance.ts
// Batch 620 (part C, PS-800): the app's UK cancer registry destinations, exported from `@/services` as `cosdDestinationService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCosdDestinationService } from './httpCosdDestinationService';
import { mockCosdDestinationService } from './mockCosdDestinationService';
import type { ICosdDestinationService } from './ICosdDestinationService';

export const cosdDestinationService: ICosdDestinationService = chooseService<ICosdDestinationService>('cosdDestination', mockCosdDestinationService, createHttpCosdDestinationService);
