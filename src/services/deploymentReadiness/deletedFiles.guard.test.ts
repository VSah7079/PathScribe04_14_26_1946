// src/services/deploymentReadiness/deletedFiles.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 507: a delta zip can't delete files, so retired ones are listed in
// DELETED_FILES.txt and removed by hand. One that survives in a working copy
// can fail an unrelated guard (a stale CreateBatchModal.tsx failed the HTML
// sanitising guard in Pete's copy, Oct 10) or come back into use. This test
// names any listed file that is still present.
//
// Fix: `npm run cleanup:deleted` (scripts/remove-deleted-files.mjs).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { listedPaths } from '../../../scripts/remove-deleted-files.mjs';

const ROOT = process.cwd();
const LIST = readFileSync(join(ROOT, 'DELETED_FILES.txt'), 'utf8');

describe('files retired by a batch are gone from the working copy', () => {
  it('reads the list', () => {
    const paths: string[] = listedPaths(LIST);
    expect(paths).toContain('src/pages/BatchManagement/CreateBatchModal.tsx');
    expect(paths).toContain('src/services/instruments/');
    expect(paths.some(p => p.startsWith('Keep') || p.startsWith('Batch'))).toBe(false);
  });

  it('no file listed in DELETED_FILES.txt is still present (fix: npm run cleanup:deleted)', () => {
    const present = (listedPaths(LIST) as string[]).filter(p => existsSync(join(ROOT, p)));
    expect(present, `Still present; run npm run cleanup:deleted: ${present.join(', ')}`).toEqual([]);
  });
});
