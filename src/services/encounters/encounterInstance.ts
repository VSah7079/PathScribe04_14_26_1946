// src/services/encounters/encounterInstance.ts
// Batch 616 (PS-503): the app's encounter service (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpEncounterService } from './httpEncounterService';
import { mockEncounterService } from './mockEncounterService';
import type { IEncounterService } from './IEncounterService';

export const encounterService: IEncounterService = chooseService<IEncounterService>('encounters', mockEncounterService, createHttpEncounterService);
