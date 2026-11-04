// src/services/deficiencies/specimenDeficiencyServiceInstance.ts
// Batch 616: the app's specimen deficiencies, exported from `@/services` as `specimenDeficiencyService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSpecimenDeficiencyService } from './httpSpecimenDeficiencyService';
import { mockSpecimenDeficiencyService } from './mockSpecimenDeficiencyService';
import type { ISpecimenDeficiencyService } from './IDeficiencyService';

export const specimenDeficiencyService: ISpecimenDeficiencyService = chooseService<ISpecimenDeficiencyService>('deficiencies', mockSpecimenDeficiencyService, createHttpSpecimenDeficiencyService);
