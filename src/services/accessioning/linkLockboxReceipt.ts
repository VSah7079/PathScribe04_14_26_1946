// src/services/accessioning/linkLockboxReceipt.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: nothing used to tie a Lockbox receipt to the case made from it, and "Mark accessioned" in the Overnight
// folder was the only way to close a receipt. The Accession screen takes the lockbox container's barcode through its
// scan box, which imports the pending order that carries it; once the case is saved it calls this with the case and the
// order. The lockbox service then finds the open receipt, writes the case on the receipt's "accessioned" entry and the
// receipt on the case, and marks it accessioned, in one call (ILockboxService.accessionReceiptForCase). The manual
// button stays for anything that did not come through here.
//
// Accessioning never waits on this and is never undone by it: a refusal (the person lacks lockbox:folder:review) or a
// failure is returned for the screen to mention, not thrown. An ordinary case, with no receipt, is outcome 'noReceipt'.
// ─────────────────────────────────────────────────────────────────────────────
import type { ILockboxService } from '../lockbox/ILockboxService';
import type { LockboxCaseLinkInput } from '../lockbox/lockboxTypes';

export type LockboxLinkOutcome = 'linked' | 'noReceipt' | 'notPermitted' | 'failed';

export async function linkLockboxReceiptAtAccession(
  input: LockboxCaseLinkInput,
  lockbox?: Pick<ILockboxService, 'accessionReceiptForCase'>,
): Promise<LockboxLinkOutcome> {
  try {
    const svc = lockbox ?? (await import('../lockbox/lockboxServiceInstance')).lockboxService;
    const r = await svc.accessionReceiptForCase(input);
    if (r.ok === true) return r.data ? 'linked' : 'noReceipt';
    return r.error === 'NOT_PERMITTED' ? 'notPermitted' : 'failed';
  } catch {
    return 'failed';
  }
}
