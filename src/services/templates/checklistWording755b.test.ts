// Batch 755b (Pete, Nov 1, 2026): breast invasive (US) and the two UK-layout checklists in PathScribe's own wording, the
// demo cases answering only what those checklists offer, and the Manchester demo pathologist fictional (Paul Carter, a
// UK workflow adviser and not a physician, has his own non-clinical record).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import breast from '@/data/templates/generic/breast_invasive.json';
import ukColorectal from '@/data/templates/generic/colorectal_resection_b.json';
import ukProstate from '@/data/templates/generic/prostate_biopsy.json';
import dcis from '@/data/templates/generic/breast_dcis_resection.json';
import lungAdeno from '@/data/templates/generic/lung_adeno.json';
import kidney from '@/data/templates/generic/kidney_resection.json';
import lungResection from '@/data/templates/generic/lung_resection.json';
import melanoma from '@/data/templates/generic/skin_melanoma_bx.json';
import localExcision from '@/data/templates/generic/colorectal_local_excision.json';
import furtherInvestigations from '@/data/templates/generic/colorectal_further_investigations.json';
import prostateResection from '@/data/templates/generic/prostate_resection.json';
import { DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER, offeredOnCasePicker } from './demoChecklists';

type Field = { id: string; label: string; options?: { id: string; label: string }[] };
type Template = { id: string; sections: { title: string; fields: Field[] }[] };
const PLACEHOLDER = /^(Option|Field) \d+$|Category [A-Z]\b|Reference Code [A-Z]|Secondary (Finding|Involvement)|Treatment Effect [AB]|Unit Group|\(Subset\)|placeholder/i;
const fieldsOf = (t: Template) => t.sections.flatMap(s => s.fields);
// Part 2 (Batch 755b): breast DCIS, lung adenocarcinoma, then the six with demo cases.
const REWORDED: [string, unknown][] = [
  ['breast_invasive', breast], ['colorectal_resection_b', ukColorectal], ['prostate_biopsy', ukProstate], ['breast_dcis_resection', dcis],
  ['lung_adeno', lungAdeno], ['kidney_resection', kidney], ['lung_resection', lungResection], ['skin_melanoma_bx', melanoma],
  ['colorectal_local_excision', localExcision], ['colorectal_further_investigations', furtherInvestigations], ['prostate_resection', prostateResection],
];
const SRC = resolve(__dirname, '../..');

describe.each(REWORDED)('%s wording (Batch 755b)', (_id, json) => {
  const template = json as unknown as Template;
  it('has no placeholder section, question or answer', () => {
    const labels = [...template.sections.map(s => s.title), ...fieldsOf(template).map(f => f.label), ...fieldsOf(template).flatMap(f => (f.options ?? []).map(o => o.label))];
    expect(labels.filter(l => PLACEHOLDER.test(l.trim()))).toEqual([]);
  });
  it('has a distinct label for every answer of a question', () => {
    for (const f of fieldsOf(template)) {
      const own = (f.options ?? []).map(o => o.label);
      expect(new Set(own).size, f.id).toBe(own.length);
    }
  });
});

describe('the demo cases answer only what these checklists offer (Batch 755b)', () => {
  it.each(REWORDED)('%s', async (templateId, json) => {
    const byId = new Map(fieldsOf(json as unknown as Template).map(f => [f.id, f]));
    const { mockCaseService } = await import('../cases/mockCaseService');
    const cases = await mockCaseService.listCasesForUser('all');
    const reports = cases.flatMap(c => (c.synopticReports ?? []).filter(r => r.templateId === templateId).map(r => [c.id, r] as const));
    expect(reports.length).toBeGreaterThan(0);
    for (const [caseId, r] of reports) {
      const values = [
        ...Object.entries(r.answers ?? {}),
        ...Object.entries((r as { aiSuggestions?: Record<string, { value: unknown }> }).aiSuggestions ?? {}).map(([k, v]) => [k, v.value] as const),
      ];
      for (const [key, value] of values) {
        const field = byId.get(key);
        if (!field?.options?.length) continue;
        const offered = new Set(field.options.map(o => o.id));
        for (const v of Array.isArray(value) ? value : [value]) if (v) expect(offered.has(String(v)), `${caseId}: ${key} = ${String(v)}`).toBe(true);
      }
    }
  });

  it('MFT26-8802-PR-BX suggests Gleason 4+3=7 with Grade Group 3, and the Manchester colorectal cases stage in real words', async () => {
    const { mockCaseService } = await import('../cases/mockCaseService');
    const s = (await mockCaseService.getCase('MFT26-8802-PR-BX'))!.synopticReports![0] as unknown as { aiSuggestions: Record<string, { value: string }> };
    const label = (fid: string, v: string) => fieldsOf(ukProstate as unknown as Template).find(f => f.id === fid)!.options!.find(o => o.id === v)!.label;
    expect(label('gleason_score_total', s.aiSuggestions.gleason_score_total.value)).toBe('7 (4+3)');
    expect(label('grade_group', s.aiSuggestions.grade_group.value)).toMatch(/Grade Group 3/);
    const c8801 = (await mockCaseService.getCase('MFT26-8801-CR-RES'))!.synopticReports!.find(r => r.templateId === 'colorectal_resection_b')!;
    expect(c8801.answers).toMatchObject({ t_stage: 'ypT3', n_stage: 'ypN1b' });
  });
});

describe('the Manchester demo pathologist is fictional (Batch 755b)', () => {
  function filesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? filesUnder(p) : [p]; });
  }
  it('no demo data names Paul Carter as a clinician; he signs in to his own record, without clinical credentials', async () => {
    const offenders = filesUnder(SRC)
      .filter(p => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p) && !/demoAccounts\.ts$|mockUserService\.ts$/.test(p))
      .filter(p => /Paul Carter/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
    const { DEMO_ACCOUNTS } = await import('../auth/demo/demoAccounts');
    expect(DEMO_ACCOUNTS.find(a => a.name === 'Paul Carter')?.id).toBe('UK-ADV-001');
    expect(DEMO_ACCOUNTS.find(a => a.id === 'PATH-UK-001')?.name).toBe('Dr. Imogen Hartley');
    const { mockUserService } = await import('../users/mockUserService');
    const all = await mockUserService.getAll();
    const paul = (all as unknown as { data: { id: string; firstName: string; lastName: string; credentials: string; license: string; roles?: string[] }[] }).data.find(u => u.id === 'UK-ADV-001')!;
    expect(paul).toMatchObject({ firstName: 'Paul', lastName: 'Carter', credentials: '', license: '' });
    expect(paul.roles ?? []).not.toContain('Pathologist');
  });
});

describe('the case checklist picker (Batch 755b)', () => {
  it('leaves out the test forms and the five unused demo checklists, and offers everything else', () => {
    expect(DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER).toEqual(['breast_surgical_excision', 'kidney_biopsy', 'prostate_turp_enucleation', 'wilms_resection', 'wilms_biopsy']);
    for (const id of DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER) expect(offeredOnCasePicker({ id, category: 'X' }), id).toBe(false);
    expect(offeredOnCasePicker({ id: 'generic_test_basic', category: 'TEST' })).toBe(false);
    expect(offeredOnCasePicker({ id: 'breast_invasive', category: 'BREAST' })).toBe(true);
    expect(offeredOnCasePicker({ id: 'autopsy_gross_examination', category: 'AUTOPSY' })).toBe(true);
  });
});

describe('demo case written findings (Batch 755b)', () => {
  it('no demo case has placeholder-style findings ("Marker A", "Primary finding", "Score total", "Category A: Level")', async () => {
    const { mockCaseService } = await import('../cases/mockCaseService');
    const cases = await mockCaseService.listCasesForUser('all');
    const bad = cases.flatMap(c => Object.entries(c.diagnostic ?? {})
      .filter(([, v]) => /Marker [A-Z]\b|Marker panel|Primary finding|primary finding|Score total|Category [A-C]: Level/.test(String(v ?? '')))
      .map(([k]) => `${c.id} ${k}`));
    expect(bad).toEqual([]);
  });
});
