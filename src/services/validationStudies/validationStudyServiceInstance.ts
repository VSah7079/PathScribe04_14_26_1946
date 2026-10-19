// src/services/validationStudies/validationStudyServiceInstance.ts
// Batch 616: the app's validation studies, exported from `@/services` as `validationStudyService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpValidationStudyService } from './httpValidationStudyService';
import { mockValidationStudyService } from './mockValidationStudyService';
import type { IValidationStudyService } from './IValidationStudyService';

export const validationStudyService: IValidationStudyService = chooseService<IValidationStudyService>('validation-studies', mockValidationStudyService, createHttpValidationStudyService);
