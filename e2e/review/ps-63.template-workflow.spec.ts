// e2e/review/ps-63.template-workflow.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-63 — "Template creation/setup workflow documentation clarity". The review
// test plan, run against the demo as Pete Nimmo. Batch 586.
//
//   1. Read the Protocols README admin guide ("Admin guide: building and
//      publishing a synoptic template", "Who may approve and publish").
//      The two headings exist and name the roles; whether a first-time admin
//      could follow it is a judgement.      headings automated, clarity needs a person
//   2–5, 7–8. Non-author is read-only with a banner; granting Template Author;
//      Save Draft / Submit for Review; the self-approval refusal message;
//      the 80% SNOMED publishing bar; Active Protocols.   not in this spec (batch 587)
//   6. Configuration → System → Administration & Compliance → Template Review:
//      Allow Template Self-Approval defaults to Disabled, Required Reviewers to 1;
//      switching self-approval on is audited "Disabled → Enabled" (switch back
//      afterwards).                                                  automated
//   9. Known open (not pass/fail): lifecycle e-mails have no recipients until the
//      API server exists; reviewer-screen polish; Firestore role stub; SSO group
//      mapping.                                                      informational
//
// Selectors: the switch and select labelled "Allow Template Self-Approval" and
// "Required Reviewers" (templateGovernanceSection.* in en.json).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5322 npx playwright test --project=chromium \
//        e2e/review/ps-63.template-workflow.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signIn, openScreen } from './helpers';

const SELF = 'Allow Template Self-Approval';   // templateGovernanceSection.selfApproval.label
const REVIEWERS = 'Required Reviewers';        // templateGovernanceSection.requiredReviewers.label

test.describe('PS-63: template workflow guide and review settings', () => {
  test('Step 1: the Protocols README has the admin guide and names the approving roles', () => {
    const readme = readFileSync('src/components/Config/Protocols/README.md', 'utf8');
    expect(readme).toMatch(/Admin guide: building and publishing a synoptic template/);
    expect(readme).toMatch(/Who may approve and publish/);
    for (const role of ['Template Author', 'Template Approver', 'Lab Director']) expect(readme, `names ${role}`).toContain(role);
  });

  test('Step 6: self-approval defaults to Disabled, reviewers to 1; switching it on is audited, then back off', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await openScreen(page, '/configuration?tab=system&section=template_governance', 'Configuration');
    const toggle = page.getByRole('switch', { name: SELF });
    const reviewers = page.getByLabel(REVIEWERS, { exact: true });
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await expect(toggle, 'self-approval defaults to Disabled').toHaveAttribute('aria-checked', 'false');
    await expect(reviewers, 'required reviewers defaults to 1').toHaveValue('1');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    try {
      await page.goto('/audit');
      await expect(page.getByText('Disabled → Enabled').first(), 'the audit entry reads Disabled → Enabled').toBeVisible({ timeout: 30_000 });
    } finally {
      // Switch it back, whatever happened above.
      await openScreen(page, '/configuration?tab=system&section=template_governance', 'Configuration');
      const again = page.getByRole('switch', { name: SELF });
      if ((await again.getAttribute('aria-checked')) === 'true') await again.click();
      await expect(again, 'switched back to Disabled').toHaveAttribute('aria-checked', 'false');
    }
  });
});
