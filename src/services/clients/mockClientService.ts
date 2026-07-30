import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { Client, IClientService } from './IClientService';

// Client and IClientService now live in IClientService.ts — this file
// used to declare its own separate copy of both, which silently diverged
// from IClientService.ts's copy (see that file's header comment for the
// reconciliation history, June 2026). Re-exporting the type here so every
// existing `import { mockClientService, Client } from '.../mockClientService'`
// elsewhere in the app keeps working unchanged.
export type { Client, IClientService };

// Default HL7/reporting settings for existing seed clients — none of them
// have HL7 actually enabled today (no live interface exists yet per the
// order-intake design discussion), so this is a safe, honest default
// rather than fabricating configuration that isn't real.
const defaultHl7 = () => ({ sendingFacility: 'pathscribe', receivingFacility: '', hl7Version: '2.5.1', enabled: false });
const defaultReporting = () => ({ reportFormat: 'PDF' as const, deliveryMethod: 'Portal' as const, autoRelease: false, copyToReferring: false });

// Keeps the deprecated contactName string in sync with the structured
// contactGivenNames/contactFamilyNames fields, same mirroring pattern as
// withMirroredNames() in mockPhysicianService.ts. No-op (leaves
// contactName as whatever was passed, usually undefined) if neither
// structured field is set — contact person is optional data for a Client.
function withDerivedContactName(c: Client): Client {
  if (!c.contactGivenNames && !c.contactFamilyNames) return c;
  const contactName = [c.contactNamePrefix, c.contactGivenNames, c.contactFamilyNames, c.contactNameSuffix]
    .map(p => p?.trim()).filter(Boolean).join(' ');
  return { ...c, contactName };
}

// ─── Mock ─────────────────────────────────────────────────────────────────────
// clientType defaults to 'external' for the five original US seed clients —
// each reads as its own separate named institution submitting specimens
// to the lab, not an affiliated site of one parent. This is a judgment
// call made during the June 2026 reconciliation (merging in clientType/
// parentId/hl7/reporting from the second, now-retired client system) —
// worth revisiting per your actual client relationships.
//
// jurisdiction added when jurisdiction moved from a single system-wide
// SystemConfig.jurisdiction to per-client (also June 2026) — the trial
// serves both UK and US clients simultaneously, so this can no longer be
// one global setting. See IClientService.ts's field doc for the full
// reasoning, and utils/formatDate.ts / components/Worklist/WorklistTable.tsx
// for where this now actually drives display behavior (date format).
const SEED_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Metro General Hospital',   assigningAuthority: 'MGH',  address: '100 Main St',      phone: '555-2001', fax: '555-2002', email: 'lab@metrogeneral.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: 18,   authorizedPediatricPathologistIds: [],
    // Academic centre — tight SLAs negotiated in contract
    tatFirstTouchHours: 4,  tatTotalHours: 24,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'critical',
  },
  {
    id: 'c2', name: 'Riverside Medical Center', assigningAuthority: 'RMC',  address: '200 River Rd',     phone: '555-2003', fax: '555-2004', email: 'lab@riverside.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Community hospital — standard 2-day TAT
    tatFirstTouchHours: 8,  tatTotalHours: 48,
    escalationTargets: ['admin'], escalationPriority: 'high',
  },
  {
    id: 'c3', name: 'Northside Clinic',         assigningAuthority: 'NSC',  address: '300 North Ave',    phone: '555-2005', fax: '555-2006', email: 'lab@northside.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Small clinic — no custom targets, inherits system defaults
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c4', name: 'Westview Surgery Center',  assigningAuthority: 'WSC',  address: '400 West Blvd',    phone: '555-2007', fax: '555-2008', email: 'lab@westview.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Surgical centre — rapid intra-op consults expected
    tatFirstTouchHours: 6,  tatTotalHours: 36,
    escalationTargets: ['pathGroup', 'referrer'], escalationPriority: 'high',
  },
  {
    id: 'c5', name: 'Eastpark Oncology',        assigningAuthority: 'EPO',  address: '500 East Park Dr', phone: '555-2009', fax: '555-2010', email: 'lab@eastpark.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Inactive', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Oncology centre — fast first touch, 24h total
    tatFirstTouchHours: 4,  tatTotalHours: 24,
    escalationTargets: ['pathGroup', 'admin', 'referrer'], escalationPriority: 'critical',
  },
  // Deliberately Unverified/autoCreated — same reasoning as ph4/ph6 in
  // mockPhysicianService.ts and cat-auto-000001 in
  // mockSpecimenCategoryService.ts: gives the admin approval screen
  // something real to show before any live order intake exists.
  {
    id: 'c-auto-000001', name: 'Fairview Family Practice', assigningAuthority: 'FFP', address: '', phone: '', fax: '', email: '',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Unverified', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
    autoCreated: true, autoCreatedAt: '2026-06-20',
    autoCreatedNote: 'No crosswalk match for client code "FFP-01" on an incoming order — created pending admin review.',
  },
  // ── NHS Trust example (England & Wales) — demonstrates clientType:
  // 'internal' + parentId. Fictional Trust name, deliberately not matching
  // any real pilot institution. One parent Trust record (no parentId —
  // it's the top-level institution) with three affiliate hospitals
  // underneath it, each clientType: 'internal' pointing back at the Trust
  // via parentId. jurisdiction: 'GB_EW' — NHS Number (not CHI Number,
  // that's Scotland only) is the correct patient identifier standard here.
  {
    id: 'c-trust-fenwick', name: 'Fenwick NHS Foundation Trust', assigningAuthority: 'FNHS',
    address: 'Trust Headquarters, Fenwick', phone: '+44 191 555 0100', fax: '', email: 'info@fenwicknhs.nhs.uk',
    clientType: 'internal', jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: ['admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-general', name: 'Fenwick General Hospital', assigningAuthority: 'FGH', parentId: 'c-trust-fenwick',
    address: '1 Trust Way, Fenwick', phone: '+44 191 555 0101', fax: '', email: 'pathology@fenwickgeneral.nhs.uk',
    clientType: 'internal', jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-womens', name: "Fenwick Women's Hospital", assigningAuthority: 'FWH', parentId: 'c-trust-fenwick',
    address: '2 Trust Way, Fenwick', phone: '+44 191 555 0102', fax: '', email: 'pathology@fenwickwomens.nhs.uk',
    clientType: 'internal', jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-childrens', name: "Fenwick Children's Hospital", assigningAuthority: 'FCH', parentId: 'c-trust-fenwick',
    address: '3 Trust Way, Fenwick', phone: '+44 191 555 0103', fax: '', email: 'pathology@fenwickchildrens.nhs.uk',
    clientType: 'internal', jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    // Pediatric hospital — every patient is under threshold, so every case
    // routes through the pediatric access gate by design, not exception.
    status: 'Active', pediatricAgeThreshold: 18, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 6, tatTotalHours: 36,
    escalationTargets: ['pathGroup', 'admin', 'referrer'], escalationPriority: 'critical',
  },
  // ── NHS Scotland example — separate from Fenwick deliberately. Real NHS
  // Trusts are an England/Wales/NI structure; Scotland's equivalent is an
  // NHS Health Board, so a Scottish site under an English "Trust" would be
  // organizationally wrong, not just a naming detail. jurisdiction:
  // 'GB_SCT' is what actually matters here — it resolves to CHI Number
  // (not NHS Number) per PATIENT_ID_BY_JURISDICTION in systemConfig.ts,
  // which the system already modeled correctly; this client is what
  // exercises that path for the first time.
  {
    id: 'c-ardgowan-hb', name: 'Ardgowan NHS Health Board', assigningAuthority: 'ANHB',
    address: 'Health Board House, Ardgowan', phone: '+44 141 555 0200', fax: '', email: 'labs@ardgowan.scot.nhs.uk',
    clientType: 'internal', jurisdiction: 'GB_SCT', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  // ── Clients that existing Orchestration seed cases (mockOrchestratorCaseService.ts)
  // already reference by name, but never had a real Client record — the
  // clientId on those cases pointed at c1/c2/c4 (Metro General/Riverside/
  // Westview), a leftover mismatch from before the Client system was
  // reconciled. Added here with real ids and correct jurisdiction rather
  // than renaming the existing case narrative to a duller pre-existing
  // client; mockOrchestratorCaseService.ts's clientId fields updated to
  // match (see that file's own history note, June 2026).
  {
    id: 'c-stcatherines', name: "St. Catherine's University Hospital", assigningAuthority: 'SCUH',
    address: '', phone: '', fax: '', email: 'pathology@stcatherines.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c-westside', name: 'Westside Surgical Centre', assigningAuthority: 'WSSC',
    address: '', phone: '', fax: '', email: 'pathology@westsidesurgical.org',
    clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c-royal-manchester', name: 'Royal Manchester Centre', assigningAuthority: 'RMANC',
    address: '', phone: '', fax: '', email: 'pathology@royalmanchester.nhs.uk',
    clientType: 'external', jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    // Set specifically so the numeric-specimen style is immediately
    // demonstrable without an admin having to configure it first —
    // deliberately NOT set on Fenwick General, which tomorrow's demo
    // runbook assumes uses the default alpha-specimen style.
    specimenLabelStyle: 'numeric-specimen',
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
];

const load = () => storageGet<Client[]>('pathscribe_clients', SEED_CLIENTS);
const persist = (data: Client[]) => storageSet('pathscribe_clients', data);
let MOCK_CLIENTS: Client[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockClientService: IClientService = {
  async getAll() { await delay(); return ok([...MOCK_CLIENTS]); },

  async getById(id: ID) {
    await delay();
    const c = MOCK_CLIENTS.find(c => c.id === id);
    return c ? ok({ ...c }) : err(`Client ${id} not found`);
  },

  async add(client) {
    await delay();
    const nowIso = new Date().toISOString();
    const newC: Client = withDerivedContactName({ ...client, id: 'c' + Date.now(), createdAt: nowIso, updatedAt: nowIso });
    MOCK_CLIENTS = [...MOCK_CLIENTS, newC];
    persist(MOCK_CLIENTS);
    return ok({ ...newC });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_CLIENTS.findIndex(c => c.id === id);
    if (idx === -1) return err(`Client ${id} not found`);
    MOCK_CLIENTS = MOCK_CLIENTS.map(c => c.id === id ? withDerivedContactName({ ...c, ...changes, updatedAt: new Date().toISOString() }) : c);
    persist(MOCK_CLIENTS);
    return ok({ ...MOCK_CLIENTS[idx] });
  },

  async deactivate(id) { return mockClientService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockClientService.update(id, { status: 'Active' }); },
  async verify(id) { return mockClientService.update(id, { status: 'Active' }); },

  async findOrCreateByAssigningAuthority(assigningAuthority, name, note) {
    await delay();
    const existing = MOCK_CLIENTS.find(c => c.assigningAuthority.toLowerCase() === assigningAuthority.toLowerCase());
    if (existing) return ok({ ...existing });

    const nowIso = new Date().toISOString();
    const newC: Client = {
      id: 'c-auto-' + Date.now(),
      name, assigningAuthority,
      address: '', phone: '', fax: '', email: '',
      // jurisdiction defaults to 'US' for auto-created clients — same
      // "safest default, force explicit admin setup" posture as the
      // pediatric/TAT fields below. Cannot be inferred from an order
      // code alone; an admin must set the real value on review.
      clientType: 'external', jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
      status: 'Unverified',
      pediatricAgeThreshold: null,             // safest default — never inherit another client's pediatric config
      authorizedPediatricPathologistIds: [],
      tatFirstTouchHours: null, tatTotalHours: null,  // inherits system defaults until an admin sets client-specific SLAs
      escalationTargets: [], escalationPriority: 'high',
      autoCreated: true,
      autoCreatedAt: nowIso.split('T')[0],
      autoCreatedNote: note,
      createdAt: nowIso, updatedAt: nowIso,
    };
    MOCK_CLIENTS = [...MOCK_CLIENTS, newC];
    persist(MOCK_CLIENTS);
    return ok({ ...newC });
  },
};
