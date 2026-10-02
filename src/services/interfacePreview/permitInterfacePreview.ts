// src/services/interfacePreview/permitInterfacePreview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the outbound message and DFT previews (Configuration → System)
// build a real patient's or case's message from an identifier typed in, so
// they show patient data. Each preview needs config:interface-preview:view,
// checked (and audited) here before anything is looked up.
// ─────────────────────────────────────────────────────────────────────────────

import { permitConfigChange } from '../authorization/guardConfigWrites';

export async function permitInterfacePreview(): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  return permitConfigChange(authorizationService.enforce('config:interface-preview:view'), 'config:interface-preview:view');
}
