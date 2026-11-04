// src/services/participationTypes/participationTypeServiceInstance.ts
// Batch 617 (PS-514): the app's participationType service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpParticipationTypeService } from './httpParticipationTypeService';
import { mockParticipationTypeService } from './mockParticipationTypeService';
import type { IParticipationTypeService } from './IParticipationTypeService';

export const participationTypeService: IParticipationTypeService = chooseService<IParticipationTypeService>('participationTypes', mockParticipationTypeService, createHttpParticipationTypeService);
