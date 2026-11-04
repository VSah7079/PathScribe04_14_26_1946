// scripts/admin-guide/capture.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 646: screen captures for the Administrator Guide (docs/admin-guide/).
// Opens every Configuration tab and section, and the admin screens outside
// Configuration, in a real Chromium on the demo data, and saves one PNG each to
// docs/admin-guide/img/ with a manifest (img/manifest.json) the guide builder
// reads. Nothing here is hand-edited: re-run it and the guide's pictures follow
// the screens.
//
// Run (app already running on A11Y_PORT, default 5179: `npx vite --port 5179`):
//   node scripts/admin-guide/capture.mjs [--only=system,staff] [--match=billing] [--only-ids=a,b,c]
//
// Click flows: a screen that only appears after a click (a window, a drawer, a
// panel, a sub-tab) has an entry in the `clickFlows` table below: id -> async
// (page, h) => {...}. The flow gets the page already on the target's path, clicks
// through, waits until the window or panel is fully shown, and returns; the
// ordinary screenshot step then saves it (the viewport, so a window shows over
// its screen). A flow may call page.setViewportSize for a tall window (it is reset
// before the next target) and may return 'full' to use the full-page logic instead.
// Flows that need rows the fresh demo has none of (outbound dispatches, DLQ) create
// them through the app's own services, the way the accession page does.
// Chromium: PLAYWRIGHT_CHROMIUM names an installed browser; otherwise Playwright's own.
// Demo data only: no real patient data appears. Patient-looking values on the
// demo screens are fictional.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'docs', 'admin-guide', 'img');
const PORT = process.env.A11Y_PORT ?? '5179';
const BASE = `http://localhost:${PORT}`;
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? '').split('=')[1];
const ONLY = arg('only')?.split(',');
const MATCH = arg('match');
const ONLY_IDS = arg('only-ids')?.split(',');
const VIEWPORT = { width: 1440, height: 900 };
const MAX_HEIGHT = 2400;

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sectionsOf = (file, withGroup) => {
  const src = read(file);
  const out = [];
  for (const m of src.matchAll(/\{\s*id:\s*'([a-z0-9_]+)'[^}]*?(?:group:\s*'([^']+)')?\s*\}/g)) out.push({ id: m[1], group: m[2] ?? '' });
  return withGroup ? out : out.map((s) => s.id);
};

const system = sectionsOf('src/components/Config/System/systemSections.ts', true);
const cytology = sectionsOf('src/components/Config/Cytology/cytologySections.ts', false);
const targets = [];
const add = (kind, id, path, extra = {}) => targets.push({ kind, id, path, ...extra });

for (const t of ['ai', 'macros', 'templates', 'staff', 'protocols', 'system', 'cytology', 'tat', 'validation', 'voice', 'actions']) add('config-tab', `tab-${t}`, `/configuration?tab=${t}`);
for (const s of ['members', 'roles', 'credentialing']) add('staff', `staff-${s}`, `/configuration?tab=staff&section=${s}`);
for (const s of ['templates', 'parts', 'routing']) add('templates', `templates-${s}`, `/configuration?tab=templates&section=${s}`);
for (const s of ['studies', 'dashboard', 'reports']) add('validation', `validation-${s}`, `/configuration?tab=validation&section=${s}`);
for (const s of ['active', 'review', 'all']) add('protocols', `protocols-${s}`, `/configuration?tab=protocols&section=${s}`);
for (const s of system) add('system', `system-${s.id}`, `/configuration?tab=system&section=${s.id}`, { group: s.group });
for (const s of cytology) add('cytology', `cytology-${s}`, `/configuration?tab=cytology&section=${s}`);

// Admin screens outside Configuration (routes as in e2e/a11y.routes.spec.ts, plus the facility dictionary and logs).
const SCREENS = [
  ['audit-log', '/audit'], ['audit-interfaces', '/audit?tab=interfaces'],
  ['audit-financial', '/audit?tab=financial'], ['batch-management', '/batch-management'], ['migration-jobs', '/migration-jobs'],
  ['my-exports', '/my-exports'], ['audit-log-errors', '/audit?tab=errors'], ['embedding-station', '/workstations/embedding'],
  ['microtomy-workstation', '/workstations/microtomy'], ['slide-distribution-station', '/workstations/slide-distribution'],
  ['outbound-queue', '/outbound-queue'], ['mock-interface-engine', '/dev/mock-interface-engine'], ['mock-emr', '/mock-emr?case=S26-4403'], ['quality-assurance', '/quality-assurance'], ['margin-exception-review', '/margin-exception-review'],
  ['cytology-qc-queue', '/cytology-qc-queue'], ['lockbox-drop-off', '/lockbox-drop-off'], ['home', '/'],
  ['facility-dictionary', '/configuration?tab=system&section=clients'],
];
for (const [id, path] of SCREENS) add('screen', `screen-${id}`, path);


// ── Click flows ──────────────────────────────────────────────────────────────
const CONFIG = '/configuration';
const TALL = { width: 1440, height: 1400 };
const overlay = (page) => page.locator('.ps-overlay, [role="dialog"], [aria-modal="true"]').last();
const clickButton = async (scope, name, nth = 0) => { await scope.getByRole('button', { name }).nth(nth).click({ timeout: 15_000 }); await (scope.page ? scope.page() : scope).waitForTimeout(900); };
// Scroll a locator to near the top of whatever scrolls (the page or an inner container).
const bringToTop = async (loc) => {
  await loc.first().waitFor({ state: 'visible', timeout: 15_000 });
  await loc.first().evaluate((el) => {
    el.scrollIntoView({ block: 'start' });
    for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollHeight > p.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(p).overflowY)) { p.scrollTop -= 90; break; }
    window.scrollBy(0, -90);
  });
  await loc.page().waitForTimeout(500);
};
const testPanel = (heading, run) => async (page) => {
  await bringToTop(page.getByText(heading, { exact: false }).first());
  if (run) { await clickButton(page, run); await bringToTop(page.getByText(heading, { exact: false }).first()); }
};
const editWindow = (button) => async (page) => { await page.setViewportSize(TALL); await page.waitForTimeout(400); await clickButton(page, button); await overlay(page).waitFor({ state: 'visible' }); await page.waitForTimeout(500); };

// Where each flow starts (the screen the click happens on).
const AUDIT_IF = '/audit?tab=interfaces';
const FLOW_PATHS = {
  'protocols-build': `${CONFIG}?tab=protocols&section=active`, 'protocols-upload': `${CONFIG}?tab=protocols&section=active`, 'protocols-editor': `${CONFIG}?tab=protocols&section=active`,
  'screen-interface-engines': AUDIT_IF, 'screen-outbound-dispatches': AUDIT_IF, 'screen-outbound-interface-dlq': AUDIT_IF,
  'system-delivery_rules-edit': `${CONFIG}?tab=system&section=delivery_rules`, 'system-delivery_rules-test': `${CONFIG}?tab=system&section=delivery_rules`,
  'system-delivery_schedules-edit': `${CONFIG}?tab=system&section=delivery_schedules`, 'system-delivery_schedules-test': `${CONFIG}?tab=system&section=delivery_schedules`,
  'system-print_routing_rules-edit': `${CONFIG}?tab=system&section=print_routing_rules`, 'system-print_routing_rules-test': `${CONFIG}?tab=system&section=print_routing_rules`,
  'tab-ai-provider': `${CONFIG}?tab=ai`, 'tab-ai-vendor-policy': `${CONFIG}?tab=ai`, 'tab-ai-orchestrator': `${CONFIG}?tab=ai`, 'tab-ai-models': `${CONFIG}?tab=ai`, 'tab-ai-model-settings': `${CONFIG}?tab=ai`,
  'templates-parts-builder': `${CONFIG}?tab=templates&section=parts`, 'templates-routing-rule': `${CONFIG}?tab=templates&section=routing`, 'templates-routing-test': `${CONFIG}?tab=templates&section=routing`,
  'templates-templates-editor': `${CONFIG}?tab=templates&section=templates`, 'templates-templates-inspector': `${CONFIG}?tab=templates&section=templates`,
  'validation-studies-new': `${CONFIG}?tab=validation&section=studies`,
};

const clickFlows = {
  // Protocols (Synoptic Library)
  'protocols-build': async (page) => { await clickButton(page, /Build \/ Customise/); await overlay(page).waitFor(); },
  'protocols-upload': async (page) => { await clickButton(page, /Upload Protocol/); await overlay(page).waitFor(); },
  // Build / Customise on a validated protocol opens the editor on a copy with its sections and fields.
  'protocols-editor': async (page) => {
    await clickButton(page, /Build \/ Customise/);
    await overlay(page).getByText('Generic Template — Breast Invasive').click();
    await clickButton(page, /Customise This Template/);
    await page.getByRole('button', { name: /Add Section/ }).waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
  },

  // Interface logs (Audit Log > Interface Log sub-tabs)
  'screen-interface-engines': async (page) => { await clickButton(page, /^Engines$/); await page.getByRole('heading', { name: 'Interface engines' }).waitFor(); await page.waitForTimeout(800); },
  'screen-outbound-dispatches': async (page) => {
    await seedOutboundDispatch(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await clickButton(page, /Outbound Dispatches/);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 20_000 });
    await row.click();
    await page.waitForTimeout(1200);
  },
  'screen-outbound-interface-dlq': async (page) => {
    await seedOutboundFailures(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await clickButton(page, /Outbound Interface DLQ/);
    await page.locator('table tbody tr').first().waitFor({ timeout: 20_000 });
  },

  // System: delivery rules, delivery schedules, print routing
  'system-delivery_rules-edit': editWindow(/Add Rule/),
  'system-delivery_rules-test': testPanel('Test Delivery Resolution', /^Resolve$/),
  'system-delivery_schedules-edit': async (page) => { await page.setViewportSize(TALL); await clickButton(page, /^Edit$/, 0); await overlay(page).waitFor(); await page.waitForTimeout(500); },
  'system-delivery_schedules-test': async (page) => { await bringToTop(page.getByRole('button', { name: /^Check$/ })); await clickButton(page, /^Check$/); await bringToTop(page.getByRole('button', { name: /^Check$/ })); },
  'system-print_routing_rules-edit': editWindow(/Add Rule/),
  'system-print_routing_rules-test': testPanel('Test Print Destination Resolution', /^Resolve$/),

  // AI Behavior tab: parts of one long page
  'tab-ai-provider': async (page) => { await bringToTop(page.getByRole('heading', { name: /AI Provider/ })); },
  'tab-ai-vendor-policy': async (page) => {
    await bringToTop(page.getByText('AI vendor policy', { exact: true }).first());
  },
  'tab-ai-orchestrator': async (page) => { await page.locator('.ps-orchcfg-header-btn').click(); await page.waitForTimeout(900); await bringToTop(page.getByText('Orchestrator Config', { exact: true }).first()); },
  'tab-ai-models': async (page) => {
    await page.getByRole('button', { name: /Model Versions/ }).click();
    await page.waitForTimeout(1200);
    await bringToTop(page.getByRole('button', { name: /Model Versions/ }));
  },
  'tab-ai-model-settings': async (page) => {
    await page.setViewportSize(TALL);
    await page.getByRole('button', { name: /Model Versions/ }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /settings/i }).first().click();
    await overlay(page).waitFor();
    await page.waitForTimeout(600);
  },

  // Report Templates
  'templates-parts-builder': async (page) => {
    const card = page.locator('.ps-plib-card').filter({ hasText: 'GYN Cytology — Preliminary Interpretation' }).first();
    await card.hover();
    await card.waitFor({ timeout: 20_000 });
    await card.getByRole('button', { name: /^Edit$/ }).click();
    await page.getByText('COMPONENTS', { exact: false }).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1200);
  },
  'templates-routing-rule': async (page) => { await clickButton(page, /Add Facility Rule/); await overlay(page).waitFor(); },
  'templates-routing-test': async (page) => { await bringToTop(page.getByText('Test Template Routing', { exact: false }).first()); },
  // Published templates are read-only (Duplicate only), so the editor opens from a CAP template's Edit button, shown on row hover.
  'templates-templates-editor': async (page) => {
    await page.setViewportSize(TALL);
    await openTemplateEditor(page);
    await page.waitForTimeout(1000);
  },
  // Inspector: Edit part on a body part opens the part canvas; selecting a field shows its properties.
  'templates-templates-inspector': async (page) => {
    await page.setViewportSize(TALL);
    await openTemplateEditor(page);
    await clickButton(page, /^Edit part$/, 3);
    await page.getByText('COMPONENTS', { exact: false }).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1200);
    await page.getByText('Laterality', { exact: true }).first().click();
    await page.getByText('Select an element on the canvas', { exact: false }).waitFor({ state: 'detached', timeout: 10_000 });
    await page.waitForTimeout(800);
  },

  // Validation Studies
  'validation-studies-new': editWindow(/New Study/),
};

async function openTemplateEditor(page) {
  const row = page.locator('.tmpl-row').filter({ hasText: 'Breast Pathology Report' }).first();
  await row.waitFor({ timeout: 20_000 });
  await row.hover();
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByText('PART LIBRARY', { exact: false }).first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);
}

// Rows for the two outbound screens, created through the app's own services (dev server modules).
async function seedOutboundDispatch(page) {
  await page.evaluate(async () => {
    const [{ caseRouter }, { buildOrderCreationPayload }, { interfaceEngineService }] = await Promise.all([
      import('/src/services/cases/CaseRouter.ts'), import('/src/services/interfaceEngine/buildOrderCreationPayload.ts'), import('/src/services/index.ts'),
    ]);
    const c = await caseRouter.getCase('S26-4403');
    await interfaceEngineService.postOrderCreated(buildOrderCreationPayload(c, 'matched', new Date().toISOString()));
  });
}
async function seedOutboundFailures(page) {
  await page.evaluate(async () => {
    const { outboundPatientAdtQueueService: q } = await import('/src/services/index.ts');
    for (const id of ['PAT-1001', 'PAT-1002']) {
      const e = await q.enqueue({ eventType: 'A08_DEMOGRAPHIC_UPDATE', organisationId: 'ENT-DEFAULT', sourcePatientId: id, sourceOperation: 'updateDemographics' });
      if (e.ok) await q.markFailed(e.data.id, { errorCode: 'DISPATCH_UNREACHABLE', errorMessage: 'The interface engine could not be reached', maxRetriesExceeded: false });
    }
  });
}

for (const id of Object.keys(clickFlows)) if (!targets.some((t) => t.id === id)) add(id.startsWith('screen-') ? 'screen' : id.split('-')[0] === 'tab' ? 'config-tab' : 'flow', id, FLOW_PATHS[id]);

const chosen = targets.filter((t) => (!ONLY || ONLY.includes(t.kind)) && (!MATCH || t.id.includes(MATCH)) && (!ONLY_IDS || ONLY_IDS.includes(t.id)));
mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
await page.goto(BASE + '/');
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' }));
  localStorage.setItem('pathscribe_scan_station_prompted', '1');
});

let n = 0;
for (const t of chosen) {
  n += 1;
  const entry = { id: t.id, kind: t.kind, path: t.path, group: t.group ?? '', status: 'ok', heading: '', file: `${t.id}.png` };
  try {
    await page.setViewportSize(VIEWPORT);
    await page.goto(BASE + t.path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1, h2, h3', { timeout: 60_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(1600);
    entry.heading = (await page.locator('main h2, main h1, h2, h1').first().textContent().catch(() => '')) ?? '';
    const body = (await page.locator('body').innerText().catch(() => '')) ?? '';
    if (/access denied|not authorized|no permission/i.test(body.slice(0, 600))) entry.status = 'denied';
    const flow = clickFlows[t.id];
    const mode = flow ? await flow(page) : 'full';
    if (flow && mode !== 'full') {
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, entry.file) });
    } else {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.screenshot({ path: join(OUT, entry.file), fullPage: height <= MAX_HEIGHT, clip: height <= MAX_HEIGHT ? undefined : { x: 0, y: 0, width: 1440, height: MAX_HEIGHT } });
    }
  } catch (e) {
    entry.status = 'error';
    entry.error = String(e.message ?? e).split('\n')[0];
  }
  manifest[t.id] = entry;
  console.log(`${n}/${chosen.length} ${entry.status.padEnd(6)} ${t.id}`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
}
await browser.close();
