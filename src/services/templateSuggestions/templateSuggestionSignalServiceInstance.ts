// src/services/templateSuggestions/templateSuggestionSignalServiceInstance.ts
// Batch 616: the app's template suggestion signals service, exported from `@/services` as `templateSuggestionSignalService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTemplateSuggestionSignalService } from './httpTemplateSuggestionSignalService';
import { mockTemplateSuggestionSignalService } from './mockTemplateSuggestionSignalService';
import type { ITemplateSuggestionSignalService } from './ITemplateSuggestionSignalService';

export const templateSuggestionSignalService: ITemplateSuggestionSignalService = chooseService<ITemplateSuggestionSignalService>('template-suggestions', mockTemplateSuggestionSignalService, createHttpTemplateSuggestionSignalService);
