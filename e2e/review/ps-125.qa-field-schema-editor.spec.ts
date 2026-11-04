// e2e/review/ps-125.qa-field-schema-editor.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-125 — "QA Configuration Center: add a real field-schema editor for Custom
// review-with-outcome activities": the review test plan, run against the demo
// (Vite dev server, localStorage data) as Pete Nimmo.
//
// Review steps (each is a test.step below):
//   1. automated — Sign in as Pete; Configuration → System → QA Configuration
//      Center.
//   2. automated — Standard tab: open an activity (Configure); its review fields
//      are shown read-only.
//   3. automated — Duplicate a Standard activity (Create Duplicate), then open
//      the new entry on the Custom tab.
//   4. automated — In the field editor: Add field, Move up / Move down, change a
//      label, untick Required, add a hint, Add option on a choice field; save.
//   5. automated — Reopen it and try to remove a field or option that was
//      already saved, or change its type (see "differs" below).
//   6. automated — Remove all fields and save: refused with "An activity needs
//      at least one field."
//
// Expected (ticket): Custom activities' fields can be edited and extended,
// already-saved fields and options are protected, and Standard activities stay
// read-only.
//
// Needs a person: none.
//
// Already automated by vitest, run on Oct 15, 2026 before this spec was
// written, all passed (3 files, 23 tests): the service refusing a removed or
// retyped saved field / removed saved option, which the screen no longer lets a
// person attempt (step 5):
//   src/services/quality/qaFieldSchemaRules.test.ts
//   src/services/quality/mockQaActivityTypeService.test.ts
//   src/components/Config/System/QaFieldSchemaEditor.test.tsx
//
// Where the demo differs from the steps as written:
//   • Step 5: a saved field or option can't be removed or retyped from the
//     screen at all, so there is nothing to refuse: a saved field has no
//     "Remove field" button (it shows "Saved field: rename or make optional
//     only"), its type drop-down is disabled (tooltip "A saved field keeps its
//     type, so past reviews still read correctly."), and a saved option has no
//     "Remove option" button. The step's message ("A saved field can't be
//     removed…") is never shown on screen; only the service returns it (vitest
//     above). The test checks the locks, and, as a control, that a field and an
//     option added in the same dialog do have Remove buttons and an enabled type.
//   • Step 6: on a saved Custom activity every field is saved, so they can't all
//     be removed (step 5). Removing all fields is only possible before the first
//     save, so the test does it in the Duplicate dialog: "An activity needs at
//     least one field." shows, Create Duplicate is disabled (not clicked and
//     refused), the dialog stays open, and nothing is created.
//   • The edit dialog's field heading still reads "Review Fields (from Duplicate
//     — read-only here)" (qaConfigurationCenterSection.modal.reviewFieldsLabel)
//     above the now-editable editor: stale text, reported, not tested.
//   • The Standard activity used is "GYN Cytology Secondary Screening" (a
//     required drop-down "Trigger" with 3 options, two optional short texts).
//
// Texts are the English values of qaConfigurationCenterSection.* and common.*
// in src/i18n/locales/en.json; selectors are the app's own .ps-* classes and
// aria-labels (components/Config/System/QAConfigurationCenterSection.tsx,
// QaFieldSchemaEditor.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5302 npx playwright test --project=chromium \
//        e2e/review/ps-125.qa-field-schema-editor.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Locator, type Page } from '@playwright/test';
import { signIn, clearDemoKeys } from './helpers';

/** Opens a page and waits for its heading (a cold first load under a busy machine can outlast helpers.openScreen's 20 s). */
async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 60_000 });
}

const T = {
  sectionTitle: 'QA Configuration Center',            // qaConfigurationCenterSection.title
  standard: 'Standard',                               // …tabs.standard
  custom: 'Custom',                                   // …tabs.custom
  configure: 'Configure',                             // …table.configure
  edit: 'Edit',                                       // common.edit
  duplicate: 'Duplicate',                             // common.duplicate
  cancel: 'Cancel',                                   // common.cancel
  createDuplicate: 'Create Duplicate',                // …modal.saveButtons.createDuplicate
  saveChanges: 'Save Changes',                        // …modal.saveButtons.saveChanges
  headerConfigure: (n: string) => `Configure — ${n}`, // …modal.headerConfigure
  headerDuplicate: (n: string) => `Duplicate — ${n}`, // …modal.headerDuplicate
  headerEdit: (n: string) => `Edit — ${n}`,           // …modal.headerEdit
  copyOf: (n: string) => `${n} (Copy)`,               // common.copyOfName
  addField: 'Add field',                              // …fieldEditor.addField
  addOption: 'Add option',                            // …fieldEditor.addOption
  removeField: 'Remove field',                        // …fieldEditor.removeField
  removeOption: 'Remove option',                      // …fieldEditor.removeOption
  moveUp: 'Move up',                                  // …fieldEditor.moveUp
  moveDown: 'Move down',                              // …fieldEditor.moveDown
  savedFieldNote: 'Saved field: rename or make optional only', // …fieldEditor.savedFieldNote
  typeLocked: 'A saved field keeps its type, so past reviews still read correctly.', // …fieldEditor.typeLocked
  noFields: 'An activity needs at least one field.',  // …fieldEditor.problems.noFields
  fieldRemoved: "A saved field can't be removed",     // …fieldEditor.problems.fieldRemoved (start)
};

const STANDARD = 'GYN Cytology Secondary Screening';
const COPY = T.copyOf(STANDARD);
// Seed fields (src/services/quality/mockQaActivityTypeService.ts).
const F = { trigger: 'Trigger', added: 'Findings Added by This Event', missed: 'Findings Missed by This Event' };
const EDIT = { newField: 'Specimen Adequacy Comment', relabelled: 'Findings Added on Rescreen', hint: 'Note anything the primary screener missed', newOption: 'Rescreen Requested' };
const ACTIVITY_KEY = 'pathscribe_mock_qa_activity_types';

const dialog = (page: Page) => page.locator('.ps-ms-modal').filter({ has: page.locator('.ps-ms-header') });
const rowsOf = (d: Locator) => d.locator('.ps-qa-field-editor-row');
/** The editor row whose label input currently holds `label`. */
async function rowWithLabel(d: Locator, label: string): Promise<Locator> {
  const rows = rowsOf(d);
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    if (await rows.nth(i).locator('.ps-qa-field-editor-row-head input.ps-conf-input').inputValue() === label) return rows.nth(i);
  }
  throw new Error(`no field labelled "${label}"`);
}
const labelsOf = (d: Locator) => rowsOf(d).locator('.ps-qa-field-editor-row-head input.ps-conf-input').evaluateAll(es => es.map(e => (e as HTMLInputElement).value));
const tableRow = (page: Page, name: string) => page.locator('.ps-conf-table .ps-conf-tr').filter({ has: page.locator('.ps-conf-identity-name', { hasText: new RegExp(`^${name.replace(/[()]/g, '\\$&')}$`) }) });

async function openQaConfigCenter(page: Page) {
  await openPage(page, '/configuration?tab=system&section=qa_config_center', 'Configuration');
  await expect(page.locator('h3.ps-conf-section-title', { hasText: T.sectionTitle })).toBeVisible({ timeout: 20_000 });
}
async function switchTab(page: Page, tab: string) {
  await page.locator('.ps-tab-bar .ps-tab-btn').filter({ hasText: new RegExp(`^${tab}$`) }).click();
  await expect(page.locator('.ps-tab-bar .ps-tab-btn.active')).toHaveText(tab);
}
/** The stored activity by name. */
async function stored(page: Page, name: string) {
  return page.evaluate(([k, n]) => (JSON.parse(localStorage.getItem(k) ?? '[]') as { name: string; tabScope: string; fields: { id: string; label: string; type: string; required: boolean; hint?: string; options: { id: string; label: string }[] }[] }[])
    .find(a => a.name === n) ?? null, [ACTIVITY_KEY, name] as const);
}

test.describe('PS-125: QA Configuration Center field-schema editor for Custom activities', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, [ACTIVITY_KEY]); });

  test('Steps 1–5: Standard read-only; duplicate; edit fields and save; saved fields and options are locked', async ({ page }) => {
    test.setTimeout(240_000);

    await test.step('1. Sign in as Pete; Configuration → System → QA Configuration Center', async () => {
      await openQaConfigCenter(page);
      await expect(page.locator('.ps-tab-bar .ps-tab-btn.active')).toHaveText(T.standard);
      await expect(tableRow(page, STANDARD)).toHaveCount(1);
    });

    await test.step('2. Standard tab: Configure an activity; its review fields are read-only', async () => {
      await tableRow(page, STANDARD).getByRole('button', { name: T.configure, exact: true }).click();
      const d = dialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.headerConfigure(STANDARD));
      const lines = d.locator('ul.ps-qa-field-editor-list > li');
      await expect(lines).toHaveText([`${F.trigger} (Drop-down list) (required)`, `${F.added} (Short text)`, `${F.missed} (Short text)`]);
      await expect(d.locator('.ps-qa-field-editor'), 'no field editor').toHaveCount(0);
      await expect(d.getByRole('button', { name: T.addField, exact: true })).toHaveCount(0);
      await expect(d.getByRole('button', { name: T.removeField, exact: true })).toHaveCount(0);
      await d.getByRole('button', { name: T.cancel, exact: true }).click();
      await expect(d).toHaveCount(0);
    });

    await test.step('3. Duplicate it (Create Duplicate); the copy opens on the Custom tab', async () => {
      await tableRow(page, STANDARD).getByRole('button', { name: T.duplicate, exact: true }).click();
      const d = dialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.headerDuplicate(STANDARD));
      await expect(d.getByLabel('Name', { exact: true })).toHaveValue(COPY);
      expect(await labelsOf(d), 'the fields are copied').toEqual([F.trigger, F.added, F.missed]);
      await d.getByRole('button', { name: T.createDuplicate, exact: true }).click();
      await expect(d).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('.ps-tab-bar .ps-tab-btn.active'), 'lands on Custom').toHaveText(T.custom);
      await expect(tableRow(page, COPY)).toHaveCount(1);
      await tableRow(page, COPY).getByRole('button', { name: T.edit, exact: true }).click();
      await expect(d.locator('.ps-ms-header')).toHaveText(T.headerEdit(COPY));
      await expect(d.locator('.ps-qa-field-editor'), 'an editable field editor').toBeVisible();
    });

    await test.step('4. Add field, Move up / Move down, relabel, untick Required, add a hint, Add option on the choice field; Save Changes', async () => {
      const d = dialog(page);
      // Add field (new, Short text) and give it a label.
      await d.getByRole('button', { name: T.addField, exact: true }).click();
      await expect(rowsOf(d)).toHaveCount(4);
      await d.getByLabel('Field 4 label', { exact: true }).fill(EDIT.newField);
      // Move up: the new field goes above "Findings Missed"; Move down: Trigger goes below "Findings Added".
      await (await rowWithLabel(d, EDIT.newField)).getByRole('button', { name: T.moveUp, exact: true }).click();
      expect(await labelsOf(d)).toEqual([F.trigger, F.added, EDIT.newField, F.missed]);
      await (await rowWithLabel(d, F.trigger)).getByRole('button', { name: T.moveDown, exact: true }).click();
      expect(await labelsOf(d)).toEqual([F.added, F.trigger, EDIT.newField, F.missed]);
      // Change a saved field's label.
      await d.getByLabel('Field 1 label', { exact: true }).fill(EDIT.relabelled);
      // Untick Required on Trigger (saved, required).
      const trigger = await rowWithLabel(d, F.trigger);
      const required = trigger.locator('.ps-qa-field-editor-required input[type="checkbox"]');
      await expect(required).toBeChecked();
      await required.uncheck();
      await expect(required).not.toBeChecked();
      // A hint on Findings Missed (field 4 now).
      await d.getByLabel('Field 4 hint', { exact: true }).fill(EDIT.hint);
      // Add option on the choice field.
      await trigger.getByRole('button', { name: T.addOption, exact: true }).click();
      await expect(trigger.locator('.ps-qa-field-editor-option')).toHaveCount(4);
      await trigger.getByLabel('Option 4 label', { exact: true }).fill(EDIT.newOption);
      await expect(d.locator('.ps-qa-field-editor-problem'), 'nothing wrong with the schema').toHaveCount(0);
      await d.getByRole('button', { name: T.saveChanges, exact: true }).click();
      await expect(d, 'saved and closed').toHaveCount(0, { timeout: 15_000 });
      // Stored as edited; the Standard original untouched.
      const copy = await stored(page, COPY);
      expect(copy?.tabScope).toBe('custom');
      expect(copy?.fields.map(f => [f.label, f.type, f.required, f.hint ?? null])).toEqual([
        [EDIT.relabelled, 'text', false, null],
        [F.trigger, 'dropdown', false, null],
        [EDIT.newField, 'text', false, null],
        [F.missed, 'text', false, EDIT.hint],
      ]);
      expect(copy?.fields[1].options.map(o => o.label)).toEqual(['QC — Random Selection', 'QC — Targeted High-Risk', 'Secondary Reviewer', EDIT.newOption]);
      const original = await stored(page, STANDARD);
      expect(original?.fields.map(f => [f.label, f.required]), 'the Standard activity is unchanged').toEqual([[F.trigger, true], [F.added, false], [F.missed, false]]);
    });

    await test.step('5. Reopen: every saved field has no Remove field and a locked type; saved options have no Remove option', async () => {
      await openQaConfigCenter(page);
      await switchTab(page, T.custom);
      await tableRow(page, COPY).getByRole('button', { name: T.edit, exact: true }).click();
      const d = dialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.headerEdit(COPY));
      expect(await labelsOf(d), 'the saved order and labels').toEqual([EDIT.relabelled, F.trigger, EDIT.newField, F.missed]);
      await expect(d.getByLabel('Field 4 hint', { exact: true })).toHaveValue(EDIT.hint);
      await expect((await rowWithLabel(d, F.trigger)).locator('.ps-qa-field-editor-required input[type="checkbox"]')).not.toBeChecked();
      // Locks on all four saved fields (the field added in step 4 is saved now too).
      await expect(d.getByRole('button', { name: T.removeField, exact: true }), 'no saved field can be removed').toHaveCount(0);
      await expect(d.locator('.ps-qa-field-editor-actions .ps-conf-hint')).toHaveText(Array(4).fill(T.savedFieldNote));
      for (let n = 1; n <= 4; n++) {
        const type = d.getByLabel(`Field ${n} type`, { exact: true });
        await expect(type, `field ${n} type is locked`).toBeDisabled();
        await expect(type).toHaveAttribute('title', T.typeLocked);
      }
      const trigger = await rowWithLabel(d, F.trigger);
      await expect(trigger.locator('.ps-qa-field-editor-option')).toHaveCount(4);
      await expect(trigger.getByRole('button', { name: T.removeOption, exact: true }), 'no saved option can be removed').toHaveCount(0);
      // Saved ones can still be renamed.
      await trigger.getByLabel('Option 4 label', { exact: true }).fill(`${EDIT.newOption} (renamed)`);
      // Control: an option and a field added now can be removed, and the new field's type can change.
      await trigger.getByRole('button', { name: T.addOption, exact: true }).click();
      await expect(trigger.getByRole('button', { name: T.removeOption, exact: true })).toHaveCount(1);
      await trigger.getByRole('button', { name: T.removeOption, exact: true }).click();
      await expect(trigger.locator('.ps-qa-field-editor-option')).toHaveCount(4);
      await d.getByRole('button', { name: T.addField, exact: true }).click();
      await expect(d.getByLabel('Field 5 type', { exact: true })).toBeEnabled();
      await expect(d.getByRole('button', { name: T.removeField, exact: true })).toHaveCount(1);
      await d.getByRole('button', { name: T.removeField, exact: true }).click();
      await expect(rowsOf(d)).toHaveCount(4);
      // The refusal text is never shown: there was nothing to refuse.
      await expect(d.getByText(T.fieldRemoved)).toHaveCount(0);
      await d.getByRole('button', { name: T.saveChanges, exact: true }).click();
      await expect(d, 'saved and closed').toHaveCount(0, { timeout: 15_000 });
      expect((await stored(page, COPY))?.fields[1].options[3].label).toBe(`${EDIT.newOption} (renamed)`);
    });
  });

  test('Step 6: removing all fields is refused with "An activity needs at least one field."', async ({ page }) => {
    test.setTimeout(120_000);
    await test.step('6. Duplicate the Standard activity, remove all three fields: the message shows, Create Duplicate is disabled, nothing is created', async () => {
      await openQaConfigCenter(page);
      await tableRow(page, STANDARD).getByRole('button', { name: T.duplicate, exact: true }).click();
      const d = dialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.headerDuplicate(STANDARD));
      for (let left = 3; left > 0; left--) {
        await rowsOf(d).first().getByRole('button', { name: T.removeField, exact: true }).click();
        await expect(rowsOf(d)).toHaveCount(left - 1);
      }
      const problem = d.locator('.ps-qa-field-editor-problem[role="alert"]');
      await expect(problem).toHaveText(T.noFields);
      await expect(d.getByRole('button', { name: T.createDuplicate, exact: true }), 'refused: Create Duplicate is disabled').toBeDisabled();
      await expect(d, 'the dialog stays open').toBeVisible();
      // Adding a field back clears the refusal (once it has a label).
      await d.getByRole('button', { name: T.addField, exact: true }).click();
      await d.getByLabel('Field 1 label', { exact: true }).fill(EDIT.newField);
      await expect(problem).toHaveCount(0);
      await expect(d.getByRole('button', { name: T.createDuplicate, exact: true })).toBeEnabled();
      await d.getByRole('button', { name: T.cancel, exact: true }).click();
      await expect(d).toHaveCount(0);
      expect(await stored(page, COPY), 'nothing was created').toBeNull();
      await switchTab(page, T.custom);
      await expect(tableRow(page, COPY)).toHaveCount(0);
    });
  });
});
