// src/components/Config/System/addButtonsNoWrap.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-90 (Batch 451): the "+ Add …" buttons on Container Types, Printer
// Profiles, Scan Stations, Cassette Colors and every Stain Dictionary tab
// keep their label on one line. They do it with the
// ps-conf-btn-primary--nowrap class, whose CSS rule sets white-space: nowrap.
//
// Source-level guard (the label wrapping itself is layout, which a unit test
// can't measure): every button in these sections whose English label starts
// with "+ Add" carries that class, and the class's rule really prevents
// wrapping. Specimen Categories, also named in PS-90, has since been deleted
// as unused, so it is not listed.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

type Json = { [k: string]: string | Json };
const en = JSON.parse(read('i18n/locales/en.json')) as Json;
const lookup = (key: string): string | undefined => {
  let node: string | Json | undefined = en;
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined;
  return typeof node === 'string' ? node : undefined;
};

/** Every <button className="…">{t('key')}</button> in a file, with the key's
 *  `${K}` prefix (the file's own `const K = '…'`) resolved. */
function buttons(rel: string): { className: string; key: string; label: string | undefined }[] {
  const src = read(rel);
  const k = /const K = '([^']+)'/.exec(src)?.[1];
  // The opening tag may hold arrow functions (`=>`), so `>` only ends it when not after `=`.
  const re = /<button\b((?:[^>]|=>)*?)>\s*\{t\(\s*[`'"]([^`'"]+)[`'"]/g;
  const out: { className: string; key: string; label: string | undefined }[] = [];
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const className = /className="([^"]*)"/.exec(m[1])?.[1] ?? '';
    const key = k ? m[2].replace('${K}', k) : m[2];
    out.push({ className, key, label: lookup(key) });
  }
  return out;
}

const SECTIONS: { file: string; expectedAddKeys: string[] }[] = [
  { file: 'components/Config/System/ContainerTypesSection.tsx', expectedAddKeys: ['containerTypesSection.addContainerType'] },
  { file: 'components/Config/System/PrinterProfilesSection.tsx', expectedAddKeys: ['printerProfilesSection.addProfileButton'] },
  { file: 'components/Config/System/ScanStationsSection.tsx', expectedAddKeys: ['scanStationsSection.addStationButton'] },
  { file: 'components/Config/System/CassetteColorsSection.tsx', expectedAddKeys: ['cassetteColorsSection.addColorButton'] },
  {
    file: 'components/Config/System/StainDictionarySection.tsx',
    expectedAddKeys: [
      'stainDictionarySection.addTypeBtn', 'stainDictionarySection.addProtocolBtn',
      'stainDictionarySection.addMacroBtn', 'stainDictionarySection.addTargetBtn',
    ],
  },
];

describe('PS-90 "+ Add" buttons do not wrap', () => {
  it('the ps-conf-btn-primary--nowrap rule sets white-space: nowrap', () => {
    const css = read('pathscribe.css');
    const rule = /\.ps-conf-btn-primary--nowrap\s*\{([^}]*)\}/.exec(css);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/white-space:\s*nowrap/);
  });

  for (const { file, expectedAddKeys } of SECTIONS) {
    it(`${file.split('/').pop()}: every "+ Add" button uses ps-conf-btn-primary--nowrap`, () => {
      const addButtons = buttons(file).filter(b => b.label?.trim().startsWith('+ Add'));
      expect(addButtons.map(b => b.key).sort()).toEqual([...expectedAddKeys].sort());
      for (const b of addButtons) {
        expect(b.className.split(/\s+/), `${b.key} in ${file}`).toContain('ps-conf-btn-primary--nowrap');
      }
    });
  }
});
