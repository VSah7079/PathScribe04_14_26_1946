// src/services/cytology/screeningDayStartSaveDeps.ts — Batch 574: the real services saveScreeningDayStart uses.
import type { ScreeningDayStartSaveDeps } from './saveScreeningDayStart';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { cytologyWorkloadCapSettingsService } from './cytologyWorkloadCapSettingsServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export const screeningDayStartSaveDeps: ScreeningDayStartSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as never, context as never),
  get: () => cytologyWorkloadCapSettingsService.get(),
  update: patch => cytologyWorkloadCapSettingsService.update(patch),
  logAudit: event => auditService.logEvent(event as never),
};
