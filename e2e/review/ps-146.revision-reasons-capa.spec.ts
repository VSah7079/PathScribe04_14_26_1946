// e2e/review/ps-146.revision-reasons-capa.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-146 — "Wire Amended/Corrected Reports (Clinically-Significant Corrections)
// to a CAPA Recommendation". The review test plan, run against the demo as Pete
// Nimmo. Batch 587.
//
//   1–2. Configuration → System → Revision Reasons: diagnosis, margin, stage and
//      tissue reclassification reasons show "Recommends a CAPA"; clerical
//      corrections such as typo show "No CAPA".                      automated
//   3–6. Amend a signed-out case with a clinically significant reason and release
//      it; the recommendation appears under Quality Assurance → CAPA Engine →
//      Recommended; clerical and addendum releases add none; Confirm / Dismiss.
//                                                       not in this spec (batch 588)
//   7. `npx vitest run src/services/reports/mockAmendmentService.test.ts src/services/quality/capaRecommendationService.test.ts`
//      (run in the batch's vitest run).
//
// Selectors: the reasons table's rows and their CAPA label
// (revisionReasonsSection.recommendsCapa / noCapa in en.json).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5332 npx playwright test --project=chromium \
//        e2e/review/ps-146.revision-reasons-capa.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn, openScreen } from './helpers';

test('Steps 1–2: significant revision reasons recommend a CAPA; clerical ones do not', async ({ page }) => {
  await signIn(page);
  await openScreen(page, '/configuration?tab=system&section=revision_reasons', 'Configuration');
  const rows = page.locator('table.ps-conf-table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  const all = await rows.evaluateAll((trs) => trs.map((tr) => ({
    name: (tr.querySelector('td')?.textContent ?? '').trim(),
    capa: (tr.querySelector('.ps-conf-option-text')?.textContent ?? '').trim(),
  })));
  expect(all.length, 'reasons are listed').toBeGreaterThan(4);
  const significant = all.filter((r) => /diagnos|margin|stag|reclassif/i.test(r.name));
  const clerical = all.filter((r) => /typo|clerical|demograph|spelling/i.test(r.name));
  expect(significant.length, `significant reasons found in: ${all.map((r) => r.name).join(' | ')}`).toBeGreaterThan(0);
  expect(clerical.length, `clerical reasons found in: ${all.map((r) => r.name).join(' | ')}`).toBeGreaterThan(0);
  for (const r of significant) expect(r.capa, `${r.name} recommends a CAPA`).toBe('Recommends a CAPA');
  for (const r of clerical) expect(r.capa, `${r.name} does not`).toBe('No CAPA');
});
