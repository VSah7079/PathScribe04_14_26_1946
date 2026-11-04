# Running the review tests with Playwright: a beginner's guide

*Written for Pete, Oct 15, 2026 (Batch 581). Windows and PowerShell; no programming needed.*

## What these tests are

Playwright is a tool that drives a real web browser: it opens PathScribe, clicks, types and checks what the screen shows, exactly as you would by hand, but in seconds and the same way every time.

The **review tests** in `e2e/review/` each follow one Jira ticket's review steps. When a ticket's test passes, the steps a computer can check are done. The few steps that still need a person (a screen reader speaking, a real printer, the look of something) are named at the top of each test file and in the "Needs a person for" column of the In Review CSV.

| Ticket | Test file |
|---|---|
| PS-86 Outbound dispatches | `e2e/review/ps-86.outbound-dispatches.spec.ts` |
| PS-100 Warning toasts stay | `e2e/review/ps-100.toast-persistence.spec.ts` |
| PS-101 Case search | `e2e/review/ps-101.case-search.spec.ts` |
| PS-102 Scan station facility | `e2e/review/ps-102.scan-station-facility.spec.ts` |
| PS-128 Configuration unsaved changes | `e2e/review/ps-128.config-unsaved-changes.spec.ts` |
| PS-328 Cytology nomenclature | `e2e/review/ps-328.cytology-categories-nomenclature.spec.ts` |
| PS-337 Facility printing | `e2e/review/ps-337.facility-printing.spec.ts` |
| PS-363 to PS-368 Staff passwords | `e2e/review/ps-363-368.staff-password.spec.ts` |
| PS-479 Organ map discard | `e2e/review/ps-479.organ-map-discard.spec.ts` |
| PS-55 QZ Tray label printing | `e2e/review/ps-55.qz-tray-label-printing.spec.ts` |
| PS-58 Model store tenant scoping | `e2e/review/ps-58.model-store-tenant-scoping.spec.ts` |
| PS-66 Action registry | `e2e/review/ps-66.action-key-collisions.spec.ts` |
| PS-78 Messages drawer styling | `e2e/review/ps-78.messages-drawer-css.spec.ts` |
| PS-87 Assist inbound data | `e2e/review/ps-87.assist-lis-ingestion.spec.ts` |
| PS-124 FPPE assignments | `e2e/review/ps-124.fppe-assignments.spec.ts` |
| PS-125 QA field-schema editor | `e2e/review/ps-125.qa-field-schema-editor.spec.ts` |
| PS-147 Discordance patterns | `e2e/review/ps-147.discordance-patterns.spec.ts` |
| PS-245 Label Designer | `e2e/review/ps-245.label-designer.spec.ts` |
| PS-262 OR board sync | `e2e/review/ps-262.or-board-live-sync.spec.ts` |
| PS-278 Print destination routing | `e2e/review/ps-278.print-destination-routing.spec.ts` |
| PS-279 Print queue dashboard | `e2e/review/ps-279.print-queue-dashboard.spec.ts` |
| PS-323 Finding highlight | `e2e/review/ps-323.finding-highlight.spec.ts` |
| PS-344 Editor and navigation after upgrades | `e2e/review/ps-344.dependency-upgrades.spec.ts` |
| PS-472 Error boundaries | `e2e/review/ps-472.error-boundaries.spec.ts` |
| PS-473 HTML sanitising | `e2e/review/ps-473.html-sanitising.spec.ts` |
| PS-476 PubMed ticker, no key | `e2e/review/ps-476.pubmed-keyless.spec.ts` |
| PS-477 Deployment baseline and Full Reset | `e2e/review/ps-477.deployment-baseline-reset.spec.ts` |
| PS-478 Strict type-check fixes | `e2e/review/ps-478.strict-type-fixes.spec.ts` |
| PS-494 Free-text node counts | `e2e/review/ps-494.free-text-node-counts.spec.ts` |
| PS-60 Sign-in page and SSO | `e2e/review/ps-60.sso-login.spec.ts` |
| PS-269 No English screen text | `e2e/review/ps-269.i18n-sweep.spec.ts` |
| PS-292 Release as Preliminary, delivery rules | `e2e/review/ps-292.preliminary-release.spec.ts` |
| PS-474 Security headers | `e2e/review/ps-474.security-headers.spec.ts` |
| PS-475 Load size, one language at a time | `e2e/review/ps-475.load-size-languages.spec.ts` |
| PS-63 Template workflow and review settings | `e2e/review/ps-63.template-workflow.spec.ts` |
| PS-277 Report branding settings | `e2e/review/ps-277.master-template-branding.spec.ts` |
| PS-283 Restricted-printing flag | `e2e/review/ps-283.restricted-printing-flag.spec.ts` |
| PS-342 Medical spell check | `e2e/review/ps-342.medical-spell-check.spec.ts` |
| PS-73 Duplicate a facility | `e2e/review/ps-73.facility-duplicate.spec.ts` |
| PS-89 Code import | `e2e/review/ps-89.code-import.spec.ts` |
| PS-146 Revision reasons and CAPA | `e2e/review/ps-146.revision-reasons-capa.spec.ts` |
| PS-327 Signing-authority overrides | `e2e/review/ps-327.signing-authority-overrides.spec.ts` |
| PS-341 Country signing rules | `e2e/review/ps-341.country-signing-rules.spec.ts` |
| PS-470 Lint clean-up | `e2e/review/ps-470.lint-cleanup.spec.ts` |

## One-time setup (about 10 minutes)

1. **Apply the delta zip** to your PathScribe folder as usual.
2. **Open PowerShell in the PathScribe folder.** In File Explorer, open the folder, click the address bar, type `powershell` and press Enter.
3. **Install the project's packages** (only needed when package.json changes, but harmless to repeat):
   ```
   npm install
   ```
4. **Install the browsers Playwright drives** (Chrome's engine and Firefox; about 300 MB, once):
   ```
   npx playwright install chromium firefox
   ```

## Run the review tests

### Watch them run (recommended the first time)

```
npm run test:e2e:ui
```

A Playwright window opens:
1. On the left, open `review` and pick a test file (for example `ps-102...`).
2. Press the ▶ button next to it.
3. The middle shows each step as it runs, with the step names taken from the ticket ("1. Sign in as Pete Nimmo and open Configuration → System → ...").
4. The right shows the screen at each moment. Click any step in the list to see the screen at that point.
5. A green tick means the step passed; a red cross shows what was expected and what the screen showed instead.

Close the window when you're done.

### Run them all and get a report

```
npm run test:review
```

It starts PathScribe by itself, runs every review test (about 10 minutes), and prints a line per test: `✓` passed, `✘` failed, `-` skipped. Then open the report:

```
npx playwright show-report
```

Your browser shows every test, its steps, and for any failure a screenshot and a step-by-step trace.

### Run one ticket's test, with the browser visible

```
npx playwright test e2e/review/ps-102.scan-station-facility.spec.ts --project=chromium --headed
```

`--headed` shows the browser window while it runs. Change the file name for another ticket.

### In Firefox

```
npm run test:e2e:firefox -- e2e/review
```

Same tests, in Firefox. (The `--` passes `e2e/review` on to Playwright.)

## The two tests that need the demo password

Two staff-password tests (PS-366 and PS-368) and PS-60's deep-link step have steps that type the built-in demo password. It isn't stored in the code, on purpose, so those show as skipped (`-`) unless you give it for that PowerShell window only:

```
$env:PS_DEMO_PASSWORD = "the demo password"
npm run test:review
```

It lasts until you close that PowerShell window; it's never written to a file. Don't paste it into chat or Jira.

## A test marked "known bug"

Some tests fail because the app really is wrong, not because the test is. Those are marked, so the run stays green: in the report they show as **expected to fail** (or skipped, for one that fails only some runs), with the bug written in the reason. They are listed in `src/i18n/README.md` (Batch 584) and on each ticket. Treat such a ticket as **not reviewed** for that step until the bug is fixed. When it is, the test starts passing and the run reports "expected to fail, but passed": that is the cue to delete the marker line.

## Recording the review in Jira

For each ticket whose test passes:
1. In the In Review CSV, put **Pass** in "Review Pass/Fail" and, if you like, "Playwright, Chromium (and Firefox)" in "Comment".
2. Do the steps in "Needs a person for", if any.
3. Move the ticket to Done when you're satisfied (that's always your call).

If a test fails, the report's screenshot and message say what went wrong. Send me the test name and the message (or the report's screenshot) and I'll look at it.

## If something goes wrong

- **"Port 5179 is already in use"**: Playwright starts PathScribe on port 5179. If you already have `npm run dev` running on that port, Playwright uses it; if something else is on it, close that, or run with another port: `$env:A11Y_PORT = "5199"` first.
- **"Executable doesn't exist"**: run step 4 of the setup again (`npx playwright install chromium firefox`).
- **To stop a run**: press Ctrl+C in PowerShell.
- **The tests change demo data** (they add passwords, settings and a test order) but clean up after themselves, and each test starts from fresh demo data. Your own demo data in your normal browser isn't touched: Playwright uses its own browser profile.

## Other test commands

| Command | What it runs |
|---|---|
| `npm run test:review` | The review tests (`e2e/review/`), in Chromium |
| `npm run test:a11y` | The accessibility checks (every screen and Configuration section) |
| `npm run test:e2e` | Everything in `e2e/`, in Chromium |
| `npm run test:e2e:firefox` | Everything in `e2e/`, in Firefox |
| `npm run test:e2e:ui` | The watch-it-run window |
| `npm test` | The unit tests (vitest; no browser) |
