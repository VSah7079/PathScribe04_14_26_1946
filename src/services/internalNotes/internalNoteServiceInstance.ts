// src/services/internalNotes/internalNoteServiceInstance.ts
// Batch 617 (PS-514): the app's internalNote service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpInternalNoteService } from './httpInternalNoteService';
import { mockInternalNoteService } from './mockInternalNoteService';
import type { IInternalNoteService } from './IInternalNoteService';

export const internalNoteService: IInternalNoteService = chooseService<IInternalNoteService>('internalNotes', mockInternalNoteService, createHttpInternalNoteService);
