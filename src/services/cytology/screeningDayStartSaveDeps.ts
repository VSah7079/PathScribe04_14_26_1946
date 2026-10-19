// src/services/cytology/screeningDayStartSaveDeps.ts — Batch 574: the real services saveScreeningDayStart uses.
import type { ScreeningDayStartSaveDeps } from './saveScreeningDayStart';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { cytologyWorkloadCapSettingsService } from './cytologyWorkloadCapSettingsServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';

export const screeningDayStartSaveDeps: ScreeningDayStartSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as never, context as never),
  get: () => cytologyWorkloadCapSettingsService.get(),
  update: patch => cytologyWorkloadCapSettingsService.update(patch),
  logAudit: event => mockAuditService.logEvent(event as never),
};
