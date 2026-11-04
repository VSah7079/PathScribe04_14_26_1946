// src/services/digitalPathology/slideImageOpen.ts
// Batch 750: opening a slide in the laboratory's own digital pathology application. Needs case:slide-image:open (checked
// here, before any address is built); the address comes from the configured template (slideImages.ts); the opening is
// audited with who, which slide and when, and no patient name (the detail is literal English, as audit text is).
// The window itself is opened by the caller (it must stay inside the click), between prepare and record.
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { effectiveAddresses, fillTemplate, type SlideImageSettings } from './slideImages';

export type PrepareSlideImageOpen = { ok: true; url: string } | { ok: false; reason: 'notPermitted' | 'noAddress' };

export async function prepareSlideImageOpen(
  input: { slideDisplayId: string; accession: string; caseId: string; facilityId?: string; settings?: SlideImageSettings; listedViewerTemplate?: string },
  deps: { authorization: Pick<IAuthorizationService, 'enforce'>; deploymentDefaults?: Parameters<typeof effectiveAddresses>[2] },
): Promise<PrepareSlideImageOpen> {
  const decision = await deps.authorization.enforce('case:slide-image:open', { caseId: input.caseId, facilityId: input.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const addresses = effectiveAddresses(input.settings, input.facilityId, deps.deploymentDefaults, input.listedViewerTemplate);
  const url = fillTemplate(addresses.viewerUrlTemplate, { slideId: input.slideDisplayId, accession: input.accession });
  return url ? { ok: true, url } : { ok: false, reason: 'noAddress' };
}

/** Records the opening. Best effort: a failed audit write is reported to the console, the window stays open. */
export function recordSlideImageOpened(
  input: { slideDisplayId: string; caseId: string; user: string; host: string },
  deps: { audit: { logEvent(entry: NewAuditLog): Promise<unknown> } },
): void {
  void deps.audit.logEvent({
    type: 'user', event: 'Slide Image Opened',
    detail: `Opened slide ${input.slideDisplayId} in the laboratory's digital pathology application (${input.host}).`,
    user: input.user, caseId: input.caseId, confidence: null,
  }).catch(err => console.error('[slideImages] could not audit the opening:', err));
}

/** The host only, for the audit line. */
export function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return ''; }
}
