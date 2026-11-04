// src/services/security/xlsxRemoved.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-48: the `xlsx` (SheetJS) package has a known vulnerability with no
// npm-available fix, so it was removed and replaced by src/utils/csv.ts.
// This guard fails if it comes back: listed in package.json (any dependency
// section), resolved in package-lock.json, or imported/required anywhere in
// src/ or scripts/.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundleDependencies', 'overrides'] as const;

/** Source with comments removed — prose mentioning xlsx is fine, code is not. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const isCode = (name: string) => /\.(tsx?|jsx?|cjs|mjs)$/.test(name) && !/\.d\.ts$/.test(name);

/** Every way a JS/TS file can load the package: static, side-effect, re-export, dynamic, require. */
function importsXlsx(source: string): boolean {
  const spec = `['"\`]xlsx(?:/[^'"\`]*)?['"\`]`;
  const patterns = [
    new RegExp(`\\bfrom\\s*${spec}`),
    new RegExp(`\\bimport\\s*${spec}`),
    new RegExp(`\\bimport\\s*\\(\\s*${spec}\\s*\\)`),
    new RegExp(`\\brequire\\s*\\(\\s*${spec}\\s*\\)`),
  ];
  const c = code(source);
  return patterns.some(p => p.test(c));
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return isCode(name) ? [full] : [];
  });
}

describe('PS-48 guard: the vulnerable xlsx package stays removed', () => {
  it('the detector catches every import form and ignores comments and file names', () => {
    expect(importsXlsx(`import * as XLSX from 'xlsx';`)).toBe(true);
    expect(importsXlsx(`import { read } from "xlsx/xlsx.mjs";`)).toBe(true);
    expect(importsXlsx(`import 'xlsx';`)).toBe(true);
    expect(importsXlsx(`export { utils } from 'xlsx';`)).toBe(true);
    expect(importsXlsx(`const X = await import('xlsx');`)).toBe(true);
    expect(importsXlsx(`const X = require("xlsx");`)).toBe(true);
    expect(importsXlsx(`// import * as XLSX from 'xlsx';`)).toBe(false);
    expect(importsXlsx(`/* require('xlsx') */`)).toBe(false);
    expect(importsXlsx(`const name = 'report.xlsx'; accept=".json,.xlsx"`)).toBe(false);
    expect(importsXlsx(`import x from 'xlsx-style-helper';`)).toBe(false);
  });

  it('package.json does not list xlsx in any dependency section', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    for (const section of DEP_SECTIONS) {
      const deps = pkg[section];
      if (!deps) continue;
      const names = Array.isArray(deps) ? deps : Object.keys(deps);
      expect(names, `package.json ${section}`).not.toContain('xlsx');
    }
  });

  it('package-lock.json does not resolve xlsx', () => {
    const lockPath = resolve(ROOT, 'package-lock.json');
    if (!existsSync(lockPath)) return;
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    const packages = Object.keys(lock.packages ?? {});
    expect(packages.filter(p => p === 'node_modules/xlsx' || p.endsWith('/node_modules/xlsx'))).toEqual([]);
    expect(Object.keys(lock.dependencies ?? {})).not.toContain('xlsx');
  });

  it('nothing in src/ or scripts/ imports or requires xlsx', () => {
    const files = [...walk(resolve(ROOT, 'src')), ...walk(resolve(ROOT, 'scripts'))];
    expect(files.length).toBeGreaterThan(100);
    const offenders = files
      .filter(f => f !== SELF) // this guard's own detector samples
      .filter(f => importsXlsx(readFileSync(f, 'utf8')))
      .map(f => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
