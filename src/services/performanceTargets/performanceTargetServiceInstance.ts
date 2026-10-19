// src/services/performanceTargets/performanceTargetServiceInstance.ts
// Batch 617 (PS-514): the app's performanceTarget service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPerformanceTargetService } from './httpPerformanceTargetService';
import { mockPerformanceTargetService } from './mockPerformanceTargetService';
import type { IPerformanceTargetService } from './IPerformanceTargetService';

export const performanceTargetService: IPerformanceTargetService = chooseService<IPerformanceTargetService>('performanceTargets', mockPerformanceTargetService, createHttpPerformanceTargetService);
