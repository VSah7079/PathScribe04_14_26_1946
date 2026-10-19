// src/services/followUp/followUpServiceInstance.ts
// Batch 616 (PS-483): follow-up tracking as the app uses it. Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFollowUpService } from './httpFollowUpService';
import { mockFollowUpService } from './mockFollowUpService';
import type { IFollowUpService } from './IFollowUpService';

export const followUpService: IFollowUpService = chooseService<IFollowUpService>('followUp', mockFollowUpService, createHttpFollowUpService);
