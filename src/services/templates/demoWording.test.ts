// Batch 755a (Pete, Oct 31, 2026): the demonstration checklists have plain names and a "Demo wording" tag, no copy may
// start from one, the autopsy cases of Video 4 carry PathScribe's own autopsy checklist, and the written findings of the
// Video 9 cases (and the Manchester biopsy) have no placeholder wording.
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEMO_CHECKLIST_IDS, checklistCopyRefusal, showsDemoWordingTag } from './demoChecklists';
import { DEMO_CHECKLIST_REGISTRY } from './demoChecklistRegistry';
import { copySourceCandidates, protocolActions } from './protocolLifecycle';

const SRC = resolve(__dirname, '../..');
const GENERIC = resolve(SRC, 'data/templates/generic');
const nameOf = (id: string) => (JSON.parse(readFileSync(resolve(GENERIC, `${id}.json`), 'utf8')) as { name: string }).name;
const PLACEHOLDER_PROSE = /Primary finding|Score total|Marker [A-Z]\b|Marker panel|finding foci|secondary cell layer|\(Site \d|\bunits?\b involved|\d units?\b/;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

describe('plain checklist names (Batch 755a)', () => {
  it('no checklist, registry entry or seeded report is named "Generic Template" any more', () => {
    const offenders = filesUnder(SRC)
      .filter(p => /\.(ts|tsx|json)$/.test(p) && !p.endsWith('demoWording.test.ts'))
      .filter(p => readFileSync(p, 'utf8').includes('Generic Template'));
    expect(offenders).toEqual([]);
  });

  it('the library entry carries the same plain name as the checklist file', () => {
    for (const entry of DEMO_CHECKLIST_REGISTRY) expect(entry.name, entry.id).toBe(nameOf(entry.id));
    expect(nameOf('colon_resection')).toBe('Colon resection');
    expect(nameOf('prostate_radical_prostatectomy')).toBe('Radical prostatectomy');
  });
});

describe('the Demo wording tag and the copy refusal (Batch 755a)', () => {
  it('every demonstration checklist is tagged and refused as a copy source; PathScribe’s own are not', () => {
    for (const id of DEMO_CHECKLIST_IDS) {
      expect(showsDemoWordingTag(id), id).toBe(true);
      expect(checklistCopyRefusal(id), id).toBe('demoWording');
    }
    for (const id of ['autopsy_gross_examination', 'mohs_micrographic_surgery', 'neck_dissection', undefined]) {
      expect(showsDemoWordingTag(id)).toBe(false);
      expect(checklistCopyRefusal(id)).toBeNull();
    }
  });

  it('a demonstration checklist offers no Duplicate or New Version, and Build from an existing template leaves it out', () => {
    expect(protocolActions({ id: 'colon_resection', status: 'published' })).toMatchObject({ duplicate: false, newVersion: false, view: true, exportJson: true });
    expect(protocolActions({ id: 'mohs_micrographic_surgery', status: 'published' })).toMatchObject({ duplicate: true, newVersion: true });
    const registry = [{ id: 'colon_resection', status: 'published' }, { id: 'neck_dissection', status: 'published' }, { id: 'x', status: 'draft' }] as const;
    expect(copySourceCandidates(registry).map(p => p.id)).toEqual(['neck_dissection']);
  });
});

describe('templateService refuses saving a copy of a demonstration checklist (Batch 755a)', () => {
  const store: Record<string, string> = {};
  beforeAll(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    };
  });
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it('refuses the first save of a copy whose source is a demonstration checklist, and allows any other copy', async () => {
    const { mockUserService } = await import('../users/mockUserService');
    await mockUserService.update('1', { roles: ['Template Author'] });
    localStorage.setItem('pathscribe-user', JSON.stringify({ id: '1', role: 'pathologist', firstName: '1', lastName: 'Test' }));
    const svc = await import('./templateService');
    const copy = (copiedFromId: string, id: string) => ({ id, name: 'Copy', source: 'Custom', version: '1.0.1', category: 'COLON', sections: [], copiedFromId });
    await expect(svc.saveDraft(copy('colon_resection', 'copy-of-demo'))).rejects.toMatchObject({ code: 'DEMO_CHECKLIST_COPY' });
    await expect(svc.saveDraft(copy('neck_dissection', 'copy-of-own'))).resolves.toBeTruthy();
  });
});

describe('seed rows S6 and S15 (Batch 755a)', () => {
  it('A26-4665 and A26-4666 carry PathScribe’s own autopsy checklist, so Video 4 shows no demonstration list', async () => {
    const { mockCaseService } = await import('../cases/mockCaseService');
    for (const id of ['A26-4665', 'A26-4666']) {
      const reports = (await mockCaseService.getCase(id))!.synopticReports!;
      expect(reports.map(r => r.templateId), id).toEqual(['autopsy_gross_examination']);
    }
  });

  it('the written findings of the Video 9 cases and MFT26-8802-PR-BX have no placeholder wording', async () => {
    const { mockCaseService } = await import('../cases/mockCaseService');
    for (const id of ['S26-4404', 'S26-5407', 'S26-4463', 'S26-5405', 'MFT26-8804-PR-RP', 'MFT26-8802-PR-BX']) {
      const d = (await mockCaseService.getCase(id))!.diagnostic ?? {};
      for (const [k, v] of Object.entries(d)) expect(String(v ?? ''), `${id} ${k}`).not.toMatch(PLACEHOLDER_PROSE);
    }
  });
});
