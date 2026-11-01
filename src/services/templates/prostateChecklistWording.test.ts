// Batch 753 (Pete, Oct 31, 2026): the prostate needle biopsy and radical prostatectomy checklists have PathScribe's own
// wording (Video 9 may show no placeholder answers), and every answer the demo cases carry is an answer the checklist
// offers, so nothing shows as a raw id.
import { describe, expect, it } from 'vitest';
import biopsy from '@/data/templates/generic/prostate_needle_biopsy.json';
import radical from '@/data/templates/generic/prostate_radical_prostatectomy.json';
import { mockCaseService } from '@/services/cases/mockCaseService';

type Field = { id: string; label: string; type: string; options?: { id: string; label: string }[]; columns?: unknown };
type Template = { id: string; sections: { title: string; fields: Field[] }[] };
const PLACEHOLDER = /^(Option|Field|Category|Reference Code|Overall Grade|Secondary Finding|Secondary Structure|Type - Category) ?[A-Z0-9]*$/;

const fieldsOf = (t: Template) => t.sections.flatMap(s => s.fields);

describe.each([['prostate_needle_biopsy', biopsy as Template], ['prostate_radical_prostatectomy', radical as Template]])('%s wording (Batch 753)', (_id, template) => {
  it('has no placeholder section, question or answer', () => {
    const labels = [
      ...template.sections.map(s => s.title),
      ...fieldsOf(template).map(f => f.label),
      ...fieldsOf(template).flatMap(f => (f.options ?? []).map(o => o.label)),
    ];
    expect(labels.filter(l => PLACEHOLDER.test(l.trim()) || /^Option \d+$/.test(l))).toEqual([]);
  });

  it('has a distinct label for every answer of a question', () => {
    for (const f of fieldsOf(template)) {
      const own = (f.options ?? []).map(o => o.label);
      expect(new Set(own).size, f.id).toBe(own.length);
    }
  });
});

describe('the Video 9 prostate cases answer only what their checklists offer (Batch 753)', () => {
  it.each([['S26-4404', biopsy as Template], ['S26-5407', radical as Template], ['MFT26-8804-PR-RP', radical as Template]])('%s', async (caseId, template) => {
    const c = (await mockCaseService.getCase(caseId))!;
    const report = c.synopticReports!.find(r => r.templateId === template.id)!;
    const byId = new Map(fieldsOf(template).map(f => [f.id, f]));
    const values = [
      ...Object.entries(report.answers ?? {}),
      ...Object.entries((report as { aiSuggestions?: Record<string, { value: unknown }> }).aiSuggestions ?? {}).map(([k, v]) => [k, v.value] as const),
    ];
    for (const [key, value] of values) {
      const field = byId.get(key);
      if (!field) { expect(key, `${caseId}: ${key} is not a question`).toMatch(/^psmap_/); continue; }
      if (!field.options?.length) continue;
      const offered = new Set(field.options.map(o => o.id));
      for (const v of Array.isArray(value) ? value : [value]) expect(offered.has(String(v)), `${caseId}: ${key} = ${String(v)}`).toBe(true);
    }
  });

  it('S26-4404 agrees with its map: six cores, three with carcinoma, highest score 3+4=7', async () => {
    const answers = (await mockCaseService.getCase('S26-4404'))!.synopticReports![0].answers!;
    expect(answers).toMatchObject({ total_number_of_cores: 6, number_of_positive_cores: 3, highest_gleason_score: 'highest_gleason_score_opt_3' });
    const opt = (biopsy as Template).sections.flatMap(s => s.fields).find(f => f.id === 'highest_gleason_score')!.options!.find(o => o.id === 'highest_gleason_score_opt_3');
    expect(opt?.label).toBe('7 (3+4)');
  });
});
