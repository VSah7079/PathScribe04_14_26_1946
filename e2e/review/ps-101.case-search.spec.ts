// e2e/review/ps-101.case-search.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-101 "Search does not appear to be working": the review test plan, run
// against the demo (Vite dev server, localStorage data), signed in as Pete.
//
// Automated here (one test.step per review step):
//   1. Case Search with no dates chosen: MRN 100001 finds 2 cases and the
//      summary says "all accession dates".
//   2. S26-4403 and Williams, no dates: each finds its case.
//   3. Clear, list all cases (All dates): the pager reads "1–25 of N" (N ≥ 25;
//      N is recorded as an annotation), page size 25/50/100, sort, page 2,
//      open a case and come back: page 2 is restored.
//   4. Filters: diagnosis "adenocarcinoma", REQ-2026-44002, flag "Second
//      Opinion Requested", case type Gyn cytology, More filters → CPT 88307.
//   5. Performing lab: Manchester Trust (its sites included), Wythenshawe,
//      Henry Ford, Midwest; as Pete, and as a Manchester and a Midwest user.
//   6. Export CSV holds every match (not just the page); save a search, reload
//      the page, load the saved search.
//   7. Header search bar: O26-000 + Enter shows flag chips and readable
//      status labels.
//
// Still for a person: the look of the flag chips and status colours; the
// browser's own download prompt on a real desktop; the export against the API
// server (the demo builds the CSV in the browser).
//
// Counts that differ from the ticket (each verified against the demo data in
// src/services by running the case search service over it as the same user):
//   • All cases: the demo has 118 for Pete, not "99". The test asserts the
//     1–25 of N pattern and records N.
//   • Diagnosis "adenocarcinoma": 7 cases, not 2 (S26-4464, S26-4465,
//     S26-4491, S26-4493, S26-4670, S26-4671, S26-4673).
//   • Flag "Second Opinion Requested": 5 cases, not 6 (O26-0009, O26-0013,
//     O26-0020, O26-0023, S26-4405).
//   • Performing lab, as Pete: Manchester Trust 0 (not 6), Wythenshawe 0 (not
//     3), Henry Ford 5 (not 6), Midwest 0 (not 3). Pete's staff record is at
//     Desert Valley; Manchester and Midwest are "Approval required" for
//     support access in the demo (services/supportAccess/demoSupportAccessSeed.ts),
//     so their cases are kept from him until that organisation approves a
//     request. Henry Ford is "Always allowed", but its sixth case
//     (MPA26-1006-POOL) belongs to Midwest, so it too is hidden. The ticket's
//     figures hold for a member of those organisations: Paul Carter
//     (PATH-UK-001, Manchester) finds 9 for the Trust (the ticket said 6) and
//     3 for Wythenshawe; Amber Fehrs-Battey (PATH-US-001, Midwest) finds 3 for
//     Midwest. Those are asserted in their own tests below.
//   • Gyn cytology: 30 cases; CPT 88307: 3 cases (the ticket gave no figure).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium e2e/review/ps-101.case-search.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signIn } from './helpers';

// Figures from the demo data (see the header).
const EXPECTED = {
  mrn100001: 2,
  s264403: 1,
  williams: 1,
  adenocarcinoma: 7,
  req202644002: 1,
  secondOpinion: 5,
  gynCytology: 30,
  cpt88307: 3,
  labsAsPete: { manchester: 0, wythenshawe: 0, henryFord: 5, midwest: 0 },
  labsAsManchester: { manchester: 9, wythenshawe: 3 },
  labsAsMidwest: { midwest: 3 },
} as const;

const MANCHESTER_USER = { id: 'PATH-UK-001', name: 'Paul Carter', role: 'pathologist' };
const MIDWEST_USER = { id: 'PATH-US-001', name: 'Amber Fehrs-Battey', role: 'pathologist' };

// ── Page helpers (English texts from en.json, or stable .ps-* classes) ───────

async function openSearch(page: Page) {
  await page.goto('/search');
  await expect(page.locator('.ps-search-title-block-title').filter({ hasText: 'Case Search' })).toBeVisible({ timeout: 20_000 });
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
  await page.locator('.ps-searchpage-save-new-btn').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
}

/** The filter sidebar folds away after each search; this opens it again. */
async function expandFilters(page: Page) {
  const rail = page.locator('.ps-search-rail-toggle');
  if (await rail.count()) await rail.click();
  await expect(page.locator('.ps-search-form')).toBeVisible();
}

const identifierBox = (page: Page) => page.getByPlaceholder('Accession #, patient name, or MRN…');

async function runSearch(page: Page) {
  await page.getByRole('button', { name: 'Search Cases', exact: true }).click();
  await expect(page.locator('.ps-search-btn-submit, .ps-search-rail-toggle').first()).toBeVisible();
  // The result count (or "No cases match") appears once the service answers.
  await expect(page.locator('.ps-searchpage-result-count')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(300);
}

/** The "{from}–{to} of {count} cases" line, parsed; total 0 for "No cases match". */
async function resultRange(page: Page): Promise<{ from: number; to: number; total: number }> {
  const text = (await page.locator('.ps-searchpage-result-count').textContent()) ?? '';
  if (text.includes('No cases match')) return { from: 0, to: 0, total: 0 };
  const m = text.match(/(\d+)–(\d+) of (\d+) cases?/);
  expect(m, `result count line "${text}" reads "{from}–{to} of {count} cases"`).not.toBeNull();
  return { from: Number(m![1]), to: Number(m![2]), total: Number(m![3]) };
}

async function expectTotal(page: Page, expected: number, what: string) {
  const r = await resultRange(page);
  expect(r.total, `${what}: ${r.total} case(s) found`).toBe(expected);
}

/** Clears the form (back to the 30-day default) and chooses "All" accession dates. */
async function clearAndAllDates(page: Page) {
  await expandFilters(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.locator('.ps-searchpage-date-shortcut-btn--all').click();
  await expect(page.locator('.ps-searchpage-date-shortcut-btn--all')).toHaveClass(/--all-active/);
}

/** The Browse button of a sidebar section, found by its exact section label. */
function browseFor(page: Page, label: string) {
  return page.locator('.ps-searchpage-header-row')
    .filter({ has: page.locator('.ps-searchpage-section-label', { hasText: new RegExp(`^${label}$`) }) })
    .locator('.ps-searchpage-browse-btn');
}

async function openMoreFilters(page: Page) {
  const toggle = page.locator('.ps-searchpage-more-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

/** More filters → Performing lab → picks one lab by its exact name, closes the picker. */
async function choosePerformingLab(page: Page, name: string) {
  await openMoreFilters(page);
  await browseFor(page, 'Performing lab').click();
  const modal = page.locator('.ps-lookup-modal');
  await expect(modal.locator('.ps-lookup-title')).toHaveText('Performing lab');
  await modal.locator('.ps-lookup-item').filter({ has: page.locator('.ps-lookup-item-primary', { hasText: new RegExp(`^${name}$`) }) }).click();
  await modal.locator('.ps-lookup-done-btn').click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.ps-searchpage-chip').filter({ hasText: name })).toHaveCount(1);
  // The hint that a Trust includes its sites (shown while a lab is chosen; the sidebar folds after the search).
  await expect(page.locator('.ps-searchpage-org-hint').first()).toHaveText('A Trust or other parent organisation includes the sites under it.');
}

/** Searches by one performing lab (All dates, nothing else) and returns the total. */
async function labTotal(page: Page, name: string): Promise<number> {
  await clearAndAllDates(page);
  await choosePerformingLab(page, name);
  await runSearch(page);
  await expect(page.locator('.ps-searchpage-summary-text')).toContainText(`performing lab: ${name}`);
  return (await resultRange(page)).total;
}

/** RFC 4180 row count of a CSV (quoted fields may hold commas and newlines), without the header. */
function csvDataRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.slice(1).filter(r => r.length > 1 || r[0] !== '');
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('PS-101 Search does not appear to be working', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Steps 1–2: identifier searches with no dates chosen (MRN, accession, patient name)', async ({ page }) => {
    test.setTimeout(180_000);
    await openSearch(page);

    await test.step('1. MRN 100001, no dates: 2 cases, "all accession dates"', async () => {
      await identifierBox(page).fill('100001');
      // A six-digit number could be an MRN or an accession's number: the box says "All fields" and searches both.
      await expect(page.locator('.ps-searchpage-identifier-badge')).toHaveText('All fields');
      await expect(page.locator('.ps-searchpage-identifier-hint')).toHaveText('Searches all accession dates unless you choose a date range above.');
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('all accession dates');
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('"100001"');
      await expectTotal(page, EXPECTED.mrn100001, 'MRN 100001');
      await expect(page.locator('.wl-card')).toHaveCount(EXPECTED.mrn100001);
    });

    await test.step('2a. Accession S26-4403, no dates: its case', async () => {
      await expandFilters(page);
      await identifierBox(page).fill('S26-4403');
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('all accession dates');
      await expectTotal(page, EXPECTED.s264403, 'S26-4403');
      await expect(page.locator('.wl-card .wl-case-id').first()).toHaveText('S26-4403');
    });

    await test.step('2b. Patient name Williams, no dates: its case', async () => {
      await expandFilters(page);
      await identifierBox(page).fill('Williams');
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('all accession dates');
      await expectTotal(page, EXPECTED.williams, 'Williams');
      await expect(page.locator('.wl-card .wl-case-id').first()).toHaveText('S26-4403');
    });
  });

  test('Step 3: all cases page correctly; page size, sort, page 2, open a case and come back', async ({ page }) => {
    test.setTimeout(240_000);
    await openSearch(page);
    let total = 0;

    await test.step('3a. Clear, All dates, search: the pager reads 1–25 of N (N ≥ 25)', async () => {
      await identifierBox(page).fill('100001');
      await runSearch(page);
      await clearAndAllDates(page);
      await expect(page.locator('.ps-searchpage-result-count'), 'Clear empties the results').toHaveCount(0);
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toHaveText('Showing all cases');
      const r = await resultRange(page);
      expect(r.from, 'starts at 1').toBe(1);
      expect(r.to, 'a page of 25').toBe(25);
      expect(r.total, 'at least a page of cases').toBeGreaterThanOrEqual(25);
      total = r.total;
      test.info().annotations.push({ type: 'all cases', description: `1–25 of ${total} (the ticket said e.g. 99; the demo has 118 for Pete)` });
      // The card list is virtualised (it draws what fits), so the page's size is read from the count line, not the cards.
      expect(await page.locator('.wl-card').count(), 'cards are drawn').toBeGreaterThan(0);
      await expect(page.locator('.ps-searchpage-pager-status')).toHaveText(`Page 1 of ${Math.ceil(total / 25)}`);
    });

    await test.step('3b. Page size 50 and 100, then back to 25', async () => {
      const sizeSelect = page.locator('.ps-searchpage-pagesize select');
      for (const size of [50, 100]) {
        await sizeSelect.selectOption(String(size));
        await expect(page.locator('.ps-searchpage-result-count')).toHaveText(`1–${Math.min(size, total)} of ${total} cases`, { timeout: 20_000 });
      }
      await sizeSelect.selectOption('25');
      await expect(page.locator('.ps-searchpage-result-count')).toHaveText(`1–25 of ${total} cases`, { timeout: 20_000 });
    });

    await test.step('3c. Sort by accession number: the page is in that order', async () => {
      const sortSelect = page.locator('.ps-searchpage-sort select');
      const before = await page.locator('.wl-card .wl-case-id').allTextContents();
      await sortSelect.selectOption({ label: 'Accession number' });
      await expect(page.locator('.ps-searchpage-result-count')).toHaveText(`1–25 of ${total} cases`, { timeout: 20_000 });
      // The service orders by the lower-cased accession (code-point order); the page is drawn again once it answers.
      const inOrder = (xs: string[]) => xs.map(x => x.toLowerCase()).every((x, i, a) => i === 0 || a[i - 1] <= x);
      await expect.poll(async () => page.locator('.wl-card .wl-case-id').allTextContents(), { timeout: 20_000, message: 'the page is re-sorted' })
        .not.toEqual(before);
      const ids = await page.locator('.wl-card .wl-case-id').allTextContents();
      expect(ids.length, 'the drawn part of the page').toBeGreaterThan(1);
      expect(inOrder(ids), `sorted by accession number: ${ids.join(', ')}`).toBe(true);
    });

    await test.step('3d. Page 2, open a case, come back: page 2 is restored', async () => {
      await page.getByRole('button', { name: 'Next ›', exact: true }).click();
      await expect(page.locator('.ps-searchpage-result-count')).toHaveText(`26–50 of ${total} cases`, { timeout: 20_000 });
      await expect(page.locator('.ps-searchpage-pager-status')).toHaveText(`Page 2 of ${Math.ceil(total / 25)}`);
      const page2Ids = await page.locator('.wl-card .wl-case-id').allTextContents();
      // A case that opens a report (not a pool case, which opens the claim window instead).
      const card = page.locator('.wl-card').filter({ hasNot: page.locator('.wl-case-id--pool') }).first();
      const opened = (await card.locator('.wl-case-id').textContent())!.trim();
      await card.click();
      await expect(page, `opening ${opened} leaves the search page`).not.toHaveURL(/\/search$/, { timeout: 20_000 });
      await page.waitForTimeout(3000);
      // Batch 583: for a case opened from Search the report's breadcrumb reads "Home › Search › Case Report"
      // (it said "Worklist" before), and "Search" returns to Search with the last search kept.
      await expect(page.locator('.ps-hb-crumb').filter({ hasText: /^Worklist$/ }), 'no "Worklist" crumb on a case opened from Search').toHaveCount(0);
      await page.locator('.ps-hb-crumb').filter({ hasText: /^Search$/ }).click();
      await expect(page, '"Search" on a case opened from Search returns to Search').toHaveURL(/\/search$/, { timeout: 20_000 });
      await expect(page.locator('.ps-searchpage-result-count')).toHaveText(`26–50 of ${total} cases`, { timeout: 20_000 });
      await expect(page.locator('.ps-searchpage-pager-status')).toHaveText(`Page 2 of ${Math.ceil(total / 25)}`);
      expect(await page.locator('.wl-card .wl-case-id').allTextContents(), 'the same page 2').toEqual(page2Ids);
      await expect(page.locator('.ps-searchpage-sort select')).toHaveValue(/accessionNumber/);
    });
  });

  test('Step 4: diagnosis, requisition number, flag, case type and CPT filters', async ({ page }) => {
    test.setTimeout(240_000);
    await openSearch(page);

    await test.step('4a. Diagnosis "adenocarcinoma" (All dates)', async () => {
      await clearAndAllDates(page);
      await page.getByPlaceholder('e.g. Carcinoma').fill('adenocarcinoma');
      await page.getByRole('button', { name: 'Add diagnosis term', exact: true }).click();
      await expect(page.locator('.ps-searchpage-chip').filter({ hasText: 'adenocarcinoma' })).toHaveCount(1);
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('diagnosis: adenocarcinoma');
      await expectTotal(page, EXPECTED.adenocarcinoma, 'diagnosis adenocarcinoma (the ticket said 2; the demo has 7)');
    });

    await test.step('4b. REQ-2026-44002 finds its case', async () => {
      await clearAndAllDates(page);
      await identifierBox(page).fill('REQ-2026-44002');
      await runSearch(page);
      await expectTotal(page, EXPECTED.req202644002, 'REQ-2026-44002');
      await expect(page.locator('.wl-card .wl-case-id').first()).toHaveText('S26-4402-COLON-RES');
    });

    await test.step('4c. Flag "Second Opinion Requested"', async () => {
      await clearAndAllDates(page);
      await browseFor(page, 'Flags').click();
      const modal = page.locator('.ps-lookup-modal');
      await expect(modal.locator('.ps-lookup-title')).toHaveText('Case Flags');
      await modal.locator('.ps-searchpage-flag-pill', { hasText: 'Second Opinion Requested' }).click();
      await modal.locator('.ps-lookup-done-btn').click();
      await expect(page.locator('.ps-searchpage-chip').filter({ hasText: 'Second Opinion Requested' })).toHaveCount(1);
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('flags: Second Opinion Requested');
      await expectTotal(page, EXPECTED.secondOpinion, 'flag Second Opinion Requested (the ticket said 6; the demo has 5)');
    });

    await test.step('4d. Case type Gyn cytology', async () => {
      await clearAndAllDates(page);
      await page.getByRole('button', { name: 'Gyn cytology', exact: true }).click();
      await expect(page.locator('.ps-searchpage-checkpill--checked').filter({ hasText: /^Gyn cytology$/ })).toHaveCount(1);
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('type: Gyn cytology');
      await expectTotal(page, EXPECTED.gynCytology, 'case type Gyn cytology');
    });

    await test.step('4e. More filters → CPT 88307', async () => {
      await clearAndAllDates(page);
      await openMoreFilters(page);
      await page.getByLabel('CPT codes', { exact: true }).fill('88307');
      await page.getByRole('button', { name: 'Add CPT code', exact: true }).click();
      await expect(page.locator('.ps-searchpage-chip').filter({ hasText: '88307' })).toHaveCount(1);
      await runSearch(page);
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('CPT: 88307');
      await expectTotal(page, EXPECTED.cpt88307, 'CPT 88307');
    });
  });

  test('Step 5: performing lab, as Pete (Desert Valley staff, support access to Manchester and Midwest not approved)', async ({ page }) => {
    test.setTimeout(240_000);
    await openSearch(page);
    const got: Record<string, number> = {};
    await test.step('Manchester University NHS Foundation Trust (includes its sites)', async () => {
      got.manchester = await labTotal(page, 'Manchester University NHS Foundation Trust');
    });
    await test.step('Wythenshawe Hospital', async () => { got.wythenshawe = await labTotal(page, 'Wythenshawe Hospital'); });
    await test.step('Henry Ford Health System', async () => { got.henryFord = await labTotal(page, 'Henry Ford Health System'); });
    await test.step('Midwest Pathology Associates', async () => { got.midwest = await labTotal(page, 'Midwest Pathology Associates'); });
    test.info().annotations.push({ type: 'performing lab as Pete', description: JSON.stringify(got) });
    expect(got, 'what Pete can see (ticket: Manchester 6, Wythenshawe 3, Henry Ford 6, Midwest 3)').toEqual(EXPECTED.labsAsPete);
  });

  test('Step 5: performing lab, as a Manchester user: the Trust includes its sites', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, MANCHESTER_USER);
    await openSearch(page);
    const manchester = await labTotal(page, 'Manchester University NHS Foundation Trust');
    const wythenshawe = await labTotal(page, 'Wythenshawe Hospital');
    test.info().annotations.push({ type: 'performing lab as Paul Carter', description: `Trust ${manchester}, Wythenshawe ${wythenshawe}` });
    expect(wythenshawe, 'Wythenshawe').toBe(EXPECTED.labsAsManchester.wythenshawe);
    expect(manchester, 'the Trust (the ticket said 6; the demo has 9)').toBe(EXPECTED.labsAsManchester.manchester);
    expect(manchester, 'the Trust holds more than one site').toBeGreaterThan(wythenshawe);
  });

  test('Step 5: performing lab, as a Midwest user', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, MIDWEST_USER);
    await openSearch(page);
    const midwest = await labTotal(page, 'Midwest Pathology Associates');
    test.info().annotations.push({ type: 'performing lab as Amber Fehrs-Battey', description: `Midwest ${midwest}` });
    expect(midwest, 'Midwest').toBe(EXPECTED.labsAsMidwest.midwest);
  });

  test('Step 6: the CSV export holds every match; a saved search survives a reload', async ({ page }) => {
    test.setTimeout(240_000);
    await openSearch(page);
    let total = 0;

    await test.step('6a. Export CSV: one row per matching case, not just the page', async () => {
      await clearAndAllDates(page);
      await runSearch(page);
      total = (await resultRange(page)).total;
      expect(total, 'more than one page, so the export must go past it').toBeGreaterThan(25);
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        page.getByRole('button', { name: 'Export CSV', exact: true }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/^pathscribe-cases-\d{4}-\d{2}-\d{2}\.csv$/);
      const path = await download.path();
      expect(path, 'the download was saved').toBeTruthy();
      const rows = csvDataRows(readFileSync(path!, 'utf8'));
      test.info().annotations.push({ type: 'export', description: `${rows.length} rows for ${total} matches` });
      expect(rows.length, 'every match, not the 25 on screen').toBe(total);
      const header = readFileSync(path!, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0];
      expect(header).toContain('"Accession"');
      expect(header).toContain('"Patient Name"');
      const accessions = rows.map(r => r[0]);
      expect(new Set(accessions).size, 'no duplicate rows').toBe(total);
      expect(accessions).toContain('S26-4403');
      await expect(page.locator('.ps-searchpage-notice'), 'no truncation or failure notice').toHaveCount(0);
    });

    await test.step('6b. Save the search, reload the page, load it again', async () => {
      // A search worth saving: Gyn cytology, All dates.
      await clearAndAllDates(page);
      await page.getByRole('button', { name: 'Gyn cytology', exact: true }).click();
      await runSearch(page);
      await expectTotal(page, EXPECTED.gynCytology, 'Gyn cytology before saving');
      const name = 'PS-101 gyn cytology';
      await page.locator('.ps-searchpage-save-new-btn').click();
      await page.locator('.ps-searchpage-save-input').fill(name);
      await page.locator('.ps-searchpage-save-input').press('Enter');
      const chip = page.locator('[data-saved-open]').filter({ hasText: name });
      await expect(chip).toHaveCount(1, { timeout: 5_000 });
      await expect(chip, 'the saved search is the active one').toHaveAttribute('aria-current', 'true');
      // Reload: the saved search is kept (the saved-search service), the results are not (no patient data in the browser).
      await openSearch(page);
      await expect(page.locator('.ps-searchpage-result-count')).toHaveCount(0);
      await expect(page.locator('[data-saved-open]').filter({ hasText: name })).toHaveCount(1, { timeout: 10_000 });
      await page.locator('[data-saved-open]').filter({ hasText: name }).click();
      await expect(page.locator('.ps-searchpage-result-count')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.ps-searchpage-summary-text')).toContainText('type: Gyn cytology');
      await expectTotal(page, EXPECTED.gynCytology, 'the saved search, loaded');
      // Tidy up: remove the saved search.
      await page.getByRole('button', { name: `Delete saved search ${name}`, exact: true }).click();
      await expect(page.locator('[data-saved-open]').filter({ hasText: name })).toHaveCount(0);
    });
  });

  test('Step 7: the header search bar: O26-000 + Enter lists cases with flag chips and readable statuses', async ({ page }) => {
    test.setTimeout(120_000);
    await openSearch(page);
    const bar = page.getByLabel('Search or scan case number', { exact: true });
    await bar.fill('O26-000');
    await bar.press('Enter');
    const modal = page.locator('.ps-casebar-modal');
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await expect(modal.locator('.ps-casebar-modal__title')).toContainText('cases match “O26-000”');
    const rows = modal.locator('.ps-casebar-dropdown__row');
    expect(await rows.count(), 'several O26-000x cases').toBeGreaterThan(1);
    for (const acc of await rows.locator('.ps-casebar-dropdown__accession').allTextContents()) expect(acc).toMatch(/^O26-000\d/);
    // Flag chips on the rows that carry flags.
    expect(await modal.locator('.ps-casebar-dropdown__flag-chip').count(), 'flag chips are shown').toBeGreaterThan(0);
    for (const chip of await modal.locator('.ps-casebar-dropdown__flag-chip').allTextContents()) expect(chip.trim()).not.toBe('');
    // Every status is a readable label (en.json caseSearchBar.status.*), never a raw key like "pending-review".
    const statuses = await rows.locator('.ps-casebar-dropdown__status').allTextContents();
    expect(statuses.length).toBe(await rows.count());
    const readable = ['Accepted', 'Awaiting Grossing', 'AI-Assisted', 'Being Claimed', 'Closed', 'Draft', 'Finalized', 'Finalizing',
      'Gross Complete', 'In Progress', 'Intraop Complete', 'Awaiting Sign-off', 'Pending', 'Awaiting Countersign', 'Pending Release',
      'Needs Review', 'Pool', 'Needs Revision', 'Signed Out'];
    for (const s of statuses) expect(readable, `status "${s}" is a readable label`).toContain(s.trim());
    test.info().annotations.push({ type: 'header search', description: `${statuses.length} rows; statuses: ${[...new Set(statuses.map(s => s.trim()))].join(', ')}` });
    await modal.locator('.ps-casebar-modal__close').click();
    await expect(modal).toHaveCount(0);
  });
});
