// src/services/clinical/mockAiInstructionService.ts
// Batch 536 (PS-554): the browser's governed AI instructions service. The
// versions are configuration, kept through mockStorage until the API server
// holds them.
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { notifyConfigRefused } from '../authorization/guardConfigWrites';
import { isAiNotAvailable } from '../aiIntegration/aiCallPolicy';
import type { AiInstructionVersion } from './aiInstructions';
import { AI_INSTRUCTIONS_STORAGE_KEY, createAiInstructionService } from './aiInstructionService';

export const mockAiInstructionService = createAiInstructionService({
  read: () => storageGet<AiInstructionVersion[] | null>(AI_INSTRUCTIONS_STORAGE_KEY, null),
  write: versions => storageSet(AI_INSTRUCTIONS_STORAGE_KEY, versions),
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability);
  },
  audit: entry => mockAuditService.logEvent(entry),
  actor: () => { const p = readSessionProfile(); return { userId: p?.id ?? 'unknown', userName: p?.name || p?.id || 'unknown' }; },
  now: () => new Date(),
  newId: () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  runCheck: async (input, instructions) => {
    const { askAiForMismatch } = await import('./detectClinicalPathologicMismatch');
    return askAiForMismatch(input, instructions, { feature: 'ai-instruction-test' });
  },
  notAllowed: isAiNotAvailable,
  refused: notifyConfigRefused,
});
