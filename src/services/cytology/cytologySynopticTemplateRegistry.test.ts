// src/services/cytology/cytologySynopticTemplateRegistry.test.ts
// Batch 519 (PS-273): Cytology's synoptic templates are on the shared template model and come from the Synoptic
// Library — a lab's published cytology protocol reaches the Cytology screens; a retired one leaves the picker but
// still resolves for its reviews; the five bundled templates are the fallback and were carried over losslessly.
import { afterEach, describe, expect, it, vi } from 'vitest';
import thyroidRaw from '@/data/templates/Cytology/cytology_thyroid_fna_cytology.json';
import pancreaticobiliaryRaw from '@/data/templates/Cytology/cytology_pancreaticobiliary_cytology.json';
import salivaryRaw from '@/data/templates/Cytology/cytology_salivary_gland_fna_cytology.json';
import lymphRaw from '@/data/templates/Cytology/cytology_lymph_node_fna_cytology.json';
import urineRaw from '@/data/templates/Cytology/cytology_urine_cytology.json';
import {
  CYTOLOGY_SYNOPTIC_TEMPLATES, currentVersionOf, cytologyProtocolsToLoad, cytologySynopticChoices, cytologySynopticTemplateChoices,
  cytologySynopticTemplateForShortcut, ensureCytologySynopticTemplate, isCytologySynopticCategory, refreshCytologySynopticTemplates,
  resetCytologySynopticTemplateLibrary, resolveCytologySynopticTemplateById, type CytologyProtocolSummary,
} from './cytologySynopticTemplateRegistry';
import { normalizeSynopticTemplate } from '@/services/templates/normalizeSynopticTemplate';
import { resolveSynopticTemplateClinicalTierConsistency } from './resolveSynopticTemplateClinicalTierConsistency';
import { compileCytologySynopticNarrative } from './compileCytologySynopticNarrative';
import { authorsNarrative, narrativeSentenceMissesValue, narrativeText, withNarrativeSentence } from '@/services/templates/narrativeAuthoring';

afterEach(() => resetCytologySynopticTemplateLibrary());

const P = (id: string, status: string, extra: Partial<CytologyProtocolSummary> = {}): CytologyProtocolSummary =>
  ({ id, name: extra.name ?? id, category: 'CYTOLOGY_NONGYN', status, ...extra });

const protocols: CytologyProtocolSummary[] = [
  P('thyroid_fna_cytology', 'archived', { name: 'Thyroid FNA (v1)' }),
  P('lab_thyroid_v2', 'published', { name: 'Thyroid FNA (v2)', supersedesId: 'thyroid_fna_cytology' }),
  P('urine_cytology', 'published', { name: 'Urine Cytology' }),
  P('lab_urine_draft', 'draft', { name: 'Urine (draft)', supersedesId: 'urine_cytology' }),
  P('lab_pleural', 'published', { name: 'Pleural fluid (lab)' }),
  P('lymph_node_fna_cytology', 'deprecated', { name: 'Lymph node' }),
  { id: 'breast_invasive', name: 'Breast', category: 'BREAST', status: 'published' },
  { id: 'gyn', name: 'Pap', category: 'CYTOLOGY_GYN', status: 'published' },
];

describe('the bundled templates on the shared model', () => {
  const raws = [thyroidRaw, pancreaticobiliaryRaw, salivaryRaw, lymphRaw, urineRaw] as unknown as Record<string, unknown>[];
  it('the five JSONs are already in the shared shape: normalising them changes nothing', () => {
    for (const raw of raws) expect(normalizeSynopticTemplate(raw as never)).toEqual(raw);
    expect(CYTOLOGY_SYNOPTIC_TEMPLATES.map(t => t.id)).toEqual(['thyroid_fna_cytology', 'pancreaticobiliary_cytology', 'salivary_gland_fna_cytology', 'lymph_node_fna_cytology', 'urine_cytology']);
  });
  it('their Cytology content is all still there: narrative phrases and sentences, tiers, lexicon terms, standard', () => {
    for (const t of CYTOLOGY_SYNOPTIC_TEMPLATES) {
      const fields = t.sections.flatMap(s => s.fields);
      expect(t.standard).toBeTruthy();
      expect(fields.some(f => f.narrativeSentenceTemplate)).toBe(true);
      expect(fields.some(f => f.clinicalTier === 'tier_1_diagnostic_category')).toBe(true);
      expect(fields.flatMap(f => f.options).some(o => o.narrativePhrase)).toBe(true);
      expect(fields.flatMap(f => f.options).some(o => o.lexiconTermKey)).toBe(true);
      expect(resolveSynopticTemplateClinicalTierConsistency(t)).toEqual([]);
      for (const s of t.sections) expect(s.collapsed).toBe(false);
      for (const f of fields) expect(Array.isArray(f.options)).toBe(true);
    }
  });
  it('a free-text answer still goes into the narrative now that free-text questions carry an empty options list', () => {
    const freeText = CYTOLOGY_SYNOPTIC_TEMPLATES.flatMap(t => t.sections.flatMap(s => s.fields).filter(f => ['text', 'longtext', 'numeric'].includes(f.type) && f.narrativeSentenceTemplate && !f.narrativeSentenceTemplateKey).map(f => [t, f] as const));
    expect(freeText.length).toBeGreaterThan(0);
    for (const [t, f] of freeText) {
      expect(f.options).toEqual([]);
      expect(compileCytologySynopticNarrative(t, { [f.id]: 'Zebra 42' }, (k: string) => k, 'en', []).rawText).toContain('Zebra 42');
    }
  });
});

describe('normalizeSynopticTemplate', () => {
  it('fills the shared model’s required properties and keeps everything else', () => {
    const t = normalizeSynopticTemplate({
      id: 't', name: 'T', source: 'Custom', version: '1', category: 'CYTOLOGY_NONGYN', standard: 'S',
      sections: [{ id: 's', title: 'S', fields: [
        { id: 'a', label: 'A', type: 'dropdown', clinicalTier: 'tier_1_diagnostic_category', options: [{ id: 'x', label: 'X', narrativePhrase: 'ex', lexiconTermKey: 'k' }] },
        { id: 'b', label: 'B', type: 'longtext', narrativeSentenceTemplate: '{value}' },
      ] }],
    });
    expect(t.sections[0].collapsed).toBe(false);
    expect(t.sections[0].fields[0]).toEqual({ id: 'a', label: 'A', type: 'dropdown', clinicalTier: 'tier_1_diagnostic_category', required: false, snomed: '', icd: '',
      options: [{ id: 'x', label: 'X', narrativePhrase: 'ex', lexiconTermKey: 'k', snomed: '', icd: '' }] });
    expect(t.sections[0].fields[1]).toMatchObject({ narrativeSentenceTemplate: '{value}', options: [], required: false });
    expect(t.standard).toBe('S');
  });
});

describe('choosing templates from the Synoptic Library', () => {
  it('Non-GYN cytology categories only', () => {
    expect([isCytologySynopticCategory('CYTOLOGY_NONGYN'), isCytologySynopticCategory('CYTOLOGY_NONGYN_FLUID'), isCytologySynopticCategory('CYTOLOGY_GYN'), isCytologySynopticCategory(undefined)]).toEqual([true, true, false, false]);
  });
  it('the picker offers published cytology protocols by name; drafts, retired versions, surgical and GYN don’t appear', () => {
    expect(cytologySynopticChoices(protocols)).toEqual([
      { id: 'lab_pleural', name: 'Pleural fluid (lab)' }, { id: 'lab_thyroid_v2', name: 'Thyroid FNA (v2)' }, { id: 'urine_cytology', name: 'Urine Cytology' },
    ]);
  });
  it('content is read for every protocol a review can name: published, archived, deprecated — not drafts', () => {
    expect(cytologyProtocolsToLoad(protocols).map(p => p.id)).toEqual(['thyroid_fna_cytology', 'lab_thyroid_v2', 'urine_cytology', 'lab_pleural', 'lymph_node_fna_cytology']);
  });
  it('a shortcut naming a PathScribe template opens its current published version, following New Version lineage', () => {
    expect(currentVersionOf('thyroid_fna_cytology', protocols)).toBe('lab_thyroid_v2');
    expect(currentVersionOf('urine_cytology', protocols)).toBe('urine_cytology');
    expect(currentVersionOf('lymph_node_fna_cytology', protocols)).toBeUndefined();
    const v3 = [...protocols.map(p => (p.id === 'lab_thyroid_v2' ? { ...p, status: 'archived' } : p)), P('lab_thyroid_v3', 'published', { supersedesId: 'lab_thyroid_v2' })];
    expect(currentVersionOf('thyroid_fna_cytology', v3)).toBe('lab_thyroid_v3');
  });
});

describe('reading the library', () => {
  const edited = normalizeSynopticTemplate({
    ...(thyroidRaw as never as object), id: 'lab_thyroid_v2', name: 'Thyroid FNA (v2)',
  } as never);
  Object.assign(edited.sections[0].fields[0], withNarrativeSentence('Obtained by: {value}.'));

  const deps = () => ({
    listProtocols: vi.fn(async () => protocols),
    getTemplate: vi.fn(async (id: string) => {
      if (id === 'lab_thyroid_v2') return edited;
      if (id === 'lab_pleural') throw new Error('not found');
      if (id === 'urine_cytology') return { id, name: 'Urine', sections: [] };
      return CYTOLOGY_SYNOPTIC_TEMPLATES.find(t => t.id === id);
    }),
  });

  it('before the library is read, the five bundled templates are offered and resolved', () => {
    expect(cytologySynopticTemplateChoices().map(c => c.id).sort()).toEqual(CYTOLOGY_SYNOPTIC_TEMPLATES.map(t => t.id).sort());
    expect(resolveCytologySynopticTemplateById('thyroid_fna_cytology')?.name).toBe(thyroidRaw.name);
    expect(resolveCytologySynopticTemplateById('lab_thyroid_v2')).toBeUndefined();
    expect(cytologySynopticTemplateForShortcut('thyroid_fna_cytology')).toBe('thyroid_fna_cytology');
  });

  it('after reading: the lab’s edited version is what Cytology uses, its narrative included', async () => {
    const d = deps();
    const choices = await refreshCytologySynopticTemplates(d);
    expect(choices.map(c => c.id)).toEqual(['lab_pleural', 'lab_thyroid_v2', 'urine_cytology']);
    expect(cytologySynopticTemplateChoices()).toEqual(choices);
    expect(d.getTemplate).not.toHaveBeenCalledWith('lab_urine_draft');
    const tpl = resolveCytologySynopticTemplateById('lab_thyroid_v2')!;
    const procedure = tpl.sections[0].fields[0];
    const answer = procedure.options.find(o => o.narrativePhrase)!;
    const narrative = compileCytologySynopticNarrative(tpl, { [procedure.id]: answer.id }, (k: string) => k, 'en', []);
    expect(narrative.rawText).toBe(`Obtained by: ${answer.narrativePhrase}.`);
    expect(cytologySynopticTemplateForShortcut('thyroid_fna_cytology')).toBe('lab_thyroid_v2');
    expect(cytologySynopticTemplateForShortcut('lymph_node_fna_cytology')).toBeUndefined();
  });

  it('a retired version still resolves for its reviews; content that can’t be read (or is empty) keeps the bundled template', async () => {
    await refreshCytologySynopticTemplates(deps());
    expect(resolveCytologySynopticTemplateById('thyroid_fna_cytology')?.id).toBe('thyroid_fna_cytology');
    expect(resolveCytologySynopticTemplateById('urine_cytology')?.sections.length).toBeGreaterThan(0);
    expect(resolveCytologySynopticTemplateById('lab_pleural')).toBeUndefined();
  });

  it('ensureCytologySynopticTemplate reads one template before a synchronous check, once', async () => {
    const d = deps();
    expect((await ensureCytologySynopticTemplate('lab_thyroid_v2', d))?.name).toBe('Thyroid FNA (v2)');
    await ensureCytologySynopticTemplate('lab_thyroid_v2', d);
    expect(d.getTemplate).toHaveBeenCalledTimes(1);
    expect(await ensureCytologySynopticTemplate('nope', d)).toBeUndefined();
  });
});

describe('narrative authoring helpers', () => {
  it('the editor shows narrative settings for Non-GYN cytology, or a protocol that already has a sentence', () => {
    expect(authorsNarrative({ category: 'CYTOLOGY_NONGYN', sections: [] })).toBe(true);
    expect(authorsNarrative({ category: 'BREAST', sections: [{ fields: [{}] }] })).toBe(false);
    expect(authorsNarrative({ category: 'GROSSING', sections: [{ fields: [{ narrativeSentenceTemplate: 'x {value}' }] }] })).toBe(true);
  });
  it('blank is none; a sentence without {value} is flagged', () => {
    expect([narrativeText(''), narrativeText('  '), narrativeText('a')]).toEqual([undefined, undefined, 'a']);
    expect(withNarrativeSentence(' ')).toEqual({ narrativeSentenceTemplate: undefined, narrativeSentenceTemplateKey: undefined });
    expect([narrativeSentenceMissesValue({}), narrativeSentenceMissesValue({ narrativeSentenceTemplate: 'X: {value}.' }), narrativeSentenceMissesValue({ narrativeSentenceTemplate: 'Fixed.' })]).toEqual([false, false, true]);
  });
});
