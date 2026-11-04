// src/services/lockbox/lockboxService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: Lockbox Drop-Off's logic, built from its dependencies so tests need no module mocks (the app's wiring is
// mockLockboxService.ts; the API server does the same work behind httpLockboxService.ts).
//
//   lookupBarcode      lockbox:specimen:receive     what the barcode is (duplicate, pending order, unknown)
//   receiveSpecimen    lockbox:specimen:receive     write the immutable "Received in Lockbox" receipt
//   getFolder          lockbox:folder:review        the Overnight folder and the time-to-receipt summary
//   markAccessioned    lockbox:folder:review        append an "accessioned" entry
//   accessionReceiptForCase lockbox:folder:review   Batch 652: a case was accessioned from a receipt: link both ways and mark accessioned
//   resolvePlaceholder lockbox:placeholder:resolve  append the real accession/order number for a placeholder
//
// Each call checks its capability first and stops on a refusal. The time and the user come from the dependencies (the
// server clock and the signed-in user), never from the input. A receipt is never edited: a resolution is a new entry.
// Audit text is literal English and carries the receipt id and fixed words only: no patient name, and not the barcode.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { ILockboxService } from './ILockboxService';
import type { LockboxActor, LockboxReceipt, LockboxResolution } from './lockboxTypes';
import {
  accessionRefusal, buildFolder, buildReceipt, findReceiptByBarcode, findReceiptForCase, matchPendingOrder, nextPlaceholderId, normalizeBarcode,
  normalizeCallbackNumber, resolveLockboxLookup, resolveRefusal, validateReportedDropAt, type PendingOrderRef,
} from './lockboxRules';

export interface LockboxStore {
  receipts(): Promise<LockboxReceipt[]>;
  resolutions(): Promise<LockboxResolution[]>;
  /** Append only: there is no update or delete. */
  appendReceipt(r: LockboxReceipt): Promise<void>;
  appendResolution(r: LockboxResolution): Promise<void>;
}

export interface LockboxServiceDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  store: LockboxStore;
  /** The pending LIS or imported orders. Only what the match needs is read from them. */
  pendingOrders: () => Promise<PendingOrderRef[]>;
  /** The ordering client's name from the dictionary, for display on the receipt. */
  facilityName: (facilityId: string) => Promise<string | undefined>;
  physicianName: (physicianId: string) => Promise<string | undefined>;
  /** The server's clock and the signed-in user. */
  now: () => Date;
  actor: () => LockboxActor;
  newId: () => string;
  /** Batch 652: write the receipt id on the case (Case.lockboxReceiptId). False when the case cannot be found or written. Optional: the API server does both writes itself. */
  linkCase?: (caseId: string, receiptId: string) => Promise<boolean>;
  audit: (entry: { event: string; detail: string; caseId: string | null; facilityId: string | null; user: string }) => Promise<unknown>;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const refuse = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

export function createLockboxService(deps: LockboxServiceDeps): ILockboxService {
  const logAudit = (event: string, detail: string, caseId: string | null, facilityId: string | null) =>
    deps.audit({ event, detail, caseId, facilityId, user: deps.actor().userName });

  async function facilityNames(orders: PendingOrderRef[]): Promise<Map<string, string | undefined>> {
    const out = new Map<string, string | undefined>();
    for (const id of new Set(orders.map(o => o.facilityId).filter((x): x is string => !!x))) out.set(id, await deps.facilityName(id));
    return out;
  }

  return {
    async lookupBarcode(barcodeRaw) {
      if (!(await deps.authorization.enforce('lockbox:specimen:receive')).allowed) return refuse('NOT_PERMITTED');
      const barcode = normalizeBarcode(barcodeRaw);
      if (!barcode) return refuse('INVALID');
      const [receipts, orders] = await Promise.all([deps.store.receipts(), deps.pendingOrders()]);
      const names = await facilityNames(orders);
      return ok(resolveLockboxLookup(barcode, orders, receipts, id => (id ? names.get(id) : undefined)));
    },

    async receiveSpecimen(input) {
      if (!(await deps.authorization.enforce('lockbox:specimen:receive')).allowed) return refuse('NOT_PERMITTED');
      const barcode = normalizeBarcode(input.barcode);
      if (!barcode) return refuse('INVALID');
      const callback = input.urgent ? normalizeCallbackNumber(input.callbackNumber) : undefined;
      if (callback === null) return refuse('INVALID');
      const now = deps.now();
      const reportedDropAt = validateReportedDropAt(input.placeholder?.reportedDropAt, now);
      if (reportedDropAt === null) return refuse('INVALID');

      const [receipts, orders] = await Promise.all([deps.store.receipts(), deps.pendingOrders()]);
      if (findReceiptByBarcode(barcode, receipts)) return refuse('CONFLICT');
      const order = matchPendingOrder(barcode, orders);
      const p = input.placeholder;
      const receipt = buildReceipt({
        id: deps.newId(), barcode, nowIso: now.toISOString(), actor: deps.actor(), urgent: !!input.urgent, callbackNumber: callback,
        match: order ? { orderId: order.id, accessionNumber: order.externalOrderNumber, facilityId: order.facilityId, facilityName: order.facilityId ? await deps.facilityName(order.facilityId) : undefined } : undefined,
        placeholderId: order ? undefined : nextPlaceholderId(receipts.map(r => r.placeholderId), now.toISOString()),
        placeholder: order || !p ? undefined : {
          ...p, reportedDropAt,
          facilityName: p.facilityId ? await deps.facilityName(p.facilityId) : undefined,
          physicianName: p.physicianId ? await deps.physicianName(p.physicianId) : undefined,
        },
      });
      await deps.store.appendReceipt(receipt);
      await logAudit('Lockbox specimen received',
        `Received in lockbox, ${receipt.state === 'matchedOrder' ? 'matched to a pending order' : `placeholder ${receipt.placeholderId}`}${receipt.urgent ? ', urgent' : ''}. Receipt ${receipt.id}.`,
        receipt.accessionNumber ?? null, receipt.facilityId ?? null);
      return ok(receipt);
    },

    async getFolder() {
      if (!(await deps.authorization.enforce('lockbox:folder:review')).allowed) return refuse('NOT_PERMITTED');
      const [receipts, resolutions] = await Promise.all([deps.store.receipts(), deps.store.resolutions()]);
      return ok(buildFolder(receipts, resolutions, deps.now().toISOString()));
    },

    async markAccessioned(receiptId) {
      if (!(await deps.authorization.enforce('lockbox:folder:review')).allowed) return refuse('NOT_PERMITTED');
      const [receipts, resolutions] = await Promise.all([deps.store.receipts(), deps.store.resolutions()]);
      const receipt = receipts.find(r => r.id === receiptId);
      const refusal = accessionRefusal(receipt, resolutions);
      if (refusal) return refuse(refusal);
      const linked = resolutions.filter(r => r.receiptId === receiptId && r.kind === 'placeholderResolved').sort((a, b) => b.at.localeCompare(a.at))[0];
      const entry: LockboxResolution = {
        id: deps.newId(), receiptId, kind: 'accessioned', at: deps.now().toISOString(), by: deps.actor(),
        accessionNumber: receipt!.accessionNumber ?? linked?.accessionNumber,
      };
      await deps.store.appendResolution(entry);
      await logAudit('Lockbox specimen accessioned', `Marked accessioned from the Overnight folder. Receipt ${receiptId}.`, entry.accessionNumber ?? null, receipt!.facilityId ?? null);
      return ok(entry);
    },

    async accessionReceiptForCase(input) {
      if (!(await deps.authorization.enforce('lockbox:folder:review')).allowed) return refuse('NOT_PERMITTED');
      if (!input.caseId) return refuse('INVALID');
      const [receipts, resolutions] = await Promise.all([deps.store.receipts(), deps.store.resolutions()]);
      const receipt = findReceiptForCase(receipts, resolutions, input);
      if (!receipt) return input.receiptId ? refuse('NOT_FOUND') : ok(null);
      // The case first: if that write fails nothing was recorded, and the receipt stays open for the manual button.
      if (deps.linkCase && !(await deps.linkCase(input.caseId, receipt.id))) return refuse('NOT_FOUND');
      const linked = resolutions.filter(r => r.receiptId === receipt.id && r.kind === 'placeholderResolved').sort((a, b) => b.at.localeCompare(a.at))[0];
      const entry: LockboxResolution = {
        id: deps.newId(), receiptId: receipt.id, kind: 'accessioned', at: deps.now().toISOString(), by: deps.actor(),
        accessionNumber: receipt.accessionNumber ?? linked?.accessionNumber, caseId: input.caseId,
      };
      await deps.store.appendResolution(entry);
      await logAudit('Lockbox receipt linked to case', `Case created from the lockbox receipt and receipt marked accessioned. Receipt ${receipt.id}, case ${input.caseId}.`, input.caseId, receipt.facilityId ?? null);
      return ok(entry);
    },

    async resolvePlaceholder(receiptId, accessionNumberRaw) {
      if (!(await deps.authorization.enforce('lockbox:placeholder:resolve')).allowed) return refuse('NOT_PERMITTED');
      const accessionNumber = normalizeBarcode(accessionNumberRaw);
      if (!accessionNumber) return refuse('INVALID');
      const [receipts, resolutions, orders] = await Promise.all([deps.store.receipts(), deps.store.resolutions(), deps.pendingOrders()]);
      const receipt = receipts.find(r => r.id === receiptId);
      const refusal = resolveRefusal(receipt, resolutions);
      if (refusal) return refuse(refusal);
      const order = matchPendingOrder(accessionNumber, orders);
      const entry: LockboxResolution = {
        id: deps.newId(), receiptId, kind: 'placeholderResolved', at: deps.now().toISOString(), by: deps.actor(),
        accessionNumber: order ? order.externalOrderNumber : accessionNumber, ...(order ? { orderId: order.id } : {}),
      };
      await deps.store.appendResolution(entry);
      await logAudit('Lockbox placeholder resolved', `Placeholder ${receipt!.placeholderId} linked to ${order ? 'a pending order' : 'an accession number'}. Receipt ${receiptId}.`, entry.accessionNumber ?? null, receipt!.facilityId ?? null);
      return ok(entry);
    },
  };
}
