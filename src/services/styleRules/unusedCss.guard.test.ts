// Batch 596-597 (PS-520): no unreferenced CSS.
// scripts/css-unused-audit.mjs lists the classes in pathscribe.css that nothing in the app refers to (no
// exact name in src/, e2e/ or index.html, and not built from a name prefix). Batches 596 and 597 removed every
// one; classes whose names code builds from a prefix or suffix are held for a check by hand and are not counted.
//
// If this fails: you added a class nothing uses, or you removed a component and left its CSS behind.
// Remove the CSS together with the component. `node scripts/css-unused-audit.mjs` shows what is unused.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
interface Audit { defined: number; dead: number; dynamic: number; families: { family: string; classes: string[] }[] }
const audit: Audit = JSON.parse(execFileSync(process.execPath, ['scripts/css-unused-audit.mjs', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

/** Batch 597: none left. Never raise this number. */
const MAX_UNREFERENCED = 0;
const REMOVED_FAMILIES = ['ps-team-', 'ps-tmpl-', 'ps-part-', 'ps-osn-', 'ps-hist-'];

describe('unused CSS (PS-520)', () => {
  it('there are no unreferenced classes', () => {
    expect(audit.dead).toBeLessThanOrEqual(MAX_UNREFERENCED);
  });
  it('the families removed in Batches 596-597 have not come back unused', () => {
    const back = audit.families.flatMap(f => f.classes).filter(c => REMOVED_FAMILIES.some(p => c.startsWith(p)));
    expect(back).toEqual([]);
  });
});
