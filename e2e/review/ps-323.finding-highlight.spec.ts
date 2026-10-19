// e2e/review/ps-323.finding-highlight.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-323 — "PS-133 Follow-up: Build the missing inline narrative-keyphrase
// highlighting in the report text editor": the review test plan, run against
// the demo (Vite dev server, localStorage data) as Pete Nimmo.
//
// Expected (ticket): flagged phrases are highlighted for the pathologist
// before sign-out, follow edits, and never change or dirty the saved report
// text.
//
// The critical-finding check asks the AI service (vite's /api/ai proxy). The
// spec answers it here the way a model would: it flags "invasive carcinoma"
// (Malignant) in each narrative field (GROSS / MICROSCOPIC / ANCILLARY) of the
// request that contains it, and nothing else. Every request it receives is
// kept, so a test can say what the check was actually sent.
//
// Case: S26-4408 (an LIS "assist" case). Finalize exists only on assist cases
// and the Report Draft only on Orchestration (O26-) cases, so no single case
// has both; the Report Draft half of step 3 can't follow a Finalize.
//
//   1. Open a case; in the Microscopic text type "invasive carcinoma".
//                                                                   automated
//      Specimen A's Microscopic Description: "Sections show invasive
//      carcinoma, grade 2." (✓ Save); specimen B gets the standard
//      attestation (Finalize refuses while a specimen has no saved
//      Microscopic Description).
//   2. Finalize: the Critical Finding Detected box appears; close it with
//      "Acknowledge without recording".                             automated
//      FAILS (app bug, reported; first test): the check is sent the case's
//      LIS narrative (diagnostic.microscopicDescription), not the Microscopic
//      Description just typed, so the typed phrase is never checked and no
//      box appears. (In the Report Draft, typed text reaches the check only
//      for sections whose id is literally "microscopic"/"gross_description"/
//      …; the demo templates' section ids are random UUIDs, so it never does,
//      and narrativeFieldForSection never matches a section to highlight.)
//      The second and third tests put the phrase into the case's stored LIS
//      narrative (microscopic, gross and ancillary) as well, so the check
//      flags it and steps 2–6 can be reviewed.
//   3. The flagged words are highlighted in the per-specimen Microscopic entry
//      panel.                                                       automated
//      Report Draft + its "short note above the section": not on an assist
//      case (see above); not automated.
//   4. Type elsewhere in the text: the highlight stays on the same words; ✓
//      Save: the saved text carries no highlight markup and is exactly the
//      editor's text.                                               automated
//      Reopen the case (reload, open the Microscopic Description again): the
//      highlight still sits on the same words.  automated, third test.
//      FAILS (reported): after reopening there is no highlight until Finalize
//      is pressed again (the flagged findings live only in the page's state,
//      useSignOutWorkflow criticalFindings).
//   5. Delete the flagged words: the highlight disappears, with no error.
//                                                                   automated
//   6. The Full Patient Report marks the same findings in its Gross,
//      Microscopic and Ancillary rows.                              automated
//
// Texts are the English values of criticalFindingsModal.*,
// microscopicEntryPanel.*, sidebar.* and leftReportPanel.* in
// src/i18n/locales/en.json; selectors are the app's own .ps-* classes
// (.ps-finding-hl is the highlight, findingHighlightExtension.ts /
// LeftReportPanel.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-323.finding-highlight.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

const T = {
  addMicroscopic: '+ Add Microscopic Description',      // sidebar.addMicroscopic
  save: '✓ Save',                                        // microscopicEntryPanel.saveButton
  insertAttestation: /^\+ Insert "Microscopic examination performed\."$/, // microscopicEntryPanel.insertAttestationButton + the literal
  finalize: /^\W*Finalize$/,                            // bottomActionBar finalize (shown with a 🔒 icon)
  boxHeader: /^\W*Critical Finding Detected$/,           // criticalFindingsModal.header (shown after a ⚠️)
  acknowledge: 'Acknowledge without recording',          // criticalFindingsModal.acknowledgeButton
};

const CASE = 'S26-4408';
const CASES_KEY = 'pathscribe_mock_cases';
const PHRASE = 'invasive carcinoma';
const TYPED = 'Sections show invasive carcinoma, grade 2.';

/** The AI service, answered locally; returns the list of critical-finding requests it received. */
async function answerAi(page: Page) {
  const checked: { gross: string; microscopic: string; ancillary: string }[] = [];
  await page.route('**/api/ai/**', r => {
    const body = r.request().postData() ?? '';
    let text = '{}';
    if (body.includes('critical or abnormal findings')) {
      const prompt: string = JSON.parse(body).messages?.[0]?.content ?? '';
      const field = (name: string) => prompt.match(new RegExp(`^${name}: (.*)$`, 'm'))?.[1] ?? '';
      const sent = { gross: field('GROSS'), microscopic: field('MICROSCOPIC'), ancillary: field('ANCILLARY') };
      checked.push(sent);
      const flags = (Object.keys(sent) as (keyof typeof sent)[])
        .filter(f => sent[f].toLowerCase().includes(PHRASE))
        .map(f => ({ term: PHRASE, sourceField: f, sourceQuote: PHRASE, severity: 'Malignant', confidence: 90 }));
      text = JSON.stringify({ flags });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text }], candidates: [] }) });
  });
  return checked;
}

async function openDemoCase(page: Page) {
  await page.goto('/worklist');
  await page.getByText(CASE, { exact: true }).first().click({ timeout: 120_000 });
  await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
}

/** Puts the phrase into the case's stored LIS narrative (gross, microscopic, ancillary), before the app reads it. */
async function narrativeWithPhrase(page: Page) {
  await page.goto('/worklist');
  await expect(page.getByText(CASE, { exact: true }).first()).toBeVisible({ timeout: 120_000 });
  await page.evaluate(({ key, id }) => {
    const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
    const d = cases.find((x: { id: string }) => x.id === id).diagnostic;
    d.grossDescription = `${d.grossDescription} Cut surface suggests invasive carcinoma.`;
    d.microscopicDescription = `Sections show invasive carcinoma, grade 2. ${d.microscopicDescription}`;
    d.ancillaryStudies = `${d.ancillaryStudies} Pattern consistent with invasive carcinoma.`;
    localStorage.setItem(key, JSON.stringify(cases));
  }, { key: CASES_KEY, id: CASE });
  await page.reload();
}

const panel = (page: Page) => page.locator('.ps-micro-entry');
const editor = (page: Page) => panel(page).locator('.ProseMirror');
const highlights = (page: Page) => editor(page).locator('.ps-finding-hl');
const microRowA = (page: Page) => page.locator('.ps-syn-instance-row').filter({ has: page.locator('.ps-syn-instance-type-label--microscopic') }).first();

/** Step 1: specimen A's Microscopic Description with the phrase; specimen B's with the attestation; both saved. */
async function writeMicroscopics(page: Page) {
  await page.getByText(T.addMicroscopic).first().click();
  await editor(page).click();
  await page.keyboard.type(TYPED);
  await panel(page).getByRole('button', { name: T.save, exact: true }).click();
  await expect(microRowA(page), "specimen A's Microscopic Description is listed").toBeVisible();
  await page.getByText(T.addMicroscopic).first().click(); // now specimen B's
  await panel(page).getByRole('button', { name: T.insertAttestation }).click();
  await panel(page).getByRole('button', { name: T.save, exact: true }).click();
  await expect(page.getByText(T.addMicroscopic), 'both specimens have one').toHaveCount(0);
}

/** Step 2: Finalize → the box → Acknowledge without recording. */
async function finalizeAndAcknowledge(page: Page) {
  await page.getByRole('button', { name: T.finalize }).click();
  const box = page.getByText(T.boxHeader);
  await expect(box, 'the Critical Finding Detected box').toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: T.acknowledge, exact: true }).click();
  await expect(box).toHaveCount(0);
}

/** The Microscopic Description of specimen A as stored. */
const storedMicroA = (page: Page) => page.evaluate(({ key, id }) => {
  const c = JSON.parse(localStorage.getItem(key) ?? '[]').find((x: { id: string }) => x.id === id);
  const spA = c.specimens[0].id;
  return (c.microscopicReports ?? []).find((m: { specimenId: string }) => m.specimenId === spA)?.text ?? null;
}, { key: CASES_KEY, id: CASE });

test.describe('PS-323 critical findings highlighted in the narrative', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(u => u.hostname !== 'localhost', r => r.abort()); // nothing leaves the machine
    await signIn(page);
  });

  test('Steps 1–2 as written: a phrase typed into the Microscopic Description is checked at Finalize', async ({ page }) => {
    test.setTimeout(300_000);
    const checked = await answerAi(page);
    await test.step('1. S26-4408: type "invasive carcinoma" into the Microscopic Description and save', async () => {
      await openDemoCase(page);
      await writeMicroscopics(page);
      expect(await storedMicroA(page)).toContain(TYPED);
    });
    await test.step('2. Finalize: the check is sent the typed text, and the Critical Finding Detected box appears', async () => {
      await page.getByRole('button', { name: T.finalize }).click();
      await expect.poll(() => checked.length, { message: 'the critical-finding check ran', timeout: 30_000 }).toBeGreaterThan(0);
      expect(checked.at(-1)?.microscopic, 'the Microscopic text the check was sent').toContain(PHRASE);
      await expect(page.getByText(T.boxHeader)).toBeVisible({ timeout: 30_000 });
    });
  });

  test('Steps 2–6 with the phrase in the case narrative: highlight in the Microscopic entry, follows edits, never saved; Full Patient Report rows marked', async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await answerAi(page);

    await test.step('1. The case narrative carries the phrase; type it into specimen A\'s Microscopic Description and save', async () => {
      await narrativeWithPhrase(page);
      await openDemoCase(page);
      await writeMicroscopics(page);
    });

    await test.step('2. Finalize: the Critical Finding Detected box; Acknowledge without recording', async () => {
      await finalizeAndAcknowledge(page);
    });

    await test.step('3. The flagged words are highlighted in specimen A\'s Microscopic entry panel', async () => {
      await microRowA(page).click();
      await expect(editor(page)).toContainText(TYPED);
      await expect(highlights(page), 'one highlight').toHaveCount(1);
      await expect(highlights(page)).toHaveText(PHRASE);
      await expect(highlights(page)).toHaveAttribute('data-finding-term', PHRASE);
    });

    await test.step('4. Type elsewhere: the highlight stays on the same words; save: the saved text has no highlight in it', async () => {
      await editor(page).click();
      await editor(page).press('Control+End');
      await page.keyboard.type(' No lymphovascular invasion.');
      await expect(highlights(page)).toHaveCount(1);
      await expect(highlights(page)).toHaveText(PHRASE);
      await panel(page).getByRole('button', { name: T.save, exact: true }).click();
      await expect.poll(() => storedMicroA(page), { message: 'saved' }).toContain('No lymphovascular invasion.');
      const saved = (await storedMicroA(page)) as string;
      expect(saved, 'no highlight markup in the saved text').not.toMatch(/ps-finding-hl|<mark|data-finding-term/);
      expect(saved).toBe(`<p>${TYPED} No lymphovascular invasion.</p>`);
    });

    await test.step('5. Delete the flagged words: the highlight disappears, with no error', async () => {
      await editor(page).click();
      await editor(page).press('Control+Home');
      // "Sections show " is 14 characters; then delete the 18 of "invasive carcinoma", one key at a time.
      for (let i = 0; i < 14; i++) await editor(page).press('ArrowRight');
      for (let i = 0; i < PHRASE.length; i++) await editor(page).press('Delete');
      await expect(editor(page)).toContainText('Sections show , grade 2.');
      await expect(highlights(page), 'no highlight left').toHaveCount(0);
      expect(errors, 'no page errors').toEqual([]);
    });

    await test.step('6. The Full Patient Report marks the findings in its Gross, Microscopic and Ancillary rows', async () => {
      const report = page.locator('.ps-leftreport-section');
      for (const title of [/gross/i, /microscopic/i, /ancillary/i]) {
        const row = report.filter({ has: page.locator('.ps-leftreport-section-title', { hasText: title }) });
        await expect(row.locator('mark.ps-finding-hl'), `${title} row marked`).toHaveText(new RegExp(PHRASE, 'i'));
      }
    });
  });

  test('Step 4 (reopen): after saving and reopening the case, the highlight still sits on the same words', async ({ page }) => {
    test.setTimeout(300_000);
    await answerAi(page);
    await test.step('1–3. Narrative with the phrase; Microscopic Descriptions saved; Finalize and acknowledge; highlighted', async () => {
      await narrativeWithPhrase(page);
      await openDemoCase(page);
      await writeMicroscopics(page);
      await finalizeAndAcknowledge(page);
      await microRowA(page).click();
      await expect(highlights(page)).toHaveText(PHRASE);
    });
    await test.step('4. Reopen the case (reload) and the Microscopic Description: the highlight is still on the same words', async () => {
      page.on('dialog', d => { void (d.type() === 'beforeunload' ? d.accept() : d.dismiss()); });
      await page.reload();
      await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
      await microRowA(page).click();
      await expect(editor(page)).toContainText(TYPED);
      await expect(highlights(page), 'still highlighted after reopening').toHaveText(PHRASE);
    });
  });
});
