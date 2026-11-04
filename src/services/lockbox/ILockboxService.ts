// src/services/lockbox/ILockboxService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: Lockbox Drop-Off. The same interface + mock + server version split as every service
// (mockLockboxService / httpLockboxService, chosen in lockboxServiceInstance). Calls: docs/architecture/LOCKBOX_API.md.
//
// Every method checks its capability itself (authorizationService.enforce), writes an audit entry with no patient data, and
// answers with a fixed refusal code (LockboxRefusal) rather than text. The server stamps the time and the user from the
// token; neither is a parameter here, and a version of either sent in a body is ignored. Receipts are append-only.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { LockboxCaseLinkInput, LockboxFolder, LockboxLookup, LockboxReceipt, LockboxReceiveInput, LockboxResolution } from './lockboxTypes';

export interface ILockboxService {
  /**
   * What a scanned container barcode is right now (lockbox:specimen:receive): already received (the earlier receipt), a
   * pending order (its accession number and ordering facility only, never a patient field), or unknown.
   */
  lookupBarcode(barcode: string): Promise<ServiceResult<LockboxLookup>>;

  /**
   * Write the receipt (lockbox:specimen:receive). The server decides the state from the barcode; placeholder details are
   * used only when no order matches. A barcode that already has a receipt is refused with CONFLICT (409): call
   * lookupBarcode for the earlier receipt. No duplicate is ever written.
   */
  receiveSpecimen(input: LockboxReceiveInput): Promise<ServiceResult<LockboxReceipt>>;

  /** The Overnight folder (lockbox:folder:review): receipts not yet accessioned, urgent first then oldest first, with the QA summary. */
  getFolder(): Promise<ServiceResult<LockboxFolder>>;

  /** Add an "accessioned" entry (lockbox:folder:review). A placeholder must have been linked first (PLACEHOLDER_UNRESOLVED). */
  markAccessioned(receiptId: string): Promise<ServiceResult<LockboxResolution>>;

  /**
   * Batch 652: a case was accessioned from a receipt (lockbox:folder:review). Finds the open receipt (by receipt id, order or
   * accession number), records the case on the receipt's "accessioned" entry AND the receipt on the case
   * (Case.lockboxReceiptId), in this one call. Answers `null` when no open receipt belongs to the case (an ordinary case);
   * NOT_FOUND for an explicit receiptId that is not open or a case that cannot be found. The manual markAccessioned stays.
   */
  accessionReceiptForCase(input: LockboxCaseLinkInput): Promise<ServiceResult<LockboxResolution | null>>;

  /** Attach the real order or accession number to a placeholder as a new entry (lockbox:placeholder:resolve). The receipt itself is not edited. */
  resolvePlaceholder(receiptId: string, accessionNumber: string): Promise<ServiceResult<LockboxResolution>>;
}
