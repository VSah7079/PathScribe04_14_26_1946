// src/services/requisitions/requisitionRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec §2.1–§2.3): the rules of the ingestion pipeline.
// Pure; the server job and the demonstration's in-browser engine use the same ones.
// ─────────────────────────────────────────────────────────────────────────────
import type { PageRange } from './requisitionTypes';

/** §2.1: PDF only. A file is taken when its name ends in .pdf and its type, when known, is PDF. */
export function isIngestiblePdf(fileName: string, mimeType?: string): boolean {
  return /\.pdf$/i.test(fileName.trim()) && (!mimeType || mimeType.toLowerCase() === 'application/pdf');
}

export const DEFAULT_SEPARATOR_BARCODE = 'PATHSCRIBE-SEPARATOR';

/**
 * §2.2 multi-page handling: the pages of one scan, grouped under the barcode that starts each requisition. A page with a
 * new barcode starts a new group; a page with no barcode (a continuation page) joins the group before it; a separator
 * sheet ends the group and is not part of any requisition. Pages before the first barcode form a group with none.
 * `pageBarcodes[i]` is what was read on page i + 1.
 */
export function groupPages(pageBarcodes: readonly (readonly string[])[], separatorBarcode: string = DEFAULT_SEPARATOR_BARCODE): { barcode?: string; pages: PageRange }[] {
  const sep = separatorBarcode.trim().toUpperCase();
  const groups: { barcode?: string; pages: PageRange }[] = [];
  let current: { barcode?: string; pages: PageRange } | null = null;
  pageBarcodes.forEach((codes, i) => {
    const page = i + 1;
    const clean = codes.map(c => c.trim()).filter(Boolean);
    if (clean.some(c => c.toUpperCase() === sep)) { current = null; return; }
    const barcode = clean[0];
    if (barcode && (!current || current.barcode?.toUpperCase() !== barcode.toUpperCase())) {
      current = { barcode, pages: { from: page, to: page } };
      groups.push(current);
      return;
    }
    if (!current) { current = { pages: { from: page, to: page } }; groups.push(current); return; }
    current.pages.to = page;
  });
  return groups;
}

/** The text to look a barcode up by: an accession label may carry a container suffix (S26-0001-A), so the case's
 *  accession is tried first as given, then without its last part. */
export function barcodeLookupKeys(barcode: string): string[] {
  const b = barcode.trim().toUpperCase();
  const parts = b.split('-');
  return parts.length > 2 ? [b, parts.slice(0, -1).join('-')] : [b];
}

/** The address that opens a page range of a PDF (the #page fragment every browser PDF viewer reads). */
export function pageAddress(url: string, pages: PageRange): string {
  return `${url.split('#')[0]}#page=${pages.from}`;
}

/** The pages of a range, from a list of every page in the file (1-based, inclusive). */
export function pagesInRange<T>(pages: readonly T[], range: PageRange): T[] {
  return pages.slice(Math.max(0, range.from - 1), Math.max(0, range.to));
}

/** The latest run, and how it went, for the inbox's summary line. Pure. */
export function runOutcome(run: { files: number; matched: number; unmatched: number; rejected: readonly unknown[] }): 'nothingNew' | 'allLinked' | 'needsAttention' {
  if (run.unmatched > 0 || run.rejected.length > 0) return 'needsAttention';
  return run.matched > 0 ? 'allLinked' : 'nothingNew';
}

/** Whether a source's location is an address of its kind: a folder (a \\server\share path, or an smb, nfs, file or https
 *  address), a third-party system's https address, or a sending system's name. Pure. */
export function sourceLocationValid(kind: string, location: string): boolean {
  const l = location.trim();
  if (!l) return false;
  if (kind === 'fileShare') return /^\\\\[^\\/\s]+[\\/][^\s]*/.test(l) || /^(smb|nfs|file|https):\/\/\S+$/i.test(l);
  if (kind === 'documentSystem') return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(l);
  return true;
}

/** What is wrong with a source before it can be saved (empty when it can). Pure; the service checks the same. */
export function requisitionSourceProblems(s: { name: string; kind?: string; location: string; separatorBarcode: string; scheduleMinutes: number }): ('name' | 'location' | 'separatorBarcode' | 'scheduleMinutes')[] {
  const problems: ('name' | 'location' | 'separatorBarcode' | 'scheduleMinutes')[] = [];
  if (!s.name.trim()) problems.push('name');
  if (!sourceLocationValid(s.kind ?? 'api', s.location)) problems.push('location');
  if (!s.separatorBarcode.trim()) problems.push('separatorBarcode');
  if (!(Number.isInteger(s.scheduleMinutes) && s.scheduleMinutes >= 1 && s.scheduleMinutes <= 1440)) problems.push('scheduleMinutes');
  return problems;
}

/** The latest run of each source, newest first. Pure. */
export function latestRunPerSource<T extends { sourceId: string; at: string }>(runs: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...runs].sort((a, b) => b.at.localeCompare(a.at)).filter(r => (seen.has(r.sourceId) ? false : (seen.add(r.sourceId), true)));
}

/** Items of one facility ('' = every facility shown; null facility = an all-facility source). Pure. */
export function inFacility<T extends { facilityId?: string | null }>(items: readonly T[], facilityId: string): T[] {
  return facilityId ? items.filter(i => (i.facilityId ?? null) === facilityId) : [...items];
}

/** The facilities the inbox can filter by: those of the sources shown, in the order given. Pure. */
export function sourceFacilityIds(sources: readonly { facilityId: string | null }[]): string[] {
  return [...new Set(sources.map(s => s.facilityId).filter((f): f is string => !!f))];
}

// ── Expected requisitions ────────────────────────────────────────────────────────────────────────────────────────

/** The default: a paper requisition is expected for every case except one that came as an electronic HIS/LIS order. */
export const DEFAULT_REQUISITION_EXPECTATION = {
  facilityId: null,
  expected: { electronic: false, manual: true, outside: true, downtime: true, lockbox: true },
  graceHours: 24,
  unmatchedAlertHours: 24,
} as const;

/** How a case's order reached the laboratory (pure). A case with no intake type came from the laboratory system's feed
 *  (an electronic order); a case accessioned in PathScribe from an imported order carries its order id. */
export function requisitionOriginOf(c: { lockboxReceiptId?: string; order?: { intakeType?: string; externalOrderId?: string; placerOrderNumber?: string } }): 'electronic' | 'manual' | 'outside' | 'downtime' | 'lockbox' {
  if (c.lockboxReceiptId) return 'lockbox';
  const intake = c.order?.intakeType;
  if (intake === 'downtime') return 'downtime';
  if (intake === 'outside') return 'outside';
  if (!intake || c.order?.externalOrderId || c.order?.placerOrderNumber) return 'electronic';
  return 'manual';
}

/** The setting that applies to a facility: its own, else the organisation default, else the built-in default. Pure. */
export function expectationFor<T extends { facilityId: string | null }>(all: readonly T[], facilityId: string | null): T | typeof DEFAULT_REQUISITION_EXPECTATION {
  return (facilityId ? all.find(e => e.facilityId === facilityId) : undefined) ?? all.find(e => e.facilityId === null) ?? DEFAULT_REQUISITION_EXPECTATION;
}

/** Whether a case is now missing its requisition: one is expected for its origin, none is linked, and the grace period
 *  has passed. Pure. */
export function requisitionIsMissing(
  c: { origin: keyof typeof DEFAULT_REQUISITION_EXPECTATION.expected; accessionedAt: string | null },
  expectation: { expected: Record<string, boolean>; graceHours: number },
  hasLink: boolean,
  now: Date,
): boolean {
  if (hasLink || !expectation.expected[c.origin] || !c.accessionedAt) return false;
  const at = new Date(c.accessionedAt).getTime();
  return !Number.isNaN(at) && now.getTime() - at >= expectation.graceHours * 3_600_000;
}

const hoursValid = (h: number) => Number.isInteger(h) && h >= 0 && h <= 720;
/** Whether an expectation can be saved: both periods 0 to 720 hours. Pure. */
export const expectationValid = (e: { graceHours: number; unmatchedAlertHours?: number }) => hoursValid(e.graceHours) && hoursValid(e.unmatchedAlertHours ?? 24);

/** Whether a scan has waited in the Unmatched queue past the limit: a requisition with no case. Pure. */
export function unmatchedIsOverdue(u: { status: string; receivedAt: string }, alertHours: number, now: Date): boolean {
  if (u.status !== 'open') return false;
  const at = new Date(u.receivedAt).getTime();
  return !Number.isNaN(at) && now.getTime() - at >= alertHours * 3_600_000;
}
