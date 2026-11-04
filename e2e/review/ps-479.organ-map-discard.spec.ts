// e2e/review/ps-479.organ-map-discard.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-479 — "Organ map: switching map level drops unsaved edits without asking":
// the review test plan, run against the demo (Vite dev server, localStorage
// data) as Pete Nimmo.
//
// Expected (ticket): nothing is lost unless you choose Discard; clean switches
// go straight through.
//
// Automated here (each review step is a test.step):
//   1. Sign in as Pete; Configuration → System → Organ maps.
//   2. Colours & patterns: override a colour and change it without saving, then
//      switch level (Enterprise → Jurisdiction): the "Discard unsaved changes?"
//      box appears.
//   3. Cancel keeps the level and the edit. Again, then Discard changes: the
//      level switches and the edit is gone (back on Enterprise the row is
//      inherited again with its original colour).
//   4. Unsaved edits ask first when changing the synoptic template, the map
//      type, and when switching Colours & patterns ↔ Map bindings (both ways).
//   5. With no edits: switching level, template, map type and the two tabs
//      shows no box. The box offers Discard changes and Cancel only, no Save.
//
// Needs a person: nothing in the ticket's steps; the look of the box is checked
// by eye. Note: the box is Configuration's shared PS-128 dialog, titled
// "Discard unsaved changes?" (the ticket calls it "Discard changes?").
//
// Texts are the English values of configuration.dirtyGuard.*, organMapsSection.*
// and common.* in src/i18n/locales/en.json; selectors are the app's own .ps-*
// classes and ids (OrganMapsSection.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5307 npx playwright test --project=chromium \
//        e2e/review/ps-479.organ-map-discard.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type Locator } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// configuration.dirtyGuard.*
const GUARD_TITLE = 'Discard unsaved changes?';
const LEAVE_MESSAGE = 'Configuration has unsaved changes. Leaving now will discard them.';
const DISCARD = 'Discard changes';
// organMapsSection.*
const TAB_SCHEME = 'Colours & patterns';
const TAB_BINDINGS = 'Map bindings';
const OVERRIDE_HERE = 'Override here';
const USE_INHERITED = 'Use inherited';
const PICK_TEMPLATE = 'Choose a template';

const EDIT_COLOUR = '#123456';
const OTHER_COLOUR = '#654321';

/** The PS-128 confirmation (ConfirmModal) Configuration shows before a guarded switch. */
const guard = (page: Page) => page.locator('.ps-overlay--confirm').filter({ hasText: GUARD_TITLE });
const guardButton = (page: Page, label: string) => guard(page).getByRole('button', { name: label, exact: true });
const organTab = (page: Page, label: string) => page.getByRole('tab', { name: label, exact: true });
const levelSelect = (page: Page) => page.locator('#organmap-scope');
const templateSelect = (page: Page) => page.locator('#organmap-template');
const mapTypeSelect = (page: Page) => page.locator('#organmap-maptype');
/** The first colour row of the Colours & patterns table. */
const firstRow = (page: Page) => page.locator('.ps-organmap-config-table tbody tr').first();
const firstColour = (page: Page) => firstRow(page).locator('input.ps-organmap-config-colour');
/** The panel's Save (a CapabilityButton: `disabled` while nothing is unsaved). */
const saveButton = (page: Page) => page.locator('.ps-organmap-config .ps-conf-btn-primary').filter({ hasText: 'Save' });

async function openOrganMaps(page: Page) {
  await openScreen(page, '/configuration?tab=system&section=organ_maps', 'Configuration');
  await expect(page.locator('h2.ps-conf-section-title').filter({ hasText: 'Organ maps' })).toBeVisible({ timeout: 15_000 });
  await expect(organTab(page, TAB_SCHEME)).toHaveAttribute('aria-selected', 'true');
  await expect(levelSelect(page)).toHaveValue('enterprise');
  await expect(firstColour(page)).toBeVisible();
  await page.waitForTimeout(300); // the stored layers load into the draft
}

/** Colours & patterns, Enterprise level: override the first row and change its colour (unsaved). */
async function editAColour(page: Page) {
  const original = await firstColour(page).inputValue();
  await firstRow(page).getByRole('button', { name: OVERRIDE_HERE, exact: true }).click();
  await expect(firstColour(page)).toBeEnabled();
  const edited = original.toLowerCase() === EDIT_COLOUR ? OTHER_COLOUR : EDIT_COLOUR;
  await firstColour(page).fill(edited);
  await expect(firstColour(page)).toHaveValue(edited);
  await expect(saveButton(page), 'the panel knows it is unsaved').not.toHaveAttribute('disabled', '');
  return { original, edited };
}

/** Chooses a template and waits for its binding to load (the demo template fetch takes ~350 ms). */
async function chooseTemplate(page: Page, id: string) {
  if ((await templateSelect(page).inputValue()) === id) return;
  await templateSelect(page).selectOption(id);
  await expect(templateSelect(page)).toHaveValue(id);
  await expect(mapTypeSelect(page)).toBeVisible();
  // The template loads asynchronously (a ~350 ms mock delay) with nothing on screen to say it's done, so wait
  // until the binding's questions have appeared and stopped changing, rather than a fixed pause.
  const signature = () => page.locator('.ps-organmap-config-input select').evaluateAll(ss =>
    ss.map(s => [...(s as HTMLSelectElement).options].map(o => o.value).join(',')).join('|'));
  let last = '';
  await expect.poll(async () => { const now = await signature(); const settled = now !== '' && now === last; last = now; return settled; },
    { message: 'the template\'s binding has loaded', intervals: [400, 400, 400, 400, 600, 800], timeout: 10_000 }).toBe(true);
  await expect(saveButton(page), 'a fresh draft, nothing unsaved').toHaveAttribute('disabled', '');
}

/** Map bindings: picks a demo template whose binding has a question to change (the current one first), changes it (unsaved). */
async function editABinding(page: Page): Promise<{ templateId: string; select: Locator; chosen: string }> {
  await expect(templateSelect(page)).toBeVisible();
  const current = await templateSelect(page).inputValue();
  const ids = await templateSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean));
  expect(ids.length, 'the demo has synoptic templates').toBeGreaterThan(0);
  for (const id of [...(current ? [current] : []), ...ids.filter(v => v !== current)]) {
    await chooseTemplate(page, id);
    const selects = page.locator('.ps-organmap-config-input select');
    const n = await selects.count();
    for (let i = 0; i < n; i++) {
      const select = selects.nth(i);
      const current = await select.inputValue();
      const values = await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
      const other = values.find(v => v !== current && v !== '');
      if (!other) continue;
      await select.selectOption(other);
      await expect(select).toHaveValue(other);
      if (await saveButton(page).evaluate(b => !b.hasAttribute('disabled'))) {
        return { templateId: id, select, chosen: other };
      }
    }
  }
  throw new Error('No demo template offered a binding question to change');
}

async function expectAsked(page: Page) {
  await expect(guard(page), 'the "Discard unsaved changes?" box').toBeVisible();
  await expect(guard(page)).toContainText(LEAVE_MESSAGE);
}

async function expectNotAsked(page: Page) {
  await page.waitForTimeout(400);
  await expect(guard(page), 'no box').toHaveCount(0);
}

test.describe('PS-479 Organ maps ask before a switch drops unsaved edits', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Steps 1–3: a changed colour asks before the level switches; Cancel keeps it, Discard drops it', async ({ page }) => {
    test.setTimeout(120_000);
    let original = '';
    let edited = '';
    await test.step('1. Sign in as Pete; Configuration → System → Organ maps', async () => {
      await openOrganMaps(page);
    });
    await test.step('2. Change a colour without saving, then switch level to Jurisdiction: the box appears', async () => {
      ({ original, edited } = await editAColour(page));
      await levelSelect(page).selectOption('jurisdiction');
      await expectAsked(page);
    });
    await test.step('3a. Cancel: the level and the edit stay', async () => {
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(levelSelect(page), 'still on Enterprise').toHaveValue('enterprise');
      await expect(firstColour(page), 'the edit is intact').toHaveValue(edited);
      await expect(firstRow(page).getByRole('button', { name: USE_INHERITED, exact: true })).toBeVisible();
    });
    await test.step('3b. Again, Discard changes: the level switches and the edit is gone', async () => {
      await levelSelect(page).selectOption('facility');
      await expectAsked(page);
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(levelSelect(page), 'moved to Facility').toHaveValue('facility');
      await expect(page.getByLabel('Choose a facility')).toBeVisible();
      // Back on Enterprise (nothing unsaved now, so no box): the row inherits again with its original colour.
      await levelSelect(page).selectOption('enterprise');
      await expectNotAsked(page);
      await expect(levelSelect(page)).toHaveValue('enterprise');
      await expect(firstColour(page), 'the edit is gone').toHaveValue(original);
      await expect(firstRow(page).getByRole('button', { name: OVERRIDE_HERE, exact: true })).toBeVisible();
      await expect(saveButton(page)).toHaveAttribute('disabled', '');
    });
  });

  test('Step 4: unsaved edits ask before changing template, map type, or switching the two tabs', async ({ page }) => {
    test.setTimeout(180_000);
    await openOrganMaps(page);
    await test.step('4a. Colours & patterns edited, then Map bindings tab: asked; Cancel stays, Discard switches', async () => {
      const { edited } = await editAColour(page);
      await organTab(page, TAB_BINDINGS).click();
      await expectAsked(page);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(organTab(page, TAB_SCHEME), 'still on Colours & patterns').toHaveAttribute('aria-selected', 'true');
      await expect(firstColour(page)).toHaveValue(edited);
      await organTab(page, TAB_BINDINGS).click();
      await expectAsked(page);
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(organTab(page, TAB_BINDINGS), 'moved to Map bindings').toHaveAttribute('aria-selected', 'true');
    });
    let templateId = '';
    let select: Locator = page.locator('never');
    let chosen = '';
    await test.step('4b. Map bindings edited, then another template: asked; Cancel keeps template and edit', async () => {
      ({ templateId, select, chosen } = await editABinding(page));
      const ids = await templateSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
      const otherTemplate = ids.find(v => v !== templateId) ?? '';
      await templateSelect(page).selectOption(otherTemplate);
      await expectAsked(page);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(templateSelect(page), 'the template stays').toHaveValue(templateId);
      await expect(select, 'the edit is intact').toHaveValue(chosen);
    });
    await test.step('4c. Map bindings edited, then another map type: asked; Cancel keeps it, Discard switches', async () => {
      const mapType = await mapTypeSelect(page).inputValue();
      const types = await mapTypeSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
      const otherType = types.find(v => v !== mapType)!;
      await mapTypeSelect(page).selectOption(otherType);
      await expectAsked(page);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(mapTypeSelect(page), 'the map type stays').toHaveValue(mapType);
      await expect(select, 'the edit is intact').toHaveValue(chosen);
      await mapTypeSelect(page).selectOption(otherType);
      await expectAsked(page);
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(mapTypeSelect(page), 'the map type switched').toHaveValue(otherType);
      await expect(saveButton(page), 'a fresh draft, nothing unsaved').toHaveAttribute('disabled', '');
    });
    await test.step('4d. Map bindings edited, then Colours & patterns tab: asked; Discard switches', async () => {
      ({ templateId, select, chosen } = await editABinding(page));
      await organTab(page, TAB_SCHEME).click();
      await expectAsked(page);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(organTab(page, TAB_BINDINGS)).toHaveAttribute('aria-selected', 'true');
      await expect(select).toHaveValue(chosen);
      await organTab(page, TAB_SCHEME).click();
      await expectAsked(page);
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(organTab(page, TAB_SCHEME)).toHaveAttribute('aria-selected', 'true');
      await expect(firstColour(page)).toBeVisible();
    });
    await test.step('4e. Map bindings edited, then another template, Discard changes: the template switches', async () => {
      await organTab(page, TAB_BINDINGS).click();
      await expectNotAsked(page);
      ({ templateId } = await editABinding(page));
      const ids = await templateSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
      const otherTemplate = ids.find(v => v !== templateId) ?? '';
      await templateSelect(page).selectOption(otherTemplate);
      await expectAsked(page);
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(templateSelect(page), 'the template switched').toHaveValue(otherTemplate);
    });
  });

  test('Step 5: with no edits every switch is silent, and the box offers Discard or Cancel, never Save', async ({ page }) => {
    test.setTimeout(120_000);
    await openOrganMaps(page);
    await test.step('5a. No edits: level, tab, template and map type switches show no box', async () => {
      await levelSelect(page).selectOption('jurisdiction');
      await expectNotAsked(page);
      await expect(levelSelect(page)).toHaveValue('jurisdiction');
      await levelSelect(page).selectOption('enterprise');
      await expectNotAsked(page);
      await expect(firstColour(page)).toBeVisible();
      await organTab(page, TAB_BINDINGS).click();
      await expectNotAsked(page);
      await expect(organTab(page, TAB_BINDINGS)).toHaveAttribute('aria-selected', 'true');
      const ids = await templateSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean));
      expect(ids.length, 'the demo has synoptic templates').toBeGreaterThan(1);
      await chooseTemplate(page, ids[0]);
      await expectNotAsked(page);
      await chooseTemplate(page, ids[1]);
      await expectNotAsked(page);
      await expect(templateSelect(page)).toHaveValue(ids[1]);
      const mapType = await mapTypeSelect(page).inputValue();
      const types = await mapTypeSelect(page).locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
      const otherType = types.find(v => v !== mapType)!;
      await mapTypeSelect(page).selectOption(otherType);
      await expectNotAsked(page);
      await expect(mapTypeSelect(page)).toHaveValue(otherType);
      await organTab(page, TAB_SCHEME).click();
      await expectNotAsked(page);
      await expect(organTab(page, TAB_SCHEME)).toHaveAttribute('aria-selected', 'true');
      await expect(templateSelect(page)).toHaveCount(0);
      await expect(page.getByText(PICK_TEMPLATE, { exact: true })).toHaveCount(0);
    });
    await test.step('5b. The box offers Discard changes and Cancel only: no Save', async () => {
      await editAColour(page);
      await levelSelect(page).selectOption('jurisdiction');
      await expectAsked(page);
      await expect(guardButton(page, DISCARD)).toBeVisible();
      await expect(guardButton(page, 'Cancel')).toBeVisible();
      await expect(guard(page).getByRole('button', { name: /save/i }), 'no Save in the box').toHaveCount(0);
      await expect(guard(page).getByRole('button')).toHaveCount(2);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
    });
  });
});
