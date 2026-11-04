// src/services/lockbox/lockboxRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the decisions of Lockbox Drop-Off, pure (no storage, no clock of its own, no permissions): what a scanned
// barcode means, whether it was already received, how the Overnight folder is ordered, how long a specimen has waited and
// the drop-to-accessioned summary for QA. The service (lockboxService.ts) calls these; the screen only renders.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  LockboxActor, LockboxFolder, LockboxFolderEntry, LockboxFolderStatus, LockboxLookup, LockboxPlaceholderInput, LockboxReceipt,
  LockboxResolution, LockboxTimeSummary,
} from './lockboxTypes';

export const BARCODE_MAX_LENGTH = 64;
const CALLBACK_PATTERN = /^[0-9+()\-.#*xX ]{3,24}$/;
/** A drop time the person types may be this far ahead of the server clock (clock drift) and no further. */
export const DROP_TIME_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
/** ...and may be at most this long ago. */
export const DROP_TIME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * The barcode as stored and compared: scanner control characters (CR, LF, tab, GS), spaces and anything unprintable
 * removed, upper case. Null when nothing is left or it is too long to be a container barcode.
 */
export function normalizeBarcode(raw: string | null | undefined): string | null {
  // eslint-disable-next-line no-control-regex
  const cleaned = (raw ?? '').replace(/[\u0000-\u001f\u007f-\u009f\s]/g, '').toUpperCase();
  return cleaned.length > 0 && cleaned.length <= BARCODE_MAX_LENGTH ? cleaned : null;
}

/** A callback number: undefined when none was given, null when what was given is not a phone number, else trimmed. */
export function normalizeCallbackNumber(raw: string | null | undefined): string | null | undefined {
  const t = (raw ?? '').trim();
  if (!t) return undefined;
  return CALLBACK_PATTERN.test(t) ? t : null;
}

/** The part of a pending order the match needs. A superset (an IncomingOrder) is fine; patient fields are never read. */
export interface PendingOrderRef {
  id: string;
  externalOrderNumber: string;
  status: string;
  receivedAt: string;
  facilityId?: string;
  specimens?: ReadonlyArray<{ containerBarcode?: string }>;
}

/** Whether the order carries this barcode: its order (accession) number, or a container barcode on one of its specimens. */
export function orderCarriesBarcode(order: PendingOrderRef, barcode: string): boolean {
  if (normalizeBarcode(order.externalOrderNumber) === barcode) return true;
  return (order.specimens ?? []).some(s => normalizeBarcode(s.containerBarcode) === barcode);
}

/** The pending order the barcode belongs to (the oldest, if several carry it), or null. Only pending orders match. */
export function matchPendingOrder<O extends PendingOrderRef>(barcode: string, orders: readonly O[]): O | null {
  const hits = orders.filter(o => o.status === 'pending' && orderCarriesBarcode(o, barcode));
  hits.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.id.localeCompare(b.id));
  return hits[0] ?? null;
}

export function findReceiptByBarcode(barcode: string, receipts: readonly LockboxReceipt[]): LockboxReceipt | null {
  return receipts.find(r => r.barcode === barcode) ?? null;
}

/**
 * What a scanned barcode is: already received (the earlier receipt, no duplicate), a pending order, or unknown (a
 * placeholder is made). The same answer on the kiosk, in the mock and as the contract the server follows.
 */
export function resolveLockboxLookup<O extends PendingOrderRef>(
  barcode: string, orders: readonly O[], receipts: readonly LockboxReceipt[], facilityName: (facilityId: string | undefined) => string | undefined,
): LockboxLookup {
  const earlier = findReceiptByBarcode(barcode, receipts);
  if (earlier) return { kind: 'duplicate', receipt: earlier };
  const order = matchPendingOrder(barcode, orders);
  if (!order) return { kind: 'unmatched' };
  return { kind: 'matchedOrder', accessionNumber: order.externalOrderNumber, facilityId: order.facilityId, facilityName: facilityName(order.facilityId) };
}

/** What the kiosk does next after a lookup. */
export type ScanStep = 'showEarlierReceipt' | 'receive' | 'askPlaceholder';
export function scanStepFor(lookup: LockboxLookup): ScanStep {
  return lookup.kind === 'duplicate' ? 'showEarlierReceipt' : lookup.kind === 'matchedOrder' ? 'receive' : 'askPlaceholder';
}

/** A typed drop time as an ISO instant: undefined when not given, null when it is not a time or is implausible (future, or over a week old). */
export function validateReportedDropAt(raw: string | null | undefined, now: Date): string | null | undefined {
  if (!raw || !raw.trim()) return undefined;
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return null;
  const age = now.getTime() - t.getTime();
  if (age < -DROP_TIME_FUTURE_TOLERANCE_MS || age > DROP_TIME_MAX_AGE_MS) return null;
  return t.toISOString();
}

/** The value of a datetime-local input (`2026-10-21T02:15`, the browser's local time) as an ISO instant, or undefined. */
export function dropTimeFromLocalInput(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** The placeholder id for the next placeholder of the day: LBX-PH-YYYYMMDD-NNN. Not an accession number. */
export function nextPlaceholderId(existing: readonly (string | undefined)[], nowIso: string): string {
  const day = nowIso.slice(0, 10).replace(/-/g, '');
  const prefix = `LBX-PH-${day}-`;
  const used = existing.filter((id): id is string => !!id && id.startsWith(prefix)).map(id => parseInt(id.slice(prefix.length), 10)).filter(n => Number.isFinite(n));
  return `${prefix}${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, '0')}`;
}

export interface ReceiptBuild {
  id: string;
  barcode: string;
  nowIso: string;
  actor: LockboxActor;
  urgent: boolean;
  callbackNumber?: string;
  /** The order the barcode matched, if any. When present the receipt is a matchedOrder and placeholder details are ignored. */
  match?: { orderId: string; accessionNumber: string; facilityId?: string; facilityName?: string };
  placeholder?: LockboxPlaceholderInput & { facilityName?: string; physicianName?: string; reportedDropAt?: string };
  placeholderId?: string;
}

/**
 * The receipt, as it will be stored. The state follows from the match alone; a callback number is kept only on an urgent
 * drop; the time and user are the ones passed in (the server's), never the caller's.
 */
export function buildReceipt(b: ReceiptBuild): LockboxReceipt {
  const base = {
    id: b.id, barcode: b.barcode, receivedAt: b.nowIso, receivedBy: { userId: b.actor.userId, userName: b.actor.userName },
    urgent: b.urgent, ...(b.urgent && b.callbackNumber ? { callbackNumber: b.callbackNumber } : {}),
  };
  if (b.match) {
    return { ...base, state: 'matchedOrder', orderId: b.match.orderId, accessionNumber: b.match.accessionNumber,
      ...(b.match.facilityId ? { facilityId: b.match.facilityId } : {}), ...(b.match.facilityName ? { facilityName: b.match.facilityName } : {}) };
  }
  const p = b.placeholder ?? {};
  const free = (p.clientFreeText ?? '').trim().slice(0, 120);
  return { ...base, state: 'placeholder', placeholderId: b.placeholderId,
    ...(p.reportedDropAt ? { reportedDropAt: p.reportedDropAt } : {}),
    ...(p.facilityId ? { facilityId: p.facilityId } : {}), ...(p.facilityName ? { facilityName: p.facilityName } : {}),
    ...(free ? { clientFreeText: free } : {}),
    ...(p.physicianId ? { physicianId: p.physicianId } : {}), ...(p.physicianName ? { physicianName: p.physicianName } : {}) };
}

/** When the specimen was dropped, for waiting time: the person's drop time if it is plausible (not after the receipt), else the receipt. */
export function effectiveDropAt(r: LockboxReceipt): string {
  return r.reportedDropAt && r.reportedDropAt <= r.receivedAt ? r.reportedDropAt : r.receivedAt;
}

/** Whole minutes between two instants, never negative. */
export const minutesBetween = (fromIso: string, toIso: string): number => Math.max(0, Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / MINUTE_MS));

/** How long the specimen has waited in the lockbox, in minutes, as of `nowIso`. */
export const dwellMinutes = (r: LockboxReceipt, nowIso: string): number => minutesBetween(effectiveDropAt(r), nowIso);

/** Days, hours and minutes for a duration in minutes (the screen words them through t()). */
export function dwellParts(minutes: number): { days: number; hours: number; minutes: number } {
  const m = Math.max(0, Math.floor(minutes));
  return { days: Math.floor(m / 1440), hours: Math.floor((m % 1440) / 60), minutes: m % 60 };
}

const lastOf = (rs: readonly LockboxResolution[], receiptId: string, kind: LockboxResolution['kind']) =>
  rs.filter(r => r.receiptId === receiptId && r.kind === kind).sort((a, b) => b.at.localeCompare(a.at))[0];

export const isAccessioned = (receiptId: string, resolutions: readonly LockboxResolution[]): boolean => !!lastOf(resolutions, receiptId, 'accessioned');

export function folderStatusOf(receipt: LockboxReceipt, resolutions: readonly LockboxResolution[]): { status: LockboxFolderStatus; linkedAccessionNumber?: string } {
  if (receipt.state === 'matchedOrder') return { status: 'matched' };
  const linked = lastOf(resolutions, receipt.id, 'placeholderResolved');
  return linked ? { status: 'placeholderLinked', linkedAccessionNumber: linked.accessionNumber } : { status: 'placeholderOpen' };
}

/** Urgent first, then the longest waiting first (the earliest drop); ties by receipt id so the order is stable. */
export function sortFolderEntries(entries: readonly LockboxFolderEntry[]): LockboxFolderEntry[] {
  return [...entries].sort((a, b) =>
    Number(b.receipt.urgent) - Number(a.receipt.urgent)
    || effectiveDropAt(a.receipt).localeCompare(effectiveDropAt(b.receipt))
    || a.receipt.id.localeCompare(b.receipt.id));
}

/** Every receipt not yet accessioned, ordered, with its waiting time as of `nowIso`. */
export function buildFolderEntries(receipts: readonly LockboxReceipt[], resolutions: readonly LockboxResolution[], nowIso: string): LockboxFolderEntry[] {
  return sortFolderEntries(receipts.filter(r => !isAccessioned(r.id, resolutions)).map(receipt => ({
    receipt, ...folderStatusOf(receipt, resolutions), dwellMinutes: dwellMinutes(receipt, nowIso),
  })));
}

const median = (xs: readonly number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/** Drop-to-accessioned for the receipts that were accessioned, and the wait of those still in the folder. */
export function summarizeTimeToReceipt(receipts: readonly LockboxReceipt[], resolutions: readonly LockboxResolution[], nowIso: string): LockboxTimeSummary {
  const done: { urgent: boolean; minutes: number }[] = [];
  for (const r of receipts) {
    const a = lastOf(resolutions, r.id, 'accessioned');
    if (a) done.push({ urgent: r.urgent, minutes: minutesBetween(effectiveDropAt(r), a.at) });
  }
  const all = done.map(d => d.minutes);
  const urgent = done.filter(d => d.urgent).map(d => d.minutes);
  const waiting = receipts.filter(r => !isAccessioned(r.id, resolutions)).map(r => dwellMinutes(r, nowIso));
  return {
    accessionedCount: done.length,
    medianMinutes: median(all),
    meanMinutes: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null,
    maxMinutes: all.length ? Math.max(...all) : null,
    urgentAccessionedCount: urgent.length,
    urgentMedianMinutes: median(urgent),
    waitingCount: waiting.length,
    oldestWaitingMinutes: waiting.length ? Math.max(...waiting) : null,
  };
}

export const buildFolder = (receipts: readonly LockboxReceipt[], resolutions: readonly LockboxResolution[], nowIso: string): LockboxFolder =>
  ({ entries: buildFolderEntries(receipts, resolutions, nowIso), summary: summarizeTimeToReceipt(receipts, resolutions, nowIso), asOf: nowIso });

/** Why a receipt cannot be marked accessioned, or null when it can. A placeholder must be linked to its real number first. */
export function accessionRefusal(receipt: LockboxReceipt | undefined, resolutions: readonly LockboxResolution[]): 'NOT_FOUND' | 'ALREADY_ACCESSIONED' | 'PLACEHOLDER_UNRESOLVED' | null {
  if (!receipt) return 'NOT_FOUND';
  if (isAccessioned(receipt.id, resolutions)) return 'ALREADY_ACCESSIONED';
  return folderStatusOf(receipt, resolutions).status === 'placeholderOpen' ? 'PLACEHOLDER_UNRESOLVED' : null;
}

/** Why a placeholder cannot be resolved, or null when it can. Resolving twice is refused: the first link stands (append-only). */
export function resolveRefusal(receipt: LockboxReceipt | undefined, resolutions: readonly LockboxResolution[]): 'NOT_FOUND' | 'NOT_A_PLACEHOLDER' | 'ALREADY_ACCESSIONED' | 'CONFLICT' | null {
  if (!receipt) return 'NOT_FOUND';
  if (receipt.state !== 'placeholder') return 'NOT_A_PLACEHOLDER';
  if (isAccessioned(receipt.id, resolutions)) return 'ALREADY_ACCESSIONED';
  return folderStatusOf(receipt, resolutions).status === 'placeholderLinked' ? 'CONFLICT' : null;
}

/** The value a datetime-local input takes for this moment, in the browser's local time (the default "time dropped" is now). */
export function localInputValueFromDate(d: Date): string {
  // Shift the instant by the device's offset so the ISO text reads as the device's wall clock (dropTimeFromLocalInput reads it back the same way).
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Which message shows a waiting time (minutes only, hours and minutes, or days and hours) and its values. */
export function dwellLabel(minutes: number): { key: 'minutes' | 'hoursMinutes' | 'daysHours'; values: Record<string, number> } {
  const p = dwellParts(minutes);
  if (p.days > 0) return { key: 'daysHours', values: { days: p.days, hours: p.hours } };
  if (p.hours > 0) return { key: 'hoursMinutes', values: { hours: p.hours, minutes: p.minutes } };
  return { key: 'minutes', values: { minutes: p.minutes } };
}

/**
 * Batch 652: the open receipt a new case was created from. By receipt id when one is given (that receipt or nothing);
 * otherwise by the order the case came from, or by the order/accession number, on the receipt itself or on the entry
 * that linked a placeholder to its real number. A receipt already accessioned is never returned.
 */
export function findReceiptForCase(
  receipts: readonly LockboxReceipt[], resolutions: readonly LockboxResolution[],
  want: { receiptId?: string; orderId?: string; accessionNumber?: string },
): LockboxReceipt | null {
  const number = normalizeBarcode(want.accessionNumber);
  const open = receipts.filter(r => !isAccessioned(r.id, resolutions));
  if (want.receiptId) return open.find(r => r.id === want.receiptId) ?? null;
  return open.find(r => {
    const linked = resolutions.filter(x => x.receiptId === r.id && x.kind === 'placeholderResolved');
    if (want.orderId && (r.orderId === want.orderId || linked.some(x => x.orderId === want.orderId))) return true;
    return !!number && (normalizeBarcode(r.accessionNumber) === number || linked.some(x => normalizeBarcode(x.accessionNumber) === number));
  }) ?? null;
}


/** Batch 659: where "Open Accession" goes for a receipt: the Accession screen with the matched order imported, or blank when no order is known. */
export function accessionLinkForReceipt(receipt: { orderId?: string }): string {
  return receipt.orderId ? `/accession?order=${encodeURIComponent(receipt.orderId)}` : '/accession';
}
