---
module: Voice and Keyboard
workflow: Working Faster
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager]
keywords: [voice commands, hotkeys, keyboard shortcuts, dictation, say, command list, Alt+J, cancel, confirm by repeating]
routes: []
previous: home
next: worklist
related: [report, worklist, personal-settings, help]
status: Draft
---

# Voice and Keyboard {#top}

## Overview

**Purpose.** Every command PathScribe can run can be run three ways: by clicking, by a keyboard shortcut, or by saying it. This article lists them all, explains the rules that decide which command runs, and shows how to cancel or confirm by voice.

**Intended users.** Everyone. Pathologists use voice and keys most on the Report screen; accessioners and histotechnologists on their own screens.

**Where it fits.** The same command does the same thing however you start it. A command does nothing you could not do with the mouse: if a button is greyed out because you lack the permission, the key and the phrase are refused too.

!!! note "The list below is today's list"
    There are 286 commands. Your laboratory's administrator can change a shortcut or a spoken phrase for the whole laboratory (Configuration > Action Registry), and you can teach the system your own spoken corrections. If a key or phrase here does not work for you, look at the Action Registry screen or ask your administrator.

## Screen Tour

![The voice bar and the Go to panel](capture:voice-and-keyboard-overview)

### Field definitions

| Term | What it means |
|---|---|
| Command | One thing PathScribe can do, such as Next Case or Sign Out Case. |
| Shortcut | The key combination that runs it. Written as Alt+W (hold Alt and press W). A shortcut shown as "Alt+J, then W" means press Alt+J, release, then press W. |
| Phrase | What you say. Phrases are lower case here. You can say them in English, French, German, Dutch, Korean or Spanish; the phrases in the other five languages are in the Action Registry screen. Your screen language chooses which set is listened for. |
| Always on | A command that works on every screen (the System and Go to groups). |
| Screen command | A command that only works on one screen (for example the Report screen). |

### Toolbar

| Control | What it does |
|---|---|
| Microphone button / voice bar | Turns listening on and off. While it is on, the bar shows what it heard and what it will do. |
| Alt+J | Opens the "Go to" panel: a small list of the always-on commands by their keys. Press the key shown to run one. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Microphone active | The system is listening. |
| "Say it again to confirm" | The command is hard to undo, so it asks you to say the same phrase again within 8 seconds. |
| Greyed button | You do not hold the permission; the key and phrase are refused as well. |

**Confirmation timed out.** A command that is hard to undo waits for you to say it again. If you do not repeat it within 8 seconds the overlay briefly shows "Not confirmed in time: …" with the command's name, and nothing runs. Say the command once more and then confirm it in time.

### Hotkeys

| Key | What it does |
|---|---|
| Alt+J, then a key | Runs the always-on command with that key, even when a screen command has taken the key. Esc, a click elsewhere, Ctrl or an unknown key cancels it; it closes by itself after 3 seconds. |
| F1 | View Help: opens the article for the screen you are on. |
| Ctrl+Alt+J | Cancel: closes the open window, stops dictation or drops a command that is waiting to be confirmed (see "Cancel by voice"). |

## Step-by-Step Procedures

### Standard workflow

1. Turn the microphone on (button on the voice bar, or the voice-bar shortcut shown in the Action Registry).
2. Say a command phrase exactly as listed below, for example "next case". The bar shows what it heard.
3. The command runs. If it is one of the hard-to-undo commands, nothing runs yet and the bar asks you to say it again; say the same phrase within 8 seconds and it runs.
4. To dictate, say "enter gross", "enter micro" or "enter diagnosis" on the Report screen. What you say next goes into that section until you say "cancel dictation" or move to another section.

### Alternative workflow

1. Use the key instead: hold the keys shown in the Shortcut column.
2. If a key does nothing on your screen, a screen command may be using it. Press Alt+J and then the key to reach the always-on command.
3. Or click the button. Every command presses the same button you would click.

### Exception handling

1. If the system hears a phrase that matches two commands, the command for the screen you are on wins. The always-on command is reached with Alt+J, then its key.
2. Two phrases are special on the Report screen: "back" and "forward" move between sections there (not between screens). Say "go back to report" to close a window.
3. If a command is refused, the voice bar says why (not available on this screen, you did not repeat the phrase, or you did not repeat it in time). Refusals are recorded in the Audit Log, without what you said.

### Error recovery

1. If the system heard something wrong and a command ran, use the screen's own undo or the Cancel command; nothing runs that you could not do with the mouse, and every protected action still asks its own confirmation.
2. If you started dictating by mistake, say "cancel dictation". The system asks you to say it again to discard what was dictated in this session; if you say something else, the dictation simply stops and keeps the text.
3. If the wrong phrase keeps being heard, add a learned correction in your personal settings (see [Personal Settings](help:personal-settings)).

## The rules that decide which command runs

- **The screen in focus wins.** If a screen command and an always-on command use the same key or phrase, the screen command runs. The always-on command is reached with Alt+J, then its key.
- **No two commands on one screen share a key or a phrase.** The product's own tests enforce this.
- **Hard-to-undo voice commands ask twice.** These are: Delete Row (Worklist), Delete Message, Delete All Selected, Recall a released report, Release Case From Hold and Release Autopsy Body. A key press is already a deliberate act, so keys do not ask. Commands that open their own confirmation window (Sign Out Case, Confirm Finalise, Discard Unsaved Changes, delegation) do not ask a second time by voice.
- **Cancel by voice.** Saying "cancel" closes the open window, or drops a command that is waiting to be confirmed. While you are dictating, "cancel dictation" asks you to repeat it before discarding what you dictated in this session.
- **Everything is audited.** Every voice command that runs, and every one that is refused, writes an Audit Log entry with the command, the screen and the person, never what was said and never a case.

## Voice button and prompts: more detail

The microphone button changes its tooltip with its state:

| Tooltip | Meaning |
|---|---|
| Click to enable voice | Voice is off. |
| Voice AI — click to enable | Voice with AI clean-up is available. |
| Voice AI active — click for Local | AI voice is on; click to switch to local voice. |
| Voice Local — click to stop | Local voice is listening. |
| Dictating — click to stop | Dictation mode is on. |
| Voice is disabled for this deployment | Your organisation has turned voice off. |
| AI refinement unavailable | A warning that the AI clean-up step cannot run, so text is not refined. |

While AI polishes your words the overlay says **Refining…**. A phrase PathScribe cannot match flashes **UNRECOGNISED COMMAND**. When there are close matches the prompt asks **DID YOU MEAN?**; each choice says **tap to learn**, and choosing it teaches PathScribe your wording. In the voice settings, the macro list shows **Loading voice macros...** while it loads, and **Syncing...** and **Settings saved to cloud** show that your settings are being stored.

## Tips and Best Practices

### Common mistakes

- Saying a phrase on the wrong screen. A screen command only works on its own screen; check the heading of the table below that matches where you are.
- Expecting a key to work when a window is open. Many keys belong to the screen underneath.
- Saying a phrase in the wrong language. Your screen language chooses the phrases that are listened for.

### Efficiency recommendations

- Learn the five or six commands you use most: Next Case, Previous Case, Open History, Save Report Draft, Enter Gross, Enter Diagnosis.
- Use Alt+J, then a key for always-on commands you need on the Report screen.
- Say short phrases clearly with a short pause before and after.

### Workflow recommendations

- Pathologists: dictate with Enter Gross / Enter Micro / Enter Diagnosis, then use Edit Field to correct a single answer by voice.
- Bench staff: use the station commands (Microtome, Embedding, Slide Distribution) so you never touch the keyboard with gloves on.

## Related Features

### Upstream workflow

- [Help](help:help)
- [Personal Settings](help:personal-settings)

### Downstream workflow

- [Report](help:report)
- [Worklist](help:worklist)

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A key does nothing | A screen command is using it, you are on a different screen, or a window is open. Try Alt+J then the key. |
| The microphone is on but nothing happens | The phrase is not in the list for your screen language, or the command belongs to a different screen. |
| The command is greyed out | You do not hold the permission for the action. |
| "Say it again to confirm" keeps appearing | The command is hard to undo. Say the same phrase again within 8 seconds. |

### Resolution steps

1. Check the table below for the screen you are on.
2. Try the key; if the key does nothing, try Alt+J then the key.
3. Check your screen language.
4. Ask your administrator to look at the command in Configuration > Action Registry.

### When to contact support

Contact your laboratory's PathScribe support when a listed phrase is never recognised in your language, or a command runs that you did not say. Have the screen, the phrase and the time ready.

## Every command, by screen

Phrases are the English ones; the same commands have phrases in French, German, Dutch, Korean and Spanish. Keys are the defaults. A blank Key means the command has no default key.


### Everywhere (go to a screen) (11 commands)

| Command | Key | You can say |
|---|---|---|
| Go to Lockbox Drop-Off | Alt+Shift+Z | open lockbox drop-off; go to lockbox drop-off; open lockbox; lockbox drop-off |
| My Contribution | Alt+K | my contribution; open my contribution; go to my contribution; contribution |
| Next Case | Alt+N | next case; go to next case; next patient; open next case |
| Next Tab / Section | Alt+. | next tab; go to next tab; tab right; next section |
| Open Configuration | Alt+C | open configuration; go to configuration; configuration; open config |
| Open Intraop Queue | Alt+O | open intraop queue; show intraop queue; open intraoperative queue; unlinked intraoperative entries |
| Open Search | Alt+F | open search; go to search; search cases; search |
| Open Worklist | Alt+W | open worklist; go to worklist; show worklist; worklist |
| Previous Case | Alt+P | previous case; go to previous case; prior case; last case |
| Previous Tab / Section | Alt+, | previous tab; go to previous tab; tab left; prior tab |
| System Audit | Alt+U | open audit; system audit; open system audit; go to audit |

### Everywhere (system) (13 commands)

| Command | Key | You can say |
|---|---|---|
| Focus Case Search | Alt+Shift+B | search case; find case; look up case; case search |
| Go Back | Alt+ArrowLeft | go back; back; previous page; go to previous page |
| Go Forward | Alt+ArrowRight | go forward; forward; next page; go to next page |
| Go Home | Alt+H | go home; home page; go to home; open home |
| Log Out | Alt+L | log out; sign out system; logout; log me out |
| Open Clinical Resources | Alt+Q | open resources; clinical resources; open clinical resources; quick links |
| Open Enhancement Request | Alt+Y | open enhancement request; enhancement request; open enhancement |
| Open Messages | Alt+I | open messages; open message; show messages; messages |
| Open Participation Types | Alt+Shift+W | participation types; open participation types; case participation; manage participation types |
| Open Routing Rules | Alt+R | open routing rules; routing rules; case routing; open case routing |
| Open Testing Feedback | Alt+X | open testing feedback; testing feedback; QA feedback; open feedback |
| Test Routing Rule | Alt+Shift+T | test routing; test rule; check routing; route this specimen |
| View System Help | F1 | view help; open help; system help; show help |

### Worklist (38 commands)

| Command | Key | You can say |
|---|---|---|
| Clear Filter | Alt+Shift+C | clear filter; remove filter; show all; reset filter |
| Clear Search | Ctrl+Alt+A | clear search; clear the search; remove search; reset search |
| Clear Sort | Ctrl+Alt+C | clear sort; remove sort; reset sort; clear sorting |
| Collaborating Cases | Ctrl+Alt+F | collaborating cases; show collaborations; show consult cases; cases i collaborate on |
| Delete Row | Alt+D | delete row; delete this row; remove row; delete entry |
| Deselect All | Alt+Shift+D | deselect all; clear selection; uncheck all; deselect everything |
| Filter Autopsy | Alt+Shift+Q | filter autopsy; autopsy cases; show autopsy cases |
| Filter Awaiting Countersign | Alt+A | awaiting countersign; needs countersign; pending countersign; countersign cases |
| Filter by Physician | Alt+Shift+F | filter by; cases by; show cases by; physician filter |
| Filter Completed | Alt+C | filter completed; show completed; completed cases; show completed cases |
| Filter Digital Pathology | Ctrl+Alt+Y | filter dp; filter digital pathology; dp cases; show dp cases |
| Filter GYN Cytology | Ctrl+Alt+Z | filter gyn cytology; gyn cytology cases; show gyn cytology; filter gyn |
| Filter New Cases | Alt+Shift+U | filter new cases; new cases; show new cases; unopened cases |
| Filter Non-GYN Cytology / FNA | Alt+Shift+K | filter non gyn cytology; non gyn cytology cases; filter fna; fna cases |
| Filter Pool Cases | Alt+Shift+P | pool cases; show pool; unassigned cases; filter pool |
| Filter Urgent | Alt+F | filter urgent; urgent cases; filter stat; stat cases |
| First Row | Alt+Home | first; go to first; top of list; first row |
| Go to Row | Alt+7 | go to row; jump to row; row number |
| Last Row | Alt+End | last; go to last; end of list; last row |
| Next Row | Alt+ArrowDown | next; next row; move down; down one |
| Open Case by Accession | Alt+8 | open accession; go to accession; open case number |
| Open Selected | Alt+Enter | open; open selected; open case; open this case |
| Open Slide Details | Ctrl+Alt+X | open slide details; show slide details; slide details |
| Page Down | Alt+PageDown | page down; scroll down; more results |
| Page Up | Alt+PageUp | page up; scroll up; back to top |
| Previous Row | Alt+ArrowUp | previous; previous row; move up; up one |
| Read AI Triage | Ctrl+Alt+W | read ai triage; ai result; read ai result; what is the ai finding |
| Read Digital Readiness | Ctrl+Alt+V | read digital readiness; slide status; scan status; read scan status |
| Read Flags | Alt+Shift+R | read flags; what are the flags; case flags; list flags |
| Read Specimen | Ctrl+Alt+R | read specimen; what is the specimen; specimen type; confirm specimen |
| Refresh | Alt+R | refresh; reload; refresh list; refresh worklist |
| Search | Alt+/ | search worklist; find in list; search the list |
| Select All | Alt+Shift+A | select all; check all; tick all; select everything |
| Select Row | Alt+Space | select; select this; select row; check this |
| Sort By Column | Ctrl+Alt+S | sort by; sort column; order by |
| Sort by Date | Alt+S | sort by date; sort by time; order by date; newest first |
| Sort by Priority | Alt+P | sort by priority; urgent first; show urgent first; order by priority |
| Sort by Status | Alt+Shift+S | sort by status; order by status; group by status |

### Search (3 commands)

| Command | Key | You can say |
|---|---|---|
| Clear Search | Alt+C | clear search; reset search; clear all; new search |
| Execute Search | Alt+E | execute search; run search; search now; go |
| Load Saved Search | Alt+L | load search; open saved search; search protocol; saved search |

### Accession (10 commands)

| Command | Key | You can say |
|---|---|---|
| Add Case Comment | Alt+Shift+C | add case comment; open case comment; case comment |
| Add Specimen | Alt+N | add specimen; add another specimen; new specimen; add a specimen |
| Clinical History — Category 1 (SCR) | Alt+1 | category one; screening category; jump to screening |
| Clinical History — Category 2 (SYM) | Alt+2 | category two; symptoms category; jump to symptoms |
| Clinical History — Category 3 (RAD_LAB) | Alt+3 | category three; radiology lab category; jump to radiology |
| Clinical History — Category 4 (PRIOR_PATH) | Alt+4 | category four; prior pathology category; jump to prior pathology |
| Clinical History — Category 5 (MAL_STAGE) | Alt+5 | category five; malignancy staging category; jump to staging |
| Clinical History — Category 6 (HIGH_RISK) | Alt+6 | category six; high risk category; jump to high risk |
| Import From Order | Alt+I | import order; import from order; search orders; find order |
| Submit Case | Alt+Enter | submit case; submit accession; complete accession; finish accession |

### Grossing (3 commands)

| Command | Key | You can say |
|---|---|---|
| Cancel Complete Grossing | Alt+Shift+F11 | cancel complete grossing; do not complete grossing |
| Complete Grossing | Alt+Shift+F9 | complete grossing; finish grossing; grossing done |
| Confirm Complete Grossing | Alt+Shift+F10 | confirm complete grossing; yes complete grossing; confirm finish grossing |

### Report screen (132 commands)

| Command | Key | You can say |
|---|---|---|
| Accept Pool Case | Alt+A | accept case; take this case; assign to me |
| Add Addendum | Ctrl+Alt+Shift+B | add addendum; open addendum; addendum request; request addendum |
| Add Amendment | Ctrl+Alt+E | add amendment; open amendment; request amendment; amendment |
| Add Block (Add Orders) | Ctrl+Alt+Shift+8 | confirm block order; save block order |
| Add Block / Recut | Alt+B | add block; add recut; add cassette; order deeper levels |
| Add Code | Ctrl+Alt+H | add code; open add code; new code; add medical code |
| Add Collaborator | Ctrl+Alt+Shift+0 | add collaborator; add a collaborator; invite collaborator |
| Add New Specimen | Alt+N | add new specimen; add specimen container; new tissue container |
| Add Note | Ctrl+Alt+Shift+N | add note; new note; open add note |
| Add Orders | Ctrl+Alt+A | add orders; open add orders; new order |
| Add Synoptic | Alt+Z | add synoptic; open add synoptic; add report; new synoptic |
| Add Team Member | Alt+M | add team member; add participant; add to team; assign participant |
| Apply STAT Flag | Alt+S | flag stat; mark stat; stat flag; urgent stat |
| Assign to Participation Type | Alt+Shift+A | assign as; assign to; set as primary; set as consultant |
| Batch Print Case Slides | Alt+Shift+P | batch print case slides; print all cassettes; print all cassettes for case |
| Bold | Ctrl+Alt+1 | make bold; bold text; toggle bold |
| Bullets | Ctrl+Alt+4 | bullet list; make bullets; toggle bullets |
| Cancel | Ctrl+Alt+J | cancel; close modal; dismiss; go back to report |
| Cancel AI Review | Escape | cancel review; exit review; stop review |
| Cancel Finalise | Ctrl+Alt+Escape | cancel finalise; cancel finalize; cancel sign off |
| Cancel Flags | Ctrl+Alt+Shift+X | cancel flags; discard flag changes; close flag manager |
| Cancel Note | Ctrl+Alt+B | cancel note; discard note |
| Case Comment | Ctrl+Alt+C | case comment; open case comment; add case comment; dictate case comment |
| Close History | Alt+Shift+H | close history; close similar cases; close prior cases |
| Close Notes | Ctrl+Alt+D | close notes; close drawer; close internal notes |
| Confirm AI Finding | Space | confirm; accept; agree; correct |
| Confirm Delegation | Ctrl+Enter | confirm delegation; send case; complete transfer |
| Confirm Field | Ctrl+Alt+Shift+A | confirm field; accept field; approve field; confirm answer |
| Confirm Finalise | Ctrl+Alt+Shift+C | confirm finalise; confirm finalize; confirm sign off; yes finalise |
| Confirm Post-Sign-Out Billing Change | Ctrl+Alt+Shift+1 | confirm billing change; confirm post signout billing change |
| Confirm Triage | Alt+Shift+T | confirm triage; triage complete; triage confirmed |
| Continue Past Collection/Receipt Date Gate | Ctrl+Alt+Shift+6 | continue date gate; continue receipt date gate |
| Continue Past Fixation Time Gate | Ctrl+Alt+Shift+5 | continue fixation gate; continue fixation time |
| Correct Applied Billing Code | Ctrl+Alt+Shift+2 | correct billing code; correct applied code |
| Decrease Indent | Ctrl+Alt+7 | indent less; decrease indent |
| Deselect All | Ctrl+Alt+M | deselect all; clear selection; deselect all specimens |
| Dictate Administrative Header |  | dictate administrative; dictate admin; dictate clinical header; dictate header |
| Dictate Final Diagnosis Section |  | dictate ancillary; dictate final diagnosis; dictate conclusion |
| Dictate Gross Description Section |  | dictate gross description; dictate specimen; dictate macroscopic |
| Dictate Note | Alt+Shift+N | dictate note; dictate; dictate into note |
| Dictate section 1 |  | dictate section one; dictate first section |
| Dictate section 2 |  | dictate section two; dictate second section |
| Dictate section 3 |  | dictate section three; dictate third section |
| Dictate section 4 |  | dictate section four; dictate fourth section |
| Dictate Synoptic Summary |  | dictate synoptic; dictate synoptic summary; dictate summary |
| Discard Unsaved Changes | Alt+U | discard changes; undo all changes; revert changes; cancel changes |
| Edit Field | Alt+E | edit field; change field; correct field; modify field |
| Enter Addendum | Alt+Shift+D | enter addendum; start addendum; dictate addendum |
| Enter Diagnosis | Ctrl+Alt+Shift+D | enter diagnosis; start diagnosis; dictate diagnosis; add diagnosis |
| Enter Gross Description | Ctrl+Alt+Shift+G | enter gross; start gross; dictate gross; gross description |
| Enter Microscopic Description | Alt+Shift+G | enter micro; start micro; dictate micro; microscopic description |
| Finalise Report | Ctrl+Alt+Shift+F | finalise; finalize; finalise report; finalize report |
| Find in Text | Ctrl+Alt+8 | find in text; find in report; open find |
| Full View | Alt+V | full view; show full view; expand view; all sections |
| Generate Report Draft |  | generate report; generate narrative; create report |
| Go to Codes | Ctrl+Alt+G | goto codes; go to codes; codes tab; open codes |
| Go to section 1 |  | go to section one; section one; first section |
| Go to section 2 |  | go to section two; section two; second section |
| Go to section 3 |  | go to section three; section three; third section |
| Go to section 4 |  | go to section four; section four; fourth section |
| Increase Indent | Ctrl+Alt+6 | indent more; increase indent |
| Insert Macro | Alt+Shift+I | insert macro; add macro |
| Insert Signature Line | Ctrl+Alt+[ | insert signature line; add signature line |
| Insert Table | Ctrl+Alt+/ | insert table; add table |
| Internal Note | Alt+I | internal note; open internal note; open notes |
| Italic | Ctrl+Alt+2 | make italic; italic text; toggle italic |
| Log Surgeon Report | Alt+L | report logged; surgeon notified; log the report; confirm report |
| Mark Block Grossed | Alt+G | mark grossed; block grossed; block complete; grossing complete |
| Maximise View | Alt+Shift+M | max; maximise; maximize; full screen |
| Minimise View | Alt+Shift+V | min; minimise; minimize; exit full screen |
| Next Block | Alt+. | next block; go to next block |
| Next Field | Tab | next field; next question; go forward; forward |
| Next Required Field | Ctrl+Alt+Shift+R | next required; go to next required; next required field; show required |
| Next Section |  | next section; go to next section |
| Next Section in Text | Ctrl+Alt+. | next section in text; next heading |
| Next Unanswered Field | Ctrl+Alt+U | next unanswered; go to next unanswered; next empty field; next blank |
| Note Visibility Private | Alt+Shift+J | visibility private; set private; private note; make private |
| Note Visibility Shared | Ctrl+Alt+N | visibility shared; set shared; shared note; make shared |
| Numbered List | Ctrl+Alt+5 | numbered list; make numbered list; toggle numbering |
| Open Case Team | Alt+T | open case team; case team; manage team; show team |
| Open Delegation Menu | Alt+D | open delegation; delegate case; transfer case; show handoff |
| Open Flag Manager | Alt+F | open flags; manage flags; show flags; add flag |
| Open Full Report |  | open full report; show full report; view report |
| Open History | Alt+H | open history; show history; prior cases; similar cases |
| Open Report Draft |  | open report draft; show report draft; go to draft |
| Open Sequencer |  | open sequencer; show sequencer; synoptic fields |
| Order Stain / Sectioning | Alt+Shift+S | order stain; order sectioning; add stain; order ihc |
| Override AI Finding | O | override; incorrect; wrong; override finding |
| Pass Pool Case | Ctrl+Alt+P | pass case; skip case; return to pool; pass |
| Place Case On Hold | Alt+Shift+F5 | place hold; place case on hold; place retention hold |
| Post Comment | Alt+Shift+F8 | post comment; post the comment |
| Preview Report | Ctrl+Alt+Shift+P | preview report; show preview; report preview; preview |
| Previous Block | Alt+, | previous block; go to previous block; prior block |
| Previous Field | Shift+Tab | previous field; previous question; go back; back |
| Previous Section |  | previous section; prior section |
| Previous Section in Text | Ctrl+Alt+, | previous section in text; previous heading |
| Print Current Cassette | Alt+Shift+O | print current cassette; print this cassette; print cassette |
| Recall Report | Ctrl+Alt+Shift+V | recall report; pull back report; recall the report |
| Record Autopsy Authorization | Ctrl+Alt+Shift+3 | record authorization; record autopsy authorization |
| Record Critical Notification | Alt+Shift+F7 | record notification; record critical notification |
| Record Frozen-Final Reconciliation | Ctrl+Alt+Shift+Z | record discordance; record reconciliation; confirm concordant |
| Regenerate All Sections |  | regenerate report; regenerate all; redo report |
| Release Autopsy Body | Ctrl+Alt+Shift+4 | release body; confirm body release |
| Release Case From Hold | Alt+Shift+F6 | release hold; release retention hold |
| Replace in Text | Ctrl+Alt+9 | replace in text; find and replace; open replace |
| Request Consultation | Ctrl+Alt+R | request consultation; request review; send for review; consult colleague |
| Return to Trainee | Ctrl+Alt+Shift+T | return to trainee; reject with notes; send back to resident; return case to resident |
| Save Amendment or Addendum | Alt+Shift+F3 | save amendment; save correction; release addendum |
| Save Biopsy Array | Alt+Shift+F12 | save biopsy array; save array |
| Save Flags | Ctrl+Alt+O | save flags; apply flags |
| Save Note | Ctrl+Alt+Shift+S | save note; submit note; save |
| Save Report Draft | Alt+R | save draft; save report; save changes; save my work |
| Save Specimen | Alt+Shift+F2 | save specimen; save specimen details |
| Select All Specimens | Ctrl+Alt+L | select all specimens; all specimens; flag all specimens |
| Select All Text | Ctrl+Alt+0 | select all text; select all in editor |
| Select Case | Ctrl+Alt+K | select case; flag case; case flag |
| Select Formal Consult | Alt+2 | formal consultation; add consultant; official consult |
| Select Full Transfer | Alt+3 | full transfer; transfer ownership; assign to pool |
| Select Peer Review | Alt+1 | request peer review; internal review; informal opinion |
| Select Report Template | Alt+Shift+R | select template; change template; choose template; switch template |
| Select Specimen | Ctrl+Alt+I | select specimen; goto specimen; go to specimen; specimen one |
| Show / Hide Formatting Marks | Ctrl+Alt+; | show formatting marks; hide formatting marks; toggle formatting marks |
| Show / Hide Ruler | Ctrl+Alt+] | show ruler; hide ruler; toggle ruler |
| Show NHS Number Status | Ctrl+Alt+Shift+9 | NHS status; show NHS status; check NHS number; NHS number status |
| Sign Out and Next | Ctrl+Alt+Shift+O | signout next; sign out next; finalize and next; sign out and next |
| Sign Out Case | Alt+Shift+X | sign out case; sign out the case; case sign out |
| Skip AI Finding | S | skip; skip this; skip finding |
| Skip Field | Ctrl+Alt+Q | skip field; skip this field; move on; leave blank |
| Specimen Comment | Ctrl+Alt+S | specimen comment; open specimen comment; add specimen comment; dictate specimen comment |
| Tabbed View | Ctrl+Alt+T | tabbed view; show tabbed view; tab view; collapse view |
| Toggle Dark Mode |  | dark mode; toggle dark mode; night mode |
| Underline | Ctrl+Alt+3 | make underlined; underline text; toggle underline |

### Intraop Queue (11 commands)

| Command | Key | You can say |
|---|---|---|
| Log Cytology / Fluid Evaluation | Alt+Shift+C | log cytology; cytology evaluation; log fluid evaluation; fluid evaluation done |
| Log Frozen Section Cut | Alt+Shift+L | log frozen section cut; frozen section cut; frozen cut logged |
| Log Gross Only / Intraoperative Consultation | Alt+Shift+G | log gross only; gross only; intraoperative consultation only |
| Log Squash Prep | Alt+Shift+S | log squash prep; squash prep; squash prep done |
| Log Touch Prep Performed | Alt+Shift+Y | log touch prep performed; touch prep performed; touch prep done |
| Merge Intraop Session into Case | Ctrl+Alt+Shift+4 | merge session; confirm merge |
| Save Specimen and Close Session (Intraop) | Ctrl+Alt+Shift+3 | save and close session; close and save |
| Save Specimen and Next (Intraop) | Ctrl+Alt+Shift+2 | save and next specimen; next specimen |
| Skip Touch Prep | Alt+T | skip touch prep; no touch prep; direct to frozen |
| Start Intraop Session (Continue to Specimen) | Ctrl+Alt+Shift+1 | continue to specimen; start the session |
| Start New Intraop Entry | Alt+S | start new intraop entry; start intraop entry; new intraop entry; start entry |

### Lockbox Drop-Off (4 commands)

| Command | Key | You can say |
|---|---|---|
| Focus the Lockbox Scan Field | Alt+S | focus the scan field; lockbox scan field; ready to scan |
| Mark the Next Lockbox Drop Urgent | Alt+G | mark drop urgent; next drop urgent; urgent drop |
| Show Lockbox Drop-Off | Alt+D | show drop-off; drop-off tab; show lockbox scan |
| Show the Overnight Folder | Alt+M | show overnight folder; overnight folder; open overnight folder |

### Messages (25 commands)

| Command | Key | You can say |
|---|---|---|
| Add Recipient | Alt+R | add recipient; add this person; select recipient; confirm recipient |
| Clear Message Body | Alt+Shift+M | clear message; erase message; delete message body; start over |
| Clear Subject | Alt+C | clear subject; erase subject; delete subject; remove subject |
| Close Messages | Escape | close messages; close; dismiss messages; hide messages |
| Delete All Selected | Alt+D | delete all; delete all selected; delete all messages; empty deleted |
| Delete Message | Alt+Delete | delete message; delete this message; remove message; delete |
| Go to Message Body | Alt+B | goto message; go to message; enter message; type message |
| Go to Subject | Alt+G | goto subject; go to subject; enter subject; type subject |
| Mark All as Read | Alt+A | read all; mark all read; mark all as read; read all messages |
| Mark as Read | Alt+M | mark as read; mark read; read this message |
| Mark as Unread | Alt+U | mark as unread; mark unread; unread; set as unread |
| New Internal Message | Alt+Shift+C | compose; compose message; new message; write message |
| Next Message | Alt+ArrowDown | next message; next; move to next message |
| Previous Message | Alt+ArrowUp | previous message; previous; prior message |
| Reply | Alt+Shift+R | reply; reply to message; respond; respond to message |
| Restore Message | Ctrl+Alt+R | restore; restore message; undelete; undelete message |
| Search Messages | Alt+Shift+S | search messages; search; find message; filter messages |
| Search Recipients | Alt+S | search recipients; find user; search for user; browse users |
| Send Message | Alt+Shift+Enter | send; send message; send this message; submit message |
| Send Secure Email | Alt+Shift+E | secure email; send secure email; send email; external email |
| Submit Secure Email | Ctrl+Alt+Shift+7 | submit secure email; deliver secure email |
| Toggle Edit Mode | Alt+E | edit; edit messages; select messages; manage messages |
| Toggle Urgent | Alt+T | urgent; mark urgent; toggle urgent; set urgent |
| View Messages | Alt+Shift+V | view messages; show messages list; back to messages; inbox |
| View Recently Deleted | Alt+V | view deleted; show deleted; recently deleted; deleted messages |

### Cytology (15 commands)

| Command | Key | You can say |
|---|---|---|
| Add Cell Block | Ctrl+Alt+Shift+I | add cell block; new cell block |
| Add Residual Fluid | Ctrl+Alt+Shift+H | add residual fluid; new residual fluid |
| Complete Retrospective Review | Ctrl+Alt+Shift+C | complete retrospective review; complete review |
| Insert Generated Narrative | Ctrl+Alt+Shift+L | insert narrative; insert into notes; insert generated narrative |
| Open Cytology Synoptic | Ctrl+Alt+Shift+J | open synoptic; show synoptic; open synoptic form |
| Open Material | Ctrl+Alt+Shift+E | open material; show material; open material drawer |
| Record Cyto-Histologic Correlation | Ctrl+Alt+Shift+D | record correlation; confirm correlation |
| Save CISOE-A Review | Ctrl+Alt+Shift+B | save cisoe-a review; save cisoea |
| Save Cytology Review | Ctrl+Alt+Shift+A | save review; save cytology review |
| Save Cytology Synoptic | Ctrl+Alt+Shift+K | save synoptic; save template; save synoptic report |
| Select Lymph Node Template | Ctrl+Alt+Shift+W | select lymph node template; lymph node template |
| Select Pancreaticobiliary Template | Ctrl+Alt+Shift+Q | select pancreaticobiliary template; pancreaticobiliary template |
| Select Salivary Gland Template | Ctrl+Alt+Shift+U | select salivary gland template; salivary gland template |
| Select Thyroid Template | Ctrl+Alt+Shift+M | select thyroid template; thyroid template; use thyroid template |
| Select Urine Template | Ctrl+Alt+Shift+Y | select urine template; urine template |

### Molecular (2 commands)

| Command | Key | You can say |
|---|---|---|
| Create Plate (Molecular) | Ctrl+Alt+Shift+N | create plate; create batch |
| Place Rack on Instrument (Molecular) | Ctrl+Alt+Shift+P | place rack; rack on instrument |

### Batch Management (1 commands)

| Command | Key | You can say |
|---|---|---|
| Create Container (Batch Management) | Ctrl+Alt+Shift+N | create container; generate container |

### Microtome station (2 commands)

| Command | Key | You can say |
|---|---|---|
| Add Comment (Microtome) | Ctrl+Alt+Shift+A | add comment; save comment |
| Add Stain to Slide Grid | Ctrl+Alt+Shift+B | add stain; add slide |

### Embedding station (2 commands)

| Command | Key | You can say |
|---|---|---|
| Add Comment (Embedding) | Ctrl+Alt+Shift+A | add comment; save comment |
| Confirm Embedding (Piece Count) | Ctrl+Alt+Shift+C | confirm count; confirm embedding |

### Slide Distribution station (2 commands)

| Command | Key | You can say |
|---|---|---|
| Confirm Physical Routing (Slide Distribution) | Ctrl+Alt+Shift+P | confirm checkout; check out slide |
| Confirm Scanner Routing (Slide Distribution) | Ctrl+Alt+Shift+D | confirm scanner; send to scanner |

### Add-On Orders (2 commands)

| Command | Key | You can say |
|---|---|---|
| Add to Add-On Order | Ctrl+Alt+Shift+A | add to order; add to cart |
| Submit Add-On Order | Ctrl+Alt+Shift+S | submit order; submit add-on order |

### My Contribution (8 commands)

| Command | Key | You can say |
|---|---|---|
| Show Awaiting Response Trend | Alt+A | show awaiting response; awaiting response trend; how long am i waiting; consultation awaiting |
| Show Cold Ischaemia TAT Trend | Alt+C | show cold ischemia; cold ischemia trend; cold ischaemia; ischemia trend |
| Show First Touch TAT Trend | Alt+S | show first touch; first touch trend; first touch tat |
| Show Frozen Section TAT Trend | Alt+F | show frozen section; frozen section trend; frozen section tat; intraop trend |
| Show Grossing TAT Trend | Alt+G | show grossing; grossing trend; grossing tat |
| Show My Response Time Trend | Alt+R | show my response time; response time trend; consultation response trend; how fast do i respond |
| Show Sign-Out TAT Trend | Alt+Shift+S | show sign out; sign out trend; sign out tat; signout trend |
| Show Total Case TAT Trend | Alt+T | show total case; total case trend; total tat |

### Audit Log (2 commands)

| Command | Key | You can say |
|---|---|---|
| Dispatch Now | Alt+D | dispatch now; send now; dispatch this message |
| Retry Dispatch | Alt+R | retry dispatch; retry send; resend |
