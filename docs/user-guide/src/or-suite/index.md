---
module: OR Suite
workflow: Intraoperative consultation
role: [Pathologist, OR Staff, Histotechnologist, Administrator]
keywords: [OR suite, operating room board, frozen section board, wall display, intraoperative, frozen section, turnaround clock, verbal report, dismiss case, read-back, PIN, multi-suite, terminal, display token]
routes: [/or-suite-dashboard]
previous: intraop-queue
next: facility-operations
related: [intraop-queue, facility-operations, accession, report]
status: Draft
---

# OR Suite Display {#top}

## Overview

**Purpose.** The OR Suite display is a wall screen for an operating room or a group of rooms. It lists every frozen section request in progress for that room: how long the tissue has been in the laboratory, which step it has reached, and, once the pathologist has given the frozen section diagnosis, the preliminary result for the surgical team. The OR staff can log that a verbal report was given and, after reading the result back to the surgeon, dismiss the case from the board.

**Intended users.** Operating room nursing and support staff who watch the board and act on it, pathologists and bench staff whose work feeds it, and the administrator who sets up each terminal. The board is a shared screen, so it does not use a personal sign-in. Each action on it (logging a verbal report, dismissing a case) is attributed to a person by a four-digit PIN.

**Where it fits.** The rows come from the frozen sections recorded in the [Intraop Queue](help:intraop-queue): the specimen's arrival, gross, touch prep, frozen section cut and diagnosis. Record the work there; the board follows. Once the case is formally accessioned, the frozen results travel with it into the [report](help:report).

!!! note "Demonstration controls on the board"
    The board has a **Start demo** button. It adds four demonstration frozen sections (named "DEMO" cases, labelled "Demo mode — not real patient data" while running) to the board's location, so a salesperson or trainer can show every state, and then advances one of them every 25 seconds. **Stop demo** stops the advancing and removes the demonstration cases it added, so nothing invented stays in the intraoperative data. Both buttons need the permission "Run the OR Suite demo" (given to administrators by default); without it the button is greyed out, and its tooltip names the permission. Do not use it on a board that staff are relying on: while the demonstration runs, its four DEMO rows sit among the real cases.

## Screen Tour

![The OR Suite display with a header, three in-progress rows and one completed row awaiting dismissal](capture:or-suite-overview)

### Field definitions

**First start (setup).** The first time a screen opens it shows **Bind this display**: "Select which OR Suite Terminal this monitor represents. This binding is sticky — it survives reloads and restarts." Choose a terminal from "— select terminal —", then type the Display Token an administrator issued for that terminal (**Enter Display Token**, **Confirm**, **Back**). If no terminal exists the screen says "No terminals configured yet — add one under System Configuration." If the token is wrong, expired or revoked the screen says so and a revoked or expired display goes blank with **Display unavailable** and **Enter a new token**. The board re-checks its token about once a minute.

**Header**

| Item | What it means |
|---|---|
| OR suite terminal / terminal name | The terminal this screen is bound to. |
| Location line | The terminal's location, for example "OR Suite · Room 3". |
| Connection badge | **Live** (changes from every display appear at once), **Connecting…**, **Reconnecting…**, **Offline** (refreshing every 15 seconds meanwhile) or **Local updates** (no live-update server: this computer's windows update at once, other screens every 15 seconds). Hold the pointer over it for the explanation. |
| Demo mode badge | "Demo mode — not real patient data". Shown only while the demonstration is running. |
| Start demo / Stop demo | Described above. |
| Multi-suite overview | A tick box, shown only if the terminal was given the multi-suite privilege. |

**Multi-suite overview.** When ticked, a list appears of the locations of the terminal's facility ("Point of care — Room"). Select one or more (hold Ctrl or Command to choose several). The board then shows the rows from all the chosen locations instead of its own. With none chosen, it shows its own location.

**Each row (one per specimen).**

| Item | What it means |
|---|---|
| Large label | The OR number, and the location after a dot when it differs. The patient's name and MRN are deliberately not shown on the wall. |
| Small line | "Specimen A · Surgeon: Dr. … · Pathologist: Dr. …". |
| Timer | Minutes and seconds (m:ss) counted up from the time the tissue arrived. It runs while the diagnosis is outstanding and stops at the moment the diagnosis was rendered. |
| Step | **Grossing**, **Touch Prep**, **Sectioning** or **Pathologist Review**, from the latest step logged for the specimen: nothing yet is Grossing; gross logged is Touch Prep; touch prep performed or skipped is Sectioning; frozen section cut is Pathologist Review. |
| Result line | Once a diagnosis is rendered, "PRELIMINARY: <diagnosis>" replaces the step. |
| **In progress** (inactive button) and **Log verbal report** | Shown on a row that has no diagnosis yet. |
| **Dismiss case** | Shown on a row that has a diagnosis. |

**The clock.** The target time and the warning come from your laboratory's turnaround settings for the frozen section, which can differ by facility and between STAT and routine specimens. If none is set, the board uses 20 minutes with a warning for the last 5. The clock counts from the specimen's arrival.

- More than the warning time left: the row is plain.
- Within the warning time: the row shows the warning colour.
- Time is up: the row shows the overdue colour.
- Diagnosis rendered: the row takes its completed look and flashes three times, once only, the moment the diagnosis first appears, whichever device it was entered on.

The board makes no sound. All signals are visual.

### Toolbar

The only buttons on the board are in the header (Start demo, Stop demo, the Multi-suite tick box) and on rows (Log verbal report, Dismiss case). Windows opened from rows are described under Procedures.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Plain row | In progress, inside the target. |
| Warning-coloured row | In progress, in the last minutes before the target (5 by default). |
| Overdue-coloured row | In progress, past the target. |
| Completed row ("PRELIMINARY: …") | The diagnosis was given; the timer is frozen; **Dismiss case** is available. |
| Row sliding out | The case was dismissed; it leaves the board after about 0.4 second. |
| Connection badge | Live / Connecting… / Reconnecting… / Offline / Local updates. |
| "No active frozen section requests right now." | Nothing is on the board for this location. |

**Loading terminal…** appears for a moment when the dashboard opens on a computer that is already set up as an OR terminal, while PathScribe checks that the terminal is still allowed. A computer that has not been set up shows the terminal set-up screen instead.

### Hotkeys

None. The board is operated by touch or mouse and the PIN pad is the keyboard.

### Which specimens appear

A specimen is on the board when its frozen section entry was recorded in the Intraop Queue with the location of this terminal (or one of the locations chosen in the Multi-suite overview), has not been dismissed, and has not been merged into a formal case. Dismissed and merged specimens leave the board. If an entry was recorded without a location, it never appears on any board.

## Step-by-Step Procedures

### Standard workflow

**Setting up the board (administrator or lead)**

1. Ask your administrator to create the OR Suite Terminal and issue its Display Token (Configuration, System).
2. Open the board page on the wall unit. Choose the terminal and type the token. The board starts and stays bound after restarts.

**Watching the board**

1. Look at the timer and the row colour. A warning or overdue row is a frozen section close to or past its target.
2. Read the step. Pathologist Review means the frozen block is cut and waiting for the pathologist.
3. When a row flashes and shows "PRELIMINARY: …", the diagnosis is ready.

**Logging a verbal report**

1. On a row that has no diagnosis yet, select **Log verbal report**. The window **Verify identity** opens: "Enter your 4-digit PIN to log this verbal report."
2. Type your PIN (shown as dots) and select **Continue**. It is accepted for staff holding the OR staff role. If not, you see "PIN not recognized." or "This PIN does not belong to OR staff."
3. The window now reads "Verbal report — <your name>". Check the **Surgeon name** (pre-filled with the surgeon on the case) and add a **Note (optional)**.
4. Select **Log verbal report**. The window closes and the entry is recorded against your name.

**Dismissing a case**

1. When the row shows the preliminary diagnosis and the result has been read back to the surgical team, select **Dismiss case**.
2. In **Verify identity**, type your 4-digit PIN ("Enter your 4-digit PIN to dismiss this case.") and select **Continue**.
3. The window **Confirm dismissal** shows the Case ID (the OR number), the OR room and the Preliminary diagnosis for you to check.
4. Tick **Verbal result read-back confirmed with the surgical team**. **Confirm & dismiss** stays inactive until you do.
5. Select **Confirm & dismiss**. The row slides off the board. The dismissal is recorded with your name, the time the board was held, and the total turnaround.

### Alternative workflow

1. Select **Multi-suite overview** (if the terminal has it) at a central desk to watch several rooms on one screen, then choose the rooms from the list.
2. Cancel at any step: **Cancel** (or **Cancel** on the dismissal windows) closes the window and nothing is recorded. Selecting outside the window also closes it.

### Exception handling

1. **The PIN is refused.** Check you typed four digits. "PIN not recognized." means no one has that PIN. "This PIN does not belong to OR staff." means the PIN belongs to someone without the OR staff role. Ask your administrator to check your PIN and role in the Staff settings.
2. **A specimen is missing from the board.** It was recorded without this terminal's location, was merged into a case, or was already dismissed. Check the entry in the [Intraop Queue](help:intraop-queue).
3. **Dismiss case does not appear.** The diagnosis has not been recorded. The case can be dismissed only after it has one.
4. **A row never changes colour.** The timer is frozen once the diagnosis is rendered; before that it changes colour only when the target time approaches.

### Error recovery

1. "Could not dismiss this case. Try again." The dismissal was refused (for example the diagnosis is missing or the entry changed). Close the window and reopen the dismissal.
1. "The case was dismissed, but the dismissal could not be written to the event log." The row is gone, but the record of who dismissed it, the read-back and the turnaround was not saved. A red message stays at the top of the board until you close it. Tell your supervisor so the dismissal can be recorded by hand.
1. "The demo could not be started" or "The demo cases could not be removed from the board." The demo needs its own permission. If Stop demo cannot remove the cases, ask an administrator to remove them.
2. If the board seems frozen, check the connection badge. When it reads **Offline**, rows refresh every 15 seconds; reload the page if it stays that way.
3. If you dismissed the wrong case, tell the pathologist and the Intraop Queue user. There is no undo on the board.
4. If you logged a verbal report in error, tell your supervisor; the log entry cannot be edited on the board.

!!! warning "Dismiss only after the read-back"
    Dismissing removes the case from the board for everyone. Confirm that the surgeon has heard the result and has read it back before you tick the read-back box. The tick is recorded with your name.

!!! warning "Do not share your PIN"
    The PIN is what attributes a verbal report or a dismissal to you. Anyone who knows it can act as you on the board.

## Tips and Best Practices

### Common mistakes

- Starting the demonstration on a live board. The four DEMO rows sit among the real cases until you select Stop demo.
- Recording the frozen section without a location. The board never shows it.
- Dismissing before the read-back, because the row looks finished.
- Expecting a patient name. Only the OR number and location are shown, on purpose.

### Efficiency recommendations

- Keep the PIN pad within reach: each action needs only the PIN, a tick and one confirmation.
- Use the multi-suite overview at the central desk and single-room boards in each room.

### Workflow recommendations

- Log a verbal report as soon as it is given, not at the end of the case.
- Agree in the department what a warning row means, so the bench knows when to prioritise a frozen section.
- Review the overdue rows after each list to learn where time is lost.

## Related Features

### Upstream workflow

- [Intraop Queue](help:intraop-queue): where the specimen, the steps and the frozen diagnosis are recorded. The board shows what is recorded there.

### Downstream workflow

- [Accession](help:accession): the formal case that the frozen section merges into.
- [Facility Operations Display](help:facility-operations): the other wall display, for bench departments.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "No terminals configured yet" | No OR Suite Terminal has been created. |
| Display blank, "Display unavailable" | The Display Token was revoked or expired. |
| A request is not on the board | Entry has no location, wrong location, merged or dismissed. |
| Timer does not start from the time of the biopsy | It counts from the specimen's recorded arrival time. |
| Row is plain although it feels late | Your laboratory's target is longer than you expect, or the specimen is routine rather than STAT. |
| Rows from the demonstration are on a live board | The demonstration was started. Select Stop demo to remove them. If the demonstration was left running when the page was closed, an administrator can open the board and select Start demo then Stop demo to clear them. |
| Badge says Local updates | No live-update server is connected; other screens refresh every 15 seconds. |

### Resolution steps

1. Check the connection badge.
2. Reload the page. The binding is kept.
3. Check the specimen in the Intraop Queue (location, arrival time, diagnosis).
4. Ask the administrator to check the terminal, the token, and your PIN.

### When to contact support

Contact your laboratory's PathScribe support when a frozen section is missing from the board although it has the right location, when times on the board are wrong, or when a dismissal is refused repeatedly. Have the OR number, the specimen label and the time ready.
