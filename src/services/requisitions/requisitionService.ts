// src/services/requisitions/requisitionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec): the logic, built from its dependencies so tests need
// no module mocks (the demo's wiring is mockRequisitionService.ts; the API server does the same behind
// httpRequisitionService.ts).
//
//   getSources        requisition:inbox:review or config:requisition-ingestion:manage, per source facility
//   saveSource        config:requisition-ingestion:manage     for the source's facility (and its old one); audited
//   recordIngestion   requisition:ingestion:run               for the source's facility; audited: one entry per match
//                                                             and per quarantine; a quarantined scan from the same
//                                                             source whose case now exists is linked
//   getInbox          requisition:inbox:review                only the facilities the user may review
//   linksForCase      case:requisition:view                   for the case (its facility)
//   reassociate       requisition:inbox:resolve               for the scan's facility; audited
//   discard           requisition:inbox:resolve               for the scan's facility; audited
//   openDocument      case:requisition:view (the case) / requisition:inbox:review (the scan's facility); audited
//   getExpectations   requisition:inbox:review or config:requisition-ingestion:manage
//   saveExpectation   config:requisition-ingestion:manage     for its facility (all facilities for the default); audited
//   sweepMissing      requisition:ingestion:run               audited: Requisition Missing (and a Missing Requisition
//                                                             case deficiency), Requisition Received
//   getMissing        requisition:inbox:review                only the facilities the user may review
//   missingForCase    case:requisition:view                   for the case
//   waiveMissing      requisition:inbox:resolve               for the case's facility; audited (Requisition Waived)
//
// Several performing facilities (Pete, Nov 2, 2026): each source belongs to one facility (or to every facility), and a
// scan carries its source's facility, so a user assigned to one laboratory sees and resolves that laboratory's queue
// only (authorization's facility scope: an all-facility source needs an all-facility user). Matching is
// enterprise-wide: an accession number names one case wherever it is performed.
//
// Audit text is literal English and names the record's id, the pages, the barcode, the source and the facility: never
// the file name (a scanned file's name can name the patient, as for case attachments) and never a patient name.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { CapabilityContext } from '../authorization/evaluateCapability';
import type { AttachmentPointer } from '@/types/caseAttachments/CaseAttachment';
import { REQUISITION_ERRORS as E, type IRequisitionService } from './IRequisitionService';
import { barcodeLookupKeys, expectationFor, expectationValid, pageAddress, requisitionIsMissing, requisitionSourceProblems, unmatchedIsOverdue } from './requisitionRules';
import type { CaseRequisitionFacts, CaseToLink, IngestionRun, MissingRequisition, PageRange, RequisitionExpectation, RequisitionLink, RequisitionSource, UnmatchedRequisition } from './requisitionTypes';

export interface RequisitionStore {
  sources(): Promise<RequisitionSource[]>;
  saveSources(s: RequisitionSource[]): Promise<void>;
  links(): Promise<RequisitionLink[]>;
  saveLinks(l: RequisitionLink[]): Promise<void>;
  unmatched(): Promise<UnmatchedRequisition[]>;
  saveUnmatched(u: UnmatchedRequisition[]): Promise<void>;
  runs(): Promise<IngestionRun[]>;
  saveRuns(r: IngestionRun[]): Promise<void>;
  expectations(): Promise<RequisitionExpectation[]>;
  saveExpectations(e: RequisitionExpectation[]): Promise<void>;
  missing(): Promise<MissingRequisition[]>;
  saveMissing(m: MissingRequisition[]): Promise<void>;
}

export interface RequisitionServiceDeps {
  authorization: Pick<IAuthorizationService, 'enforce' | 'evaluate'>;
  store: RequisitionStore;
  /** The case an accession (or requisition number) names, or null (§2.3). */
  findCase: (key: string) => Promise<{ caseId: string; accession: string } | null>;
  /** An address that opens the file: the URL itself, or a short-lived read link for a stored object. */
  readLink: (pointer: AttachmentPointer) => Promise<string | null>;
  now: () => Date;
  actor: () => { userId: string; userName: string };
  newId: (prefix: string) => string;
  audit: (entry: { event: string; detail: string; caseId: string | null; user: string; type?: 'user' | 'system' }) => Promise<unknown>;
  /** Cases matching a search, within the user's own case access. */
  searchCases: (query: string) => Promise<CaseToLink[]>;
  /** The cases to check for a missing requisition (the job reads every case; nothing is shown from it). */
  cases: () => Promise<CaseRequisitionFacts[]>;
  /** The Missing Requisition case deficiency: raise one (its id, or null when it could not be raised), and close one. */
  deficiencies: {
    raise: (c: { caseId: string; comment: string }) => Promise<string | null>;
    close: (deficiencyId: string, comment: string) => Promise<unknown>;
  };
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const refuse = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const samePlace = (a: { pointer: AttachmentPointer; pages: PageRange }, b: { pointer: AttachmentPointer; pages: PageRange }) =>
  JSON.stringify(a.pointer) === JSON.stringify(b.pointer) && a.pages.from === b.pages.from && a.pages.to === b.pages.to;
const pagesText = (p: PageRange) => (p.from === p.to ? `page ${p.from}` : `pages ${p.from}-${p.to}`);

/** The authorization context of a facility's requisitions: that facility, or every facility for an all-facility source. Pure. */
export const facilityContext = (facilityId: string | null | undefined): CapabilityContext =>
  (facilityId ? { facilityId } : { allFacilities: true });
const facilityText = (facilityId: string | null | undefined) => (facilityId ? `facility ${facilityId}` : 'all facilities');

export function createRequisitionService(deps: RequisitionServiceDeps): IRequisitionService {
  const log = (event: string, detail: string, caseId: string | null, type: 'user' | 'system' = 'user') =>
    deps.audit({ event, detail, caseId, user: deps.actor().userName, type }).catch(() => undefined);
  async function findByBarcode(barcode: string) {
    for (const key of barcodeLookupKeys(barcode)) {
      const found = await deps.findCase(key);
      if (found) return found;
    }
    return null;
  }
  /** Which facilities the user may see in a list, asked once per facility (evaluate: nothing written per row). */
  function facilityFilter(capability: string) {
    const seen = new Map<string, Promise<boolean>>();
    return (facilityId: string | null | undefined) => {
      const key = facilityId ?? '*';
      if (!seen.has(key)) seen.set(key, deps.authorization.evaluate(capability, facilityContext(facilityId)).then(d => d.allowed));
      return seen.get(key)!;
    };
  }
  async function keep<T extends { facilityId?: string | null }>(items: T[], may: (f: string | null | undefined) => Promise<boolean>): Promise<T[]> {
    const flags = await Promise.all(items.map(i => may(i.facilityId)));
    return items.filter((_, i) => flags[i]);
  }

  /** A flagged case whose requisition has now been linked: the flag closes as received and its deficiency is closed. */
  async function settleFlags(links: readonly RequisitionLink[]): Promise<number> {
    const flags = await deps.store.missing();
    const linked = new Set(links.map(l => l.caseId));
    let received = 0;
    const at = deps.now().toISOString();
    const next = await Promise.all(flags.map(async f => {
      if (f.status !== 'open' || !linked.has(f.caseId)) return f;
      received++;
      if (f.deficiencyId) await deps.deficiencies.close(f.deficiencyId, 'Scanned requisition received and linked by PathScribe.').catch(() => undefined);
      void log('Requisition Received', `The missing requisition flagged at ${f.flaggedAt} has been received and linked; the deficiency is closed.`, f.accession, 'system');
      return { ...f, status: 'received' as const, closedAt: at, closedBy: 'System' };
    }));
    if (received) await deps.store.saveMissing(next);
    return received;
  }

  return {
    async getExpectations() {
      const review = (await deps.authorization.enforce('requisition:inbox:review')).allowed;
      if (!review && !(await deps.authorization.enforce('config:requisition-ingestion:manage')).allowed) return refuse(E.notPermitted);
      return ok(await deps.store.expectations());
    },

    async saveExpectation(e) {
      if (!(await deps.authorization.enforce('config:requisition-ingestion:manage', facilityContext(e.facilityId))).allowed) return refuse(E.notPermitted);
      if (!expectationValid(e)) return refuse(E.invalid);
      const saved: RequisitionExpectation = { facilityId: e.facilityId || null, expected: { ...e.expected }, graceHours: e.graceHours, unmatchedAlertHours: e.unmatchedAlertHours ?? 24, updatedAt: deps.now().toISOString(), updatedBy: deps.actor().userName };
      const all = (await deps.store.expectations()).filter(x => x.facilityId !== saved.facilityId);
      await deps.store.saveExpectations([...all, saved]);
      const on = Object.entries(saved.expected).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none';
      void log('Requisition Expectation Saved', `Requisitions expected (${facilityText(saved.facilityId)}) for: ${on}; flagged ${saved.graceHours} h after accession; a scan with no case flagged after ${saved.unmatchedAlertHours} h.`, null);
      return ok(saved);
    },

    async sweepMissing() {
      if (!(await deps.authorization.enforce('requisition:ingestion:run')).allowed) return refuse(E.notPermitted);
      const [cases, links, expectations] = await Promise.all([deps.cases(), deps.store.links(), deps.store.expectations()]);
      let flags = await deps.store.missing();
      const received = await settleFlags(links);
      if (received) flags = await deps.store.missing();
      const linked = new Set(links.map(l => l.caseId));
      const known = new Set(flags.map(f => f.caseId));
      const now = deps.now();
      const added: MissingRequisition[] = [];
      for (const c of cases) {
        if (known.has(c.caseId)) continue; // flagged once: open, received or waived
        if (!requisitionIsMissing(c, expectationFor(expectations, c.facilityId), linked.has(c.caseId), now)) continue;
        const hours = expectationFor(expectations, c.facilityId).graceHours;
        const deficiencyId = await deps.deficiencies.raise({ caseId: c.caseId, comment: `Raised by PathScribe: no scanned requisition linked ${hours} h after accession (${c.origin} order).` }).catch(() => null);
        added.push({ caseId: c.caseId, accession: c.accession, facilityId: c.facilityId, origin: c.origin, accessionedAt: c.accessionedAt ?? '', flaggedAt: now.toISOString(), ...(deficiencyId ? { deficiencyId } : {}), status: 'open' });
        void log('Requisition Missing', `No scanned requisition linked ${hours} h after accession (${c.origin} order, ${facilityText(c.facilityId)}); a Missing Requisition deficiency was ${deficiencyId ? 'raised' : 'not raised (the deficiency service refused)'}.`, c.accession, 'system');
      }
      if (added.length) await deps.store.saveMissing([...flags, ...added]);
      // A requisition with no case: a scan still in the Unmatched queue past its facility's limit. Flagged once.
      const queue = await deps.store.unmatched();
      let overdue = 0;
      const nextQueue = queue.map(u => {
        if (u.overdueAt || !unmatchedIsOverdue(u, expectationFor(expectations, u.facilityId).unmatchedAlertHours ?? 24, now)) return u;
        overdue++;
        void log('Requisition Without Case', `Requisition ${u.id} (${pagesText(u.pages)}, ${facilityText(u.facilityId)}) has waited since ${u.receivedAt} with no case${u.barcode ? ` (barcode ${u.barcode})` : ''}: check for a specimen not received, lost or not accessioned.`, null, 'system');
        return { ...u, overdueAt: now.toISOString() };
      });
      if (overdue) await deps.store.saveUnmatched(nextQueue);
      return ok({ flagged: added.length, received, overdue });
    },

    async getMissing() {
      if (!(await deps.authorization.enforce('requisition:inbox:review')).allowed) return refuse(E.notPermitted);
      const open = (await deps.store.missing()).filter(f => f.status === 'open');
      return ok((await keep(open, facilityFilter('requisition:inbox:review'))).sort((a, b) => a.accessionedAt.localeCompare(b.accessionedAt)));
    },

    async missingForCase(ref) {
      if (!(await deps.authorization.enforce('case:requisition:view', { caseId: ref.caseId ?? ref.accession ?? null })).allowed) return refuse(E.notPermitted);
      const acc = ref.accession?.toUpperCase();
      return ok((await deps.store.missing()).find(f => f.status === 'open' && ((ref.caseId && f.caseId === ref.caseId) || (acc && f.accession.toUpperCase() === acc))) ?? null);
    },

    async waiveMissing(caseId, reason, note) {
      const flags = await deps.store.missing();
      const flag = flags.find(f => f.caseId === caseId && f.status === 'open');
      if (!(await deps.authorization.enforce('requisition:inbox:resolve', facilityContext(flag?.facilityId))).allowed) return refuse(E.notPermitted);
      if (!flag) return refuse(E.notFound);
      const closed: MissingRequisition = { ...flag, status: 'waived', waiverReason: reason, ...(note?.trim() ? { waiverNote: note.trim() } : {}), closedAt: deps.now().toISOString(), closedBy: deps.actor().userName };
      if (flag.deficiencyId) await deps.deficiencies.close(flag.deficiencyId, `No paper requisition: ${reason}${note?.trim() ? ` (${note.trim()})` : ''}. Recorded by ${deps.actor().userName}.`).catch(() => undefined);
      await deps.store.saveMissing(flags.map(f => (f === flag ? closed : f)));
      void log('Requisition Waived', `No paper requisition is expected: ${reason}. The Missing Requisition deficiency is closed.`, flag.accession);
      return ok(closed);
    },

    async getSources() {
      const review = (await deps.authorization.enforce('requisition:inbox:review')).allowed;
      const manage = !review && (await deps.authorization.enforce('config:requisition-ingestion:manage')).allowed;
      if (!review && !manage) return refuse(E.notPermitted);
      return ok(await keep(await deps.store.sources(), facilityFilter(review ? 'requisition:inbox:review' : 'config:requisition-ingestion:manage')));
    },

    async saveSource(input) {
      const all = await deps.store.sources();
      const before = all.find(s => s.id === input.id);
      if (!(await deps.authorization.enforce('config:requisition-ingestion:manage', facilityContext(input.facilityId))).allowed) return refuse(E.notPermitted);
      // Moving a source to another facility also needs the facility it leaves.
      if (before && before.facilityId !== input.facilityId
        && !(await deps.authorization.enforce('config:requisition-ingestion:manage', facilityContext(before.facilityId))).allowed) return refuse(E.notPermitted);
      if (requisitionSourceProblems(input).length) return refuse(E.invalid);
      const saved: RequisitionSource = {
        ...input, name: input.name.trim(), location: input.location.trim(), separatorBarcode: input.separatorBarcode.trim(), facilityId: input.facilityId || null,
        id: input.id || deps.newId('rqsrc'), updatedAt: deps.now().toISOString(), updatedBy: deps.actor().userName,
      };
      await deps.store.saveSources(before ? all.map(s => (s.id === saved.id ? saved : s)) : [...all, saved]);
      void log('Requisition Source Saved', `Requisition source ${saved.id} "${saved.name}" (${saved.kind}, ${saved.location}, ${facilityText(saved.facilityId)}) saved: every ${saved.scheduleMinutes} min, ${saved.enabled ? 'enabled' : 'disabled'}.`, null);
      return ok(saved);
    },

    async recordIngestion(report) {
      const source = (await deps.store.sources()).find(s => s.id === report.sourceId);
      if (!source) return refuse(E.notFound);
      if (!(await deps.authorization.enforce('requisition:ingestion:run', facilityContext(source.facilityId))).allowed) return refuse(E.notPermitted);
      const at = deps.now().toISOString();
      const facilityId = source.facilityId;
      const links = await deps.store.links();
      const unmatched = await deps.store.unmatched();
      const run: IngestionRun = { id: deps.newId('rqrun'), sourceId: source.id, facilityId, at, ranBy: deps.actor().userName, files: report.files.length, matched: 0, unmatched: 0, rejected: [] };
      // A scan from this source that came in before its case was accessioned is linked on the next run, once the case exists.
      for (const [i, u] of unmatched.entries()) {
        if (u.status !== 'open' || u.reason !== 'noMatch' || !u.barcode || u.sourceId !== source.id) continue;
        const found = await findByBarcode(u.barcode);
        if (!found) continue;
        const link: RequisitionLink = { id: deps.newId('rqlink'), caseId: found.caseId, accession: found.accession, pointer: u.pointer, pages: u.pages, fileName: u.fileName, barcode: u.barcode, sourceId: u.sourceId, facilityId: u.facilityId, ingestedAt: at, matchedBy: 'automatic' };
        links.push(link);
        unmatched[i] = { ...u, status: 'linked', linkId: link.id, closedAt: at, closedBy: deps.actor().userName };
        run.matched++;
        void log('Requisition Matched', `Unmatched requisition ${u.id} (${pagesText(u.pages)}) matched on barcode ${u.barcode} once the case existed; linked as ${link.id}.`, found.accession, 'system');
      }
      for (const file of report.files) {
        if (file.outcome === 'rejected') { run.rejected.push({ fileName: file.fileName, reason: file.reason }); continue; }
        for (const group of file.groups) {
          const place = { pointer: file.pointer, pages: group.pages };
          if (links.some(l => samePlace(l, place)) || unmatched.some(u => samePlace(u, place))) continue; // already ingested
          const found = group.barcode ? await findByBarcode(group.barcode) : null;
          if (found) {
            const link: RequisitionLink = { id: deps.newId('rqlink'), caseId: found.caseId, accession: found.accession, ...place, fileName: file.fileName, barcode: group.barcode!, sourceId: source.id, facilityId, ingestedAt: at, matchedBy: 'automatic' };
            links.push(link);
            run.matched++;
            void log('Requisition Matched', `Requisition ${link.id} (${pagesText(group.pages)}) matched on barcode ${group.barcode} from source ${source.id} (${facilityText(facilityId)}).`, found.accession, 'system');
          } else {
            const item: UnmatchedRequisition = { id: deps.newId('rqunm'), ...place, fileName: file.fileName, ...(group.barcode ? { barcode: group.barcode } : {}), reason: group.barcode ? 'noMatch' : 'noBarcode', sourceId: source.id, facilityId, receivedAt: at, status: 'open' };
            unmatched.push(item);
            run.unmatched++;
            void log('Requisition Quarantined', `Requisition ${item.id} (${pagesText(group.pages)}) from source ${source.id} (${facilityText(facilityId)}) quarantined: ${group.barcode ? `barcode ${group.barcode} matches no case` : 'no barcode could be read'}.`, null, 'system');
          }
        }
      }
      await deps.store.saveLinks(links);
      await deps.store.saveUnmatched(unmatched);
      await deps.store.saveRuns([run, ...(await deps.store.runs())].slice(0, 50));
      await settleFlags(links);
      return ok(run);
    },

    async getInbox() {
      if (!(await deps.authorization.enforce('requisition:inbox:review')).allowed) return refuse(E.notPermitted);
      const may = facilityFilter('requisition:inbox:review');
      const byNewest = <T>(xs: T[], key: (x: T) => string) => [...xs].sort((a, b) => key(b).localeCompare(key(a)));
      return ok({
        // A requisition with no case past the limit comes first, then the newest.
        unmatched: byNewest(await keep((await deps.store.unmatched()).filter(u => u.status === 'open'), may), u => `${u.overdueAt ? 1 : 0}${u.receivedAt}`),
        recentLinks: byNewest(await keep(await deps.store.links(), may), l => l.ingestedAt).slice(0, 20),
        runs: (await keep(await deps.store.runs(), may)).slice(0, 10),
      });
    },

    async linksForCase(ref) {
      if (!(await deps.authorization.enforce('case:requisition:view', { caseId: ref.caseId ?? ref.accession ?? null })).allowed) return refuse(E.notPermitted);
      const acc = ref.accession?.toUpperCase();
      return ok((await deps.store.links()).filter(l => (ref.caseId && l.caseId === ref.caseId) || (acc && l.accession.toUpperCase() === acc)));
    },

    async findCasesToLink(query) {
      if (!(await deps.authorization.enforce('requisition:inbox:resolve')).allowed) return refuse(E.notPermitted);
      const q = query.trim();
      if (q.length < 2) return ok([]);
      return ok((await deps.searchCases(q)).slice(0, 8));
    },

    async reassociate(unmatchedId, accession, how) {
      const all = await deps.store.unmatched();
      const item = all.find(u => u.id === unmatchedId);
      if (!(await deps.authorization.enforce('requisition:inbox:resolve', facilityContext(item?.facilityId))).allowed) return refuse(E.notPermitted);
      if (!item) return refuse(E.notFound);
      if (item.status !== 'open') return refuse(E.alreadyClosed);
      const found = accession.trim() ? await findByBarcode(accession) : null;
      if (!found) return refuse(E.notFound);
      const at = deps.now().toISOString();
      const link: RequisitionLink = { id: deps.newId('rqlink'), caseId: found.caseId, accession: found.accession, pointer: item.pointer, pages: item.pages, fileName: item.fileName, barcode: accession.trim(), sourceId: item.sourceId, facilityId: item.facilityId, ingestedAt: at, matchedBy: 'manual', linkedBy: deps.actor().userName };
      await deps.store.saveLinks([...(await deps.store.links()), link]);
      await deps.store.saveUnmatched(all.map(u => (u.id === unmatchedId ? { ...u, status: 'linked' as const, linkId: link.id, closedAt: at, closedBy: deps.actor().userName } : u)));
      await settleFlags([link]);
      const byWhat = how === 'newCase' ? ' to the case created from it' : how === 'search' ? ' to a case found by search' : '';
      void log('Requisition Re-associated', `Unmatched requisition ${item.id} (${pagesText(item.pages)}, ${facilityText(item.facilityId)}) linked by hand${byWhat} as ${link.id}${item.barcode ? ` (barcode read: ${item.barcode})` : ''}.`, found.accession);
      return ok(link);
    },

    async discard(unmatchedId, reason) {
      const all = await deps.store.unmatched();
      const item = all.find(u => u.id === unmatchedId);
      if (!(await deps.authorization.enforce('requisition:inbox:resolve', facilityContext(item?.facilityId))).allowed) return refuse(E.notPermitted);
      if (!item) return refuse(E.notFound);
      if (item.status !== 'open') return refuse(E.alreadyClosed);
      const closed: UnmatchedRequisition = { ...item, status: 'discarded', discardReason: reason, closedAt: deps.now().toISOString(), closedBy: deps.actor().userName };
      await deps.store.saveUnmatched(all.map(u => (u.id === unmatchedId ? closed : u)));
      void log('Requisition Discarded', `Unmatched requisition ${item.id} (${pagesText(item.pages)}, ${facilityText(item.facilityId)}) discarded: ${reason}. The file itself is not touched.`, null);
      return ok(closed);
    },

    async openDocument(ref) {
      if ('linkId' in ref) {
        const link = (await deps.store.links()).find(l => l.id === ref.linkId);
        if (!(await deps.authorization.enforce('case:requisition:view', { caseId: link?.caseId ?? null })).allowed) return refuse(E.notPermitted);
        if (!link) return refuse(E.notFound);
        const url = await deps.readLink(link.pointer);
        if (!url) return refuse(E.notFound);
        void log('Requisition Viewed', `Requisition ${link.id} (${pagesText(link.pages)}) opened.`, link.accession);
        return ok({ url: pageAddress(url, link.pages) });
      }
      const item = (await deps.store.unmatched()).find(u => u.id === ref.unmatchedId);
      if (!(await deps.authorization.enforce('requisition:inbox:review', facilityContext(item?.facilityId))).allowed) return refuse(E.notPermitted);
      if (!item) return refuse(E.notFound);
      const url = await deps.readLink(item.pointer);
      if (!url) return refuse(E.notFound);
      void log('Requisition Viewed', `Requisition ${item.id} (${pagesText(item.pages)}, ${facilityText(item.facilityId)}) opened from the Unmatched queue.`, null);
      return ok({ url: pageAddress(url, item.pages) });
    },
  };
}
