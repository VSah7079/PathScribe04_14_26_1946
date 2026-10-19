// e2e/review/ps-102.scan-station-facility.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-102: "When defining Scan Stations, the Facility should not be a free text
// item". Review test plan, against the demo (localStorage) data:
//   1. Sign in as Pete Nimmo; open Configuration → System → Workstation &
//      Hardware → Scan Stations.                                     automated
//   2. Open an existing station and look at the Facility field.      automated
//   3. The dropdown lists performing labs only, with
//      '— Select a performing lab —' as the empty choice.             automated
//   4. Clear the Facility and try to save: an error shows on the field. automated
//   5. Change the group-level Facility selector at the top of Workstation &
//      Hardware: the station list follows the selected facility.     automated
// Every step is automated; nothing on this ticket still needs a person.
// Expected: Facility can't be typed freely; saving without one shows an error
// on the field; the list follows the selected facility.
// Selectors: English texts from src/i18n/locales/en.json (scanStationsSection.*,
// systemTab.*) and the screen's own .ps-* classes.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// en.json texts the screen renders.
const T = {
  configuration: 'Configuration',
  group: 'Workstation & Hardware',           // systemTab.groups.workstationHardware
  section: 'Scan Stations',                  // systemTab.sections.scanStations / scanStationsSection.title
  groupFacilityLabel: 'Facility:',           // systemTab.facilityLabel (aria-label of the group selector)
  allFacilities: 'All Facilities',           // systemTab.allFacilitiesOption
  facilityLabel: 'Facility',                 // scanStationsSection.modal.facilityLabel (aria-label of the field)
  facilityNone: '— Select a performing lab —', // scanStationsSection.modal.facilityNoneOption
  facilityRequired: 'Required: choose the performing lab this bench is in.', // scanStationsSection.errors.facilityRequired
  saveChanges: 'Save Changes',               // scanStationsSection.modal.saveChangesButton
  edit: 'Edit',                              // common.edit
  cancel: 'Cancel',                          // common.cancel
  emptyRow: 'No scan stations match the current filter.', // scanStationsSection.emptyRow
};

// Demo facilities (src/services/facilities/mockFacilityService.ts): Fenwick General Hospital is an active
// performing lab holding every seeded station; Metro General Hospital is active but an ordering client only
// (no performing_lab role), so it must not be offered as a station's facility.
const PERFORMING_LAB = 'Fenwick General Hospital';
const NOT_A_LAB = 'Metro General Hospital';

test.describe('PS-102 Scan Station facility is a performing-lab pick, not free text', () => {
  test('review steps 1–5', async ({ page }) => {
    test.setTimeout(180_000);
    const modal = page.locator('.ps-ms-modal');
    const facilityField = modal.getByLabel(T.facilityLabel, { exact: true });
    const groupFacility = page.locator('.ps-confsys-facility-selector').getByLabel(T.groupFacilityLabel, { exact: true });
    const rows = page.locator('.ps-conf-table tbody tr.ps-conf-tr');
    const facilityCells = rows.locator('td:nth-child(4)');

    await test.step('1. Sign in as Pete Nimmo; open Configuration → System → Workstation & Hardware → Scan Stations', async () => {
      await signIn(page);
      await openScreen(page, '/configuration?tab=system&section=scan_stations', T.configuration);
      await expect(page.locator('.ps-sub-tab-btn.active'), 'the Workstation & Hardware group tab is on').toHaveText(T.group);
      await expect(page.locator('.ps-confsys-nav-btn--active'), 'Scan Stations is the selected section').toContainText(T.section);
      await expect(page.locator('h3.ps-conf-section-title'), 'the Scan Stations section heading').toHaveText(T.section);
      await expect(rows.first(), 'the demo has at least one scan station').toBeVisible();
    });

    await test.step('2. Open an existing station and look at the Facility field', async () => {
      await rows.first().getByRole('button', { name: T.edit, exact: true }).click();
      await expect(modal, 'the Edit station window opens').toBeVisible();
      await expect(facilityField, 'the Facility field is in the window').toBeVisible();
      const tag = await facilityField.evaluate(el => el.tagName.toLowerCase());
      expect(tag, `Facility must be a dropdown (select), not free text; the app renders a <${tag}>`).toBe('select');
      await expect(facilityField, 'the station\'s facility is pre-selected').toHaveValue(/.+/);
      await expect(facilityField.locator('option:checked'), 'the pre-selected facility is the station\'s performing lab').toHaveText(PERFORMING_LAB);
      // Nothing typed can land in a <select>: keyboard input leaves the value as it was.
      const before = await facilityField.inputValue();
      await facilityField.focus();
      await page.keyboard.type('Free text facility');
      expect(await facilityField.inputValue(), 'typing into the Facility field does not change it to free text').toBe(before);
    });

    await test.step("3. Open the dropdown: performing labs only, with '— Select a performing lab —' as the empty choice", async () => {
      const options = facilityField.locator('option');
      await expect(options.first(), 'the first (empty) choice').toHaveText(T.facilityNone);
      await expect(options.first(), 'the empty choice has no value').toHaveAttribute('value', '');
      const texts = (await options.allTextContents()).map(s => s.trim());
      const labs = texts.slice(1);
      expect(labs.length, 'at least one performing lab is offered').toBeGreaterThan(0);
      expect(labs, `the performing lab "${PERFORMING_LAB}" is offered`).toContain(PERFORMING_LAB);
      expect(labs, `"${NOT_A_LAB}" (an ordering client, not a performing lab) must not be offered`).not.toContain(NOT_A_LAB);
      // Same list as the group-level selector (both come from the active performing labs), bar their empty choices.
      const groupLabs = (await groupFacility.locator('option').allTextContents()).map(s => s.trim()).filter(s => s !== T.allFacilities);
      expect(labs, 'the field offers exactly the performing labs the group selector offers').toEqual(groupLabs);
    });

    await test.step('4. Clear the Facility and try to save: an error shows on the field', async () => {
      await facilityField.selectOption('');
      await expect(facilityField, 'Facility cleared').toHaveValue('');
      await modal.getByRole('button', { name: T.saveChanges, exact: true }).click();
      await expect(modal, 'the window stays open; the station is not saved without a facility').toBeVisible();
      await expect(facilityField, 'the Facility field is marked in error').toHaveClass(/ps-conf-input--error/);
      const fieldBlock = modal.locator('.ps-conf-form-field').filter({ has: page.getByLabel(T.facilityLabel, { exact: true }) });
      await expect(fieldBlock.locator('.ps-conf-error-text'), 'the error text shows under the Facility field').toHaveText(T.facilityRequired);
      await modal.getByRole('button', { name: T.cancel, exact: true }).click();
      await expect(modal, 'the window closes without saving').toBeHidden();
      await expect(facilityCells.first(), 'the station keeps its facility after Cancel').toHaveText(PERFORMING_LAB);
    });

    await test.step('5. Change the group-level Facility selector: the station list follows it', async () => {
      await expect(groupFacility, 'the group-level Facility selector sits at the top of Workstation & Hardware').toBeVisible();
      await expect(groupFacility.locator('option').first(), 'its empty choice is All Facilities').toHaveText(T.allFacilities);
      const allCount = await rows.count();
      expect(allCount, 'stations listed under All Facilities').toBeGreaterThan(0);

      // A performing lab with no stations: the list empties (the empty row is a single row with the empty text).
      const otherLab = (await groupFacility.locator('option').allTextContents()).map(s => s.trim())
        .find(s => s !== T.allFacilities && s !== PERFORMING_LAB);
      expect(otherLab, 'the demo has a second performing lab to switch to').toBeTruthy();
      await groupFacility.selectOption({ label: otherLab! });
      await expect(groupFacility.locator('option:checked')).toHaveText(otherLab!);
      const otherCells = await facilityCells.allTextContents();
      for (const c of otherCells) expect(c.trim(), `every listed station belongs to "${otherLab}"`).toBe(otherLab);
      if (otherCells.length === 0) {
        await expect(page.locator('.ps-conf-empty-row'), 'the empty-list row shows for a lab with no stations').toHaveText(T.emptyRow);
      }

      // The lab the seeded stations belong to: only its stations.
      await groupFacility.selectOption({ label: PERFORMING_LAB });
      await expect(rows.first(), `stations listed for "${PERFORMING_LAB}"`).toBeVisible();
      const cells = await facilityCells.allTextContents();
      expect(cells.length, 'the filtered list is not longer than the full list').toBeLessThanOrEqual(allCount);
      for (const c of cells) expect(c.trim(), `every listed station belongs to "${PERFORMING_LAB}"`).toBe(PERFORMING_LAB);

      // Back to All Facilities: the full list again.
      await groupFacility.selectOption('');
      await expect(rows, 'All Facilities lists every station again').toHaveCount(allCount);

      // A station added while a facility is selected starts on that facility.
      await groupFacility.selectOption({ label: PERFORMING_LAB });
      await page.getByRole('button', { name: '+ Add Scan Station', exact: true }).click();
      await expect(modal, 'the Add station window opens').toBeVisible();
      await expect(facilityField.locator('option:checked'), 'the new station defaults to the selected facility').toHaveText(PERFORMING_LAB);
      await modal.getByRole('button', { name: T.cancel, exact: true }).click();
      await expect(modal).toBeHidden();
    });
  });
});
