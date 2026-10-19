## Batch 617 (part R): one route style for every server version of a service (PS-488 dev notes)

- **Guide row:** in "Server-backed services (HTTP)", add one sentence: every service calls the API server in the same way, so the server team builds and tests one pattern. No screen changes.
- **Training:** nothing for users or admins. For the server team: `docs/architecture/HTTP_SERVICES_PATTERN.md` section 7 is the single rule; `HTTP_ROUTE_MAPPING.md` lists the earlier path and the current path of each converted call.
- **Marketing / RFP line:** "A consistent, uniform API: one route and verb convention across all services, enforced by an automated test."
- **Status:** Built (Demo); waiting on the server side (India team). Supports: ISO 15189 (controlled, documented interfaces), HIPAA (no patient text in URLs).

## Batch 617 (part C): server versions of 28 more services (PS-514, PS-501)

- **Guide row:** extend "Server-backed services (HTTP)": peer review, CAPA recommendations, QA trend policy, saved searches, scheduled reports, signature records, smart capture, tumor board and its rules, specimen categories, spelling dictionaries, stain dictionaries, subspecialties, system configuration, TAT targets and the workstation registry now have a server version. The row stays Partial: the API server's endpoints are not built.
- **Wording:** "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Status:** Built (Demo); waiting on the server side (India team).

## Batch 617 (part A): server versions of 29 more services (PS-514)

- **Guide row:** extend the "Server-backed services (HTTP)" row: settings and dictionaries (abnormal-finding rules, action groups, AI behaviour, asset locations, assist polling, client SLAs, clinical history terms, delegation types, mismatch rules, code system policy, cytology compliance and lexicon), case workflows (batches, case masks, case search, countersign, on-demand case fetch, consult tokens, codes), critical result notification and alerts, bulk code import and NCCI edits, and the BI feed admin calls now have a server version. The row stays Partial: the API server's endpoints are not built, and more services still have none (see `HTTP_SERVICES_REMAINING.md`).
- **Wording:** "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Training / support:** nothing changes on screen. Nothing that names a patient, and no token, goes in a web address: those calls are sent in the body.
- **Status:** Built (Demo); waiting on the server side (India team).

## Batch 617 (part B): server versions of 26 more services (PS-514)

- **Guide row:** extend "Server-backed services (HTTP)": delivery rules and retries, print settings and the print queue, label reprint runs, delegations, participation types, internal notes, display access, diagnosis codes, external resources, feedback settings, fonts, governing bodies, performance targets, priorities, equipment, data migration, LIS sync, margin extraction and intraoperative critical results now have a server version. The row stays Partial: the API server's endpoints are not built and the remaining services are listed in `docs/architecture/HTTP_SERVICES_REMAINING.md`.
- **Wording:** "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Training / User Guide / Admin Guide:** no change; screens are unchanged.
- **Marketing / RFP line:** every configuration and workflow service has a documented server contract (one route per operation) so a hospital's IT team can see exactly what the server must provide.
- **Standards:** supports the deployment-neutral requirement (public or private cloud); no patient identifiers or display tokens in URLs.

## Batch 617 (part N): terminology look-ups through the server, and a deployment switch for biometric sign-in (PS-488, PS-512)

- **What changed:** with the PathScribe API server configured, ICD-10-CM, ICD-11 and LOINC code searches go to the server (`/api/terminology/nlm/…`), which holds any credentials and caches repeated searches. The browser calls NLM itself only in the demonstration. A server deployment's security policy no longer lists the NLM host (`"terminologyViaServer": true`). Separately, a deployment can set `VITE_BIOMETRIC_SIGN_IN` to `false` to turn biometric sign-in off for everyone while the device checks are being tested; the lab's own policy (Session Security) cannot turn it on then, and says so.
- **User Guide:** no change to what a pathologist does; a failed search still says the search is unavailable. **Admin Guide:** Session Security shows a note and a disabled switch when the deployment has biometric sign-in off; the deployment sheet gains `terminologyViaServer` and `VITE_BIOMETRIC_SIGN_IN`.
- **Training:** none for users. IT: set the origins file and the config key as above.
- **Marketing / RFP:** code lookups for ICD-10-CM, ICD-11 and LOINC run through the customer's own server, so the browser contacts no outside terminology host. Status: built for the browser side (Built (Demo)); the server routes are for the server team and have not been run.
- **Standards:** supports a strict content security policy (HIPAA technical safeguards, ISO 15189 data control).

## Batch 616 (part F): follow-up tracking by commands, and biometric signing through one flow (PS-483, PS-512)

- Follow-up tracking has a server version that works by commands (Pete's decision, Oct 18). The browser sends "mark this case", "record this outcome", "reopen" or "send this email"; the server works out the window, the status and who did it. Nothing in a request names the person acting.
- The demonstration works exactly as before: it works the status out from the browser store.
- Biometric signing (the policy card in Session security, the profile menu's Biometric signing, the invitation after sign-in, and the check at sign-out) now goes through one flow. In the demo it is the labelled Simulated check. With a server address it is the server's challenge and verification, and a browser without WebAuthn cannot use it; the person signs with their password instead.
- Admin Guide: nothing to configure; the server address decides which is used.

## Batch 616 (part D): server versions of the quality, digital pathology, image, grossing, dictionary, reagent, cold-chain, label and intraoperative services (PS-501, PS-502, PS-506, PS-508, PS-510)

- **Guide row:** extend the "Server-backed services (HTTP)" row: 35 more services have a server version (QA activity records and types, supervision assignments, reconciliations, risk weights, validation studies, deficiencies and management reviews; digital pathology results, vendors and scan batches; image vendors and upload; grossing hardware, routing overrides, cassette routing, specimen dictionary, hardware containers and scan stations; reagent lots, cold-chain storage and readings, label layouts, printer profiles; intraoperative entries, the OR event log, OR terminals and display profiles).
- **Wording:** same as part A: "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Privacy line for RFPs:** no patient text (names, MRNs) is ever in a web address; the intraoperative ADT lookup sends the MRN in the request body.
- **Not built, say so:** peer review, CAPA recommendations, label reprint runs, equipment and intraoperative critical-result rules still use the browser-side services.
- **Status:** Built (Demo); waiting on the server side (India team).

## Batch 616 (part E): server versions of the interface, model, protocol, template, routing, macro, flag, message and AI-policy services (PS-509, PS-511, PS-513, PS-515)

- **Guide row:** extend the "Server-backed services (HTTP)" row: 20 more services have a server version (interface exceptions, order-created events, LIS staging queue, AI models and the model store, protocols and the fixative and processing-format dictionaries, template and narrative signals, report templates, routing and print-routing rules, text, voice and stain-order macros, case flags, secure messaging settings, internal messages, AI vendor policy). Still partial: the endpoints are the India team's.
- **Guide row (new, small):** a server build keeps demonstration screens, demo accounts and the Simulated authenticator out; AI and licensed terminology calls go through the product's own server routes. The public NLM look-up is the one outside host the browser calls itself.

## Batch 616 (part A): server versions of the report, accessioning, patient and encounter services (PS-483, PS-503, PS-505)

- **Guide row:** extend the "Server-backed services (HTTP)" row: amendments, informal reviews, LIS amendment notices, the report release buffer, the report change log, report parts, incoming-order intake, drafts, the patient index, encounters, patient history and the outbound queues now have a server version (14 services). The row stays Partial: the API server's endpoints are not built, and follow-up tracking has no server version yet.
- **Wording:** "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Privacy line for RFPs:** on a server deployment, drafts, patient history and report change history are stored on the server, not in the browser; search terms, identifiers and MRNs never appear in a web address.
- **Status:** Built (Demo); waiting on the server side (India team).

## Batch 616 (part C): server versions of billing, cytology, molecular and registry services (PS-498, PS-499, PS-500, PS-504)

- **Guide row:** extend the "Server-backed services (HTTP)" row: billing and charge capture, cytology and cytology QC, molecular batches, racks, control rules and the order queue, and registry reporting now have a server version (52 services). The row stays Partial: the API server's endpoints are not built.
- **Wording:** "the browser chooses the API server when one is configured and the demonstration services otherwise". Do not say the screens work against a live server.
- **Status:** Built (Demo); waiting on the server side (India team).

## Batch 615 (part D): vial and rack labels through the interface engine, right-to-left groundwork (PS-360, PS-293)

- **What users see:** vial and tube labels (aliquots, molecular extracts) and rack, plate and scan-batch labels can now print through a "Direct via Interface Engine" printer, with a Code 128 barcode of the id and a few lines of text. They show up in the same print-job messages as slide and cassette labels, with Retry. Nothing changes on screen for anyone using a QZ Tray or PathScribe Agent printer; those already printed these labels.
- **Admin Guide:** Printers (label stock sizes come from the Label Designer; a layout saved there for molecular specimen, plate or rack is used). **Needs from each site:** the label stock size and printer resolution, so the layouts fit. An id too long for the label is refused with a message, not printed unreadable.
- **Right to left (groundwork, not a new language):** the page direction now follows the language, and the layout is built to mirror. No right-to-left language is offered yet; Arabic or Hebrew needs its translations and a native-speaker review first. Identifiers (case, accession, patient numbers) and physical layouts (organ map, plates, label canvas) never mirror.
- **Training:** none for users. Admins: print a test vial label to the engine printer and check it fits the stock.
- **Marketing / RFP:** "Every label family (cassette, slide, vial, rack, batch) prints through the lab's interface engine"; "The interface is built for right-to-left languages."
- **Standards:** CAP and ISO 15189 (specimen and container traceability); WCAG 3.1.2 and 1.3.2 (language and reading order) for the direction work.
- **Status:** vial and rack labels Built (Demo); right-to-left Partial until a right-to-left language is enabled and reviewed (see the Batch 615 notes in `FRONTEND_COMPLETION_QUEUE.md`).

## Batch 615 (part C): the Code Manager offers a search for each flagged finding (PS-138)

- **What users see:** when a synoptic answer matches an abnormal-detection trigger (for example Margin Status: Positive), the Code Manager shows that finding as a button above the code-system tabs. Pressing it switches to SNOMED, selects the specimen the finding belongs to and fills the search box with the field and value. The search then runs as usual; you can edit the words first.
- **Nothing is chosen for you:** no search runs until you press the button, and no code is applied until you pick a result.
- **When it shows:** only while abnormal detection is on for the facility and SNOMED is allowed by the code-system policy. If nothing matched, nothing is shown.
- **Admin Guide:** Abnormal trigger rules (the rule that matched is the one shown). **User Guide:** Codes.
- **Training:** answer a protocol question that has a trigger rule, open Codes, press the finding, pick a result.
- **Marketing / RFP:** "Flagged findings lead straight to a live terminology search; the pathologist picks the code, the system never does."
- **Standards:** SNOMED CT via UMLS (live search results only); CAP (coding stays a pathologist decision).
- **Status:** Built (Demo). The search is the existing live terminology search (needs the UMLS key to return results).

## Batch 614 (part A): editor by voice or key, Go to routes, Mac and AltGr

- **Text editor by voice or key:** in a report text box say "make bold", "bullet list", "indent more", "find in text", "replace in text", "insert table", "insert signature line", "next heading", "show ruler" and so on (full list in Configuration → Actions, category Synoptic). Keys are Ctrl+Alt+1 Bold, 2 Italic, 3 Underline, 4 Bullets, 5 Numbered list, 6 Indent more, 7 Indent less, 8 Find, 9 Replace, 0 Select all, Ctrl+Alt+. next heading, Ctrl+Alt+, previous heading, Ctrl+Alt+/ table, Ctrl+Alt+[ signature line, Ctrl+Alt+] ruler, Ctrl+Alt+; formatting marks. They act on the text box that last had the cursor.
- **Ruler:** Show / Hide Ruler now shows a ruler above the text (centimetre ticks).
- **Go to routes in the lists:** the Role Dictionary action reference and Configuration → Actions show, for each always-on command, "Alt+J, then X".
- **Mac and European keyboards:** Option (Mac) and AltGr no longer stop hotkeys working. While you are typing a character in a text box (Option+E for an accent) it is never treated as a hotkey. Not yet tried on a Mac or an AltGr keyboard.
- **Admin Guide:** Roles (the editor commands), Configuration → Actions. **User Guide:** Report editor, Keyboard and voice.

## Batch 613 (part A): Case search reporting

- **Search on synoptic answers:** Search has a new **Synoptic answers** section. Pick a protocol, one of its questions, a condition and a value (for example Breast, Tumor size, is more than, 2). Choices are the protocol's own. Every filter must match. They appear in the search summary and are kept in saved searches.
- **Report view:** after a search, press **Report** beside the results. **Group by** pathologist, month, diagnosis, facility, case type, status, priority or subspecialty to see counts, each group's share and the median days to sign-out, with a total. Click a heading to sort; click a group to see its cases. Choose **No grouping** to list the cases with the **Columns** you pick, including answers from synoptic reports, and put them in order.
- **Save and export:** **Save report** keeps the search, grouping and columns under your name; choose it from Saved reports to run it again. **Export report CSV** downloads the report (the counts per group, or the chosen columns for each case) and is recorded in the audit log.
- **Schedules:** under **Schedules**, pick a saved report, how often, the time, who receives it, and optionally the last number of days to cover each run. You can run now, pause, resume or delete, and see the last run. **Runs are Simulated in this version: the report is built and its counts kept, but nothing is sent** until the API server runs schedules.
- **Who:** anyone who opens Search can view reports; exporting needs `search:case-report:export`; schedules need `search:report-schedule:manage`.
- **Admin Guide:** Roles (the two permissions). **User Guide:** Search.
- **Training:** search signed-out cases for last month, press Report, group by pathologist, open a group; choose No grouping, add Breast: Grade, export; save the report and schedule it weekly for a colleague, then Run now and read the last run.
- **Marketing / RFP:** "Ask the system a question across cases, not just one case at a time: how many Grade 3 breast cancers did each pathologist sign out last quarter, and how long did they take?"
- **Standards:** CAP and ISO 15189 (workload and turnaround monitoring), HIPAA minimum necessary (only cases the user may open are counted; exports are audited and grouped reports hold no patient names).
- **Status:** Built (Demo). Reports are built in the browser; the server groups in SQL and sends scheduled files (`docs/architecture/CASE_SEARCH_API.md`, `docs/architecture/SCHEDULED_REPORTS_API.md`).

## Batch 613 (part B): Patient summary print and related cases at sign-out

- **Sign-out:** when the patient has other released cases you may open, a notice appears inside the sign-out view. Each case shows its accession, release date, diagnosis, the **ordering physician** and who gets a **copy**. **Nothing is ticked.** Tick the ones that belong in this report; each chosen report is shown in full below the list, exactly as it will print and be sent. If there is nothing to attach, the notice says so and you sign out as before.
- **Fixed at sign-out:** the chosen reports are part of what you sign. After sign-out they cannot be changed. The printed report, the PDF and the result sent to the LIS carry exactly the section you saw. If a related case is amended later, the report shows a flag naming it; the section on the signed report does not change.
- **Intraoperative diagnosis:** it is now part of the case report. It prints after the case header on the PDF, the text copy and the result sent out (before, it showed on screen only), and appears in any related case that had one.
- **Patient summary:** from **Patient History**, tick released cases (or Select all) and press **Print summary**. The sheet is headed as a summary, not a signed report, lists the accession of every case it was compiled from, and is in date order. Only cases you can already open are offered.
- **Who:** pathologists and fellows attach related cases (`report:related-cases:attach`); every case-access role may print a summary (`patient:summary:print`).
- **Admin Guide:** Roles (the two permissions). **User Guide:** Sign-out; Patient History.
- **Training:** open a patient with two released cases, start sign-out on a third, tick one, read the preview, sign out, print the PDF and find the section; open Patient History and print a summary of both; amend the older case and reopen the signed report to see the flag.
- **Marketing / RFP:** "A pathologist decides which of a patient's earlier reports travel with a new one. What was seen at sign-out is what is printed and sent, and it cannot change afterwards."
- **Standards:** CAP and ISO 15189 (report content and traceability), HIPAA minimum necessary (only cases the user may open; audit without patient data).
- **Status:** Built (Demo). The choice is kept in the browser; the server stores it with the signed report version (`docs/architecture/RELATED_CASES_API.md`). The PDF function must be redeployed (`functions/`). Wording in French, German, Dutch and Korean needs native-speaker review.

## Batch 613 (part C): Access to a patient's other cases

- **Patient History and the case workup:** when the patient has other cases you cannot open, a notice says how many (never which). Press **Ask for access**, pick a reason (the last one you used is preselected; "Other" needs a note) and send. No dialog: the request opens inline.
- **Who decides:** the assigned pathologist of any of those cases, or an administrator. They are told and see **Approve** / **Decline** (a decline needs a reason, which you see) in the same notice. Nobody decides their own request. PathScribe support never does.
- **Open until revoked:** an approval covers that patient, linked identities included, and stays until a pathologist who may decide, or an administrator, revokes it with a reason (Quality Assurance, Access requests, Patient's other cases in force, or the notice). You are told when it ends.
- **Ask early:** do it during workup so sign-out is not held up; you do not need to cancel sign-out to ask.
- **Audit:** request, approve, decline, revoke and each history opened through a grant are logged (counts and accession numbers only, no patient name, no note).
- **Who:** every case-access role may ask (`patient:other-cases:request-access`); pathologists and administrators decide (`patient:other-cases:decide-access`).
- **Admin Guide:** Roles, Quality Assurance access requests. **User Guide:** Patient History.
- **Training:** as one pathologist, open a patient with a case in another pool, ask with "Tumor board preparation"; as the assigned pathologist, approve; as the first, reopen the history; then revoke.

## Batch 613 (part D): Reporting feed for Power BI

- **Configuration → System → Reporting feed (Power BI):** choose which datasets (cases, specimens, billing, quality, workload, audit summaries) and which performing-lab facilities the feed offers; issue a token for each tool (for example "Quality dashboard"); the token is shown once and only a fingerprint is kept. Replace a token (the old one works 24 more hours) or revoke it with a reason. A field catalogue lists every column.
- **Privacy:** every token is de-identified by default: names, record numbers, birth dates and free text are removed and dates are reduced to the month. An identified token needs a named approver and a reason on record; withdrawing the approval stops identified tokens at once.
- **Test a pull:** paste a token and choose a dataset to see how the server would answer (accepted, revoked, expired, wrong dataset, not approved, too many requests). It is labelled Simulated and returns no rows.
- **Who:** Administrators and Lab Directors, with three separate permissions (settings; tokens; identified approval).
- **Admin Guide:** Configuration, System, Reporting feed. **User Guide:** none.
- **Training:** switch the feed on for one dataset and one facility, create a token, copy it, paste it into the test, then revoke it and test again.
- **Marketing / RFP:** "Power BI and other reporting tools read PathScribe through a token-secured reporting API; patient-identifying fields are removed unless a named approver has signed off."
- **Standards:** none directly; supports quality reporting and data-governance expectations. Every change and pull is audited without row content.
- **Status:** Built (Demo). The reporting API itself is server work (PS-787, `docs/architecture/BI_FEED_API.md`).

## Batch 611 (part F) — legacy file import (simulated) and biometric prompt (#132, #166, #158)

- **What changed:** *Migration Jobs* has **Import legacy file**: choose the source system (one with saved field mappings), pick a CSV or JSON file, check the preview, and run. Records that map and validate become draft cases marked *Simulated bulk import*; records that need review or fail create nothing; a legacy accession already imported is refused. The job lists every record with its outcome. Separately, the biometric enrolment window and the sign-out panel are labelled *Simulated*, and use the device's own fingerprint or face prompt where the browser offers one.
- **Admin Guide:** Configuration, Migration, Field mappings (the import needs the mappings' manage permission); Migration Jobs. **User Guide:** Profile menu, Biometric signing; Finalising a report.
- **Training:** save a field mapping for a source system, import a small CSV, open the job, find a draft case; enrol biometric signing, cancel the device prompt (nothing enrolled), enrol again, sign out with the device prompt, then with the password.
- **Marketing / RFP:** "Bring a legacy export in as reviewable draft cases, with every record's outcome traced. Biometric sign-out uses the device's own sensor, with the password always available."
- **Standards:** HIPAA (audit without patient data or file names), 21 CFR Part 11 and EU Annex 11 (the e-signature design, once a server verifies the device signature).
- **Status:** Built (Demo). Bulk import jobs and OCR in the interface engine, and a server-issued and verified WebAuthn challenge, remain server-side work.

## Batch 611 (part H) — multi-factor sign-in (#157)

- **Second factor, per organisation:** Configuration → System → Session Security has a new *Second factor* card. Choose who is asked (no one, the roles that sign reports, or everyone), how often a signature asks for a fresh code (default 30 minutes) and how long a sign-in's second factor lasts before the session ends (default 12 hours). Saving needs the existing Session Security permission and is audited.
- **Hospital single sign-on:** your identity provider asks for the second factor. PathScribe checks that its sign-in response says it was used; if the organisation requires it and the provider did not report one, the sign-in is refused with a plain message. At a signature the provider is asked for a fresh sign-in and must report it again.
- **Demo accounts (Simulated):** after the password, a Simulated authenticator: first time, a secret to add to any authenticator app, the first code, then eight recovery codes shown once; afterwards a code (or a recovery code). A "Show demo code (Simulated)" button shows the code so no phone is needed. Five wrong codes lock codes for 15 minutes; a code works once.
- **At a signature:** when the last second factor is older than the step-up time, the signature asks for a code (password sessions) or sends the person to the provider again (single sign-on). A wrong password never spends a code.
- **Lost device:** an administrator with the new permission *Reset a second-factor enrolment* (Admin by default) resets a colleague's enrolment in their own organisation from the same card.
- **Who:** every user the policy covers; administrators set the policy.
- **Admin Guide:** Session Security → Second factor; configuring the identity provider to report MFA (`docs/architecture/MFA.md`). **User Guide:** Signing in with a second factor; Signing a report (the code field).
- **Training:** turn the policy on for Pathologists, sign in as a demo pathologist, enrol, use "Show demo code", then sign a case after 30 minutes and see the fresh-code prompt; reset the enrolment as an administrator.
- **Marketing / RFP:** "Multi-factor sign-in: we enforce the hospital identity provider's second factor and prove it at every signature; per-organisation policy, step-up before signing, recovery codes, lockout, full audit trail." Supports HIPAA technical safeguards (person or entity authentication), ISO 15189 (access control), WCAG 3.3.
- **Status:** Built (Demo). The second factor for real staff is the identity provider's; the Simulated authenticator is for demonstration only. The API server must repeat the checks (`docs/architecture/MFA.md`).

## Batch 611 (part E) — simulated export server, matrix block comments, organ retention custody chain (#194, #10, #59)

- **Exports without a server (demo):** with no PathScribe server connected, **My exports** and the export notices now behave like the real thing: a small export is ready at once, a larger one (over 500 rows) shows Preparing for a while, up to 30 seconds, then offers Download. Three open exports per user, Cancel, and the 7-day expiry all work. Everything is marked **Simulated**, and exports disappear at sign-out. A checkbox on My exports makes every export take about 8 seconds so training can show the waiting experience.
- **Matrix block comments:** the matrix block editor (Details tab) has a Comments list with a one-line box, the same as blocks and stains. Comments are plain text, added with the Add button or Enter, and each one writes a "Matrix Block Comment Added" audit entry (no comment text in the audit).
- **Organ retention custody chain (UK HTA / NZ cases):** each time the holder or location of retained organs changes, the earlier record is kept. The autopsy retention panel lists "Earlier custody records" under the current one, and the case timeline shows every move. Records are added to, never edited.
- **Who:** all export users (exports); technologists and pathologists (matrix comments); autopsy staff (custody chain, existing permission `autopsy:retention-detail:record`).
- **Admin Guide:** none. **User Guide:** My exports (the Simulated label); Matrix block editor (Comments); Autopsy, organ retention (earlier custody records).
- **Training:** run a large export and watch Preparing turn into Download; add a matrix block comment; record two different holders and see both on the timeline.
- **Marketing / RFP:** "Exports of any size run in the background with a notification and a download; every move of retained organs is kept in a custody chain."
- **Status:** exports Built (Demo) (the server itself is a separate team's work); matrix comments Built; custody chain Built.

## Batch 609 (part A): Report PDF layout and images in reports

- **Printed reports follow the lab's settings:** page size and orientation, margins (never below 12.7 mm / 0.5 in, so a printer does not clip text), font family, size, weight, underline and case for the header, body and footer, and the header and footer parts from Configuration, Report Appearance. Before this, the screen preview showed these settings but the printed PDF always used A4 portrait with fixed fonts.
- **Font sizes are in pixels** on the Document Style screen and print at 0.75 pt per pixel, with a 7 pt floor. A lab that never set a size now prints the 10 px default at 7.5 pt; raise the size if the printed text is smaller than before.
- **Fonts:** Arial, Helvetica, Calibri and Verdana print in Helvetica; Times New Roman and Georgia in Times; Courier New in Courier. Korean reports keep Pretendard. The cytology report keeps its embedded font and does not use header or footer parts (it has no template).
- **Header and footer parts** replace the standard institution block (first page) and the confidentiality line (every page, above the barcode band) when they have content. Footer parts carry no page numbers.
- **Attach images (surgical report page and Cytology Workspace):** a new Attach images button opens a window where you paste an https link to the image in your hospital's own system, pick the type (Gross specimen, Microphotograph, Block face, Other; remembered) and an optional caption, and press Enter. Up to 12 images per report. Images print after the report's own pages, one per page with its caption; an image under 300 DPI at its printed size is flagged but still prints. If a link cannot be reached when the report is made, that page reads "Image Unavailable" instead of the image being left out silently. A corrupt or non-image link stops the release until it is removed.
- **PathScribe stores no images:** only the link is kept; the image is fetched when the report is made and becomes part of the stored PDF, so a change at the source later does not alter a released report.
- **Permission:** `report:case-images:attach`, held by every role with case access by default.
- **Who:** Pathologists, residents, PAs and technologists (images); administrators (report appearance).
- **Admin Guide:** Configuration, Report Appearance (page setup, Document Style: the px-to-pt rule, font mapping, margin minimum); Roles (the new permission).
- **User Guide:** Report page and Cytology Workspace: Attach images.
- **Training:** link an image, add a caption, make a preview PDF, find the image page after the report; remove a link; see "Image Unavailable" when a link is dead.
- **Standards:** supports PS-276 section 1.1.3 (300 DPI flag for embedded raster images); links-only storage follows the Oct 13 images rule.
- **Marketing / RFP:** "Printed reports match the lab's layout settings, and gross and microscopic photos from your imaging system print with the report, with a captioned page for each."
- **Status:** Built (Demo). The browser fetches each link itself, so it works for a host that allows it (CORS) and otherwise prints the Image Unavailable page; with the API server the server fetches the link (private-address blocking and the hospital system's sign-in are server work). The renderer in `functions/` must be redeployed for the layout settings to print.

## Batch 603 — Wall displays need a token; break-glass is a permission; QA export has no MRN

- **Wall displays:** Configuration → Display Profiles, and → OR Suite Terminals, each row has a **Display token** button. Issue a token (choose how long it lasts), copy it (shown once) and enter it on the display when you bind it. Revoke it to blank the display within a minute. Issuing a new token stops the old one at once.
- **What the displays show:** the OR board shows the surgical case ID and room instead of the patient's name and MRN, including on the dismissal confirmation. The Facility Ops display shows no patient identifiers.
- **Break-glass rebind:** rebinding a downtime patient identity from the Audit Log needs the new permission **Rebind downtime patient identity** (Admin has it by default). A reason and written justification are still required and audited.
- **Cytology-histology correlation export:** the MRN column is gone; use the accession numbers. (The printed view still shows MRN.)
- **Not yet:** the server-side check that refuses a revoked token is Planned; MFA is Planned with the OIDC/Entra work.

## Batch 602 — Hotkeys and voice know the screen you are on

- On a screen, a hotkey or phrase runs that screen's command, even if an always-on command (Configuration, Resources, ...) uses the same key.
- To reach the always-on command from such a screen, press Alt+J, then its key. A "Go to" panel shows the keys; Esc or 3 seconds of waiting closes it without doing anything.
- Six default hotkeys changed (Enhancement Request Alt+Y, Testing Feedback Alt+X, Resources Alt+Q, Focus Case Search Alt+Shift+B, Participation Types Alt+Shift+W, Touch Prep Performed Alt+Shift+Y). Keys you customised are kept.

## Batch 601 — Every command can be assigned to a role

- **What changed:** Staff → Roles → Role Dictionary now lists every voice and shortcut command, including the ones that only open a screen, filter or sort a list, move between rows or cancel a window. Six new groups: Go To & Help, Worklist Views & Filters, Search & Messages Views, My Contribution Views, Report Screen Dialogs & Views, Cytology Screen Views.
- **Starting points:** roles with case screens have all of them on; Admin, Lab Director and QA Reviewer have the going-to and searching ones. Duplicate the nearest role and change what differs. Existing sites receive these once; anything you switch off stays off.
- **Known:** some hotkeys are shared by two commands that can be active on the same screen; a fix is planned (`ACTIONS_COVERAGE.md`).

## Batch 600 — More commands in the Role Dictionary, with defaults

- **What changed:** Staff → Roles → Role Dictionary lists 60 more commands, in seven new groups: Report Workflow, Case Handling, Orders & Printing, Intraoperative, Cytology Screening, Workstations and Result Dispatch. These are the voice and shortcut commands that save, submit, log, order, print or create something.
- **Starting points:** every built-in role already has the commands its job uses switched on (for example the Histotechnologist has the microtomy, embedding and slide distribution commands; the Cytotechnologist has the cytology screening commands). Start from the role closest to yours, duplicate it and change what differs.
- **Existing sites:** built-in roles receive the new commands the next time roles load. A command you switch off stays off. Your own roles are not changed.
- **Not changed:** what a person may do is still decided by their permissions; these switches control which voice and shortcut commands a role can use.

## Batch 595 — Code Systems setting

- **What changed:** Configuration → System → Code Systems. For each jurisdiction, an administrator sets which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT and others) are off, optional or required, and from what date. The settings are saved and audited. **The Add Code window, sign-out and outbound messages do not use them yet** (Planned), and the screen says so.
- **User Guide:** none yet. **Admin Guide:** new section "Code Systems" in the jurisdiction chapter (`ADMIN_GUIDE_JURISDICTIONS.md`, section 3.0); Role Dictionary, the new permission "Manage the code systems" (Admin and Lab Director).
- **Training:** to prepare a region for ICD-11, add an ICD-11 row with a start date; change nothing else.
- **Marketing / RFP:** "Moving a region from ICD-10 to ICD-11 is a dated setting, not a software upgrade." Say "configurable ahead of the transition"; do not say the coding screens already follow it.
- **Standards:** ISO 15189 and CAP (controlled, audited configuration); HIPAA (no patient data in the setting).

## Batch 593 — Jurisdiction setup chapter and known-gaps tracker

- **What changed:** documentation only. New Admin Guide source `ADMIN_GUIDE_JURISDICTIONS.md` (give a facility its jurisdiction, then review Country Signing Rules, Jurisdiction Payment Mapping, Governing Bodies and the per-jurisdiction rule screens). New `KNOWN_GAPS.md`, the running release-scope list.
- **User Guide:** none. **Admin Guide:** new chapter "Setting up and maintaining jurisdictions" (paste from the source file).
- **Training:** a new region goes live in two steps: set the facility's Jurisdiction on the General tab, then review the four System screens.
- **Marketing / RFP:** "Thirteen jurisdictions are supported, each with its own signing rules, payment schemes, retention figures, AI-vendor policy and report language." (Adding a country needs a software change.)
- **Standards:** ISO 15189 and CAP (retention and signing authority by jurisdiction); GDPR and HIPAA (AI hosting-region policy per jurisdiction).

## Batch 589 — Nine app bugs fixed

- **What changed:** a label with no patient prints a blank name; the Confirm Field shortcut confirms the field you are in; Report Draft text and typed Microscopic Descriptions are checked for critical findings, and the highlight is kept when the case is reopened; the Label Designer canvas and width box are exact; the error screen on a case report keeps the navigation bar; an OR PIN set on the Staff screen works; labels sent to a QZ Tray printer connect first and say so when the printer is not connected; the demo has five peer review discordances.
- **User Guide:** Label printing (printer not connected message); Report Draft and critical findings; Label Designer; keyboard shortcuts (Confirm Field). **Admin Guide:** Staff (OR Staff role and PIN); QZ Tray setup, see `QZ_TRAY_CERTIFICATE_GUIDE.md`.
- **Training:** if a label opens in the browser print window and a message says the label printer is not connected, check that QZ Tray is running. A flagged finding stays highlighted until the flagged words are removed.
- **Marketing / RFP:** "Critical findings in the narrative are flagged before sign-out, including text typed by the pathologist, and stay marked when the case is reopened."
- **Standards:** ISO 15189 and CAP (peer review and CAPA demonstration data); HIPAA (no patient identifiers in the new demo data or the new messages).

## Batch 588 — Deleting a block in process

- **What changed:** the block and stain editor has a **Delete this block** button. Pick a reason (a note is required for Other) and confirm. The block stays on the case, marked Deleted, with who, when and why; its unfinished stains are cancelled and its billing codes released. Billing staff see a "Block deleted" finding under Quality Assurance → Financials → Billing deficiencies and decide whether a credit is due. No message is sent. A new permission, "Delete a block in process", appears in the Role Dictionary.
- **User Guide:** the block and stain editor (Delete this block); Quality Assurance → Financials (the "Block deleted" finding). **Admin Guide:** Role Dictionary, the new permission. Technician roles hold it by default; each facility can change which roles hold it.
- **Training:** delete only a block that should not exist (entered in error, duplicate, not needed, processing failure). A wrong piece in a block is still Cancel this block. Once a case is signed out the button is not offered.
- **Marketing / RFP:** "Blocks are never erased: a deleted block stays on the case, marked Deleted, with who, when and why, and billing is asked to review any credit."
- **Standards:** ISO 15189 (traceability of records), CAP ANP.11600 (specimen handling documentation), HIPAA audit controls.

## Batches 583 and 584: template e-mails move to the server; dialogs, breadcrumb and billing reasons; more review tests
- **What changed:**
  - **Template e-mails (Partial: needs the server, phase 2e).** Submitting, requesting changes, approving and publishing a protocol, and the nightly protocol sync, are designed to e-mail the right people: submitted goes to Template Approvers and Lab Directors; changes requested, approved and published go to everyone who saved the template; sync events go to Admins. Each e-mail is in the recipient's language, sent from a PathScribe address, immediately, with no opt-out in the first release. Nothing is sent in the demo.
  - **Configuration dialogs:** after a click outside (or Escape) with unsaved edits, "Discard changes" now closes the dialog; before, it forgot the edits but left the dialog open.
  - **Case breadcrumb:** a case opened from Search shows Home › Search › Case Report and returns to Search.
  - **Billing after sign-out:** adding, removing or applying a block's code at specimen level on a signed-out case asks for a reason (a picklist plus a required comment), exactly as at case level, and the reason is in the audit entry. Cases billed by the lab's own system (Assist) are not asked.
- **Who:** template authors, approvers and Lab Directors (e-mails); everyone who configures; billing and coding staff.
- **User Guide:** the case breadcrumb (Search); the post-sign-out billing reason for specimen-level codes.
- **Admin Guide:** Protocols → Review: who is e-mailed on each event (when the server exists); Configuration dialogs and unsaved changes.
- **Training:** change a code on a signed-out specimen and show the reason window; open a case from Search and use the breadcrumb.
- **Marketing / RFP:** "Every billing change after sign-out is attributed and carries a reason." "Protocol approvals notify the right reviewers in their own language." (the second once the server is live).
- **Standards:** ISO 15189 (record of changes after release); HIPAA and GDPR (recipients chosen on the server, never a staff e-mail list in the browser).
- **Status:** dialogs, breadcrumb and billing reason Live; e-mails Partial.
- **Also, Batches 583 and 584:** twenty more review tests; 34 In Review tickets now have one. Several found real app bugs, listed for decision in `src/i18n/README.md` (Batch 584).
- **Also, Batch 585:** five more review tests (the "Mixed" tickets PS-60, 269, 292, 474, 475); nothing a user sees changes. 39 In Review tickets now have one.
- **Also, Batch 586:** four more review tests (PS-63, 277, 283, 342); nothing a user sees changes. 43 In Review tickets now have one.
- **Also, Batch 587:** six more review tests (PS-73, 89, 146, 327, 341, 470); nothing a user sees changes. 49 In Review tickets now have one.

## Batches 581 and 582: review tests in a real browser
- **What changed:** nothing on screen. Reviewing a delivered ticket can now be done by running its Playwright test, which follows the ticket's review steps in a real browser (Chrome's engine, or Firefox); ten In Review tickets have one so far.
- **Who:** the product owner and the QA team.
- **User Guide / Admin Guide:** none.
- **Training:** for QA staff: `docs/quality/PLAYWRIGHT_REVIEW_GUIDE.md`.
- **Marketing / RFP:** "Every delivered change is verified by automated browser tests that follow its acceptance steps."
- **Standards:** ISO 15189 and CAP expectations for validated software changes (verification evidence per change).
- **Status:** Live (Chromium); Firefox on request.

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

## Batch 604: Simulated mail, alerts and notices
- **What changed:** With no mail service connected, every e-mail the product would send is kept in a Simulated mail outbox (Configuration, System) instead of being lost or faked: follow-up e-mails, tumor board invites, template lifecycle notices, secure e-mail, support tickets and feedback, and the e-mail leg of critical alerts. Each shows a Simulated label, a notice on screen, and an audit entry. Critical-alert channels show what would have been sent, per channel, labelled Simulated. Support tickets now also warn when the open case's patient name is typed or a screenshot is attached. Support access gains a PDF export of the audit stream, a Simulated "Ticket closed" action that ends the access, and a record of the support agent's own exports and configuration changes.
- **Who:** Administrators, pathologists, support agents.
- **Admin Guide:** Simulated mail outbox; Support access (PDF export, ticket closed).
- **Marketing / RFP:** "No silent failures: anything the demo cannot send is shown, labelled and audited."
- **Status:** Live in the front end against browser-side services; real sending is the API server's mail service (`/api/notifications/email`, `/api/notifications/template-events`).

---

## Batch 606: Printing, labels and the site agent
- **What changed:** Every print route the demo cannot reach now answers with a labelled **Simulated** result instead of failing or pretending: BarTender, Zebra Browser Print, Direct via Interface Engine, the PathScribe Agent when no agent program is running, engraving, the label sent when a scan is recorded, and report print jobs for network and site-agent printers. Each simulated print shows a notice, an audit entry, and a row in **Configuration, System, Simulated print log**, which also has a switch that makes simulated prints fail, to try the failure path. A report print job that went the simulated way shows "Simulated: sent to printer" in the print queue. Requisition, container, decant and molecular labels now go down Direct via Interface Engine too. The **slide label layout** (Print settings) now sets the barcode dot size, text position and font of the printed slide label, with a fit check, a preview and a test print. Layouts saved in the **Label Designer** are now used by the printed requisition, specimen, decant, block, slide and molecular labels (ZPL and browser print), a facility override first where the label type allows one, then the enterprise default, then the built-in layout. In the designer, a field can be shown only when another field has a value, is empty, or equals a value, with a preview; every save keeps a version (who and when) that can be restored; and one layout exports to ZPL, EPL and DPL. The specimen form has a **Capture weight** button (the scale agent, a labelled simulated reading in the demo, or typing) and **Capture gross photo**. A slide label is produced once: the scan at microtomy and the Microtomy Workstation print no longer both produce one, and a deliberate reprint always prints. The lab page size and margins are sent in surgical and cytology report render requests. A case can name a **technical component facility**; the surgical report request then carries that lab's letterhead as a second block, without its director or CLIA/ISO number.
- **Who:** Administrators (printers, layouts, the simulated print log), histotechnicians (slide and block labels, microtomy), grossing staff (weight, photos), pathologists and lab directors (split reports).
- **User Guide:** Specimen form: Capture weight, Capture gross photo. Case team: technical component facility.
- **Admin Guide:** Simulated print log; Print settings, Slide label layout; Label Designer (show rules, version history, EPL/DPL export, saved layouts now print).
- **Training:** try the failure switch, then print a label and see the failed result; change the slide layout and print a test slide label.
- **Marketing / RFP:** "Label and report printing you can try end to end before a printer is connected: every route shows what would have printed, where, and how many, and says it is simulated."
- **Status:** Live in the front end; real sending needs the printer vendors' services, the site agent program and the API server (see `KNOWN_GAPS.md`).

---

## Batch 605: Simulated interface engine, inbound and outbound
- **What changed:** With no interface engine connected, the demo now plays both ends. Inbound: the Mock Interface Engine page runs sample ADT messages (admit, update, merge, link, move, change visit number, move visit) and events, and the result is shown. An unresolved merge, link or move exception can be bound to a patient by hand. Outbound: block, slide and specimen label orders, material scan events, charges and financial-class payloads go to a simulated engine that records them (type and outcome only), shown in an Engine log and in Interfaces, Outbound. Newly created blocks are handed over automatically with a notice; charges and the financial-class payload are sent at sign-out. Also: Interface Engines, Server Jobs and the Assist LIS poll schedule show Simulated status; the Engraver Monitor and dispatch history show seeded Simulated data when no Firebase project is connected (with an organisation filter); the Add Code window accepts a typed ICD-O-3 code (behaviour digit checked) and offers a Simulated ICD-O and ICD-11 lookup; queued registry reports can be handed to a simulated registry; the specimen sync badge settles through a simulated LIS answer; frozen section codes are suggested (unconfirmed) for accept or dismiss; a typed MRN shows the active encounter before submit; the crosswalk can be set per site; cross-organisation merge, link and move need an extra warning and are audited.
- **Who:** Accessioners, histology, administrators, billing, coders.
- **Admin Guide:** Mock Interface Engine (Inbound, Engine log, Registry answer); Crosswalk (Site); Engraver Monitor.
- **Marketing / RFP:** "Every interface can be shown end to end in the demo, clearly labelled Simulated, with nothing silently dropped."
- **Status:** Live in the front end against browser-side services; real traffic needs the interface engine, the billing engine, the registries and the vendor specifications.

---

## Backfill still to do
Batches before 521 are summarised in `FEATURE_OVERVIEW.md`, which was last fully verified in August 2026 with sections added through September. A catch-up pass will verify it against the code and add a guide entry for each capability added since August (Batches ~400–520), in the format above.

## Batch 607: code systems and coding

- **Add Code window:** it shows only the code systems your region allows today (Configuration, System, Code Systems). A system your region requires is marked "Required". A code in a system that is off cannot be added.
- **Sign-out:** if a required system has no code on the case, sign-out asks first. Going ahead is an override and is written to the audit log (system names only).
- **Case coding:** a "Case coding" button in the Add Code window lists each code with its system, release, where it came from (entered, AI suggestion, map) and the AI model and confidence. ICD-10 and ICD-11 appear side by side. The ICD-11 column comes from a small sample table and is labelled Simulated.
- **OPCS-4:** the tab says OPCS-4 needs an NHS TRUD licence. A short reference list is shown, labelled Simulated, and cannot be applied to a case.
- **ICD-O tab:** searching by code (8500 or 8500/3) or by words (glioblastoma) now finds ICD-O-3 morphology codes with their behaviour from a bundled table.
- **Outgoing charge messages:** ICD-10 codes are left out when your region has ICD-10 switched off.

## Batch 608: Cytology reviewer pools, QC compliance, Return to Trainee and the QA report columns

- **Reviewer pools:** in Configuration, Staff, each person can be given cytology QC reviewer pools (role codes such as SENIOR_CT or PATHOLOGIST). Leave it empty and a Pathologist counts as PATHOLOGIST. A QC review can be taken or recorded only by someone in the pool named by the rule that selected the case, and never by the person who signed the case out. Anyone else sees a note instead of Assign to Me, and the service refuses the action too.
- **QC compliance:** the Cytology QC queue has a Compliance view: assignments, resolved reviews, concordant and discrepant counts, the discrepancy rate (a dash until something is resolved), major and minor counts, SLA escalations, supervisor bypasses, and each reviewer's own rate.
- **Suggested severity:** the Bethesda review on the screening page and each row of the QC queue show a "Suggested" badge (Abnormal, Critical or Malignant) from the interpretation. It is advice only and never blocks sign-out.
- **Return to Trainee:** on a cytology specimen released for countersign, the attending types feedback (required) and returns it. On an autopsy report released for countersign, the same bar appears. The trainee becomes the owner again, the case shows as returned, and the trainee sees the attending's feedback in a banner.
- **Prior cervical procedure:** the accession form records a prior cervical procedure (none, LEEP, cold knife conization, cryotherapy, other). A recorded procedure drives the high-risk factor alongside the diagnosis history.
- **Details for the QA reports:** the screening page records the HPV assay name, the liquid-based platform (ThinPrep or SurePath), and for a positive HPV result the action taken (colposcopy referral with dates). The facility record has a national screening registry ID.
- **QA reports:** the HPV positivity monitor adds an Assay column. The UK failsafe report counts colposcopy referrals and referrals with no response after 28 days. The EU compliance matrix adds registry IDs, ThinPrep and SurePath counts, and interval adherence from a per-country, per-age interval table (Configuration, Cytology, Country and laboratory rules; the starting values are examples to check against your programme).
- **Proficiency testing:** the proficiency report has a panel builder. Build the lab's answers to the provider's challenge slides, submit, then apply a Simulated result. It is labelled Simulated, audited without patient data, and not counted in the rates or the consecutive-deficiency rule.
- **Molecular QC and control wells:** the molecular QC reports follow the selected organisation or facility (a run with no location shows at enterprise level only). Trace works for control and calibrator wells: control ID, lot, expiry, plate, deck and instrument.
- **Who:** Cytotechnologists, pathologists, cytology QC leads, trainees and attendings, administrators, QA managers.
- **Admin Guide:** Configuration, Staff (QC reviewer pools); Cytology, Country and laboratory rules (screening intervals); Facilities (national registry ID); Quality Assurance, Cytology QA (proficiency panel).
- **Marketing / RFP:** "Peer review is limited to the right reviewers, trainees get written feedback when a case is sent back, and the HPV, failsafe and EU reports show the columns auditors ask for."
- **Status:** Live in the front end against browser-side services. Real PT grades, registry feeds and national interval rules need the provider, the interface engine and programme data (see `KNOWN_GAPS.md`).

---

## Batch 609 (part C): AI model settings, dictation languages and medical spell check

- **Model settings (Configuration, Models):** each model your organisation has adopted has a Settings button. Two settings, both optional (leave blank to use the organisation setting): the longest answer the model may give (50 to 8,000 tokens), and a confidence threshold for this model (0 to 100). A model with settings shows a "custom settings" badge. The longest-answer setting caps every AI call made with that model; the threshold decides which suggestions from that model count as above threshold on the report page and in the header badge. Saving needs the same permission as changing models.
- **Dictation spelling:** AI refinement of dictated text now follows the lab's spelling: American, British (and Irish), Australian (and New Zealand) or Canadian. Australian and Canadian dictation used to come back in American spelling.
- **Dictation in French, German, Dutch and Korean:** the refinement instructions are now written for each language: the text stays in that language, with that language's own number and punctuation style. The wording is machine-assisted and needs native-speaker review.
- **Voice settings (Configuration, System, Voice):** "Match English commands loosely in other languages" (on by default). Turn it off once a language's own commands are in place: a mis-heard French, German, Dutch or Korean phrase is then never run as a near-miss of an English command. Exact English phrases still work. The same page lists the exact instructions sent to the AI for each English spelling and each language, so a native speaker can review them.
- **Medical spell check:** German, French and Dutch now have a starter list of pathology terms (about 190, 155 and 170), so words such as Karzinom, Adenokarzinom, carcinome épidermoïde and plaveiselcelcarcinoom are no longer flagged. The German general dictionary is unchanged. The lists are a starter set and need native-speaker clinical review; they will be extended from the national SNOMED CT editions once licensed.
- **Who:** Administrators (model settings, Voice settings), pathologists and technicians who dictate.
- **Admin Guide:** Configuration, Models (Settings); Configuration, System, Voice (English fuzzy-match switch, instructions by language); Spell check (German, French, Dutch medical lists).
- **User Guide:** Dictation: spelling follows the lab; commands in other languages.
- **Marketing / RFP:** "Dictation follows your lab's spelling and language, and each AI model can be tuned for your organisation: answer length and confidence threshold."
- **Status:** Live in the front end. The AI model catalog and store still run on browser-side demo services; the licensed SNOMED CT, LOINC and SPECIALIST releases (PS-343) and native-speaker review are outside the code.

## Batch 609 (part B): Mismatch check after sign-out, Final Diagnosis rule, template audit and the Upload Protocol check

- **Amendments, corrections and addenda:** the clinical-pathologic mismatch check now runs after first sign-out. While a report is unlocked for an amendment or correction, the same alert as before sign-out appears on the report; the re-sign-out asks again. An addendum's text is checked together with the report's diagnosis before it is released. A decision already recorded still counts: a typo fix, or a finding no worse than what was decided, does not ask again.
- **The setting:** Configuration, System, Clinical Mismatch Rules has a new card, "Amendments, corrections and addenda". On (the default), a high-risk mismatch (a Block rule) holds the release until the pathologist records Resolved or Unresolved. Off, the alert still shows ("this will not hold the release") and the mismatch is logged to the QA dashboard, but nobody has to stop. Changing it needs the same permission as the rules and is written to the audit log.
- **Final Diagnosis field:** the Template Builder warns as soon as a Final template has more than one field marked as the Final Diagnosis, and Publish is disabled until only one is left. The Part Builder warns when a saved part leaves a Final template with more than one. Preliminary templates are exempt. Saving a draft is still allowed.
- **Template lifecycle in the Audit Log:** every step of a synoptic protocol's life now writes an entry: draft saved, submitted, changes requested, resubmitted, approval recorded, published, an older version archived because a new one replaced it, archived, restored, reset to draft, draft deleted. The entry names the protocol, its version and the status change. A reviewer's note text is never copied into the log.
- **Upload Protocol:** the window reads the file and shows the result straight away. JSON (a PathScribe protocol file, as made by Export JSON) is checked section by section and can be imported as a draft, which then goes through review like any other. XML (CAP eCC / SDC shape) and Excel files are checked for format and reported, but cannot be imported yet. Every result says the same plain thing: unverified against CAP or RCPath, because only the file format was checked.
- **Who:** Pathologists, laboratory directors, template authors and approvers, QA managers, administrators.
- **Admin Guide:** Configuration, System, Clinical Mismatch Rules (new card); Configuration, Protocols (Upload Protocol, Review Queue); Template Builder (Assembly and Part Builder); Audit Log (template events).
- **Marketing / RFP:** "A late amendment is checked against the clinical history just like the first report, a template with two diagnosis fields cannot be published, and every change to a protocol is in the audit trail." ISO 15189 (document control), CAP (amended and corrected reports).
- **Status:** Live in the front end against browser-side services. The licensed CAP and RCPath protocol content, and importing their XML and Excel files, need the licence and the bodies' sample files (see `KNOWN_GAPS.md`).

## Batch 610 (part A): Autopsy turnaround, Autopsy Dashboards and frozen section targets

- **Autopsy turnaround chip:** the autopsy worklist and the report page show whether the report being worked on (PAD, then FAD) is on track, due soon (last 20% of the window), overdue, met or signed late. The clock starts at body arrival. The target is the jurisdiction figure, or an Autopsy PAD / Autopsy FAD rule from Configuration, TAT. Time on ancillary hold (toxicology, neuropathology) is not counted. Working-day targets skip weekends only; public holidays are not known, so a deadline can be later than shown, never earlier.
- **Autopsy Dashboards (Quality & Compliance):** Case, Department and Enterprise views of turnaround, consent, organ retention and cause of death, with a period choice. Department lists the reports overdue now; Enterprise compares facilities and jurisdictions. Simulated cases are included by default and labelled Simulated; one switch turns them off.
- **Frozen section targets (Intraop):** the OR board and queue use the Frozen Section rule from TAT configuration (default 20 minutes, warning at 5). The rule has a new "warn when this many minutes remain" field. Each specimen has a STAT / Routine switch (one click) so the matching target applies.
- **Who:** Pathologists, autopsy staff, quality managers, laboratory directors, administrators.
- **Admin Guide:** Configuration, System, TAT (Autopsy PAD, Autopsy FAD, Frozen Section warning time); Quality & Compliance, Autopsy Dashboards (role access `screen:autopsy-dashboards:open`).
- **User Guide:** Worklist (autopsy chip); Intraop Queue (STAT/Routine switch).
- **Marketing / RFP:** "Every autopsy shows whether its preliminary and final reports are on time, and quality managers see turnaround, consent, organ retention and cause of death by case, department and enterprise."
- **Standards:** ISO 15189 (turnaround monitoring), CAP autopsy turnaround expectations, GDPR (consent and retention visible).
- **Status:** Live in the front end against browser-side services. Cause of death is a category on Simulated cases only until the signed report carries it as data; public holidays need a holiday calendar (see `KNOWN_GAPS.md`).

## Batch 610 (part D): Diagnosis and biomarker tumor board rules, AI discordance report, spoken delegation types

- **Configuration → System → Tumor Board Auto-Flag Rules:** a new card, "Diagnosis and biomarker rules". An administrator adds a rule made of up to six criteria (diagnosis text, a biomarker result, a margin under a distance) and picks the board; a signed case that matches every criterion is listed for that board with the reason. A facility can also override the board for a rule.
- **Quality Assurance → AI Discordance:** AI results that disagree with the pathologist, results that stalled (no answer within the lab's limit, set on the tab) and the concordance rate by algorithm, with an export (needs `qa:ai-discordance:export`).
- **Delegate dialog by voice:** saying "request peer review", "formal consultation" or "full transfer" opens the Delegate dialog with Informal Review, Second Opinion or Case Reassignment already chosen. If that type is turned off, the dialog says so.
- **Delegated work:** when the person a case was delegated to signs it out, the delegation is completed and the case leaves "Delegated to me".

## Batch 610 (part B): Performance targets, client service levels and the jurisdiction overview

- **Configuration → System → Performance Targets:** the cases-per-month and RVU targets (and the TAT and QC rows) are now saved. Change a value and it is kept straight away; add a target of your own (cases, RVUs, percent or hours; daily to yearly); built-in targets cannot be removed. Needs `config:tat-targets:manage`. Each change is in the audit log (numbers only).
- **Productivity dashboard:** a Targets tile shows this period's cases and RVUs against the monthly targets (Met, On track or Behind) and how last period ended. The old fixed target percentages are gone; a person with no target set sees none.
- **Configuration → System → Client Service Levels:** for each client (by assigning authority) set the hours to first touch and to the signed report, with optional STAT hours. Cases are measured from the time received. Needs `config:tat-targets:manage`.
- **Where the service levels show:** a per-client table on the Quality tab and the Productivity dashboard (within, late, average, still open past target), and an "SLA" badge on the worklist for an open case already past its client's target (hover for which target).
- **Configuration → System → Jurisdiction Overview:** a read-only page, one table per country, gathering the facilities, roles offered, who can sign out, code systems, AI policy, retention rule sources and cancer registries, with a Change link to the screen where each is edited.
- **Who:** Administrators, laboratory directors, quality managers, pathologists (dashboard and badge).
- **Admin Guide:** Configuration, System, Performance Targets; Client Service Levels; Jurisdiction Overview.
- **User Guide:** Productivity dashboard (Targets tile); Quality tab (client service levels); Worklist (SLA badge).
- **Training:** set a monthly cases target, open the Productivity dashboard and see the tile; give one client a 4 h / 48 h service level and see a late case get the worklist badge.
- **Marketing / RFP:** "Per-client turnaround commitments are tracked case by case, flagged on the worklist while a case is still open, and reported by client; productivity is measured against targets your laboratory sets."
- **Standards:** ISO 15189 (turnaround monitoring and review of contracted service levels), CAP (turnaround monitoring).
- **Status:** Live in the front end against browser-side services (saved in the browser until the API server stores them). Targets are not yet set per pathologist or per facility.

## Batch 611 (part G): Smart Capture charge suggestions (prototype)

- **Billing panel on a case:** a **Smart Capture** button labelled *Prototype, not compliance-reviewed*. It lists suggested charge lines with the rule and evidence behind each; a person accepts or rejects each line; a pathologist confirms; a payload preview shows what would leave; the approved lines can then be exported (to the labelled Simulated engine in the demo). If the case changes after a review it is shown stale and must be made again.
- **Configuration → System → Smart Capture:** a switch for offering the drawer, and a six-item production checklist (clinical validation, security, privacy, legal, claims and coding policy, real receiving system) that must be fully ticked before an export can go to a real interface engine.
- **Who:** Pathologists (review, approve, send); administrators and laboratory directors (settings).
- **Admin Guide:** Configuration, System, Smart Capture; Permissions (four capabilities). **User Guide:** Billing review, Smart Capture drawer. Full description and acceptance criteria: `docs/product/SMART_CAPTURE.md`.
- **Training:** open a case's Billing panel, open Smart Capture, accept two lines and reject one, tick the confirmation as a pathologist, approve, read the payload preview, export, then change the case and see the review go stale.
- **Marketing / RFP:** "Suggested charges are always reviewed by a person: every line is accepted or rejected, a pathologist confirms, nothing is sent without that confirmation, and the audit trail records the rule version behind each suggestion. Clearly labelled as a prototype until validated."
- **Standards:** HIPAA (audit without patient data), CAP and ISO 15189 (reviewed, traceable decisions). The prototype is not compliance-reviewed and says so on screen.
- **Status:** Built (Demo). The rule set is a stand-in; claims and legal review and the receiving system are on the institution.

## Batch 612 (part C): Report font sizes in points

- **Configuration → System → Document Style:** font sizes are now in **points**, the size that prints (a 10 prints at 10 pt, as in Word), with the printed size shown under the box. The smallest size that prints is 8 pt. The built-in defaults are body 10, header 11 bold and footer 10 pt. A style saved before this change is marked as saved in pixels and prints exactly as it did until the administrator presses **Convert to points**, which lists each size and what it becomes; the numbers stay the same and now mean points, so the text prints larger.
- **Template Assembly → Style:** the same size box and **Convert to points** for one template. New templates start in points. The label size in the field inspector is also points.
- **Report preview:** for a template in points the preview is drawn at the paper's real width and side margins, with text at its printed size, so a 10 pt line wraps on screen where it wraps on paper. The preview does not show top and bottom margins or page breaks.
- **Who:** Administrators (lab styles need the Approved Fonts and Document Style permission); template authors (their own template).
- **Admin Guide:** Configuration, System, Document Style; Template Assembly, Style panel. **User Guide:** none (what a pathologist sees is the printed report).
- **Training:** open Document Style, read "Prints at" under the size, press Convert to points, read the list, confirm, and print a report to see the larger text; do the same for one template.
- **Marketing / RFP:** "Report type sizes are set in points, the unit printers and word processors use, and the screen preview shows the size that will print."
- **Standards:** none directly (legibility of printed reports). The conversion is written to the audit log.
- **Status:** Live in the front end and in the report PDF function (redeploy `functions/`). Fonts print as Helvetica, Times or Courier whatever the family chosen (Calibri, Verdana and Georgia are not embedded).

## Batch 612 (part B): Workstation registry and scope reference

- **Configuration → System → Workstations:** register a named computer (for example "Grossing Station A") at a facility, with room, discipline, functional area, point of care and optional report and label printers. A token is shown once when registered or rotated; only a hash is kept. Rotate (the old token works 24 more hours), revoke (with a reason; final), "Use this computer", and a Simulated token test. Last seen and the audit log show activity.
- **Print routing:** the workstation field in a routing rule suggests the registered workstations, and a computer bound to one uses it automatically.
- **Configuration → System → Scope reference:** for each setting area, whether it is enterprise-wide, per performing-lab facility, enterprise with a facility override, or in tiers.
- **Who:** `config:workstations:manage` and `config:workstation-tokens:manage` (Administrators). Everything is audited.
- **Not yet:** the real agent token check is the backend team's work (`docs/architecture/WORKSTATION_REGISTRY.md`); the browser check is labelled Simulated. Scope reference lists only confirmed areas.

## Batch 612 (part A): Interface Dictionary (Message Mapper) and Vendor fields

- **What changed:** Configuration → System → Interface Dictionary (ForMedrixAI support only; hidden from hospital roles). A vendor profile says where a vendor's own fields sit in its HL7 v2 (including Z-segments), JSON or FHIR messages, and which extension field (`ext.name`) each becomes on the case, with a name shown on the case, a type, a conversion (trim, case, HL7 date to ISO), a code translation, a default and a required flag. A profile goes Draft → Tested (paste a sample message; counts only are kept) → Live; a bad publish is rolled back to the version before (kept as a new version). A mapping onto the case's own structure (patient, order, specimen, diagnosis, report, signature, billing) is refused as it is typed, with the reason; the same screen lists what mapping handles and what needs a code release. On a case, the sidebar shows a read-only **Vendor fields** panel when a vendor sent extra fields, with the vendor and profile version, tagged for redaction, and Simulated in the demo.
- **Admin Guide:** none for hospital administrators (the screen is not visible to them). Internal support guide: Interface Dictionary. **User Guide:** Case sidebar, Vendor fields (read-only).
- **Training (ForMedrixAI):** create a profile for ORU^R01, map `ZAB-2` to `ext.lotNumber`, try `patient.mrn` and read the refusal, paste the sample, publish, apply the sample to a case, open the case and find Vendor fields, publish a second version, roll back.
- **Marketing / RFP:** "Vendor-specific fields (Z-segments, extra JSON/FHIR elements) are onboarded by configuration, tested and versioned with rollback, and can never overwrite the clinical record."
- **Standards:** HIPAA (audit without message content), ISO 15189 (controlled change with test before release), 21 CFR Part 11 and EU Annex 11 (change control on interfaces).
- **Status:** Built (Demo). Nothing is received from a vendor in the demo; sample messages are pasted in. The interface engine applying published profiles to live messages is server work (`docs/architecture/INTERFACE_DICTIONARY_API.md`). Wording in French, German, Dutch and Korean needs native-speaker review.

## Batch 613 follow-up — who receives a scheduled report

When you schedule a saved case-search report, PathScribe checks each recipient. If someone cannot see every case in the report, you are asked, right there, whether to **narrow** the report to what they may see (the default) or **skip** them. PathScribe never decides this for you. After each run the schedule shows how many recipients received the full report, a narrowed one, or none. Status: Built (Demo): runs are simulated until the API server runs them.

## Batch 614 (part C): Hotkey and voice clashes

- Seven Intraop commands (start new entry, touch prep performed or skipped, frozen section cut, squash prep, cytology fluid, gross only) now belong to the Intraop category, so they no longer compete with navigation keys on other screens.
- 52 clashes remain, all settled by the rule that the screen you are on wins. A locked list now makes any new clash fail the build. A short list of choices for you is in HOTKEY_DECISIONS.md, and every command phrase awaiting native-speaker review is in PHRASE_REVIEW_LIST.md.

## Batch 614 (part B): Code Systems setting now applies everywhere

- Switching a code system off in Configuration → System → Code Systems now takes effect on case search, the specimen edit window and the order message, as well as the Add Code window. A screen with a system off shows a short note saying so. A code already on a case in a system that is now off is marked "outside policy" rather than removed.
- The cytology-histology correlation printout no longer shows the patient MRN, matching the download. The on-screen table still shows it.

## Batch 616 (part B): more of the browser's services can talk to the server

- With a server address configured, the audit log, access checks, staff, roles, facilities, screening-registry settings, access requests, session time-out and the lab dictionaries (departments, locations, container types, ink and cassette colours, physicians, revision reasons) now have server versions. Without one, the demo behaves as before.
- With a server, the browser asks the server for each access decision and treats any failure to answer as a refusal. Nothing is granted because the server could not be reached.
- A request to see a patient's other cases is granted, denied or revoked by the person signed in; the browser no longer sends who is doing it.
- Biometric signing: the screens and the sign-in flow now go through one biometric flow (see Batch 616 part F), so a server deployment uses the server version.

## Batch 617 (part S): the roles list names the newer actions

- Configuration > Staff > Role Dictionary now lists 16 more actions in one group, Related Cases, Case Access, Search Reports & Follow-up: attach related cases, print a patient summary, request, approve, deny or revoke access to a patient's other cases, save, export or schedule a case search report, mark follow-up expected, record, reopen or email about a follow-up, search codes for a flagged finding, and enrol or turn off biometric sign-in.
- Admin Guide: new built-in roles start with the grants in docs/product/ACTIONS_COVERAGE.md; a grant records whether the role may use the action, the capability decides access.
- Training and marketing: none of the 16 is a voice command; they are clicks on their own screens.

## Batch 618 (part C): case material saves through the server
- When the app is connected to a PathScribe server, adding, changing or deleting a decant is saved by one server call that returns the whole updated material tree and the billing lines it affected; without a server (the demonstration) it works as before. A stale version, a refused delete and a tree error each roll the change back on screen.
- Admin Guide: nothing to configure; the server must honour `CASE_MATERIAL_API.md`.
- Training and marketing: no change for people using the Material tab.

## Batch 618 (part B): the partial nephrectomy drawing shows only the anatomy the specimen holds
- On the Anatomical map for Kidney Resection, a partial nephrectomy now always draws the perinephric fat and draws Gerota's fascia only when the extent answer is "Beyond Gerota's fascia", and the adrenal gland only when it is "Ipsilateral adrenal gland, by direct (contiguous) spread" (both pT4). The renal vein, vena cava and ureter rules from Batch 466c are unchanged. A radical nephrectomy is unchanged.
- Admin Guide: nothing to configure; the rule is built in.
- Training and marketing: the drawing no longer suggests the specimen contains an adrenal gland or Gerota's fascia that was not sampled (CAP, RCPath, RCPA, ICCR practice).
- Developers: the size guard (`styleRules/fileSize.guard.test.ts`, PS-497) fails if a source file over 1,000 lines grows, or a new one crosses 1,000; large files are split when a story touches them.

## Batch 618 (part A): a second facility for the technical component (PS-336)
- Accession screen: for a consultation or outside material, an optional "Technical component performed by" list names the lab that did the processing, cutting and staining when this lab only reads the case. It lists performing labs only. An ordinary case shows no extra field. The Case team window keeps the same list for later changes, and each change is written to the audit log (facility ids only).
- Billing: the technical charge is released at grossing as before and goes to the technical lab; the professional (-26) line is held to final sign-out and goes to the reporting lab. A case with no second lab, or the same lab twice, is unchanged.
- Report: once the case is signed out, a line under the case header reads "Technical component performed at: name, address". The lab's director and CLIA number are never printed on it. Drafts do not show it.
- Admin Guide: nothing to configure; the lab must be an active facility with the performing lab role.
- Training and marketing: split-billing consultations are recorded once, at accessioning, and the report and the claims name the right lab.
- Developers: `order.technicalComponentFacilityId` (set at accessioning); `resolveChargeFacilities.ts`; charge payload fields `performingFacilityId` and `technicalComponentFacility` (the DFT message is unchanged); renderer field `technicalBranding` (`functions/main.py`).

## Batch 619 (part S): delivery schedules, set for the enterprise and overridden by performing facility (PS-800)
- Configuration > System > Delivery Schedules sets when each feed goes out: report delivery, billing, results, admissions (ADT), accession, LIS sync, and each registry on its own. A feed can send immediately, only during set hours, in a batch (daily, weekly or monthly, with a cutoff time), hold until final sign-out, or (registries) send a set time after sign-out. Choose a facility to see which feeds follow the enterprise and which have their own schedule; "Follow the enterprise" removes an override. A "Try a schedule" panel shows whether something would go out at a given time.
- Registries: default is a short review hold (4 hours) matching the QA and amendment window; an optional reporting deadline in days from sign-out lets the queue flag cases close to it; an amendment re-queues by default.
- Admin Guide: needs the capability "Manage delivery schedules" (Admin and Lab Director). Registry destinations, required fields and transport stay in each registry's own settings.
- Training and marketing: PathScribe decides when; the interface engine decides how a message is sent.

## Batch 619 (part B): billing release rules, set for the enterprise and overridden by performing facility (PS-800)
- Configuration > System > Billing Release sets when a generated charge is released from the Outbound Queue to billing. A charge is still generated at its milestone (the Billing Type Trigger setting: technical at grossing, professional -26 and Global at final sign-out); the rules decide when it then goes. Per billing type (TC, -26, Global) and optionally per case type, ordering site, primary pathologist and amended or original report: release at once, a set number of minutes after the milestone (a review hold), in a daily or weekly batch, or only when a person releases it. The defaults are the previous behaviour: nothing held. Choose a facility to give it rules of its own; without any it follows the enterprise. A "Try a charge" panel shows what the rules would do.
- Safety: a charge with an unmapped CPT code or a missing technical-component facility is parked for review when the rule says so; the delta charge of an amended report always goes to review; when a case is amended or retracted, its charges that have not gone are cancelled (retracted, with the reason) and the ones already sent are corrected through the existing credit flow. A person can release a held charge at once from the Outbound Queue; it is recorded by user id and audited.
- Admin Guide: needs the capability "Manage billing release rules" (Admin and Lab Director). Releasing a held charge from the queue uses the queue's own release permission.
- Training and marketing: the performing laboratory controls when its billing codes and charges are released; PathScribe decides when, the billing interface decides how.

## Batch 619 (part Q): the Outbound Queue, one place for everything PathScribe sends (PS-800)
- Home > Quality & Compliance > Outbound Queue lists every outbound message: results, admissions (ADT), accession, LIS sync, billing charges, report delivery, cytology results, referrals, molecular orders and registry submissions. Filter by feed, state, facility or accession number; sort by state, reporting deadline, scheduled time or attempts; tiles count each state, overdue and due-soon deadlines, and billing items waiting for review.
- Actions on the selected messages: Hold (pick a reason; a note is optional), Release, Retry. A message a registry rejected shows only the registry's error codes and a correction due date: fix the data, then Retry and say why it was fixed (resubmit), or Mark not reportable with a reason. For billing: Retract a queued charge (the case was amended or retracted) and Release now ahead of the schedule.
- A held message is not sent from anywhere, including Audit Log > Interfaces > Outbound. An amended report that is re-queued appears as a new item marked as amending the earlier one.
- Admin Guide: capabilities "Open Outbound Queue", "Hold outbound messages", "Release held outbound messages", "Mark rejected messages not reportable", "Retract queued charges", "Release charges ahead of schedule" (Admin); retry uses "Resend interface messages". Every action is audited without patient text; release-now records the user id.
- Training and marketing: one queue for results, billing and registry reporting; deadlines flagged before they are missed; PathScribe decides what and when, the interface engine decides how.
- Standards: supports the timely, auditable reporting expected for cancer registries (CAP, state and national registries) and HIPAA audit controls.

