

## Batch 580

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Styled dropdown list with native widths, Chrome and Edge; Firefox keeps the dark list (PS-62) | PS-717 | PS-718 (Chrome, Edge and Firefox by hand, both editor themes; keyboard; NVDA and VoiceOver) |

Tested together with Batch 579 (one code state). `evidence/PathScribe-Batch580-browser.txt` (Playwright in Chromium, every accessibility spec with the styled list on: 78 passed, 5 skipped) and `evidence/PathScribe-Batch580-xray.json` (vitest: 9 mapped tests passed). Full vitest run: as Batch 579. The browser checks run in Chromium only; Firefox is in the manual plan (PS-687, PS-718). *(Jira gave this batch's Tests PS-717 and PS-718.)*

## Batch 579

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Template reviewer guide, dark labelled comments, Reset away from Approve (PS-63); specimen billing codes and the Sequencer's order saved at once (PS-539) | PS-715 | PS-716 (the reviewer screen by hand and with screen readers; billing codes and the Sequencer across a reload and with a second person) |

Tested together with Batch 580. `evidence/PathScribe-Batch579-browser.txt` (78 passed, 5 skipped) and `evidence/PathScribe-Batch579-xray.json` (vitest: 46 mapped tests passed). Full vitest run: 9,921 passed and 33 skipped, in 1,189 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-715 and PS-716.)*

## Batch 578

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Workload cap screen: an unsaved cap said beside its own field; add pickers without existing overrides; the settings service's clock (PS-539) | PS-711 | PS-712 (the screen by hand and with NVDA and VoiceOver) |

Tested together with Batch 577 (one code state). `evidence/PathScribe-Batch578-browser.txt` (Playwright in Chromium, every accessibility spec: 76 passed, 5 skipped) and `evidence/PathScribe-Batch578-xray.json` (vitest: 54 mapped tests passed). Full vitest run: 9,904 passed and 33 skipped, in 1,185 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-711 and PS-712.)*

## Batch 577

| Requirement | Automated Test | Open verification points |
|---|---|---|
| "Use their version" in place; lists, preview and synoptic answers read again after taking up a version; presence in the tab bar (PS-539) | PS-709 | PS-710 (two real people on the API server; a narrow window; screen readers) |

Tested together with Batch 578 (one code state). `evidence/PathScribe-Batch577-browser.txt` (Playwright in Chromium, every accessibility spec: 76 passed, 5 skipped) and `evidence/PathScribe-Batch577-xray.json` (vitest: 81 mapped tests passed). Full vitest run: as Batch 578. *(Jira gave this batch's Tests PS-709 and PS-710; PS-707 and PS-708 were skipped.)*

## Batch 576

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Workload caps limited to 1–100 whole slides in every cap service (and clamped on read); warning/danger theme tokens; the editing signal from a real field change (PS-539) | PS-705 | PS-706 (the cap limits on the Configuration screen by hand; "editing" showing at once to a second real person; the server's own cap check, phase 2e) |

Tested together with Batch 575 (one code state). `evidence/PathScribe-Batch576-browser.txt` (Playwright in Chromium, every accessibility spec: 74 passed, 5 skipped) and `evidence/PathScribe-Batch576-xray.json` (vitest: 91 mapped tests passed). Full vitest run: 9,891 passed and 33 skipped, in 1,184 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-705 and PS-706.)*

## Batch 575

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Show their changes in place: the other person's saved version taken up without losing your own unsaved work, with a note when both changed the same part (PS-539) | PS-703 | PS-704 (two real people on the API server; lists elsewhere on the page are not read again) |

Tested together with Batch 576 (one code state). `evidence/PathScribe-Batch575-browser.txt` (Playwright in Chromium, every accessibility spec: 74 passed, 5 skipped) and `evidence/PathScribe-Batch575-xray.json` (vitest: 73 mapped tests passed). Full vitest run: as Batch 576. *(Jira gave this batch's Tests PS-703 and PS-704.)*

## Batch 574

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Cytology workload counter; night-shift sign-off and the lab's start of day; correction reasons on CYT-QA-05; edits counted once (PS-539) | PS-697 | PS-698 (real shifts, the counter against the save-time check, and the server, phase 2e) |

`evidence/PathScribe-Batch574-browser.txt` (Playwright in Chromium, every accessibility spec: 74 passed, 5 skipped) and `evidence/PathScribe-Batch574-xray.json` (vitest: 200 mapped tests passed). Full vitest run: 9,877 passed and 33 skipped, in 1,183 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-697 and PS-698.)*

## Batch 573

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Who else has the case open (presence on `/hubs/live`, §15; the server's support reference, CASE_API §8; PS-539) | PS-692 | PS-693 (presence between users through the server hub, phase 2e) |

`evidence/PathScribe-Batch573-browser.txt` (Playwright in Chromium, every accessibility spec: 73 passed, 5 skipped) and `evidence/PathScribe-Batch573-xray.json` (vitest: 126 mapped tests passed). Full vitest run: 9,853 passed and 33 skipped, in 1,180 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-692 and PS-693.)*

## Batch 572

| Requirement | Automated Test | Open verification points |
|---|---|---|
| "Someone else saved this case" (`caseReport` live topic) and the end-of-day screening hours sign-off (readiness review F7, option C; PS-539) | PS-690 | PS-691 (the server hub's `caseReport` events; server-recorded screening time, phase 2e) |

`evidence/PathScribe-Batch572-browser.txt` (Playwright in Chromium, every accessibility spec: 70 passed, 5 skipped; the two new Batch 572 checks failed on expectations that predated two review fixes, were updated, and passed on re-run) and `evidence/PathScribe-Batch572-xray.json` (vitest: 199 mapped tests passed). Full vitest run: 9,823 passed and 33 skipped, in 1,175 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Demo and server builds succeed; the demo build's sign-in page loads with no console errors. *(Jira gave this batch's Tests PS-690 and PS-691.)*

## Batch 571

| Requirement | Automated Test | Open verification points |
|---|---|---|
| Live updates: one general `DataChanged` event on `/hubs/live` (Pete's decision, Oct 14, 2026; PS-539) | PS-688 | PS-689 (the server's hub, phase 2e) |

A decision recorded in the contracts; no behaviour changed. `evidence/PathScribe-Batch571-xray.json` (vitest: 96 mapped tests passed; added in Batch 574, it had been left out). Full vitest run: 9,794 passed and 33 skipped, in 1,169 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. No browser run: nothing a screen does changed. *(Jira gave this batch's Tests PS-688 and PS-689.)*

## Batch 570

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA 2.4.3: focus after deleting a saved search; one shared focus rule (PS-539) | PS-686 | PS-687 (the manual screen reader test plan, NVDA and VoiceOver, 38 scripts) |

`evidence/PathScribe-Batch570-browser.txt` (Playwright in Chromium, every accessibility spec: 70 passed, 5 skipped tab numbers past the last tab) and `evidence/PathScribe-Batch570-xray.json` (vitest: 56 mapped tests passed). Full vitest run: 9,794 passed and 33 skipped, in 1,169 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-686 and PS-687.)*

## Batch 569

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA 2.4.3 / 4.1.2: focus after a keyboard delete; no control inside another, hand-made controls included (PS-539) | PS-684 | PS-685 |

`evidence/PathScribe-Batch569-browser.txt` (Playwright in Chromium, every accessibility spec: 69 passed, 5 skipped tab numbers past the last tab) and `evidence/PathScribe-Batch569-xray.json` (vitest: 104 mapped tests passed). Full vitest run: 9,783 passed and 33 skipped, in 1,166 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-684 and PS-685.)*

## Batch 568

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA 4.1.2: no control inside another, app-wide; the Worklist's view tiles' colours from the stylesheet (PS-539) | PS-681 | PS-682 |

`evidence/PathScribe-Batch568-browser.txt` (Playwright in Chromium, every accessibility spec: 68 passed, 5 skipped tab numbers past the last tab) and `evidence/PathScribe-Batch568-xray.json` (vitest: 67 mapped tests passed). Full vitest run: 9,779 passed and 33 skipped, in 1,165 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-681 and PS-682.)*

## Batch 567

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA 4.1.2: no control inside another in the inbox, the worklist and the report editor's windows (PS-539) | PS-677 | PS-678 |

`evidence/PathScribe-Batch567-browser.txt` (Playwright in Chromium, every accessibility spec: 66 passed, 5 skipped tab numbers past the last tab) and `evidence/PathScribe-Batch567-xray.json` (vitest: 143 mapped tests passed). Full vitest run: 9,774 passed and 33 skipped, in 1,163 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-677 and PS-678.)*

## Batch 566

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA 4.1.2: rows that hold buttons (cytology worklist), view tiles that say which is on (PS-539) | PS-674 | PS-675 |

`evidence/PathScribe-Batch566-browser.txt` (Playwright in Chromium, every accessibility spec: 64 of 64 passed, 5 skipped tab numbers past the last tab; one check corrected and re-run, as the file says) and `evidence/PathScribe-Batch566-xray.json` (vitest: 142 mapped tests passed). Full vitest run: 9,765 passed and 33 skipped, in 1,161 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-674 and PS-675.)*

## Batch 565

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA: the rest of the stylesheet's faint text, the screens' other states, the charts (PS-539) | PS-669 | PS-670 |

`evidence/PathScribe-Batch565-browser.txt` (Playwright in Chromium, every accessibility spec: 61 passed, 5 skipped tab numbers past the last tab) and `evidence/PathScribe-Batch565-xray.json` (vitest: 145 mapped tests passed). Full vitest run: 9,756 passed and 33 skipped, in 1,159 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-669 and PS-670.)*

## Batch 564

| Requirement | Automated Test | Open verification points |
|---|---|---|
| WCAG 2.1 AA across every top-level screen (PS-539 phase 2d accessibility); the grossing address | PS-660 | PS-661 |

`evidence/PathScribe-Batch564-browser.txt` (Playwright in Chromium: 46 of 46 passed; 13 screens failed colour contrast before the fixes) and `evidence/PathScribe-Batch564-xray.json` (vitest: 21 mapped tests passed). Full vitest run: 9,756 passed and 33 skipped, in 1,159 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. *(Jira gave this batch's Tests PS-660 and PS-661; PS-654 to PS-659 were taken by other tickets.)*

## Batch 563

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d item 2 / PS-622: the connection banner and waiting states in a real browser | PS-652 | PS-653 |

`evidence/PathScribe-Batch563-xray.json` (vitest: 18 mapped tests passed) and `evidence/PathScribe-Batch563-browser.txt` (Playwright in Chromium: 8 of 8 passed). Full vitest run: 9,755 passed and 33 skipped, in 1,159 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 562

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: the Molecular Order Queue and the Print Queue's agent line on live updates; readiness review §9 items 3 and 8 | PS-650 | PS-651 |

`evidence/PathScribe-Batch562-xray.json`. 79 mapped tests passed. Full run: 9,753 passed and 33 skipped, in 1,158 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 561

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: items carried from Batches 559 and 560 (live screens' timed reads; tests; the server's rule for a held result) | PS-648 | PS-649 |

`evidence/PathScribe-Batch561-xray.json`. 40 mapped tests passed. Full run: 9,748 passed and 33 skipped, in 1,157 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 560

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: screens updated by the live-update hub instead of a timer (readiness review §5) | PS-646 | PS-647 |

`evidence/PathScribe-Batch560-xray.json`. 112 mapped tests passed. Full run: 9,736 passed, 2 failed and 33 skipped, in 1,153 test files. Apart from `firestore.rules.test.ts` (needs the Firebase emulator), the 2 failures were in `FacilityOpsDashboardPage.test.tsx`, whose translation stand-in had no language once the page formatted times in the user's language. The stand-in was fixed; that file, the documentation guards and the locale checks were re-run (72 passed), and their results are merged into the evidence.

## Batch 559

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: live-update data topics (readiness review §5); a result held when its workup version is unknown; the PDF hash on results | PS-644 | PS-645 |

`evidence/PathScribe-Batch559-xray.json`. 121 mapped tests passed. Full run: 9,724 passed and 33 skipped, in 1,151 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. `dataTopics.test.ts` and the documentation and locale guards were re-run after a late change (the engravers topic made unkeyed); their results are merged into the evidence.

## Batch 558

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: report versions and their PDFs read through the API server (`BLOB_STORAGE_API.md` §11) | PS-642 | PS-643 |

`evidence/PathScribe-Batch558-xray.json`. 121 mapped tests passed. Full run: 9,704 passed and 33 skipped, in 1,149 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 557

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: the API server's `/api/config` and the hosting regions shown to administrators (readiness review §9 items 1 and 7) | PS-640 | PS-641 |

`evidence/PathScribe-Batch557-xray.json`. 94 mapped tests passed. Full run: 9,682 passed and 33 skipped, in 1,147 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 556

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: released report documents read through the API server (`BLOB_STORAGE_API.md` §11) | PS-638 | PS-639 |

`evidence/PathScribe-Batch556-xray.json`. 141 mapped tests passed. Full run: 9,672 passed and 33 skipped, in 1,146 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 555

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: the browser's stand-ins for server jobs stop job by job (`VITE_SERVER_JOBS`; readiness review §7, §9 item 3) | PS-636 | PS-637 |

`evidence/PathScribe-Batch555-xray.json`. 113 mapped tests passed. Full run: 9,664 passed and 33 skipped, in 1,144 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. Two documentation guards failed in the first run, because `config.json` was quoted as if it were a file in the repository; the wording was fixed, and their re-run result is merged into the evidence.

## Batch 554

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: interface monitoring, Audit Log → Interfaces → Engines (readiness review §9 item 4) | PS-634 | PS-635 |

`evidence/PathScribe-Batch554-xray.json`. 132 mapped tests passed. Full run: 9,654 passed and 33 skipped, in 1,142 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 553

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: site agent printers in routing rules, the facility default and Redirect; Site agents carry-overs | PS-632 | PS-633 |

`evidence/PathScribe-Batch553-xray.json`. 202 mapped tests passed. Full run: 9,636 passed and 33 skipped, in 1,139 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 552

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: the site agent screens (readiness review §9 item 6) | PS-630 | PS-631 |

`evidence/PathScribe-Batch552-xray.json`. 134 mapped tests passed. Full run: 9,596 passed and 33 skipped, in 1,134 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 551

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: the Server jobs view (readiness review §9 item 10) | PS-628 | PS-629 |

`evidence/PathScribe-Batch551-xray.json`. Full run: 9,571 tests passed and 33 skipped, in 1,131 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 550

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: exports through the server (D7, browser side) | PS-626 | PS-627 |

`evidence/PathScribe-Batch550-xray.json`. 120 mapped tests passed.

Full run: 9,556 passed and 33 skipped, in 1,129 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator. `supportTicketRules.test.ts` also failed in that run, because the new route was missing from its list. It was fixed, and its re-run result is merged into the evidence.

## Batch 549

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d: open items carried over from Batches 537–548 | PS-624 | PS-625 |

`evidence/PathScribe-Batch549-xray.json`. 178 mapped tests passed. Full run: 9,517 passed and 33 skipped, in 1,124 test files. The only failing file is `firestore.rules.test.ts`, which needs the Firebase emulator.

## Batch 548

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d item 2 (connection banner, waiting states) | PS-621 | PS-622 |

`evidence/PathScribe-Batch548-xray.json`.

## Batch 547

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2d item 1 (runtime configuration) | PS-617 | PS-618 |

`evidence/PathScribe-Batch547-xray.json`.

## Batch 546

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2c (site agent contract, D3; findings F3 and F4) | PS-614 | PS-615 |

`evidence/PathScribe-Batch546-xray.json`.

## Batch 545

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2c (interface engine edge contract, D6; finding F10) | PS-612 | PS-613 |

`evidence/PathScribe-Batch545-xray.json`.

## Batch 544

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 (images and attachments links only; single-facility QA exports) | PS-609 | PS-610 |

`evidence/PathScribe-Batch544-xray.json`.

## Batch 543

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 (F8 CSV formula injection, F9 disposal export audit, file storage contract) | PS-604 | PS-605 |

`evidence/PathScribe-Batch543-xray.json`.

## Batch 542

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2c (message bus and asynchronous export contracts) | PS-602 | PS-603 |

`evidence/PathScribe-Batch542-xray.json`.

## Batch 541

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2b (hosting decisions D1–D7 recorded) | PS-600 | PS-601 |

`evidence/PathScribe-Batch541-xray.json`.

## Batch 540

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 (no correction or addendum during the release delay; no delay watermark on a released PDF) | PS-591 | PS-592 |

`evidence/PathScribe-Batch540-xray.json`.

## Batch 539

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 decision D2 (cytology PDFs from the report renderer; preview matches release) | PS-589 | PS-590 |

`evidence/PathScribe-Batch539-xray.json`. The renderer's own checks (`functions/test_main.py`, 148 pass) are recorded in PS-589's description; they are not part of the vitest run.

## Batch 538

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 decision D2 (stored report documents; preview matches what is sent) | PS-587 | PS-588 |

`evidence/PathScribe-Batch538-xray.json`.

## Batch 537

| Requirement | Automated Test | Open verification points |
|---|---|---|
| PS-539 phase 2a (deployment readiness review) | PS-585 | PS-586 |

`evidence/PathScribe-Batch537-xray.json`.
