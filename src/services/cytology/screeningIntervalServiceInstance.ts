// src/services/cytology/screeningIntervalServiceInstance.ts
// Batch 616 (PS-499): the app's screeningInterval service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpScreeningIntervalService } from './httpScreeningIntervalService';
import { mockScreeningIntervalService } from './mockScreeningIntervalService';
import type { IScreeningIntervalService } from './IScreeningIntervalService';

export const screeningIntervalService: IScreeningIntervalService = chooseService<IScreeningIntervalService>('cytology', mockScreeningIntervalService, createHttpScreeningIntervalService);
