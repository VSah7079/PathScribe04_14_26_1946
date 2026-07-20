// src/components/Config/AI/orchestratorModeConfig.ts
// ─────────────────────────────────────────────────────────────
// Real source of truth for "is AI Orchestrator narrative auto-draft on."
//
// Replaces the old, disconnected pair that used to exist:
//   - narrativeTemplateConfig.orchestratorEnabled (a static `true` literal,
//     read directly by the old OrchestratorConfigSection display — never
//     actually toggleable)
//   - getOrchestratorMode() in the now-deleted Config/NarrativeTemplates/
//     index.tsx (read localStorage, but the ONLY code that ever wrote to
//     that key was the dead, unrouted NarrativeTemplatesTab component —
//     so in practice it always silently fell through to the same static
//     default above)
//
// Two layers, same "null/unset = inherit" convention already used for
// Client.tatFirstTouchHours / Client.jurisdiction / Client.pediatricAgeThreshold:
//   1. ORG DEFAULT   — org-wide, admin-editable here, persisted to
//      localStorage. Falls back to narrativeTemplateConfig.orchestratorEnabled
//      only if never explicitly set (fresh install).
//   2. PER-LAB OVERRIDE — Client.internalAiOrchestratorEnabled on the
//      internal client that actually performs the work (resolved via
//      resolvePerformingLabClientId(), same as every other lab-scoped
//      setting). Wins over the org default when set.
//
// Deliberately distinct from the Orchestration *case-routing* concept
// (O26-/S26- prefixes, CaseRouter.ts, Role.canViewOrchestration) — see
// Client.internalAiOrchestratorEnabled's own doc comment.
// ─────────────────────────────────────────────────────────────

import { narrativeTemplateConfig } from '../NarrativeTemplates/narrativeTemplateConfig';
import { clientService } from '../../../services';
import { resolvePerformingLabClientId } from '../../../services/clients/IClientService';

export const ORG_ORCHESTRATOR_MODE_KEY = 'pathscribe_orchestrator_mode';

// ── Org-level default (sync — safe to call from render) ────────────────────

export function getOrgOrchestratorDefault(): boolean {
  try {
    const stored = localStorage.getItem(ORG_ORCHESTRATOR_MODE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable (SSR / sandboxed env) — ignore
  }
  return narrativeTemplateConfig.orchestratorEnabled;
}

export function setOrgOrchestratorDefault(enabled: boolean): void {
  try {
    localStorage.setItem(ORG_ORCHESTRATOR_MODE_KEY, String(enabled));
  } catch {
    // ignore write failures
  }
}

// ── Effective, per-case resolution (async — needs a Client lookup) ─────────
//
// Pass the case's ordering client id (caseData?.order?.clientId). Resolves
// through to whichever internal client's lab actually performs the work,
// same as jurisdiction resolution in OrchestratorSectionEditor.tsx. Falls
// back to the org default whenever no client can be resolved (missing id,
// lookup failure, or no override set on the performing lab) — same
// fail-safe posture used everywhere else in this codebase, not a guess.
export async function resolveOrchestratorMode(orderingClientId?: string): Promise<boolean> {
  const orgDefault = getOrgOrchestratorDefault();
  if (!orderingClientId) return orgDefault;

  const orderingRes = await clientService.getById(orderingClientId);
  if (!orderingRes.ok) return orgDefault;

  const labId = resolvePerformingLabClientId(orderingRes.data);
  if (!labId) return orgDefault;

  // Ordering client IS the performing lab (common case) — reuse the lookup,
  // avoid a second fetch.
  if (labId === orderingClientId) {
    return orderingRes.data.internalAiOrchestratorEnabled ?? orgDefault;
  }
  const labRes = await clientService.getById(labId);
  if (!labRes.ok) return orgDefault;
  return labRes.data.internalAiOrchestratorEnabled ?? orgDefault;
}
