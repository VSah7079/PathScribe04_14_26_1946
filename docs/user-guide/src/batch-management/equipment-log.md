---
module: Batch Management
screen: Equipment Log
slug: batch-management/equipment-log
workflow: Bench chain of custody
role: [Histotechnologist, Cytotechnologist, Molecular Technologist, Laboratory Manager]
keywords: [equipment log, maintenance, calibration, service log, malfunction, repair, function check, overdue, due soon, instrument]
routes: [/batch-management/equipment-log]
previous: batch-management/wsi-scan
next: batch-management/retention-holds
related: [batch-management, batch-management/engraver-monitor, batch-management/wsi-scan]
status: Draft
---

# Equipment Log {#top}

## Overview

**Purpose.** The Equipment Log shows each active instrument in the laboratory with its maintenance and calibration state, and lets bench staff record what they did: maintenance, calibration, function checks, malfunctions and repairs. The history is a permanent record for inspections.

**Intended users.** Histotechnologists, cytotechnologists and molecular technologists, who can record entries by default, and laboratory managers. Recording an entry needs the "record maintenance" permission. Adding, editing or scheduling equipment is not done here; that is in Configuration, System, Equipment.

**Where it fits.** Instruments such as tissue processors, stainers, slide scanners and engravers appear in the batch workflows and on other screens. An overdue or faulted instrument is flagged but never blocked: the device is marked, and the decision to use it is yours.

## Screen Tour

![The Equipment Log table with service state for each instrument](capture:batch-management-equipment-log-overview)

The page title is **Equipment log**. The subtitle reads: "Each active instrument's maintenance and calibration status. Record what you did with Log entry; adding or changing equipment is in Configuration → System → Equipment."

### Field definitions

**Table**

| Column | What it means |
|---|---|
| Equipment | The instrument's name. |
| Code | Its short code, as other records and labels carry it. |
| Kind | Analyser, Camera, Engraver, Label printer, Scale, Slide scanner, Stainer, Storage unit, Tissue processor or Other. |
| Service | The service state, and below it the next due date ("Next due (date)") or, if passed, "Was due (date)". |
| Actions | The **Log entry** button. |

If no active equipment exists the table says "No equipment matches the current filter."

Rows in a red tint have an alert state: Malfunction or Overdue.

**Service states**

| State | Meaning |
|---|---|
| Up to date | Everything scheduled has been done within its interval. |
| Due soon | Something is due within 14 days. |
| Overdue | A scheduled maintenance or calibration is past due. |
| Not yet done | A schedule exists but nothing passing has ever been logged. |
| Malfunction | A malfunction was logged and no passing repair or function check has been logged on or after that day. |
| Not scheduled | The instrument has no maintenance or calibration interval. |

When several apply, the worst one is shown, in that order: Malfunction, Overdue, Not yet done, Due soon, Up to date. Due dates count from the last passing entry. A Maintenance entry with outcome Not applicable also counts toward maintenance, but not toward calibration.

**Log entry window** (title: "Service Log — (name) ((code))")

| Field | What it means |
|---|---|
| Open malfunction notice | "Open malfunction: no passing repair or function check has been recorded since." Shown when the state is Malfunction. |
| Maintenance, Calibration lines | For each: Up to date, Due soon, Overdue or Not yet done, "Last done (date)" and "Due (date)", or "Not scheduled". |
| Type | Maintenance, Calibration, Function check, Malfunction or Repair. Starts on Maintenance. |
| Date Done | The day it was done. Starts today. It cannot be in the future. |
| Outcome | Pass, Fail or Not applicable. Starts on Pass. |
| Done By | Who did it. Starts with your name. Change it for a service engineer's name. Required. |
| Notes | Free text. Required for a Fail outcome or a Malfunction type. |
| History | A table of earlier entries: Date, Type, Outcome, By and Notes, newest first. |

### Toolbar

| Button | What it does |
|---|---|
| Log entry | Opens the Service Log window for that instrument. Dimmed with a tooltip if you lack the permission. |
| Add Entry | In the window. Saves the entry. The window stays open, the notes box is cleared and the history and state update. |
| Close (x) | Closes the window. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red row | Malfunction or Overdue. |
| Outcome tag | Pass, Fail or Not applicable in the history. |
| "Entries can't be changed or deleted. Correct a mistake with a new entry." | The log is permanent. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Equipment log** tile. The list of instruments appears with their service states.
2. Find the instrument. Check the state and due date in the Service column.
3. Select **Log entry**. The Service Log window opens.
4. Choose the **Type** of work, check the **Date Done**, leave **Outcome** on Pass or change it, and confirm **Done By**.
5. Add **Notes** if you wish, or if you chose Fail or Malfunction.
6. Select **Add Entry**. The entry appears at the top of the history and the instrument's state updates.
7. Select the close mark when you are finished.

### Alternative workflow

1. Record several entries for one instrument in one visit; the window stays open between entries.
2. To close a malfunction, log a Repair or a Function check with Outcome Pass dated on or after the malfunction.

### Exception handling

1. **An instrument is broken.** Log type Malfunction, outcome Fail (or Pass), and describe it in Notes. The instrument turns red with state Malfunction. Tell your laboratory manager; the device is not blocked from use.
2. **A service engineer did the work.** Type their name in Done By.
3. **You forgot to log yesterday's work.** Set Date Done to yesterday. Dates in the future are refused.
4. **A check failed.** Choose Fail and explain in Notes. A failed maintenance or calibration does not count toward being up to date.
5. **The instrument is not listed.** Only active equipment appears. Ask your administrator to add or reactivate it.

### Error recovery

1. "Choose a type." Select a type.
2. "Enter the date it was done." Fill in the date.
3. "The date can't be in the future." Use today or earlier.
4. "Enter who did it." Fill in Done By.
5. "Choose an outcome." Select Pass, Fail or Not applicable.
6. "Describe what happened: required for a failure or malfunction." Add Notes.
7. "The entry could not be saved." Try again; if it persists contact support.
8. A wrong entry was saved. Entries cannot be changed or deleted. Add a new entry that corrects it, with an explanation in Notes.

## Tips and Best Practices

### Common mistakes

- Logging maintenance as Not applicable and thinking calibration is covered. It is not.
- Forgetting that a Fail does not reset the due date.
- Leaving Done By as your own name when an engineer did the work.
- Expecting the page to stop use of a red instrument. It only flags it.

### Efficiency recommendations

- Log entries as you finish the work; the date defaults to today and your name is pre-filled.
- Keep Notes short and specific: what was done, which part, which reagent.

### Workflow recommendations

- Check the board each morning for red rows.
- Close every malfunction with a passing repair or function check.
- Use the history during inspections.

## Related Features

### Upstream workflow

- Configuration, System, Equipment (administrators): adds instruments and sets maintenance and calibration intervals.

### Downstream workflow

- [Slide Scanning](help:batch-management/wsi-scan): scanners are chosen from the same equipment list.
- [Engraver Monitor](help:batch-management/engraver-monitor): live engraver status.
- [Batch Management](help:batch-management): the module page.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Log entry is dimmed | Your role lacks the record maintenance permission. |
| An instrument is missing | It is inactive or not yet added. |
| State is Not yet done on a new instrument | A schedule exists and nothing passing has been logged. |
| State stays Malfunction after a repair | The repair was logged with Fail, or dated before the malfunction. |
| Not scheduled | No interval was set in Configuration. |

### Resolution steps

1. Open the history and read the entries.
2. Add the missing passing entry with the right date.
3. Ask your administrator to set or correct the intervals.

### When to contact support

Contact your laboratory's PathScribe support when entries do not save, or a state does not match the history. Have the instrument code, the date and the message ready.
