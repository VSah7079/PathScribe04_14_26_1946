// e2e/review/ps-473.html-sanitising.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-473 — "HTML sanitising: comments, report sections and barcodes render
// safely": the review test plan, run against the demo (Vite dev server,
// localStorage data) as Pete Nimmo.
//
// Expected (ticket): no injected script runs anywhere; reports, comments and
// barcodes look as before; tests pass.
//
// Every test listens for the page's `dialog` event: any alert/confirm/prompt
// that opens fails the test (an XSS payload that ran).
//
//   1. Sign in as Pete, open a case (S26-4408) and post a case comment
//      containing <img src=x onerror=alert(1)> and <script>alert(1)</script>.
//                                                                   automated
//   2. Reopen the comment (close the window, reopen it, and again after a
//      reload): no pop-up; the text shows harmlessly (as literal text, with no
//      <img> or <script> element in the thread).                    automated
//      Note: posting a comment (saved at once) still leaves the report page
//      marked unsaved, so the reload raises the browser's leave warning; the
//      test accepts that one (it is not a payload).
//   3. Normal formatting (bold, lists) and PHI masking still look as before in
//      reports and comments, in French, German, Dutch and Korean.
//      needs a person: "looks as before" is a visual judgement in five
//      languages (no baseline screenshots exist). What is automated (in step
//      5): bold, list items, the report's own classes and data-phi survive
//      the sanitiser in a stored comment and a report section.
//   4. Configuration → System → Workstation & Hardware → Label Designer, and a
//      new container (Batch Management → New Container): the barcodes still
//      draw (an <svg> with bar paths, no error box).                automated
//      The Label Designer has no field placed on any label type in the demo
//      (every canvas starts empty), so the test drags "GS1 DataMatrix Barcode"
//      from the Block (Cassette) Label palette onto the canvas first.
//   5. QA: a standard XSS payload list (inside this spec), each shown on
//      screen with nothing run, no event-handler attribute, no
//      script/iframe/object/embed/form element and no javascript: URL left,
//      and hovering / clicking what is left runs nothing:     automated
//      a. stored as case comment HTML (S26-4408), the way a modified client or
//         a bad API record would store it;
//      b. stored as a specimen comment (ReportCommentModal);
//      c. as a report section: O26-0001 → Gen. Report with the AI writer's
//         answer (stubbed here) being the payload list; shown in the Report
//         Draft's centre preview (ReportPreviewRenderer) and its editor.
//      Bold, italic, list items, the report's own classes and data-phi survive
//      in the comments (a, b). In the AI section (c) the generator turns the
//      answer into plain paragraphs before display, so formatting is not
//      checked there.
//      Not used, and reported: a stored Report Draft section can't be shown
//      after a reload in the demo (the demo report template gives its sections
//      new random ids on every page load, so the preview shows "Not yet
//      generated" for saved text), and another window's save of an O26- case
//      raises no "Someone else saved this case" notice in the demo.
//      Server-side sanitising on save is for the API server (phase 2e): not
//      testable here.
//   6. `npx vitest run src/services/security/sanitizeHtml.test.ts
//      src/services/security/htmlSanitising.guard.test.ts` — CLI, run
//      outside this spec.
//
// Texts are the English values of caseCommentModal.*, synopticComments.*,
// sidebar.caseComment.*, commentModalShell.*, labelDesignerPage.* and
// newContainerModal.* in src/i18n/locales/en.json; selectors are the app's
// own .ps-* / .rp-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-473.html-sanitising.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type Locator, type Dialog } from '@playwright/test';
import { signIn } from './helpers';

const T = {
  addCaseComment: '+ Add Case Comment',        // sidebar.caseComment.add (with the "+ " the sidebar adds)
  editCaseComment: 'Edit Case Comment',        // sidebar.caseComment.edit
  caseCommentTitle: 'Case Comment',            // caseCommentModal.title
  postComment: 'Post Comment',                 // synopticComments.postComment
  close: 'Close',                              // commentModalShell.close
  reportDraft: 'Report Draft',                 // synopticReportPage tab label
  saveDraft: 'Save Draft',                     // bottom bar
  genReport: 'Gen. Report',                    // bottom action bar (Generate AI report draft)
  labelType: 'Label Type',                     // labelDesignerPage.labelTypeLabel
  labelDesigner: 'Label Designer',             // labelDesignerPage.title
  barcodeFailed: 'barcode render failed',      // labelDesignerPage.barcodeRenderFailed
  blockBarcode: 'GS1 DataMatrix Barcode',      // LABEL_FIELD_CATALOG.block (palette item)
  newContainer: 'New Container',               // batchManagement.newContainer
  generateAndPrint: 'Generate & Print',        // newContainerModal.generateAndPrint
  containerCreated: 'Container Created',       // newContainerModal.containerCreated
};

const CASE = 'S26-4408';            // demo LIS case (pathscribe_mock_cases)
const ORCH_CASE = 'O26-0001';       // demo Orchestrator case with a Report Draft (pathscribe_mock_orch_cases_v3)
const CASES_KEY = 'pathscribe_mock_cases';

// Step 1's two payloads, typed into the composer as a person would.
const TYPED_PAYLOAD = '<img src=x onerror=alert(1)> <script>alert(1)</script>';

// Step 5: a short standard XSS payload list (OWASP XSS filter-evasion classics, plus an mXSS one).
const XSS_PAYLOADS = [
  '<img src=x onerror=alert("xss-01")>',
  '<script>alert("xss-02")</script>',
  '<svg onload=alert("xss-03")><circle r="4"/></svg>',
  '<iframe src="javascript:alert(\'xss-04\')"></iframe>',
  '<a id="xss-05" href="javascript:alert(\'xss-05\')">xss-05 link</a>',
  '<body onload=alert("xss-06")>',
  '<input autofocus onfocus=alert("xss-07")>',
  '<details open ontoggle=alert("xss-08")><summary>xss-08</summary></details>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert("xss-09")></style></mglyph></table></mtext></math>',
  '<div style="background:url(javascript:alert(\'xss-10\'))">xss-10</div>',
  '<object data="javascript:alert(\'xss-11\')"></object>',
  '<embed src="javascript:alert(\'xss-12\')">',
  '<form action="javascript:alert(\'xss-13\')"><button>xss-13</button></form>',
  '<span id="xss-14" onmouseover=alert("xss-14")>xss-14 hover</span>',
  '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;(\'xss-15\')">',
  '<a id="xss-16" href="&#x6A;avascript:alert(\'xss-16\')">xss-16 link</a>',
  '<base href="javascript:alert(\'xss-17\')//">',
  '<video><source onerror=alert("xss-18")></video>',
];
// Ordinary formatting that must survive (ticket: data-phi and the report's own classes too).
const FORMATTING_HTML = '<p><strong>E2E-473 bold</strong> and <em>italic</em></p><ul><li>E2E-473 item one</li><li>item two</li></ul><p><span data-phi="mrn" class="ps-e2e-473">100008</span></p>';
const PAYLOAD_HTML = XSS_PAYLOADS.map(p => `<p>${p}</p>`).join('') + FORMATTING_HTML;

/**
 * Records every alert / confirm / prompt that opens (an XSS payload that ran); the test then
 * expects the list to be empty. The browser's own "leave this page?" (beforeunload) is not a
 * payload: posting a case comment leaves the report page marked unsaved, so a reload asks; it is
 * accepted so the reload goes ahead.
 */
function watchDialogs(page: Page) {
  const seen: string[] = [];
  page.on('dialog', (d: Dialog) => {
    if (d.type() === 'beforeunload') { void d.accept(); return; }
    seen.push(`${d.type()}: ${d.message()}`);
    void d.dismiss();
  });
  return seen;
}

/** Nothing that can run script survives inside `root`. */
async function expectInert(root: Locator, what: string) {
  const found = await root.evaluateAll(els => {
    const bad: string[] = [];
    for (const el of els) {
      for (const n of [el, ...Array.from(el.querySelectorAll('*'))]) {
        const tag = n.tagName.toLowerCase();
        if (['script', 'iframe', 'object', 'embed', 'form', 'base', 'input', 'button', 'style', 'body'].includes(tag) && n !== el) bad.push(`<${tag}>`);
        for (const a of Array.from(n.attributes)) {
          if (/^on/i.test(a.name)) bad.push(`<${tag} ${a.name}>`);
          if (/^\s*(javascript|vbscript|data:text\/html)/i.test(a.value) && /^(href|src|action|data|formaction|xlink:href)$/i.test(a.name)) bad.push(`<${tag} ${a.name}=${a.value}>`);
          if (a.name === 'style' && /url\s*\(|expression/i.test(a.value)) bad.push(`<${tag} style=${a.value}>`);
        }
      }
    }
    return bad;
  });
  expect(found, `${what}: nothing executable left in the rendered HTML`).toEqual([]);
}

/**
 * Hover and click what is left of the interactive payloads (the two javascript: links' text and the
 * onmouseover span's text, which the sanitiser keeps as plain content): nothing may run, and the page
 * stays where it is.
 */
async function poke(page: Page, root: Locator) {
  const before = page.url();
  for (const text of ['xss-05 link', 'xss-14 hover', 'xss-16 link']) {
    const el = root.getByText(text).first();
    await expect(el, `"${text}" is still shown, as text`).toBeVisible();
    await el.scrollIntoViewIfNeeded();
    await el.hover();
    await el.click();
  }
  expect(page.url(), 'still on the same page after clicking the leftovers').toBe(before);
}

// Timeouts are long: the dev server compiles each screen on first use, slowly on a loaded machine.
async function openDemoCase(page: Page, accession: string) {
  await page.goto('/worklist');
  await page.getByText(accession, { exact: true }).first().click({ timeout: 120_000 });
  await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
}

/** Opens a screen and waits for its heading (helpers.openScreen, without its fixed pause). */
async function openScreen(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 120_000 });
}

const caseCommentModal = (page: Page) => page.locator('.ps-cmnt-modal').filter({ has: page.locator('.ps-cmnt-title', { hasText: T.caseCommentTitle }) });

async function openCaseCommentWindow(page: Page) {
  await page.locator('.ps-syn-comment-btn').first().click();
  await expect(caseCommentModal(page)).toBeVisible();
}

async function closeCommentWindow(page: Page) {
  await page.locator('.ps-cmnt-modal').getByRole('button', { name: T.close, exact: true }).click();
  await expect(page.locator('.ps-cmnt-modal')).toHaveCount(0);
}

/** Writes comment HTML straight into the stored demo case, as a modified client / bad API record would. */
async function storeCaseComments(page: Page, html: string) {
  await expect.poll(() => page.evaluate(k => !!localStorage.getItem(k), CASES_KEY), { message: 'the demo cases are stored' }).toBe(true);
  await page.evaluate(({ key, id, html }) => {
    const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
    const c = cases.find((x: { id: string }) => x.id === id);
    const at = new Date().toISOString();
    c.order = c.order ?? {};
    c.order.caseComments = [{ id: 'cmt-e2e-473', authorId: 'PATH-001', authorName: 'Pete Nimmo', text: html, createdAt: at, origin: 'pathscribe', syncStatus: 'pending' }];
    // A specimen comment too (ReportCommentModal).
    const sp = c.specimens[0];
    sp.comments = [{ id: 'scmt-e2e-473', authorId: 'PATH-001', authorName: 'Pete Nimmo', text: html, createdAt: at, origin: 'pathscribe', syncStatus: 'pending' }];
    c.version = (c.version ?? 0) + 1;
    localStorage.setItem(key, JSON.stringify(cases));
  }, { key: CASES_KEY, id: CASE, html });
}

test.describe('PS-473 stored HTML renders safely', () => {
  test.beforeEach(async ({ page }) => {
    // No call leaves the machine: anything not served by the local dev server is refused, and the AI
    // service (vite's /api/ai proxy, which would call out) is answered here.
    await page.route(u => u.hostname !== 'localhost', r => r.abort());
    await page.route('**/api/ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], candidates: [] }) }));
    await signIn(page);
  });

  test('Steps 1–2: a case comment with <img onerror> and <script> posts and reopens as harmless text', async ({ page }) => {
    test.setTimeout(300_000);
    const dialogs = watchDialogs(page);

    await test.step('1. Open S26-4408 and post a case comment containing <img src=x onerror=alert(1)> and <script>alert(1)</script>', async () => {
      await openDemoCase(page, CASE);
      await expect(page.locator('.ps-syn-comment-btn').first()).toContainText(T.addCaseComment);
      await openCaseCommentWindow(page);
      const modal = caseCommentModal(page);
      await modal.locator('.ProseMirror').click();
      await page.keyboard.type(TYPED_PAYLOAD);
      await modal.getByRole('button', { name: T.postComment, exact: true }).click();
      const item = modal.locator('.ps-cmnt-thread-item');
      await expect(item, 'one comment posted').toHaveCount(1);
      await expect(item.locator('.ps-cmnt-thread-text')).toHaveText(TYPED_PAYLOAD);
      expect(dialogs, 'no pop-up while posting').toEqual([]);
    });

    await test.step('2. Reopen the comment (and again after a reload): no pop-up; the text shows harmlessly', async () => {
      await closeCommentWindow(page);
      await expect(page.locator('.ps-syn-comment-btn').first()).toContainText(T.editCaseComment);
      await openCaseCommentWindow(page);
      let text = caseCommentModal(page).locator('.ps-cmnt-thread-text');
      await expect(text).toHaveText(TYPED_PAYLOAD);
      await expect(text.locator('img, script'), 'no <img> or <script> element').toHaveCount(0);
      await expectInert(text, 'reopened comment');
      // Stored as text (escaped), never as live markup.
      const stored = await page.evaluate(({ key, id }) => {
        const c = JSON.parse(localStorage.getItem(key) ?? '[]').find((x: { id: string }) => x.id === id);
        return (c?.order?.caseComments ?? []).map((x: { text: string }) => x.text);
      }, { key: CASES_KEY, id: CASE });
      expect(stored, 'the saved comment holds the payload as escaped text').toEqual([`<p>${TYPED_PAYLOAD.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`]);
      await closeCommentWindow(page);
      await page.reload();
      await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
      await openCaseCommentWindow(page);
      text = caseCommentModal(page).locator('.ps-cmnt-thread-text');
      await expect(text).toHaveText(TYPED_PAYLOAD);
      await expectInert(text, 'comment after reload');
      expect(dialogs, 'no pop-up anywhere').toEqual([]);
    });
  });

  test('Step 5 (comments): a standard XSS payload list stored as case and specimen comment HTML runs nothing; formatting and data-phi survive', async ({ page }) => {
    test.setTimeout(300_000);
    const dialogs = watchDialogs(page);

    await test.step('5a. Case comment: the payload list shows with nothing executable and no pop-up', async () => {
      await page.goto('/worklist');
      await expect(page.getByText(CASE, { exact: true }).first()).toBeVisible({ timeout: 120_000 });
      await storeCaseComments(page, PAYLOAD_HTML);
      await openDemoCase(page, CASE);
      await openCaseCommentWindow(page);
      const text = caseCommentModal(page).locator('.ps-cmnt-thread-text');
      await expect(text).toHaveCount(1);
      await expect(text).toContainText('E2E-473 item one');
      await expectInert(text, 'case comment');
      // Ordinary formatting and PHI tagging survive.
      await expect(text.locator('strong', { hasText: 'E2E-473 bold' })).toHaveCount(1);
      await expect(text.locator('em', { hasText: 'italic' })).toHaveCount(1);
      await expect(text.locator('ul > li')).toHaveCount(2);
      await expect(text.locator('span[data-phi="mrn"].ps-e2e-473')).toHaveText('100008');
      await poke(page, text);
      expect(dialogs, 'no payload ran in the case comment').toEqual([]);
      await closeCommentWindow(page);
    });

    await test.step('5b. Specimen comment: the same list, the same result', async () => {
      // The 💬 on specimen A's row in the sidebar (Sidebar.tsx .ps-specimen-comment-btn).
      await page.locator('.ps-specimen-comment-btn').first().click();
      const modal = page.locator('.ps-cmnt-modal');
      await expect(modal).toBeVisible();
      const text = modal.locator('.ps-cmnt-thread-text');
      await expect(text).toHaveCount(1);
      await expect(text).toContainText('E2E-473 item one');
      await expectInert(text, 'specimen comment');
      await expect(text.locator('span[data-phi="mrn"]')).toHaveText('100008');
      await poke(page, text);
      expect(dialogs, 'no payload ran in the specimen comment').toEqual([]);
      await closeCommentWindow(page);
    });
  });

  test('Step 5 (report sections): the payload list as an AI-written Report Draft section runs nothing', async ({ page }) => {
    test.setTimeout(300_000);
    const dialogs = watchDialogs(page);
    // The AI writer's answer is the payload list (Anthropic-style stream; the page asks with "stream": true).
    await page.route('**/api/ai/**', r => {
      const body = r.request().postData() ?? '';
      if (body.includes('"stream":true')) {
        return r.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: PAYLOAD_HTML } })}\n\ndata: {"type":"message_stop"}\n\n` });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], candidates: [] }) });
    });

    await test.step('5c. O26-0001 → Gen. Report: the AI-written section shows in the Report Draft preview with nothing executable and no pop-up', async () => {
      await page.goto(`/case/${ORCH_CASE}/synoptic`);
      await expect(page.locator('.ps-syn-tabbar')).toBeVisible({ timeout: 120_000 });
      await page.getByRole('button', { name: new RegExp(T.genReport) }).click();
      const body = page.locator('.rp-section-body').filter({ hasText: 'E2E-473 item one' });
      await expect(body, 'the AI-written section shows in the report preview').toHaveCount(1, { timeout: 60_000 });
      await expectInert(body, 'report section');
      // The section editor (TipTap) holds the same text; nothing there runs either.
      await expectInert(page.locator('.ps-ose-section-card .ProseMirror'), 'section editors');
      await poke(page, body);
      expect(dialogs, 'no payload ran in the report section').toEqual([]);
    });
  });

  test('Step 4: Label Designer and a new container still draw their barcodes', async ({ page }) => {
    test.setTimeout(300_000);
    const dialogs = watchDialogs(page);

    await test.step('4a. Configuration → System → Workstation & Hardware → Label Designer: a placed barcode draws as an SVG', async () => {
      await openScreen(page, '/configuration?tab=system&section=label_designer', T.labelDesigner);
      await page.getByLabel(T.labelType, { exact: true }).selectOption('block');
      const canvas = page.locator('.ps-designer-canvas');
      await expect(page.locator('.ps-palette-item').filter({ hasText: T.blockBarcode }), 'the barcode is offered').toHaveCount(1);
      await expect(canvas.locator('.ps-designer-field'), 'the demo canvas starts empty').toHaveCount(0);
      // A real drag (HTML5 drag and drop) to a point near the canvas's top-left corner, inside the window.
      await canvas.scrollIntoViewIfNeeded();
      await page.locator('.ps-palette-item').filter({ hasText: T.blockBarcode }).dragTo(canvas, { targetPosition: { x: 12, y: 12 } });
      const fill = canvas.locator('.ps-designer-field-barcode-fill');
      await expect(fill).toHaveCount(1);
      await expect(fill.locator('svg')).toBeVisible();
      await expect(fill, 'no render-failed box').not.toContainText(T.barcodeFailed);
      const d = await fill.locator('svg path').first().getAttribute('d');
      expect(d?.length ?? 0, 'the 2-D code has its modules').toBeGreaterThan(200);
    });

    await test.step('4b. Batch Management → New Container → Generate & Print: the master barcode draws as an SVG', async () => {
      // The print button is never pressed; window.print is stubbed anyway so nothing reaches a printer.
      await page.evaluate(() => { window.print = () => {}; });
      await openScreen(page, '/batch-management', /Batch/);
      await page.getByRole('button', { name: new RegExp(T.newContainer) }).click();
      await page.locator('#batch-protocol').fill('E2E-473 protocol');
      await page.getByRole('button', { name: T.generateAndPrint, exact: true }).click();
      const modal = page.locator('.ps-batch-create-modal');
      await expect(modal).toContainText(T.containerCreated);
      const wrap = modal.locator('.ps-batch-barcode-svg-wrap');
      await expect(wrap.locator('svg')).toBeVisible();
      const d = await wrap.locator('svg path').first().getAttribute('d');
      expect((d?.match(/M/g) ?? []).length, 'a 1-D barcode: many bars').toBeGreaterThan(15);
      await expectInert(wrap, 'barcode SVG');
      expect(dialogs).toEqual([]);
    });
  });
});
