// src/services/cytology/pathologyLexiconServiceInstance.ts
// Batch 617 (PS-514): the app's pathologyLexiconService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPathologyLexiconService } from './httpPathologyLexiconService';
import { mockPathologyLexiconService } from './mockPathologyLexiconService';
import type { IPathologyLexiconService } from './IPathologyLexiconService';

export const pathologyLexiconService: IPathologyLexiconService = chooseService<IPathologyLexiconService>('cytology', mockPathologyLexiconService, createHttpPathologyLexiconService);
