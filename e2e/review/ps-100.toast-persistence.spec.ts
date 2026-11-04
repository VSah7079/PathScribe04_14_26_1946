// e2e/review/ps-100.toast-persistence.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-100: "Complex warning messages in the Toast is hard to read and
// disappears too fast". Review test plan, against the demo (Vite dev server,
// localStorage data), as Pete Nimmo on the draft case S26-4408.
//
// Automated here (each review step is a test.step):
//   1. Sign in as Pete Nimmo and open a draft case report (S26-4408).
//   2. Save Draft: the short "Draft saved" message appears, then fades on its
//      own (gone within 9 s, the policy's MAX_TOAST_MS).
//   3. A warning on the report page: "Suggest Synoptic from Narrative" (right
//      panel). Every AI call (/api/ai/**) is answered with an error by the test
//      itself, so the call fails the same way on every machine (with or without
//      an AI key or a network) and the page shows the warning toast "AI
//      suggestion failed. Please try again." (useSignOutWorkflow.ts). The click
//      is a real UI action; no toast is injected.
//      The ticket's own example ("ask for narrative text before answering any
//      synoptic fields") is no longer a toast: with no narrative the button is
//      disabled with a tooltip (AiReportToolButtons.tsx), so it can't be
//      reached by clicking.
//   4. After 10 s the warning is still showing, with the ⚠ symbol, and its
//      text can wrap (white-space is pre-line, not nowrap; the toast is capped
//      at 520 px, narrower than the viewport, so long text must wrap; the
//      demo's reachable warning is one line, so the stylesheet rules are what
//      is asserted, not a two-line height).
//   5. The × closes it.
//   6. Language switched to French from the top bar's Language control; the
//      same action shows the warning in French, and it, too, stays.
//   7. Unit tests: `npx vitest run src/utils/toastPolicy.test.ts` — run on
//      Oct 15, 2026: 1 file, 3 tests passed. Not run from here.
//
// For a person: whether the dark toast's text is comfortably readable at the
// bottom right of the screen, and the behaviour of a genuinely long
// (multi-line) warning, which the demo's report page does not produce from a
// click.
//
// Run: PLAYWRIGHT_CHROMIUM=... A11Y_PORT=5302 npx playwright test --project=chromium e2e/review/ps-100.toast-persistence.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openCase } from './helpers';

const TOAST = '.ps-save-toast';
const TOAST_SHOWN = '.ps-save-toast.ps-save-toast--visible';

const EN = {
  saveDraft: 'Save Draft',                                   // bottomActionBar.report.saveDraftLabel
  draftSaved: 'Draft saved',                                 // synopticReportPage.toast.draftSaved
  suggest: 'Suggest Synoptic from Narrative',                // synopticReportPage.aiTools.suggest
  aiFailed: 'AI suggestion failed. Please try again.',       // useSignOutWorkflow.toast.aiSuggestionFailed
  closeToast: 'Close message',                               // saveToast.close
  language: 'Language',                                      // language.label
  french: 'Français (France)',                               // language.fr
};
const FR = {
  suggest: 'Suggérer le synoptique à partir du texte',
  aiFailed: 'Échec de la suggestion de l’IA. Veuillez réessayer.',
  closeToast: 'Fermer le message',
};

/** Clicks "Suggest Synoptic from Narrative" and waits for the warning toast it produces in the demo. */
async function triggerWarning(page: Page, suggestLabel: string, expectedText: string) {
  const suggest = page.getByRole('button', { name: suggestLabel }).first();
  await expect(suggest, 'the Suggest button is offered and enabled (the case has narrative text)').toBeEnabled({ timeout: 10_000 });
  await suggest.click();
  const toast = page.locator(TOAST_SHOWN);
  await expect(toast, 'a warning toast appears').toBeVisible({ timeout: 15_000 });
  await expect(toast, 'it is the warning kind').toHaveClass(/ps-save-toast--warning/);
  await expect(toast.locator('.ps-save-toast-text')).toHaveText(expectedText);
  return toast;
}

test.describe('PS-100 toast persistence: warnings stay until closed, short confirmations fade', () => {
  test('review steps 1 to 6', async ({ page }) => {
    test.setTimeout(180_000);

    // The AI provider is never reached: the warning comes from a refused call, offline and the same everywhere.
    await page.route('**/api/ai/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"refused by the review test"}' }));
    await test.step('1. Sign in as Pete Nimmo and open the draft case S26-4408', async () => {
      await signIn(page);
      await openCase(page, 'S26-4408');
      await expect(page.getByRole('button', { name: EN.saveDraft }).first(), 'the report is open as a draft (Save Draft offered)').toBeVisible({ timeout: 90_000 }); // first report on a cold dev server can take about a minute
    });

    await test.step('2. Save Draft: "Draft saved" appears, then fades on its own within 9 s', async () => {
      await page.getByRole('button', { name: EN.saveDraft }).first().click();
      const toast = page.locator(TOAST_SHOWN);
      await expect(toast, '"Draft saved" appears').toBeVisible({ timeout: 10_000 });
      await expect(toast.locator('.ps-save-toast-text')).toHaveText(EN.draftSaved);
      await expect(toast, 'it is not a warning').not.toHaveClass(/ps-save-toast--warning|ps-save-toast--error/);
      // The policy gives a short confirmation 4 to 9 s; this one is short, so the 4 s minimum.
      await expect(page.locator(TOAST_SHOWN), 'it fades by itself').toHaveCount(0, { timeout: 9_500 });
      await expect(page.locator(TOAST), 'and is hidden from assistive technology').toHaveAttribute('aria-hidden', 'true');
    });

    await test.step('3. Trigger a warning on the report page (Suggest Synoptic from Narrative; the AI call is refused)', async () => {
      await triggerWarning(page, EN.suggest, EN.aiFailed);
    });

    await test.step('4. After 10 s the warning is still showing, with ⚠ and wrappable, readable text', async () => {
      await page.waitForTimeout(10_000);
      const toast = page.locator(TOAST_SHOWN);
      await expect(toast, 'still showing after 10 s').toBeVisible();
      await expect(toast, 'still the warning kind').toHaveClass(/ps-save-toast--warning/);
      await expect(toast.locator('.ps-save-toast-text'), 'the text is still there').toHaveText(EN.aiFailed);
      await expect(toast.locator('.ps-save-toast-check'), 'the ⚠ symbol').toHaveText('⚠');
      await expect(toast, 'announced as an alert').toHaveAttribute('role', 'alert');
      // Readable, wrapped text: the message may wrap (not nowrap) and the toast is capped well inside the viewport,
      // so a long message must break onto more lines rather than run off the screen.
      const text = toast.locator('.ps-save-toast-text');
      const whiteSpace = await text.evaluate(el => getComputedStyle(el).whiteSpace);
      expect(whiteSpace, 'text may wrap').not.toBe('nowrap');
      expect(['pre-line', 'pre-wrap', 'normal'], 'text may wrap').toContain(whiteSpace);
      const box = (await toast.boundingBox())!;
      expect(box.width, 'the toast is narrower than its 520 px cap, so long text wraps').toBeLessThanOrEqual(520);
      const viewport = page.viewportSize()!;
      expect(box.x + box.width, 'inside the viewport').toBeLessThanOrEqual(viewport.width);
      const lineHeight = await text.evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
      const lines = Math.round((await text.boundingBox())!.height / lineHeight);
      test.info().annotations.push({ type: 'warning text lines', description: `${lines} (message is ${EN.aiFailed.length} characters)` });
    });

    await test.step('5. Close it with the ×; it goes away', async () => {
      const toast = page.locator(TOAST_SHOWN);
      await toast.getByRole('button', { name: EN.closeToast }).click();
      await expect(page.locator(TOAST_SHOWN), 'closed').toHaveCount(0, { timeout: 5_000 });
    });

    await test.step('6. Switch the language to French and repeat step 3: the warning appears in French, and stays', async () => {
      await page.getByRole('button', { name: EN.language, exact: true }).click();
      await page.getByRole('option', { name: EN.french }).click();
      await expect(page.locator('.ps-lang-switcher-btn'), 'the top bar shows FR').toHaveText(/FR/);
      const toast = await triggerWarning(page, FR.suggest, FR.aiFailed);
      await page.waitForTimeout(10_000);
      await expect(toast, 'still showing after 10 s, in French').toBeVisible();
      await expect(toast.locator('.ps-save-toast-text')).toHaveText(FR.aiFailed);
      await toast.getByRole('button', { name: FR.closeToast }).click();
      await expect(page.locator(TOAST_SHOWN), 'closed').toHaveCount(0, { timeout: 5_000 });
    });
  });
});
