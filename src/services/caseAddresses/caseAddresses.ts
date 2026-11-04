// src/services/caseAddresses/caseAddresses.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 446: no patient identifier in a page address.
//
// Case pages used to be addressed by the case's accession number
// (/case/S26-4410/synoptic). An accession number identifies a patient, and an
// address is kept in browser history, bookmarks, server and proxy logs, and
// screenshots. A case page is now addressed by the case's support reference
// (/case/SR-7K2Q-9MXD/synoptic): random, stored beside the case, meaningless
// on its own (services/supportReferences/).
//
//   • addressOf(caseId, view): the address to go to. The reference is
//     created the first time a case is opened. Links go straight to it, so
//     the accession never enters history (replacing it on arrival would be
//     too late: browsers record each address a page moves to).
//   • caseIdOf(param): what a case page's address names. A reference resolves
//     to its case; anything else is an old accession address (a bookmark or
//     a typed address), opened once and replaced with the reference.
//   • An unknown reference resolves to nothing, and the page shows its
//     neutral "case unavailable" screen, the same as for a case that doesn't
//     exist or isn't the reader's to see.
// Every address is built here (CASE_ADDRESS_VIEWS); caseAddresses.guard.test.ts
// keeps hand-built case addresses out of the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

import type { ISupportReferenceService } from '../supportReferences/ISupportReferenceService';

export const CASE_ADDRESS_VIEWS = {
  synoptic: (ref: string) => `/case/${ref}/synoptic`,
  grossing: (ref: string) => `/case/${ref}/grossing`,
  report: (ref: string) => `/report/${ref}`,
  cytology: (ref: string) => `/cytology-worklist/${ref}`,
  addOnOrders: (ref: string) => `/add-on-orders?case=${ref}`,
  /** The demo EMR companion window; it looks the patient up from the case. */
  emr: (ref: string) => `/mock-emr?case=${ref}`,
} as const;

export type CaseView = keyof typeof CASE_ADDRESS_VIEWS;

const REFERENCE_IN_ADDRESS = /^SR-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** True only for a reference exactly as addresses carry it; never an accession. */
export const isCaseAddressReference = (param: string | null | undefined): param is string =>
  !!param && REFERENCE_IN_ADDRESS.test(param);

/** Adds a query (e.g. `{ specimen: 'A' }`) to an address. */
function withQuery(path: string, query?: Record<string, string>): string {
  const q = query ? new URLSearchParams(query).toString() : '';
  if (!q) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${q}`;
}

export interface CaseIdFromAddress {
  /** The case the address names; undefined when the reference is unknown. */
  caseId: string | undefined;
  /** The address carried an accession (an old address) rather than a reference. */
  legacy: boolean;
}

export interface CaseAddresses {
  addressOf(caseId: string, view: CaseView, query?: Record<string, string>): Promise<string | null>;
  caseIdOf(param: string): Promise<CaseIdFromAddress>;
  /** A reference this session already resolved or created, without waiting. */
  knownCaseId(param: string | null | undefined): string | undefined;
}

export function createCaseAddresses(refs: Pick<ISupportReferenceService, 'forRecord' | 'recordIdFor'>): CaseAddresses {
  const known = new Map<string, string>();
  return {
    async addressOf(caseId, view, query) {
      // Batch 527 (PS-486): the demo EMR window isn't in a server build, so
      // there is no address (the EMR button opens the in-page panel instead).
      if (view === 'emr' && !__DEMO_TOOLS__) return null;
      const r = await refs.forRecord('case', caseId);
      if (r.ok === false) return null;
      known.set(r.data.ref, caseId);
      return withQuery(CASE_ADDRESS_VIEWS[view](r.data.ref), query);
    },
    async caseIdOf(param) {
      if (!isCaseAddressReference(param)) return { caseId: param, legacy: true };
      const cached = known.get(param);
      if (cached) return { caseId: cached, legacy: false };
      const r = await refs.recordIdFor(param, 'case');
      if (r.ok === false) return { caseId: undefined, legacy: false };
      known.set(param, r.data);
      return { caseId: r.data, legacy: false };
    },
    knownCaseId(param) {
      return param ? known.get(param) : undefined;
    },
  };
}
