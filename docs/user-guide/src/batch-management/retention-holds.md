---
module: Batch Management
screen: Retention Holds
slug: batch-management/retention-holds
workflow: Retention and disposal
role: [Histotechnologist, Laboratory Manager, Pathologist]
keywords: [retention hold, litigation hold, research hold, patient requested retention, release hold, hold queue, block disposal, export holds]
routes: [/batch-management/retention-holds]
previous: batch-management/equipment-log
next: batch-management/disposal
related: [batch-management/disposal, batch-management/disposal-report, report]
status: Draft
---

# Retention Holds {#top}

## Overview

**Purpose.** A retention hold stops a case's material from ever being offered for disposal, whatever its retention period. The Retention Holds screen lists every active hold across the laboratory, with the case, the reason, who placed it and when, so that someone can see what is being held back and let it go when it is no longer needed.

**Intended users.** Laboratory managers and bench staff who manage stored material. Releasing a hold needs its own permission (Release a retention hold), checked for the case's facility. Exporting the list needs another. Placing a hold is done on the case itself, not here.

**Where it fits.** A hold is placed from the case, in the Specimens & Reports section of the [report](help:report) screen ("Retention Hold: Blocks disposal until released"), for reasons such as a patient request, litigation or research. While a hold is active the case's material never appears in the [Disposal Queue](help:batch-management/disposal), and a scan to dispose is refused with the hold's note. Releasing the hold here returns the material to normal retention rules.

## Screen Tour

![The Retention Holds list with search, count and Release buttons](capture:batch-management-retention-holds-overview)

The page title is **Retention Holds**. The subtitle reads: "Cases whose material is held back from disposal. Release a hold with a note when it is no longer needed." While the list is loading you see "Loading holds...".

### Field definitions

| Column or control | What it means |
|---|---|
| Search case, reason or person | Filters the list as you type. It matches the accession number, the reason, the name of the person who placed the hold and the note. |
| Count | "(n) active hold(s)" for the rows currently shown. |
| Case | The case accession number. |
| Reason | Patient Requested Retention / Return, Litigation Hold, Research Hold or Other. |
| Note | The explanation typed when the hold was placed, or a dash. It can name people, so treat it as sensitive. |
| Placed by | The name of the person who placed it. |
| Placed | The date and time, in your language's format. The list is ordered oldest first. |
| Actions | The **Release** button. |

Only active holds are listed. A released hold disappears. If there are none, the screen says "No active retention holds."

**Release retention hold window**

| Field | What it means |
|---|---|
| Title line | The case number and the reason of the hold you are releasing. |
| Release note | Required. Why the hold is no longer needed, for example "Patient confirmed no further need for specimen return." |

### Toolbar

| Button | What it does |
|---|---|
| Export CSV | Downloads the rows currently shown as a spreadsheet with Case, Reason, Placed by and Placed at. The note is left out on purpose because it can name people. Greyed out when there are no rows; dimmed with a tooltip if you lack the export permission. |
| Release | Opens the Release retention hold window for that row. Dimmed with a tooltip if you may not release holds for that case's facility. |
| Release hold | In the window. Confirms the release. Greyed out until a release note is typed. |
| Cancel | Closes the window without releasing. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| "Hold released." | The hold was released and the list refreshed. |
| "Add a release note first." | The note was empty. |
| "This hold was already released." | A colleague released it first. |
| "This case could not be found." | The case is no longer available. |
| "You don't have permission to release this hold." | Your role lacks the permission for that facility. |
| "The hold could not be released. Try again." | Any other failure. |
| "You don't have permission to export this queue." | The export was refused. |

### Hotkeys

None on this screen.

## Step-by-Step Procedures

### Standard workflow

**Review the holds**

1. Open **Batch Management** and select the **Retention Holds** tile. The list loads.
2. Read the count. Type in the search box to find a case, reason or person.
3. Read each hold's reason and note to decide whether it is still needed.

**Release a hold**

1. Find the row and select **Release**. The Release retention hold window opens.
2. Type the **Release note**.
3. Select **Release hold**. The message "Hold released." appears, the window closes and the row leaves the list.
4. The case's material may now appear in the Disposal Queue, once its retention period has ended.

### Alternative workflow

1. **Export for a review meeting.** Search to narrow the list if you want, then select **Export CSV**.
2. **Place a hold.** Open the case in the report screen and use its Retention Hold control. This screen cannot create holds.

### Exception handling

1. **The Release button is dimmed.** You do not have the release permission for that case's facility. Ask a manager.
2. **A hold was released by mistake.** Releasing cannot be reversed here. Place a new hold from the case, with a note explaining.
3. **Someone else released it first.** The message says it was already released. Reload the page.
4. **The note is missing.** Releasing requires a note; the button stays greyed out until you type one.

### Error recovery

1. "This case could not be found." The case may be archived. Contact support.
2. "The hold could not be released. Try again." Wait a moment and try again. If it keeps failing, note the case number and contact support.
3. The list is out of date. Reload the page.

!!! warning "Release only with authority"
    Releasing a hold re-opens the way to disposal of irreplaceable material. Check with the person or department that asked for the hold (the patient, legal counsel, the research team) before releasing it, and record that in the note.

## Tips and Best Practices

### Common mistakes

- Releasing a hold without checking with the requester.
- Writing a vague release note such as "done". Say who agreed and when.
- Looking for a way to place a hold here. Place it on the case.
- Emailing the exported file without thinking: it names cases and people who placed holds.

### Efficiency recommendations

- Search by reason to review all litigation holds together.
- Review the list on a schedule so old holds are not forgotten.

### Workflow recommendations

- Review holds before each disposal run.
- Put clear notes in when you place holds so a reviewer can decide later.

## Related Features

### Upstream workflow

- [Report](help:report): where a hold is placed on a case.

### Downstream workflow

- [Disposal Queue](help:batch-management/disposal): where released material may become eligible.
- [Waste Tracking Report](help:batch-management/disposal-report): the record of disposal.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The list is empty | There are no active holds. |
| A case I held does not appear | The hold was already released, or it was never saved. Open the case and check. |
| Release is dimmed | You lack the permission for that facility. |
| Export CSV is dimmed | You lack the export permission, or there are no rows. |
| The note is missing from the export | By design. |

### Resolution steps

1. Reload the page.
2. Search for the case number.
3. Open the case in the report screen to see its hold history.
4. Ask your laboratory manager about permissions.

### When to contact support

Contact your laboratory's PathScribe support when a hold you placed is not listed, or a release fails repeatedly. Have the case number and the time ready.
