// src/services/help/adminGuideAnchors.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 646: every Configuration screen has a section in the Administrator Guide
// for its Help button to open. Reads the guide's source chapters
// (docs/admin-guide/src/*.md), where each screen's heading carries its anchor as
// `{#screen-<name>}`, and checks every Configuration tab and section against the
// id services/help/adminGuideLinks.ts gives it. A new section added to a sidebar
// fails here until the guide documents it (docs/admin-guide/AUTHORING.md).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminGuideAnchorFor, adminGuideAnchorForScreen, ROUTE_GUIDE_SCREENS } from './adminGuideLinks';
import { SECTIONS as SYSTEM_SECTIONS } from '../../components/Config/System/systemSections';
import { SECTIONS as CYTOLOGY_SECTIONS } from '../../components/Config/Cytology/cytologySections';
import {
  CONFIG_TABS, STAFF_SECTIONS, TEMPLATE_SECTIONS, VALIDATION_SECTIONS, PROTOCOL_SECTIONS,
} from '../../constants/configSearchIndex';

const GUIDE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/admin-guide/src');

function documentedAnchors(): Set<string> {
  const ids = new Set<string>();
  for (const f of readdirSync(GUIDE_SRC).filter(n => /^\d\d-.*\.md$/.test(n))) {
    for (const m of readFileSync(resolve(GUIDE_SRC, f), 'utf8').matchAll(/^#{2,4}\s.*\{#(screen-[A-Za-z0-9_-]+)\}\s*$/gm)) ids.add(m[1]);
  }
  return ids;
}

const documented = documentedAnchors();
const missing = (anchors: string[]) => anchors.filter(a => !documented.has(a));

describe('Administrator Guide covers every Configuration screen (Batch 646)', () => {
  it('has a section for every Configuration tab (the demo reset tab is a developer tool and is left out)', () => {
    expect(missing(CONFIG_TABS.filter(t => t !== 'demo').map(tab => adminGuideAnchorFor({ tab })))).toEqual([]);
  });
  it('has a section for every System section', () => {
    expect(missing(SYSTEM_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'system', section: s.id })))).toEqual([]);
  });
  it('has a section for every Cytology section', () => {
    expect(missing(CYTOLOGY_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'cytology', section: s.id })))).toEqual([]);
  });
  it('has a section for every Staff, Report Templates, Validation Studies and Synoptic Library sub-tab', () => {
    const anchors = [
      ...STAFF_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'staff', section: s.id })),
      ...TEMPLATE_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'templates', section: s.id })),
      ...VALIDATION_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'validation', section: s.id })),
      ...PROTOCOL_SECTIONS.map(s => adminGuideAnchorFor({ tab: 'protocols', section: s.id })),
    ];
    expect(missing(anchors)).toEqual([]);
  });
  it('has a section for every screen outside Configuration that carries a Help button (Batch 647)', () => {
    expect(missing(ROUTE_GUIDE_SCREENS.map(adminGuideAnchorForScreen))).toEqual([]);
  });
  it('is documented in every language, with the same anchors as the English (Batch 647)', () => {
    const english = [...documented].sort();
    for (const lang of ['fr', 'de', 'nl', 'ko', 'es']) {
      const dir = resolve(GUIDE_SRC, lang);
      const ids = new Set<string>();
      for (const f of readdirSync(dir).filter(n => /^\d\d-.*\.md$/.test(n))) {
        for (const m of readFileSync(resolve(dir, f), 'utf8').matchAll(/^#{2,4}\s.*\{#(screen-[A-Za-z0-9_-]+)\}\s*$/gm)) ids.add(m[1]);
      }
      expect([...ids].sort(), lang).toEqual(english);
    }
  });
});
