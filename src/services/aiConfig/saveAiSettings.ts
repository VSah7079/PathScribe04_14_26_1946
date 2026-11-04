// src/services/aiConfig/saveAiSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: saving the lab's AI service and default reporting mode needs
// config:ai-provider:manage, checked here (the screens used to write the
// settings straight to storage, guarded only by an "is admin" screen check).
// A person's own provider override (dev and testing) is theirs and isn't
// checked.
// ─────────────────────────────────────────────────────────────────────────────

import { setOrgAiConfig, type OrgAiConfig } from '../../components/Config/AI/aiProviderConfig';
import { setOrgOrchestratorDefault } from '../../components/Config/AI/orchestratorModeConfig';
import { permitConfigChange } from '../authorization/guardConfigWrites';

const authz = async () => (await import('../authorization/defaultAuthorizationService')).authorizationService;

/** Saves the lab's AI service. False when refused (nothing saved). */
export async function saveOrgAiProvider(config: OrgAiConfig): Promise<boolean> {
  if (!(await permitConfigChange((await authz()).enforce('config:ai-provider:manage'), 'config:ai-provider:manage'))) return false;
  setOrgAiConfig(config);
  return true;
}

/** Saves the lab's default reporting mode (Orchestration on or off). False when refused. */
export async function saveOrgOrchestratorDefault(enabled: boolean): Promise<boolean> {
  if (!(await permitConfigChange((await authz()).enforce('config:ai-provider:manage'), 'config:ai-provider:manage'))) return false;
  setOrgOrchestratorDefault(enabled);
  return true;
}
