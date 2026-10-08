// src/services/grossing/inkingSiteSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 (Structured Inking, Module 1; PS-359 follow-up, Pete's own
// "Add a site configuration setting: inking_validation_mode". Default
// WARN_ONLY — Pete's own stated default ("system defaults should be 'Warn &
// Advisory' ... for almost all rules"); a site opts INTO STRICT_ENFORCE,
// never the reverse.
//
// Thin, capability-checked wrapper over services/siteSettings/siteSettingsStore.ts
// (the generic per-site store) — reading is unrestricted (same posture as
// every other settings reader in this app, e.g. readLabSetting's own
// callers), writing needs config:inking-validation-mode:manage. That
// capability is group: 'configSystem', high-risk, and — like its siblings
// config:report-appearance:manage / config:organ-map-scheme:manage — granted
// to Admin and Lab Director by default via CONFIG_SECTIONS
// (capabilitySeeds.ts), not "nobody by default" the way the QC-review-bypass
// / gross-exam-gate-override capabilities are.
// ─────────────────────────────────────────────────────────────────────────────

import { readSiteSetting, saveSiteSetting } from '@/services/siteSettings/siteSettingsStore';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { InkingValidationMode } from './resolveInkingValidationSeverity';

const INKING_VALIDATION_MODE_KEY = 'inkingValidationMode';
const DEFAULT_MODE: InkingValidationMode = 'WARN_ONLY';

export function getInkingValidationMode(siteId: string): InkingValidationMode {
  return readSiteSetting<InkingValidationMode>(siteId, INKING_VALIDATION_MODE_KEY, DEFAULT_MODE);
}

export interface SetInkingValidationModeResult {
  ok: boolean;
  notPermitted?: boolean;
}

export async function setInkingValidationMode(siteId: string, mode: InkingValidationMode): Promise<SetInkingValidationModeResult> {
  const decision = await authorizationService.enforce('config:inking-validation-mode:manage');
  if (!decision.allowed) return { ok: false, notPermitted: true };
  saveSiteSetting(siteId, INKING_VALIDATION_MODE_KEY, mode);
  return { ok: true };
}
