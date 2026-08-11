import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { Facility, IFacilityService } from './IFacilityService';

// Facility and IFacilityService now live in IFacilityService.ts — re-exporting
// here so every existing `import { mockFacilityService, Facility } from
// '.../mockFacilityService'` elsewhere in the app keeps working.
export type { Facility, IFacilityService };

// Default HL7/reporting settings for existing seed facilities — none of
// them have HL7 actually enabled today (no live interface exists yet per
// the order-intake design discussion), so this is a safe, honest default
// rather than fabricating configuration that isn't real.
const defaultHl7 = () => ({ sendingFacility: 'pathscribe', receivingFacility: '', hl7Version: '2.5.1', enabled: false });
const defaultReporting = () => ({ reportFormat: 'PDF' as const, deliveryMethod: 'Portal' as const, autoRelease: false, copyToReferring: false });

// Keeps the deprecated contactName string in sync with the structured
// contactGivenNames/contactFamilyNames fields, same mirroring pattern as
// withMirroredNames() in mockPhysicianService.ts.
function withDerivedContactName(f: Facility): Facility {
  if (!f.contactGivenNames && !f.contactFamilyNames) return f;
  const contactName = [f.contactNamePrefix, f.contactGivenNames, f.contactFamilyNames, f.contactNameSuffix]
    .map(p => p?.trim()).filter(Boolean).join(' ');
  return { ...f, contactName };
}

// ─── Mock ─────────────────────────────────────────────────────────────────────
// Real feature, per direct confirmation: migrated from clientType:
// 'internal' | 'external' to roles: FacilityRole[]. Migration rule applied
// mechanically, 1:1, no guessing:
//   clientType: 'external' → roles: ['external_ordering_client']
//   clientType: 'internal' → roles: ['performing_lab']
// (matches resolvePerformingLabFacilityId()'s existing fallback exactly —
// no functional change from the pre-rename behavior.)
//
// Real, explicitly flagged open question, per direct instruction ("flag
// ambiguous ones rather than guess"): "Some Fenwick facilities may also
// need internal_ordering_client if they originate orders internally (e.g.,
// inpatient wards ordering pathology). This is not always true for every
// facility, but it's common." Fenwick General/Women's/Children's Hospital
// are all plausible candidates (full-service hospitals with their own
// wards) — NOT added here, since this depends on real, specific knowledge
// of whether those facilities' wards actually place their own pathology
// orders, which isn't determinable from seed data alone. Review and add
// internal_ordering_client to whichever of these three actually apply.
const SEED_FACILITIES: Facility[] = [
  {
    id: 'c1', name: 'Metro General Hospital',   assigningAuthority: 'MGH',  address: '100 Main St',      phone: '555-2001', fax: '555-2002', email: 'lab@metrogeneral.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: 18,   authorizedPediatricPathologistIds: [],
    // Academic centre — tight SLAs negotiated in contract
    tatFirstTouchHours: 4,  tatTotalHours: 24,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'critical',
  },
  {
    id: 'c2', name: 'Riverside Medical Center', assigningAuthority: 'RMC',  address: '200 River Rd',     phone: '555-2003', fax: '555-2004', email: 'lab@riverside.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Community hospital — standard 2-day TAT
    tatFirstTouchHours: 8,  tatTotalHours: 48,
    escalationTargets: ['admin'], escalationPriority: 'high',
  },
  {
    id: 'c3', name: 'Northside Clinic',         assigningAuthority: 'NSC',  address: '300 North Ave',    phone: '555-2005', fax: '555-2006', email: 'lab@northside.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Small clinic — no custom targets, inherits system defaults
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c4', name: 'Westview Surgery Center',  assigningAuthority: 'WSC',  address: '400 West Blvd',    phone: '555-2007', fax: '555-2008', email: 'lab@westview.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active',   pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Surgical centre — rapid intra-op consults expected
    tatFirstTouchHours: 6,  tatTotalHours: 36,
    escalationTargets: ['pathGroup', 'referrer'], escalationPriority: 'high',
  },
  {
    id: 'c5', name: 'Eastpark Oncology',        assigningAuthority: 'EPO',  address: '500 East Park Dr', phone: '555-2009', fax: '555-2010', email: 'lab@eastpark.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Inactive', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    // Oncology centre — fast first touch, 24h total
    tatFirstTouchHours: 4,  tatTotalHours: 24,
    escalationTargets: ['pathGroup', 'admin', 'referrer'], escalationPriority: 'critical',
  },
  // Deliberately Unverified/autoCreated — gives the admin approval screen
  // something real to show before any live order intake exists.
  {
    id: 'c-auto-000001', name: 'Fairview Family Practice', assigningAuthority: 'FFP', address: '', phone: '', fax: '', email: '',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Unverified', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
    autoCreated: true, autoCreatedAt: '2026-06-20',
    autoCreatedNote: 'No crosswalk match for facility code "FFP-01" on an incoming order — created pending admin review.',
  },
  // ── NHS Trust example (England & Wales). One parent Trust record (no
  // parentId — it's the top-level institution) with three affiliate
  // hospitals underneath it via parentId. jurisdiction: 'GB_EW' — NHS
  // Number is the correct patient identifier standard here.
  {
    id: 'c-trust-fenwick', name: 'Fenwick NHS Foundation Trust', assigningAuthority: 'FNHS',
    address: 'Trust Headquarters, Fenwick', phone: '+44 191 555 0100', fax: '', email: 'info@fenwicknhs.nhs.uk',
    roles: ['performing_lab'], jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: ['admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-general', name: 'Fenwick General Hospital', assigningAuthority: 'FGH', parentId: 'c-trust-fenwick',
    address: '1 Trust Way, Fenwick', phone: '+44 191 555 0101', fax: '', email: 'pathology@fenwickgeneral.nhs.uk',
    // Real, open question flagged per direct instruction — see file
    // header. A full-service general hospital plausibly also
    // originates its own orders (inpatient wards) — review and add
    // 'internal_ordering_client' if that's true here.
    roles: ['performing_lab'], jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-womens', name: "Fenwick Women's Hospital", assigningAuthority: 'FWH', parentId: 'c-trust-fenwick',
    address: '2 Trust Way, Fenwick', phone: '+44 191 555 0102', fax: '', email: 'pathology@fenwickwomens.nhs.uk',
    // Same open question as Fenwick General above — review.
    roles: ['performing_lab'], jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  {
    id: 'c-fenwick-childrens', name: "Fenwick Children's Hospital", assigningAuthority: 'FCH', parentId: 'c-trust-fenwick',
    address: '3 Trust Way, Fenwick', phone: '+44 191 555 0103', fax: '', email: 'pathology@fenwickchildrens.nhs.uk',
    // Same open question as Fenwick General above — review.
    roles: ['performing_lab'], jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    // Pediatric hospital — every patient is under threshold, so every case
    // routes through the pediatric access gate by design, not exception.
    status: 'Active', pediatricAgeThreshold: 18, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 6, tatTotalHours: 36,
    escalationTargets: ['pathGroup', 'admin', 'referrer'], escalationPriority: 'critical',
  },
  // ── NHS Scotland example — separate from Fenwick deliberately. Real NHS
  // Trusts are an England/Wales/NI structure; Scotland's equivalent is an
  // NHS Health Board. jurisdiction: 'GB_SCT' resolves to CHI Number (not
  // NHS Number) per PATIENT_ID_BY_JURISDICTION in systemConfig.ts.
  {
    id: 'c-ardgowan-hb', name: 'Ardgowan NHS Health Board', assigningAuthority: 'ANHB',
    address: 'Health Board House, Ardgowan', phone: '+44 141 555 0200', fax: '', email: 'labs@ardgowan.scot.nhs.uk',
    roles: ['performing_lab'], jurisdiction: 'GB_SCT', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: 8, tatTotalHours: 48,
    escalationTargets: ['pathGroup', 'admin'], escalationPriority: 'high',
  },
  // ── Facilities that existing Orchestration seed cases
  // (mockOrchestratorCaseService.ts) already reference by name.
  {
    id: 'c-stcatherines', name: "St. Catherine's University Hospital", assigningAuthority: 'SCUH',
    address: '', phone: '', fax: '', email: 'pathology@stcatherines.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c-westside', name: 'Westside Surgical Centre', assigningAuthority: 'WSSC',
    address: '', phone: '', fax: '', email: 'pathology@westsidesurgical.org',
    roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
  {
    id: 'c-royal-manchester', name: 'Royal Manchester Centre', assigningAuthority: 'RMANC',
    address: '', phone: '', fax: '', email: 'pathology@royalmanchester.nhs.uk',
    roles: ['external_ordering_client'], jurisdiction: 'GB_EW', hl7: defaultHl7(), reporting: defaultReporting(),
    // Set specifically so the numeric-specimen style is immediately
    // demonstrable without an admin having to configure it first.
    specimenLabelStyle: 'numeric-specimen',
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null,
    escalationTargets: [], escalationPriority: 'high',
  },
];

// Real feature, per direct confirmation: full redesign from Client/
// clientType to Facility/roles — bumped storage key (was
// 'pathscribe_clients') so this seed data is what actually loads, rather
// than a stale, pre-migration localStorage snapshot silently winning.
const load = () => storageGet<Facility[]>('pathscribe_facilities', SEED_FACILITIES);
const persist = (data: Facility[]) => storageSet('pathscribe_facilities', data);
let MOCK_FACILITIES: Facility[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockFacilityService: IFacilityService = {
  async getAll() { await delay(); return ok([...MOCK_FACILITIES]); },

  async getById(id: ID) {
    await delay();
    const f = MOCK_FACILITIES.find(f => f.id === id);
    return f ? ok({ ...f }) : err(`Facility ${id} not found`);
  },

  async add(facility) {
    await delay();
    const nowIso = new Date().toISOString();
    const newF: Facility = withDerivedContactName({ ...facility, id: 'c' + Date.now(), createdAt: nowIso, updatedAt: nowIso });
    MOCK_FACILITIES = [...MOCK_FACILITIES, newF];
    persist(MOCK_FACILITIES);
    return ok({ ...newF });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_FACILITIES.findIndex(f => f.id === id);
    if (idx === -1) return err(`Facility ${id} not found`);
    MOCK_FACILITIES = MOCK_FACILITIES.map(f => f.id === id ? withDerivedContactName({ ...f, ...changes, updatedAt: new Date().toISOString() }) : f);
    persist(MOCK_FACILITIES);
    return ok({ ...MOCK_FACILITIES[idx] });
  },

  async deactivate(id) { return mockFacilityService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockFacilityService.update(id, { status: 'Active' }); },
  async verify(id) { return mockFacilityService.update(id, { status: 'Active' }); },

  async findOrCreateByAssigningAuthority(assigningAuthority, name, note) {
    await delay();
    const existing = MOCK_FACILITIES.find(f => f.assigningAuthority.toLowerCase() === assigningAuthority.toLowerCase());
    if (existing) return ok({ ...existing });

    const nowIso = new Date().toISOString();
    const newF: Facility = {
      id: 'c-auto-' + Date.now(),
      name, assigningAuthority,
      address: '', phone: '', fax: '', email: '',
      // jurisdiction defaults to 'US' for auto-created facilities — same
      // "safest default, force explicit admin setup" posture as the
      // pediatric/TAT fields below. Cannot be inferred from an order
      // code alone; an admin must set the real value on review. Role
      // defaults to external_ordering_client — an order-intake crosswalk
      // miss is, by construction, from an external submitter.
      roles: ['external_ordering_client'], jurisdiction: 'US', hl7: defaultHl7(), reporting: defaultReporting(),
      status: 'Unverified',
      pediatricAgeThreshold: null,             // safest default — never inherit another facility's pediatric config
      authorizedPediatricPathologistIds: [],
      tatFirstTouchHours: null, tatTotalHours: null,  // inherits system defaults until an admin sets facility-specific SLAs
      escalationTargets: [], escalationPriority: 'high',
      autoCreated: true,
      autoCreatedAt: nowIso.split('T')[0],
      autoCreatedNote: note,
      createdAt: nowIso, updatedAt: nowIso,
    };
    MOCK_FACILITIES = [...MOCK_FACILITIES, newF];
    persist(MOCK_FACILITIES);
    return ok({ ...newF });
  },
};
