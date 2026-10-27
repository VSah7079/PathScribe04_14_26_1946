# Actions list coverage (Batches 599-601, 614, 617, 619, 637, 645)

Two lists describe what people can do, and they serve different jobs:

| List | File | Used for |
|---|---|---|
| Roles list | `src/constants/systemActions.ts` (`ACTION_GROUPS`) | The Role Dictionary: what a role can be granted. |
| Voice and shortcut list | `src/services/actionRegistry/mockActionRegistryService.ts` | The phrases and key combinations people use (Configuration → Actions). |

They are joined by `internalKey`. Real access control is a third thing: capabilities (`capabilityCatalog.ts`), checked in the services. A command only triggers something; a role's grant of it never widens what the person may do.

## Batch 650: listeners

Being in the registry is not the same as doing something. `src/services/actionRegistry/actionListeners.guard.test.ts` now fails when a registered command has no listener on a screen (a `onAction` or `addEventListener` for its id, in the screen or a file it imports) and is not in `unwiredActions.ts` with a reason; 29 are listed (also in `KNOWN_GAPS.md`). Wired in this batch: Sign Out Case, Sign Out and Next, Finalise, Cancel Finalise, Add Amendment, Open/Close History, Go to Codes, Add Code, Accept/Pass Pool Case, Filter Pool/Countersign, Execute/Clear Search, eight TAT tiles.

## Where things stand (Batch 614)

- **All 262 voice and shortcut commands are in the Role Dictionary** (260 active). Batch 600 added the 60 that change records; Batch 601 added the 89 that only open, filter, move, select or cancel; Batch 614 added the 16 text-editor commands. Batch 617 added 16 more (see below), so the roles list had 371 entries. Batch 619 added 6 (Outbound Queue) and Batch 637 added 8 and Batch 645 added 7 for Lockbox Drop-Off (below): **392 entries**.
- **All 262 have a hotkey and voice phrases in five languages** (English, French, German, Dutch, Korean; Spanish is added from `spanishVoiceTriggers.ts`). A test checks this.
- **82 Role Dictionary entries have no voice phrase or hotkey of their own, and every one is classified with a reason** (covered by another command, a screen you open, needs something picked, or a deliberate click; see below). None is left planned.
- **52 clashes remain** (27 hotkey, 25 voice) where a screen command shares a key or phrase with an always-on command. All are settled by the screen-wins rule and locked in a known list in the guard test, so a new one fails the build. Seven Intraop commands that were filed as Navigation moved to the Intraop category (Batch 614), which removed 15 key clashes. The few that need your decision are in HOTKEY_DECISIONS.md.
- `actionsCoverage.guard.test.ts` enforces all of this: a new voice command must have a roles-list entry, new permission-only entries and a hotkey or phrase shared by two commands that cannot be told apart fails the test, and every permission-only entry must be classified (the list can only shrink).

## Batch 637: the 8 actions that Batches 620 to 636 added

A sweep of Batches 620 to 636 found 8 things a person does that the roles list did not name. They are in a new group, **HPV Results, CSMS Eligibility, AI History Reading & Registry Files** (`F35`, `src/constants/resultRegistryActionGroup.ts`). None has a voice phrase or hotkey: each needs a case or result picked on screen first, or is a deliberate click, so each is classified in `permissionOnlyActions.ts`. No key or phrase was added, so there is no new clash.

| Role Dictionary id | Action | Kind | Capability | Default grant |
|---|---|---|---|---|
| `hpvResult.recordManual` | Record an hrHPV Result by Hand | needs a choice (result source) | `cytology:hpv-result:record-manual` | Pathologist, Lab Director |
| `hpvResult.approveManual`, `.rejectManual` | Approve or reject a manual entry that replaces an interface result | deliberate click | same | Pathologist, Lab Director |
| `csms.verifyEligibility` | Mark CSMS Eligibility Verified | deliberate click | `cytology:csms-eligibility:verify` | Pathologist, Lab Director |
| `csms.recordNotEligible` | Record Not Eligible for CSMS | needs a choice (reason) | same | Pathologist, Lab Director |
| `historyExtraction.run` | Run the AI Reading of a Historical Report | needs a choice (which report) | `ai:history-extraction:run` | Pathologist, Fellow, Resident |
| `historyExtraction.flag` | Flag an AI Reading as Wrong | needs a choice (which field) | `ai:history-extraction:flag` | Pathologist, Fellow, Resident |
| `registryBatch.makeFile` | Make a Registry Batch File | deliberate click | `registry:batch-file:generate` | Admin |

The grants follow the matching capabilities in `capabilitySeeds.ts`; a command grant never widens access. **Left out on purpose:** the Configuration screens added in these batches (US ePath, UK cancer registry, Registry Batch Files, Delivery Schedules, Billing Release, Code Systems, AI history extraction, Screening Strategy recall windows, Cytology Categories). They are reached through their `screen:<name>:open` capability and their `config:*:manage` capability, as in Batch 617. Also not actions: the workload reassignment (Batch 635) and the Australian/NZ recall routing (Batch 631), which happen automatically.

## Batch 601: the 89 open, filter, move, select and cancel commands

They are in six new Role Dictionary groups (Go To & Help, Worklist Views & Filters, Search & Messages Views, My Contribution Views, Report Screen Dialogs & Views, Cytology Screen Views), each keeping its key.

**Default grants.** Pathologist, Resident, Fellow, PA, Accessioner, Histotechnologist, Cytotechnologist and Molecular Technologist get all 89. Admin, Lab Director and QA Reviewer get the going-to and searching ones (Go To & Help; Search & Messages Views). Physician, Or Staff and the template roles get none. Superadmin has all. Existing sites receive them once, the same way as Batch 600.

## Batch 617: the 16 actions that Batches 613 to 616 added

A sweep of the screens built since Batch 614 found 16 things a person can do that the roles list did not name. They are in a new group, **Related Cases, Case Access, Search Reports & Follow-up**. None has a voice phrase or hotkey: each either needs something picked on screen first or changes records or access, so each is classified in `permissionOnlyActions.ts` (27 needs-choice and 20 risky now, with 24 covered and 25 screens: 96 distinct ids). No key or phrase was added, so there is no new clash and nothing for you to decide.

| Role Dictionary id | Action | Kind | Default grant |
|---|---|---|---|
| `related.attachCases` | Attach Related Cases at Sign-Out | needs a choice (which cases) | Pathologist, Fellow |
| `patientSummary.print` | Print Patient Summary | needs a choice (which cases) | Pathologist, Fellow, Resident |
| `caseAccess.request` | Request Access to a Patient's Other Cases | needs a choice (reason typed) | Pathologist, Fellow, Resident, PA |
| `caseAccess.approve`, `.deny`, `.revoke` | Approve, deny or revoke access | deliberate click | Pathologist, Admin |
| `searchReport.save`, `.schedule` | Save or schedule a case search report | needs a choice (name, recipients) | Pathologist, Admin, Lab Director, QA Reviewer |
| `searchReport.export` | Export Case Search Report | deliberate click | same |
| `followUp.expect` | Mark Follow-Up Expected | needs a choice | Pathologist, Fellow |
| `followUp.recordOutcome`, `.reopen` | Record or reopen a follow-up | needs a choice | Pathologist, Admin, Lab Director, QA Reviewer |
| `followUp.emailClinician` | Email Ordering Clinician About Follow-Up | deliberate click | same |
| `codes.searchFlagged` | Search Codes for a Flagged Finding | needs a choice (which finding) | Pathologist, Fellow, Resident |
| `biometric.enrol`, `.disable` | Enrol or turn off biometric sign-in | needs a choice (device prompt) | every staff role |

The grants follow the matching capabilities in `capabilitySeeds.ts`; a command grant never widens access. Looked at and left out: vial, rack, plate and scan-batch label printing (no screen calls it yet, so there is nothing to trigger), and the new administrator screens (BI reporting feed, interface dictionary, workstation registry, scope reference), which are reached through their `screen:<name>:open` capability like the other Configuration tiles.

## Batch 619: the 6 Outbound Queue actions

A new group, **Outbound Queue** (`F34`), names what a person does on the Outbound Queue screen. None has a voice phrase or hotkey: each needs messages picked on screen first, and all but Hold change what leaves the lab, so they take a deliberate click.

| Role Dictionary id | Action | Kind | Default grant |
|---|---|---|---|
| `outboundQueue.hold` | Hold Outbound Messages | needs a choice (which messages, which reason) | Admin |
| `outboundQueue.release`, `.retry`, `.retract`, `.overrideRelease`, `.markNotReportable` | Release, retry or resubmit, retract a charge, release a charge now, mark not reportable | deliberate click | Admin |

The grants follow the matching `interface:outbound:*` capabilities; a command grant never widens access.

## Batch 645: the 7 Lockbox Drop-Off actions

A new group, **Lockbox Drop-Off** (`F36`). Five are real voice and hotkey commands (they are in the voice list as well); two have no phrase because each needs a row picked first and adds a permanent entry. The five are in `src/services/actionRegistry/lockboxVoiceCommands.ts`; Spanish phrases are in `spanishVoiceTriggers.ts`. All non-English phrases are machine translated and are on the phrase review list.

| Role Dictionary id | Voice list id | Action | Hotkey | Default grant |
|---|---|---|---|---|
| `lockbox.open` | `OPEN_LOCKBOX_DROP_OFF` | Go to Lockbox Drop-Off (always on, so also Alt+J then Shift+Z) | Alt+Shift+Z | Accessioner, Admin |
| `lockbox.focusScan` | `LOCKBOX_FOCUS_SCAN` | Focus the scan field (screen action) | Alt+S | Accessioner |
| `lockbox.markUrgent` | `LOCKBOX_MARK_URGENT` | Mark the next drop urgent (toggles; screen action) | Alt+G | Accessioner |
| `lockbox.showDropOff` | `LOCKBOX_SHOW_DROP_OFF` | Show the Drop-Off tab (screen action) | Alt+D | Accessioner |
| `table.goToRow` | `TABLE_GO_TO_ROW` | Worklist: move the highlight to a numbered row (view command; the number travels with the command) | Alt+7 | All roles with the view commands |
| `table.openByAccession` | `TABLE_OPEN_ACCESSION` | Worklist: open the case whose accession was said (only when exactly one matches) | Alt+8 | All roles with the view commands |
| `banner.showNhsStatus` | `SHOW_NHS_STATUS` | Show NHS Number Status on the case banner (moves focus to the badge, which opens its explanation; letter hotkeys are all taken) | Ctrl+Alt+Shift+9 | All roles with the view commands |
| `caseTeam.addCollaborator` | `ADD_COLLABORATOR` | Report screen: add the named staff member to the case team as a Consultant (needs `case:team:manage`; the name travels with the command) | Ctrl+Alt+Shift+0 | All roles with the view commands (the save is checked by the service) |
| `lockbox.showFolder` | `LOCKBOX_SHOW_FOLDER` | Show the Overnight folder tab (screen action; needs `lockbox:folder:review`) | Alt+M | Accessioner, Admin |
| `lockbox.markAccessioned` | none | Mark a folder row accessioned | deliberate click | Accessioner, Admin |
| `lockbox.resolvePlaceholder` | none | Link a placeholder to its real order or accession number | needs a choice (the number is typed) | Accessioner |

The four screen actions work only while Lockbox Drop-Off is open (context `LOCKBOX`). The grants follow the `lockbox:*` capabilities; a command grant never widens access. The Go to command opens the route through the unsaved-changes guard (`components/Lockbox/LockboxNavigation.tsx`); a person without `screen:lockbox-drop-off:open` still gets the screen's access message.

## The 98 permission-only entries, settled (Batch 614)

Batch 601 left 98 Role Dictionary entries with no voice phrase or hotkey and a note that voice "needs screen handlers". Batch 614 settled every one, so none is left as planned:

- **16 became real voice and hotkey commands** (all the text-editor entries). They work on the editor that last had the cursor, on any screen with a report text box. Keys are Ctrl+Alt+1 to 9 and 0, and Ctrl+Alt with . , / [ ] ; so they never clash with the usual text keys (Ctrl+B). Each has phrases in five languages. "Section" means a heading: Next/Previous Section moves to the next or previous heading. Show / Hide Ruler is now a real ruler above the text (centimetre ticks); it did not exist before.
- **The other 82 entries (80 distinct ids; AI Confidence and AI Override are listed twice) are classified** in `src/services/actionRegistry/permissionOnlyActions.ts`, and the guard test checks it. A new permission-only entry must be classified there, and a covering command must exist and be active.

| Why it has no voice phrase of its own | Ids |
|---|---|
| Covered by another command | 24 |
| Screens and lists you open | 25 |
| Need something picked on screen first | 16 |
| Deliberate click only (changes or sends records, or cannot be undone) | 15 |

**Covered by another command (24).**

| Role Dictionary id | Already spoken or keyed by |
|---|---|
| `system.saveDraft` | `SAVE_DRAFT` |
| `table.refineSearch` | `TABLE_SEARCH` |
| `diagnosis.signOut` | `SIGN_OUT` |
| `diagnosis.amend` | `ADD_AMENDMENT` |
| `case.viewWorklist` | `OPEN_WORKLIST` |
| `case.open` | `TABLE_OPEN_SELECTED` |
| `case.prioritize` | `FLAG_APPLY_STAT` |
| `specimen.applyFlag` | `FLAG_OPEN_MANAGER` |
| `specimen.removeFlag` | `FLAG_OPEN_MANAGER` |
| `report.preview` | `PREVIEW_REPORT` |
| `report.selectTemplate` | `TEMPLATE_SELECT` |
| `report.overrideTemplate` | `TEMPLATE_SELECT` |
| `ai.diagnosisSuggest` | `AI_REVIEW_CONFIRM` |
| `ai.grossAssist` | `AI_REVIEW_CONFIRM` |
| `ai.macroSuggest` | `AI_REVIEW_CONFIRM` |
| `ai.override` | `AI_REVIEW_OVERRIDE` |
| `ai.changeReportTemplate` | `TEMPLATE_SELECT` |
| `ai.acceptNarrativeSection` | `CYTOLOGY_INSERT_NARRATIVE` |
| `config.access` | `OPEN_CONFIGURATION` |
| `config.auditLog` | `OPEN_AUDIT` |
| `config.routingRules` | `OPEN_ROUTING_RULES` |
| `ai.reviewTriage` | `AI_REVIEW_CONFIRM` |
| `ai.codeSuggest` | `AI_REVIEW_CONFIRM` |
| `ai.narrativeGenerate` | `CYTOLOGY_INSERT_NARRATIVE` |

**Screens and lists you open (25).**
 `case.viewPediatric`, `report.viewHistory`, `ai.viewConfidence`, `facility.view`, `physician.view`, `config.staff`, `config.roles`, `config.subspecialties`, `config.specimens`, `config.flags`, `config.ai`, `config.macros`, `config.shortcuts`, `config.lis`, `config.reportTemplates`, `config.validationStudies`, `qc.configure`, `qc.viewQueue`, `qc.viewDashboard`, `billing.viewCodes`, `billing.viewHistory`, `admin.dashboard`, `admin.reports`, `admin.eventLog`, `admin.validationStudies`.

**Need something picked on screen first (16).**
 `case.editDemographics`, `case.assign`, `case.reassign`, `specimen.edit`, `specimen.assignSubspecialty`, `report.generate`, `report.download`, `ai.regenerateSection`, `facility.edit`, `physician.edit`, `physician.verify`, `qc.claimReview`, `qc.submitReview`, `qc.escalateDiscordance`, `billing.editCodes`, `synoptic.markDeferred`.

**Deliberate click only (changes or sends records, or cannot be undone) (15).**
 `diagnosis.coSign`, `diagnosis.revokeSignOut`, `case.archive`, `case.delete`, `specimen.remove`, `specimen.syncLIS`, `specimen.editLISStatus`, `report.deliver`, `report.redeliver`, `qc.exportReport`, `billing.submitClaim`, `billing.exportBatch`, `admin.export`, `admin.backups`, `admin.impersonate`.

A role's grant of any of these only records whether the role may use it. Real access control is capabilities. Sign-out itself stays spoken (Sign Out Case opens the confirmation); co-signing, revoking a sign-out, deleting or archiving a case, delivering a report, submitting a claim and the data exports take a deliberate click, so a misheard word or a stray key cannot do them. Say so if you want any of them spoken after a confirmation step.

## Hotkey and voice clashes: the screen in focus wins (Batch 602)

Rule (Pete): on a screen, a hotkey or phrase means that screen's command. Across screens the same key can mean different things; every command still has its own unique id and `internalKey`, and the system works out which one was meant from the screen in focus.

- **Screen wins.** Of the 61 clashes between an always-on (System / Navigation) command and a screen command, the screen command runs. Voice does the same: screen commands are matched first.
- **Alt+J, then the key, reaches the always-on command.** Alt+J opens a small "Go to" panel listing every always-on command by its key. Esc, clicking away, Ctrl/Meta or an unknown key cancels it and runs nothing; it dismisses itself after 3 seconds. Alt+J itself is reserved (Alt+G is taken by three screen commands). The panel uses the physical J key (`e.code`) so it works on Mac, where Option+J types a different character, and the following key by the character printed on it, so AZERTY users press the letter they see.
- **Two commands on one screen, or two always-on commands, may not share a key or a phrase.** The 6 always-on pairs were remapped for good: Open Enhancement Request Alt+O to Alt+Y, Open Testing Feedback Alt+T to Alt+X, Open Resources Alt+C to Alt+Q, Focus Case Search Alt+F to Alt+Shift+B, Open Participation Types Alt+P to Alt+Shift+W, Intraop Touch Prep Performed Alt+L to Alt+Shift+Y. Sites that never changed those keys get the new default; customised keys are kept.
- **Voice duplicates fixed.** 9 phrases removed where two commands could not be told apart (several were mistranslations): "find case" and its fr/de/nl/ko equivalents on Open Search; fr "annuler" on AI Review Override; fr "enregistrer le rapport" on Intraop Log Surgeon Report; de "nachricht löschen" on Message Clear Body. The fr/de/nl/ko wording still needs a native-speaker review.
- Enforced by `actionsCoverage.guard.test.ts` (no same-screen or always-on pair shares a key or a phrase; every always-on command has its own prefix key) and `shortcutResolution.test.ts`.
- **Mac Option and AltGr (Batch 614).** Hotkeys are now matched by the rules in `shortcutResolution.ts`: AltGr counts as the Alt key it is (so it cannot fire a Ctrl+Alt shortcut by accident), and with Alt down a letter, digit or `, . /` key is read from the physical key when Option or AltGr changed the character. On Windows and Linux, and on AZERTY and QWERTZ, the printed character is still used. In a text field, a press that typed a character (Option+E, AltGr+Q) is typing, not a hotkey. Recording a hotkey in Configuration → Actions uses the same rules, so what is recorded is what fires. Tested with simulated key events; not yet tried on a Mac or an AltGr keyboard.
- **The cheat sheet lists the Go to routes (Batch 614).** The Role Dictionary action reference now includes the always-on commands, each with "Alt+J, then X", and Configuration → Actions shows the same route under an always-on command's key.

## Batch 600: the 60 record-changing commands now have roles-list entries

Each of the 60 now has an entry in the Role Dictionary (seven new groups: Report Workflow, Case Handling, Orders & Printing, Intraoperative, Cytology Screening, Workstations, Result Dispatch) and keeps the key its voice phrase and shortcut already had, so the two lists are joined for good. The registry reads each key from the roles list (`ACTION_MAP[...]`), so they cannot drift apart.

**Default grants.** Customers start from these and change them; nobody builds a role from nothing. They were chosen from each role's job and need Pete's review. Roles not shown (Physician, Or Staff, QA Reviewer, Template Author, Template Approver) start with none; Superadmin has all.

**Report Workflow**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Confirm Finalise | ✓ |  |  |  |  |  |  |  |  |  |
| Add Addendum | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Add Amendment | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Sign Out and Next | ✓ |  |  |  |  |  |  |  |  |  |
| Save Report Draft | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Discard Unsaved Changes | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Select Report Template | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Recall Report | ✓ |  |  |  |  |  |  |  |  |  |
| Return to Trainee | ✓ |  |  |  |  |  |  |  |  |  |
| Confirm AI Finding | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Override AI Finding | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Save Note | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |

**Case Handling**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Confirm Delegation | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Request Consultation | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Accept Pool Case | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Pass Pool Case | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Save Flags | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |
| Apply STAT Flag | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |
| Add Team Member | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Assign to Participation Type | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Delete Row |  |  |  |  |  |  |  |  | ✓ |  |

**Orders & Printing**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Add Block / Recut | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |  |
| Order Stain / Sectioning | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |  |  |  |
| Add New Specimen | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| Add Block (Add Orders) | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Add to Add-On Order | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Submit Add-On Order | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Print Current Cassette | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| Batch Print Case Slides | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |

**Intraoperative**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Log Surgeon Report | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Log Touch Prep Performed | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Skip Touch Prep | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Log Frozen Section Cut | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Log Squash Prep | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Log Cytology / Fluid Evaluation | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Log Gross Only / Intraoperative Consultation | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| Start Intraop Session (Continue to Specimen) | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Save Specimen and Next (Intraop) | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Save Specimen and Close Session (Intraop) | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| Merge Intraop Session into Case | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |

**Cytology Screening**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Add Residual Fluid | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Add Cell Block | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Save Cytology Synoptic | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Insert Generated Narrative | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Save Cytology Review | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Save CISOE-A Review | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |
| Complete Retrospective Review | ✓ | ✓ |  |  |  |  | ✓ |  |  |  |
| Record Cyto-Histologic Correlation | ✓ | ✓ |  |  |  |  | ✓ |  |  |  |

**Workstations**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Add Comment (Microtomy) |  |  |  |  |  | ✓ |  |  |  |  |
| Add Stain to Slide Grid |  |  |  |  |  | ✓ |  |  |  |  |
| Confirm Embedding (Piece Count) |  |  |  |  |  | ✓ |  |  |  |  |
| Add Comment (Embedding) |  |  |  |  |  | ✓ |  |  |  |  |
| Confirm Physical Routing (Slide Distribution) |  |  |  |  |  | ✓ |  |  |  |  |
| Confirm Scanner Routing (Slide Distribution) |  |  |  |  |  | ✓ |  |  |  |  |
| Create Container (Batch Management) |  |  |  |  |  | ✓ |  | ✓ |  |  |
| Create Plate (Molecular) |  |  |  |  |  |  |  | ✓ |  |  |
| Place Rack on Instrument (Molecular) |  |  |  |  |  |  |  | ✓ |  |  |

**Result Dispatch**

| Command | Path | Fellow | Resident | PA | Accessioner | Histotech | Cytotech | Molecular | Admin | Lab Dir |
|---|---|---|---|---|---|---|---|---|---|---|
| Dispatch Now |  |  |  |  |  |  |  |  | ✓ | ✓ |
| Retry Dispatch |  |  |  |  |  |  |  |  | ✓ | ✓ |

**How existing sites get them.** A site whose roles are already stored would not see new defaults, so each built-in role is offered the new commands once (`Role.seededActions` remembers which). A command an administrator later removes stays removed, and a hospital's own roles (including copies of a built-in role) are not touched. Duplicating a built-in role copies its current grants.

**These do not widen access.** A command only triggers something; whether the person may do it is still decided by their capabilities in the service.

## Related, not changed

- `ACTION_GROUPS` has 16 internal-key duplicates among its own entries (disclosed in `constants/README.md`, PS-66). A role entry that shares a key with another resolves to whichever is listed last in the cheat sheet.
- Station profile and action group bundles can also make a command eligible on a screen; the clash check above covers the app-context rule only.
