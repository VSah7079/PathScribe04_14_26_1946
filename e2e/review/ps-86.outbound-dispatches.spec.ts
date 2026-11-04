// e2e/review/ps-86.outbound-dispatches.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-86 — Audit Log: outbound interface dispatch visibility tile.
// Review test plan, run against the demo (Vite dev server, localStorage data).
//
// Automated here (each a test.step):
//   1. Sign in as Pete Nimmo, open Audit Log → Interface Log.
//   2. The Outbound Dispatches sub-tab (the ticket calls it the fourth; it is
//      the third of four: after Interface Exceptions and Outbound Interface DLQ,
//      before Print Queue).
//   3. The table's columns: Timestamp, Message ID, Category (E: Order),
//      Message Type (OrderCreated), Accession, Ordering Facility, Status.
//   4. The status pills (All / Delivered / Failed / Outcome unknown) and the
//      search box narrow the list.
//   5. A row opens the Outbound Payload drawer: JSON as an expandable tree,
//      Copy Payload, the "PathScribe sends JSON" note; a failed send shows its
//      error and attempt count.
//   6. Accession a new case, come back, and find its OrderCreated dispatch.
//
// Demo data: the demo seeds NO outbound dispatches (the only writer of
// `pathscribe_interface_engine_dispatched_events` is the accession flow, and
// demoReset only clears it), so steps 3–5 seed three events straight into the
// interface-engine service's own localStorage keys: one delivered, one failed
// (2 attempts, DISPATCH_UNREACHABLE) and one legacy event with no stored
// outcome (which must show "Outcome unknown", never "Delivered"). Step 6 uses
// the real Accession screen; the interface receiver (localhost:8080, not
// running in the test environment) is answered by a Playwright route with
// HTTP 200, so the new event shows as Delivered.
//
// For a person to do: the look of the status colours and the JSON tree, and
// Copy Payload against the real clipboard (asserted here through a stubbed
// navigator.clipboard, which is what the drawer calls).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5303 npx playwright test --project=chromium e2e/review/ps-86.outbound-dispatches.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// src/services/interfaceEngine/mockInterfaceEngineService.ts
const EVENTS_KEY = 'pathscribe_interface_engine_dispatched_events';
const OUTCOMES_KEY = 'pathscribe_interface_engine_dispatch_outcomes';
// src/services/interfaceDispatch/dispatchInterfaceMessage.ts (dev default)
const RECEIVER_URL = 'http://localhost:8080/**';

// Texts from src/i18n/locales/en.json
const TXT = {
  pageTitle: 'System Logs',                             // auditLog.page.title (the Audit Log tile's screen)
  tabInterfaces: 'Interface Log',                       // auditLog.tabs.interfaces (with its emoji prefix)
  subTabs: ['Interface Exceptions', 'Outbound Interface DLQ', 'Outbound Dispatches', 'Print Queue'],
  columns: ['Timestamp', 'Message ID', 'Category', 'Message Type', 'Accession', 'Ordering Facility', 'Status'],
  categoryShort: 'E: Order',
  categoryLong: 'Category E: Order Creation',
  filter: { all: 'All', delivered: 'Delivered', failed: 'Failed', recorded: 'Outcome unknown' },
  status: { delivered: 'Delivered', failed: 'Failed', recorded: 'Outcome unknown' },
  searchPlaceholder: 'Search message ID or accession…',
  drawerTitle: 'Outbound Payload',
  copyPayload: 'Copy Payload',
  copied: 'Copied to clipboard.',
  jsonNote: 'The exact JSON PathScribe sent. PathScribe sends JSON; the interface engine builds the HL7 message from it.',
  errorLabel: 'Error',
  unreachableLabel: 'Engine unreachable',               // outboundInterfaceDlq.errorLabel.engineUnreachable
  emptyText: 'No outbound dispatches match your filters',
};

const SEED_ACCESSION = { delivered: 'S26-9901', failed: 'S26-9902', legacy: 'S26-9903' };

/** Writes three dispatches straight into the service's localStorage keys (most-recent-first, as the service stores them). */
async function seedDispatches(page: Page) {
  await page.evaluate(({ EVENTS_KEY, OUTCOMES_KEY, acc }) => {
    const mk = (id: string, accession: string, minutesAgo: number) => ({
      messageId: `evt-order-${id}`, eventType: 'OrderCreated',
      eventTimestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      organisationId: 'org-demo', facilityId: 'fac-review',
      patient: { patientDataScope: 'reference', identifier: `MRN-${id}` },
      order: { placerOrderNumber: accession, priority: 'Routine', orderingProvider: { rawName: 'Dr. Review' } },
      specimens: [{ specimenId: `${id}-SP-A`, label: 'A', description: 'Skin, punch biopsy' }],
    });
    localStorage.setItem(EVENTS_KEY, JSON.stringify([mk('ok1', acc.delivered, 5), mk('bad1', acc.failed, 10), mk('old1', acc.legacy, 60)]));
    localStorage.setItem(OUTCOMES_KEY, JSON.stringify({
      'evt-order-ok1': { status: 'delivered', attemptedAt: new Date().toISOString(), attempts: 1 },
      'evt-order-bad1': {
        status: 'failed', attemptedAt: new Date().toISOString(), attempts: 2,
        errorCode: 'DISPATCH_UNREACHABLE',
        error: 'Could not reach the interface engine — check that it\'s running and reachable at the configured endpoint. (Failed to fetch)',
      },
      // evt-order-old1: no outcome stored → "Outcome unknown"
    }));
  }, { EVENTS_KEY, OUTCOMES_KEY, acc: SEED_ACCESSION });
}

const interfacesTab = (page: Page) => page.locator('.ps-auditlog-header-row .ps-auditlog-tabswitch-btn').filter({ hasText: TXT.tabInterfaces });
const subTabs = (page: Page) => page.locator('.ps-auditlog-tabswitch--spaced .ps-auditlog-tabswitch-btn');
const rows = (page: Page) => page.locator('.ps-auditlog-row--dispatch');
const pill = (page: Page, label: string) => page.locator('.ps-auditlog-pill').filter({ hasText: label });
const search = (page: Page) => page.getByPlaceholder(TXT.searchPlaceholder);
const drawer = (page: Page) => page.getByRole('dialog', { name: TXT.drawerTitle });

/** Audit Log → Interface Log → Outbound Dispatches, with the table loaded. */
async function openOutboundDispatches(page: Page) {
  await openScreen(page, '/audit', TXT.pageTitle);
  await interfacesTab(page).click();
  await subTabs(page).filter({ hasText: TXT.subTabs[2] }).click();
  await expect(page.locator('.ps-auditlog-thead--dispatch')).toBeVisible();
  await expect(page.locator('.ps-auditlog-count-footer')).toContainText('outbound dispatches');
}

test.describe('PS-86 Audit Log: outbound interface dispatch visibility', () => {
  test('Outbound Dispatches sub-tab: columns, filters, payload drawer, and a newly accessioned order', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page);
    await seedDispatches(page);

    await test.step('1. Sign in as Pete Nimmo, open Audit Log → Interface Log', async () => {
      await openScreen(page, '/audit', TXT.pageTitle);
      await expect(interfacesTab(page)).toHaveCount(1);
      await interfacesTab(page).click();
      await expect(interfacesTab(page)).toHaveClass(/ps-auditlog-tabswitch-btn--active/);
      await expect(subTabs(page).first()).toBeVisible();
    });

    await test.step('2. The Outbound Dispatches sub-tab (third of four; the ticket says fourth)', async () => {
      const labels = (await subTabs(page).allTextContents()).map(s => s.trim());
      expect(labels.slice(0, 4), 'Interface Exceptions, Outbound Interface DLQ, Outbound Dispatches, Print Queue').toEqual(TXT.subTabs);
      await subTabs(page).nth(2).click(); // the third of the four sub-tabs
      await expect(subTabs(page).nth(2)).toHaveClass(/ps-auditlog-tabswitch-btn--active/);
      await expect(page.locator('.ps-auditlog-thead--dispatch')).toBeVisible();
    });

    await test.step('3. Table columns: time, message ID, category, message type, accession, ordering facility, status', async () => {
      const heads = (await page.locator('.ps-auditlog-thead--dispatch > div').allTextContents()).map(s => s.trim());
      expect(heads).toEqual(TXT.columns);
      await expect(rows(page)).toHaveCount(3);
      await expect(page.locator('.ps-auditlog-count-footer')).toHaveText('Showing 3 of 3 outbound dispatches');
      const first = rows(page).first(); // most recent: the delivered one
      const cells = (await first.locator('> div').allTextContents()).map(s => s.trim());
      expect(cells[0], 'a formatted timestamp').not.toBe('');
      expect(cells[1]).toBe('evt-order-ok1');
      expect(cells[2]).toBe(TXT.categoryShort);
      expect(cells[3]).toBe('OrderCreated');
      expect(cells[4]).toBe(SEED_ACCESSION.delivered);
      expect(cells[5], 'ordering facility (falls back to the facility id when the demo has no such organisation)').not.toBe('');
      expect(cells[6]).toBe(TXT.status.delivered);
      // The accession cell is tagged for redaction.
      await expect(first.locator('[data-phi="accession"]')).toHaveText(SEED_ACCESSION.delivered);
      // Outcome per row: delivered, failed, and the legacy event is "Outcome unknown", never "Delivered".
      await expect(rows(page).nth(1).locator('.ps-dispatch-status')).toHaveText(TXT.status.failed);
      await expect(rows(page).nth(2).locator('.ps-dispatch-status')).toHaveText(TXT.status.recorded);
      await expect(rows(page).nth(2).locator('.ps-dispatch-status')).toHaveClass(/ps-dispatch-status--recorded/);
    });

    await test.step('4. Status pills and the search box narrow the list', async () => {
      for (const key of ['all', 'delivered', 'failed', 'recorded'] as const) await expect(pill(page, TXT.filter[key])).toHaveCount(1);
      await expect(pill(page, TXT.filter.all).locator('.ps-auditlog-pill-badge')).toHaveText('3');
      await expect(pill(page, TXT.filter.delivered).locator('.ps-auditlog-pill-badge')).toHaveText('1');
      await expect(pill(page, TXT.filter.failed).locator('.ps-auditlog-pill-badge')).toHaveText('1');
      await expect(pill(page, TXT.filter.recorded).locator('.ps-auditlog-pill-badge')).toHaveText('1');

      await pill(page, TXT.filter.failed).click();
      await expect(pill(page, TXT.filter.failed)).toHaveClass(/ps-auditlog-pill--active-teal/);
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator('.ps-dispatch-status')).toHaveText(TXT.status.failed);
      await expect(page.locator('.ps-auditlog-count-footer')).toHaveText('Showing 1 of 3 outbound dispatches');

      await pill(page, TXT.filter.recorded).click();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator('.ps-dispatch-status')).toHaveText(TXT.status.recorded);

      await pill(page, TXT.filter.delivered).click();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator('.ps-dispatch-status')).toHaveText(TXT.status.delivered);

      await pill(page, TXT.filter.all).click();
      await expect(rows(page)).toHaveCount(3);

      // Search by accession and by message id (case-insensitive); pills and search combine.
      await search(page).fill(SEED_ACCESSION.failed);
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator('[data-phi="accession"]')).toHaveText(SEED_ACCESSION.failed);
      await search(page).fill('EVT-ORDER-OLD1');
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator('.ps-dispatch-status')).toHaveText(TXT.status.recorded);
      await pill(page, TXT.filter.delivered).click();
      await expect(rows(page)).toHaveCount(0);
      await expect(page.locator('.ps-auditlog-empty-text')).toHaveText(TXT.emptyText);
      await pill(page, TXT.filter.all).click();
      await search(page).fill('');
      await expect(rows(page)).toHaveCount(3);
    });

    await test.step('5. A row opens the Outbound Payload drawer: JSON tree, Copy Payload, the JSON note, and a failed send\'s error and attempts', async () => {
      // The failed row.
      await rows(page).filter({ hasText: SEED_ACCESSION.failed }).click();
      const d = drawer(page);
      await expect(d).toBeVisible();
      await expect(d.locator('.ps-ms-header')).toHaveText(TXT.drawerTitle);
      await expect(d.locator('.ps-dispatch-meta')).toContainText('evt-order-bad1');
      await expect(d.locator('.ps-dispatch-meta')).toContainText(TXT.categoryLong);
      await expect(d.locator('.ps-dispatch-status')).toHaveText(TXT.status.failed);
      await expect(d.locator('.ps-dispatch-attempts')).toHaveText('2 attempts');
      await expect(d.locator('.ps-dispatch-meta dt').filter({ hasText: TXT.errorLabel })).toHaveCount(1);
      await expect(d.locator('.ps-dispatch-meta')).toContainText(`${TXT.unreachableLabel}: Could not reach the interface engine`);
      // The note explaining there is no HL7 view.
      await expect(d.locator('.ps-conf-hint').filter({ hasText: 'PathScribe sends JSON' })).toHaveText(TXT.jsonNote);

      // The JSON tree: expandable branches (native <details>), top levels open, deeper ones collapsed; it is the payload that was sent.
      const tree = d.locator('.ps-dispatch-json');
      await expect(tree).toHaveAttribute('data-phi', 'true');
      const branches = tree.locator('details.ps-dispatch-json-branch');
      expect(await branches.count()).toBeGreaterThan(2);
      await expect(tree.locator('.ps-dispatch-json-key').filter({ hasText: /^messageId: $/ })).toHaveCount(1);
      await expect(tree.locator('.ps-dispatch-json-string').filter({ hasText: '"evt-order-bad1"' })).toHaveCount(1);
      await expect(tree.locator('.ps-dispatch-json-string').filter({ hasText: `"${SEED_ACCESSION.failed}"` })).toHaveCount(1);
      // specimens[0] sits at depth 2: collapsed by default; clicking its summary expands it.
      const specimen0 = tree.locator('details.ps-dispatch-json-branch').filter({ has: page.locator('> summary > .ps-dispatch-json-key', { hasText: /^0: $/ }) }).first();
      await expect(specimen0).not.toHaveAttribute('open', '');
      await expect(specimen0.locator('.ps-dispatch-json-string').filter({ hasText: '"Skin, punch biopsy"' })).toBeHidden();
      await specimen0.locator('> summary').click();
      await expect(specimen0).toHaveAttribute('open', '');
      await expect(specimen0.locator('.ps-dispatch-json-string').filter({ hasText: '"Skin, punch biopsy"' })).toBeVisible();

      // Copy Payload: the drawer writes the pretty-printed payload to the clipboard.
      await page.evaluate(() => {
        (window as any).__copied = null;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s: string) => { (window as any).__copied = s; return Promise.resolve(); } } });
      });
      await d.getByRole('button', { name: TXT.copyPayload }).click();
      await expect(d.locator('.ps-conf-hint--success')).toHaveText(TXT.copied);
      const copied = await page.evaluate(() => JSON.parse((window as any).__copied));
      expect(copied.messageId).toBe('evt-order-bad1');
      expect(copied.order.placerOrderNumber).toBe(SEED_ACCESSION.failed);
      expect(copied.eventType).toBe('OrderCreated');
      await d.getByRole('button', { name: 'Close' }).click();
      await expect(d).toBeHidden();

      // A delivered row shows no error line and one attempt; the legacy row has neither attempts nor an error.
      await rows(page).filter({ hasText: SEED_ACCESSION.delivered }).click();
      await expect(d.locator('.ps-dispatch-status')).toHaveText(TXT.status.delivered);
      await expect(d.locator('.ps-dispatch-attempts')).toHaveText('1 attempt');
      await expect(d.locator('.ps-dispatch-meta dt').filter({ hasText: TXT.errorLabel })).toHaveCount(0);
      await d.getByRole('button', { name: 'Close' }).click();
      await expect(d).toBeHidden();
      await rows(page).filter({ hasText: SEED_ACCESSION.legacy }).click();
      await expect(d.locator('.ps-dispatch-status')).toHaveText(TXT.status.recorded);
      await expect(d.locator('.ps-dispatch-attempts')).toHaveCount(0);
      await expect(d.locator('.ps-dispatch-meta dt').filter({ hasText: TXT.errorLabel })).toHaveCount(0);
      await d.getByRole('button', { name: 'Close' }).click();
    });

    const accession = await test.step('6a. Accession a new case (manual entry, no imported order)', async () => {
      // The interface receiver is not running here: answer it so the send is delivered.
      const envelopes: any[] = [];
      await page.route(RECEIVER_URL, async route => {
        envelopes.push(route.request().postDataJSON());
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      });

      await openScreen(page, '/accession', 'Accession');
      await page.getByLabel('Given Name(s)', { exact: true }).fill('Review');
      await page.getByLabel('Family Name(s)', { exact: true }).fill('Dispatch');
      await page.locator('#accession-dob').fill('1970-01-01');
      const client = page.locator('#accession-client');
      await client.selectOption({ index: 1 });
      expect(await client.inputValue(), 'a submitting facility chosen').not.toBe('');
      const provider = page.getByLabel('Requesting Provider', { exact: true });
      await provider.click();
      await provider.fill('a');
      const option = page.locator('.ps-amendment-physician-option').first();
      await expect(option).toBeVisible({ timeout: 10_000 });
      await option.dispatchEvent('mousedown');
      await expect(provider).not.toHaveValue('a');
      const next = page.getByRole('button', { name: /Next: Specimens/ });
      await expect(next).toBeEnabled();
      await next.click();
      await page.getByLabel('Description', { exact: true }).first().fill('Skin, punch biopsy, left forearm');
      const submit = page.getByRole('button', { name: 'Submit Accession' });
      await expect(submit).toBeEnabled({ timeout: 10_000 });
      await submit.click();
      const acc = page.locator('.ps-accession-card strong[data-phi="accession"]').first();
      await expect(acc).toBeVisible({ timeout: 60_000 });
      const text = (await acc.textContent())!.trim();
      expect(text).not.toBe('');
      // The OrderCreated event reached the receiver.
      await expect.poll(() => envelopes.length, { timeout: 20_000 }).toBeGreaterThan(0);
      const sent = envelopes.find(e => e.transactionType === 'ORDER_CREATED');
      expect(sent, 'an ORDER_CREATED envelope').toBeTruthy();
      expect(sent.payload.order.placerOrderNumber).toBe(text);
      await page.unroute(RECEIVER_URL);
      return text;
    });

    await test.step('6b. Back in Outbound Dispatches, the new order\'s dispatch is listed as Delivered', async () => {
      await openOutboundDispatches(page);
      await expect(rows(page)).toHaveCount(4);
      await expect(page.locator('.ps-auditlog-count-footer')).toHaveText('Showing 4 of 4 outbound dispatches');
      // Most recent first.
      const newest = rows(page).first();
      await expect(newest.locator('[data-phi="accession"]')).toHaveText(accession);
      await expect(newest.locator('.ps-dispatch-status')).toHaveText(TXT.status.delivered);
      await expect(newest.locator('.ps-dispatch-mono').nth(1)).toHaveText('OrderCreated');
      await search(page).fill(accession);
      await expect(rows(page)).toHaveCount(1);
      await rows(page).first().click();
      const d = drawer(page);
      await expect(d).toBeVisible();
      await expect(d.locator('.ps-dispatch-status')).toHaveText(TXT.status.delivered);
      await expect(d.locator('.ps-dispatch-attempts')).toHaveText('1 attempt');
      await expect(d.locator('.ps-dispatch-json .ps-dispatch-json-string').filter({ hasText: `"${accession}"` })).toHaveCount(1);
      await expect(d.locator('.ps-conf-hint').filter({ hasText: 'PathScribe sends JSON' })).toHaveText(TXT.jsonNote);
    });
  });
});
