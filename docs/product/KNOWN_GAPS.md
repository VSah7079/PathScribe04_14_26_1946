# Known gaps and release scope (PS-338)

A running list of what will and will not be in the first release, kept honest. Status words: **Live**, **Partial**, **Planned**, **Not in release**. Started Oct 16, 2026 (Batch 593) from the open follow-ups recorded in the batch changelog (`src/i18n/README.md`) and Jira. **Update this file in every batch that closes or opens a gap.** Items marked "Pete" need a decision.

## Waiting on a decision

| Item | Status | Needs |
|---|---|---|
| Billing unit: cores or specimen (PS-322) | Not started | A billing-expert decision (Pete) |
| Login bug | On hold | Pete's go-ahead |
| "Jurisdiction" search entry promised a SNOMED CT / ICD setting | Resolved in part (Batch 595) | It now opens Code Systems; the SNOMED CT release choice is still Planned (terminology server) |
| `organMapConfigChanged` event | Open | Decision (Pete) |
| Adding a country beyond the 13 | Planned | Priority (Pete) |
| Case and specimen comments on the printed report or as HL7 NTE (Batch 652, re-checked) | Product decision, not built | Re-verified in Batch 652: nothing prints or sends them. Not added, because what a comment may say on a clinical report (which comments, whose, which section, internal versus external) is a clinical choice. Pete: decide; the audit entry is the only record today (see the row under Documentation audit) |
| User Guide coverage (Batch 657) | Partial | Framework and first pages are in. Not yet written: pages for each workstation and sub-screen, billing, the Orchestration pool screens, Cytology and Molecular detail. Screenshots are placeholders (`docs/user-guide/MISSING_CAPTURES.md`), every page is Draft until clinically reviewed, and the guide is English only |
| Codes window dropped real suggestions (Batch 656) | Fixed in Batch 656 | Verification now looks the code up by itself as well as by wording; a note shows how many were left out. Confirm on a real UMLS key (`HFHS26-1004-LU`). The AI call still takes several seconds |
| Decision list items 6, 9, 13, 16, 19, 23 and critical-finding confidence (Batch 655) | Fixed in Batch 655 | See `GAP_REGISTER.md`. Server parts (terminal cookie exchange, encrypted dictionary word) are Planned |
| Printing during the release hold (Batch 652) | Fixed in Batch 654 (decision: keep warn as the default) | The site setting Release Hold Print Policy (System > Release Buffer) chooses allow, warn and confirm (default), supervisor override (`print:release-hold:override`, with a reason) or block. It applies on both print paths (the report view and the Orchestration preview). It replaces the old on/off switch (on reads as warn, off as allow). It is one organisation-wide setting, not yet per facility; second-person credential approval for the supervisor override needs the server |
| Partial multi-recipient delegation (Batch 652) | Partial | If one of several recipients is refused (for example a colleague changed role meanwhile) the others are delegated and the dialog closes without naming the refused person. Pete: show a result list, or accept |
| Peer group for My Contribution (Batch 652) | Built (Demo), choice made here | Same role and a shared facility, at least 3 peers. Pete: confirm the definition and the minimum of 3. The API server should supply the averages |
| Other fixed link lists (Batch 652) | Open | The Search page Resources window, the top-bar clinical links and the Audit Log Resources window use fixed links, not the admin External Resources entries, so the https-only rule does not reach them |

## Documentation and consistency audit (Batch 652)

Fixed in Batch 652 (documents and labels, no feature built): stale READMEs; the hub-token conflict (cookie only); the Superadmin statement; demonstration-code label on confirmed findings; unverified-placeholder badge on retention figures; overclaims about Zebra / EPL / DPL, AI Matched Cases, EMR launch, alert tokens, HPV duplicate check, Spain. Every audited gap and its status: `GAP_REGISTER.md`.

| Item | Status | Needs |
|---|---|---|
| Real SNOMED CT / ICD-O-3 codes on confirmed findings | Planned | Licence (`terminologyLicence`); until then the tooltip says "demonstration code". No demonstration SNOMED lookup exists; the ICD-O-3 sample was not bound because a severity does not identify a morphology. Pete: agree |
| Spain DNI / NIE control-letter check | Planned | The repo has the pattern and the mod-23 rule but not the letter table (`SPAIN_RESEARCH.md`); Pete to source it, then add a `mrn_dni_nie` row in `checkDigits.ts` |
| Seeded retention figures flagged unverified (CAP / CAP-ACP wet tissue, RCPA, Korea MSA) | Open | A records or compliance lead confirms each and publishes a cited version |
| Live-update hub still sends the SSO token as `access_token` in the demonstration build | Planned | Cookie-only when the API server session exists (`LIVE_UPDATES_SIGNALR.md` section 4). OR-terminal device-token transport also undecided (Pete) |
| "AI Matched Cases" name and "AI Match Score" label | Decision | Pete: rename to "Similar cases (demonstration)" until a model-backed search exists (six locales) |
| Alert link token unsigned; alert SMS / e-mail / EHR sends are stubs | Planned | Server-issued tokens; SMS gateway, mail relay, EHR endpoint |
| Inbound HPV duplicate record is in memory only | Planned | Server stores the composite key |
| Zebra Browser Print; EPL / DPL sending; EMR launch (SMART on FHIR) | Planned | Vendor SDK / EHR partner |
| Admin Guide translations of the retention-placeholder paragraph | Open | Translation pass and native-speaker review |
| Triage release gate runs in the browser (now `services/grossing/triageReleaseGate.ts`) | Planned | The API server repeats the rule on release |
| Carried intraoperative findings (`Case.intraoperativeFindings`) have no screen or report line yet | Open | Pete: where should they show (report page panel, printed report as a labelled "Intraoperative" block)? Server version of the carry |
| Frozen reconciliation shows only with "Require Review Screen at Sign-Out" on; with it off, nothing is shown or recorded | Decision | Pete: record the comparison silently when the screen is off? |
| Assignment Timeout: Gross Complete routes at once; the timeout only sweeps cases still unassigned and unpooled. Interim browser timer in the Worklist | Decision | Pete: should Gross Complete wait the timeout for an LIS assignment? Replace the timer with a scheduled server function (CLAUDE.md rule 11) |
| Lockbox link needs the pending order; the Accession screen has no receipt-number box. Placeholder receipts link only after "link placeholder" | Open | Pete: add a receipt scan/number box to Accession? |

## AI correctness fixes (Batch 651)

Fixed and removed from earlier lists: AI code confidence saved on 0 to 100 while the type said 0 to 1 (now 0 to 100 everywhere, the display no longer multiplies by 100); the stored model was the literal text "AI coding assistant" (now the real provider and model id); the 30% minimum and the listed-options rule were prompt-only for live cases (now enforced in code, shared with the historical extraction); the rule-based mismatch fallback (50) never showed (now shown, rule-based, low risk); the mismatch instruction version was only on the suggestion (now on the QA record and audit event); OPCS-4 lookup always returned nothing (now reads the labelled demonstration list); narrative sections carried no confidence or quote (now one extra AI call gives both, quote checked).

| Item | Status | Needs |
|---|---|---|
| OPCS-4 real reference data | Planned | NHS TRUD licence and the server feed; today a five-code demonstration list, shown Simulated and not applicable to a case |
| Save Draft background template re-check (Stage 2, Orchestration) | Planned | Decision (Pete): build it on `evaluateSynopticAssignment` and the existing Protocol Change badge, or leave Gross Complete as the only trigger. Types and comments were corrected; `pendingProtocolChanges` is written only by the Assist-mode LIS poll |
| Narrative confidence and quote: one extra AI call per section | Partial | Pete: accept the extra cost, or fold it into the streamed reply (harder with streaming). The call is not yet written to the AI audit log separately; no per-section "Regenerate" cost warning |
| A vendor confidence of exactly 1 is read as 100% | Partial | Nothing unless a vendor really answers on a 0 to 100 scale with 1% |
| Saved case coding from before Batch 651 | Partial | Stored model text may still read "AI coding assistant"; confidences were already saved on 0 to 100 |
| Translations of the 4 new messages | Built, needs review | Native-speaker review (`docs/quality/TRANSLATION_REVIEW.md`) |

## Audit trail (Batch 651)

Fixed in Batch 651 and not listed as gaps any more: pool claim, pass and the 30-second claim hold, delegations, case team changes, case and specimen comments, personal dictionary words, screen-language changes and the Quality and Compliance deficiency actions (raise, escalate, contain, verify) now write to the audit log (`src/services/auditlog/README.md`).

| Item | Status | Needs |
|---|---|---|
| General clinical audit log not tamper-evident | Planned | Append-only by interface only (the app never edits or deletes an entry); the demo store is the browser's. Server-side tamper-evidence (hash chain or write-once storage, no administrator edit) comes with the API server |
| Case and specimen comments never print and never go to the LIS | Built as designed, but not documented before | Checked Oct 22, 2026: neither the report renderer, the print paths nor the ORU payload read `order.caseComments` or a specimen's `comments`; `syncStatus` stays `pending` and nothing consumes it. Pete: decide whether any comment should appear on the printed report or travel as HL7 NTE (and whether the "origin badge shows sync state" wording should change) |
| Accessioning-time comments are not audited on their own | Partial | They are held on the accession form and saved with the new case; the case creation is the record. Pete: audit them as "Case comment added" at creation? |
| 30-second claim hold lapsing on its own | Partial | "Pool claim hold released" is written when the window closes without a decision; a hold that simply times out with no window open has no clock to write it (API server) |
| Personal dictionary word is not in the audit entry | Decision | Only its length is recorded (a personal word can be a surname). The facility dictionary still records the word. Pete: keep, or record the word |
| Quality deficiency screen shows "done" when the store fails the change | Partial | `qaDeficiencyActions.ts` returns success without looking at the store result; the audit skips a failed change, but the person is not told |

## Voice engine (Batch 650a)

Fixed in Batch 650a and removed from earlier lists: the Report Draft spoken phrases never registered (a method the registry lacked); Enter Gross / Enter Micro / Enter Diagnosis sent events nothing heard; AI-refined dictation could be inserted twice in a report section; correction learning ran only in Internal Notes; "confirm by repeating the phrase" was declared but not wired; station eligibility applied to the keyboard only; spoken commands were not audited.

| Item | Status | Needs |
|---|---|---|
| Say-it-twice command list | Partial | Pete: the six commands on it (Delete Row, Delete Message, Delete All Selected, Recall Report, Release Case From Hold, Release Autopsy Body). Delete Row is on the list but the Worklist has no Delete Row (see the table below), so it protects nothing today |
| Enter Addendum, Insert Macro, Next / Previous Field by voice | Open | Voice handlers (listed above as voice-engine) |
| Enter Gross / Enter Diagnosis on the synoptic layout | Not in release | That layout has no free-text gross or diagnosis box; they work on the Report Draft only (Enter Micro works on both) |
| Mic button with a field in focus on Intraop / Verbal Report | Open | Those screens still wait for a dictation state nothing produces; they were not changed |
| Audit of spoken commands | Partial | Written from the browser; with the API server the server should write it. A Mohs stage answer by voice is not audited |
| Report Draft phrases in fr, de, nl, ko, es | Built, needs review | Native-speaker review (`PHRASE_REVIEW_LIST.md`) |
| Real-microphone test | Not done | Everything is tested with simulated speech |

## Voice and keyboard commands with no screen handler (Batch 650)

Registered in the action registry (so Configuration > Actions lists them and the system recognises the phrase or key) but no screen answers them. `src/services/actionRegistry/unwiredActions.ts` holds the same list with the same reasons, and `actionListeners.guard.test.ts` fails when a command is registered with neither a listener nor an entry there, and when a listed command has since been wired.

**Fixed in Batch 650 (removed from this list):** Sign Out Case (`SIGN_OUT`), Sign Out and Next (`SIGNOUT_NEXT`, Assist cases only), Finalise (`OPEN_PRE_FINALISE`), Cancel Finalise (`FINALISE_CANCEL`), Add Amendment (`ADD_AMENDMENT`), Open and Close History, Go to Codes and Add Code, Accept Pool Case and Pass Pool Case (the claim window now receives them over the Worklist), Filter Pool Cases, Filter Awaiting Countersign, Execute Search, Clear Search, and the eight Contribution `TAT_SHOW_*` tiles. The Enter Gross / Micro / Diagnosis dictation commands were wired by the voice engine batch (650a) at the same time.

**Decisions for Pete:** (1) *Sign Out and Next in Orchestration cases:* there is no such button (Orchestration has Sign Out Case only; Finalise & Next is Assist only), so the command does nothing there. Should Orchestration get a "Sign Out and Next" that opens the sign-out window and moves to the next case on release? (2) *Accept from a selected Worklist row:* Accept and Pass act only while the pool claim window is open; with it closed, nothing is accepted, because Accept assigns the case and the window is where the claim hold is taken. Should "accept case" on a highlighted pool row open that window (one step) or stay as it is? (3) *Registry entries for features that do not exist* (Worklist Select Row, Select All, Deselect All, Delete Row, My Cases filter): remove them from the registry, or build the features? They are the voice engine's to remove, with your word. (4) Open Routing Rules, Test Routing Rule, Open Participation Types and Focus Case Search need the navigation owner's route and `screen:configuration:open` check.

**Decided by Pete (Oct 23, 2026, Batch 663):** (1) *Sign Out and Next in Orchestration:* wanted, as one flow: run the sign-out checks (required fields, mandatory diagnosis lines, grossing complete), apply the signature, set Finalized, send results out, show a short success message, then open the next case in the person's queue. Not built yet: it changes the signing flow (`useSignOutWorkflow.ts`) and needs its own batch. (2) *Add Collaborator [name]* (an in-lab consultation request): wanted; not built. (3) *Clinical review of the guide screenshots:* a meeting for Pete to schedule with lab leadership (synthetic data only, coding shown correctly, specimen hierarchy, critical values clear).

**Fixed in Batch 664 (removed from this list):** Edit Field (Report Draft sections by name; Alt+E alone uses the section being worked on), Cancel (ends dictation, removes this session's dictated text after a second Cancel, drops a pending say-twice command), Sign Out and Next for Orchestration (button and voice), Add Collaborator [name], and the `templatePublishingRules` role-name check. **User Guide gaps after Batch 666:** every screen has an article, but all are Draft (no clinical review), screenshots are placeholders until captured (`docs/user-guide/MISSING_CAPTURES.md`), the Report screen's Billing review and Markers panels have no article, the guide is English only, and 126 screen oddities found while writing await Pete's rulings (`docs/user-guide/FINDINGS_666_*.md`). The Administrator Guide translations and review workbooks await native reviewers (Korean first).

**Fixed in Batch 665 (removed from this list):** Assist "Finalise & Next" now opens the next case; Sign Out and Next moves on after a parked fixative/stain/date/inking/peer-review check; Add Collaborator sends the collaborator a message; Edit Field reaches synoptic panel questions (focus only). **Still open:** (a) synoptic answers are not dictation targets, so Edit Field does not start dictation there; (b) *My Cases (Pete, Oct 23):* the phrase is off Clear Filter; a personal-queue filter built from separate scope (mine/all) and status (active/completed/all) filters is a design item, not built.

**Fixed in Batch 663 (removed from this list):** Add Addendum, Skip Field (moves to the next required field), Maximise (collapses the specimen sidebar), Minimise (restores it), Preview Report (shows the Report tab), Internal Note (opens the notes drawer). Select Row, Select All, Deselect All and Delete Row switched off.

| Command (id) | Key | Why nothing happens | Kind |
|---|---|---|---|
| Enter Addendum (`ENTER_ADDENDUM`) | Alt+Shift+D | Dictation target (VoiceProvider / dictation services, Batch 650a). | voice-engine |
| Insert Macro (`INSERT_MACRO`) | Alt+Shift+I | Text-editor macro insertion; belongs with the editor commands the voice engine owns (Batch 650a). | voice-engine |
| Next Field (`NEXT_FIELD`) | Tab | Tab moves focus natively; the spoken form is a key-routing question for the voice engine (Batch 650a). | voice-engine |
| Previous Field (`PREVIOUS_FIELD`) | Shift+Tab | Shift+Tab moves focus natively; the spoken form is a key-routing question for the voice engine (Batch 650a). | voice-engine |
| Confirm Finalise (`FINALISE_CONFIRM`) | Ctrl+Alt+Shift+C | The Finalise window signs with the signer's own typed credentials (signature check); a spoken or single-key confirm would sign without them. | credentials |
| Load Saved Search (`SEARCH_LOAD_SAVED`) | Alt+L | The visible control is a saved-search picker; the command cannot say which saved search. | needs-choice |
| Select Row (`TABLE_SELECT`) | Alt+Space | Switched off in Batch 663 (Pete): the Worklist has no multi-row selection. Back only with a built batch action (Batch Assign, Batch Print Cassette Labels) and its safeguards. | no-feature |
| Select All (`TABLE_SELECT_ALL`) | Alt+Shift+A | Switched off in Batch 663 (Pete): no multi-row selection or bulk action; see Select Row. | no-feature |
| Deselect All (`TABLE_DESELECT_ALL`) | Alt+Shift+D | Switched off in Batch 663 (Pete): no multi-row selection or bulk action; see Select Row. | no-feature |
| Delete Row (`TABLE_DELETE`) | Alt+D | Switched off in Batch 663 (Pete): a case is never deleted from the worklist. Stays off unless it becomes a soft-delete or cancel workflow with permission checks. | no-feature |
| Dispatch Now (`DISPATCH_NOW`) | Alt+D | Sending a held outbound message needs a message picked; the controls are per row in the dispatch trail. | needs-choice |
| Retry Dispatch (`RETRY_DISPATCH`) | Alt+R | Retrying needs a failed message picked; the controls are per row in the dispatch trail. | needs-choice |
| Open Routing Rules (`OPEN_ROUTING_RULES`) | Alt+R | Opens Configuration at Routing Rules: needs the screen:configuration:open check and the section route, with the navigation owner. | needs-navigation |
| Test Routing Rule (`TEST_ROUTING`) | Alt+Shift+T | Runs the routing-rule test inside Configuration; needs the section open first. | needs-navigation |
| Open Participation Types (`OPEN_PARTICIPATION_TYPES`) | Alt+Shift+W | Opens Configuration at Participation Types: needs the screen:configuration:open check and the section route. | needs-navigation |
| Focus Case Search (`FOCUS_CASE_SEARCH`) | Alt+Shift+B | Focuses the case search box in the header; the box is in CaseSearchBar.tsx (scanner-aware) and needs a focus handle from AppShell. | needs-navigation |

## Safety and access fixes (Batch 649)

Fixed in Batch 649: PHI redaction missed `diagnosis`, `finding` and `case` values; the barcode listener accepted script-made keystrokes; Sign Out Case skipped five review checks Finalize ran; version and signature could be saved for a case whose status never moved; countersign errors were swallowed; signatures were not linked to a version; a refused amendment release was treated as released; an addendum from the amendment window was never sent; Assist revisions went to the LIS before their release; the registry was sent at signature, not at release; 17 actions had no capability; `admin-override` could sign any case.

| Item | Status | Notes |
|---|---|---|
| Role-name checks | Fixed in Batch 664 | `templatePublishingRules` now decides by `config:protocol:draft` / `approve` / `publish` only (macro access and billing were fixed in Batch 663). The billing API still carries an unused `actorRole` parameter, to drop at the API cutover. |
| Most permission checks pass only the case id | Fixed in Batch 653 | The authorization service now looks up the case's ordering facility (`Case.order.facilityId`) when a check names a case and no facility, so a facility-limited person is judged against the case's own facility. A case that cannot be found, or a failed lookup, still refuses. See `caseFacility.test.ts` |
| Corrections released before a later failure are not undone | Open until the server | Sign-out in one transaction is planned in the API server; versions are append-only, so a version already written stays |
| Residents and preliminary release | Decided (Pete, Oct 22, 2026) | Pathologist and Fellow only by default; a hospital's own roles do not get it by default; a lab can grant it in the Role Dictionary |
| Non-English text of the 59 new strings | Waiting for review | Machine translated (fr, de, nl, ko, es); `docs/quality/TRANSLATION_REVIEW.md` |
| Header comment of `EnhancementRequestModal.tsx` still says the button passes a pre-captured screenshot | Open (comment only) | The README is corrected; the code comment was left alone |

## ICD-11 transition (Batch 594)

| Item | Status | Notes |
|---|---|---|
| Code shape and per-jurisdiction policy (system, release, source, role, start date) | Built, not wired in | `src/services/coding/`; `docs/architecture/DIAGNOSIS_CODING.md` |
| Add Code window, sign-out and outbound messages use it | Planned | Touches shared types; wait for the India team's list of changed files |
| Config screen for the code systems of each jurisdiction | Built (Batch 595) | Configuration → System → Code Systems; saves the policy, nothing reads it yet |
| Terminology server, ICD-10 to ICD-11 maps, SNOMED CT and WHO licences | Planned | India team and legal; the ICD-11 AI suggestions need checking before a lab relies on them |

## Server side (India team)

| Item | Status | Notes |
|---|---|---|
| API server, SQL Server, audit logging | In progress (India team) | .NET 10 / C#; hosting not decided |
| HTTP services for the screens (PS-482 onward) | Planned | Built on the shared client `services/apiServer/apiHttpClient.ts` (Batch 592); waiting for India's list of services already converted |
| Server-side parts of exports, jobs, site agents, signed report versions | Partial | Browser side built; server planned (phase 2e) |
| Wall display Display Token check (401 on revoked, expired or unknown token; masked payloads) | Planned | Browser side Built (Demo) in Batch 603; server spec in `docs/architecture/DISPLAY_ACCESS_API.md` |
| Multi-factor authentication | Planned | With the OIDC / Entra sign-in work (`AUTHENTICATION_OIDC.md`) |
| Reference Server proposal | Reply sent by India | Pete to answer |
| Windows hang and India team answers | Open | Pete tracking |

## Not yet built or not yet verified

| Item | Status | Notes |
|---|---|---|
| Cytology-histology correlation print view still shows MRN | Open | Export is MRN-free (Batch 603); the printed report is a clinical document, Pete to decide |
| Terminology monitoring for SNOMED CT and ICD (nightly) | Planned | Shows "Coming Soon" on Governing Bodies |
| Vantage and Cerebro adapters | Planned | Deliberate stubs until vendor specifications arrive; vendor-neutral events in `docs/architecture/VENDOR_NEUTRAL_EVENTS.md` |
| Block deletion tiers 2 and 3 | Planned | Tier 1 is Live (Batch 588) |
| Real printer test with QZ Tray; QZ certificate "Test first" steps | Open | Batch 589 follow-up |
| Live error-monitoring project, BAA/DPA, source-map upload | Open | Batch 590; off until configured |
| Autopsy PAD release (PS-292) | Open | |
| Printing by role (PS-283) and PDF steps (PS-277, 283, 276) | Partial | Needs the `render_report` deployment |
| Deep-link step of sign-in (PS-60) | Open | Needs the demo password |
| Per-facility grant check in the Role Dictionary | Open | |
| Staff screen still stores role names (PS-262) | Known gap | |
| Known gap in PS-147 | Known gap | |

## Batch 609 (part A): Report PDF and images in reports, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Fetching a linked image from a hospital system that needs sign-in or blocks other sites (CORS) | Built (Demo) | The browser fetches the link; such a link prints the Image Unavailable page. With the API server the server fetches it, with the hospital system's credentials |
| Private-address (SSRF) blocking when fetching image links | Planned | Server side, with the API server (`BLOB_STORAGE_API.md` section 6) |
| Audited opening of linked images | Planned | With the API server, as for other links |
| Document Style size unit | Open | Sizes are px and print at 0.75 pt each (7 pt floor), so the 10 px default prints at 7.5 pt; confirm this is the intended unit |
| Calibri, Verdana, Georgia in print | Open | Print as Helvetica or Times; embedding those fonts needs their licences |
| Cytology report header and footer parts | Not applicable | The cytology report has no template to hold them; it uses the lab's page setup and Document Style |
| Images print as an appendix after the report's pages | Open | Placing an image inside a report section needs template support |
| Report renderer redeploy | Needs deploy | `functions/` (main.py, report_layout.py, cytology_report.py) must be redeployed before page setup and Document Style print |

## Batch 605: Simulated interface engine, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Inbound HL7 listener for ADT and events | Planned | Server side; the browser processors are Built (Demo) |
| Interface engine: sending site on inbound orders | Planned | `IncomingOrder.siteId` and site crosswalk are ready |
| Vendor HL7 field layout for block orders and the engraver endpoint | Planned | `IHL7VendorAdapter` |
| Billing engine; X12 837P, KVDT, SESAM-Vitale | Planned | Charges and the financial-class payload reach the simulated engine only |
| Registry wire formats; licensed ICD-O-3 / ICD-11 terminology proxy | Planned | Seeded sample list and manual ICD-O-3 entry in the meantime |
| Server jobs API, interface monitoring API, Firebase project, LIS write-back | Planned | Simulated stand-ins show in the app |

## Quality and accessibility

| Item | Status | Notes |
|---|---|---|
| Native-speaker review of French, German, Dutch, Korean | Open | Korean first; Batches 588 to 590 added a lot of new wording |
| Screen-reader testing (PS-687); axe checks and keyboard access (PS-491) | Partial | |
| Firefox support (PS-722) | Not verified | |
| Duplicate CSS (PS-294) | Done | Batches 436 and 517 |
| Dead CSS (PS-520) | Done (Batch 598) | No unreferenced classes; the 517 classes built from a name prefix or suffix were checked: every variant word (`--warning`, `--overdue`, ...) appears in the code that builds the name. Guard keeps the count at 0 |
| Actions list vs roles (Batches 599-602) | Partial | All 245 voice/hotkey commands are in the Role Dictionary with default grants (Pete to review). Hotkey clashes resolved in Batch 602 (screen in focus wins; Alt+J reaches always-on commands). Open: 98 Role Dictionary entries have no voice or hotkey (voice needs handlers); bench roles start with few navigation commands |
| Keyboard access (PS-491) | Source checks done (Batches 524, 566, 567, 570) | Screen-reader testing (PS-687) and browser axe runs remain |
| Large-component splits (PS-497) | Ongoing | |
| 47 `src/` folders without a README | Open | |
| Review tests PS-261, PS-273, PS-493 | Open | |
| Lint errors in `serverJobsContract.ts` (3) | Open | |

## Moving to GitHub (PS-468, end of October)

`api/`, `api.zip` and raw logo source art are left out of the first repository. Before cut-over: list which `public/` files the app really uses, apply all delta zips to one copy, run `npm run cleanup:deleted`, create the repository, connect it to the session, then set up CI (PS-471).

- Batch 614: Mac Option and AltGr hotkey matching is fixed in code and tested with simulated key events (physical-key fallback, AltGr read as Alt, no hotkeys while typing a character). It has not been tried on a Mac or an AltGr keyboard. The Alt+J routes are now in the Role Dictionary action reference and the Actions tab. fr/de/nl/ko voice phrases and prefix strings need native review.

- Batch 604: the Simulated mail outbox and the simulated critical-alert channels are stand-ins. Real delivery needs the API mail service (`/api/notifications/email`, `/api/notifications/template-events`), an SMS gateway, a secure e-mail relay and an EHR push endpoint. The support "Ticket closed" button is a stand-in for the ticketing system; support audit entries still record no origin IP or country (server only).

- Batch 606: the Simulated print log and the simulated routes (BarTender, Zebra Browser Print, Direct via Interface Engine, the PathScribe Agent with no program running, engraving, scan-event labels, report print to network and site-agent printers) are stand-ins. Real sending needs each vendor's service, the site agent program and the API server. EPL and DPL export carry positions, text and barcode type, but barcode command syntax differs by printer model, so it must be checked on the lab's own printer. A saved Label Designer layout for the requisition replaces the whole sticker sheet with one label. The simulated gross weight is random (5 to 85 g) and is flagged as simulated on the specimen. The technical-component block is sent in the surgical report request (`technicalBranding`) and the page size and margins as `pageSetup` in both report requests; since Batch 609 the renderer reads `pageSetup` (and the Document Style and header/footer parts) in both templates, since Batch 618 it also reads `technicalBranding` (name and address line on a signed-out report; director and CLIA are never drawn). Label Designer layouts apply per facility only where the label type allows an override; the active facility is not yet passed to the print paths, so they use the enterprise default.

- Batch 607: the ICD-10 to ICD-11 pairs are a small Simulated sample, not the WHO mapping tables (needs the WHO tables through the server). OPCS-4 search and applying codes need an NHS TRUD licence and a server feed; the five sample codes shown are for orientation only. The ICD-O-3 table is a common-terms subset (about 55 morphology codes), not the full licensed edition. The sign-out override records no typed reason (confirm or stop only). The policy is applied in the Add Code window, sign-out and the charge message; other outgoing messages (cancer registry export, HL7 report) do not yet carry per-system codes, so there is nothing to filter there. The case jurisdiction is the performing laboratory facility's, falling back to the laboratory setting.

## Batch 608: Cytology and screening, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Proficiency test provider exchange (real grades) | Planned | The panel builder and a Simulated graded result are Built (Demo); a real grade arrives through the interface engine |
| Prior cervical procedure from an ADT PR1 segment | Planned | Picker entry at accessioning is Built; the ADT processor does not parse PR1 yet |
| Country screening interval rules | Open | The interval table is editable; the starting values are examples, not a programme's published rules |
| Molecular QC runs carry organisation only for the seeded instruments | Open | Real runs need the instrument's site from the interface engine |
| Autopsy and cytology Return to Trainee: notification to the trainee | Open | The trainee sees the banner on opening the case; no e-mail is sent |
| Reviewer pool codes are free text | Open | A picker needs the rule pools to be a managed list |

## Batch 609 (part C): AI models, dictation languages, medical spell check

| Item | Status | Notes |
|---|---|---|
| Model settings (output length, confidence threshold) | Built (Demo) | Saved per organisation in the browser-side model service. Firestore model service and emulator-tested rules were dropped with Firebase; the SQL Server model API is the server's job. Only these two settings exist; others are refused until something reads them |
| Store licensing for models | Planned | Mock store; needs the real licence service |
| German, French, Dutch medical word lists | Built (starter) | About 190, 155 and 170 plain entries from `spellcheck-data/{de,fr,nl}/`. Needs native-speaker clinical review; no machine-translated terms. Extension from the national SNOMED CT editions needs the licences (PS-343) |
| Medical terms not in a starter list are still flagged | Open | Add through the facility dictionary meanwhile |
| Dictation refinement wording for French, German, Dutch, Korean | Built, needs review | Shown in Configuration, System, Voice for the reviewer. Machine-assisted |
| Translated voice commands | Partial | The English fuzzy-match switch only matters for actions that have translations (`voiceTriggersByLanguage`); translations (fr, de, nl, ko and, since Batch 627, es) still need native-speaker review |
| Bare "open" on the worklist swallowed longer commands (found Batch 627, fixed Batch 628, bug PS-829) | Fixed | "open messages", "open configuration", "open search" and their French, German, Dutch, Korean and Spanish equivalents now run the right command on the worklist; the best voice match wins, not the first. Not tried by voice on a real microphone |

## Batch 609 (part B): Templates, amendments and Upload Protocol, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Licensed CAP and RCPath protocol content (about 1,500 placeholder field labels) | Planned | Needs the CAP / RCPath licence; the library works with the placeholder labels meanwhile |
| Import of CAP eCC (SDC) XML and Excel protocol files | Planned | Both are checked for format and reported as Unverified; converting them to a protocol needs the bodies' sample files and field mapping. JSON files exported from PathScribe import as drafts today |
| Mismatch release setting is lab-wide | Open | One setting for the whole laboratory; per facility or specialty is not offered |
| Autopsy addenda | Built (Demo) | Checked with the report's diagnosis, same as surgical; the autopsy FAD-specific sections are not added to an addendum's text |
| Template audit entries live in the browser audit log | Built (Demo) | The SQL Server audit store (PS-468 follow-on) keeps them once the API server is in place |
| Autopsy turnaround: public holidays | Built (Demo) | Working-day targets (for example UK 14-21 working days) skip weekends only; a holiday calendar per jurisdiction would move the deadline later, never earlier |
| Autopsy dashboards: cause of death | Built (Demo) | Only Simulated cases carry a cause category; a live case holds it in the signed report text, so it shows as not recorded until the report stores it as data |
| Autopsy dashboards: data source | Built (Demo) | Figures come from the browser-side case service plus Simulated cases; the SQL Server reporting store comes with the API server |
| Tumor board criteria rules: matching | Built (Demo) | Diagnosis and biomarker criteria match the signed report text (case-insensitive); structured coded results (SNOMED, LOINC) match once the API server supplies them |
| AI discordance: data source | Built (Demo) | Figures come from the browser-side AI result store and Simulated results; the real AI vendor feed and SQL Server reporting store come with the API server |
| Delegation completion | Built (Demo) | Signing the case out completes the signed-in user's pending delegations on it; a consult answered without a sign-out (for example a verbal reply) is completed by the server workflow once it exists |

## Batch 610 (part B): Targets, client service levels and the jurisdiction overview

| Item | Status | Notes |
|---|---|---|
| Performance targets: where they are kept | Built (Demo) | Saved in the browser; the SQL Server store comes with the API server |
| Performance targets: per person or facility | Open | One set of targets for the whole laboratory; none per pathologist or per facility |
| Performance targets: dashboard coverage | Built (Demo) | The Productivity dashboard measures the monthly cases and RVU targets; the TAT and QC targets are kept for reports and are not charted there |
| Client service levels: where they are kept | Built (Demo) | Saved in the browser; the SQL Server store comes with the API server |
| Client service levels: clock | Built (Demo) | Hours run continuously from the received time (no business-hours calendar or client holidays), so a late case can be shown a little later than a contract that skips weekends would count |
| Client service levels: client matching | Built (Demo) | A case is matched to its client by the facility's assigning authority; a case from a facility with no authority is not measured |
| Jurisdiction overview | Built | Read-only by design; every setting is changed on its own screen |

### Batch 611 (part H): multi-factor sign-in (#157)

| Item | Status | Needs |
|---|---|---|
| Second factor for hospital staff | Built (Demo) | The identity provider must be set to require and report MFA (`amr` / `acr`); the API server must re-check the verified token and enforce the policy, session time and step-up on the server (`docs/architecture/MFA.md`) |
| Simulated authenticator for demo accounts | Built (Demo), Simulated | Demonstration only: the secret derives from a documented seed and is checked in the browser. A real password deployment needs a server-generated, server-held secret |
| Recovery codes and enrolment reset | Built (Demo) | Server-side storage of the hashes and the same-organisation reset check |
| Policy, enrolments and failed-code counts | Built (Demo) | Browser demo data (`ps_mfa_*`); the API server holds them in production |
| Native-speaker review of the new fr/de/nl/ko wording | Open | Pete |
| Worklist table keeps the one-letter sex in its narrow column (the word is the tooltip and accessible name; the card shows the word); gender identity (PRSB optional, needs consent) not built; HL7 PID-8 `A` for indeterminate is an assumption; NHS sex code mapping (1/2/9/X) is not yet used by any outbound NHS message | Open | UK work after Batch 662 |

### Batch 611 (part F): legacy file import and biometric prompt (#132, #166, #158)

- Legacy file import runs in the browser (up to 2,000 records, CSV or JSON) and creates draft cases marked Simulated bulk import. Server-side bulk import jobs, large files and OCR of scanned legacy reports need the interface engine.
- Biometric signing uses the device prompt with a challenge made in the browser, so no server verifies the signature or stores the public key. A server-issued challenge and verification (PS-345 API server) is what makes it a Part 11 / Annex 11 e-signature. Until then it is labelled Simulated on screen and in the audit log.



## User Guide label coverage (Batch 667)

The coverage check sees only labels shown through the translation function and 3 to 40 characters long. Hard-coded English text, long messages, icons without text and behaviour with no label are not checked. 117 labels are ignored with a reason. About 740 Configuration labels are not named in the Administrator Guide. Every article is Draft, unreviewed by a clinician, and 80 screenshots are missing. See `docs/user-guide/FINDINGS_667.md` for controls that do not work as they read.
