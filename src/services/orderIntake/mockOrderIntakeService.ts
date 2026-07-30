// src/services/orderIntake/mockOrderIntakeService.ts

import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type {
  IOrderIntakeService, IncomingOrder, SpecimenCodeCrosswalkEntry, OrderResolutionResult,
} from './IOrderIntakeService';
import { mockClientService } from '../clients/mockClientService';
import { mockSpecimenCategoryService } from '../specimenCategories/mockSpecimenCategoryService';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 100));

// Used below for the 12 newer orders — the original 3 use hardcoded
// literal timestamps instead, kept as-is rather than converted.
const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// ─── Crosswalk seed data ────────────────────────────────────────────────────
// A couple of pre-learned mappings, as if an admin (or a prior auto-create
// cycle) had already resolved these once. Deliberately left gaps —
// PENDING_ORDERS below includes orders that WON'T find a crosswalk match,
// to demonstrate the fallback path, not just the happy path.
//
// dictionaryEntryId values: 'sp-kidney-native-biopsy' is a hand-added
// entry appended after specimens-starter.json's own data in
// mockSpecimenDictionaryService.ts, confirmed real. 'sp034' (Pleural
// Fluid Cytology) is confirmed real too — verified directly against
// specimens-starter.json once it was shared; both entries have
// specimenCategoryId: null in the real starter data (true for all 60
// starter entries, not just these two), so resolving through either
// will exercise the "dictionary entry has no category yet" fallback
// path in resolveOrder() — that's accurate to the real seed data, not
// an artifact of picking these two specifically.
const SEED_CROSSWALK: SpecimenCodeCrosswalkEntry[] = [
  {
    id: 'xwalk-001', clientId: 'c-fenwick-general', externalCode: 'SURG-01',
    dictionaryEntryId: 'sp-kidney-native-biopsy', createdAt: '2026-05-10', createdBy: 'admin',
  },
  {
    id: 'xwalk-002', clientId: 'c-royal-manchester', externalCode: 'CYTO-FL',
    dictionaryEntryId: 'sp034', createdAt: '2026-05-12', createdBy: 'admin',
  },
];

const loadCrosswalk    = () => storageGet<SpecimenCodeCrosswalkEntry[]>('pathscribe_specimen_crosswalk', SEED_CROSSWALK);
const persistCrosswalk = (data: SpecimenCodeCrosswalkEntry[]) => storageSet('pathscribe_specimen_crosswalk', data);
let CROSSWALK: SpecimenCodeCrosswalkEntry[] = loadCrosswalk();

// ─── Pending orders seed data ───────────────────────────────────────────────
// Three orders, each demonstrating a different resolution path:
//   ORD-001 — Fenwick General, known assigning authority + crosswalked specimen
//             code → resolves cleanly, no auto-creation at all.
//   ORD-002 — assigning authority 'NEWCLINIC01' doesn't match any existing
//             Client.assigningAuthority → demonstrates clientWasAutoCreated.
//   ORD-003 — Royal Manchester (known client) but a specimen code with no
//             crosswalk entry → demonstrates categoryWasAutoCreated,
//             independent of client resolution.
// None are pre-resolved — clientId/specimenCategoryId are left undefined
// until resolveOrder() actually runs, same as a real order would arrive
// unresolved and get processed by the Accession page.
const SEED_ORDERS: IncomingOrder[] = [
  {
    id: 'ord-001', externalOrderNumber: 'FGH-ORD-88213', source: 'hl7',
    receivedAt: '2026-06-29T08:14:00.000Z', status: 'pending',
    externalAssigningAuthority: 'FGH',
    patient: { firstName: 'Margaret', lastName: 'Wilcox', dateOfBirth: '1958-02-11', sex: 'F', mrn: '' },
    requestingProvider: 'Mr. Ian Faulkner', priority: 'Routine',
    clinicalIndication: 'Right breast lump on screening mammography, BI-RADS 4. Core needle biopsy for histological diagnosis.',
    icd10Codes: [{ code: 'N63.10', description: 'Unspecified lump in right breast' }],
    specimens: [
      { description: 'Right breast core needle biopsy', externalSpecimenCode: 'SURG-01' },
    ],
    rawMessage: 'MSH|^~\\&|LIS|FGH|PATHSCRIBE|LAB|20260629081400||ORM^O01|MSG88213|P|2.5.1',
  },
  {
    id: 'ord-002', externalOrderNumber: 'NC-2026-0447', source: 'api',
    receivedAt: '2026-06-29T09:02:00.000Z', status: 'pending',
    externalAssigningAuthority: 'NEWCLINIC01',
    patient: { firstName: 'Daniel', lastName: 'Ortiz', dateOfBirth: '1990-07-23', sex: 'M', mrn: '778812' },
    requestingProvider: 'Dr. Priya Nair', priority: 'Routine',
    clinicalIndication: 'Suspicious pigmented lesion left forearm, changing over 3 months. Excisional biopsy.',
    specimens: [
      { description: 'Left forearm skin excision, pigmented lesion' },
    ],
  },
  {
    id: 'ord-003', externalOrderNumber: 'RMANC-ORD-55190', source: 'hl7',
    receivedAt: '2026-06-29T10:31:00.000Z', status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Robert', lastName: 'Fenn', dateOfBirth: '1971-11-04', sex: 'M', mrn: '' },
    requestingProvider: 'Mr. Colin Baxter', priority: 'STAT',
    clinicalIndication: 'New pericardial effusion, unknown aetiology. Pericardiocentesis for cytological evaluation.',
    specimens: [
      // 'PERI-FL-01' has no crosswalk entry for this client — the
      // resolution path this order exists to demonstrate.
      { description: 'Pericardial fluid, pericardiocentesis', externalSpecimenCode: 'PERI-FL-01' },
    ],
    rawMessage: 'MSH|^~\\&|LIS|RMANC|PATHSCRIBE|LAB|20260629103100||ORM^O01|MSG55190|P|2.5.1',
  },

  // ── 12 new orders, 3 each for Pete, Amber, Bronwyn, and Paul —────────────
  // for the reviewer whose name is on each block to accession themselves
  // during testing. Deliberately different specimen types from each
  // person's own existing worklist cases, for broader coverage rather
  // than repeating what they've already seen.

  // — Pete (Fenwick General / St. Catherine's) —
  {
    id: 'ord-004', externalOrderNumber: 'FGH-ORD-88301', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'FGH',
    patient: { firstName: 'Harold', lastName: 'Whitfield', dateOfBirth: '1951-06-02', sex: 'M', mrn: '' },
    requestingProvider: 'Dr. Naomi Blackwood', priority: 'Routine',
    clinicalIndication: 'Slowly enlarging nodule on the nose, pearly appearance with telangiectasia. Clinically suspicious for basal cell carcinoma. Shave excision.',
    specimens: [{ description: 'Nose, skin excision — pearly nodule', externalSpecimenCode: 'SURG-01' }],
    rawMessage: 'MSH|^~\\&|LIS|FGH|PATHSCRIBE|LAB|' + isoDaysAgo(0).replace(/[-:T.Z]/g, '').slice(0, 14) + '||ORM^O01|MSG88301|P|2.5.1',
  },
  {
    id: 'ord-005', externalOrderNumber: 'SCUH-ORD-22014', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'SCUH',
    patient: { firstName: 'Denise', lastName: 'Palowski', dateOfBirth: '1985-09-19', sex: 'F', mrn: '' },
    requestingProvider: 'Dr. Rebecca Sung', priority: 'Routine',
    clinicalIndication: 'Colposcopy: HSIL (CIN2) on cervical biopsy, HPV 16/18 positive. LEEP/LLETZ excision for definitive treatment.',
    specimens: [{ description: 'Cervix, LEEP excision', externalSpecimenCode: 'SURG-01' }],
  },
  {
    id: 'ord-006', externalOrderNumber: 'FGH-ORD-88322', source: 'api',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'FGH',
    patient: { firstName: 'Walter', lastName: 'Bramwell', dateOfBirth: '1962-01-27', sex: 'M', mrn: '' },
    requestingProvider: 'Dr. Anita Kapoor', priority: 'Routine',
    clinicalIndication: 'Pancytopenia of unknown cause, 6-week workup. Peripheral smear shows dysplastic changes. Bone marrow biopsy and aspirate for morphological evaluation.',
    specimens: [{ description: 'Bone marrow biopsy and aspirate, posterior iliac crest' }],
  },

  // — Amber (Westside Surgical Centre) —
  {
    id: 'ord-007', externalOrderNumber: 'WSSC-ORD-71042', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'WSSC',
    patient: { firstName: 'Rosalind', lastName: 'Marchetti', dateOfBirth: '1969-04-14', sex: 'F', mrn: '' },
    requestingProvider: 'Dr. Wayne Ostrowski', priority: 'Routine',
    clinicalIndication: 'Symptomatic cholelithiasis with recurrent biliary colic. Ultrasound: multiple gallstones, wall thickening. Laparoscopic cholecystectomy.',
    specimens: [{ description: 'Gallbladder, cholecystectomy', externalSpecimenCode: 'SURG-01' }],
  },
  {
    id: 'ord-008', externalOrderNumber: 'WSSC-ORD-71058', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'WSSC',
    patient: { firstName: 'Constance', lastName: 'Ferreira', dateOfBirth: '1958-12-30', sex: 'F', mrn: '' },
    requestingProvider: 'Dr. Grace Ibekwe', priority: 'Routine',
    clinicalIndication: 'Postmenopausal bleeding. Transvaginal ultrasound: endometrial thickness 14mm. Pipelle endometrial biopsy to exclude malignancy.',
    specimens: [{ description: 'Endometrium, pipelle biopsy' }],
  },
  {
    id: 'ord-009', externalOrderNumber: 'WSSC-ORD-71075', source: 'api',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'WSSC',
    patient: { firstName: 'Bruce', lastName: 'Halvorsen', dateOfBirth: '1994-02-08', sex: 'M', mrn: '' },
    requestingProvider: 'Dr. Marcus Feldman', priority: 'STAT',
    clinicalIndication: 'Painless right testicular mass. Ultrasound: 2.8 cm heterogeneous intratesticular lesion, AFP and beta-hCG elevated. Radical inguinal orchiectomy.',
    specimens: [{ description: 'Right testis, radical orchiectomy' }],
  },

  // — Bronwyn (Royal Manchester Centre) —
  {
    id: 'ord-010', externalOrderNumber: 'RMANC-ORD-55221', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Diane', lastName: 'Postlethwaite', dateOfBirth: '2014-05-06', sex: 'F', mrn: '' },
    requestingProvider: 'Mr. Julian Bardsley', priority: 'Routine',
    clinicalIndication: 'Recurrent tonsillitis, 6 episodes in the past year, with one tonsil grossly asymmetric — query lymphoma. Bilateral tonsillectomy.',
    specimens: [{ description: 'Bilateral tonsils, tonsillectomy', externalSpecimenCode: 'SURG-01' }],
  },
  {
    id: 'ord-011', externalOrderNumber: 'RMANC-ORD-55247', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Reginald', lastName: 'Openshaw', dateOfBirth: '1979-08-21', sex: 'M', mrn: '' },
    requestingProvider: 'Dr. Priyanka Desai', priority: 'STAT',
    clinicalIndication: 'Nephrotic syndrome — proteinuria 6.2g/24hr, hypoalbuminaemia, oedema. Renal ultrasound normal size, no obstruction. Percutaneous renal biopsy for medical renal workup.',
    specimens: [{ description: 'Kidney, percutaneous core biopsy — native, medical renal' }],
  },
  {
    id: 'ord-012', externalOrderNumber: 'RMANC-ORD-55263', source: 'api',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Sheila', lastName: 'Trenholme', dateOfBirth: '1966-10-11', sex: 'F', mrn: '' },
    requestingProvider: 'Dr. Aidan Foster', priority: 'Routine',
    clinicalIndication: 'Enlarging left axillary lymphadenopathy over 8 weeks, associated night sweats. PET-CT: hypermetabolic nodal mass. Excisional lymph node biopsy for lymphoma staging.',
    specimens: [{ description: 'Left axillary lymph node, excisional biopsy' }],
  },

  // — Paul (Royal Manchester Centre) —
  {
    id: 'ord-013', externalOrderNumber: 'RMANC-ORD-55289', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Norman', lastName: 'Ridgeway', dateOfBirth: '1988-03-25', sex: 'M', mrn: '' },
    requestingProvider: 'Dr. Fatima Al-Rashid', priority: 'Routine',
    clinicalIndication: 'Chronic scaly plaques, extensor surfaces, poor response to topical steroids. Query psoriasis vs. eczema vs. cutaneous lymphoma. Punch biopsy for histological confirmation.',
    specimens: [{ description: 'Skin, punch biopsy — extensor forearm', externalSpecimenCode: 'SURG-01' }],
  },
  {
    id: 'ord-014', externalOrderNumber: 'RMANC-ORD-55304', source: 'hl7',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Vera', lastName: 'Cholmondeley', dateOfBirth: '1957-07-17', sex: 'F', mrn: '' },
    requestingProvider: 'Miss Amara Osei', priority: 'Routine',
    clinicalIndication: 'Submandibular gland swelling, FNA suspicious for pleomorphic adenoma. Submandibular gland excision.',
    specimens: [{ description: 'Submandibular gland, excision' }],
  },
  {
    id: 'ord-015', externalOrderNumber: 'RMANC-ORD-55318', source: 'api',
    receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'RMANC',
    patient: { firstName: 'Trevor', lastName: 'Pickersgill', dateOfBirth: '1996-11-30', sex: 'M', mrn: '' },
    requestingProvider: 'Mr. Duncan Wray', priority: 'STAT',
    clinicalIndication: 'Acute right iliac fossa pain, 18 hours, guarding on examination, raised CRP and white cell count. Clinical diagnosis of acute appendicitis. Emergency laparoscopic appendicectomy.',
    specimens: [{ description: 'Appendix, appendicectomy' }],
  },
];

const loadOrders    = () => storageGet<IncomingOrder[]>('pathscribe_incoming_orders', SEED_ORDERS);
const persistOrders = (data: IncomingOrder[]) => storageSet('pathscribe_incoming_orders', data);
let ORDERS: IncomingOrder[] = loadOrders();

export const mockOrderIntakeService: IOrderIntakeService = {

  async listPendingOrders(params) {
    await delay();
    let results = ORDERS.filter(o => o.status === 'pending');
    if (params?.clientId) results = results.filter(o => o.clientId === params.clientId);
    return ok([...results]);
  },

  async getOrder(orderId: ID) {
    await delay();
    const o = ORDERS.find(o => o.id === orderId);
    return o ? ok({ ...o }) : err(`Order ${orderId} not found`);
  },

  async markOrderLinked(orderId, caseId) {
    await delay();
    const idx = ORDERS.findIndex(o => o.id === orderId);
    if (idx === -1) return err(`Order ${orderId} not found`);
    ORDERS = ORDERS.map(o => o.id === orderId ? { ...o, status: 'linked' as const, linkedCaseId: caseId } : o);
    persistOrders(ORDERS);
    return ok({ ...ORDERS[idx] });
  },

  async receiveOrder(order) {
    await delay();
    const newO: IncomingOrder = { ...order, id: 'ord-' + Date.now(), status: 'pending', receivedAt: new Date().toISOString() };
    ORDERS = [...ORDERS, newO];
    persistOrders(ORDERS);
    return ok({ ...newO });
  },

  async resolveOrder(orderId: ID) {
    await delay();
    const idx = ORDERS.findIndex(o => o.id === orderId);
    if (idx === -1) return err(`Order ${orderId} not found`);
    const order = { ...ORDERS[idx] };
    const warnings: string[] = [];

    // ── Client resolution — Client.assigningAuthority IS the crosswalk key, no
    // separate client crosswalk table needed. ──────────────────────────
    const clientsRes = await mockClientService.getAll();
    const clients = clientsRes.ok ? clientsRes.data : [];
    const clientMatch = clients.find(c => c.assigningAuthority.toLowerCase() === order.externalAssigningAuthority.toLowerCase());

    if (clientMatch) {
      order.clientId = clientMatch.id;
      order.clientWasAutoCreated = false;
    } else {
      const created = await mockClientService.findOrCreateByAssigningAuthority(
        order.externalAssigningAuthority,
        `Unrecognized client (order ${order.externalOrderNumber})`,
        `No Client.assigningAuthority match for "${order.externalAssigningAuthority}" on incoming order ${order.externalOrderNumber} — created pending admin review.`
      );
      if (created.ok) {
        order.clientId = created.data.id;
        order.clientWasAutoCreated = true;
        warnings.push(`No existing client matched assigning authority "${order.externalAssigningAuthority}" — created "${created.data.name}" as Unverified, pending admin review.`);
      }
    }

    // ── Per-specimen resolution — Specimen Dictionary first, category
    // derived transitively ────────────────────────────────────────────
    const dictionaryRes = await mockSpecimenDictionaryService.getAll();
    const dictionary = dictionaryRes.ok ? dictionaryRes.data : [];

    const resolvedSpecimens = await Promise.all(order.specimens.map(async (spec) => {
      // Crosswalk match first, if this specimen came with a code —
      // resolves to a specific SpecimenEntry, not straight to a
      // category, so "TISSUE-01" resolves to "Left breast core biopsy"
      // and its category follows transitively, not a bare category
      // guess that loses the actual specimen type.
      if (spec.externalSpecimenCode && order.clientId) {
        const xwalkMatch = CROSSWALK.find(
          x => x.clientId === order.clientId && x.externalCode.toLowerCase() === spec.externalSpecimenCode!.toLowerCase()
        );
        const entry = xwalkMatch ? dictionary.find(d => d.id === xwalkMatch.dictionaryEntryId) : undefined;
        if (entry) {
          return {
            ...spec,
            dictionaryEntryId: entry.id, dictionaryEntryWasAutoCreated: false,
            specimenCategoryId: entry.specimenCategoryId, categoryWasAutoCreated: false,
          };
        }
      }

      // No crosswalk match (or no code at all) — fall back to the
      // Specimen Dictionary's own findOrCreateByName using whatever text
      // is available, same fail-open posture as everywhere else. A new
      // crosswalk entry is learned immediately so the same code resolves
      // instantly next time, even though the entry itself still needs
      // admin sign-off.
      const nameGuess = spec.externalSpecimenCode ?? spec.description;
      const created = await mockSpecimenDictionaryService.findOrCreateByName(
        nameGuess,
        `No crosswalk match for specimen "${spec.description}"${spec.externalSpecimenCode ? ` (code "${spec.externalSpecimenCode}")` : ''} on order ${order.externalOrderNumber} from client assigning authority "${order.externalAssigningAuthority}" — created pending admin review.`
      );
      if (!created.ok) return spec;

      const wasAutoCreated = !!created.data.autoCreated;
      if (wasAutoCreated && spec.externalSpecimenCode && order.clientId) {
        const newEntry: SpecimenCodeCrosswalkEntry = {
          id: 'xwalk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          clientId: order.clientId,
          externalCode: spec.externalSpecimenCode,
          dictionaryEntryId: created.data.id,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        };
        CROSSWALK = [...CROSSWALK, newEntry];
        persistCrosswalk(CROSSWALK);
      }
      if (wasAutoCreated) {
        warnings.push(`No crosswalk match for specimen "${spec.description}" — created Specimen Dictionary entry "${created.data.name}" as pending admin review.`);
      }

      // The matched/created dictionary entry may not have a category set
      // yet (a brand-new auto-created entry never does; an existing one
      // might not either — see SpecimenEntry.specimenCategoryId's own
      // "optional, additive" doc comment). Falling back to category-level
      // findOrCreateByName here is a deliberate, documented
      // simplification: it derives a usable category immediately (never
      // blocks order processing) without writing the link back onto the
      // dictionary entry itself — that reconciliation is left for an
      // admin, same as everywhere else in this fail-open pattern, rather
      // than silently auto-linking a guess.
      let specimenCategoryId = created.data.specimenCategoryId;
      let categoryWasAutoCreated = false;
      if (!specimenCategoryId) {
        const catCreated = await mockSpecimenCategoryService.findOrCreateByName(
          nameGuess,
          `No category on Specimen Dictionary entry "${created.data.name}" for specimen "${spec.description}" on order ${order.externalOrderNumber} — created pending admin review.`
        );
        if (catCreated.ok) {
          specimenCategoryId = catCreated.data.id;
          categoryWasAutoCreated = !!catCreated.data.autoCreated;
          if (categoryWasAutoCreated) {
            warnings.push(`Specimen Dictionary entry "${created.data.name}" has no category — created Specimen Category "${catCreated.data.name}" as Unverified, pending admin review.`);
          }
        }
      }

      return {
        ...spec,
        dictionaryEntryId: created.data.id, dictionaryEntryWasAutoCreated: wasAutoCreated,
        specimenCategoryId, categoryWasAutoCreated,
      };
    }));

    order.specimens = resolvedSpecimens;
    ORDERS = ORDERS.map(o => o.id === orderId ? order : o);
    persistOrders(ORDERS);

    const result: OrderResolutionResult = { order, warnings };
    return ok(result);
  },

  // ── Crosswalk management ────────────────────────────────────────────────
  async listCrosswalkEntries(clientId?: string) {
    await delay();
    const results = clientId ? CROSSWALK.filter(x => x.clientId === clientId) : CROSSWALK;
    return ok([...results]);
  },

  async addCrosswalkEntry(entry) {
    await delay();
    const newEntry: SpecimenCodeCrosswalkEntry = { ...entry, id: 'xwalk-' + Date.now(), createdAt: new Date().toISOString() };
    CROSSWALK = [...CROSSWALK, newEntry];
    persistCrosswalk(CROSSWALK);
    return ok({ ...newEntry });
  },
};
