// src/services/cytology/screeningDayStartSaveDeps.ts — Batch 574: the real services saveScreeningDayStart uses.
import type { ScreeningDayStartSaveDeps } from './saveScreeningDayStart';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';
import { mockAuditService } from '../auditlog/mockAuditService';

export const screeningDayStartSaveDeps: ScreeningDayStartSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as never, context as never),
  get: () => mockCytologyWorkloadCapSettingsService.get(),
  update: patch => mockCytologyWorkloadCapSettingsService.update(patch),
  logAudit: event => mockAuditService.logEvent(event as never),
};
