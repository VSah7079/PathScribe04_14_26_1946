// @vitest-environment happy-dom
// Batch 716 (Pete, Oct 28 2026: "set demo data for Cytology Part 2"): seed integrity for the cytology demo data, and
// that a Full Reset brings it back. The training video needs the cytology card, the separate accession series, the
// protocols' default material and HPV order, the pending orders and the Cytology worklist to be reachable from the demo.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// These tests are about the seed data, not who may change configuration.
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

beforeEach(() => { localStorage.clear(); vi.resetModules(); });

/** Loads every seeded service fresh, as the app does on a first visit or after a Full Reset. */
async function loadSeeds() {
  const [{ mockSpecimenDictionaryService }, { mockDepartmentService }, { mockCaseMaskService }, { mockProtocolService }, { mockOrderIntakeService }] = await Promise.all([
    import('./mockSpecimenDictionaryService'),
    import('../departments/mockDepartmentService'),
    import('../caseRegistry/mockCaseMaskService'),
    import('../protocols/mockProtocolService'),
    import('../orderIntake/mockOrderIntakeService'),
  ]);
  const unwrap = <T,>(r: { ok: boolean; data?: T }): T => { if (!r.ok) throw new Error('seed load failed'); return r.data as T; };
  return {
    dictionary: unwrap(await mockSpecimenDictionaryService.getAll()),
    departments: unwrap(await mockDepartmentService.getAll()),
    masks: unwrap(await mockCaseMaskService.getAllMasks()),
    protocols: unwrap(await mockProtocolService.getAll()),
    orders: unwrap(await mockOrderIntakeService.listPendingOrders()),
    mockSpecimenDictionaryService, mockCaseMaskService,
  };
}

const isCytologyEntry = (e: { type: string }) => e.type === 'Cytology' || e.type === 'FNA';

describe('cytology demo specimen dictionary', () => {
  it('every cytology or FNA entry has a category, a department with its own accession series, and (when set) a protocol that exists', async () => {
    const { dictionary, departments, masks, protocols } = await loadSeeds();
    const cytology = dictionary.filter(isCytologyEntry);
    expect(cytology.length).toBeGreaterThanOrEqual(15);
    for (const e of cytology) {
      expect(['GYN_CYTOLOGY', 'NON_GYN_CYTOLOGY'], `${e.name} category`).toContain(e.specimenCategory);
      expect(departments.some(d => d.id === e.departmentId), `${e.name} department`).toBe(true);
      expect(masks.some(m => m.scopeType === 'department' && m.scopeId === e.departmentId), `${e.name} series`).toBe(true);
      if (e.protocolId) expect(protocols.some(p => p.id === e.protocolId), `${e.name} protocol`).toBe(true);
      expect(e.defaultBaseCptCode, `${e.name} has no invented CPT code`).toBeUndefined();
    }
    // GYN entries sit in GYN Cytology, non-GYN and FNA entries in the Non-GYN department.
    for (const e of cytology) expect(e.departmentId).toBe(e.specimenCategory === 'GYN_CYTOLOGY' ? 'cat-gyn-cytology' : 'cat-fluid-cytology');
  });

  it('has the entries the Accession Part 2 video names, spelled exactly', async () => {
    const { dictionary } = await loadSeeds();
    const names = new Set(dictionary.filter(e => e.active).map(e => e.name));
    for (const n of [
      'Cervical/Vaginal Pap Smear', 'Pap Test, Liquid-Based (ThinPrep)', 'Pap Test, Liquid-Based (SurePath)', 'Pap Test with HPV Co-test (ThinPrep)',
      'Self-Collected Vaginal Swab (HPV Only)', 'Urine Cytology', 'Pleural Fluid Cytology', 'Peritoneal Fluid Cytology', 'Cerebrospinal Fluid Cytology',
      'Bronchial Washing/Brushing Cytology', 'Sputum Cytology', 'Thyroid Fine Needle Aspiration', 'Lymph Node, Fine Needle Aspiration',
      'Breast, Fine Needle Aspiration', 'Salivary Gland, Fine Needle Aspiration',
    ]) expect(names.has(n), n).toBe(true);
  });

  it('every surgical starter entry belongs to Surgical Tissue and Consult entries to Consultation', async () => {
    const { dictionary } = await loadSeeds();
    const surgical = dictionary.filter(e => ['Biopsy', 'Resection', 'Excision', 'Gross Only', 'Kidney'].includes(e.type));
    expect(surgical.length).toBeGreaterThan(50);
    for (const e of surgical) expect(e.departmentId, e.name).toBe('cat-surgical-tissue');
    for (const e of dictionary.filter(x => x.type === 'Consult')) expect(e.departmentId, e.name).toBe('cat-histology-only');
  });

  it('keeps the ids the existing demo cases and crosswalk point at', async () => {
    const { dictionary } = await loadSeeds();
    for (const id of ['sp-cyto-pap', 'sp-cyto-hpv-self', 'sp-fna-thyroid', 'sp034', 'sp-kidney-native-biopsy', 'sp-heart-autopsy']) expect(dictionary.some(e => e.id === id), id).toBe(true);
    expect(dictionary.find(e => e.id === 'sp-heart-autopsy')?.departmentId).toBeUndefined();
  });

  it('non-GYN entries carry an organ site, and a default synoptic template only where one ships', async () => {
    const { dictionary } = await loadSeeds();
    const { CYTOLOGY_SYNOPTIC_TEMPLATES } = await import('../cytology/cytologySynopticTemplateRegistry');
    const shipped = new Set(CYTOLOGY_SYNOPTIC_TEMPLATES.map(t => t.id));
    for (const e of dictionary.filter(x => x.specimenCategory === 'NON_GYN_CYTOLOGY')) {
      expect(e.organSite, e.name).toBeTruthy();
      if (e.defaultSynopticTemplateId) expect(shipped.has(e.defaultSynopticTemplateId), `${e.name} template`).toBe(true);
    }
  });
});

describe('accession series (Case Mask)', () => {
  it('every department has at most one mask and every mask prefix is unique', async () => {
    const { masks } = await loadSeeds();
    const keys = masks.map(m => `${m.scopeType}::${m.scopeId}`);
    expect(new Set(keys).size).toBe(keys.length);
    const prefixes = masks.map(m => m.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('a Pap, a thyroid FNA, a surgical biopsy and a consultation draw visibly different numbers', async () => {
    const { dictionary, mockCaseMaskService } = await loadSeeds();
    const { resolveCaseMaskScopeCandidates } = await import('../caseRegistry/resolveCaseMaskScopeCandidates');
    const numberFor = async (id: string) => {
      const entry = dictionary.find(e => e.id === id)!;
      const res = await mockCaseMaskService.allocateNextCaseNumber(resolveCaseMaskScopeCandidates(entry.departmentId, undefined, []), 'America/Phoenix');
      if (!res.ok) throw new Error('allocation failed');
      return res.data;
    };
    expect(await numberFor('sp-cyto-pap-hpv-cotest')).toMatch(/^GYN\d\d-0001$/);
    expect(await numberFor('sp-fna-thyroid')).toMatch(/^NG\d\d-0001$/);
    expect(await numberFor('sp001')).toMatch(/^S\d\d-0001$/);
    expect(await numberFor('sp-cyto-pap')).toMatch(/^GYN\d\d-0002$/); // the series counts on
  });
});

describe('cytology protocols', () => {
  it('only the HPV protocols send an outbound order, and it is the HPV assay', async () => {
    const { protocols } = await loadSeeds();
    const { resolveOutboundMolecularAssaysForProtocol } = await import('@/utils/resolveOutboundMolecularAssaysForProtocol');
    const byId = (id: string) => protocols.find(p => p.id === id);
    expect(resolveOutboundMolecularAssaysForProtocol(byId('proto-gyn-pap-thinprep-hpv-cotest'))).toEqual(['st-hpv-reflex']);
    expect(resolveOutboundMolecularAssaysForProtocol(byId('proto-hpv-only-swab'))).toEqual(['st-hpv-highrisk-screen']);
    for (const id of ['proto-nongyn-fluid-cellblock', 'proto-fna-cellblock']) expect(resolveOutboundMolecularAssaysForProtocol(byId(id)), id).toEqual([]);
  });

  it('the fluid protocol makes two cell block decants by default, and every pathway is a decant on a stain that exists', async () => {
    const { protocols } = await loadSeeds();
    const { mockStainTypeService } = await import('../stains/mockStainTypeService');
    const stains = await mockStainTypeService.getAll();
    const stainIds = new Set(stains.ok ? stains.data.map(s => s.id) : []);
    const fluid = protocols.find(p => p.id === 'proto-nongyn-fluid-cellblock')!;
    expect(fluid.pathways.find(p => p.pathwayName === 'Cell Block')).toMatchObject({ materialKind: 'decant', defaultCount: 2 });
    for (const id of ['proto-gyn-pap-thinprep-hpv-cotest', 'proto-hpv-only-swab', 'proto-nongyn-fluid-cellblock', 'proto-fna-cellblock']) {
      for (const pw of protocols.find(p => p.id === id)!.pathways) {
        expect(pw.materialKind, `${id}/${pw.pathwayName}`).toBe('decant');
        for (const t of pw.tasks) for (const s of t.stainTypeIds) expect(stainIds.has(s), `${id}: ${s}`).toBe(true);
      }
    }
  });
});

describe('pending cytology orders (Import from Order)', () => {
  it('each cytology order names a dictionary entry exactly, so it imports onto that entry', async () => {
    const { orders, dictionary } = await loadSeeds();
    const cytologyOrders = orders.filter(o => ['ord-030', 'ord-031', 'ord-032', 'ord-033', 'ord-034', 'ord-035', 'ord-036', 'ord-037'].includes(o.id));
    expect(cytologyOrders).toHaveLength(8);
    for (const o of cytologyOrders) {
      expect(o.clinicalIndication, o.id).toBeTruthy();
      for (const s of o.specimens) {
        const entry = dictionary.find(e => e.active && e.name.toLowerCase() === s.description.toLowerCase());
        expect(entry, `${o.id}: ${s.description}`).toBeTruthy();
        expect(isCytologyEntry(entry!), o.id).toBe(true);
      }
    }
    expect(cytologyOrders.find(o => o.id === 'ord-030')?.clinicalIndication).toMatch(/HPV co-test requested/);
  });

  it('the orders are fictional MGH / RMC / NSC orders whose assigning authority matches a seeded facility', async () => {
    const { orders } = await loadSeeds();
    const { mockFacilityService } = await import('../facilities/mockFacilityService');
    const facilities = await mockFacilityService.getAll();
    const authorities = new Set(facilities.ok ? facilities.data.map(f => f.assigningAuthority) : []);
    for (const o of orders.filter(x => /^ord-03[0-7]$/.test(x.id))) expect(authorities.has(o.externalAssigningAuthority), o.id).toBe(true);
  });
});

describe('the Cytology worklist sees the demo cytology cases', () => {
  it('a GYN Pap and a thyroid FNA both qualify for the Cytology worklist under the demo routing, and a surgical case does not', async () => {
    const { dictionary } = await loadSeeds();
    const { mockCytologyRoutingSettingsService } = await import('../cytology/mockCytologyRoutingSettingsService');
    const { resolveCaseCytologyWorklistMembership } = await import('../cytology/resolveCaseCytologyWorklistMembership');
    const routing = await mockCytologyRoutingSettingsService.get();
    if (!routing.ok) throw new Error('routing failed');
    expect(routing.data.nonGynCytologyRouting).toBe('cytology_worklist');
    const on = (id: string) => resolveCaseCytologyWorklistMembership([{ specimenDictionaryEntryId: id }], dictionary, routing.data.nonGynCytologyRouting, 'co_testing');
    for (const id of ['sp-cyto-pap-hpv-cotest', 'sp-cyto-pap-thinprep', 'sp-fna-thyroid', 'sp-fna-breast', 'sp036', 'sp034', 'sp-cyto-csf']) expect(on(id), id).toBe(true);
    expect(on('sp001')).toBe(false);
  });
});

describe('Full Reset restores the cytology demo data', () => {
  it('an edited dictionary, department list and mask counter come back as seeded', async () => {
    const first = await loadSeeds();
    await first.mockSpecimenDictionaryService.replaceDictionary([]);
    await first.mockCaseMaskService.allocateNextCaseNumber([{ scopeType: 'department', scopeId: 'cat-gyn-cytology' }], 'America/Phoenix');
    const { resetAllDemoData } = await import('../demoReset/demoReset');
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } });
    expect(res.ok).toBe(true);
    vi.resetModules();
    const again = await loadSeeds();
    expect(again.dictionary.find(e => e.id === 'sp-cyto-pap-hpv-cotest')).toMatchObject({ specimenCategory: 'GYN_CYTOLOGY', departmentId: 'cat-gyn-cytology' });
    expect(again.departments.some(d => d.id === 'cat-gyn-cytology')).toBe(true);
    expect(again.masks.find(m => m.scopeId === 'cat-gyn-cytology')).toMatchObject({ prefix: 'GYN', currentSequence: 0 });
    expect(again.orders.some(o => o.id === 'ord-030')).toBe(true);
    expect(again.protocols.some(p => p.id === 'proto-nongyn-fluid-cellblock')).toBe(true);
  });
});
