// e2e/review/ps-58.model-store-tenant-scoping.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-58 — "ForMedrixAI Store: tenant scoping for adopted-models catalog is
// undesigned". Review test plan, run against the demo (Vite dev server,
// localStorage data):
//
//   1. Sign in as Pete (demo@pathscribe.ai) and open Configuration → AI
//      Behavior → Models; note the models listed.                    automated
//      (The screen calls it "Model Versions", a collapsed admin panel at the
//      foot of AI Behavior; its table is titled "Models". Pete's organisation
//      is ORG-DVMC.)
//   2. Open Configuration → Validation Studies → Studies, start a new study and
//      click "Don't see the model you need? Browse the ForMedrixAI store".
//                                                                    automated
//   3. In the ForMedrixAI Store, click Adopt on a model not yet adopted
//      (e.g. v4.0).                                                  automated
//   4. Back on Configuration → AI Behavior → Models, check the new model shows
//      as Beta, not the default, with 0 cases processed.             automated
//   5. Sign out, sign in as Dr. Paul Carter (UK, Manchester) and open
//      Configuration → AI Behavior → Models: his list is unchanged and the store
//      still offers the model.                                       automated
//      (The test signs out with the app's Sign Out button, then starts Paul
//      Carter's session (PATH-UK-001, superadmin, ORG-MFT) over the same browser
//      data, as the other review specs do; the demo password isn't used.
//      Paul Carter is a superadmin, so this also checks a superadmin does NOT
//      see other organisations' adoptions.)
//   6. The new database rules against the Firestore emulator (phase 2e server).
//                                                            needs a person
//      (no emulator or API server here).
//
// Expected (ticket): an adopted model appears only for the adopting
// organisation, as Beta / non-default / 0 cases; other organisations are
// unaffected.
//
// Demo values the test asserts exactly (services/models/modelAdoption.ts
// starterAdoptions, every demo organisation starts with the same six):
// pathscribe v3.2 (Active, default, 12,487 cases), v3.3 (Beta, 842), v3.1 and
// v3.0 (Retired), v3.3-alt (Beta, 0), pathscribe-voice 2.0-flash-lite (Active,
// default voice model). The store offers the two unadopted listed models,
// pathscribe v4.0 and pathscribe-voice 2.5-flash-lite.
//
// Texts are the English values of aiTab.*, modelsTab.*, modelStoreModal.* and
// validationStudies.* in src/i18n/locales/en.json; selectors are the screens'
// own .ps-* / .msm-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium \
//        e2e/review/ps-58.model-store-tenant-scoping.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { startSession, signOut, DEMO_USERS } from './helpers';

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
  aiBehavior: 'AI Behavior',                       // aiTab.title
  modelVersions: 'Model Versions',                 // aiTab.modelVersions
  modelsTitle: 'Models',                           // modelsTab.title
  defaultBadge: '✓ Default',                       // ✓ + modelsTab.tableHeaders.default
  setDefault: 'Set Default',                       // modelsTab.setDefaultButton
  validationStudies: 'Validation Studies',
  newStudy: '+ New Study',                         // validationStudies.studies.newStudy
  browseStore: '🏪 Don\'t see the model you need? Browse the ForMedrixAI store', // validationStudies.form.browseStore
  aiModel: 'AI Model Being Validated',             // validationStudies.form.aiModel
  storeTitle: 'ForMedrixAI Store',                 // modelStoreModal.title
  adopt: 'Adopt',                                  // modelStoreModal.download
};

const PAUL = { id: 'PATH-UK-001', name: 'Paul Carter', role: 'superadmin' };

/** One row of the Models table, as shown. */
interface ModelRow { model: string; cases: string; status: string; defaultCell: string }

/** The six starter adoptions every demo organisation has (modelAdoption.ts starterAdoptions). */
const STARTER: ModelRow[] = [
  { model: 'pathscribe v3.2', cases: '12,487', status: 'Active', defaultCell: T.defaultBadge },
  { model: 'pathscribe v3.3', cases: '842', status: 'Beta', defaultCell: 'Set DefaultRetire' },
  { model: 'pathscribe v3.1', cases: '45,210', status: 'Retired', defaultCell: '' },
  { model: 'pathscribe v3.0', cases: '98,341', status: 'Retired', defaultCell: '' },
  { model: 'pathscribe v3.3-alt', cases: '0', status: 'Beta', defaultCell: 'Set DefaultRetire' },
  { model: 'pathscribe-voice 2.0-flash-lite', cases: '0', status: 'Active', defaultCell: T.defaultBadge },
];
const ADOPTED_V40: ModelRow = { model: 'pathscribe v4.0', cases: '0', status: 'Beta', defaultCell: 'Set DefaultRetire' };
const STORE_BEFORE = ['pathscribe v4.0', 'pathscribe-voice 2.5-flash-lite'];

async function openConfig(page: Page, query: string) {
  await page.goto(`/configuration?${query}`);
  await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: 90_000 });
}

/** Configuration → AI Behavior → Model Versions; returns the Models table rows. */
async function readModels(page: Page): Promise<ModelRow[]> {
  await openConfig(page, 'tab=ai');
  await expect(page.locator('h2.ps-conf-section-title')).toHaveText(T.aiBehavior, { timeout: 30_000 });
  await page.locator('.ps-aitab-models-toggle-btn').filter({ hasText: T.modelVersions }).click();
  await expect(page.locator('h2.ps-models-title')).toHaveText(T.modelsTitle);
  const rows = page.locator('.ps-models-table tbody tr.ps-models-tr');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  return rows.evaluateAll(trs => trs.map(tr => {
    const td = Array.from(tr.querySelectorAll('td')).map(c => (c.textContent ?? '').trim());
    return { model: td[0], cases: td[4], status: td[5], defaultCell: td[7] };
  }));
}

/** Validation Studies → Studies → + New Study → Browse the store; returns the store modal. */
async function openStore(page: Page) {
  await openConfig(page, 'tab=validation&section=studies');
  await page.getByRole('button', { name: T.newStudy, exact: true }).click();
  await page.getByRole('button', { name: T.browseStore, exact: true }).click();
  const store = page.locator('.msm-modal');
  await expect(store.locator('.ps-modal-dark-title')).toHaveText(T.storeTitle);
  await expect(store.locator('.msm-listing-card').first()).toBeVisible({ timeout: 20_000 });
  return store;
}

test.describe('PS-58 adopted AI models are scoped to the adopting organisation', () => {
  test('Steps 1–5: Pete adopts v4.0 for his organisation only; Paul Carter (another organisation) is unaffected', async ({ page }) => {
    test.setTimeout(300_000);
    await signInFresh(page, DEMO_USERS.pete);

    await test.step('1. Pete: Configuration → AI Behavior → Models; note the models listed', async () => {
      expect(await readModels(page), 'Pete\'s organisation starts with the six starter models').toEqual(STARTER);
    });

    let store = page.locator('.msm-modal');
    await test.step('2. Validation Studies → Studies → + New Study → "Browse the ForMedrixAI store"', async () => {
      store = await openStore(page);
      await expect(store.locator('.msm-listing-name'), 'the store lists what the organisation has not adopted').toHaveText(STORE_BEFORE);
    });

    await test.step('3. Adopt pathscribe v4.0', async () => {
      const card = store.locator('.msm-listing-card').filter({ has: page.locator('.msm-listing-name', { hasText: /^pathscribe v4\.0$/ }) });
      await card.getByRole('button', { name: T.adopt, exact: true }).click();
      await expect(store, 'the store closes after adopting').toHaveCount(0, { timeout: 20_000 });
      // The new study's model picker now holds the adopted model.
      await expect(page.getByLabel(T.aiModel, { exact: true }).locator('option:checked')).toHaveText('pathscribe v4.0 — Beta');
    });

    await test.step('4. AI Behavior → Models: v4.0 is Beta, not the default, 0 cases; nothing else changed', async () => {
      const rows = await readModels(page);
      expect(rows.find(r => r.model === ADOPTED_V40.model), 'v4.0 listed as Beta, not default, 0 cases').toEqual(ADOPTED_V40);
      expect(rows, 'the starter models are unchanged and v4.0 is added').toEqual([...STARTER, ADOPTED_V40]);
      // The store no longer offers it to this organisation.
      store = await openStore(page);
      await expect(store.locator('.msm-listing-name')).toHaveText(['pathscribe-voice 2.5-flash-lite']);
    });

    await test.step('5. Sign out; Paul Carter (superadmin, Manchester): his models are unchanged and the store still offers v4.0', async () => {
      await openConfig(page, 'tab=ai'); // off the half-filled New Study form
      await expect(page.locator('h2.ps-conf-section-title')).toHaveText(T.aiBehavior, { timeout: 30_000 });
      await signOut(page);
      await startSession(page, PAUL);
      expect(await readModels(page), 'Paul Carter\'s organisation still has only the starter models').toEqual(STARTER);
      store = await openStore(page);
      await expect(store.locator('.msm-listing-name'), 'the store still offers v4.0 to his organisation').toHaveText(STORE_BEFORE);
    });
  });
});
