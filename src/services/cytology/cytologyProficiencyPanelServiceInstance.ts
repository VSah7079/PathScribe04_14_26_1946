// src/services/cytology/cytologyProficiencyPanelServiceInstance.ts
// Batch 617 (PS-514): the app's cytologyProficiencyPanelService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyProficiencyPanelService } from './httpCytologyProficiencyPanelService';
import { mockCytologyProficiencyPanelService } from './mockCytologyProficiencyPanelService';
import type { ICytologyProficiencyPanelService } from './mockCytologyProficiencyPanelService';

export const cytologyProficiencyPanelService: ICytologyProficiencyPanelService = chooseService<ICytologyProficiencyPanelService>('cytology', mockCytologyProficiencyPanelService, createHttpCytologyProficiencyPanelService);
