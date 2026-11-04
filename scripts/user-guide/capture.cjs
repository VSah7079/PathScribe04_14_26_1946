#!/usr/bin/env node
/* Batch 668: scripted screenshots for the User Guide. Each id in docs/user-guide/MISSING_CAPTURES.md has a flow below that
   opens the screen (or window) in Chromium on the demo data and saves docs/user-guide/img/<id>.png at 1600 px wide.
   Run with the app serving on A11Y_PORT (default 5179) and PLAYWRIGHT_CHROMIUM naming a browser if needed:
     node scripts/user-guide/capture.cjs [--only=id1,id2] [--force]
   Demo data only: no real patient data appears. A flow that cannot reach its state reports FAILED and saves nothing. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs/user-guide/img');
const PORT = process.env.A11Y_PORT || 5179;
const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
const ONLY = arg('only') ? arg('only').split(',') : null;
const FORCE = process.argv.includes('--force');
const CASE = 'S26-4408';
const W = 1600, H = 1000;

const go = async (p, route, ms = 5000) => {
  await p.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(ms);
  // the first visit to a screen compiles it on the dev server: wait until the "still loading" spinner is gone
  await p.waitForFunction(() => !/still loading this page|loading this page/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  await p.locator('.ps-scan-prompt-skip').click({ timeout: 400 }).catch(() => {});
  await p.waitForTimeout(800);
};
const click = async (p, re, opts = {}) => { const l = p.getByRole(opts.role || 'button', { name: re }).first(); await l.waitFor({ timeout: 15000 }); await l.click(); await p.waitForTimeout(opts.wait ?? 1500); };
const text = async (p, re, ms = 15000) => p.getByText(re).first().waitFor({ timeout: ms });
const report = async p => { await go(p, `/case/${CASE}/synoptic`, 12000); };
// an Orchestration case: the demo case is Assist, so set its reporting mode in the demo data, then reload
const orchestration = async p => {
  await report(p);
  await p.evaluate(() => { const k = 'pathscribe_mock_cases'; const d = JSON.parse(localStorage.getItem(k) || '[]'); const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.accessionNumber === 'S26-4408' || o.id === 'S26-4408') o.reportingMode = 'orchestrator'; Object.values(o).forEach(walk); } }; walk(d); localStorage.setItem(k, JSON.stringify(d)); });
  await go(p, `/case/${CASE}/synoptic`, 12000);
};
const topBar = { clip: { x: 0, y: 0, width: W, height: 82 } };

const flows = {
  'batch-management-new-container': async p => { await go(p, '/batch-management'); await click(p, /New Container/); },
  'batch-management-batch-detail': async p => { await go(p, '/batch-management'); await click(p, /processing/i); const row = p.locator('tbody tr, [class*=batch-card], [class*=batch-row]').first(); await row.click(); await p.waitForTimeout(2500); },
  'case-flags-manager-overview': async p => { await report(p); await click(p, /Flags/); },
  'case-search-bar-results': async p => { await go(p, '/worklist'); const i = p.getByPlaceholder(/Scan or enter ID/); await i.click(); await i.fill('S26'); await p.waitForTimeout(2500); },
  'clinical-links-window': async p => { await go(p, '/worklist'); await p.keyboard.press('Alt+q'); await p.waitForTimeout(1500); },
  'critical-alert-overview': async p => { await go(p, '/critical-alert/cat_demo4621margin'); await text(p, /Acknowledge/i); },
  'cytology-qc-queue-overview': async p => { await go(p, '/cytology-worklist'); await click(p, /QC \/ Rescreen/); },
  'demonstration-tools-mock-emr': async p => { await go(p, '/mock-emr', 6000); },
  'demonstration-tools-mock-interface-engine': async p => { await go(p, '/dev/mock-interface-engine', 6000); },
  'help-overview': async p => { await go(p, '/help/worklist', 4000); },
  'lockbox-drop-off-overnight-folder': async p => { await go(p, '/lockbox-drop-off'); await click(p, /Overnight folder/, { role: 'tab' }).catch(async () => click(p, /Overnight folder/)); },
  'messaging-inbox': async p => { await go(p, '/worklist'); await click(p, /^Messages/); },
  'molecular-rack-overview': async p => { await go(p, '/molecular-rack/rack-001', 6000); },
  'notifications-top-bar': async p => { await go(p, '/worklist'); },
  'personal-settings-top-bar': async p => { await go(p, '/worklist'); },
  'quality-access-requests-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /ACCESS REQUESTS/i); },
  'quality-ai-discordance-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /^Operations$/); await click(p, /AI DISCORDANCE/i); },
  'quality-cytology-qa-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /Cytology QA/); },
  'quality-dashboards-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /QA Dashboard/); },
  'quality-fppe-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /CREDENTIALING REVIEW/i); },
  'quality-patient-matching-review': async p => { await go(p, '/quality-assurance', 7000); await click(p, /PATIENT MATCH REVIEW/i); },
  'quality-turnaround-overview': async p => { await go(p, '/quality-assurance', 7000); await click(p, /COUNTERSIGN TURNAROUND/i); },
  'report-fullreport': async p => { await go(p, `/report/${CASE}`, 7000); },
  'report-case-team-action-bar': async p => { await orchestration(p); },
  'report-case-team-window': async p => { await orchestration(p); await click(p, /Team/); },
  'report-sign-out-and-release-action-bar': async p => { await orchestration(p); },
  'report-sign-out-and-release-sign-out-window': async p => { await orchestration(p); await click(p, /Sign Out Case/); },
  'report-synoptic-reporting-panel': async p => { await report(p); await click(p, /Synoptic Reporting/); },
  'report-microscopic-and-material-overview': async p => { await report(p); await click(p, /Material/); await click(p, /Add Microscopic Description/).catch(() => {}); },
  'report-billing-review-overview': async p => { await orchestration(p); await click(p, /\bBilling\b/); },
  'voice-and-keyboard-overview': async p => { await go(p, '/worklist'); await p.keyboard.press('Alt+j'); await p.waitForTimeout(1200); },
  'molecular-batch-overview': async p => { await go(p, '/molecular'); await click(p, /New Batch/); await p.waitForURL(/molecular-batch/, { timeout: 15000 }); await p.waitForTimeout(3000); },
  'accession-specimens': async p => { await go(p, '/accession'); await click(p, /Specimens/, { role: 'tab' }).catch(() => click(p, /Specimens/)); },
  'grossing-overview': async p => { await go(p, `/case/${CASE}/grossing`, 9000); },
  'worklist-overview': async p => { await go(p, '/worklist', 12000); },
  'grossing-queue': async p => { await go(p, '/workstations/grossing', 6000); },
  'pathology-workspace-overview': async p => { await go(p, '/pathology-workspace', 5000); },
  'accession-after-submit': async p => {
    await go(p, '/accession');
    await p.getByPlaceholder(/John Michael/).fill('Jane'); await p.getByPlaceholder(/e\.g\. "Smith"/).fill('Demoson');
    await p.locator('input[type=date]').first().fill('1970-04-12');
    const sels = p.locator('select');
    await sels.filter({ has: p.locator('option', { hasText: 'Indeterminate' }) }).first().selectOption({ label: 'Female' });
    await sels.filter({ has: p.locator('option', { hasText: 'Metro General Hospital' }) }).first().selectOption({ index: 1 });
    await p.getByPlaceholder(/Reason for the specimen/).fill('Lung mass, right upper lobe');
    await p.getByPlaceholder(/Search staff, or type a name/).fill('a'); await p.waitForTimeout(800); await p.locator('.ps-amendment-physician-option').first().click(); await p.waitForTimeout(400);
    await p.getByRole('button', { name: /^Specimens/ }).first().click(); await p.waitForTimeout(1200);
    await p.getByText(/Select from Specimen Dictionary/).first().click(); await p.waitForTimeout(800);
    await p.getByText(/Lung, Total\/Lobe/).first().click(); await p.waitForTimeout(1500);
    await p.locator('select').filter({ has: p.locator('option', { hasText: 'Prefilled Formalin Vial' }) }).first().selectOption({ label: 'Prefilled Formalin Vial' });
    await click(p, /Submit Accession/, { wait: 4000 });
  },
  'session-and-connection-expiring': 'clock',
};
const clips = { 'accession-after-submit': { clip: { x: 220, y: 190, width: 1160, height: 200 } }, 'notifications-top-bar': topBar, 'personal-settings-top-bar': topBar, 'report-case-team-action-bar': { clip: { x: 0, y: H - 110, width: W, height: 110 } }, 'report-sign-out-and-release-action-bar': { clip: { x: 0, y: H - 110, width: W, height: 110 } } };

(async () => {
  const exe = process.env.PLAYWRIGHT_CHROMIUM || undefined;
  const launch = () => chromium.launch({ executablePath: exe, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
  let browser = await launch();
  const missing = fs.readFileSync(path.join(ROOT, 'docs/user-guide/MISSING_CAPTURES.md'), 'utf8');
  if (process.argv.includes('--overviews')) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/help/user-guide/manifest.json'), 'utf8'));
    const done = [];
    for (const a of manifest.articles) {
      const body = ['.md', '/index.md'].map(x => path.join(ROOT, 'docs/user-guide/src', a.slug + x)).filter(fs.existsSync).map(f => fs.readFileSync(f, 'utf8')).join('\n');
      const id = (body.match(/capture:([a-z0-9-]+-overview)\b/) || [])[1];
      const route = (a.routes || []).find(r => !/:/.test(r));
      if (!id || !route || (ONLY && !ONLY.includes(id)) || flows[id]) continue;
      let ctx;
      try {
        ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.addInitScript(() => { try { if (!localStorage.getItem('pathscribe-user')) { localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' })); localStorage.setItem('pathscribe_scan_station_prompted', '1'); } } catch (e) {} });
        const p = await ctx.newPage(); await go(p, route, 4000);
        await p.screenshot({ path: path.join(OUT, id + '.png') }); done.push('ok ' + id); await ctx.close();
      } catch (e) { done.push('FAILED ' + id + ' ' + String(e.message).split('\n')[0].slice(0, 80)); try { await ctx.close(); } catch (e2) {} try { await browser.close(); } catch (e3) {} browser = await launch(); }
    }
    await browser.close(); console.log(done.join('\n')); return;
  }
  const ids = [...missing.matchAll(/\| `([^`]+)` \|/g)].map(m => m[1]).filter(id => !ONLY || ONLY.includes(id));
  if (ONLY) for (const id of ONLY) if (!ids.includes(id)) ids.push(id);
  const results = [];
  for (const id of ids) {
    const f = path.join(OUT, id + '.png');
    if (fs.existsSync(f) && !FORCE) continue;
    const flow = flows[id];
    if (!flow) { results.push([id, 'NO FLOW']); continue; }
    let ctx;
    try {
      ctx = await browser.newContext({ viewport: { width: W, height: H } });
      await ctx.addInitScript(() => { try { if (!localStorage.getItem('pathscribe-user')) { localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' })); localStorage.setItem('pathscribe_scan_station_prompted', '1'); } } catch (e) {} });
      const p = await ctx.newPage();
      if (flow === 'clock') {
        await p.clock.install();
        await p.goto(`http://localhost:${PORT}/worklist`, { waitUntil: 'domcontentloaded' });
        await p.clock.runFor(4000);
        let shown = false;
        for (let m = 0; m < 70 && !shown; m++) { await p.clock.fastForward('01:00'); await p.waitForTimeout(150); shown = await p.getByText(/Session Expiring/i).count() > 0; }
        if (!shown) throw new Error('warning never appeared');
      } else await flow(p);
      fs.mkdirSync(OUT, { recursive: true });
      await p.screenshot({ path: f, ...(clips[id] || {}) });
      results.push([id, 'ok']);
      await ctx.close();
    } catch (e) {
      results.push([id, 'FAILED: ' + String(e.message).split('\n')[0].slice(0, 120)]);
      try { await ctx.close(); } catch (e2) {}
      try { await browser.close(); } catch (e3) {}
      browser = await launch();
    }
  }
  await browser.close();
  for (const r of results) console.log(r[1].padEnd(9), r[0]);
})();
