// src/services/specimenCategories/mockSpecimenCategoryService.ts
import type { ISpecimenCategoryService, SpecimenCategory } from './ISpecimenCategoryService';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

// ─── Seed data ──────────────────────────────────────────────────────────────
// One category per existing Grossing Route (protocolShared.tsx's three
// PROTOCOL_REGISTRY entries with isDiagnostic: false), plus one deliberately
// Unverified/autoCreated example so the admin approval screen has something
// to show before any real order intake exists.
const SEED_SPECIMEN_CATEGORIES: SpecimenCategory[] = [
  {
    id: 'cat-surgical-tissue',
    name: 'Surgical Tissue',
    description: 'Solid tissue biopsies and resections — sectioned, measured, inked, submitted for histology. Core needle biopsy, excisional biopsy, lumpectomy, colectomy, hysterectomy, lobectomy, radical prostatectomy, lymph node dissection, skin excision.',
    defaultGrossingTemplateId: 'grossing_standard_tissue',
    // Real per-category numbering, wired into mockCaseRegistryService's
    // allocateNextCaseNumber (previously every category shared the same
    // hardcoded 'O' prefix and no category ever had its own series,
    // despite these fields existing). 'S' for Surgical Pathology.
    accessionPrefix: 'S',
    numberSeries: 'SURGICAL',
    status: 'Active',
  },
  {
    id: 'cat-fluid-cytology',
    name: 'Fluid / Cytology',
    description: 'Fluid, wash, or cytological specimens processed for cell block/smear rather than sectioning. Pleural fluid, peritoneal lavage, BAL, urine cytology, CSF, ascites, pericardial fluid, thyroid FNA, bronchial wash.',
    defaultGrossingTemplateId: 'grossing_fluid_cytology',
    // 'NG' — Non-GYN Cytology. This category's description is entirely
    // non-gynecologic specimen types (no Pap smears), so it maps cleanly
    // onto the standard Non-GYN Cytology series without splitting into two.
    accessionPrefix: 'NG',
    numberSeries: 'CYTOLOGY_NONGYN',
    status: 'Active',
  },
  {
    id: 'cat-histology-only',
    name: 'Histology-Only / Consultation',
    description: 'Previously processed specimens needing histology prep only — no grossing steps. Outside consultation slides, previously embedded tissue for re-cut/re-stain, decalcified bone already grossed elsewhere, EM specimens.',
    defaultGrossingTemplateId: 'grossing_histology_only',
    // 'CS' — Consultation series, distinct from primary Surgical
    // accessions. A reasonable inference, not a universally fixed CAP
    // convention the way S/surgical and NG/non-GYN cytology are — worth
    // a quick sanity check against real lab practice.
    accessionPrefix: 'CS',
    numberSeries: 'CONSULTATION',
    status: 'Active',
  },
  // Deliberately Unverified/autoCreated — gives the admin approval screen
  // (once built) something real to display before any live order intake
  // exists, same reasoning as ph4/ph6 in mockPhysicianService.ts.
  // Left with the old inherited 'O' prefix and no numberSeries on
  // purpose: this isn't a settled real category yet (that's the whole
  // point of Unverified), and in real practice a frozen section is a
  // phase within its parent surgical case, not a separately-accessioned
  // specimen type — sharing the surgical series by default is
  // operationally correct here, not just unconfigured.
  {
    id: 'cat-auto-000001',
    name: 'Frozen Section',
    description: '',
    defaultGrossingTemplateId: 'grossing_standard_tissue',
    accessionPrefix: 'O',
    status: 'Unverified',
    autoCreated: true,
    autoCreatedAt: '2026-06-15',
    autoCreatedNote: 'No crosswalk match for order code "FRZ-INTRAOP" from client c2 — defaulted to Surgical Tissue\'s Grossing Template pending admin review.',
  },
];

const load    = () => storageGet<SpecimenCategory[]>('pathscribe_specimen_categories', SEED_SPECIMEN_CATEGORIES);
const persist = (data: SpecimenCategory[]) => storageSet('pathscribe_specimen_categories', data);
let CATEGORIES: SpecimenCategory[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockSpecimenCategoryService: ISpecimenCategoryService = {
  async getAll() {
    await delay();
    return ok([...CATEGORIES]);
  },

  async getById(id: ID) {
    await delay();
    const c = CATEGORIES.find(c => c.id === id);
    return c ? ok({ ...c }) : err(`Specimen Category ${id} not found`);
  },

  async add(category) {
    await delay();
    const newC: SpecimenCategory = { ...category, id: 'cat-' + Date.now() };
    CATEGORIES = [...CATEGORIES, newC];
    persist(CATEGORIES);
    return ok({ ...newC });
  },

  async update(id, changes) {
    await delay();
    const idx = CATEGORIES.findIndex(c => c.id === id);
    if (idx === -1) return err(`Specimen Category ${id} not found`);
    CATEGORIES = CATEGORIES.map(c => c.id === id ? { ...c, ...changes } : c);
    return ok({ ...CATEGORIES[idx], ...changes });
  },

  async verify(id) {
    return mockSpecimenCategoryService.update(id, { status: 'Active' });
  },

  async deactivate(id) {
    return mockSpecimenCategoryService.update(id, { status: 'Inactive' });
  },

  async findOrCreateByName(name, note) {
    await delay();
    // Case-insensitive exact match on name — same "don't fuzzy-match
    // silently" posture as the crosswalk design: a near-miss should
    // create a new pending category for a human to reconcile (e.g. merge
    // with an existing one), not get quietly folded into something that
    // might be a different workflow than the admin intended.
    const existing = CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return ok({ ...existing });

    const newC: SpecimenCategory = {
      id: 'cat-auto-' + Date.now(),
      name,
      description: '',
      defaultGrossingTemplateId: 'grossing_standard_tissue', // conservative fallback — same default evaluateGrossingTemplateAssignment fails open to
      accessionPrefix: 'O',
      status: 'Unverified',
      autoCreated: true,
      autoCreatedAt: new Date().toISOString().split('T')[0],
      autoCreatedNote: note,
    };
    CATEGORIES = [...CATEGORIES, newC];
    persist(CATEGORIES);
    return ok({ ...newC });
  },
};
