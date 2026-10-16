

## Batch 580 — Styled dropdown list, native widths (PS-62)

- **Pete's decision (PS-62, Oct 15, 2026):** "Add the styled panel plus the width script ... Include Firefox." Where the browser can draw it (`appearance: base-select`: Chrome and Edge 135 and later), every single-choice dropdown's open list is a styled panel: rounded, the current choice marked, a highlight on the row under the pointer or keyboard, in the list's own colours (a light dropdown keeps a light list). One chevron arrow, in the dropdown's text colour, for every dropdown. Multi-selects and list boxes keep the native look (`pathscribe.css`, "Native <select> elements, app-wide").
- **Widths as before:** that kind of list sizes a dropdown to its selected value; `utils/selectAutoWidth.ts` (installed in `startApp.tsx`) measures each dropdown's widest option in its own font, as shown (capitals, letter spacing), and sets `--ps-select-auto-width`, used as its width unless the dropdown sets its own, exactly as a native dropdown's width works. Kept up to date as dropdowns appear, their options or classes change, or fonts finish loading. Checked in the browser: within 3 px of the browser's own width on every dropdown measured.
- **Firefox (Pete, Oct 15: Firefox stays a supported browser, "part of the big 3"):** Firefox can't draw the styled list yet (Mozilla's work isn't shipped or switched on in Nightly; Bugzilla 1944403). It keeps the dark list from Batch 323, and gets the panel with no change here once it ships. No hand-built popup (it would replace the browser's own list on about 400 dropdowns). Safari the same.
- **Independent check:** 3 high in 579/580 together (580: the editor's light-theme font list unreadable on hover; the width rule overriding dropdowns' own width and max-width), mediums (widths missing class and font changes), lows (arrowless dropdowns, the arrow's contrast on white, the browser check one-sided); all fixed.
- **Tests (Jira):** PS-717 (automated), PS-718 (verification gap).

## Batch 579 — Template reviewer screen (PS-63); billing codes and the Sequencer saved at once (PS-539)

- **Reviewer guide (PS-63, "the reviewer screen needs polish"):** a short "How to review this template" above the lifecycle bar: read as the pathologist would, trial answers go into no case, comment and resolve, the SNOMED coverage needed to publish, and who may approve as this site has set it (independent reviewers, or self-approval allowed; how many approvals). Open while the template is In Review; folding it is remembered.
- **Comments:** dark like the rest of the screen (they were white), each box labelled with its question, an Add button as well as Enter. Adding and resolving moved to `services/templates/templateReviewWork.ts` (`addTemplateQuestionComment`, `toggleTemplateQuestionComment`), which saves and audits them; the component used to build the audit entries itself (rule 2). "Resolve" has its own text (it borrowed another screen's; German and Korean were wrong for a comment).
- **Reset:** at the far end of the row, away from Approve, named "Reset to Draft" as its confirmation is, unavailable in Draft (nothing to reset). Its confirmation now says what it clears: the trial answers and any approvals (it said "all reviewer annotations"; comments are kept).
- **PS-63's open items (Pete asked, Oct 15):** lifecycle e-mails still have no recipients until the API server's directory exists (phase 2e); identity-provider group mapping waits for single sign-on; the Firestore role stub no longer applies (production is SQL Server, CLAUDE.md), so it is closed rather than built; reviewer-screen polish done here.
- **Billing codes saved at once (carried from 575):** a specimen's base codes (added, removed, corrected) and matrix codes (applied, rejected) were only held on screen: Save Draft doesn't write specimens, so a reload lost them (not only taking up someone else's version, as 575 said; corrected here). They now save the moment they're made, one at a time, all or nothing: unless the code saved, the screen goes back and no charge or credit is recorded; if someone else saved meanwhile, it says so.
- **Sequencer:** the specimen order is saved at once; the reports' order is part of the draft (Save Draft), and the message says which. The reorder moved to `services/reportEditing/reportSequence.ts`, which no longer drops a specimen or report the order leaves out.
- **Synoptic form:** after taking up someone else's version it stays on the section that was open (577 moved it back to the first).
- **Messages:** `templateRenderer.reviewGuide.*`, `lifecycleBar.resetButton`, `modal.reset.bodyPre`; `inlineCommentThread.{addButton,addCommentLabel,authorSeparator,resolveButton}`; `synopticReportPage.toast.{specimenSaveFailed,specimenSaveConflict,sequenceSavedReportsWithDraft,sequenceReportsWithDraft}` (five languages).
- **Independent check:** 579's findings: a charge recorded for a code that wasn't saved (high); two quick clicks meeting each other as "someone else", the Sequencer's message after a failure, the guide claiming independence where self-approval is allowed and promising comment sharing that is only planned, a reversed French sentence (medium); wording and Reset in Draft (low); all fixed.
- **Not done:** specimen-level billing changes on a signed-out case still ask for no reason (block-level ones do); found by the review, carried forward.
- **Tests (Jira):** PS-715 (automated), PS-716 (verification gap).

## Batch 578 — Follow-ups: the cap error beside its field, add pickers without existing overrides, the settings clock (PS-539)

- **Cap errors beside their field (carried from 576):** Configuration → Cytology → Workload cap says a cap that wasn't saved under the field it belongs to (enterprise, facility or staff), and only that field is marked invalid and points to the message (`aria-describedby`). Typing at another tier leaves the message; typing in that field or Cancel clears it (`services/cytology/cytologyWorkloadCapRules.ts` `cytologyWorkloadCapError`).
- **Add pickers (carried from 576):** "+ Add Override" offers only facilities and staff without an override (a second is refused by the service), and is unavailable when nobody is left, with "Every facility already has an override." / "Everyone already has an override." (`withoutCapOverride`). Each list is now set together with its overrides, so the picker never briefly offers someone who has one.
- **The settings clock (carried from 576):** `createMockCytologyWorkloadCapSettingsService(clock)`: the start-of-day history records a change at the service clock's moment, tested at a fixed time. The app's instance is unchanged.
- **Messages:** `cytologyWorkloadCapSettingsSection.allFacilitiesHaveOverride`, `allStaffHaveOverride` (five languages; the Korean wants native-speaker review with the rest).
- **Not done:** `organMapConfigChanged` (configuration screens hearing of another admin's organ-map change) stays proposed in `ORGAN_MAPPING_API.md`; it needs Pete's decision before it is built.
- **Tests (Jira):** PS-711 (automated), PS-712 (verification gap).

## Batch 577 — Follow-ups: "Use their version" in place, lists and form read again, presence in the tab bar (PS-539)

- **Use their version (carried from 575):** the Edit Conflict dialog's "Reload their version" becomes **Use their version**. The saved case is shown in place, exactly as opening it would show it (`services/cases/caseWrite.ts` `takeTheirVersion`), with no reload: the tab and place are kept, and the browser's draft copy and any held changes are dropped, so the discarded work isn't offered back. Every choice in the dialog is disabled while their version is read. The wording says unsaved work here is discarded, also on a finalized report.
- **Read again after taking up their version (carried from 575):** after Show their changes, Use their version or a merge review, the page reads again what it read once at case open: deficiencies, versions, signatures, the change log, the follow-up mark, the LIS amendment notice, the amendment banner, the report's resolved context (preview and PDF) and the **synoptic form's answers**.
- **Correction (rule 6), Batch 575:** Show their changes didn't show their synoptic answers in the form: the form keeps its own copy of the answers and only re-read it when the report or template changed, so the next edit would have written the old answers back over theirs. Found by this batch's independent review; the form now reads its answers again (`RightSynopticPanel` `reloadKey`).
- **What stays open:** a specimen, report or Orchestration section their save removed is replaced as opening the case would choose (`selectionAfterTakeUp`).
- **Presence (carried from 573):** "who else has the case open" moved from its own line above the tab content into the tab bar's row, pinned at the right with the tools, so it appearing no longer moves the page and never scrolls out of view.
- **Messages:** `synopticReportPage.concurrency.useTheirs`, `useTheirsDone`, `useTheirsFailed`; `hint` and `finalizedBlocked` reworded; `reload` removed (five languages).
- **Browser checks:** a second window appearing doesn't move the tab content; Use their version shows their change with no reload and the discarded change is gone from the form; axe clean.
- **Independent check:** 1 high (the synoptic form kept the discarded answers, also after 575's Show their changes), 5 medium (report preview context, what stays open, the finalized wording, the other buttons live during the read, the amendment banner not re-read), lows (chips scrolling under the tools, the browser check, late replies, docs, the cap screen's error clearing and a loading race, the test's shared storage); all fixed.
- **Known limits:** Save Draft still doesn't save two on-screen changes (removing a specimen's base code; the Sequencer's reorder), so taking up a version replaces them (from 575). Re-reading the form moves it back to its first section.
- **Tests (Jira):** PS-709 (automated), PS-710 (verification gap).

## Batch 576 — Follow-ups: caps checked, "editing" when it's the person's edit, theme colours, a test clock

- **Cytology workload cap: 1 to 100 whole slides** (CLIA 42 CFR 493.1274(d)(2)), checked in the enterprise, facility and personal settings services (`cytologyWorkloadCapRules.ts`); the Workload cap screen says so (`aria-invalid`, cleared as you type or cancel) instead of silently not saving. A value saved earlier over 100 is read as 100. Changing a person's own cap now needs `config:cytology-workload-cap:manage`, like the enterprise and facility caps (it had no check). Tests that used facility caps of 120–1000 now use legal ones; the facility-override comment that described "a higher facility-wide cap" is corrected (an override can only lower it).
- **"Editing" in who-else-has-the-case-open** now follows the person's own edits: every change the page marks unsaved except the two its set-up can mark (the synoptic form's prefill, a restored draft), plus typing or choosing in the synoptic form itself. This removes Batch 573's known limit (someone editing right after opening showed as viewing). The page's unsaved-changes warning uses the same signal (`caseEditingSignal.ts` `isPersonsDirtySection`, `isReportEditEvent`).
- **Theme colours:** new `--ps-warning`, `--ps-warning-text`, `--ps-danger`, `--ps-danger-text`; the notices, presence strip, screening-hours panel and workload counter from Batches 572–575 use the theme's variables (contrast checked: AA on every dark surface).
- **A test clock:** `createMockCytologyScreeningHoursService(clock)`, with a test across midnight in the lab's time zone.
- **Messages:** `cytologyWorkloadCapSettingsSection.errors.{capOutOfRange,failed}`, five languages.
- **Independent check:** 1 high (four existing tests used caps over 100), 4 medium (any control in the report counted as editing, including forms that save themselves, which could also raise the unsaved-changes warning; edits in dialogs and buttons were missed; a fragile browser check; docs), lows (cap error placement and clearing, stored values over 100, legal caps in the save tests, the staff cap service unchecked, the clock not reaching the settings history, ref order); fixed except: the settings' start-of-day history still uses the real clock, the cap error shows once at the top of the screen rather than beside each field, and the add pickers still list people and facilities that already have an override.
- **Carried forward:** the presence strip still moves the page down a line when it appears (needs a look at the layout); lists read once when a case opens aren't read again after Show their changes; the Edit Conflict dialog's own Reload.
- **Tests:** Xray PS-705 (automated) and PS-706 (verification gap: the cap screen, a role without the permission, "editing" between two windows, screen readers), both linked to PS-539.

## Batch 575 — "Show their changes" in place, without a reload (carried from 572)

- **"Someone else saved this case"** now offers **Show their changes** (and Later) instead of Reload. The newer case is taken up in place: their changes are shown, and what this page holds unsaved is kept on top: its report text (draft parts) **and** changes held back by an earlier conflict ("Keep working, decide later"), merged field by field like any save (`services/cases/caseWrite.ts` `takeUpNewerCase`). No reload, so nothing is lost with the API server (where the draft copy is memory-only).
- **Overlap:** if they changed the same thing this page holds unsaved, their other changes are shown, this page's stay as typed, nothing of theirs is written over, and the next save opens the Edit Conflict dialog to choose. A lasting note says so (not a toast) until "Got it".
- **Safe edges:** nothing happens if the page's own save got there first (`stale`); text typed while their case is being read is kept (read from refs); double clicks run once; in Orchestration the saved diagnostic is shown (someone's sign-out or recut fields) with only the section-backed text kept from the page (`orchestrationDiagnosticAfterTakeUp`), so it can't be written back over theirs later; a specimen their save removed stops being selected; the notice is dismissed through the version taken up.
- **Correction (rule 6):** the Edit Conflict dialog said unsaved work is "offered back after the reload". That is true in the demo only; with the API server it is lost. It now says unsaved work may be lost (five languages; `services/cases/README.md` corrected).
- **Messages:** `synopticReportPage.caseUpdated.{message,show,shown,overlap,failed,gotIt}` (reload removed), `synopticReportPage.concurrency.hint` corrected; French "cas" and Korean "증례" as in the conflict dialog.
- **Known limits (carried forward):** two on-screen changes that Save Draft doesn't save either (removing a specimen's base code; the Sequencer's reorder) are replaced by their version on take-up; lists read once when the case opens (deficiencies, version history, signatures, the LIS amendment notice) aren't read again; the Edit Conflict dialog's own "Reload their version" still reloads.
- **Browser check:** the Batch 572 block now has another tab change a specimen's description; Show their changes displays it in place with no reload, and the notice doesn't return for that version.
- **Independent check:** 1 high (changes held back by a conflict were left out, so the next save could write over theirs without a dialog), 6 medium (a race with the page's own save; text typed during the read; Orchestration diagnostic; toast promise; no lasting overlap note; tests), lows (selection, double click, dismiss version, wording, the conflict dialog's reload text); fixed except the known limits above.
- **Tests:** Xray PS-703 (automated) and PS-704 (verification gap: two people, unsaved work, overlaps, held changes, Orchestration), both linked to PS-539. Delivered with Batch 576 in one zip (the two were built and tested together).

## Batch 574 — Workload counter; night-shift sign-off; correction reasons; edits counted once (Pete, Oct 15)

- **Correction, cytology workload:** saving an edit of an existing review recorded the slide again in the workload ledger, so editing a review three times counted four slides against the limit (and an edit over the limit could be refused). An edit now adds only an escalation's extra weight (an imager pass becoming a manual rescreen adds 1); the time still counts (`resolveCytologyScuWeightAdded`). Found by this batch's independent review.
- **Workload counter (Pete: "show the number of reviews and remaining reviews"):** on the Cytology worklist and the screening page, for anyone with screening that counts: slides counted of the cap over the rolling 24 hours, reviews, slides left now (the limit grows with hours: cap × hours ÷ 8) and left in a full 8-hour day, a bar marked at the limit so far, and in words "Approaching your limit", "At your limit" (the next review wouldn't fit) or "Over your limit". Worked out exactly as the save-time check (exact hours, the review open now, the chosen mode's weight), rounded down to the half slide, so it never shows room the check would refuse. Read again after each save, every minute and when the window is shown. The worklist (no case open) uses the lab's jurisdiction and the strictest cap that could apply; with no jurisdiction it shows nothing (never assumed US). `services/cytology/cytologyWorkloadSummary.ts`.
- **Night shifts (Pete: "Yesterday + lab start-of-day"):** yesterday's hours can be signed off while they still need it (shown above today's; each panel shows its date; focus moves to today's heading after). A lab setting, **Screening day starts at** (Configuration → Cytology → Workload cap), places a 10 pm–6 am shift on one date; a change applies from then on (history kept, past days never re-dated), needs `config:cytology-workload-cap:manage`, and is audited. Sign-offs only for today or a yesterday that still needs it (`dateNotAllowed`); each stores the start hour in force.
- **Workload report (CYT-QA-05):** the correction's reason, and its note (tagged for redaction); dates in the user's format; recorded hours to two decimals, as the person signed. The note is limited to 200 characters and the screen asks for no patient details.
- **Contract:** `CYTOLOGY_QC_API.md` §5 (Batch 574 part): the start of day and its history, today/yesterday, `dateNotAllowed`, the note limit, the workload-summary endpoint, edits. Wording corrected in the capability text, `AUTHORIZATION_API.md` and comments: the signed-off hours are counted in the supervisor's report; the live limit uses the recorded time.
- **Messages:** new `cytologyWorklist.workload.*`, `cytologyWorklist.screeningHours.{titleYesterday,hintYesterday,hoursLabelYesterday,noteHint,errors.noteTooLong,errors.dateNotAllowed}`, `cytologyWorkloadCapSettingsSection.dayStart.*`, `cytologyQaTab.workloadTable.{correctionReason,correctionNote}`; changed: the panel hint and the capability description, five languages.
- **Also:** the Batch 571 Xray file (`docs/quality/evidence/PathScribe-Batch571-xray.json`) had been left out; added.
- **Independent check:** 4 high (the worklist counter assumed a US lab; its cap could differ from the case's; "left now" could show room the check would refuse; changing the start of day re-dated past days), 9 medium (time zone and user from the caller in the contract; yesterday could be re-signed after it was signed; the setting change unaudited and a failed save silent; the note untagged and unlimited; no dates on the panels; figures going stale; edits counted twice; status and bar inconsistent; docs), lows (rounding between panel and report, focus after yesterday, units and the duplicate "left" line, the report's date format); all fixed except: an injected clock in the demo service, and checking the cap's range (0–100) in the settings service.
- **Not done (carried forward):** taking a newer case up in place without a reload (Batch 572).
- **Tests:** Xray PS-697 (automated) and PS-698 (verification gap: real shifts, the counter against the save-time check, and the server), both linked to PS-539.

## Batch 573 — Who else has the case open (PS-539)

- **Presence (Pete, Oct 14: a live topic for an open case, including presence):** above the case report's tabs, each other person with the same case open, whether they are **editing** (unsaved changes) or **viewing**, and Email / Call links when the staff directory has their work details. The same person in another window shows as "You, in another window". Nothing to click or dismiss; it takes no space when nobody else is there. One polite message for screen readers when someone opens, starts editing or no longer has the case open; nothing for the first list or a dropped connection; the same words again are read again.
- **How:** the hub's `JoinCasePresence` / `SetCasePresenceEditing` / `LeaveCasePresence` and `CasePresenceChanged` (`LIVE_UPDATES_SIGNALR.md` §15, new), keyed by the case's support reference; only for a signed-in (SSO) session. In the demo, this browser's windows tell each other (BroadcastChannel, heartbeat, goodbye on close). The client re-joins after every reconnection, retries a failed join, takes back a join answered after leaving, and sends an editing change made while joining; the server lists each presence under its own id.
- **The support reference now comes from the API server** (`GET /api/cases/{caseId}/support-reference`, `CASE_API.md` §8; `supportReferences/caseSupportReference.ts`), so every user of a case has the same one. This also fixes Batch 572's notice, which with the API server used a reference made in each browser and so would never have matched another user's.
- **"Editing" means the person's own changes:** `services/cases/caseEditingSignal.ts`, the rule the page's unsaved-changes warning already used (moved out of the page), so opening a case never shows as editing. Known limit: a real edit made while the page's set-up mark is still standing shows as viewing until saved.
- **Organ map:** its empty presence slot is gone (presence is shown once, above the tabs).
- **Messages:** new `synopticReportPage.presence.*`, five languages.
- **Browser checks:** "who else has the case open": two windows of one case each show the other, announced politely, axe clean, gone when one closes. The full accessibility run: 73 passed, 5 skipped.
- **Independent check:** 3 high (a leave while the join was on its way left the presence on the server; set-up changes showed as editing; with the API server each browser made its own reference), 9 medium (an editing change lost while joining; join answer and events not ordered; another user could take a presence id; announcements on every reconnect and for people already there; the same words not read twice; a hidden demo tab coming and going; the throttle could drop the last value; no retry; docs), lows (the call link's name, contact details not checked, contract gaps, a decision in the component, wording, the demo's anonymous join, the browser check); all fixed except the strip's appearing above the tabs moving the content down a line, and its colours following the 572 banner's.
- **Tests:** Xray PS-692 (automated) and PS-693 (verification gap: presence between users through the server hub), both linked to PS-539.

## Batch 572 — "Someone else saved this case"; screening hours signed off at the end of the day (PS-539; readiness review F7, option C)

- **Correction, cytology workload limit:** the limit (assigned cap × hours ÷ 8) rose above the person's cap on days longer than 8 hours (10 h gave 125% of the cap). It now stops at the cap (`resolveCytologyWorkloadCapacity.ts`, `CLIA_WORKLOAD_FULL_PERIOD_HOURS`). Found by this batch's independent review.
- **"Someone else saved this case" (Pete, Oct 14: a live topic for an open case):** when another user saves the case you have open, a notice above the tabs says so, with Reload and Later (not a window). Your own saves show nothing; Later hides it until a newer save. With the API server it comes from the hub's new `caseReport` topic, keyed by the case's support reference (never the case number), events only; in the demo, another tab's save stands in (`subscribeCasesChangedElsewhere`). The version check on save stays as the safety net. Two of the page's own saves (the first-open stamp and confirming an abnormal finding) now move its known version on, so they neither show the notice nor get a later save refused. Reload is a full reload: with the API server, unsaved changes are lost (taking the newer case up in place is carried forward).
- **Screening hours (F7, option C):** the server will record screening time with its own clock; the browser's timer is not trusted. On the Cytology worklist, "Today's screening hours" shows once something is recorded: one click confirms; Correct takes the hours, a quick-pick reason (screened at the microscope; a slide left open; other, with a note) and an optional note. Corrections are compared to one decimal, as shown; a confirmation stores the recorded figure itself. A correction more than 0.5 h out, or one that turns an exceeded day into one within the limit, is flagged for the supervisor. A sign-off made before more screening was recorded stops counting until the person confirms again. Days are the lab's (facility time zone). Append-only and audited; capability `cytology:screening-hours:sign-off` (its own seed: Pathologist, Fellow, Resident, Cytotechnologist; not a hospital's own roles). The wording on screen says "the workload limit", not "CLIA", for labs outside the US.
- **Workload report (CYT-QA-05):** by the lab's day, with "Recorded hours", whether the day is signed off (or the sign-off is out of date), and the flag.
- **Contracts:** `LIVE_UPDATES_SIGNALR.md` §14 (`caseReport`: the server issues and resolves the reference, never reveals whether a case exists, and sends to the writer's connections too; the screen row), `ORGAN_MAPPING_API.md` §6, `CYTOLOGY_QC_API.md` §5 (new: server screening events, the sign-off API, the rules above), `DEPLOYMENT_READINESS_REVIEW.md` (F7 decided; the organ-map item decided), `AUTHORIZATION_API.md`.
- **Messages:** new `synopticReportPage.caseUpdated.*`, `cytologyWorklist.screeningHours.*`, `cytologyQaTab.workloadTable.{recordedHours,signedOff,notSignedOff,signOffStale,correctionFlagged}`, `capabilities.items.cytologyScreeningHoursSignOff`, in five languages. Korean uses 스크리닝 for screening in these strings (native-speaker review advised).
- **Browser checks:** "case updates and screening hours": another tab's save shows the notice (polite, takes no focus, axe clean; Later hides it); the panel is hidden at 0.0 h and one click signs the day off. The full accessibility run: 70 passed, 5 skipped, and the two new checks passed after their spec was updated to the review fixes.
- **Independent check:** 3 high (the notice sat inside the Full Report tab; the workload limit rose above the cap past 8 hours, and a correction could clear an exceedance unflagged; a sign-off made before more was recorded kept counting), 7 medium (two own saves not moving the known version; contract precision; the Reload claim; "CLIA" wording outside the US; the seed and the 0.0 h panel; rounding and the input step), lows (live region on the message only, translations, comments, tests); all fixed except "take up in place" (carried forward).
- **Still open:** presence ("also viewing", Batch 573); the server side (phase 2e); a night shift signing off the previous day; showing the correction's reason on the supervisor's report.
- **Tests:** Xray PS-690 (automated) and PS-691 (verification gap: the server hub's `caseReport` events and server-recorded screening time), both linked to PS-539.

## Batch 571 — Live updates: one general event, decided (PS-539)

- **Pete's decision (Oct 14, 2026):** the server tells open screens that something changed with one general event, `DataChanged` with topics, on one hub, `/hubs/live`. It replaces the registry exceptions badge's own `ReceiveExceptionCountUpdate` (which carried the count) and the separate `/hubs/quality-metrics` hub. A screen that needs live updates in future gets a topic, not an event of its own. The event says only what changed (a topic, and a facility or site id for Facility Ops and site agents), never the change itself; each screen re-reads through its normal, permission-checked call.
- **Recorded in:** `REGISTRY_ACKNOWLEDGEMENT_API.md` (the live badge), `LIVE_UPDATES_SIGNALR.md` §14, `DEPLOYMENT_READINESS_REVIEW.md` (sections 0.6 and 5), and the header of `services/liveUpdates/dataTopics.ts`.
- **No change to how PathScribe works:** the browser side was built this way in Batches 559 to 562. The server side is phase 2e.
- **Messages:** none new.
- **Tests:** Xray PS-688 (automated: the live-update, badge and readiness-review tests) and PS-689 (verification gap: the server's hub, when it exists, sends `DataChanged` as §14 says), both linked to PS-539.

## Batch 570 — Focus after deleting a saved search; one shared focus rule; the readiness review brought up to date (WCAG 2.1 AA, 2.4.3)

- **Saved searches (Search) and saved queries (Billing logs):** after a chip's × removes it, from the keyboard or a screen reader, focus goes to the next chip, or to "Save search / query" (its name box when open), not to the page.
- **One rule, shared:** `hooks/useFocusAfterRemoval.ts` (new), used by the inbox and the chips. It follows a screen reader's click in Firefox as well as the keyboard (`utils/a11y/focusAfterRemoval.ts` `isNonPointerClick`: `detail` 0, or `mozInputSource` 0 on a trusted click); every click replaces what is waiting, so a mouse delete never moves focus; focus is moved only from the page or the pressed button, never from where the user has moved on to; the target is the nearest item still in the list (two quick deletes).
- **Billing logs:** the save row's Cancel (✕) has a name.
- **Tests for Batch 568's changes:** the template canvas row (`TemplateCanvas.nodeRow.test.tsx`; `NodeCard` exported) and the screenshot's full-size view (`ScreenshotPreview.lightbox.test.tsx`; `ScreenshotPreview` exported), including focus going back to the picture.
- **Browser check:** "saved-search chips": no serious violation; Enter on × moves focus to the next chip, then to Save search. The full accessibility run: 70 passed, 5 skipped.
- **Deployment readiness review** (`docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`): a new section 0, the status after phases 2a to 2d: every browser-side item done; the six blockers all server work (phase 2e, not started); findings F2, F5, F7, F11 and F12 still open; accessibility readiness; the decisions still open for Pete. Provider facts weren't re-checked (as of Oct 12).
- **Manual screen reader test plan** for the QC team (NVDA on Windows, VoiceOver on Mac): 38 scripts with expected results and a Pass / Fail column per screen reader, tracing to every earlier verification-gap Test. It is a shared document (Xray PS-687 records its run).
- **Still open:** the specimen rail's review dot and the Billing chips have no browser check of their own (the source check covers their markup); the plan's results.
- **Messages:** none new.
- **Independent check:** 2 medium (a screen reader's click in Firefox gave `detail` 1, so focus wasn't moved for it; the chips' fallback did nothing when the save box was open), 6 low (focus could be pulled back after the user moved on; a mouse delete after a refused keyboard one; two quick deletes; thin tests; seeded chips in the browser check; Billing's Cancel had no name); all fixed.
- **Tests:** Xray PS-686 (automated: 70 browser checks and 56 of 56 mapped vitest tests passed) and PS-687 (verification gap: the manual screen reader test plan, run by the QC team), both linked to PS-539.

## Batch 569 — Focus after a keyboard delete; the source check sees hand-made controls and reads comments properly (WCAG 2.1 AA)

- **Inbox (WCAG 2.4.3):** when a message's own Delete, Restore or Delete-forever, pressed from the keyboard, removes it, focus goes to the next message's sender (the one before when it was last; the list when none is left), not to the page (`utils/a11y/focusAfterRemoval.ts`, new). A mouse click leaves focus alone; a delete that didn't happen (cancelled, refused) never moves focus later; focus is never pulled from where the user has moved on to.
- **Source check, "no control inside another":** now also covers a `<button>` and an element given a control's role by hand (`role="button"`, `"checkbox"`, `"switch"`, `"tab"` …). It found three more, fixed:
  - **Saved search / saved query chips (Search, Billing logs):** each was a button holding its × button. The chip is a mouse shortcut now; its name is the button that loads it (current when loaded), × is its own button named "Delete saved search / query …" (`billingLogs.deleteQueryAria`, new, five languages).
  - **Case report, collapsed specimen rail:** the "changes to review" dot was a button inside the specimen's button; it is a named button beside it, same place and size.
- **Source check, comments:** each file is now read by the TypeScript parser to set comments aside, so `//` in on-screen text is no longer taken for a comment. The old pattern had also blanked about 380 lines of `QualityAssurancePage.tsx` (a `/*` inside a `//` comment); those are now checked and pass. The other checks' findings are unchanged (compared over every file). Each file is parsed once for all the checks.
- **Browser checks:** "focus after a delete" (Tab to a message's Delete, Enter, focus on the next message). The full accessibility run: 69 passed, 5 skipped.
- **Still open (Batch 570):** focus after deleting a saved chip (it goes to the page, as before); automated tests for the chips, the rail dot, the template canvas and the screenshot view. Not seen by the source check: a role set by an expression, `<a role="button">`, components such as `<Button>`.
- **Messages:** one new, `billingLogs.deleteQueryAria`.
- **Independent check:** 3 medium (a waiting focus move could fire later, after a cancelled delete or a search; mouse deletes in Chrome also moved focus; the check ran about 30 times slower), 8 low (the rail dot's size, the Billing chip's summary for screen readers, focus after a chip delete, pressed vs current, what the check can't see, `CSS.escape`, tests, docs); fixed, except focus after a chip delete and the chip / rail tests (Batch 570).
- **Tests:** Xray PS-684 (automated: 69 browser checks and 104 of 104 mapped vitest tests passed) and PS-685 (verification gap: the inbox, the chips and the rail dot with a screen reader), both linked to PS-539.

## Batch 568 — No control inside another, app-wide; the Worklist's view tiles' colours (WCAG 2.1 AA, 4.1.2)

- **The last five places**, fixed as in Batch 567 (the row a mouse shortcut, a real button inside):
  - **Terminology alerts (Protocols):** the title is the button that shows or hides the list (`aria-expanded`); Re-check does only its own job. The counts and the field / option references now come from messages (`terminologyAlertBanner.countsBoth`, `fieldRef`, `fieldOptionRef`), so each language sets its own punctuation and quotation marks (they were written into the page).
  - **Protocol upload:** the drop zone's hidden file input sits beside it, not inside it.
  - **Enhancement request:** the screenshot's full-size view was a button holding its Close button. It is a dialog now: focus moves to Close and stays inside (`hooks/useFocusTrap.ts`), Escape or a click closes it, and focus goes back to the screenshot.
  - **Template builder:** a field's name is the button that selects it (as wide as its text, so the rest of the row still starts a drag); keyboard focus in a row shows Remove, now named with the field (`templateCanvas.removeNamed`); the show-contents button says whether it is open (`templateCanvas.childrenToggle`).
  - **Contribution:** the teaching tile opens from its title; Export does only its own job.
- **The source check is app-wide:** "no control inside another" (`nestedInteractive`) runs over every UI file, with no exception list. It covers elements made into controls with `pressable` / `switchable`; Batch 569 extends it to elements made clickable by hand.
- **Worklist:** the LIS and Outreach tiles' on/off colours come from modifier classes in `pathscribe.css` instead of values set in the page; they look exactly as before (checked in the browser).
- **Home:** the cards' keyboard handling comes from `pressable` alone (a second, hand-written copy is gone; same behaviour).
- **Browser checks:** Contribution (axe nested-interactive) and the Worklist tiles' colours. The full accessibility run: 68 passed, 5 skipped. The teaching tile's keyboard step doesn't run for the demo's superadmin (no teaching records); its unit test covers it.
- **Messages:** five new (`terminologyAlertBanner.countsBoth`, `fieldRef`, `fieldOptionRef`; `templateCanvas.childrenToggle`, `removeNamed`), in all five languages.
- **Independent check:** 2 medium (dragging a template field by its name, which Firefox may not start from a button: the name is now only as wide as its text and keeps the grab cursor, and dragging in Firefox is on PS-682; focus in the screenshot view: now trapped and returned), 8 low (the Contribution browser check never reaches the tile: unit test added; little coverage of the template canvas and screenshot view; Remove staying after a mouse click: keyboard focus only now; long names; Remove's name; the tooltip when open; the focus ring colour; what the source check covers: written down); fixed, except that the template canvas and the screenshot view have no automated test of their own.
- **Tests:** Xray PS-681 (automated: 68 browser checks and 67 of 67 mapped vitest tests passed) and PS-682 (verification gap: dragging in Firefox, screen readers on the alerts, the screenshot view and Contribution), both linked to PS-539.

## Batch 567 — No control inside another: the inbox, the worklist and the report editor (WCAG 2.1 AA, 4.1.2)

- **What was wrong:** a row or card made keyboard-usable as a whole (a button) that also held buttons, links or checkboxes of its own. A screen reader can't reach or announce a control inside a button (axe: nested-interactive). Fixed here with the Batch 566 pattern: the row stays a mouse shortcut (`clickableContainer`), and a real button inside does its main action.
  - **Inbox (`AppShell`):** the sender's name opens the message (editing: ticks it), described by the subject. Keyboard focus in a row shows its delete or restore buttons, as hover does; the delete icon has a name.
  - **Add code window:** the icon at the end of each AI suggestion and search result is now an "Apply code" button. Once applied, "✓ ×n" is the button that applies it again; its name keeps the visible text (`addCodeModal.applyAgainLabel`, new, in all five languages). Clicking a row still applies the code.
  - **Delegate window:** a delegation type's name is the button (pressed when chosen); the recipient's ✕ is named "Remove".
  - **Billing review:** a pending code's code is the button (current when selected); the dismiss button has a name.
  - **Sequencer preview:** a report's name is the button that opens it.
  - **Protocol change window:** each proposed change, and "Select all", was a button holding a checkbox; each is now the checkbox's label (click anywhere on it to tick). A change's checkbox is named by the specimen and proposed template, described by the reason.
  - **Worklist digital-pathology cells:** the badge is the one tab stop (it was the cell and the badge), and an empty cell no longer opens the drawer.
- **New look shared by these buttons:** `:where(.ps-row-open-btn)` in `pathscribe.css` clears the browser's button look at zero specificity, so each keeps its old size, weight and colour; a focus ring shows on keyboard focus.
- **New source check:** `nestedInteractive()` (`services/accessibility/a11yAudit.ts`) finds a pressable or switch holding another control. Table rows (`{ role: null }`) aren't counted, and an element it can't read is reported. The guard runs it over the files fixed here; Batch 568 fixes the last five places (Terminology alerts, protocol upload, the enhancement request picture, the template canvas, the Contribution teaching tile) and makes it app-wide.
- **Browser checks (`e2e/a11y.states.spec.ts`):** the inbox (axe; a row isn't a button; Enter on a sender opens the message) and the case report (axe nested-interactive). The full accessibility run: 66 passed, 5 skipped.
- **Not opened by the browser check:** the add code, delegate, billing and protocol-change windows. The source check and unit tests cover them; PS-678 lists what a person should try.
- **Messages:** one new, `addCodeModal.applyAgainLabel`.
- **Independent check:** 2 medium (a focused delete button could vanish when the pointer left the row; the "applied" buttons' names didn't match their text), 8 low (pressed vs current, empty worklist cells, block content and long names in the protocol labels, the reset's text properties and hover underline, gaps in the source check, partial coverage, weak tests, docs); fixed, except that focus isn't moved to the next row after a delete and the source check still can't see a `//` inside JSX text.
- **Tests:** Xray PS-677 (automated: 66 browser checks and 143 of 143 mapped vitest tests passed) and PS-678 (verification gap: keyboard and screen reader in the windows the browser check doesn't open), both linked to PS-539.

## Batch 566 — Rows that hold buttons; view tiles that say which is on (WCAG 2.1 AA, 4.1.2)

- **Cytology worklist rows:** a row on the QC, CSMS QA and other screening tabs holds buttons of its own (Manage flags, Ask a colleague, Claim), so it can't itself be a button (axe: nested-interactive; a screen reader can't reach or announce a button inside a button). The patient's name (or the MRN) is now the button that opens the case: Tab reaches it, Enter or Space opens it. Clicking anywhere else on the row still opens the case, as before. A pool row opens nothing, so its name stays plain text. The buttons inside a row do only their own job (now tested). Closes the item Batch 565 left open.
- **`clickableContainer(handler)`** (`utils/a11y/pressable.ts`): for such a row; a mouse shortcut only (no role, no tab stop). The app-wide accessibility guard now also checks that every element using it holds a real `<button>` (`container-without-button`, `services/accessibility/a11yAudit.ts`), so it can't be used to leave a row unreachable from the keyboard.
- **View tiles say which is on (`aria-pressed`):** the Worklist's LIS and Outreach tiles (the peer-review queue tiles already did) and Batch Management's stage tiles. The Disposal and Disposal report tiles no longer read their emoji aloud; the tiles that lacked `type="button"` have it.
- **Browser checks (`e2e/a11y.states.spec.ts`, Batch 566 block):** one mode tile on at a time on the Worklist; each stage tile on in turn, only one at a time; no nested-interactive violation on any cytology tab; Enter on a row's name opens the case. The full accessibility run: 64 of 64 passed, 5 skipped (Configuration tab numbers past the last tab).
- **Still open:** the same pattern (a clickable element holding buttons or fields) in about 17 other places found by a source scan (`AppShell`, `Home`, `WorklistTable` cells, `TemplateCanvas`, `AddCodeModal`, `DelegateModal`, `BillingReviewPanel`, `SequencerPanel`, the synoptic `Sidebar`, `ProtocolChangeModal`, `protocolShared`, `TerminologyAlertBanner`, `ContributionDashboardPage`, the enhancement request lightbox) and, lower priority, 6 more with no role; axe found none of them serious on the screens it opens. The Worklist mode tiles still pick their colours with on/off values in custom properties, which a modifier class would do better.
- **Messages:** none new.
- **Independent check:** 1 medium (the name button lost the title's size, weight and colour), 1 medium (the guard change didn't check anything: replaced with the new rule), 2 low (browser checks that could pass with nothing checked; the tile helper's second click), 3 low/info (Manage flags not tested, two tiles without `type="button"` and emoji names, the mode tiles' colours); all fixed but the last.
- **Tests:** Xray PS-674 (automated: 64 browser checks and 142 of 142 mapped vitest tests passed) and PS-675 (verification gap: a real screen reader on the cytology rows and the tiles), both linked to PS-539.

## Batch 565 — The rest of the faint text, the screens' other states, and the charts (WCAG 2.1 AA)

- **The stylesheet's remaining faint greys:** 504 rules that wrote out the old greys (#64748b, #6b7280, #4b5563, #475569) for text on dark surfaces now use `--ps-text-dim` (4.8:1 or better). Left as they were: print styles, rules with their own light background, and the light-surface families (the printed report, the template layout and report editor, light panels, inputs and pills), where the old grey passes and the lighter one would not. The independent check compared every changed rule against the light surfaces and found none on one.
- **Other states, checked in the browser (`e2e/a11y.states.spec.ts`):** each Worklist and Quality Assurance filter tile selected, each cytology tile and organ-site pill, a selected worklist case, a batch opened. Fixed:
  - an active tile's label in its own hue on its own tint (indigo the worst, 3.6:1): lightened to 6:1 or better; inactive tiles keep their grey (`--tile-label-mix`);
  - the worklist case id (#0891b2 on a selected row, 4.1:1), in both the table and card views;
  - cytology pool rows were marked as buttons while holding buttons (axe: nested-interactive); a pool row isn't clickable, so it no longer is one. "Manage flags" no longer also opens the case.
- **Selected tiles are announced:** the Worklist, Quality Assurance, cytology QA and cytology worklist tiles now say which is selected (`aria-pressed`, WCAG 4.1.2), which the browser check also uses to confirm each click took effect.
- **Charts and other colours set in code:** chart axis text (SVG, which axe can't check) uses `utils/chartTheme.ts` `CHART_TICK_COLOR`; a few status and chip colours, the inactive priority buttons in the enhancement request window, the empty-section icon and the voice button's standby icon were raised from the old greys.
- **Browser results:** every check (`npm run test:a11y`, all specs) passes; evidence below.
- **Still open:** cytology QC and CSMS rows are buttons that hold buttons (nested-interactive; needs the row's own action moved to a button); colours that are data (status hues, configurable type colours) aren't changed; contrast that axe can't measure on the translucent tiles is reported in the results, not failed.
- **Messages:** none new.
- **Independent check:** 2 problems (inactive tiles brighter than active ones; inactive priority buttons missed) and 5 smaller points; fixed, except the nested-interactive rows above.
- **Tests:** Xray PS-669 (automated: 61 browser checks and 145 of 145 mapped vitest tests passed) and PS-670 (verification gap: contrast axe can't measure, real displays, screen readers), both linked to PS-539.

## Batch 564 — Every screen checked for accessibility in a browser; colour contrast fixed (WCAG 2.1 AA)

- **New browser check, `e2e/a11y.routes.spec.ts` (part of `npm run test:a11y`):** each of 38 top-level screens is opened on the demo, confirmed to be the screen itself (its heading; not refused, not "case unavailable"), and checked with axe-core for serious or critical WCAG 2.1 AA violations. Together with the earlier checks, 46 of 46 pass.
- **What it found:** colour contrast only, on 13 screens (Audit Log, the batch management screens, Grossing, Contribution, the Cytology worklist, Quality Assurance, Registry exceptions, Slide distribution). Fixed in `pathscribe.css`:
  - the "dim" grey (`--ps-text-dim`, and the same grey written out in the rules that failed) is lighter: 4.8:1 or better on every dark surface, from about 3.7:1;
  - the cytology worklist's greys, the teal and blue text in the Audit Log, the white-on-red count badges, the case-mix counts and the active coloured filter tiles' labels;
  - table headings now light up on hover (the dim grey is now close to the hover colour).
- **Also fixed:**
  - an old grossing link (by accession number) opened the synoptic page instead of grossing, because the case loader always redirected to the synoptic view (`loaders/synopticLoader.ts`: `caseViewLoader`, `grossingLoader`). Found because the browser check of Grossing was scanning the synoptic page;
  - printing a batch window printed its title and barcode near-white on white, and its hints too light.
- **Not covered yet (Batch 565):** screens' other states (a tile clicked, a filter, the empty cases), the worklist's and cytology's active tile labels, the charts' axis text (SVG, which axe doesn't check), and the rest of the stylesheet's uses of the old grey.
- **Messages:** none new.
- **Independent check:** 2 high (the Grossing check scanned another page; no check that each screen really opened), 1 medium (only default states scanned: Batch 565), 3 low (hover hierarchy, the print colours, chart ticks: 565); the highs and the two lows fixed here.
- **Tests:** Xray PS-660 (automated: 46 of 46 browser checks and 21 of 21 mapped vitest tests passed) and PS-661 (verification gap: real displays, printing, an old bookmark), both linked to PS-539.

## Batch 563 — The connection banner and waiting states checked in a browser (PS-622; PS-539 phase 2d item 2)

- **Checked in Chromium, automated** (`e2e/a11y.connectivity.spec.ts`, part of `npm run test:a11y`):
  - offline: "Offline" appears after about 2 s, below the top bar, in one polite live region; nothing takes focus; it covers no control; axe passes. Back online: "Reconnected", then it goes by itself;
  - a page whose code is slow: the loader, then "still loading" from 3 s, staying until the page arrives; axe passes;
  - no live region inside another (that would read the text twice);
  - My exports, Audit Log → Server jobs and Interfaces → Engines: no serious or critical WCAG 2.1 AA violation.
  - The existing main-screen checks (Worklist, Accession, Search, the case report and organ map) were run again and pass.
- **Found and fixed:**
  - on a cold start the page's code arrives in two steps, and each page loader started its own clock, so "still loading" vanished and came back 3 s later. The loaders now share one clock (`services/connectivity/pageWaitClock.ts`; `PageLoader`, `useLoadingPhase`). The browser test fails without the fix;
  - the Audit Log's tab buttons failed AA colour contrast (about 3:1); now about 6:1, and the active one about 8:1. The same grey on the "unsaved changes" window's Cancel button too.
- **Still for a person (PS-622):** NVDA and VoiceOver actually speaking each text once; the hub dropping while the network stays up ("Reconnecting"), which needs the API server.
- **Messages:** none new.
- **Independent check:** no bugs; 3 should-fix (a test that could pass without checking, swallowed errors in two checks, the readiness review still listing this as open) and 5 minor (a replacing loader's first render, unrelated waits joining, fixed sleeps, the dev-only route pattern, another failing grey); fixed except the fixed sleeps, which the existing checks also use.
- **Tests:** Xray PS-652 (automated: 18 of 18 mapped vitest tests and 8 of 8 browser checks passed) and PS-653 (verification gap: screen readers, the hub case), both linked to PS-539.

## Batch 562 — The last polling screens on live updates; readiness review §9 items 3 and 8 closed (PS-539 phase 2d)

- **Molecular Order Queue:** re-reads when an order changes elsewhere (results from the instrument or reference lab, another technologist's action), through a new data topic, `molecularQueue` (proposed earlier as `molecularQueueChanged`). It never polled and still doesn't without the hub (`useLiveData` `pollMs: null`, events only). Orders that left the queue drop out of the selection, so an action never names one the user can't see; a re-read never puts back the view from before the user's own action (`services/molecularOrders/molecularQueueSelection.ts`).
- **Print Queue's site agent line:** follows `siteAgents` for every site with an agent it counts (`useLiveData` `dataKeys`), as well as its minute poll.
- **Readiness review §9:** item 3 (push instead of polling) marked done for the browser (Batches 559 to 562). Item 8 (the renderer and receiver in the Content-Security-Policy) was done in Batch 547 but never marked; marked now, with the guard that keeps it.
- **Organ map events:** checked, still proposed. No screen polls for them; an open report page learns of another user's figure change only when it saves (PS-71's version check) or reopens the case. If built, they would be topics keyed by the synoptic instance, never by case number.
- **Messages:** none new.
- **Independent check:** 1 high (a stale selection after a live re-read), 2 medium (an older re-read overwriting the view after an action; the organ-map claim, which first said figures travel with the case's own changes, which isn't so), 3 low (a new site shows at the next minute's read, documented; revoked agents' sites no longer followed; the keys' comparison); all fixed.
- **Tests:** Xray PS-650 (automated, 79 of 79 mapped tests passed) and PS-651 (verification gap: the two screens with a real hub), both linked to PS-539.

## Batch 561 — Items carried from Batches 559 and 560 (PS-539 phase 2d)

- **Timed reads (`hooks/useLiveData.ts`):** the next timed read is due one interval after the last read of any kind, so a connection that keeps dropping and coming back no longer keeps putting it off. A read still running counts as the timed one, so a slow read isn't followed straight away by another; an event read waits until a second has passed since a timed read.
- **Tests added for what Batches 559 and 560 changed without one:**
  - the FINAL and PRELIMINARY dispatchers record the PDF's hash on the queue entry (`reports/oruQueueEntryHash.test.ts`);
  - a retried result is held while its workup version isn't known, and records the hash of the PDF it carries (`interfaceDispatch/outboundResultRetry.test.ts`);
  - the held reports banner clears on a case change and never shows a slow answer for another case (`hooks/useHeldReports.test.tsx`);
  - the registry exceptions badge shows nothing once the capability goes, even with a read on its way (`hooks/useRegistryExceptionCount.test.tsx`).
- **Corrections:**
  - Batch 559 listed "a held result has no limit on how long it waits" as open. It isn't: in the browser it waits on the failed-messages screen for a person. The server rule wasn't written down, so `MESSAGE_BUS_API.md` §5 now says it: a held result is a temporary failure for `interface.dispatch`, retried 8 times then dead-lettered to the same screen, and later messages for the case wait behind it so a correction never overtakes its result.
- **Messages:** none new.
- **Independent check:** 1 bug (a slow read followed straight away by another), 1 weak test, 1 timing gap, 1 misleading test title, 1 half-verified claim; all fixed.
- **Tests:** Xray PS-648 (automated, 40 of 40 mapped tests passed) and PS-649 (verification gap: the server's retries of a held result; live screens on an unstable connection), both linked to PS-539.

## Batch 560 — Screens updated by the live-update hub instead of a timer (PS-539 phase 2d; readiness review §5)

- **One hook, `hooks/useLiveData.ts`,** keeps a screen current from the hub's `DataChanged` events (Batch 559's topics):
  - it re-reads when the screen's topic (and key) changes; events close together become one read, at most one a second, one at a time, after up to a second at random;
  - it reads once after a reconnection, but not for the first connection;
  - it polls only once a minute while the hub has taken the topic on a live connection, and as before otherwise (no hub, the hub unreachable, the topic refused);
  - only SSO sessions subscribe; password and demo sessions and wall boards without a user poll.
- **Switched:** the registry exceptions badge (60 s), the inbox (20 s), Facility Ops (20 s, by facility), the held reports banner (5 s), the Engraver Monitor (30 s), Site agents per site (60 s) and Interfaces → Engines (60 s, not while hidden). The Print Queue's agent line (all sites) keeps its minute poll.
- **Along the way:**
  - Facility Ops: "out of date" allows two minutes while live (a quiet minute is normal); only the latest read is shown; the clock and "last updated" use the user's language.
  - Held reports: an answer for a case no longer shown is dropped, and the list clears when the case changes; Recall's clock keeps moving while something is held.
  - Engraver Monitor: "Refreshing…" only for a read someone asked for; the status counts moved to `services/engravers/engraverStatusCounts.ts`.
- **Messages:** none new.
- **Independent check:** 3 serious, 7 regressions or gaps, 3 rule points.
  - **Serious (fixed):** wall boards and password sessions would have opened hub connections the hub refuses; a refused topic would have slowed a screen to one read a minute; nothing limited how often a screen read.
  - **Fixed:** the held reports banner could show the previous case's reports; a double read on the first connection; the Engraver Monitor flicker; Facility Ops could show another view's figures; the app-wide connection (documented: one per window, by design); the hook's comment; the clock's locale; the engraver counts moved out of the page.
  - **Left:** a flapping connection restarts the poll timer (resync covers it); tests for the switched screens themselves (the hook is tested).
- **Tests:** Xray PS-646 (automated, 112 of 112 mapped tests passed) and PS-647 (verification gap: the screens with a real hub), both linked to PS-539.

## Batch 559 — Data topics for live updates; Batch 558's open items (PS-539 phase 2d; readiness review §5)

- **Push instead of polling, the contract and client (screens switched in Batch 560):** one hub event, `DataChanged { topic, key? }`, and one method, `SetDataTopics`, for the screens that re-read on a timer (`services/liveUpdates/dataTopics.ts`; `LIVE_UPDATES_SIGNALR.md` §14).
  - Topics: `registryExceptions`, `messages`, `facilityOps` (by facility), `heldReleases`, `engravers`, `siteAgents` (by site), `interfaceEngines`.
  - The event carries ids only, never a patient identifier; the screen re-reads through its own authorised call. The server checks each topic against the signed-in user.
  - `subscribeData` on the live-update service: the SignalR client sends the union of its screens' topics after every (re)connection and every change, one call at a time, retrying a failure on the back-off. With no API server, nothing is sent and the screens poll.
  - Proposed in place of `ReceiveExceptionCountUpdate` (`REGISTRY_ACKNOWLEDGEMENT_API.md`); Pete and the developer to confirm.
- **Batch 558's open items, fixed:**
  - A result message's workup version counts the workup's signed versions. When the server's list of versions (or this browser's) can't all be read, the message is now held ("the workup version is not known") and sent when retried, instead of going out with a version too low (`reports/oruWorkupVersion.ts`, `prepareOruR01Dispatch.ts` reason `version_unknown`).
  - A result sent with a signed version's PDF records the PDF's hash on its queue entry, and every result message carries `reportPdfSha256` when the hash is known. A retry records the hash of the PDF it actually sent (`IOutboundResultQueueService.recordPdfSha256`).
- **Messages:** none new on screen. The held result's text is queue text, in English.
- **Independent check:** 3 high, 4 medium and 2 low.
  - **High (fixed):**
    - held reports were keyed by case id, which can be an accession number, so hub messages could have carried one (now unkeyed);
    - a retry didn't record the hash of the PDF it sent;
    - the doc promised combining events within 100 ms, which the client doesn't do (it is the Batch 560 hook's job; the doc says so).
  - **Medium (fixed):**
    - the last data screen leaving didn't always leave its topics;
    - two quick changes could leave the server on the older scope, and a failed send wasn't retried;
    - the scope's comparison key could collide on keys holding separators;
    - no limits on keys (now 100 per topic, 200 characters each).
  - **Low:** a list this browser couldn't read is now marked partial too (fixed). Still open: the tests for the two other dispatchers' hash and the adapter's hold path (the shared code is tested); added in Batch 561. *Batch 561 correction:* this entry also listed "a held result has no limit on how long it waits for the server" as open. It isn't a gap: in the browser a held result waits on the failed-messages screen for a person to retry it, like a result held for its PDF, and on the server it is a temporary failure for the interface dispatch job, retried 8 times and then dead-lettered to the same screen; later messages for that case wait behind it, so a correction never overtakes the result it corrects (`MESSAGE_BUS_API.md` §5, written in Batch 561).
- **Tests:** Xray PS-644 (automated, 121 of 121 mapped tests passed) and PS-645 (verification gap: the hub's side and the end-to-end checks), both linked to PS-539.

## Batch 558 — Report versions through the API (PS-539 phase 2d; BLOB_STORAGE_API.md §11)

- **One reader for a signed version's PDF:** `services/reports/reportVersionPdf.ts` (`reportVersionPdfReader` in the barrel). Version History, the result message (ORU) and the release after the hold period all read through it.
  - A version signed in this browser: its PDF is checked against the version's `pdfSha256` before it is used.
  - A version the API server lists (hash only): its PDF is read through `GET /api/cases/{caseId}/report-versions/{versionNumber}/pdf?purpose=view|send`, and the bytes must match both the `X-Content-SHA256` header and the version's hash.
  - A PDF that fails its check is refused. Version History says so; a result or release is held with the reason, and an older version is never sent instead.
- **The list:** with the API server, `reportVersionService` (`services/reports/reportVersionInstance.ts`) lists the server's versions (`GET /api/cases/{caseId}/report-versions`, records only, each field shape-checked) with this browser's, each once. When the server's list can't be read, Version History says the list may be incomplete.
- **Numbering:** until the server numbers versions (phase 2e), a version signed here is numbered after the server's versions too, and an amendment of an instance the server holds is sent as CORRECTED, not ADDENDUM. If the server's list can't be read at that moment, the version is still saved, numbered from this browser's alone.
- **Held releases:** checked, no browser endpoint needed. Their PDF is read only by the release job when the delay ends, which runs on the server once `VITE_SERVER_JOBS` lists `release.dueSweep`.
- **Version History:** the "View PDF" button shows for any version with a PDF, wherever it is kept; the PDF's memory is released after a minute.
- **Messages:**
  - `versionHistoryModal.pdfProblems.*` (integrity, notFound, notPermitted, unavailable);
  - `versionHistoryModal.versionsPartial`;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 3 medium and 2 low.
  - **High (fixed):**
    - a version signed here while the server held earlier ones would have been numbered 1 again;
    - an amendment of an instance the server holds would have been sent as ADDENDUM;
    - a hash failure read as "sent when retried" (the message now says it is not sent and to tell the administrator; a passing outage stays retryable, as for report documents).
  - **Medium:**
    - the server's other version fields were taken unchecked (fixed: each field shape-checked, unknown ones dropped);
    - the ORU's workup version counts only this browser's versions when the server's list can't be read (open, below);
    - a version PDF sent as a result records no `pdfSha256` on the queue entry (open, below; a release stores it as a report document, which does).
  - **Low:** the object URL was never released (fixed); the partial notes now match; the duplicated error mapping now shares report documents'. The audit of opening a version names the case as its id, as since Batch 437 (left as it is).
- **Corrections:** `pdfSha256` on a report version was the hash of the base64 text, not of the PDF's bytes (Batch 461), unlike report documents and the server contract. New versions hash the bytes; the reader accepts both. Corrected in `ReportVersionRecord.ts`, `ORGAN_MAPPING_API.md` and `BLOB_STORAGE_API.md`.
- **Open:** the endpoints themselves (phase 2e); the workup version count and the queue entry's hash above.
- **Tests:** Xray PS-642 (automated, 121 of 121 mapped tests passed) and PS-643 (verification gap: the server's version endpoints and the end-to-end checks), both linked to PS-539.

## Batch 557 — The server's /api/config and hosting regions (PS-539 phase 2d; readiness review §9 items 1 and 7)

- **Start-up:** with an API server, the app reads `GET {api}/api/config` after config.json and before any service is created (`runtimeConfig/loadRuntimeConfig.ts` `withServerConfig`; `RUNTIME_CONFIG.md` §5a). It is public and read with no credentials and no cache.
- **Settings from the server:** only those marked `fromServer`: the AI model, its managed deployment, token limit and region, and voice.
  - Everything else stays with the site: sign-in, the instance role, `VITE_SERVER_JOBS`, the AI provider, the breached-password check, the enhancement address (`NOT_FROM_SERVER`), and every address, because the security policy is made from config.json's (`ADDRESS_NOT_FROM_SERVER`).
  - Which value wins: config.json, then the server, then the build.
  - The build rules are checked on the merged settings.
- **When /api/config isn't there:** a 404, or no complete answer within 5 s (body included), means config.json alone, with a console warning. A malformed one stops the app, and the error screen says the problem is in the server's `/api/config`.
- **Hosting regions:** the database and file storage regions (`hosting`) are shown to administrators in the AI provider settings, under "Where PathScribe keeps data", beside the AI region (`components/Config/AI/HostingRegionsCard.tsx`).
- **Messages:**
  - `hostingRegions.*`;
  - `runtimeConfigError.fromServer`, `.problems.ADDRESS_NOT_FROM_SERVER` and `.problems.NOT_FROM_SERVER`;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 2 medium-high, 3 medium and 5 low; all fixed.
  - **Medium-high:**
    - the time limit didn't cover the reply's body;
    - the server could set sign-in, the instance role and other settings that must stay with the site.
  - **Medium:**
    - `VITE_SERVER_JOBS` from the server would make jobs run twice if `/api/config` were missed;
    - a rule problem caused by a server value was blamed on config.json (moot now that the server can't set those);
    - the docs.
  - **Low:**
    - the build's address checked before use;
    - the hosting note's wording;
    - the hosting block's rules documented;
    - the example address.
- **Corrections:** `deploy/runtime-config/config.example.json` gave `VITE_API_BASE_URL` ending in `/api`; the app adds `/api/...` itself, so the address is the server's root.
- **Tests:** Xray PS-640 (automated, 94 of 94 mapped tests passed) and PS-641 (verification gap: the server's /api/config and the end-to-end checks), both linked to PS-539.


## Batch 556 — Report documents through the API (PS-539 phase 2d; BLOB_STORAGE_API.md §11)

- **With the API server:** released report documents are read through it (`reportDocuments/httpReportDocumentService.ts`):
  - `GET /api/report-documents/{id}?purpose=view|send`, with the SHA-256 checked again against `X-Content-SHA256`; a different id is refused;
  - `GET /api/cases/{caseId}/report-documents`.

  A release made in this browser keeps its document here, in memory, until the release moves to the server. So the store reads this browser's first, then the server's, and lists both.
- **One store for every reader** (`reportDocuments/reportDocumentInstance.ts`, `reportDocumentService` in `@/services`): View as sent, print retries, delivery, the release event, Assist, the ORU resolver, cytology result retries and the cytology case report. In the demo it is the same store as before.
- **What changes on screen and in the channels:**
  - **Version History:** View as sent says when the document can't be fetched or isn't permitted, and notes when the server's list couldn't be read.
  - **Print retries:** a print retry stays retryable when the server doesn't answer.
  - **Cytology Print case report:** it refuses to print rather than print something else when the list is incomplete.
- **Contract additions** (`REPORT_DOCUMENT_STORE_API.md` §2):
  - the record's headers;
  - exposing them to the browser across hosts (CORS);
  - `?purpose=` (view is audited as a rendering, send with the channel);
  - system retries use a service identity on the server.
- **Messages:** `versionHistoryModal.sentDocuments.notPermitted`, `.unavailable` and `.listPartial`, in 5 languages. Korean wants native review.
- **Independent check:** 1 high, 3 medium and 6 low; all fixed except one test that spies on the demo store directly (it is the same object in tests).
  - **High:** without the headers exposed across hosts, every read would have looked tampered with. The contract now requires them, and a missing hash reads as "couldn't be fetched".
  - **Medium:**
    - the cytology case report could print a fresh render when the list was incomplete;
    - a passing outage failed a print for good;
    - the status in `BLOB_STORAGE_API.md` overstated what is done.
  - **Low:**
    - which side audits a read;
    - checking the record's values from headers;
    - hashing the bytes once;
    - the import path;
    - the docs.
- **Tests:** Xray PS-638 (automated, 141 of 141 mapped tests passed) and PS-639 (verification gap: the document endpoints and the end-to-end checks), both linked to PS-539.


## Batch 555 — Browser stand-ins for server jobs (PS-539 phase 2d; readiness review §7 and §9 item 3)

- **What changed:** the browser stops standing in for a server job once the deployment says its API server runs it. `config.json`'s `VITE_SERVER_JOBS` (new setting; `RUNTIME_CONFIG.md`) lists recurring job names from `MESSAGE_BUS_API.md` §5.
  - Until a job is listed, the browser keeps running it while someone is signed in.
  - So a delivery, an alert, an escalation or a release is never done twice, and never left with no runner while its data is still in the browser.
  - A server build today lists none, so nothing changes until phase 2e.
- **The register:** `services/serverJobs/browserStandIns.ts`. Each stand-in calls `browserRunsServerJob('<job>')` where it starts:
  - delivery retries (the app shell; this also stops applying fax transmission reports from the hub);
  - release-delay releases: the app shell's sweep, and the surgical report page's countdown (`reportRelease/releaseCountdown.ts`), which then reads the case every 15 s until the server has released it;
  - consult-link expiry recording;
  - the registry 72-hour escalation;
  - follow-up alerts;
  - support-access expiry;
  - the cytology–histology sweep.
- **The guard** (`browserStandIns.guard.test.ts`) checks that each stand-in checks its own job, and that the work is started only from the listed files. **The behaviour test** checks that each stays off.
- **Support access:** an approval past its time reads Expired before the expiry is recorded (`effectiveSupportStatus`). Revoke and End accept only access still in force.
- **Carried over from Batch 554:** the engine counts and table cells use the user's number format (`{{count, number}}`, `interfaceEngines.number`).
- **Independent check:** 2 high, 2 medium and 5 low. All are fixed.
  - **High:**
    - the surgical report page's countdown released reports too (now a registered stand-in);
    - switching off by "API server configured" would have left every job with no runner until phase 2e. It is now per job, by `VITE_SERVER_JOBS`.
  - **Medium:**
    - a run-out support approval read "Approved";
    - a stale status row in `MESSAGE_BUS_API.md` §9.
  - **Low:**
    - the guard only looked for the name;
    - no check for new callers;
    - the fax-report subscription is now documented;
    - the two definitions of "API server configured" now differ deliberately (an invalid address keeps the browser running jobs and keeps data in memory, the safe side);
    - the docs.
- **Corrections:** `DEPLOYMENT_READINESS_REVIEW.md` §7's first draft in this batch said the browser runs none of the jobs with an API server. It now says the browser stops each job only once the server runs it.
- **Tests:** Xray PS-636 (automated, 113 of 113 mapped tests passed) and PS-637 (verification gap: each server job, once phase 2e ships it), both linked to PS-539.


## Batch 554 — Interface monitoring (PS-539 phase 2d; readiness review §9 item 4)

- **Contract** (`services/interfaceMonitoring/interfaceMonitoringContract.ts`; `INTERFACE_ENGINE_EDGE.md` §9a):
  - `GET /api/interface/engines` returns `{ serverTime, engines }`: each engine's last heartbeat, when it was received, and the server's status.
  - The rules: what is wrong with a channel; an engine's status (the server's, else by the server's clock); worst engines and problem channels first; totals and listeners down; the line's parts (zero counts left out).
  - A malformed row is dropped or made safe (`normaliseEnginesResponse`).
- **Status change** (`engineEdgeContract.ts` `engineStatus`, §8): a stopped channel is degraded (a listener not taking messages), and a time that can't be read is offline, never "recent".
- **Service** (`interfaceMonitoringService` in `@/services`):
  - checks `interface:engine-status:view` first (new, standard, Admin, requires `screen:audit-log:open`; no audit entry per poll);
  - the HTTP client gives up after 15 s;
  - read only;
  - the demo has no engine.
- **Screen:**
  - **Audit Log → Interfaces → Engines** (`pages/InterfaceEnginesSection.tsx`, with the capability): each engine with its facts and channels; Open Outbound for dead letters.
  - **A line above the Interfaces sub-tabs** (`components/Interfaces/EngineStatusLine.tsx`): problems first, one click to Engines, hidden after a failed read.
  - Reads every minute with the API server, not while the browser tab is hidden (`hooks/useInterfaceEngines.ts`). A refusal clears what was shown.
- **Messages:**
  - `interfaceEngines.*` (counts in plural forms, joined with `formatList`);
  - `auditLog.interfacesTab.subTabEngines`;
  - the capability's label;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 5 medium and 6 low; all fixed except number formatting in the counts (low).
  - **High:**
    - a stopped listener showed "Online", and the line didn't flag it;
    - a time that couldn't be read showed a stale engine as online;
    - the batch's docs weren't written yet when it was checked.
  - **Medium:**
    - one malformed row could break the Audit Log page;
    - `'constructor'` passed as a status;
    - old counts stayed after a failed read or a refusal;
    - plurals;
    - hook and line tests.
  - **Low:**
    - the 15-minute figure is now taken from the limit;
    - a time limit on the read;
    - no polling while hidden;
    - unknown values made safe;
    - the warning colour's contrast;
    - an unused age field removed.
- **Corrections:** readiness review §5 now lists the 60-second polls of Batches 552 and 554 (Batch 552's were missing).
- **Tests:** Xray PS-634 (automated, 132 of 132 mapped tests passed) and PS-635 (verification gap: the engines' heartbeat, `/api/interface/engines` and the end-to-end check), both linked to PS-539.


## Batch 553 — Site agent printers in routing (PS-539 phase 2d; readiness review §9 item 6)

Carried over from Batch 552: agent printers in routing rules and Redirect, the update window on screen, quick-pick revoke reasons and the hand-over picklist.

- **Destination** (`types/printRouting/PrintDestination.ts`; `SITE_AGENT_API.md` §3): a `PrintDestination` is a site agent printer (`{ agentPrinter: { siteId, destinationId }, displayName? }`) or a printer address (`NetworkPrintDestination`, which the transports take).
- **Rules** (`services/printRouting/printDestinationRules.ts`, pure and tested):
  - the edit draft (new ones are agent printers);
  - the problems, and the list and audit text (the audit always names the printer's id and site);
  - picking the only printer;
  - the site: the facility for a facility-tier rule and the default; the jobs' own lab for Redirect.
- **A report prints at its own lab:**
  - `PrintJob.performingFacilityId` is recorded at release.
  - A rule naming another lab's agent printer is skipped for that lab's releases.
  - Redirect refuses another lab's printer (`PRINT_JOB_WRONG_SITE`).
  - The routing rule service refuses another site's printer on a facility-tier rule, and any site's printer without `config:print-routing:manage` there.
  - The facility service refuses a default on another site.
- **Sending:** an agent-printer job fails at once with "needs the site agent", not retried, outside the API server (`attemptPrintDelivery.ts`).
- **Printer lists:** `siteAgentAdminService.reportPrinters(siteId, purpose)` (`GET /api/sites/{id}/agent-printers`, printers only):
  - routing needs `config:print-routing:manage`;
  - the facility default needs `config:print-settings:manage`;
  - Redirect needs `print:job:redirect`;
  - each at the site;
  - report printers only.

  No new capabilities. `AUTHORIZATION_API.md` notes the three.
- **Screens:**
  - **`components/Printing/PrintDestinationFields.tsx` and `hooks/useAgentPrinters.ts`:** the routing rule window (performing labs as sites; a refused save keeps the window open with the reason; the list names a printer with its lab) and Print Queue Redirect (the jobs' lab, or a printer address with the reason; a refused redirect says how many jobs weren't redirected).
  - **The facility Printing tab:** the facility's own agent printers.
  - **Site agents:**
    - revoke reasons as quick picks (`{ reasonCode, note? }`, a note only for "other", at most 500 characters);
    - the update window (both times or neither; it may cross midnight);
    - a pickup share's import picked from `orders`/`results`, or a channel with the site's channels suggested.
- **Rule 3 on touch:** the routing rule list's scope and criteria separators, and the Print Queue's queued time (`formatDateTime`).
- **Messages:**
  - `printDestination.*`;
  - `printRoutingRulesSection.errors.*`, `.scopeDescription` and `.criteriaDescription.both`;
  - `printQueueDashboard.redirect.notRedirected_*`;
  - `facilityPrintingTab.destination.noDefault` and `.problems.agentPrinterOtherSite`;
  - `siteAgents.revokeReasons.*`, `.updateWindow.*`, `.share.importKinds.*` and others;
  - all in 5 languages. Korean wants native review.
  - 17 keys the old address-only forms used were removed.
- **Independent check:** 5 medium and 13 low.
  - **Fixed:**
    - a client- or location-tier rule could send a lab's report to another lab's printer at release;
    - refusals closed the rule window and Redirect silently;
    - the docs and comments still said `PrintDestination` was address-only;
    - the redirect audit kept only the printer's name;
    - the "missing printer" check was written in two components;
    - per-site checks on saving a rule;
    - an older job's Redirect hint;
    - the facility-tier hint;
    - only performing labs as sites;
    - the site shown in the rule list;
    - a false "unsaved" after clearing the update window;
    - a note length limit;
    - the locale date;
    - picking the only printer;
    - test gaps (the hook, the service's create and update, refusals, a release to another lab).
  - **Not fixed here:** the facility tab doesn't pick the only printer by itself (opening it would make an unsaved change). Checking that a chosen printer is still on the site's list is the server's job (§3, phase 2e).
- **Corrections:**
  - Batch 552 missed the notes in the ancestor READMEs `src/components`, `src/components/Config`, `src/types` and `docs`; they are added now.
  - Batch 552's §11a table had a stray blank line.
- **Tests:** Xray PS-632 (automated, 202 of 202 mapped tests passed) and PS-633 (verification gap: the agent, the server endpoints and Pete's routing check), both linked to PS-539.


## Batch 552 — Site agent screens (PS-539 phase 2d; readiness review §9 item 6)

A site is a performing-lab facility (Pete, Oct 13, 2026), so `siteId` is the facility's id.

- **Contract** (`SITE_AGENT_API.md` §11a, new; §13 updated):
  - listing a site's agents, or all of them;
  - one-time enrolment codes (single use, 24 hours, shown once);
  - revoking with a reason;
  - a site's agent configuration (printers and file shares) read and saved as one document, sent to the agent on its next check-in.
- **Rules** (`services/siteAgent/siteAgentAdmin.ts`, pure and tested):
  - **Status:** the server's own status is used when it gives one.
  - **Printers:** a unique id; IPv4 or a host name, with no IPv6 for now; the port; a label printer is ZPL on Raw 9100. IPPS on 631 is the default.
  - **Shares:**
    - only `\\server\share` paths, not this machine, a device path or an admin share;
    - pickup patterns are file names only, and never PDFs or images (those are documents, which come through the files API);
    - the rejected folder's name.
  - Values are trimmed before saving.
- **Service** (`siteAgentAdminService` in `@/services`):
  - `config:site-agents:enroll` covers codes and revoking (a reason is required).
  - `config:site-agent-config:manage` covers saving. Viewing needs either capability.
  - All are checked at the site's facility. The all-sites list is filtered to the viewer's facilities.
  - It includes the HTTP client and the demo (no agent can enrol; the configuration is kept under `site_agent_config`, which a demo reset clears).
- **Capabilities:** two new ones, in the configuration group, so Admin and Lab Director get them by default. They are in `AUTHORIZATION_API.md`. The section count is 101.
- **Screen:** Configuration → System → **Site agents** (Workstation & Hardware; `SiteAgentsSection.tsx`, `hooks/useSiteAgents.ts`).
  - The site is the facility chosen in the group's picker.
  - Agents are listed with their status, and refresh every minute with the server.
  - Make a code, with Copy.
  - Revoke inline, with a reason.
  - Printers and shares are edited in place and saved together. Unsaved changes are guarded, including when the facility picker changes (now guarded for every section of the group).
- **Print Queue:**
  - A job the agent could only send (Raw 9100, LPR) shows **Sent to printer** (`PrintJob.confirmation`, `printJobStatusKey`).
  - A status line counts the agents online, needing attention and offline, with a link to Site agents (`SiteAgentStatusLine.tsx`).
- **Shared:** `utils/copyText.ts`.
- **Messages:**
  - `siteAgents.*`, `systemTab.sections.siteAgents` and `printQueueDashboard.status.SENT_TO_PRINTER`;
  - the two capability labels;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 6 medium and 6 low; all fixed.
  - **High:**
    - a code or configuration from the previous site could show after a site switch;
    - revoking discarded unsaved printer edits;
    - the section had its own site picker beside the group's, with no unsaved-changes guard.
  - **Medium:**
    - host and share path checks let bad values through, and values weren't trimmed;
    - a failed load left the section spinning;
    - status used the workstation's clock and never refreshed;
    - pickup patterns could match folders or documents;
    - the IPPS default port was 443, not 631;
    - a label printer could be set to a protocol it can't use.
  - **Low:**
    - the revoke row closed even when revoking failed;
    - no note when Copy failed;
    - the status line showed with only revoked agents;
    - a literal space in the status line;
    - no warning on the "delete after hand-over" choice;
    - no check of the rejected folder's name.
- **Moved to Batch 553:** choosing an agent printer in routing rules and Redirect (the printer reference becomes site plus printer, which touches about 20 files).
- **Planned:** the update window on screen, instruments (agent v2), quick-pick revoke reasons and a hand-over picklist.
- **Tests:** Xray PS-630 (automated, 134 of 134 mapped tests passed) and PS-631 (verification gap: the real agent and the server endpoints), both linked to PS-539.


## Batch 551 — Server jobs view (PS-539 phase 2d; readiness review §9 item 10)

- **Contract** (`services/serverJobs/serverJobsContract.ts`; `MESSAGE_BUS_API.md` §4a):
  - the job kinds and the recurring jobs, with their intervals;
  - `/api/jobs/health`, `/api/jobs/dead-letters` and `/api/jobs/{id}/requeue`;
  - `REQUEUE_ROUTE`: interface and print jobs keep their own screens and capabilities;
  - `recurringJobOverdue` (judged against the server's time) and `kindNeedsAttention`;
  - `deadLetterContext`, plus handling for `event:{consumer}` and unknown kinds.
- **Service** (`serverJobsService.ts`; `serverJobsService` in `@/services`):
  - `jobs:server-job:view` is checked before any read, and dead letters are filtered to the viewer's facilities.
  - `jobs:server-job:requeue` is checked at the job's facility and case, or every facility when it names neither.
  - Interface, print and unknown kinds are refused (`WRONG_SCREEN`).
  - It includes the HTTP client.
- **Capabilities:** two new ones, seeded for Admin (`SERVER_JOBS`), in `AUTHORIZATION_API.md`.
- **Screen:** System Logs → **Server jobs** (`pages/ServerJobsSection.tsx`, `hooks/useServerJobs.ts`).
  - The tab shows only with the view capability. A link to it without the capability opens the Audit tab.
  - It has the health by kind, the recurring jobs, and the dead letters with a kind filter.
  - Requeue takes one click, with the outcome above the list.
  - Interface and print jobs open Interfaces → Outbound or the Print Queue instead.
  - The demo explains that the browser does this work itself.
- **Shared:** `services/apiServer/apiServerUrl.ts` holds the API address, checked as sign-in checks it. Exports use it too.
- **Carried over from Batch 550:** with exports through the server, the registry transmission audit doesn't read its queues in the browser.
- **Corrections:** `MESSAGE_BUS_API.md` §4 said dead-lettered deliveries show in the delivery exception queue. They are requeued from Server jobs, as readiness review §9 item 10 says, and the delivery exception queue still shows the delivery itself.
- **Messages:** `serverJobs.*`, `auditLog.tabs.serverJobs` and the two capability labels, in 5 languages. Korean wants native review.
- **Independent check:** 1 high, 5 medium and 5 low; all fixed.
  - **High:** a facility-limited user could requeue another facility's job when the job had no facility. Now checked at the job's case, or every facility.
  - **Medium:**
    - dead letters weren't filtered by facility;
    - §4a was missing and §4 contradicted the batch;
    - "overdue" used the workstation clock;
    - the requeue message vanished with its row, and a test passed only because its fake never dropped the job;
    - an unknown kind crashed the tab.
  - **Low:**
    - hook races, and unhandled errors on requeue;
    - the deep link without the capability;
    - an extra click to reach the right Interfaces sub-tab;
    - optional recurring jobs flagged forever;
    - the error text is now tagged for redaction.
- **Checks:**
  - type-check clean;
  - full suite: 9,571 tests passed and 33 skipped, in 1,131 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass;
  - Chromium smoke test passes.
- **Still open:** the `/api/jobs` endpoints (India team, phase 2e) and a check against them, plus a browser check of the tab with sign-in.
- **Xray:** PS-628 (automated), PS-629 (open points).

## Batch 550 — Exports through the server (PS-539 phase 2d, D7)

- **The export service** (`services/exports/exportTracker.ts`, `httpExportApi.ts`, `runExport.ts`; `exportService` in `@/services`). Every export button calls it.
  - **No API server (the demo):** the browser builds the file, as before.
  - **With one:**
    - It posts `/api/exports` and asks for the status every 0.5 s.
    - Ready within 3 s: downloads with no notice.
    - From 1 s: shows "preparing".
    - Then it waits for the hub's `ExportStatus`, or re-reads every 15 s.
    - Download asks for a fresh link (the capability is checked again on the server).
    - A double click sends one request.
    - Signing out clears the notices (`auth/sessionEndHooks.ts`).
- **The buttons, all 26 export kinds, with the screen's filters:**
  - the QA tabs, through `exportQaReportRows` (now with a `parameters` argument) and `qualityAssurance/runQaExport.ts`;
  - the registry transmission audit;
  - the Audit Log's four logs and the Billing Log (typed filters, with the facility time zone);
  - My Contributions (2);
  - case search;
  - the disposal report;
  - change history.

  Guard: `exports/exportRouting.guard.test.ts`.
- **Hub:** `ExportStatus` (`HUB_EXPORT_STATUS`, `parseExportStatusEvent`) and `subscribeExports` on the live-update service.
- **Screens:**
  - `components/Exports/ExportNotices.tsx`, in the bottom-left feedback column;
  - `pages/MyExportsPage.tsx` at `/my-exports`;
  - a **My exports** button in the top bar with a ready badge (with the API server only).

  CSS: `.ps-export-notice*` and `.ps-myexports-*`.
- **Messages:** `exports.notice.*`, `exports.problem.*` (11 problems), `myExports.*` and `navBar.myExports*`, in 5 languages. Korean wants native review.
- **Contract (`ASYNC_EXPORT_API.md`):**
  - §2a: the parameters each kind sends.
  - §3: response statuses, `ExportErrorBody`, `ExportDownloadLink`.
  - §5: as built.
  - §7: done.
  - §10.
- **Corrections:**
  - §5 said "the bell". PathScribe has none, so My exports is in the top bar.
  - §8 said parameters carry no patient names, but Case Search and the Billing Log filters can. Parameters are now treated as PHI (encrypted, never listed or logged, deleted with the file; the record keeps a hash).
- **Independent check:** 3 high, 5 medium and 5 low. All fixed except the two noted below.
  - **High:**
    - patient data in parameters (doc §8, and typed filters);
    - notices outliving sign-out (reset on sign-out);
    - a routing guard that passed for the wrong reason (now checked per call site, and tried against a probe file).
  - **Medium:**
    - a stale re-read turning ready back into preparing;
    - a refused link reported as downloaded, and `//` links accepted;
    - the API address not validated as sign-in does;
    - no feedback during the 3 s wait (notice from 1 s, and de-duplication);
    - display labels sent instead of filters, and the escalated queue sent as active.
  - **Low:** 401 is shown as "sign in again"; refused-notice ids; the 3 s wait bounded on a slow network; unknown codes; out-of-order reloads.
  - **Left, and noted:**
    - the registry audit still reads the queues in the browser before the server builds the file (harmless, wasted work);
    - the parameters are the screen's filters until the API types them (phase 2e).
- **Checks:**
  - type-check clean;
  - full suite: 9,556 tests passed and 33 skipped, in 1,129 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass;
  - Chromium smoke test passes.
- **Still open:** the server's export endpoints, job, blob storage and hub method (phase 2e), and a browser check of the server path with sign-in.
- **Xray:** PS-626 (automated), PS-627 (open points).

## Batch 549 — Open items carried over from earlier batches (PS-539 phase 2d)

Pete, Oct 13, 2026: "the open bits get added into the next batch." This batch takes every open item from Batches 537–548 that can be finished in code here. The full inventory, including what can't be finished here and why, is in the PS-539 comment.

- **Loading text (from 548):**
  - `LoadingState` has an inline variant: in the place's own class, or a span inside a line or table cell.
  - The remaining loading texts in 56 files use it.
  - `latency.guard.test.ts` now covers every loading text in the app.
- **Reconnect (from 548):** `retryNow()` on the live-update service, called when the browser comes back online.
  - A restart that is waiting out its back-off starts at once.
  - A connection in SignalR's own reconnect loop is stopped and started again (the independent check found that this case was missed at first).
- **Preload (from 547):** a build plugin (`scripts/vite/preloadAppStart.ts`, `scripts/static-chunk-closure.mjs`) adds `modulepreload` tags for the app's code, so it downloads while `config.json` is read.
- **Links only (from 544):** the https check is shared (`services/links/externalLink.ts`). It applies to:
  - the facility and department letterhead logo;
  - the gross imaging vendor's address.

  It is checked in the editors and in the services (`invalidLink`). Message: `links.invalidHttpsLink`.
- **F1 (from 537):** the unmounted engine-notification hook and the Firestore read only it used are removed (`DELETED_FILES.txt`).
- **`jspdf` (from 539):** removed from `package.json`; nothing imported it.
- **Assist signed time (from 538):**
  - An Assist case release carries the case's sign-out time (`finalizedAt`) when the signer is the pathologist who signed it out.
  - Someone else releasing it keeps the time of release.
  - The stored document's `releasedAt` is the time of release. A rebuild passes the original.
- **Report documents (from 538):** one storage entry per document's bytes, plus a small list of records.
  - Older entries are still read.
  - A record whose bytes are gone says `bytesMissing`, not "integrity".
- **F10 (from 545):** the other two engine webhooks no longer claim before writing.
  - cassette-dispatch-outcome writes its record and the claim in one transaction (`createWithClaim`). A record already there is answered "already processed".
  - engraver-status claims inside its status transaction.
- **F3 (from 546):** the Print Queue shows "needs the site agent" in the user's language (`printing/printJobFailureReason.ts`). Message: `printQueueDashboard.failure.needsSiteAgent`.
- **Docs:**
  - The readiness review is updated for F1, F3 and F10 and §9 items 1 and 2. Two references are corrected: the F4 test number, and F6's cytology template, done in Batch 539.
  - Also updated: `RUNTIME_CONFIG.md`, `BLOB_STORAGE_API.md`, `LIVE_UPDATES_SIGNALR.md`, `INTERFACE_ENGINE_EDGE.md`, `ASYNC_EXPORT_API.md` and `REPORT_DOCUMENT_STORE_API.md`.
- **Tried and taken out:** checking an organisation-scoped QA export against that organisation's facilities (PS-610).
  - The independent check showed why. The organisation's rows are chosen by the case's origin hospital, through the legacy map. The facility tree places some of those cases' ordering facilities outside the organisation.
  - So the check could pass an export that holds rows from facilities the person isn't assigned to.
  - It stays "all facilities", the safe reading, until the Organisation-to-Facility migration.
- **Independent check:**
  - **High (2):** the organisation scope above, and a guard broken by citing deleted files.
  - **Medium (4), all fixed:**
    - the reconnect loop;
    - the document `releasedAt`;
    - a record without a claim;
    - the link check only in the editors.
  - **Low (4):** inline loading text changed some layouts (fixed: with a class it's a block); "bytes missing" told apart (fixed); doc lines (fixed); a status inside the spell-check menu (left; noted).
- **Still open:** see the PS-539 comment. In short, these need something not available here:
  - browser checks with sign-in;
  - the API server and the India team;
  - the staging host;
  - Korean native review;
  - the Organisation-to-Facility migration.

  The remaining phase 2d work (exports through the server, the Server jobs view, the site agent screens, interface monitoring, retiring browser stand-ins) continues from Batch 550.
- **Checks:**
  - type-check clean;
  - full suite: 9,517 tests passed and 33 skipped, in 1,124 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass the bundle check;
  - Chromium smoke test: the sign-in page renders with no errors.
- **Xray:** PS-624 (automated), PS-625 (open points).

## Batch 548 — Connection banner and waiting states (PS-539 phase 2d item 2)

- **Rules:** `services/connectivity/latencyStates.ts` (new, pure; readiness review §8).
  - Waiting: nothing under 300 ms, a placeholder from 300 ms, "still working" from 3 s.
  - The connection: the browser's network first, then the live-updates hub, only when it's in use. A problem shows after 2 s, and "Connection restored" for 4 s only when the hub is live again. A problem that returns meanwhile shows at once.
- **Hooks:** `hooks/useLoadingPhase.ts` and `hooks/useConnectionBanner.ts` (new).
- **`components/Connectivity/ConnectionBanner.tsx` (new):**
  - mounted once in `SignedInApp.tsx`, below the top bar;
  - it doesn't catch clicks, so it never blocks the case search;
  - announced politely to screen readers; nothing to dismiss.
- **`components/Common/LoadingState.tsx` (new)** replaces the plain `.ps-conf-loading` text on 42 screens: Configuration sections, QA tabs, molecular pages, the intraop queue and others. The old CSS is removed.
- **`components/Common/PageLoader.tsx` (new)** is the route fallback for `App.tsx` and `SignedInApp.tsx`, which each had their own copy. The spinner appears after 300 ms; there's a hidden label for screen readers, and "still loading this page" after 3 s.
- **Guard:** `services/connectivity/latency.guard.test.ts`.
- **Independent check:** found 1 high, 4 medium and 6 low issues, all corrected or listed in PS-622.
  - **High:** the banner covered the case search.
  - **Medium:**
    - it sat inside the print-feedback stack;
    - its text promised polling and catching up that most screens don't do;
    - the hub's "offline" can mean only "not yet reachable";
    - `aria-busy` silenced the announcements.
- **Still open:**
  - about 50 other screens with their own loading text;
  - the hub reconnecting at once when the network returns;
  - a keyboard and screen-reader check in a browser.
- **Messages:** `loadingState.{page,slow,slowPage}` and `connectionBanner.{offline,reconnecting,reconnected}.{title,detail}`, in 5 languages. Korean wants native review.
- **Xray:** PS-621 (automated), PS-622 (open points).

## Batch 547 — Runtime configuration: one build for every deployment (PS-539 phase 2d)

- **`config.json` at start-up.** `src/main.tsx` reads `/config.json` (never cached) before any other part of the app loads, then starts it (`src/startApp.tsx`, what `main.tsx` did before).
  - A deployment sets its 36 settings there, with the same names as the `VITE_*` variables.
  - No file (404, or the host's own page) means the build's values, as before. This is the demo.
- **New `services/runtimeConfig/`:**
  - `runtimeSettings.ts`: the settings, and the check of a config.json (`parseRuntimeConfig`);
  - `loadRuntimeConfig.ts`;
  - `runtimeEnv.ts` (`appEnv()`). Every `import.meta.env.VITE_*` read in 16 files now goes through it, each variable named, never the whole object.
- **The rules:**
  - known names only;
  - server addresses https, as the services take them (plain http only to this computer, in development);
  - proxies may be a path on this site;
  - a server build needs `VITE_API_BASE_URL` and `VITE_AUTH_MODE` = `sso`;
  - a demo build refuses an API server, hub, renderer or interface receiver, and `production`.
- **The error screen.** A broken rule shows `components/RuntimeConfigError/RuntimeConfigErrorScreen.tsx`: each problem by setting name, never the value.
- **Server builds:**
  - `npm run build:server` is `vite build --mode server` (`__DEMO_TOOLS__` false).
  - The demo accounts load only behind `__DEMO_TOOLS__` (`authSessionInstance.ts`, `mockStaffPasswordService.ts`), so a server build has none; `check-production-bundle.mjs` fails if it does.
  - *Correction:* before this batch they were left out only of builds made with `VITE_AUTH_MODE=sso`.
- **CSP:** `generate-security-headers.mjs --runtime-config config.json` adds config.json's addresses to the policy (`originsWithRuntimeConfig`).
- **Deployment:** `deploy/runtime-config/` has `config.example.json` and how to serve the file. The full account is `docs/architecture/RUNTIME_CONFIG.md`.
- **Corrections:**
  - `AUTHENTICATION_OIDC.md` and `LIVE_UPDATES_SIGNALR.md` called these settings build-time;
  - the readiness review §9.1 and §12 item 5 are marked done;
  - `.env.example`.
- **Checked in a browser:** the demo build starts as before. A config.json giving a demo build an API server shows the error screen.
- **Independent check:** found 2 high, 6 medium and 5 low issues, all corrected (or listed in PS-618). The high ones:
  - a server build could have signed in with the demo accounts if config.json left out the sign-in mode;
  - config.json accepted addresses the services then refused.
- **Messages:** `runtimeConfigError.{title,intro,help}` and `runtimeConfigError.problems.*` (12 codes), in 5 languages. Korean wants native review.
- **Xray:** PS-617 (automated), PS-618 (open points).

## Batch 546 — Site agent contract (D3); F3 and F4 fixed (PS-539)

- **`docs/architecture/SITE_AGENT_API.md` (new, phase 2c, decision D3)** is the contract between the site agent (a .NET Worker Service per site) and the API server. Version 1 covers report and label printers and Windows file shares. It specifies:
  - **Enrolment:** a one-time code (128-bit, 24 hours), a CSR and an HSM-held CA. Mutual TLS runs on the agent's own host, revocation is checked per request, and certificates renew 30 days ahead.
  - **A local allow-list set by the hospital:** printer subnets and ports, share roots and download hosts, never changed from PathScribe.
  - **Getting work:** jobs come over an outbound WebSocket (`/hubs/agent`), or a long poll, using claim, a 120 s lease and renewals.
  - **At most once:** the agent saves "started" before sending, and an interrupted job is `IN_DOUBT`, never resent by itself.
  - **Expiry, on the server's clock:** 4 hours for reports, 10 minutes for labels.
  - **"Sent to printer"** (Raw, LPR) versus **"Printed"** (IPP/IPPS), mapped to the Print Queue, `PrintJobStatus` and file drop.
  - **Retries:** labels are never retried by themselves (Pete, Sep 26).
  - **Store and forward,** encrypted with DPAPI at machine scope.
  - **File drop** with a done-log.
  - **File-share pickup:** stable-and-exclusive, a 7-day de-duplication key, data files only (links-only rule), and `processed` and `rejected` folders.
  - **Signed updates:** Authenticode plus Ed25519 over the whole manifest, key rotation, rings and rollback.
  - **Heartbeat and status:** a printer that's off with nothing waiting isn't a fault.
  - **Acceptance tests:** 10, with Pete's D3 check first. The staging machine and the evidence are defined.
- **`src/services/siteAgent/siteAgentContract.ts` (new, pure)** holds the types and rules, with tests.
- **F3 fixed:** a network report print from the browser threw "Buffer is not defined". On release it left the job `QUEUED` with no retry; on a retry it failed after its retries ran out.
  - Now it fails at once with `NEEDS_SITE_AGENT` (`printing/transport/networkPrintRuntime.ts`, `attemptPrintDelivery.ts`).
  - It is not retried: `retriable: false` goes through `dispatchPrintJob` and `publishReportReleasedEvent` to `scheduleDeliveryRetry`, which dead-letters it at once, with the fallback and the alert.
  - A transport that throws now fails the job.
- **F4 fixed:** the Content-Security-Policy allows the workstation agent (`wss://` and `https://127.0.0.1:9100-9102`) and QZ Tray (`wss://localhost` and `wss://localhost.qz.io`, ports 8181 to 8484, plus its `ws://` ports on plain http). These are loopback only, with `workstationBridges: false` to leave them out (`deploy/security-headers/securityHeaders.mjs`). The configs and `vercel.json` are regenerated.
- **Corrections:**
  - `INTERFACE_TRANSACTIONS.md`: `PRINT_JOB` is a report PDF.
  - `REPORT_DELIVERY_API.md`: print confirmation; Windows shares.
  - `MESSAGE_BUS_API.md`: `print.dispatch` (a key that didn't exist, 4 attempts, the label timer).
  - Readiness review: F3 also failed at release, on `Buffer`; stale CSP lines.
  - `printCassetteSlideLabel.ts` header: the workstation agent route.
- **Independent check:** found 3 high, 10 medium and 7 low issues in the first draft, all corrected (or listed in PS-615). The high ones:
  - auto-retrying labels against Pete's rule;
  - at-most-once printing that couldn't be enforced;
  - an agent that could be pointed at any host.
- **Messages:** none new. The F3 reason is plain English in the job, as other print errors are.
- **Xray:** PS-614 (automated), PS-615 (open points).

## Batch 545 — Interface engine edge contract (D6), finding F10 fixed (PS-539)

- **`docs/architecture/INTERFACE_ENGINE_EDGE.md` (new, phase 2c, decision D6)** is the contract between BridgeLink and the API server. The engine runs hosted or on site, from one image. It covers:
  - **Security:** per-tenant system credentials, with the tenant taken from the credential.
  - **Inbound:** a normalised JSON envelope with MSH-10, 11 and 12, and an event time with an offset. An answer table (200, 409, 422, 401) says what the engine does with every status.
    - Each message is applied once, keyed by tenant, sending system and MSH-10, in the same transaction as the change.
    - Messages are kept in order per key, and stale updates are ignored by event time.
    - A retry limit of 24 hours.
    - A test message is refused on production.
  - **ACK:** accept or application mode, following MSH-15/16 when the sender sets them, with a 30-second limit so a hospital's feed doesn't stall.
  - **Outbound:** pushed to a hosted engine, pulled by an on-site one.
    - Settled by the HL7 ACK. AE and CR fail at once; AR, CE and no answer are resent with the same MSH-10 for 24 hours.
    - Dead letters alert Admin and Lab Director. A dead-lettered result holds the later messages for its case.
    - Fax and file drop are exempt.
  - **Running on site:** signed updates, store and forward, local alerts, backups, NTP and logs.
  - **Health:** `/health/live` and `/health/ready` give the same answers everywhere. A heartbeat gives online, attention, degraded or offline, by the server's clock.
  - **Acceptance tests:** nine, with Pete's D6 check first.
- **`src/services/interfaceEngine/engineEdgeContract.ts` (new, pure)** holds the types and rules, with tests.
- **F10 fixed:** the block-exception and material-location webhooks claimed the `messageId` before applying the change. A 404 (case not there yet) or a failure kept the claim, so the engine's redelivery was answered "already processed" and the event was lost. They now claim inside the case update's own transaction (`api/webhooks/engine/_lib/applyEngineCaseUpdate.ts`).
- **Corrections:** readiness review §6.2 items 3, 4, 7 and 8 had described the edge as already working that way (MSH-10 keys, dead-letter alerts for interface queues, outbound ACK checking, normalised JSON only). Findings F11 (outbound posted from the browser with no credential; one shared webhook secret) and F12 (interface queues have no automatic retry or alert) are added. `FEATURE_OVERVIEW.md` no longer says "a standard message broker" (decision D1).
- **Independent check:** found 7 high, 8 medium and 5 low issues in the first draft. All were corrected, or are listed in PS-613. The main ones:
  - on-site engines needed an inbound connection;
  - resends were swallowed;
  - AR was treated as final;
  - enhanced ACK mode was missing;
  - stale checks used the server's clock;
  - one message could block a key for ever;
  - F10 still lost events on a failed update.
- **Messages:** none new.
- **Xray:** PS-612 (automated), PS-613 (open points).

## Batch 544 — Images and attachments are links only; single-facility QA exports (PS-539)

Two decisions from Pete, Oct 13, 2026.

- **Links only:** "Like all images and file attachments, PathScribe should not store photos itself for labs without imaging systems — it should store links only."
  - **`docs/architecture/BLOB_STORAGE_API.md` rewritten.** PathScribe stores only the files it makes itself: report documents, report versions, held releases and exports. The Batch 543 draft had planned containers for photos (`images`), referral PDFs (`attachments`), `signatures`, `branding`, and an upload area with malware scanning. These were never built, and they are removed (**correction**: they went against this rule).
  - **New §6, links:** https only, the hospital's own system, and how the report renderer may fetch a logo or signature (allowed domains, no private addresses, bytes and hash in the PDF).
  - **New §7, no uploads to keep:** a camera photo passes through to the imaging system.
  - **Organ-map PNGs stay:** PathScribe draws them, so they are its own output.
  - **Staff signature (the one image PathScribe did keep):** Configuration → Staff now takes an https link to the signature image (`SignatureLink`), not a file read into a data URL.
    - `staff/staffFormChecks.ts`: `isHttpsLink` refuses `data:`, `http://`, credentials and single-label hosts; problem `invalidLink`; `signatureLinkOnOpen` opens an old image signature empty, with a note, so the record can still be saved.
    - The preview loads only once the field is left.
  - **Guard:** `phase2cContracts.guard.test.ts` fails if any screen takes an image file again, or the contract plans an image or attachment container.
  - **Readiness review** row 21, §11 and the diagram are corrected.
- **Single-facility QA exports:** "QA exports should allow single-facility export instead of forcing 'all facilities'."
  - New `services/qualityAssurance/qaScopeRows.ts`:
    - rows are placed by their own facility, else by their case's ordering facility;
    - a row whose facility can't be told appears only enterprise-wide;
    - `defaultQaScope`: someone assigned to one facility opens on it;
    - `qaScopeFacilityOptions` always offers the facility in force;
    - `qaExportFilename`;
    - `scopeLabel` moved here.
  - New hook `hooks/useQaCaseScope.ts`: holds the scope and loads the cases. A cross-tenant read is audited.
  - The scope picker is added to:
    - Follow-up not received;
    - FPPE (facilities only, as assignments carry no case);
    - Inspection Mode;
    - QA Dashboard;
    - Deficiencies (active and closed, with their tiles);
    - Billing deficiencies (with their tiles).
  - Each export is checked for the one facility chosen (`qaScopeContext`), and the file is named for it.
  - Still "all", with reasons in `ASYNC_EXPORT_API.md` §2: the enterprise rollup, management reviews and patient match review.
  - `asyncExportContract.ts`: the scope comment is updated.
  - `quality/resolveQaEvidenceBinder.ts`: the binder file name names the scope.
- **Independent check:** found 3 high, 7 medium and 5 low issues, corrected (remaining limits in PS-610). The main ones:
  - organisation scope with facility-only rows;
  - a facility-limited user opening on a refused "all";
  - the picker showing a different scope from the list;
  - tiles not matching the scoped lists;
  - an unaudited cross-tenant case read;
  - link checks and renderer fetch rules;
  - old signatures blocking a save;
  - over-stated doc claims.
- **Messages:** `staffTab.signatureLink.{alt,hint,label,placeholder}`, `staffTab.validation.{invalidLink,signatureNeedsLink}` (5 languages; Korean wants native review). `staffTab.signatureUpload.*` removed.
- **Xray:** PS-609 (automated), PS-610 (open points).

## Batch 543 — CSV formula injection fixed (F8), disposal export audited (F9), file storage contract (PS-539)

- **F8 fixed (security):** `utils/csv.ts` gains `neutralizeFormula`, `csvField` (now exported) and `csvQuoted`.
  - A text cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading apostrophe, so Excel shows it as text instead of running it (OWASP "CSV injection").
  - Numbers and number-like text ("-5", "+1.5") are unchanged. A value already starting with apostrophes before such a character gets one more.
  - `parseCsvRows` removes one apostrophe again, so an export re-imports exactly.
  - Every CSV writer now uses it: `toCsv`, `csvExport.buildMetaHeader`, `search/caseSearchCsv.ts`, and the Audit Log, Billing Log and Action Registry exports.
  - The Action Registry import now parses each line as CSV (`parseCsvRows`). Before, it stripped every quote, so a label containing a quote was reported as changed.
- **F9 fixed:** the disposal report export is recorded as `DOCUMENT_EXPORTED`, with the file name, row count and facility (`retentionPolicy/exportDisposalReport.ts`).
- **`docs/architecture/BLOB_STORAGE_API.md` (new, phase 2c):** file storage behind `IBlobStore`.
  - Every place a file lives today, organ-map PNGs and staff signatures included, and its server container.
  - Per-blob locks set after the record commits: version-level immutability on Azure; Object Lock in governance mode on S3 and MinIO.
  - Browser uploads go through a staging container with a malware scan.
  - Retention classes per jurisdiction, legal hold and disposal.
  - Read links valid for 15 minutes, integrity checks (`DOCUMENT_INTEGRITY`), and contract tests.
- **Corrections:**
  - `REPORT_DOCUMENT_STORE_API.md` now gives the order of writing: bytes, then record, then lock.
  - Readiness review row 21: photos aren't base64 in the browser; they go to the lab's imaging system.
- **Independent check:** found 3 high, 7 medium and 5 low issues in the draft and the code, all corrected (or kept as noted in PS-605).
- **Messages:** none new. CSV cells may now show a leading apostrophe in Excel (documented in `GUIDE_UPDATES.md`).
- **Xray:** PS-604 (automated), PS-605 (open points).

## Batch 542 — Phase 2c contracts: jobs and events (D1), asynchronous exports (D7) (PS-539)

Two contracts for the India team, from Pete's Oct 13 decisions. Docs and a pure wire-contract module; nothing in the running app changes.

- **`docs/architecture/MESSAGE_BUS_API.md` (new, D1).** The API server's events and jobs in SQL Server tables behind `IMessageBus`:
  - the C# interface;
  - the tables;
  - claiming without blocking (`READ_COMMITTED_SNAPSHOT ON`, `READPAST` on the claim only);
  - leases with fencing;
  - retries with backoff, and dead letters shown where staff already look;
  - cooperative cancellation;
  - job kinds with per-kind ordering keys, and the recurring jobs that replace each browser stand-in (review §7);
  - monitoring;
  - retention.

  The contract tests (§8) are Pete's check: one suite, run against every implementation. It is honest about what a RabbitMQ adapter would really involve.
- **`docs/architecture/ASYNC_EXPORT_API.md` (new, D7)** and **`src/services/exports/asyncExportContract.ts`** (its source of truth):
  - 26 export kinds, one per export capability, each scoped as it is checked today;
  - endpoints;
  - the build job (snapshot, streaming, CSV formula-injection protection, audit);
  - no extra click for a quick export, and a notice for a long one (`ExportStatus` on the hub);
  - blob storage with 7-day retention, and 15-minute user-delegation SAS links;
  - acceptance tests, with Pete's check first.
- **`LIVE_UPDATES_SIGNALR.md`:** `eventId` is the outbox `MessageId`; §13 adds `ExportStatus`.
- **`DEPLOYMENT_READINESS_REVIEW.md`:**
  - D1 and D7 link their contracts;
  - §9 adds two 2d items;
  - new findings, disclosed and not fixed:
    - **F8:** the browser's CSV writer doesn't neutralise formula cells;
    - **F9:** the disposal report export isn't audited.
- **Guards:**
  - `phase2cContracts.guard.test.ts` (new) checks that the contracts cite real files, that every review §7 job has a place, and that the export kinds equal the catalog's export capabilities;
  - the review guard now also keeps F8 and F9 listed.
- **Independent check:** found 3 high, 9 medium and 6 low issues in the drafts, all corrected:
  - a delayed job held up its whole ordering key;
  - the claim query blocked;
  - the disposal export audit was claimed but doesn't exist;
  - the enterprise rollup scope was wrong;
  - running exports couldn't be cancelled;
  - leases had no fencing;
  - the RabbitMQ claim was overstated.
- **Xray:** PS-602 (automated), PS-603 (open points).

## Batch 541 — Hosting decisions recorded (PS-539 phase 2b)

Pete decided the six open hosting decisions on Oct 13 (D2 on Oct 12). `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` §13 now records each decision and the check Pete asked for before it is relied on:
- **D1:** jobs and events in SQL Server tables behind an interface (`IMessageBus`); RabbitMQ as an adapter if load testing needs it; HL7 in the engine's own store. Check: the interface swaps implementations cleanly.
- **D3:** on-site agent v1 = report and label printers, Windows shares; instruments in v2; BridgeLink on site only on request. Check: staging-machine test of print routing and share pickup.
- **D4:** reviewed scripts applied by the pipeline, never at start-up; tool chosen with the India team, compatible with zero-downtime deployment and API versioning. Check: pipeline log shows scripts ran before the API starts.
- **D5:** hosting chosen by the certifications the first customers need (BAA, HDS, C5). Check: compliance baseline before tenant data.
- **D6:** BridgeLink hosted per region or in the hospital, one container image. Check: identical health checks.
- **D7:** "request it, get notified, download it" export contract now, in 2c. Check: a large mock export job with notification and secure link.

The review's guard test now requires every decision row to say Decided and carry its check. Docs only; no code changes.

**Xray:** PS-600 (automated), PS-601 (Pete's verification points).

## Batch 540 — No correction or addendum during the release delay (PS-539)

Pete, Oct 12, 2026 ("Why not block that flow during the delay period?"), answering the question left open by the Batch 538 review: a revision released while the case was in its sign-out buffer was rendered with the case still `pending-release`, so its PDF carried the release-buffer watermark, and that file went out when the delay ended.

- **`services/reportRelease/revisionDuringDelay.ts` (new).** While a report is in its release delay nothing has been sent, so a correction or addendum is refused; the report is recalled instead. "In its delay": a case in its sign-out buffer, or a held original report (surgical sign-out, cytology case report, finalized early or a late specimen, autopsy). A held revision or preliminary doesn't count.
- **Enforced in the services:** `mockAmendmentService.startDraft` (every surgical and Assist correction, amendment and addendum), `releaseCytologyCorrection` and `releaseCytologyAddendum` (`inReleaseDelay`). The report page also checks before adding an addendum workup to a finalized case.
- **At the source too:** a released PDF (`final-snapshot`) never carries the release-buffer watermark (`resolveReportWatermark.ts`); a print during the delay still does. This also covers an Assist correction, which is released by re-finalizing and can put the case back in its buffer first.
- **Messages (en/fr/de/nl/ko):** `useAmendmentWorkflow.toast.inReleaseDelay`, `cytologyRevision.toasts.inReleaseDelay`.
- **Docs:** `docs/product/REPORT_RELEASE_DELAY.md`, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`.
- No new clicks; one action that shouldn't be taken is refused with a message.
- **Xray:** PS-591 (automated), PS-592 (open verification points).

## Batch 539 — Cytology report PDFs from the report renderer (PS-539 D2)

Pete, Oct 12, 2026: "PDF that leaves PathScribe, and the browser only shows previews. As long as the preview matches exactly what gets sent out." Batch 538 stored one document per release; this batch moves the last browser-drawn PDF, cytology, to the server.

**Server (`functions/`):**
- `cytology_report.py` (new): `render_report` with `"template": "cytology"` lays out lines the browser composed. A4, 15 mm margins checked against the 0.5 inch minimum; Liberation Sans embedded (moved from the browser as `.ttf`) or Pretendard for Korean, chosen per document; each document on a new page; accession barcode on each report's first page; continuation line with Page X of Y in the document's language; headings kept with their first line; the addendum on its own page when the lab says so; typed line breaks kept; optional watermark; the same bytes for the same request (creation date = signing time, fixed ID).
- Each PDF carries `pathscribe-template:cytology` in its Keywords. Text output is refused for cytology (400).
- `test_main.py`: 7 new test functions; 148 checks pass.

**Browser:**
- `services/cytology/cytologyRenderPayload.ts` (new, pure): every line of a report in its language and date format, in the order the jsPDF renderer printed them; the case report (first page, then each specimen in its own language). One builder for preview and release; only an unsigned preview adds PRELIMINARY — SUBJECT TO CHANGE.
- `services/cytology/renderCytologyPdf.ts` (new): posts to the renderer, fetches a letterhead logo, refuses a PDF without the cytology marker (an older deployment would answer with a blank surgical page), so a release is held instead.
- Now through the renderer: the sign-out snapshot, the preliminary, the consolidated case report (one request, no pdf-lib merge), corrections and addenda, the workspace print and preview, and the retry of a per-specimen message.
- **Print case report** on a released case opens its stored case document byte for byte.
- `services/reports/reportRenderer.ts` (new): the renderer's address, shared by the report page, Assist and cytology.
- Cytology release documents are `producedBy: report-renderer`.
- Workspace print opens its tab at the click (no popup block) and shows a message on failure: `cytologyScreening.printFailed`, `cytologyScreening.printRendererOutdated` (en/fr/de/nl/ko).

**Removed** (`DELETED_FILES.txt`): the jsPDF cytology renderer, its worker, and the browser rendering helpers in `documentRendering/` (continuation headers, deterministic metadata, barcode, header logo, print fonts, embedded fonts, layout governance), with their tests. The `jspdf` package stays in `package.json` until the dependency clean-up.

**Independent review** found 2 high issues (the logo field name differed between browser and server, so logos never printed; typed line breaks were lost) and 1 medium (a mixed-language case report used one font and one page label); all fixed, with tests, including a check that the browser's field names are the ones the server reads.

**Deploy:** `functions/` must be redeployed (India team) before this zip is used. Until then every cytology print says the renderer hasn't been updated and releases are held.

**Open:** embedded images (`imageAssociations`) are not drawn (nothing sets them); small spacing differences from the old layout; signed-specimen print re-renders from the record (same text); native-speaker review of the new messages; F1, F3, F4.

**Xray:** PS-589 (automated), PS-590 (open verification points).

## Batch 538 — One stored report document per release (PS-539 D2)

Pete, Oct 12, 2026: "PDF that leaves PathScribe, and the browser only shows previews. As long as the preview matches exactly what gets sent out."

**New: `services/reportDocuments/`.** A released report is rendered once and stored as a report document with the SHA-256 of its bytes (`sha256HexBytes`). No update or delete; a read rechecks the hash and refuses a mismatch (`integrity`). `captureReleaseDocument` stores once per release; `documentPdf` turns a stored document into a channel's PDF and keeps its id on failure, so no caller substitutes another PDF. Browser store: key `report_documents` (cleared by demo reset). Contract for the API server: `docs/architecture/REPORT_DOCUMENT_STORE_API.md`.

**Every channel sends the stored bytes:**
- `publishReportReleasedEvent`: `releaseDocument(event)` makes and stores the document before any channel; its id goes on the event, the delivery release context, retries and fallbacks. `sendReleaseFallback` sends the release's document; a release from before this batch keeps the old non-storing path.
- Result messages (`resolveOruReportPdf`, `prepareOruR01Dispatch`, the dispatchers): queue entries record `reportDocumentId` and `pdfSha256`; a retry sends that document. An unreadable document is held, never replaced. `savedReportPdf` uses the newest saved version only.
- Cytology case report, correction, addendum and preliminary: the message carries the release's document (before, the case message drew its own PDF). The worker fallback now passes the report's labels (it printed English).
- Assist structured results (LIS sync, case PDF): stored as documents; a retry rebuild reads them.
- Fax and file drop (`deliverReport`): a resend reads `release.documentId`; `REPORT_DELIVERY` carries the id and hash. **Fixes:** a correction's retry sent the pre-correction sign-out; a preliminary's retry was held for good.
- Print: the job records the document and keeps no second copy; reprint reads it.
- Release delay: the bytes stay on the hold and are stored when the delay ends, so a recalled report leaves no document.

**Preview matches release.** Print uses the release's payload builder (`buildReportRenderPayload(format, purpose)`); only the watermark differs (`resolveReportWatermark.ts`: PRELIMINARY before sign-out). The watermark is resolved before the build, so the browser-print fallback keeps it. `performingFacilityId` added to the no-buffer FINAL and Assist events.

**Version History → Released documents:** each document with type, release time, how it was made and its short SHA-256; **View as sent** opens the stored bytes after the print check, audited as `report-document`. Dates now use the user's locale.

**Locale keys (en/fr/de/nl/ko):** `versionHistoryModal.sentDocuments.*` (title, intro, line, hash, viewAsSent, integrity, notFound, types.*, producers.*).

**Docs:** `REPORT_DOCUMENT_STORE_API.md` (new), `REPORT_RENDERING_SERVICE.md` §6, `DEPLOYMENT_READINESS_REVIEW.md` (D2 decided; F6 corrected: surgical PDFs had the same storage gap).

**An independent review** of this batch found three high and six medium issues; all fixed except one question for Pete (below).

**Open, disclosed:**
- Cytology is still drawn in the browser until the server template (next batch; `functions/` redeploy by the India team).
- Server storage and endpoints are a contract only.
- Entries queued before this batch, per-specimen cytology messages and releases whose PDF failed carry no document; their retries behave as before.
- All documents share one browser storage entry (size limit applies).
- The Assist result's signed time is the build time, not the sign-out time.
- Question for Pete: a report released during pending-release stores the release-buffer watermark in its document (existing behaviour).
- F1, F3, F4 from Batch 537 still open.

**Xray:** PS-587 (automated), PS-588 (open verification points).

## Batch 537 — Deployment readiness review (PS-539, phase 2a)

**`docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`** (new). Cloud-agnostic, per Pete's Oct 10 direction. Contents:
- the inventory (no server code exists yet);
- 25 server components, each rated: ready, needs changes, always-on, on-site, or retire;
- the database rules: no auto-pause in production, size by workers, schema changes never at start-up;
- SignalR: hub logic in the API, scaled through Azure SignalR Service (Default mode) or Redis with sticky sessions;
- the interface engine (BridgeLink, a Mirth fork) as the MLLP edge;
- Pete's three MLLP patterns checked against current documentation. The Logic Apps HL7 connector is still in preview and encode/decode only.
- the rules for the edge: ACK after a durable write, ordering, idempotency, dead letter, TLS or VPN, a fixed IP;
- the on-site agent;
- 12 browser stand-ins for server jobs;
- the latency budget: 800 ms general, under 500 ms for OR boards;
- the browser changes for 2d;
- a market and hosting table covering 14 markets;
- cost drivers;
- 11 changes, ranked;
- decisions D1 to D7;
- findings F1 to F7;
- sources and diagrams.

Provider facts were checked against the providers' pages on Oct 12. An independent check found 12 errors, all corrected. Among them: the contract makes Azure SignalR Service the Azure option, not self-hosting.

**Findings disclosed, not fixed:**
- F1: a dead Firestore hook.
- F2: three screens on Firestore with placeholder credentials.
- F3: network printing reaches Node `net` from the browser sweep.
- F4: the CSP omits the local print bridges.
- F5: Assist polling and print-batch aggregation have no scheduler.
- F6: cytology PDFs are browser-only.
- F7: client-measured CLIA screening time.

**Test:** `deploymentReadinessReview.guard.test.ts`. Every file the review cites must exist, and the decisions and findings must stay.

**Docs:** `docs/architecture/README.md`, `REPORT_DELIVERY_API.md` (pointer), `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`, READMEs to the root.

**Xray:** PS-585 (automated) and PS-586 (open points).

**Verified.** Type-check clean; lint clean on the changed file. Full suite: 1,115 files: 1,110 pass, 4 skipped, 1 fails (`firestore.rules.test.ts`, emulator, unrelated); 9,416 tests pass, 32 skipped (+3).
