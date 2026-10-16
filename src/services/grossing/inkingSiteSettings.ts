// src/services/grossing/inkingSiteSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 (Structured Inking, Module 1; PS-359 follow-up, Pete's own
// "Add a site configuration setting: inking_validation_mode". Default
// WARN_ONLY — Pete's own stated default ("system defaults should be 'Warn &
// Advisory' ... for almost all rules"); a site opts INTO STRICT_ENFORCE,
// never the reverse.
//
// Structured Inking, Module 3 (PS-359 follow-up) — RE-SCOPED FROM SITE TO
// FACILITY. Batch 480/481 kept this keyed by a real Site.id, deliberately
// ahead of the still-unbuilt Organisation/Site admin UI. By Batch 481 that
// became a real, confirmed architecture gap: no case ever resolves a real
// siteId — Case only carries `order?.facilityId` (the real, current
// ordering-facility link already used throughout this app, e.g.
// GrossingScreenPage.tsx's own `case:grossing:complete` capability check)
// plus a legacy `originSiteId` that, per its own doc comment, actually
// holds a Facility id today, not a working Site id. Pete's own choice, via
// AskUserQuestion, when asked how to unblock the severity engine's
// WARN_ONLY/STRICT_ENFORCE advisory display this batch needed: re-scope
// this setting to facilityId now, rather than defer the display again
// until the Organisation/Site admin UI exists. Mirrors the one real,
// working facility-scoped precedent already in this app —
// services/organMapping/organMapConfig.ts's OrganMapSchemeScope
// ({ kind: 'facility', facilityId }) — rather than inventing a new shape.
//
// Thin, capability-checked wrapper over services/siteSettings/siteSettingsStore.ts
// (the generic per-scope store — its own functions are keyed by whatever id
// string is passed in; nothing about them is Site-specific despite the
// file's name, so re-keying this one caller by facilityId instead of
// siteId needed no change there). Reading is unrestricted (same posture as
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
import { mockAuditService } from '../auditlog/mockAuditService';
import type { InkingValidationMode } from './resolveInkingValidationSeverity';

const INKING_VALIDATION_MODE_KEY = 'inkingValidationMode';
const DEFAULT_MODE: InkingValidationMode = 'WARN_ONLY';

/** `facilityId` is `Case.order?.facilityId` — the real, current ordering
 *  facility link (see this file's own header for why this is facilityId,
 *  not siteId, as of Structured Inking Module 3). */
export function getInkingValidationMode(facilityId: string): InkingValidationMode {
  return readSiteSetting<InkingValidationMode>(facilityId, INKING_VALIDATION_MODE_KEY, DEFAULT_MODE);
}

export interface SetInkingValidationModeResult {
  ok: boolean;
  notPermitted?: boolean;
}

/**
 * Batch 484: the first real UI caller (Config → System → Inking Validation
 * Mode) surfaced that this capability's own catalog description already
 * promises "Audited." — never actually wired. `actorName` is optional so
 * every other, pre-existing caller (there are none outside tests today)
 * keeps compiling unchanged; the real UI caller always supplies it.
 */
export async function setInkingValidationMode(facilityId: string, mode: InkingValidationMode, actorName?: string): Promise<SetInkingValidationModeResult> {
  const decision = await authorizationService.enforce('config:inking-validation-mode:manage', { facilityId });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  const previous = getInkingValidationMode(facilityId);
  saveSiteSetting(facilityId, INKING_VALIDATION_MODE_KEY, mode);
  if (previous !== mode) {
    await mockAuditService.logEvent({
      type: 'user', event: 'Inking validation mode changed', user: actorName ?? 'unknown', caseId: null, confidence: null,
      facilityId, detail: `Inking validation mode for facility ${facilityId} changed from ${previous} to ${mode}.`,
    });
  }
  return { ok: true };
}
