// e2e/review/ps-278.print-destination-routing.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-278 — "Print Destination Routing Engine — multi-criteria rules, printer
// mapping hierarchy, IP protocol abstraction". Review test plan, run against
// the demo (Vite dev server, localStorage data) as Pete Nimmo:
//
//   1. Sign in as Pete Nimmo and open Configuration → System → Print
//      Destination Routing Rules.                                    automated
//   2. Click + Add Rule; create a Location/OR-level rule for Frozen Section,
//      Initial Sign-out, pointing at a test printer, and save.        automated
//      (Location "Ward 3", which has no seeded rule; printer address
//      10.27.8.1, RAW 9100, "E2E-278 Ward 3 Frozen Printer".)
//   3. Add a facility-default rule for the same facility pointing at a
//      different printer.                                            automated
//      (A location rule isn't tied to a facility, so "the same facility" is the
//      facility the Test panel job uses: Desert Valley Medical Center, which
//      has no seeded rule (the seeded facility default is Fenwick General's).
//      Printer 10.27.8.2, "E2E-278 DVMC Default Printer", no criteria.)
//   4. In the Test panel, try a Frozen Section initial sign-out from that
//      location: the OR rule's printer is chosen; try a Routine Surgical case:
//      the facility default is chosen.                               automated
//      (Also: Frozen Section + Preliminary falls through to the facility
//      default, and a job matching no rule says it falls back to the
//      facility's own default destination.)
//   5. Open the facility in System → Facility Configuration, printing tab, and
//      check "direct network print" uses the default printer only when no
//      rule matches.                                                 automated
//      (What the tab shows: with Delivery = "Network printer (direct)", the
//      hint "Print routing rules choose the printer; the one below is used
//      when no rule matches." and "Default network printer (when no print
//      routing rule matches)…". The dispatch itself is covered by step 7's
//      vitest files.)
//   6. Real printer needed: sending to an actual RAW 9100, LPR or IPP printer
//      was not checked against real hardware.                  needs a person
//      (no printers here)
//   7. Automated: `npx vitest run src/services/printRouting/resolvePrintDestination.test.ts
//      src/components/Config/System/PrintRoutingRuleSection.test.tsx`.
//      Run on Oct 15, 2026 before this spec was written: 2 files, 17 tests,
//      all passed.
//
// Expected (ticket): the most specific matching rule picks the printer, the
// facility default is used only as a fallback, and rules can be managed on
// screen.
//
// Texts are the English values of printRoutingRulesSection.*,
// printDestination.*, facilityPrintingTab.* and facilityEditorModal.* in
// src/i18n/locales/en.json; selectors are the screens' own .ps-rr-* / .fct-* /
// .ps-fem-* classes and the printing tab's field ids (fpt-*).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium \
//        e2e/review/ps-278.print-destination-routing.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { DEMO_USERS } from './helpers';

/**
 * Signs in as a demo user with fresh demo data, like helpers.signIn, but from the
 * sign-in page once it has rendered: helpers.signIn's page.goto('/') is redirected
 * to /login while it writes, which can throw "Execution context was destroyed".
 */
async function signInFresh(page: Page, user: { id: string; name: string; role: string } = DEMO_USERS.pete) {
  await page.goto('/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: 90_000 });
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, user);
}

const T = {
  configuration: 'Configuration',
  title: 'Print Destination Routing Rules',                      // printRoutingRulesSection.title
  addRule: '+ Add Rule',                                         // printRoutingRulesSection.addRuleButton
  addTitle: 'Add Print Routing Rule',                            // printRoutingRulesSection.modal.addTitle
  saveRule: 'Add Rule',                                          // printRoutingRulesSection.modal.addRuleButton
  scopeTier: 'Scope Tier',                                       // printRoutingRulesSection.fields.scopeType
  scope: 'Scope',                                                // printRoutingRulesSection.fields.scopeId
  specimenCaseType: 'Specimen / Case Type',                      // printRoutingRulesSection.fields.specimenCaseType
  eventTrigger: 'Event Trigger',                                 // printRoutingRulesSection.fields.eventTriggerType
  note: 'Note',                                                  // printRoutingRulesSection.modal.noteLabel
  tierLocation: 'Location',                                      // printRoutingRulesSection.scopeTypeLabels.location
  tierFacility: 'Facility (Performing Lab)',                     // printRoutingRulesSection.scopeTypeLabels.facility
  clientAccount: 'Client Account (Ordering Facility)',           // printRoutingRulesSection.scopeTypeLabels.clientAccount
  frozen: 'Frozen Section',                                      // printRoutingRulesSection.specimenCaseTypeLabels.frozenSection
  routine: 'Routine Surgical',                                   // printRoutingRulesSection.specimenCaseTypeLabels.routineSurgical
  initial: 'Initial Sign-out',                                   // printRoutingRulesSection.eventTriggerTypeLabels.initialSignout
  preliminary: 'Preliminary',                                    // printRoutingRulesSection.eventTriggerTypeLabels.preliminary
  kindNetwork: 'Printer address (sent directly)',                // printDestination.kinds.network
  protocol: 'Protocol',                                          // printDestination.protocol
  address: 'Address',                                            // printDestination.address
  name: 'Name',                                                  // printDestination.name
  matchesEvery: 'Matches every job at this tier (lowest priority within it)', // printRoutingRulesSection.criteriaDescription.matchesEvery
  workstationId: 'Workstation / User ID',                        // printRoutingRulesSection.testPanel.workstationIdLabel
  resolve: 'Resolve',                                            // printRoutingRulesSection.testPanel.resolveButton
  matched: (tier: string, note: string) => `Matched rule (${tier}): ${note}`, // printRoutingRulesSection.testPanel.matchedRule
  noRuleMatched: 'No rule matched at any tier — this job would fall back to the facility\'s own default destination.', // …testPanel.noRuleMatched
  // facilityPrintingTab.* / facilityEditorModal.*
  edit: 'Edit',
  tabPrinting: 'Printing',
  printReleased: 'Print released reports',
  delivery: 'Delivery',
  directNetwork: 'Network printer (direct)',
  directHint: 'Sends each report straight to a network printer. Print routing rules choose the printer; the one below is used when no rule matches.',
  destinationIntro: 'Default network printer (when no print routing rule matches). Leave blank and such reports fail with a clear reason instead of printing somewhere unexpected.',
};

const LOCATION = 'Ward 3';
const FACILITY = 'Desert Valley Medical Center';
const OR_RULE = { address: '10.27.8.1', name: 'E2E-278 Ward 3 Frozen Printer', note: 'E2E-278 OR rule: frozen sections from Ward 3' };
const FACILITY_RULE = { address: '10.27.8.2', name: 'E2E-278 DVMC Default Printer', note: 'E2E-278 facility default for DVMC' };

const ruleRows = (page: Page) => page.locator('.ps-rr-tables tbody tr');
const testPanel = (page: Page) => page.locator('.ps-rr-test');

async function openRoutingRules(page: Page) {
  await page.goto('/configuration?tab=system&section=print_routing_rules');
  await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.ps-rr-header h2')).toHaveText(T.title, { timeout: 30_000 });
}

/** + Add Rule → fill → Add Rule; the window closes and the new row is listed. */
async function addRule(page: Page, r: { tier: string; scope: string; specimen?: string; trigger?: string; address: string; name: string; note: string }) {
  await page.getByRole('button', { name: T.addRule, exact: true }).click();
  const modal = page.locator('.ps-modal-dark').filter({ hasText: T.addTitle });
  await expect(modal).toBeVisible();
  await modal.getByLabel(T.scopeTier, { exact: true }).selectOption({ label: r.tier });
  await modal.getByLabel(T.scope, { exact: true }).selectOption({ label: r.scope });
  if (r.specimen) await modal.getByLabel(T.specimenCaseType, { exact: true }).selectOption({ label: r.specimen });
  if (r.trigger) await modal.getByLabel(T.eventTrigger, { exact: true }).selectOption({ label: r.trigger });
  // The destination's first select is the kind (agent printer or printer address).
  await modal.locator('.ps-print-dest select').first().selectOption({ label: T.kindNetwork });
  await expect(modal.getByLabel(T.protocol, { exact: true }).locator('option:checked')).toHaveText('Raw (port 9100)');
  await modal.getByLabel(T.address, { exact: true }).fill(r.address);
  await modal.getByLabel(T.name, { exact: true }).fill(r.name);
  await modal.getByLabel(T.note, { exact: true }).fill(r.note);
  await modal.getByRole('button', { name: T.saveRule, exact: true }).click();
  await expect(modal, 'the window closes on save').toHaveCount(0);
  await expect(ruleRows(page).filter({ hasText: r.note }), 'the rule is listed').toHaveCount(1);
}

/** Test panel: fills the job and returns [destination, matched-rule line]. */
async function resolveJob(page: Page, job: { location?: string; facility?: string; specimen?: string; trigger?: string }) {
  const p = testPanel(page);
  await p.getByLabel(T.workstationId, { exact: true }).fill('');
  await p.getByLabel(T.tierLocation, { exact: true }).selectOption(job.location ? { label: job.location } : '');
  await p.getByLabel(T.clientAccount, { exact: true }).selectOption('');
  await p.getByLabel(T.tierFacility, { exact: true }).selectOption(job.facility ? { label: job.facility } : '');
  await p.getByLabel(T.specimenCaseType, { exact: true }).selectOption(job.specimen ? { label: job.specimen } : '');
  await p.getByLabel(T.eventTrigger, { exact: true }).selectOption(job.trigger ? { label: job.trigger } : '');
  await p.getByRole('button', { name: T.resolve, exact: true }).click();
  await expect(p.locator('.ps-rr-test-result-box')).toBeVisible();
  return [await p.locator('.ps-rr-test-result-value').textContent(), await p.locator('.ps-rr-test-result-matched').textContent()];
}

test.describe('PS-278 print destination routing: most specific rule wins, facility default is the fallback', () => {
  test.beforeEach(async ({ page }) => { await signInFresh(page); });

  test('Steps 1–5: add an OR-level and a facility-default rule; the Test panel and the facility printing tab agree', async ({ page }) => {
    test.setTimeout(300_000);

    await test.step('1. Configuration → System → Print Destination Routing Rules', async () => {
      await openRoutingRules(page);
      await expect(ruleRows(page), 'the four seeded rules').toHaveCount(4);
    });

    await test.step('2. + Add Rule: Location "Ward 3", Frozen Section, Initial Sign-out → a test printer; save', async () => {
      await addRule(page, { tier: T.tierLocation, scope: LOCATION, specimen: T.frozen, trigger: T.initial, ...OR_RULE });
      const row = ruleRows(page).filter({ hasText: OR_RULE.note });
      await expect(row.locator('td').nth(0)).toHaveText(`${T.tierLocation}: ${LOCATION}`);
      await expect(row.locator('td').nth(1)).toHaveText(`Specimen: ${T.frozen} · Trigger: ${T.initial}`);
      await expect(row.locator('td').nth(2)).toHaveText(OR_RULE.name);
    });

    let facilityId = '';
    await test.step('3. A facility-default rule for Desert Valley Medical Center → a different printer', async () => {
      await addRule(page, { tier: T.tierFacility, scope: FACILITY, ...FACILITY_RULE });
      const row = ruleRows(page).filter({ hasText: FACILITY_RULE.note });
      facilityId = (await row.locator('td').nth(0).textContent())?.replace(`${T.tierFacility}: `, '') ?? '';
      expect(facilityId, 'the scope names the facility by its id').toMatch(/^\S+$/);
      await expect(row.locator('td').nth(1)).toHaveText(T.matchesEvery);
      await expect(row.locator('td').nth(2)).toHaveText(FACILITY_RULE.name);
      await expect(ruleRows(page)).toHaveCount(6);
      // Kept after a reload.
      await openRoutingRules(page);
      await expect(ruleRows(page), 'both new rules are stored').toHaveCount(6);
      await expect(ruleRows(page).filter({ hasText: OR_RULE.note })).toHaveCount(1);
      await expect(ruleRows(page).filter({ hasText: FACILITY_RULE.note })).toHaveCount(1);
    });

    await test.step('4. Test panel: Frozen Section initial sign-out from Ward 3 → the OR printer; Routine Surgical → the facility default', async () => {
      expect(await resolveJob(page, { location: LOCATION, facility: FACILITY, specimen: T.frozen, trigger: T.initial }), 'frozen, initial: the OR rule')
        .toEqual([OR_RULE.name, T.matched(T.tierLocation, OR_RULE.note)]);
      expect(await resolveJob(page, { location: LOCATION, facility: FACILITY, specimen: T.routine, trigger: T.initial }), 'routine surgical: the facility default')
        .toEqual([FACILITY_RULE.name, T.matched(T.tierFacility, FACILITY_RULE.note)]);
      expect(await resolveJob(page, { location: LOCATION, facility: FACILITY, specimen: T.frozen, trigger: T.preliminary }), 'frozen, preliminary: not the OR rule\'s trigger, so the facility default')
        .toEqual([FACILITY_RULE.name, T.matched(T.tierFacility, FACILITY_RULE.note)]);
      expect(await resolveJob(page, { location: LOCATION, specimen: T.routine }), 'no rule at any tier: the facility\'s own default destination')
        .toEqual(['—', T.noRuleMatched]);
    });

    await test.step('5. Facility Configuration → Desert Valley Medical Center → Printing: direct network print uses its default printer only when no rule matches', async () => {
      await page.goto('/configuration?tab=system&section=clients');
      await expect(page.locator('.fct-table'), 'the facility table').toBeVisible({ timeout: 90_000 });
      await page.locator('.fct-search-input').fill(FACILITY);
      const row = page.locator('.fct-table tbody tr').filter({ hasText: FACILITY });
      await expect(row).toHaveCount(1);
      await row.locator('.fct-action-btn--edit').filter({ hasText: T.edit }).click();
      const editor = page.locator('.ps-overlay--facility-editor');
      await expect(editor).toBeVisible();
      await editor.locator('.ps-fem-tab').filter({ hasText: T.tabPrinting }).click();
      const printReleased = editor.getByLabel(T.printReleased);
      await expect(printReleased).toBeVisible();
      await printReleased.check();
      await editor.getByLabel(T.delivery, { exact: true }).selectOption({ label: T.directNetwork });
      await expect(editor.locator('#fpt-mode + .cem-hint'), 'the delivery hint').toHaveText(T.directHint);
      await expect(editor.getByText(T.destinationIntro, { exact: true }), 'the default printer is the no-rule fallback').toBeVisible();
      await editor.locator('.ps-modal-close').click();
      await expect(editor).toHaveCount(0);
    });
  });
});
