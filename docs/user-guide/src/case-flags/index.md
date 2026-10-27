---
module: Case Flags
workflow: Everyday case handling
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [flags, case flag, specimen flag, STAT, rush, hold, confidential, severity, flag manager, worklist, restricted printing, mdt]
routes: []
previous: personal-settings
next: case-search-bar
related: [report, worklist, search, report/case-team, tumor-board, case-search-bar]
status: Draft
---

# Case Flags {#top}

## Overview

**Purpose.** A flag is a short marker on a case or on one specimen, such as **STAT — Rush Processing**, **Hold — Pending Info** or **Second Opinion Requested**. Flags tell the next person something needs attention. This page shows how to set and clear them, how they look on the Worklist and in search, and what they do.

**Intended users.** Anyone who handles cases. Applying flags needs the "apply flag" permission and clearing them needs the "remove flag" permission. Both are given by default to pathologists, accessioners, histotechnologists and the other case-handling roles, but not to the Admin role.

**Where it fits.** You set flags in the Flag Manager window, which opens from the Report screen, the Cytology Screening screen and the Cytology Worklist. Everyone then sees the flags in the Worklist, the case search bar and Search.

!!! note "Flag for MDT"
    Sending a case to a multidisciplinary meeting is a separate action. See [Case Team](help:report/case-team) and [Tumor Board](help:tumor-board).

## Screen Tour

![The Flag Manager with the case and specimens on the left and the flag catalogue on the right](capture:case-flags-manager-overview)

### Field definitions

**Left side: targets**

| Item | Meaning |
|---|---|
| **Case** | A flag on the whole case. |
| **All Specimens** | The same flag on every specimen. |
| Each specimen | A flag on that specimen only. Its applied flags show as chips with a count. |

You can pick the case, or one or more specimens, but not both. Trying shows "Case and specimens can't be selected together" ("Invalid selection").

**Right side: the catalogue**

| Item | Meaning |
|---|---|
| Search box | Finds a flag by name, code or description. |
| Flag card | Shows a code chip, a severity dot, the name and **+ Apply** (or **Applied**). Only flags your administrator has made active for that level are listed. |
| Severity dot | Red for severity 5 or more, amber for 4, blue for 3, grey below. The tooltip reads "Severity N". |

**Footer**

| Item | Meaning |
|---|---|
| "No changes" / "You have unsaved flag changes" | Whether anything is waiting to be saved. |
| **Cancel** | Closes the window. With changes, asks **Discard changes?** |
| **Save** | Saves ("Saving…"). |

Flags shipped with PathScribe include STAT — Rush Processing, Malignant, Second Opinion Requested, Clinical Correlation, Tumor Board Scheduled, Amended, QC Review, Hold — Pending Info, Discordant, Confidential — Restricted Printing, Intraoperative Consult, Margins Involved, Insufficient Specimen, IHC Panel and Molecular Panel. Your administrator can add or switch off flags in Configuration under System, Flags ("Case & Specimen Flags").

### Toolbar

| Control | Where | What it does |
|---|---|---|
| **Flags** | Report, bottom bar | Opens the Flag Manager (Alt+F). |
| **🚩 Flags** | Cytology Screening | Opens it for that case. |
| **Manage Flags** | Cytology Worklist | Opens it for a row awaiting verification. |
| Undo removal icon | On a struck-through chip | Puts the flag back before saving. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Solid flag icon on a Worklist chip | A flag on the whole case. |
| Dashed flag icon | A flag on a specimen. |
| Struck-through chip | Marked for removal, not yet saved. |
| Grey chips | Every flag chip on the Worklist is the same grey; colour does not tell flags apart. |
| Padlock-style restriction | A flag with "Restricts printing" (Confidential) stops printing by anyone without the "Print a restricted case" permission. |

**Messages in the Flag Manager window**

- "Select a target on the left" appears on the right until you pick the case or a specimen. Underneath it says to choose the case or one or more specimens, then click a flag to apply it.
- "No case flags applied" or "No flags applied" (for a specimen) is shown under a target that has no flag yet.
- "No …-level flags defined" means your administrator has made no flag available at that level (case or specimen). "No flags match …" shows what you typed in the search box when nothing fits.
- A flag that came from the laboratory system shows a padlock instead of the remove cross. Its tooltip reads "Applied by LIS — cannot be removed". Only the laboratory system can take it off.
- **Remove from multiple specimens?** If you remove a flag that is also applied to other specimens, a question says the flag "is also applied to" the others. Choose **Remove from this specimen only**, **Remove from all … specimens** (the count includes this one), or **Cancel**. Nothing is removed until you select **Save**, and every removal is recorded in the audit trail.

### Hotkeys

| Key | Action |
|---|---|
| Alt+F | Open the Flag Manager (on the Report) |
| Alt+S | Apply STAT Flag (on the Report): puts the STAT flag on the open case straight away, with no window; a message at the screen says it was applied |
| Ctrl+Alt+K | Select the case |
| Ctrl+Alt+L | Select all specimens |
| Ctrl+Alt+M | Deselect all |
| Ctrl+Alt+O | Save |
| Ctrl+Alt+Shift+X | Cancel |
| Alt+Shift+R | On the Worklist, read the flags aloud |

Alt+F opens Search on other screens; on the Report it opens the Flag Manager. Use Alt+J then F if the key does not respond.

## Step-by-Step Procedures

### Standard workflow

1. Open the case in the Report.
2. Select **Flags** in the bottom bar. The Flag Manager opens.
3. On the left, select **Case** (or one or more specimens).
4. On the right, type part of the flag name in the search box, then select **+ Apply** on the card. The card shows **Applied** and a chip appears on the left.
5. Select **Save**. The footer shows "Saving…" and then the window closes. Others now see the flag.

### Alternative workflow

1. **Remove a flag.** Select the target, then the remove control on the chip. The chip is struck through. Select **Save**.
2. **Undo before saving.** Select **Undo removal** on the struck-through chip.
3. **Flag every specimen.** Select **All Specimens**, then apply.
4. **Remove from many specimens.** Removing a flag that is on other specimens asks **Remove from multiple specimens?** Choose **Remove from this specimen only**, **Remove from all N specimens** or **Cancel**.
5. **Apply STAT without opening the window.** On the Report, press Alt+S or say "flag stat". The STAT flag is put on the case and a short message confirms it. If the case is already STAT the message says so and nothing changes; the shortcut never removes STAT (use the Flag Manager for that). It needs the same "apply flag" permission, and is recorded in the audit log like a save from the Flag Manager.
6. **Flags from the laboratory system.** Flags sent by the LIS appear after **Check now** in the report header.

### Exception handling

1. **Apply does nothing.** You may lack the "apply flag" permission. The card gives no message. Ask your administrator.
2. **Remove is greyed out.** The tooltip says "You don't have permission to remove flags."
3. **Save failed.** The message reads "Save failed (detail) — nothing was saved. Try again." If only part was saved, the message says so; open the window again and check.
4. **Alt+S says there is no STAT flag.** Your administrator has switched off, or not created, a case-level flag with the LIS code STAT. Ask them to add one under Configuration, System, Flags.
5. **You cannot pick both case and specimens.** Save one level, then reopen.

### Error recovery

1. If you applied the wrong flag and have not saved, select **Cancel** then **Discard changes**.
2. If you saved the wrong flag, open the manager and remove it, then save.
3. If a **Hold** or **Confidential** flag was applied in error, remove it promptly. It can delay work or stop printing.

!!! warning "Flags can hold up or restrict a report"
    A **Confidential — Restricted Printing** flag stops people without permission from printing the case. **Hold — Pending Info** tells colleagues not to proceed. Check the case before saving.

!!! note "Cancel leaves no audit entries"
    Applying or removing a chip in the window changes only what you see. The audit log records each change when you select **Save**, and only the changes that were really saved. Cancelling, or discarding, writes nothing.

## Tips and Best Practices

### Common mistakes

- Flagging the case when only one specimen is affected.
- Assuming a red chip is more important. All Worklist chips are grey.
- Pressing Alt+F on the Worklist expecting the Flag Manager; it opens Search.
- Leaving a STAT flag after the rush has passed.

### Efficiency recommendations

- Use the search box and Ctrl+Alt+K / Ctrl+Alt+O to flag without the mouse.
- Select **All Specimens** instead of applying one by one.

### Workflow recommendations

- Agree in your laboratory what each flag means and who clears it.
- Clear flags when the reason has gone.
- Use flags to prompt, then record the reason in an internal note or message.

## Related Features

### Upstream workflow

- [Accession](help:accession): flags may be applied when a case is received.
- [Report](help:report): where the Flag Manager is opened.

### Downstream workflow

- [Worklist](help:worklist): the **Flag(s)** column shows chips. The column header sorts by number of flags, most first. Voice "sort by priority", "stat" or "urgency" does the same. There is no tile or filter for flags.
- [Search](help:search): has a Flags filter.
- [Case Search Bar](help:case-search-bar): shows up to four case flags on each hit.
- [Case Team](help:report/case-team): Flag for MDT.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| I cannot see a flag I expected in the list | It is switched off, or is not offered at that level. |
| No flags show on a restricted case | Flags are hidden on restricted cases in the Worklist. |
| A flag name stays in English | Names your administrator created are not translated. |
| The chip tooltip reads "Case: name — description" | Normal. |
| Cannot select both case and specimens | By design. |

### Resolution steps

1. Reopen the Flag Manager and check the footer for unsaved changes.
2. Check you have the apply and remove permissions.
3. Reload the Worklist to see the saved flags.

### When to contact support

Contact your laboratory's PathScribe support when a flag you saved does not appear for colleagues, a flag you need is missing from the list, or Save keeps failing. Give the case number and the flag name.
