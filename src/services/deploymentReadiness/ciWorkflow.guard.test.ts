// src/services/deploymentReadiness/ciWorkflow.guard.test.ts — Batch 615 (PS-471)
// The CI workflow runs the same checks as each batch; every npm script it calls must exist,
// and it must read the Node version from .nvmrc rather than repeat it.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('the CI workflow (Batch 615, PS-471)', () => {
  const file = resolve(ROOT, '.github/workflows/ci.yml');

  it('exists and runs on pull requests and on main', () => {
    expect(existsSync(file)).toBe(true);
    const yml = readFileSync(file, 'utf8');
    expect(yml).toMatch(/pull_request:/);
    expect(yml).toMatch(/branches: \[main\]/);
  });

  it('calls only npm scripts that exist, and the four checks every batch runs', () => {
    const yml = readFileSync(file, 'utf8');
    const scripts = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts as Record<string, string>;
    const called = [...yml.matchAll(/run: npm (?:run )?([\w:-]+)/g)].map(m => m[1]).filter(n => n !== 'ci');
    for (const name of ['type-check', 'lint', 'test', 'build']) expect(called).toContain(name);
    for (const name of called) expect(scripts[name], `npm script "${name}"`).toBeDefined();
  });

  it('takes the Node version from .nvmrc and runs the Python renderer tests that exist', () => {
    const yml = readFileSync(file, 'utf8');
    expect(yml).toContain('node-version-file: .nvmrc');
    expect(existsSync(resolve(ROOT, '.nvmrc'))).toBe(true);
    for (const t of ['functions/test_main.py', 'functions/test_report_delivery.py']) {
      expect(yml).toContain(t);
      expect(existsSync(resolve(ROOT, t))).toBe(true);
    }
  });
});
