# Guide updates: what changed, for the guides, training, marketing and RFPs

*Started Oct 11, 2026 (Pete: "make sure we are capturing all the capabilities so that the admin, user, guides, training, marketing teams will know how the system operates. That will simplify the RFP process.").*

One entry per batch that changes what someone sees or can do, newest first. The User Guide and Admin Guide are PDFs edited outside this repository (`public/help/`). This file tells their owners what to add. Each entry has:

- **What changed:** in plain words.
- **Who:** the roles affected.
- **User Guide / Admin Guide:** the section to add or change.
- **Training:** what to show.
- **Marketing / RFP:** one line, and the standards it supports.
- **Status:** Live, Partial or Planned.

The full capability list by area is [`FEATURE_OVERVIEW.md`](FEATURE_OVERVIEW.md); permissions are in [`../architecture/AUTHORIZATION_API.md`](../architecture/AUTHORIZATION_API.md). Entries before Batch 521 are being backfilled (see the end of this file).

---

## Batch 580: styled dropdown lists
- **What changed:** in Chrome and Edge, every dropdown's open list is a styled panel in the app's colours, with the current choice marked; dropdowns keep their usual width. Firefox and Safari keep the dark list until they support the styled one.
- **Who:** everyone.
- **User Guide:** none (screenshots taken in Chrome or Edge will show the new list).
- **Admin Guide:** "Supported browsers": Chrome, Edge and Firefox, current versions.
- **Training:** none.
- **Marketing / RFP:** "Supported browsers: Chrome, Edge and Firefox (current versions)."
- **Standards:** WCAG 2.1 AA (the browser's own keyboard and screen-reader behaviour is kept).
- **Status:** Live.

## Batch 579: template reviewer guide; billing codes saved at once
- **What changed:** Configuration → Protocols → Review Queue → a template: a short "How to review this template" guide (open while it is in review; fold it and it stays folded), comment boxes that match the dark screen and name their question, an Add button, and Reset to Draft moved to the end of the row (unavailable in Draft). Case report: adding, removing or correcting a specimen's billing code, and the Sequencer's specimen order, are now saved immediately (they were lost on reload). A billing code is either saved with its charge or not at all.
- **Who:** template reviewers and approvers; pathologists and billing staff on the case report.
- **User Guide:** Case report → Billing codes ("saved as you make them"); Sequencer (the specimen order saves at once; the report order with Save Draft).
- **Admin Guide:** Protocols → Reviewing a template (the guide; comments; Reset to Draft).
- **Training:** show a reviewer the guide and how to comment and resolve.
- **Marketing / RFP:** "Guided, audited template review with independent sign-off."
- **Standards:** ISO 15189 control of documents (reviewed and approved before use); WCAG 2.1 AA.
- **Status:** Live.

## Batch 578: the workload cap screen's errors and pickers
- **What changed:** Configuration → Cytology → Workload cap: a cap that isn't saved is explained under its own field, not at the top of the screen. "+ Add Override" lists only the facilities or people who don't have an override yet, and is unavailable, with a short note, once everyone has one.
- **Who:** lab administrators.
- **User Guide:** none.
- **Admin Guide:** Cytology → Workload cap: adding overrides (one per facility or person; remove one to set it again).
- **Training:** none.
- **Marketing / RFP:** none.
- **Standards:** WCAG 2.1 AA 3.3.1 (Error Identification), 1.3.1.
- **Status:** Live.

## Batch 577: "Use their version" without a reload; presence in the tab bar
- **What changed:** Case report: the "Someone else changed this case" box's **Reload their version** is now **Use their version**: their saved case appears at once, in place, and what you hadn't saved is discarded (the box says so). After **Show their changes** or **Use their version**, everything on the page is up to date with their save, including the synoptic form's answers, deficiencies, versions, signatures, the amendment banner and the report preview. "Who else has the case open" now sits at the right of the tab bar and no longer pushes the page down when someone opens the case.
- **Who:** everyone who edits case reports.
- **User Guide:** Case report → "When someone else saves the case" (Use their version replaces Reload; where the presence chips are).
- **Admin Guide:** none.
- **Training:** show both choices: Show their changes keeps your work; Use their version discards it.
- **Marketing / RFP:** "Two people on one case never lose track of each other's saved changes, and the page never reloads under them."
- **Standards:** WCAG 2.1 AA.
- **Status:** Live in the demo; through the server, Partial (phase 2e).

## Batch 576: workload cap limits; "editing" shown at once
- **What changed:** Configuration → Cytology → Workload cap: caps must be whole numbers from 1 to 100 slides (the screen says so instead of not saving); changing a person's own cap needs the workload-cap permission. Case report: someone who starts editing right after opening a case now shows as "editing" to others straight away.
- **Who:** lab administrators (caps); everyone editing case reports (presence).
- **User Guide:** none (behaviour as described earlier).
- **Admin Guide:** Cytology → Workload cap: the 1–100 range and the permission for personal caps.
- **Training:** none.
- **Marketing / RFP:** "Workload caps can't be set beyond CLIA's limit."
- **Standards:** CLIA 42 CFR 493.1274(d)(2).
- **Status:** Live.

## Batch 575: "Show their changes" without a reload
- **What changed:** Case report: the "Someone else saved this case" notice offers **Show their changes** instead of Reload. Their changes appear in place; what you typed and haven't saved stays on top. If you both changed the same part, your version stays as typed, a note says so, and your next save asks which to keep. The Edit Conflict dialog now says that reloading may lose unsaved work.
- **Who:** everyone who edits case reports.
- **User Guide:** Case report → "When someone else saves the case" (replace the Reload step).
- **Admin Guide:** none.
- **Training:** two windows on one case; change something in one, type without saving in the other, then Show their changes.
- **Marketing / RFP:** "Concurrent edits are merged in place, field by field, without losing unsaved work."
- **Standards:** supports CAP and ISO 15189 expectations for controlled report editing; WCAG 2.1 AA (4.1.3 status messages).
- **Status:** Live in the demo; between users, Partial until the server's live hub (phase 2e).

## Batch 574: workload counter; night-shift sign-off; correction reasons; edits no longer count twice
- **What changed:**
  - Cytology worklist and screening page: a **workload counter** for the last 24 hours: slides counted of your cap, reviews, slides left now (the limit grows with hours screened) and left in a full 8-hour day, with a bar marked at the limit so far. It turns amber near the limit and says "At your limit" when the next review wouldn't fit. On the screening page it updates after each saved review.
  - **Night shifts:** yesterday's screening hours can be signed off too, while they still need it (they show above today's, with the date). Each panel shows its date.
  - Configuration → Cytology → Workload cap: **"Screening day starts at"** (midnight by default; 6:00 AM keeps a 10 PM–6 AM shift on one date). A change applies from then on; earlier days keep the start in force at the time. Audited.
  - Workload report (CYT-QA-05): the **reason for a correction** (and the note) beside the hours; dates in the user's format.
  - **Correction:** editing a saved review no longer counts its slide again toward the limit (only an escalation's extra weight counts).
- **Who:** cytotechnologists (counter, sign-off); cytology supervisors (report); lab administrators (start of day).
- **User Guide:** Cytology worklist → "Your workload" and "Signing off your screening hours" (yesterday's panel; the note is shown to your supervisor, no patient details).
- **Admin Guide:** Cytology → Workload cap → "Screening day starts at" (capability `config:cytology-workload-cap:manage`; applies from the change on).
- **Training:** show the counter rising after a review, the limit marker moving as hours accrue, and a night-shift worker confirming yesterday then today.
- **Marketing / RFP:** "Cytotechnologists see their CLIA workload and what's left in real time; night shifts are recorded on the right day; supervisors see why hours were corrected."
- **Standards:** CLIA 42 CFR 493.1274 (workload limits and records, US); CAP cytopathology checklist; WCAG 2.1 AA (status in words, not colour alone).
- **Status:** Live in the demo; with the API server, Partial until the server's endpoints exist (phase 2e).

## Batch 573: who else has the case open
- **What changed:** Case report: above the tabs, a line shows anyone else who has the same case open, whether they are **editing** (have unsaved changes) or **viewing**, and links to email or call them when the lab's staff directory has their work details. If you have the case open in a second window yourself, it shows "You, in another window". It disappears when nobody else is there. Nothing to click or dismiss.
- **Who:** everyone who opens case reports.
- **User Guide:** Case report → "Working on a case with others" (with Batch 572's "Someone else saved this case").
- **Admin Guide:** none in the browser. Server installations: the live hub must be set up (phase 2e); which contact details show comes from the staff directory.
- **Training:** open the same case in two windows (or two people); show the line, start typing in one and show "editing" in the other; close one.
- **Marketing / RFP:** "See who else is working on a case, and whether they're editing, before your changes collide."
- **Standards:** WCAG 2.1 AA (4.1.3 status messages); supports CAP and ISO 15189 expectations for controlled report editing.
- **Status:** Partial: works between windows of one browser in the demo; between users once the server's live hub is in place (phase 2e).

## Batch 572: "someone else saved this case"; end-of-day screening hours sign-off
- **What changed:**
  - Case report: when another user saves the case you have open, a notice above the tabs says so, with Reload and Later (no window to dismiss). Previously you found out only when your own save was refused.
  - Cytology worklist: a "Today's screening hours" panel. One click confirms the recorded hours at the end of the day; Correct takes the hours, a quick-pick reason and an optional note (required for "Other"). If more screening is recorded after you confirm, the panel asks you to confirm again.
  - QA → Cytology QA → workload report (CYT-QA-05): new "Recorded hours" column; the hours column shows signed-off or not signed off (or signed off before more was recorded), and flags corrections the supervisor should look at.
  - The workload limit no longer rises above a person's assigned cap for a day longer than 8 hours (a correction).
- **Who:** pathologists, fellows, residents and cytotechnologists (sign-off); cytology supervisors (report); everyone who edits cases (notice).
- **User Guide:** Case report → "When someone else saves the case"; Cytology worklist → "Signing off your screening hours".
- **Admin Guide:** Roles → new capability "Sign off your screening hours" (`cytology:screening-hours:sign-off`), given to the four built-in roles only; a lab's own roles need it added deliberately. QA → workload report columns.
- **Training:** open the same case in two tabs, save in one, show the notice in the other. On the Cytology worklist, confirm the hours; then show a correction with a reason, and how the supervisor sees it.
- **Marketing / RFP:** "Concurrent editors are told at once when a case changes. Screening hours are confirmed daily by each screener and never taken from the browser's clock alone, with corrections flagged for supervisors."
- **Standards:** CLIA 42 CFR 493.1274 (cytology workload limits, US); CAP cytopathology checklist (workload records); ISO 15189 (records of examination personnel workload).
- **Status:** Partial: the notice works between tabs in the demo and through the server's live hub once it exists (phase 2e); the sign-off is live, with recorded hours from the browser's timer until the server records screening events (phase 2e).

## Batch 570: keyboard focus after deleting a saved search
- **What changed:** Search and Billing logs: deleting a saved search or query with the keyboard (or a screen reader) moves focus to the next one, or to "Save search / query". The inbox does the same, now also with a screen reader in Firefox.
- **Who:** anyone using a keyboard or screen reader.
- **User Guide:** none (same steps).
- **Admin Guide:** none.
- **Training:** the QC team's manual screen reader test plan (NVDA and VoiceOver) can double as a keyboard walkthrough for accessibility training.
- **Marketing / RFP:** "Tested with automated WCAG 2.1 AA checks on every build, and a scripted manual test plan for NVDA and VoiceOver."
- **Standards:** WCAG 2.1 AA (2.4.3 focus order).
- **Status:** Live.

## Batch 569: keyboard focus after a delete; saved-search chips
- **What changed:**
  - Inbox: deleting or restoring a message with the keyboard moves focus to the next message.
  - Search and Billing logs: a saved search's name loads it; its × deletes it (both reachable with Tab, each read with its own name).
  - Case report (collapsed specimen list): the yellow "changes to review" dot is its own button.
- **Who:** anyone using a keyboard or screen reader.
- **User Guide:** none (same steps).
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "Keyboard focus is kept in place after deleting, so keyboard and screen-reader users don't lose their place."
- **Standards:** WCAG 2.1 AA (2.4.3 focus order, 4.1.2 name, role, value).
- **Status:** Live.

## Batch 568: the rest of PathScribe's clickable rows with a keyboard or screen reader
- **What changed:**
  - Protocols → Terminology alerts: the title shows or hides the list (click or Enter).
  - Enhancement request: the screenshot's full-size view closes with Escape, and keyboard focus stays in it while open.
  - Template builder: Tab to a field shows its Remove button.
  - Contribution: the teaching tile's title opens it.
  - Everything else looks and works as before.
- **Who:** anyone using a keyboard or screen reader; template builders; residents.
- **User Guide:** Enhancement request: "Press Escape to close the full-size screenshot."
- **Admin Guide:** Template builder: "Tab to a field to show its Remove button."
- **Training:** none.
- **Marketing / RFP:** "An automatic check on every build stops a control being placed inside another, across the whole application."
- **Standards:** WCAG 2.1 AA (2.1.1 keyboard, 2.4.3 focus order, 4.1.2 name, role, value).
- **Status:** Live.

## Batch 567: the inbox and the report editor's windows with a keyboard or screen reader
- **What changed:**
  - Inbox: a message's sender is a button that opens it; Tab into a message shows its Delete (or Restore) button.
  - Add code: each suggestion and search result has an "Apply code" button at its end; once applied, "✓ ×n" applies it again. Clicking the row still works.
  - Delegate: a delegation type's name is a button. Billing review: a pending code is a button. Sequencer: a report's name is a button.
  - Protocol changes: click anywhere on a proposed change to tick or untick it.
- **Who:** pathologists, billing reviewers, anyone using a keyboard or screen reader.
- **User Guide:** Add code: "Click a code, or its Apply button, to apply it; click ✓ to apply it again." Inbox: "Tab to a message and press Enter to open it."
- **Admin Guide:** none.
- **Training:** none beyond the lines above.
- **Marketing / RFP:** "The report editor and inbox can be used fully from the keyboard and with a screen reader; checked automatically on every build."
- **Standards:** WCAG 2.1 AA (2.1.1 keyboard, 2.5.3 label in name, 4.1.2 name, role, value).
- **Status:** Live.

## Batch 566: cytology rows and view tiles with a keyboard or screen reader
- **What changed:**
  - Cytology worklist: the patient's name in each row is a button that opens the case. Keyboard users Tab to it and press Enter; screen readers read it as a button, separately from the row's own buttons (Manage flags, Ask a colleague). Clicking anywhere on the row still opens the case.
  - The Worklist's LIS and Outreach tiles and Batch Management's stage tiles tell screen readers which one is on.
- **Who:** cytotechnologists and cytopathologists; anyone using a keyboard or screen reader.
- **User Guide:** Cytology worklist: "Click a row, or its patient's name, to open the case; with the keyboard, Tab to the name and press Enter."
- **Admin Guide:** none.
- **Training:** none beyond the line above.
- **Marketing / RFP:** "Worklists can be used fully from the keyboard and with a screen reader; checked automatically in a real browser."
- **Standards:** WCAG 2.1 AA (2.1.1 keyboard, 4.1.2 name, role, value).
- **Status:** Live.

## Batch 565: easier-to-read text everywhere; selected tiles announced
- **What changed:**
  - Secondary grey text across the rest of PathScribe is a little brighter (WCAG 2.1 AA), as are chart axis labels and a selected filter tile's label. Inactive tiles look as before.
  - Screen readers now say which filter tile is selected (Worklist, Quality Assurance, cytology).
  - Cytology: "Manage flags" no longer also opens the case.
- **Who:** everyone.
- **User Guide:** screenshots may look slightly brighter; no steps change.
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "PathScribe's screens and their selected states are checked automatically for WCAG 2.1 AA in a real browser."
- **Standards:** WCAG 2.1 AA (1.4.3 contrast, 1.4.11 non-text contrast, 4.1.2 name, role, value).
- **Status:** Live.

## Batch 564: easier-to-read text on 13 screens
- **What changed:**
  - Secondary grey text, table headings, some coloured labels and the red count badges are a little brighter, so they meet WCAG 2.1 AA contrast: the Audit Log, batch management screens, Grossing, Contribution, the Cytology worklist, Quality Assurance, Registry exceptions and Slide distribution.
  - An old grossing link (made before case links used support references) now opens grossing, not the report editor.
  - Printing a batch window prints its title and barcode in black.
- **Who:** everyone.
- **User Guide:** screenshots of these screens may look slightly brighter; no steps change.
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "Every main screen is checked automatically for WCAG 2.1 AA in a real browser."
- **Standards:** WCAG 2.1 AA (1.4.3 contrast).
- **Status:** Live.

## Batch 563: loading messages and Audit Log tabs easier to read
- **What changed:**
  - When PathScribe is slow to open a page, "Still loading" now stays on screen until the page arrives, instead of disappearing and coming back.
  - The Audit Log's tab buttons, and the Cancel button in the "unsaved changes" window, have stronger text contrast (WCAG 2.1 AA).
  - Checked in a browser: the "Offline" and "Reconnected" banner appears without taking the cursor or covering any control, and is announced politely to screen readers.
- **Who:** everyone; administrators (Audit Log).
- **User Guide:** none (behaviour as already described).
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "Connection and loading states are checked automatically for WCAG 2.1 AA in a real browser."
- **Standards:** WCAG 2.1 AA (1.4.3 contrast, 4.1.3 status messages).
- **Status:** Live.

## Batch 562: the Molecular Order Queue updates as things change
- **What changed:**
  - With the PathScribe server's live updates, the Molecular Workcenter's Order Queue shows results from the instrument or reference lab, and other technologists' changes, as they happen. Orders that leave the queue meanwhile drop out of what you had ticked.
  - The Print Queue's site agent line also updates as soon as an agent's status changes.
  - **Nothing changes in the demo.**
- **Who:** molecular technologists; print and system administrators.
- **User Guide:** Molecular Workcenter, Order Queue: the list updates by itself; ticked orders that someone else has plated are unticked.
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "Molecular work queues update the moment results arrive from the instrument or reference lab."
- **Standards:** none specific.
- **Status:** browser side done; the server's live-update events are phase 2e.

## Batch 560: screens that update as things change
- **What changed:**
  - With the PathScribe server's live updates, these screens change as soon as something happens instead of on a timer: the inbox, Facility Ops wall boards, the held reports banner on a case, the Engraver Monitor, the registry exceptions badge, Site agents and Interfaces → Engines.
  - Each still checks once a minute in case an update was missed, and refreshes as before (every 5 to 60 seconds) when live updates aren't available: the demo, a password sign-in, a wall board with nobody signed in.
  - Facility Ops shows "out of date" after two minutes without news while live (a quiet minute is normal), 40 seconds otherwise.
  - The Engraver Monitor's Refresh button no longer flickers on background updates.
  - **Nothing else changes in the demo.**
- **Who:** everyone with the inbox; lab managers (Facility Ops, engravers); administrators (site agents, interfaces, registry exceptions); pathologists (held reports).
- **User Guide:** the inbox and held reports: new messages and recalls show at once.
- **Admin Guide:** Facility Ops (the "out of date" timing); live updates need SSO sign-in.
- **Training:** none.
- **Marketing / RFP:** "Work queues, wall boards and alerts update the moment something changes, over one secure connection per window, with automatic fallback to regular refresh."
- **Standards:** none specific.
- **Status:** browser side done; the server's live-update events are phase 2e.

## Batch 559: result messages held when a version can't be counted; live-update groundwork
- **What changed:**
  - With the PathScribe server, a result message whose workup version can't be worked out (the server's list of report versions couldn't be read) is held with the reason "the workup version is not known" and sent when retried, instead of going out with a wrong version number.
  - Every result message carries its report PDF's fingerprint (SHA-256) when PathScribe knows it, so the receiving system can check it.
  - Groundwork only, nothing visible yet: the way the server will push changes to the screens that refresh on a timer (Batch 560 switches them over).
  - **Nothing changes in the demo.**
- **Who:** interface administrators (failed messages).
- **User Guide:** none.
- **Admin Guide:** failed messages: the new held reason, which clears on retry once the server can be reached.
- **Training:** none.
- **Marketing / RFP:** "Every result message carries the SHA-256 fingerprint of its report PDF, so the receiving system can confirm it got exactly what PathScribe sent."
- **Standards:** supports data integrity expectations in CAP and ISO 15189 for transmitted reports (clause numbers to be confirmed against the current editions).
- **Status:** browser side done; the server side is phase 2e.

## Batch 558: signed report versions fetched from the server
- **What changed:**
  - With the PathScribe server, Version History lists the report's signed versions held by the server as well as the ones signed on this computer, and "View PDF" fetches a version's PDF from the server.
  - **Every version's PDF is checked** against its fingerprint (SHA-256) before it is opened, sent as a result, or used when a held report is released. One that no longer matches is refused, never shown or sent, and an older version is never sent in its place.
  - **New messages:**
    - "this version's PDF no longer matches its fingerprint, report this to your administrator";
    - "couldn't be fetched from the PathScribe server, try again shortly";
    - "you don't have permission to open this version's PDF";
    - "this list may be incomplete" (when the server's list of versions can't be read).
  - **Nothing changes in the demo**, apart from the fingerprint check.
- **Who:** pathologists and anyone who opens Version History; interface administrators (a result held because its PDF failed the check).
- **User Guide:** Version History, the messages above.
- **Admin Guide:** failed messages: a result held because "it no longer matches its SHA-256 fingerprint" needs investigating, not just a retry.
- **Training:** none.
- **Marketing / RFP:** "Every signed version of a report keeps its PDF's SHA-256 fingerprint. Opening or resending a version checks it, so what is shown or sent is exactly what was signed."
- **Standards:** supports the expectation in CAP and ISO 15189 that a report and its earlier versions can be retrieved exactly as issued (clause numbers to be confirmed against the current editions).
- **Status:** browser side done. The server's version endpoints are phase 2e.

## Batch 557: where PathScribe keeps data, and settings from the server
- **What changed:**
  - **Configuration → AI provider settings** has a new box, **Where PathScribe keeps data**. It shows the regions of the database and of file storage (reports, exports) as the PathScribe server reports them, beside the AI service's region. "Not reported" means the server hasn't given them; the demo has no server.
  - **Settings from the server:** the server can now give the app a few settings when it starts: the AI model and region, and voice. The site's own `config.json` still wins. Sign-in, the instance (production or validation), which jobs the server runs and every web address stay in `config.json`. A server that tries to set one of these stops the app with a clear message, so a misconfigured server can't change how people sign in.
- **Who:** administrators (the regions); hospital IT and the deployment team (the settings).
- **User Guide:** none.
- **Admin Guide:**
  - AI provider settings: "Where PathScribe keeps data".
  - Deployment Guide: `/api/config`.
- **Training:** none.
- **Marketing / RFP:** "Administrators can see the region where PathScribe stores their database, files and AI processing, for data-residency reviews."
- **Standards:** supports GDPR Article 30 records and data-residency questions in hospital security reviews.
- **Status:** browser side done. The server's `/api/config` is phase 2e.

## Batch 556: sent reports fetched from the server
- **What changed:**
  - With the PathScribe server, "View as sent" in Version History, print retries, delivery retries and the cytology "Print case report" fetch the released report from the server. Its fingerprint (SHA-256) is checked again, so what opens is exactly what was sent.
  - **New messages:**
    - "couldn't be fetched from the PathScribe server, try again shortly";
    - "you don't have permission to open this document";
    - "this list may be incomplete" (when the server's list of sent documents can't be read).
  - **Cytology "Print case report":** it no longer prints a fresh render or an older document when the server's list can't be read. It says so instead.
  - **Print retries:** a print retry that couldn't fetch its report is tried again, not failed for good.
  - **Nothing changes in the demo.**
- **Who:** anyone who views or prints a released report.
- **User Guide:** Version History, the messages above.
- **Admin Guide:** none.
- **Training:** none.
- **Marketing / RFP:** "Every report PathScribe sends is stored once with its SHA-256 fingerprint. Viewing, reprinting and resending it serve exactly those bytes from the server, checked each time."
- **Standards:** supports the expectation in CAP and ISO 15189 that a released report can be retrieved exactly as issued (clause numbers to be confirmed against the current editions).
- **Status:** browser side done. The server's document endpoints are phase 2e.

## Batch 555: server jobs move off the browser, one at a time
- **What changed:**
  - **Background work:** the browser does some of the server's background work today, while someone is signed in:
    - retrying deliveries;
    - releasing held reports when their delay ends;
    - sending follow-up alerts;
    - escalating registry submissions at 72 hours;
    - recording expired consult links and support access;
    - the cytology–histology correlation sweep.

    A new deployment setting, `VITE_SERVER_JOBS`, says which of these the hospital's PathScribe server runs. The browser stops doing exactly those. Until the server runs a job, the browser keeps doing it as before, so nothing is done twice and nothing is missed. Nothing changes for users today.
  - **Support access:** in Configuration → Support access, an approval whose time has run out now reads **Expired** straight away, and can't be revoked or ended after the fact.
  - **Engines view:** counts in Interfaces → Engines use the user's number format (for example 1 234 in French).
- **Who:** hospital IT and the PathScribe deployment team (the setting); administrators (support access).
- **User Guide:** none.
- **Admin Guide:**
  - Support access: what "Expired" means.
  - Deployment Guide (`deploy/runtime-config/README.md`): `VITE_SERVER_JOBS`, which is empty until the server runs a job, then lists each job by name.
- **Training:** none.
- **Marketing / RFP:** "Scheduled work (delivery retries, held-report release, alerts and escalations) runs on the PathScribe server, not in a user's browser, so it happens whether or not anyone is signed in." This is **Planned**: true once phase 2e ships each job.
- **Status:** browser side done. The server jobs are phase 2e.

## Batch 554: interface monitoring
- **What changed:**
  - **Audit Log → Interfaces** has a new **Engines** sub-tab. It shows each hospital's interface engine (hosted or on site) and is refreshed every minute. For each engine:
    - its status: online, needs attention, degraded (a listener stopped or in error, messages waiting more than 15 minutes, can't reach PathScribe, low disk or a certificate expiring soon) or offline;
    - its last check-in and version;
    - each listener and outgoing channel, with what is waiting, the oldest wait and the messages that failed for good. Problems come first.
    - An outgoing channel with failed messages has **Open Outbound**.
  - **A line above the Interfaces sub-tabs** sums it up, for example "Interface engines: 1 offline, 1 listener down and 2 online". It shows only problems and what's there, and opens Engines in one click.
  - The view is read only. Channels are started and stopped on the engine, and failed messages are resent from Outbound as before.
  - **In the demo:** the browser handles interface messages itself, so Engines explains that there is no engine.
- **Who:** the new permission "View interface engines", Admin by default. A hospital can grant it to its interface analysts.
- **User Guide:** none (administrators only).
- **Admin Guide:**
  - Audit Log → Interfaces → Engines: reading the statuses, and what to do for each (offline: check the engine's host; a listener stopped: start it on the engine; waiting too long: check the receiving system).
  - Roles: the new permission.
- **Training:** read the Engines view for a hosted engine and an on-site engine, follow Open Outbound to resend a failed result, and read the status line.
- **Marketing / RFP:** "Interface administrators see every hospital interface's listeners and queues in PathScribe, refreshed every minute, with problems first, so a stopped feed is noticed before the lab is."
- **Standards:** supports the CAP general checklist's expectations for monitoring data interfaces, and ISO 15189's requirements for laboratory information systems (exact clause numbers to be confirmed against the current editions).
- **Status:** Partial. The screen is built. It shows engines once the interface engine's heartbeat and the server's `/api/interface/engines` exist (phase 2e).

## Batch 553: choosing a site agent printer
- **What changed:**
  - **Print routing rules** (Configuration → System → Print routing rules): where a rule prints is now **Site agent printer**, picked by name from the lab's list, or **Printer address**.
    - A facility rule uses that facility's own printers.
    - Other rules (workstation, location, client) choose the performing lab first.
    - When the lab has only one report printer, it is picked already.
    - The rule list shows the printer and its lab.
    - If a save is refused, the window stays open and says why.
  - **A facility's default printer** (Facility editor → Printing, Direct network print): pick one of the facility's own site agent printers, or give a printer address.
  - **Print Queue → Redirect:** picks one of the job's own lab's agent printers.
    - Jobs from several labs, or older jobs whose lab isn't recorded, can only be given a printer address.
    - If any job isn't redirected, the form stays open and says how many.
  - **A report always prints at the lab that performed it.** A routing rule that names another lab's printer is skipped for that lab's reports.
  - **Site agents:**
    - **Revoke** asks for a reason picked from a short list (machine replaced, retired, may be compromised, moved to another site, enrolled by mistake, other). A note is needed only for Other.
    - **Agent updates:** an update window (for example 02:00–04:00, the lab's local time) so the agent installs new versions outside working hours.
    - **A pickup share** hands its files to Orders or Results (picked from a list), or to an interface engine channel. The channels already used are suggested.
  - The printer-address option says it works only from a PathScribe server inside the hospital's network.
- **Who:**
  - Routing rules: "Manage print routing".
  - The facility default: "Manage print settings".
  - Redirect: "Redirect a print job".
  - Each also lets that person see the lab's printer list.
- **User Guide:** Print Queue, "Redirecting a report to another printer".
- **Admin Guide:**
  - Print routing rules: choosing a site agent printer, and why a rule for another lab's printer is skipped.
  - Facility Printing tab: the default printer.
  - Site agents: revoke reasons, update window, pickup hand-over.
- **Training:**
  - Add a facility rule and pick the lab's agent printer.
  - Redirect a failed job to another printer at the same lab.
  - Revoke an agent with a reason.
  - Set a 02:00–04:00 update window.
- **Marketing / RFP:** "Reports are routed by rule to named printers at each lab, through the lab's own on-site agent. No IP addresses are typed, and a report never prints at another lab."
- **Status:** Partial. The screens are built. Printing to an agent printer happens once the agent and the server's endpoints exist (phase 2e, India team). Until then a job for an agent printer goes straight to the exception queue and its fallback.

## Batch 552: site agents
- **What changed:**
  - **Configuration → System → Site agents** (Workstation & Hardware) is new. Choose the performing lab in the facility picker at the top. The section then shows:
    - **The lab's agents:** their status (online, needs attention, offline or revoked), version, last check-in, certificate expiry, and how many of their printers are reachable.
    - **New enrolment code:** a one-time code to enter while installing the agent. It works once, expires after 24 hours, and is shown only once.
    - **Revoke:** cuts an agent off at once. It asks for a reason, because it can't be undone.
    - **Agent printers:** report or label printer, protocol, address, port, and LPR queue or IPP path. IPPS is preferred, because the printer confirms each report printed. Label printers use Raw 9100.
    - **File shares:** a write share (for file delivery) or a pickup share (with its file pattern, how long a file must sit unchanged, the largest file, what happens after hand-over, and where its files go).

    Passwords for shares are never entered here. The hospital's IT sets them on the agent's machine.
  - **Saving:** printers and shares are saved together. Leaving the section, or changing the facility, with unsaved changes asks first.
  - **Print Queue:**
    - A report sent to a printer that can't confirm printing (Raw 9100 or LPR) shows **Sent to printer**, not **Printed**.
    - With the PathScribe server, a line shows how many site agents are online, need attention or are offline, with a link to Site agents.
  - **In the demo:** no agent can enrol. You can still make a code and set up printers and shares.
- **Who:** administrators and lab directors, through two new permissions: "Enrol and revoke site agents" and "Manage site agent printers and shares".
- **User Guide:** Print Queue, what "Sent to printer" means.
- **Admin Guide:**
  - a new section, "Site agents": installing (the enrolment code), revoking, printers (protocol choice, and why IPPS), shares (write and pickup rules), and status;
  - Roles: the two new permissions.
- **Training:** make a code, add an IPPS report printer and a Raw 9100 label printer, and show "Sent to printer" in the Print Queue.
- **Marketing / RFP:** "PathScribe prints and exchanges files inside the hospital network through an on-site agent, with no inbound firewall ports. Each agent is enrolled with a one-time code and its own certificate, can be revoked at once, and reports whether each report actually printed." Supports HIPAA §164.312(e) (transmission security).
- **Status:** Partial. The screens are built. The agent itself and the server's endpoints are the India team's (phase 2e). Choosing an agent printer in routing rules and Redirect is built in Batch 553.

## Batch 551: Server jobs (System Logs)
- **What changed** (with the PathScribe server):
  - System Logs has a new **Server jobs** tab for administrators. It shows the server's background work by kind (deliveries, prints, interface messages, held releases, charges, exports, event handlers):
    - how many are waiting or running;
    - how long the oldest has been waiting past its time;
    - how many failed for good today.

    A kind that needs attention is highlighted.
  - **Recurring jobs** (delivery retries, held releases coming due, consult link expiry, stale registry submissions, follow-up alerts and others) show when each last ran, and are flagged when a run is overdue or failed.
  - **Failed for good** lists each job that ran out of attempts, with its error, the case it concerns and when it failed. **Requeue** sends it again in one click. Interface and print jobs have a button that opens Interfaces → Outbound or the Print Queue, where they are resent.
  - In the demo, the tab explains that the browser does this work itself.
- **Who:** Admin by default. New permissions: "View server jobs", and "Requeue server jobs", which needs the first. Someone assigned to some facilities sees and requeues only their facilities' jobs.
- **User Guide:** none.
- **Admin Guide:**
  - System Logs → Server jobs: what each column means, when a row is highlighted, and requeue versus resend.
  - Roles: the two new permissions.
- **Training:** show a highlighted kind, a failed job's error and Requeue, and the button that opens the Print Queue for a print job.
- **Marketing / RFP:** "Administrators see every background job the server runs, are alerted to anything overdue or failed, and can requeue a failed job in one click, with every requeue audited." Supports CAP and ISO 15189 expectations for monitoring the laboratory information system (exact checklist items to be confirmed by the RFP team).
- **Status:** Partial. The screen is built. It is in use once the server's `/api/jobs` endpoints exist (phase 2e).

## Batch 550: exports through the PathScribe server
- **What changed** (with the PathScribe server; the demo is unchanged):
  - **Every export button** (QA reports, the system logs, the billing log, case search, the disposal report, My Contributions, change history) now asks the server for the file.
  - **A quick export** still downloads straight away, with no extra click.
  - **A larger one** shows a small notice at the bottom left: "Preparing your export. We'll tell you when it's ready." You carry on working.
  - **When it's ready,** the notice shows a **Download** button. If it can't be made, the notice says why: no permission, too many rows, too many exports already being prepared, or the server can't be reached.
  - **My exports** (a new button in the top bar, with a badge counting exports ready to download) lists your exports from the last 7 days. Each shows its status, rows, when you asked, and when the file is deleted, with Download, or Cancel while it's being prepared.
  - **Only you** can see or download your exports, and your permission for that report is checked again when you download.
  - **Signing out** clears the notices.
- **Who:** everyone who exports, with the PathScribe server.
- **User Guide:** a new section, "Exports": the notice, My exports, the 7-day limit, and what each problem message means.
- **Admin Guide:**
  - Each report's export permission is checked when an export is requested and again when it is downloaded.
  - Files are kept for 7 days by default (1 to 30).
  - At most 3 exports can be prepared at once per person, and at most 1,000,000 rows per export.
- **Training:** export a small and a large report. Show that the small one downloads at once, and that the large one's notice turns into Download. Then open My exports.
- **Marketing / RFP:** "Large exports run on the server in the background and never freeze the screen. Each file is downloadable only by the person who asked for it, with their permission checked again at download, and is deleted after 7 days." Supports HIPAA §164.312(a) and (b) (access control, audit), and GDPR Art. 5(1)(e) (storage limitation).
- **Status:** Partial. The browser side is built. It is in use once the server's export endpoints exist (phase 2e); until then, and in the demo, exports download from the browser as before.

## Batch 549: carried-over items finished
- **What changed:**
  - **Every screen waits the same way.** All the remaining screens with their own "Loading…" text now behave like the rest: nothing for a quick load, the screen's own loading text after a moment, and "still working" after 3 seconds.
  - **Faster reconnect.** When a computer's network comes back, PathScribe reconnects to live updates straight away, instead of waiting for its next scheduled try.
  - **Faster start.** PathScribe downloads its program while it reads the site's settings, instead of one after the other.
  - **Logos and imaging addresses must be secure links.** In Configuration, the facility and department letterhead logo and the gross imaging vendor's address must start with `https://` and point to a named server. An `http://` address or a pasted image is refused, with a message under the field. This is the same rule staff signatures have followed since Batch 544.
  - **Print Queue:** a report that couldn't be printed because network printing needs the PathScribe site agent now says so in the user's language.
  - **Assist (LIS-driven) results** now carry the time the pathologist signed the case out, not the time the message was built.
- **Who:**
  - everyone, for loading, reconnect and start-up;
  - administrators, for logos and imaging addresses;
  - print and lab staff, for the Print Queue.
- **User Guide:** none beyond Batch 548's "waiting" note.
- **Admin Guide:**
  - Facilities, Departments and Gross Imaging Vendors: the logo and the address are https links into the hospital's own systems.
  - Print Queue: the "needs the site agent" reason.
- **Training:** when setting a logo, paste the https link to the image on the hospital's intranet or imaging system; don't upload or paste the picture.
- **Marketing / RFP:** "PathScribe stores no copies of images or logos; it links to them over secure (https) links in the hospital's own systems." Supports HIPAA §164.312(e) (transmission security) and GDPR Art. 5(1)(c) (data minimisation).
- **Status:** Live.

## Batch 548: connection banner; clearer waiting
- **What changed:**
  - **Connection banner.** When PathScribe loses its connection for more than 2 seconds, a slim notice appears below the top bar on every screen: "Reconnecting…" or "Offline", saying that what you see may be out of date. When the connection is back it says "Connection restored" for a few seconds, then goes. Nothing to click.
  - **Clearer waiting.** A screen that loads quickly no longer flashes a "Loading…" message. One that takes longer shows a placeholder, and after 3 seconds says it is still working, so nobody wonders whether it has hung. The same applies while a page itself loads.
- **Who:** everyone.
- **User Guide:** Getting started: what the connection banner means, and that PathScribe reconnects by itself.
- **Admin Guide:** none.
- **Training:** mention the banner. If it says Offline for long, check the network, then call IT.
- **Marketing / RFP:** "PathScribe tells users the moment its live connection drops and when it's restored, and never leaves them guessing whether a screen has hung." Supports WCAG 2.2 4.1.3 (status messages).
- **Status:** Live. About 50 screens still showed their own loading text; they were converted in Batch 549.

## Batch 547: one PathScribe build for every site
- **What changed:**
  - **One build for everyone.** The same PathScribe build is installed at every hospital. Each site's settings live in a small `config.json` file beside the app, read when PathScribe starts:
    - the PathScribe server's address;
    - the sign-in provider;
    - the live updates, report renderer and AI addresses.
  - **Changing a setting needs no new build:** edit the file, then reload.
  - **A setting that's wrong or missing stops PathScribe from starting.** Instead, it shows a page listing each problem in plain words. It never runs with the wrong settings.
  - **Server builds:** they always sign in through the hospital's identity provider (SSO) and contain no demonstration accounts.
  - **The demonstration build:** it can never be pointed at a real server.
- **Who:** hospital IT and ForMedrixAI deployment staff. Nothing changes for users.
- **User Guide:** none.
- **Admin Guide:** Installation:
  - `config.json` and its settings (`deploy/runtime-config/README.md`);
  - serving it uncached;
  - generating the security headers from it;
  - the configuration error page.
- **Training:** deployment staff only.
- **Marketing / RFP:** "One validated build is installed at every site; site settings are configuration, not code, so an update is validated once and rolled out unchanged." Supports GAMP 5 / computerised-system validation (one build, configuration recorded per site).
- **Status:** Live.

## Batch 546: workstation label printing allowed by the browser; network report printing waits for the site agent
- **What changed:**
  - **Workstation label printers work under the browser's security policy.** Labels printed through the PathScribe workstation agent or QZ Tray were blocked by PathScribe's own security policy; now they connect, only to the user's own computer. Chrome and Edge may ask the user once to allow PathScribe to reach "apps on this device"; IT can pre-approve it.
  - **Network report printers:** printing a released report straight to a network printer needs the PathScribe site agent (coming with the server). Until then, such a print fails at once with "needs the site agent". The report then goes to its fallback channels, and Admin and Lab Director are told; before, the print sat in the queue, or failed after several retries with a technical message.
- **Who:** bench staff (labels); administrators and lab directors (report printing set-up).
- **User Guide:** Printing labels: the permission prompt for local printing.
- **Admin Guide:**
  - Printing: direct network report printing needs the site agent; until it's installed, use the interface engine hand-off or QZ Tray.
  - Security headers: `workstationBridges`.
- **Training:** none.
- **Marketing / RFP:** "On-site printing and file shares through a small, outbound-only site agent: no inbound firewall openings, signed updates, and at-most-once printing of clinical reports." The site agent is Planned.
- **Status:**
  - Label printing fix: Live, still to be checked in a browser.
  - Site agent: Planned.

## Batch 544: signatures are links; QA reports for one facility
- **What changed:**
  - **Staff signature:** Configuration → Staff now asks for a link (https://) to the person's signature image in the hospital's own system, instead of uploading the image. PathScribe keeps the link, never the image, as it already does for photos, referral PDFs and letterhead logos. A signature saved earlier as an image opens with an empty field and a note asking for the link.
  - **QA reports for one facility:** Follow-up not received, FPPE, Inspection Mode, the QA Dashboard, Deficiencies and Billing deficiencies have the Scope picker the other QA reports already had. Pick one facility to see, count and export only its items; the file name says which facility. Someone assigned to one facility opens on it, so their export works first time. The enterprise rollup, management reviews and patient match review stay lab-wide.
- **Who:** administrators (Staff); QA managers, lab directors, auditors (QA reports).
- **User Guide:** Quality Assurance: the Scope picker on each report, and what "one facility" includes.
- **Admin Guide:** Staff: signature link (where to host signature images; https only). Storage: PathScribe stores no images or attachments.
- **Training:** show choosing a facility before exporting. Tell administrators to have signature images hosted on the hospital's document system before go-live.
- **Marketing / RFP:** "PathScribe keeps links to images and attachments in your own systems and never stores copies; QA reports can be produced per facility or across the enterprise." Supports CAP and ISO 15189 per-site QA review, and HIPAA minimum necessary (45 CFR 164.502(b)).
- **Status:** Live.

## Batch 543: safer CSV exports; the disposal report export is audited
- **What changed:**
  - Every CSV file PathScribe exports now protects against "formula injection". A text value that starts with `=`, `+`, `-` or `@` is written with a leading apostrophe, so Excel shows it as text and never runs it. Numbers, including negative numbers, are unchanged. Re-importing an exported dictionary gives back exactly what was exported.
  - Exporting the disposal (waste-tracking) report is now recorded in the audit log, like every other export of case data.
- **Who:** anyone who exports (QA, auditors, administrators, lab managers).
- **User Guide:** Exports: why a value may show a leading apostrophe in Excel.
- **Admin Guide:** Audit Log: disposal report exports now appear as document exports.
- **Training:** none.
- **Marketing / RFP:** "Exported files are protected against spreadsheet formula injection (OWASP), and every export of patient data is audited." Supports HIPAA audit controls (45 CFR 164.312(b)) and ISO 15189 record control.
- **Status:** Live.

## Batch 540: no correction or addendum while a report is in its release delay
- **What changed:**
  - While a report is still in the laboratory's release delay it hasn't been sent, so a correction or addendum can't be started; the screen says to recall the report and edit it instead. Once the delay ends, corrections and addenda work as before. Applies to surgical, Assist, autopsy and cytology reports.
  - A released report's PDF never carries the "pending release" watermark, even if it was made during the delay. Printing during the delay still shows it.
- **Who:** pathologists, cytopathologists, QA staff.
- **User Guide:** Report page and Cytology Workspace → Corrections and addenda: not available during the release delay; use Recall.
- **Admin Guide:** Release delay: what Recall is for, and that revisions wait for the delay.
- **Training:** sign out a case with a delay, try to add an addendum (message), recall, edit, sign out again.
- **Marketing / RFP:** "Reports in the release delay are changed by recall, never by an amended report, so clinicians only see a correction when something they received has changed." Supports CAP amended-report practice.
- **Status:** Live.

## Batch 539: cytology reports made by the server; the preview matches what is sent
- **What changed:**
  - Cytology report PDFs (sign-out, case report, correction, addendum, preliminary, and the print preview) are made by the PathScribe report renderer, as surgical reports are. The browser no longer draws them.
  - **Print** before sign-out shows a preview watermarked PRELIMINARY — SUBJECT TO CHANGE; it otherwise matches the released report line for line.
  - **Print case report** on a released case opens the case report exactly as it was sent (its stored, fingerprinted copy).
  - If the report renderer is unavailable, or hasn't been updated, the screen says so and a release is held and retried; nothing blank is sent.
- **Who:** cytotechnologists, cytopathologists, laboratory administrators, IT.
- **User Guide:** Cytology Workspace → Print and Print case report: the preview watermark, and that a released case report is the copy sent.
- **Admin Guide:** Installation: the report renderer must be updated (redeployed) with this release; the message staff see if it isn't.
- **Training:** print a specimen before sign-out (watermark), sign it out, print again (no watermark, same text); release the case and open Print case report, then compare its fingerprint in Version History.
- **Marketing / RFP:** "Every cytology report is produced by the same server-side renderer as surgical pathology, with embedded fonts and identical output for identical content; what staff preview is what is sent." Supports CAP and ISO 15189 report integrity, 21 CFR Part 11 record integrity.
- **Status:** Live once the renderer is redeployed. Embedded images (gross photos) in cytology reports: not drawn (nothing sets them today).

## Batch 538: what was sent is what you see (stored, fingerprinted report documents)
- **What changed:**
  - Every released report is now stored once, with a SHA-256 fingerprint. The result message, print, fax, file drop and their retries send that exact file (deliveries queued before this batch, per-specimen cytology messages, and releases whose PDF failed are the exceptions; see the contract).
  - Fixes:
    - a fax or file-drop **retry of a correction** sent the original sign-out report;
    - a preliminary's fax retry never went;
    - the cytology result message could differ from the printed or faxed copy.
  - **Version History → Released documents** lists each released document with its fingerprint. **View as sent** opens the file exactly as sent.
  - **Print preview** now uses the same content as the released report: before signing, only the PRELIMINARY watermark and the signature line differ.
- **Who:** pathologists, QA staff, laboratory administrators, auditors.
- **User Guide:** Report page → Version History: Released documents and View as sent; Print: what the preview shows. Source: `docs/architecture/REPORT_DOCUMENT_STORE_API.md`.
- **Admin Guide:** Interfaces and delivery: each delivery records the document's fingerprint; a resend sends the original release.
- **Training:** release a correction with fax delivery failing, retry it, and show that the retried fax is the correction; open View as sent and compare its fingerprint with the delivery record.
- **Marketing / RFP:** "Every report PathScribe sends is stored once and fingerprinted (SHA-256). Every channel and every resend delivers that exact document, and you can view it exactly as sent." Supports CAP and ISO 15189 report integrity, 21 CFR Part 11 record integrity, and HIPAA integrity controls.
- **Status:** Live in the browser. Server-side storage, and server rendering for cytology, are Planned (PS-539).

## Batch 537: deployment readiness review (PS-539)
- **What changed:** nothing on screen. A review of how PathScribe is hosted:
  - every server part rated for serverless, private cloud and on-site hosting;
  - the 1-second refresh budget;
  - the hosting rules in each target market;
  - the decisions still to make.
- **Who:** hospital IT, sales engineers, the India back-end team.
- **User Guide:** nothing to change.
- **Admin Guide:** nothing yet. Installation sections follow when the server is built.
- **Training:** none.
- **Marketing / RFP:** use the review's section 1, "Summary for a hospital IT review", and section 10, "Markets and hosting rules": "PathScribe runs in a public cloud, a sovereign or private cloud, or on premises, from one validated package. It needs no inbound firewall opening for printing, and acknowledges HL7 messages only once they are stored." Supports HIPAA, GDPR, France HDS, Germany C5 and NHS DSPT hosting questions.
- **Status:** Planned (the review is done; building follows phases 2b to 2e).

## Batch 536: governed AI instructions with separation of duties (PS-554); AI vendor policy per jurisdiction (PS-558)
- **What changed:**
  - **AI Instructions** (Configuration → System → AI Instructions): what the clinical mismatch check tells the AI counts as a mismatch, for surgical, cytology and autopsy, is now versioned configuration. An edit is saved as a new version awaiting approval; the check keeps using the approved version until then. Whoever edited it can't approve it. The Lab Director approves or rejects (with a reason). A **Test** panel runs the draft on a sample case first. Every version, approval and rejection is kept, and each suggestion records the version used.
  - **Separation of duties:** changing the mismatch rules and approving the AI instructions can't be held together, by one role or by one person through several roles. The Role Dictionary and Staff screens say why a save is refused. ForMedrixAI's Superadmin role no longer holds the approval (Pete, Oct 11).
  - **AI vendor policy** (Configuration → AI Behavior → AI vendor policy): for each jurisdiction the laboratory serves, and optionally a facility, which AI services and hosting regions are allowed. No rule means everything is allowed. Every AI call is checked before it is sent and logged with its service, model and region; a refused call is not sent anywhere else. The AI Provider settings gain a **Hosting region** field and warn inline before saving a service a served jurisdiction doesn't allow. The mismatch alert says when the AI wasn't available for the jurisdiction.
- **Who:** Lab Directors (approve), the hospital's own rules/instructions administrators (edit), QA reviewers (read), laboratory administrators (vendor policy, roles and staff).
- **User Guide:** Report page and Cytology Workspace: the mismatch alert's "AI is not available for this jurisdiction" line. Source: `CLINICAL_MISMATCH_CHECK.md`.
- **Admin Guide:** new sections Configuration → System → AI Instructions and Configuration → AI Behavior → AI vendor policy; AI Provider: Hosting region; Roles and Staff: separation of duties. Sources: `CLINICAL_MISMATCH_CHECK.md`, `docs/architecture/AUTHORIZATION_API.md`, `docs/architecture/AI_PROXY.md`.
- **Training:** edit the surgical instructions, test them on the sample, show that the editor can't approve, approve as the Lab Director; try to give one role both duties and show the refusal; add a rule for a jurisdiction that excludes the service in use and show the warning and the mismatch alert's notice.
- **Marketing / RFP:** "AI instructions are controlled documents: versioned, independently approved and audited, with separation of duties. Each jurisdiction can restrict which AI vendors and hosting regions are used, enforced on every call and recorded for regulators." Supports CAP and ISO 15189 document control, the EU AI Act's record-keeping and human-oversight expectations, GDPR data-residency requirements, and HIPAA audit controls.
- **Status:** Live in the browser. The API server's own enforcement of the vendor policy is specified (AI_PROXY.md) and comes with PS-539.

## Batch 535: Recall for corrections, addenda and autopsy reports; a correction at re-sign-out is now sent
- **What changed:**
  - During the release delay, **Recall** now also works for a surgical correction or addendum (it goes back to draft and the report opens for editing again, as before release) and for an autopsy PAD or FAD (the signature is withdrawn and the report can be signed again). A PAD can't be recalled once the FAD is signed on it.
  - Recalling a surgical sign-out also takes back a correction or addendum released on it during its delay.
  - **Fix:** a correction released by signing the case out again (Orchestration) was recorded as released but never sent to the EMR. It is now sent as a corrected report, after the delay, and the report header shows Final (Corrected).
- **Who:** pathologists, autopsy pathologists.
- **User Guide:** Report page: held reports and Recall; amending a signed-out report. Source: `REPORT_RELEASE_DELAY.md`.
- **Admin Guide:** nothing to change.
- **Training:** release a correction, recall it, show the report open for editing again; sign a PAD, recall it.
- **Marketing / RFP:** "Any released report, including corrections and autopsy diagnoses, can be taken back by its pathologist within the safety window."
- **Status:** Live.

## Batch 534: every report output follows the release delay (Pete, Oct 12)
- **What changed:**
  - **Every report output now waits out the laboratory's release delay before it leaves the laboratory:**
    - preliminaries, corrections and addenda (surgical and cytology);
    - autopsy PAD and FAD;
    - cytology case reports, early finalizations and urgent preliminaries;
    - screening registry submissions.

    Before, only the surgical final sign-out waited. A resend after a failed delivery is never delayed. STAT cases skip the delay when the STAT bypass is on.
  - **Seeing and recalling it:** the report page and the Cytology Workspace show each held report and when it goes. The person who released it can **Recall** it, which reopens it and sends nothing. For example, a cytology case report's last specimen can be corrected and signed again.
  - **Released on time from any open screen:** a signed-out case is no longer left unreleased because nobody had its report page open.
  - **Fix:** a surgical correction released straight after Finalize no longer ends the case's release buffer early.
- **Who:** pathologists, cytopathologists, laboratory administrators; clinicians and interfaces (timing).
- **User Guide:** Report page and Cytology Workspace: held reports and Recall. Source: `REPORT_RELEASE_DELAY.md`.
- **Admin Guide:** Release Buffer now applies to every output. Source: `REPORT_RELEASE_DELAY.md`.
- **Training:** release a cytology correction, show the held line, recall it, show the specimen reopened; let one run out and show it in the interface log.
- **Marketing / RFP:** "A consistent safety window on every report output: nothing leaves the laboratory until the delay ends, and the releasing pathologist can recall it." Supports CAP and ISO 15189 report-release control.
- **Status:** Live. Recall for surgical corrections and addenda and for autopsy PAD/FAD: Planned (Batch 535).

## Batch 533: urgent cytology preliminary report, per specimen (Pete, Oct 12)
- **What changed:**
  - In the Cytology Workspace, a specimen with a chosen final diagnosis can be sent ahead of the case report as an **urgent preliminary**: **Send urgent preliminary**, one click on a reason (Critical finding, Clinician request, Urgent clinical management), an optional note, then **Send** (or **Sign and send**). It opens on the page, not in a window.
  - The clinician, EMR, print and fax receive it at once, marked **PRELIMINARY REPORT**: "This is not the final report…", the reason and note, and "Preliminary released by". It is not sent to a screening registry. The specimen still signs out as usual, and the case report replaces it.
  - The preliminaries sent are listed under the button.
  - **Configurable (Pete):** who may send one is a permission no role starts with ("Send an urgent cytology preliminary report"). Whether it needs the electronic signature is a setting in Configuration → Cytology → **Country and laboratory rules** (renamed from Country-specific rules): Automatic (required everywhere), On, or Off, for the enterprise or one facility. Config Search finds it ("preliminary", "signature").
- **Who:** cytopathologists; laboratory administrators (permission and setting); clinicians receiving reports.
- **User Guide:** Cytology Workspace: Send urgent preliminary.
- **Admin Guide:** Role Dictionary: grant "Send an urgent cytology preliminary report"; Configuration → Cytology → Country and laboratory rules: the signature setting. Interfaces: a preliminary arrives as one specimen, result state PRELIMINARY, Urgent (`scope: preliminary`).
- **Training:** grant the permission, send a preliminary for a critical finding, show the PDF banner, then sign out and show the case report replacing it.
- **Marketing / RFP:** "Critical cytology findings reach the clinician immediately as a clearly marked preliminary, under laboratory-controlled permissions and signature policy, while the final report stays one per accession." Supports CAP critical-result communication expectations.
- **Status:** Live. Not yet held by the release delay; every output follows it from Batch 534 (Pete, Oct 12).

## Batch 532: one cytology case report per accession (Pete, Oct 12)
- **What changed:**
  - A cytology case with several specimens is still screened, reviewed and signed specimen by specimen, but nothing is sent until the case closes. Signing a specimen while others are unsigned says "the case report is released when the last one is signed".
  - When the last specimen is signed, the clinician, the EMR and print, fax and file-drop delivery receive **one** case report: a first page listing every specimen and its status, then each specimen's signed report. One HL7 result message carries every specimen.
  - Screening registry results go per sample, sent together when the case closes.
  - **Finalize case early:** the case report goes out at once, listing each unsigned specimen as "Not reported" with the reason given. A specimen signed afterwards is added as an addendum.
  - **Correct diagnosis / Add addendum** after release reissues the whole case report, marking the specimen that changed. Before release, the change is simply part of the report when it goes out.
  - The Cytology Workspace has **Print case report** once a multi-specimen case is released.
  - Fix: the dash in the printed title ("Cytology Report — GYN Cervical Screening") and curly quotes now print; they printed as blanks.
- **Who:** Cytopathologists and cytotechnologists; clinicians receiving reports; interface and registry staff.
- **User Guide:** Cytology Workspace: Sign out (when the report is released), Finalize case early, Correct diagnosis / Add addendum, Print case report.
- **Admin Guide:** Interfaces: cytology results arrive as one message per accession (`scope: case`), with every specimen; registries: per sample, at case closure.
- **Training:** sign out the first of two specimens (nothing sent), then the second (one report); show the case PDF's first page; finalize a case early and show "Not reported".
- **Marketing / RFP:** "One cohesive cytology report per order: specimen-level review and signatures, a single consolidated report and HL7 message to the clinician." Supports CAP reporting expectations and ISO 15189 report integrity.
- **Status:** Live. Urgent per-specimen preliminary: Planned (Batch 533).

## Batch 531: the mismatch check re-runs on change, and cytology gets the inline alert (PS-554)
- **What changed:**
  - When the diagnosis, findings or clinical text change after a mismatch decision, the check runs again. It shows the alert (or holds sign-out) again only if the result is worse: a different kind of mismatch, or now high risk. It then shows what was decided before.
  - The Cytology Workspace shows the same "AI suggests possible mismatch" alert as the surgical report, for each specimen once its final diagnosis is chosen (pathologist track), with the same one-click decisions.
  - Fix: after a correction or addendum, signing out another specimen on the same case no longer re-sends the corrected record to the EMR as a final result.
- **Who:** Pathologists (surgical, autopsy, cytology).
- **User Guide:** Report page and Cytology Workspace: the mismatch alert, and when it comes back after an edit.
- **Admin Guide:** nothing to change.
- **Training:** resolve a low-risk alert, change the diagnosis to a malignancy, and show the alert returning with the earlier decision.
- **Marketing / RFP:** "The correlation check follows the report as it changes: a revised diagnosis is re-checked automatically, without re-prompting for trivial edits."
- **Status:** Live. Amendments after sign-out are not checked yet.

## Batch 530: the mismatch alert on the report, and sign-out held only for high risk (PS-554, part 2 of 3)
- **What changed:**
  - **On the report (surgical, and autopsy before the FAD):** a moment after the diagnosis is written or changed, the mismatch check runs in the background. If it finds something above the laboratory's alert threshold, a one-line alert appears: "AI suggests possible mismatch", with the kind and confidence. **Review** opens the explanation and the decision in place, in one click with an optional quick reason ("Expected variation", "Clinical context reviewed", "Pre-op diagnosis non-specific") and an optional note.
  - **At sign-out:** only a high-risk mismatch (one the laboratory's rules Block) stops sign-out, until the pathologist records **Resolved** or **Unresolved**. Either lets sign-out go on; Unresolved recommends a corrective action to QA. A low-risk mismatch never stops sign-out: it is logged for QA, or the pathologist can **defer** it to secondary review. Cytology specimen sign-out follows the same rules.
  - **QA:** Quality Assurance → Activities → Clinical-Pathologic Correlation lists every flagged case with its status, risk and reason; its "pending" count is the deferred cases. Pathologists clear deferred cases from Worklist → Surgical QA → "Deferred clinical mismatches".
  - The old "No: the findings fit" choice and the required note are gone (Resolved with a quick reason covers it).
  - **No clinical history on the requisition (any specialty):** Accession is never blocked; a missing clinical history is shown as a note. The report page, Cytology Workspace and grossing screen show "Mismatch check deferred: no clinical information provided", and the check skips the case quietly (recorded in the audit log). **Add clinical history** on that line lets a pathologist, fellow, resident or PA add or reconcile the coded history later, until sign-out.
  - **Facility editor:** Fax, City, State / province / region and Postal code on the General tab; each can be made required in Field Requirements.
  - **Config Search** finds Field Requirements by page ("staff required fields", "postal code", "clinical history required") and the Clinical Mismatch Rules ("mismatch", "block sign-out").
- **Who:** Pathologists and fellows (decide), QA reviewers and lab directors (oversight).
- **User Guide:** Report page: the mismatch alert and the clinical history line; Sign out: when it asks for a decision; Worklist → Surgical QA: secondary review. Cytology Workspace and grossing screen: the clinical history line. Accession: missing clinical history is a note, not a block. Source: `CLINICAL_MISMATCH_CHECK.md`, "How it works today".
- **Admin Guide:** Clinical Mismatch Rules (Batch 529) now decide what holds sign-out; QA Activities board. Role Dictionary: "Record clinical history after accession" (Pathologist, Fellow, Resident, PA); "View the clinical mismatch rules" can be granted to Admin or any role. Facility Dictionary: the four new fields. Field Requirements: clinical history requirements flag, never block.
- **Training:** show the alert on a routine-polyp case with an adenocarcinoma diagnosis; decide it in place; then sign out without a window. Show a deferral reaching the Surgical QA queue.
- **Marketing / RFP:** "AI correlation checking that informs without interrupting: inline alerts while the report is reviewed, sign-out held only for high-risk mismatches, and every flag tracked by QA." Supports CAP and ISO 15189 quality-management expectations; fewer interruptions for pathologists.
- **Status:** Live (cytology without the inline alert). Governed AI instructions: Planned (Batch 531).

## Batch 529: clinical mismatch rules (PS-554, part 1 of 3)
- **What changed:** New Configuration → System → **Clinical Mismatch Rules**. For each kind of mismatch (unexpected malignancy, cause of death, site or organ, expected malignancy not found, other), for all specimen types or one:
  - **Alert from:** below this confidence there is no alert (60% to start).
  - **Action at:** from here the action applies.
  - **Action:** Block (sign-out waits for a decision), Warn (alert only) or Log (QA queue only).
  - Starting rules: unexpected malignancy and cause of death block at 70%; site or organ blocks at 65%; expected malignancy not found and other are logged.
  - Every change is audited.
- **Who:** Lab directors and QA (read), whoever the hospital authorises to change them, pathologists (read: why a case was held).
- **Admin Guide:** Configuration → System → Clinical Mismatch Rules; and Role Dictionary: "Change the clinical mismatch rules" starts with no role, so grant it to your own role (for example a Pathologist Administrator). "View the clinical mismatch rules" starts with Pathologist, QA Reviewer and Lab Director. Source: `CLINICAL_MISMATCH_CHECK.md`.
- **User Guide:** nothing yet; the report page uses the rules from Batch 530.
- **Training:** show raising "Action at" for one specimen type, and the view-only screen for a Lab Director.
- **Marketing / RFP:** "Each laboratory decides which AI-flagged mismatches hold up sign-out, by kind of mismatch and specimen type, under audited, permission-controlled configuration." Supports CAP and ISO 15189 quality-management expectations.
- **Status:** Partial. The rules are live; sign-out uses them from Batch 530; governed AI instructions follow in Batch 531. *(Batch 530: sign-out and the report alert now use them.)*

## Batch 528: required fields for Staff, Facility editor and Clinical history (PS-359)
- **What changed:** Field Requirements (Configuration → System) has three more pages:
  - **Staff:** first name, last name and a role are always required. An organisation can also require middle name, facilities, subspecialties, email, phone, credentials, NPI, GMC number, licence number or signature.
  - **Facility editor:** name and assigning authority are always required, and the assigning authority must be unique. Email is required unless the organisation switches it off. Phone, address and a contact person can be made required (Batch 530: fax, city, region and postal code too, now on the editor's General tab). The interface engine endpoint and LIS sending-facility ID are required once that interface is set up.
  - **Clinical history (cytology):** for cytology and FNA cases, an organisation can require a case-level entry, an entry on every specimen, and coded entries only (no free text). Nothing is required by default.
  - The Staff and Facility editors show a star on each required field and a "Still required: …" line naming what is missing. At Accession, Next stays disabled until the clinical history required is entered. *(Changed in Batch 530, Pete: missing clinical history is now a note, never a block; it can be added later.)*
- **Who:** Administrators (set the requirements), lab managers, accessioners (cytology), anyone who maintains staff and facilities.
- **User Guide:** Accession: clinical history for cytology cases, and when it is required.
- **Admin Guide:** Field Requirements: add the three pages and their locked fields with the reasons. Staff and Facility Dictionary: required fields follow Field Requirements.
- **Training:** require "phone" on facilities, then show the star and the "Still required" line in the Facility editor.
- **Marketing / RFP:** "Each laboratory decides which fields are mandatory, page by page, without custom code; identity and routing fields stay protected." Supports CAP and ISO 15189 documentation requirements and local policy differences.
- **Status:** Live.

## Batch 527: a lean, fast first load (PS-486)
- **What changed:** The sign-in page loads about three times less code (0.68 MB, was 1.91 MB). The rest of the application loads after sign-in, and the PDF and barcode tools load only when used. Server installations leave out the demo and developer screens (Demo Reset, the mock EMR and slide viewer, the mock interface engine).
- **Who:** Everyone (faster sign-in). IT administrators (what a server installation contains).
- **User Guide:** nothing to change.
- **Admin Guide:** Installation. The Demo Reset tab and the demo screens exist only in demonstration installations. In a server installation, "Open EMR" opens the in-page patient panel.
- **Training:** none.
- **Marketing / RFP:** "Lightweight browser application: under 1 MB to first screen, with no client installation." The build fails automatically if it grows past 1 MB.
- **Status:** Live. Removing the demo services entirely from production waits for the API server (PS-539).

## Batch 526: the clinical-pathologic mismatch check explained (documentation)
- **What changed:** New [`CLINICAL_MISMATCH_CHECK.md`](CLINICAL_MISMATCH_CHECK.md), the full explanation of the check for customers and staff, including the approved redesign (PS-554). Test runs on Windows are more reliable.
- **Who:** Pathologists, QA, lab directors, sales.
- **User Guide / Admin Guide:** use `CLINICAL_MISMATCH_CHECK.md` as the source. The redesign is Planned; describe today's behaviour as built.
- **Marketing / RFP:** "AI compares the clinician's expectation with the pathology finding before release. The pathologist always decides, and no patient identifiers are sent to the AI." Supports CAP and ISO 15189 quality-management expectations.
- **Status:** the check is Live; the redesign is Planned (PS-554). Per-jurisdiction AI vendor rules are Planned (PS-558).

## Batch 525: no patient data kept in the browser (PS-485)
- **What changed:** In a server installation, PathScribe keeps no cases, drafts, patient history or other clinical data in the browser's storage. Old copies are removed at start-up. The browser keeps only display preferences, workstation settings, the language and a minimal sign-in record.
- **Who:** Security officers, IT administrators.
- **Admin Guide:** Security, under workstation data. Say what the browser keeps and what it never keeps.
- **Training:** none.
- **Marketing / RFP:** "No patient data at rest on workstations: a shared or lost PC exposes nothing." Supports HIPAA Security Rule safeguards and GDPR data minimisation.
- **Status:** Live for server installations. The demonstration build still keeps its demo data in the browser by design.

## Batch 524: accessibility to WCAG 2.1 AA (PS-491)
- **What changed:**
  - Every main screen and every Configuration section is checked automatically against WCAG 2.1 AA, with no serious or critical issues.
  - Clickable elements work from the keyboard (Tab, Enter, Space), focus is always visible, and on/off switches announce their state.
  - Every form field has a name a screen reader reads.
  - Low-contrast text was brightened.
- **Who:** Everyone, especially keyboard and screen-reader users.
- **User Guide:** add an Accessibility section (keyboard use, visible focus, screen readers).
- **Admin Guide:** nothing to change.
- **Training:** show keyboard navigation of the worklist and the case page.
- **Marketing / RFP:** "Built to WCAG 2.1 AA, the basis of Section 508 (US), EN 301 549 (EU) and KWCAG (Korea), with automated checks." Manual keyboard and screen-reader QA is open (PS-548).
- **Status:** Live.

## Batch 523: mismatch check at cytology and autopsy sign-out (PS-145)
- **What changed:** The clinical-pathologic mismatch check, previously at surgical sign-out only, now also runs:
  - at cytology sign-out on the pathologist track, once per specimen. An abnormal GYN screen is never treated as "unexpected";
  - before an autopsy's Final Anatomic Diagnosis is signed, including cause-of-death discrepancies.
- **Who:** Pathologists, QA.
- **User Guide:** Cytology Workspace (Sign out) and Autopsy (Sign FAD). See `CLINICAL_MISMATCH_CHECK.md`.
- **Training:** show the decision window and the three choices.
- **Marketing / RFP:** see Batch 526.
- **Status:** Live.

## Batch 522: outside consult links (PS-290)
- **What changed:** An outside consultant can be sent a secure link to one case, or to selected slides. The link is time-limited, revocable and single-purpose. The consultant sees only what is needed and can sign an opinion. Every link is listed in Audit Log → Consult links.
- **Who:** Pathologists (issue a link), QA and lab directors (oversight), outside consultants.
- **User Guide:** Case page: send for an outside consult.
- **Admin Guide:** Audit Log, Consult links.
- **Training:** issue a link, then revoke it.
- **Marketing / RFP:** "Secure outside consultation without a guest account: a scoped, expiring, revocable link with a full audit trail."
- **Status:** Live. Open decisions: who may issue links, and the longest lifespan.

## Batch 521: report delivery retries, exception queue, fax confirmation (PS-281)
- **What changed:** Report delivery (electronic, print, e-fax, file drop) retries automatically: by default after 1, 5 and 15 minutes. Failures go to an exception queue, and fax delivery is confirmed.
- **Who:** Lab operations, IT.
- **Admin Guide:** Delivery Rules (retry waits) and the delivery exception queue.
- **Marketing / RFP:** "Guaranteed report delivery: automatic retries, an exception queue and fax confirmation."
- **Status:** Live (front end and dev receiver); the production delivery service is with the API server.

---

## Backfill still to do
Batches before 521 are summarised in `FEATURE_OVERVIEW.md`, which was last fully verified in August 2026 with sections added through September. A catch-up pass will verify it against the code and add a guide entry for each capability added since August (Batches ~400–520), in the format above.
