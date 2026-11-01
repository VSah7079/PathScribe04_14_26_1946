// Batch 754 (Pete, Oct 31, 2026): the demonstration checklists are left out of customer builds and can be removed from a
// customer organisation's library.
import { describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEMO_CHECKLIST_ALIASES, DEMO_CHECKLIST_IDS, DEMO_CHECKLISTS_IN_BUILD, demoChecklistRemovalAuditDetail, isDemoChecklist, planDemoChecklistRemoval,
} from './demoChecklists';
import { DEMO_CHECKLIST_LOADERS } from './demoChecklistLoaders';
import { removeDemoChecklists, type DemoChecklistRemovalDeps } from './demoChecklistRemoval';
import { CAPABILITY_CATALOG } from '../authorization/capabilityCatalog';

const GENERIC = resolve(__dirname, '../../data/templates/generic');
const fileSource = (f: string) => (JSON.parse(readFileSync(resolve(GENERIC, f), 'utf8')) as { source?: string }).source;

describe('which checklists are demonstration content (Batch 754)', () => {
  it('is every generic checklist not authored by PathScribe, and nothing else', () => {
    const notOurs = readdirSync(GENERIC).filter(f => f.endsWith('.json') && fileSource(f) !== 'PathScribe').map(f => f.replace(/\.json$/, '')).sort();
    expect([...DEMO_CHECKLIST_IDS].sort()).toEqual(notOurs);
    expect(DEMO_CHECKLIST_IDS).toHaveLength(19);
  });

  it('keeps PathScribe’s own checklists', () => {
    for (const id of ['mohs_micrographic_surgery', 'oral_cavity_resection', 'neck_dissection', 'thyroid_fna_cytology', 'grossing_standard_tissue', 'autopsy_gross_examination']) {
      expect(isDemoChecklist(id), id).toBe(false);
    }
    expect(isDemoChecklist('skin_invasive_melanoma_biopsy')).toBe(true);
    expect(isDemoChecklist(undefined)).toBe(false);
  });

  it('loads every demonstration checklist (and its alias) from demoChecklistLoaders.ts only', () => {
    expect(Object.keys(DEMO_CHECKLIST_LOADERS).sort()).toEqual([...DEMO_CHECKLIST_IDS, ...Object.keys(DEMO_CHECKLIST_ALIASES)].sort());
    const service = readFileSync(resolve(__dirname, 'templateService.ts'), 'utf8');
    expect(service).not.toMatch(/data\/templates\/generic\/(?!mohs_|oral_cavity_|neck_dissection)/);
    expect(service).toMatch(/\.\.\.\(import\.meta\.env\.MODE !== 'server' \? DEMO_CHECKLIST_LOADERS : \{\}\)/);
  });

  it('is in every build except the customer build (the test run is not one)', () => {
    expect(DEMO_CHECKLISTS_IN_BUILD).toBe(true);
  });

  it('the customer build check reads the same list from the files', async () => {
    const { DEMO_CHECKLIST_FILES, inspectManifest } = await import('../../../scripts/check-production-bundle.mjs');
    expect(DEMO_CHECKLIST_FILES).toEqual([...DEMO_CHECKLIST_IDS].map(id => `src/data/templates/generic/${id}.json`).sort());
    expect(inspectManifest({ a: { src: 'src/data/templates/generic/colon_resection.json' }, b: { src: 'src/data/templates/generic/neck_dissection.json' } }).demoChecklists)
      .toEqual(['src/data/templates/generic/colon_resection.json']);
  });

  it('has a ForMedrixAI-only capability that also needs config:protocol:retire', () => {
    const def = CAPABILITY_CATALOG.find(c => c.key === 'platform:demo-checklists:remove');
    expect(def).toMatchObject({ platformOnly: true, requires: ['config:protocol:retire'] });
  });
});

const library = [
  { id: 'colon_resection', name: 'Colon resection', status: 'published' },
  { id: 'prostate_needle_biopsy', name: 'Prostate needle biopsy', status: 'archived' },
  { id: 'neck_dissection', name: 'PathScribe — Neck Dissection', status: 'published' },
];

function deps(allowed = true, archive: DemoChecklistRemovalDeps['archive'] = async () => undefined) {
  return { enforce: vi.fn(async (_capability: string) => ({ allowed })), library: () => library, archive: vi.fn(archive), audit: vi.fn(async (_detail: string) => undefined) };
}

describe('removing them from an organisation’s library (Batch 754)', () => {
  it('plans: in the library and offered, already archived, not there', () => {
    const plan = planDemoChecklistRemoval(library);
    expect(plan.toRemove.map(e => e.id)).toEqual(['colon_resection']);
    expect(plan.alreadyRemoved.map(e => e.id)).toEqual(['prostate_needle_biopsy']);
    expect(plan.notInLibrary).toHaveLength(17);
  });

  it('refuses without the capability and changes nothing', async () => {
    const d = deps(false);
    expect(await removeDemoChecklists(d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(d.enforce).toHaveBeenCalledWith('platform:demo-checklists:remove');
    expect(d.archive).not.toHaveBeenCalled();
    expect(d.audit).not.toHaveBeenCalled();
  });

  it('a dry run reports and changes nothing', async () => {
    const d = deps();
    const r = await removeDemoChecklists(d, { dryRun: true });
    expect(r).toMatchObject({ ok: true, dryRun: true, removed: [] });
    expect(d.archive).not.toHaveBeenCalled();
    expect(d.audit).not.toHaveBeenCalled();
  });

  it('archives each one still offered, never PathScribe’s own, and audits once', async () => {
    const d = deps();
    const r = await removeDemoChecklists(d);
    expect(d.archive).toHaveBeenCalledTimes(1);
    expect(d.archive).toHaveBeenCalledWith('colon_resection');
    expect(r).toMatchObject({ ok: true, dryRun: false, removed: [{ id: 'colon_resection' }], failed: [] });
    expect(d.audit).toHaveBeenCalledTimes(1);
    expect(d.audit.mock.calls[0][0]).toContain('Colon resection (colon_resection)');
  });

  it('keeps going past a checklist that could not be archived, and says which', async () => {
    const d = deps(true, async () => { throw { code: 'NOT_PERMITTED', message: 'not permitted' }; });
    const r = await removeDemoChecklists(d);
    expect(r).toMatchObject({ ok: true, removed: [], failed: [{ entry: { id: 'colon_resection' }, message: 'not permitted' }] });
    expect(demoChecklistRemovalAuditDetail([], 1, 1)).toBe('Demonstration checklists removed from this organisation\'s synoptic library (archived, not offered for new reports): 0. Already removed: 1. Could not be removed: 1.');
  });
});

describe('scripts/remove-demo-checklists.mjs (Batch 754)', () => {
  it('needs the server and the organisation, an https address, and is a dry run unless --apply', async () => {
    const { parseArgs, buildRequest } = await import('../../../scripts/remove-demo-checklists.mjs');
    expect(parseArgs([]).problems).toHaveLength(2);
    expect(parseArgs(['--api', 'http://example.org', '--organisation', 'ORG-1']).problems).toEqual(['--api must be an https address (http only for localhost)']);
    const args = parseArgs(['--api', 'https://ps.example.org/', '--organisation', 'ORG-1']);
    expect(args).toMatchObject({ api: 'https://ps.example.org', organisationId: 'ORG-1', apply: false, problems: [] });
    const req = buildRequest(args, 'TOKEN');
    expect(req.url).toBe('https://ps.example.org/api/templates/remove-demo-checklists');
    expect(JSON.parse(req.init.body)).toEqual({ organisationId: 'ORG-1', dryRun: true });
    expect(JSON.parse(buildRequest({ ...args, apply: true }, 'TOKEN').init.body).dryRun).toBe(false);
  });

  it('explains the server’s answer', async () => {
    const { describeResult } = await import('../../../scripts/remove-demo-checklists.mjs');
    expect(describeResult(404, null, false).lines[0]).toMatch(/does not offer the removal yet/);
    expect(describeResult(403, null, true).ok).toBe(false);
    const dry = describeResult(200, { plan: { toRemove: [{ id: 'colon_resection', name: 'Colon' }], alreadyRemoved: [], notInLibrary: [] } }, false);
    expect(dry).toMatchObject({ ok: true });
    expect(dry.lines.join('\n')).toMatch(/Dry run: 1 would be removed[\s\S]*Colon \(colon_resection\)[\s\S]*Nothing was changed/);
    expect(describeResult(200, { plan: { alreadyRemoved: [] }, removed: [{ id: 'a', name: 'A' }], failed: [] }, true).lines[0]).toBe('Removed 1; already removed 0; could not remove 0.');
  });
});
