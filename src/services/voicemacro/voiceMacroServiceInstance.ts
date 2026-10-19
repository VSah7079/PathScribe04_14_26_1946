// src/services/voicemacro/voiceMacroServiceInstance.ts
// Batch 616: the app's voice macros service, exported from `@/services` as `voiceMacroService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpVoiceMacroService } from './httpVoiceMacroService';
import { mockVoiceMacroService } from './mockVoiceMacroService';
import type { IVoiceMacroService } from './IVoiceMacroService';

export const voiceMacroService: IVoiceMacroService = chooseService<IVoiceMacroService>('voice-macros', mockVoiceMacroService, createHttpVoiceMacroService);
