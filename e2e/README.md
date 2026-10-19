# e2e — browser tests

Batch 524 (PS-491). `a11y.spec.ts` opens PathScribe in a real Chromium with the demo data and runs **axe-core** (WCAG 2.0 / 2.1 A and AA rules) on:

- Worklist, Accession, Search (empty and with results);
- the case report page (demo case S26-4408), then again with the organ map open;
- every Configuration section: each top tab, sub-tab and section-list entry (one test per top tab; Demo Reset skipped).

A screen passes with **no serious or critical violation**. Moderate and minor findings are recorded in the test annotations, not failed.

```
npm run test:a11y
```

The config is `playwright.config.ts` at the root. It starts the app with vite on port 5179 (`A11Y_PORT` to change it) and reuses a server already running there. Chromium: Playwright's own (`npx playwright install chromium` once), or the one named in `PLAYWRIGHT_CHROMIUM`. Results also go to `e2e-results/a11y.json`. The full run takes about 9 minutes, most of it the Configuration tabs.

These tests are not part of `npm test` (vitest excludes `e2e/**`). No CI pipeline is set up in this repository yet; when one is, it runs `npm run test:e2e` and, with Firefox installed, `npm run test:e2e:firefox`.

*Batch 581:* `npm run test:a11y` was documented here but missing from package.json; it is there now, and runs the four accessibility specs (`a11y.spec.ts`, `a11y.routes.spec.ts`, `a11y.states.spec.ts`, `a11y.connectivity.spec.ts`) in Chromium.

The spec does not wait for "network idle": the dev server keeps a socket open, so the page never goes idle and each test would wait out its whole timeout (the cause of the first run hanging).

## Batch 527

`signIn` marks the scan-station prompt as already answered, because it could cover the page after the signed-in app loads separately. The Configuration tests wait up to 30 s for the tabs and fail if there are none; before, a page that hadn't loaded made them skip.

## Batch 563 (PS-622)

- `a11y.connectivity.spec.ts` (new): the connection banner and waiting states in a real browser, and axe on My exports, Server jobs and Interfaces → Engines.

## Batch 564

- `a11y.routes.spec.ts` (new): every top-level screen, confirmed by its heading, checked with axe for serious or critical WCAG 2.1 AA violations.

## Batch 565

- `a11y.states.spec.ts` (new): the screens' other states (each filter tile selected and confirmed by `aria-pressed`, cytology tiles and pills, a selected case, a batch opened); contrast axe can't measure is reported.

## Batch 566

- `a11y.states.spec.ts`: a Batch 566 block. The Worklist's mode tiles (one on at a time), Batch Management's stage tiles, no nested-interactive violation on any cytology tab, and Enter on a cytology row's name opening the case. The Batch 565 helper now clicks a tile twice only when it was already on.

## Batch 567

- `a11y.states.spec.ts`: a "no control inside another" block. The inbox (no serious or critical violation; a row isn't a button; Enter on a sender opens the message) and the case report (axe nested-interactive).

## Batch 568

- `a11y.states.spec.ts`: Contribution (axe nested-interactive; the teaching tile's keyboard step runs when the signed-in user has teaching records, which the demo's superadmin doesn't, so its unit test covers it) and the Worklist's LIS / Outreach tiles keeping their on/off colours.

## Batch 569

- `a11y.states.spec.ts`: "focus after a delete": in the inbox, Tab to a message's Delete, press Enter, and focus is on the next message.

## Batch 570

- `a11y.states.spec.ts`: "saved-search chips": on Search, a chip isn't a button around its × (axe), and deleting from the keyboard moves focus to the next chip, then to "Save search".

## Batch 572

- `a11y.states.spec.ts`: "case updates and screening hours": another tab's save of the open case shows the notice (axe clean), and the Cytology worklist's panel confirms the day's hours.

## Batch 573

- `a11y.states.spec.ts`: "who else has the case open": a second window of the same case shows in each, is announced politely, passes axe, and goes when it closes.

## Batch 574

- `a11y.states.spec.ts`: "yesterday's screening hours": yesterday's unsigned hours above today's, signed off in one click, axe clean; the Batch 572 block also checks the workload counter.

## Batch 575

- `a11y.states.spec.ts` (Batch 572 block): another tab changes a specimen's description; Show their changes displays it without a reload.

## Batch 576

- `a11y.states.spec.ts` (Batch 573 block): changing a synoptic field in one window shows that person as editing in the other.

## Batch 577

- `a11y.states.spec.ts` ("case report follow-ups (Batch 577)"): a second window appearing in "who else has it open" doesn't move the tab content; the Edit Conflict dialog's "Use their version" shows their change with no reload and the discarded change is gone from the synoptic form; axe clean.

## Batch 579 and 580

- `a11y.states.spec.ts` ("template review and dropdowns (Batches 579 and 580)"): the reviewer guide, a dark labelled comment, Reset last in the row, axe clean; dropdowns styled and within 3 px of the browser's own width, the list opens, axe clean (skipped where the browser draws its own list).

## Batch 581 and 582: review tests (`review/`)

Each spec in `review/` follows one In Review Jira ticket's review steps against the demo, each step a `test.step` named after it, so a pass stands in for doing those steps by hand; the steps that still need a person are listed at the top of the file. Shared sign-in, sign-out and Staff-screen helpers are in `review/helpers.ts`.

*Batches 583 and 584:* twenty more specs (PS-55, 58, 66, 78, 87, 124, 125, 147, 245, 262, 278, 279, 323, 344, 472, 473, 476, 477, 478, 494). A spec that fails on a real app bug is marked `test.fail(true, '<the bug>')` (or `test.fixme` when it fails only some runs): the run stays green, and the day the bug is fixed that test "unexpectedly passes" and fails the run, which is the cue to delete the marker. The bugs are listed in `src/i18n/README.md` (Batch 584). Each spec has its own sign-in that starts from `/login`; the shared `signIn` can lose the page during the redirect.
*Batch 585:* five more specs for the "Mixed" tickets (PS-60, 269, 292, 474, 475), covering only the steps a computer can check; the rest is named in each spec's header. `ps-474` runs the header generator into a temporary folder; `ps-475` and `ps-269` switch language through the top bar and read the language files the page requests. PS-60 step 3 is skipped unless `PS_DEMO_PASSWORD` is set.
*Batch 587:* six specs for the "Can automate" tickets (PS-73, 89, 146, 327, 341, 470). `ps-89` writes a temporary CSV and sets the hidden file input; `ps-327` and `ps-470` run vitest or read config files instead of a screen.
*Batch 586:* the last four "Mixed" specs (PS-63, 277, 283, 342). `ps-342` types into the editor and reads the `.ps-spell` marks, as `ps-344` does; `ps-277` uses a Performing Lab facility (Fenwick General Hospital) because the branding fields show only for one.

| Command | Runs |
|---|---|
| `npm run test:review` | the review tests, Chromium |
| `npm run test:a11y` | the accessibility specs, Chromium |
| `npm run test:e2e` | everything, Chromium |
| `npm run test:e2e:firefox` | everything, Firefox (`npx playwright install firefox` once) |
| `npm run test:e2e:ui` | Playwright's watch-it-run window |
| `npx playwright show-report` | the HTML report of the last run |

The Firefox project exists only when asked for (`--project=firefox`, `PLAYWRIGHT_FIREFOX=1`, or `CI`), so a plain `npx playwright test` is the Chromium run. Two staff-password tests need the built-in demo password in `PS_DEMO_PASSWORD` and are skipped without it. A beginner's guide for Windows: `docs/quality/PLAYWRIGHT_REVIEW_GUIDE.md`.

## Batch 589

The review specs for PS-55, 66, 245, 262, 323, 344, 472, 477 and 478 no longer mark the fixed bugs as known failures. PS-147 keeps one expected failure (the ticket's "3 major of 20" needs more demo data than Pete chose).
