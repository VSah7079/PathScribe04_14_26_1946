// src/services/lockbox/lockboxDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 648: the demo's Lockbox Drop-Off cases, so the screen can be shown without first scanning something in. Pure: the
// clock comes in as a parameter, so the times are always "last night and this morning" whenever the demo is started or
// reset. The mock store (mockLockboxService.ts) writes them the first time it is read; Demo Reset removes the stored keys
// (they sit under the mock storage prefix), so the next read builds a fresh set at the new time. Nothing here is a real
// specimen, and no patient name, date of birth or MRN is in it: matched receipts carry only the order's number.
//
//   Barcode            What it shows
//   FGH-ORD-88301      matched order, routine                       (in the Overnight folder)
//   SCUH-ORD-22014     matched order, URGENT with a callback number (first in the folder)
//   WSSC-ORD-71042     matched order, already accessioned           (not in the folder; feeds the QA time figures)
//   LBXDEMO-0001       placeholder, URGENT (intraoperative), client and physician picked from the lists
//   LBXDEMO-0002       placeholder, routine, client typed in, the longest-waiting specimen
//   LBXDEMO-0003       placeholder already linked to its real order FGH-ORD-88322 (ready to mark accessioned)
//
// Left unreceived on purpose, so a presenter can scan them live: WSSC-ORD-71058 and WSSC-ORD-71075 (matched orders), and
// any other barcode (a new placeholder).
// ─────────────────────────────────────────────────────────────────────────────
import { nextPlaceholderId } from './lockboxRules';
import type { LockboxActor, LockboxReceipt, LockboxResolution } from './lockboxTypes';

export const LOCKBOX_DEMO_KIOSK: LockboxActor = { userId: 'demo-lockbox-kiosk', userName: 'After-hours kiosk (demo)' };
export const LOCKBOX_DEMO_ACCESSIONER: LockboxActor = { userId: 'demo-accessioner', userName: 'Morning accessioner (demo)' };

/** The barcodes a presenter can scan live: pending orders that the seed leaves without a receipt. */
export const LOCKBOX_DEMO_LIVE_BARCODES: readonly string[] = ['WSSC-ORD-71058', 'WSSC-ORD-71075'];

export interface LockboxDemoSeed { receipts: LockboxReceipt[]; resolutions: LockboxResolution[] }

const HOUR_MS = 60 * 60 * 1000;

/** The seed cases, with every time counted back from `now`. */
export function buildLockboxDemoSeed(now: Date): LockboxDemoSeed {
  const ago = (hours: number): string => new Date(now.getTime() - hours * HOUR_MS).toISOString();
  const receipts: LockboxReceipt[] = [];
  const add = (r: Omit<LockboxReceipt, 'receivedBy'>): LockboxReceipt => {
    const full: LockboxReceipt = { ...r, receivedBy: LOCKBOX_DEMO_KIOSK };
    receipts.push(full);
    return full;
  };
  const placeholderId = (receivedAt: string): string => nextPlaceholderId(receipts.map(r => r.placeholderId), receivedAt);

  // Oldest first, so the placeholder numbers run in the order they were dropped.
  add({ id: 'lbx-demo-02', barcode: 'LBXDEMO-0002', state: 'placeholder', receivedAt: ago(13), urgent: false,
    placeholderId: placeholderId(ago(13)), clientFreeText: "Dr. Okafor's rooms (not in the client list)" });
  const accessioned = add({ id: 'lbx-demo-07', barcode: 'WSSC-ORD-71042', state: 'matchedOrder', receivedAt: ago(11), urgent: false,
    orderId: 'ord-007', accessionNumber: 'WSSC-ORD-71042' });
  const linked = add({ id: 'lbx-demo-03', barcode: 'LBXDEMO-0003', state: 'placeholder', receivedAt: ago(10), urgent: false,
    placeholderId: placeholderId(ago(10)), facilityId: 'c4', facilityName: 'Westview Surgery Center' });
  add({ id: 'lbx-demo-04', barcode: 'FGH-ORD-88301', state: 'matchedOrder', receivedAt: ago(9), urgent: false,
    orderId: 'ord-004', accessionNumber: 'FGH-ORD-88301' });
  add({ id: 'lbx-demo-05', barcode: 'SCUH-ORD-22014', state: 'matchedOrder', receivedAt: ago(6), urgent: true, callbackNumber: '555-0142',
    orderId: 'ord-005', accessionNumber: 'SCUH-ORD-22014' });
  add({ id: 'lbx-demo-01', barcode: 'LBXDEMO-0001', state: 'placeholder', receivedAt: ago(4), urgent: true, callbackNumber: '555-0177',
    placeholderId: placeholderId(ago(4)), reportedDropAt: ago(4.25), facilityId: 'c1', facilityName: 'Metro General Hospital',
    physicianId: 'ph3', physicianName: 'Michael Brown' });

  const resolutions: LockboxResolution[] = [
    { id: 'lbx-demo-res-1', receiptId: linked.id, kind: 'placeholderResolved', at: ago(2), by: LOCKBOX_DEMO_ACCESSIONER,
      accessionNumber: 'FGH-ORD-88322', orderId: 'ord-006' },
    { id: 'lbx-demo-res-2', receiptId: accessioned.id, kind: 'accessioned', at: ago(8.5), by: LOCKBOX_DEMO_ACCESSIONER, accessionNumber: 'WSSC-ORD-71042' },
  ];
  return { receipts, resolutions };
}
