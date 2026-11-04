---
module: My Exports
workflow: Reports and exports
role: [Pathologist, Laboratory Manager, QA Reviewer, Administrator]
keywords: [my exports, export, download, csv, report export, preparing, ready, expired, cancel export, export notice, 7 days]
routes: [/my-exports]
previous: home
next: audit-log
related: [audit-log, quality, search, registry-exceptions]
status: Draft
---

# My Exports {#top}

## Overview

**Purpose.** My Exports lists the files you have asked PathScribe to prepare from the screens that offer an export (the audit log, quality reports, case search reports, registry transmission audit and similar). A small export downloads at once. A large one is prepared in the background, so you can carry on working, and then appears here as **Ready** with a **Download** button. You can also cancel one that is still waiting or being prepared.

**Intended users.** Anyone who exports a report. You see only your own exports, and only you can download them. The screen needs no special permission to open; each export's own permission is checked again when you download.

**Where it fits.** You start an export on the screen that offers it. While it is prepared, a notice appears on the screen you are on. Select **My exports** in that notice, or the download arrow in the top bar, to reach this list. Files are kept for 7 days and then deleted.

!!! note "Simulated export server in the demonstration build"
    In the demonstration build there is no export server connected. A banner reads **Simulated**: "No export server is connected, so exports are prepared in this browser and kept only until you sign out." A small export still downloads straight away; a larger one takes about 10 milliseconds per extra row (up to 30 seconds) and appears here. A tick box, **Make exports take longer (to try the waiting experience)**, makes each export take 8 seconds so you can see the Preparing state. This box exists only in the demonstration build.

## Screen Tour

![My exports with a simulated-server note and a table showing one ready export and one being prepared](capture:my-exports-overview)

The page has the title **My exports**, the line "Exports you asked for. Files are kept for 7 days, and only you can download them.", a **Refresh** button, and the table.

### Field definitions

| Column | What it means |
|---|---|
| Export | The export's name, taken from the file name, for example "audit-log-2026-10-23". |
| Status | **Waiting**, **Preparing**, **Ready**, **Failed**, **Cancelled** or **Expired**. For a failed export, the reason is written under the status. |
| Rows | How many rows the file holds, once known. |
| Requested | When you asked for it. |
| Deleted after | When the file will be deleted (7 days after it was made, by default). |
| (actions) | **Download** on a ready export, **Cancel** on a waiting or preparing one. |

Other lines you may see: "Loading your exports…", and "You have no exports from the last 7 days." when the list is empty.

**What an export notice says.** On the screen where you started the export, an inline notice shows "Preparing your export. We'll tell you when it's ready; you can carry on working." and then "Your export is ready (N rows)." with **Download**, **My exports** and **Dismiss** buttons. If it failed it shows the reason with **Dismiss**. A quick export shows no notice at all.

### Toolbar

| Button | What it does |
|---|---|
| Refresh | Reads the list again. |
| Download | Saves the file of a ready export. |
| Cancel | Stops a waiting or preparing export. |
| Make exports take longer (tick box, demonstration only) | Slows simulated exports to 8 seconds. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Waiting | In line behind others. |
| Preparing | Being built now. |
| Ready | The file can be downloaded until the "Deleted after" time. |
| Failed | The file could not be made; the reason is shown. |
| Cancelled | You stopped it. |
| Expired | The 7 days passed and the file was deleted. |
| Number on the top-bar download arrow | How many exports from this window are ready to download. The arrow itself is always shown. |
| **Simulated** tag | The demonstration export server is in use. |

Reasons shown for a failed export or a refused download include: "The export couldn't be made. Try again; if it fails again, tell your administrator.", "The export took too long and was stopped. Narrow the filters and try again.", "Too many rows for one export. Narrow the filters and try again." (with the number of rows that matched, when known), "You already have 3 exports being prepared. Wait for one to finish, or cancel one in My exports.", "You don't have permission to export this report.", "This export has expired and its file was deleted. Export it again.", "This export is no longer available.", "Your session has ended. Sign in again, then export again." and "The PathScribe server can't be reached. Try again in a moment."

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. On the screen that offers an export, set the filters you want and select its export button. If the file is small it downloads at once and nothing else is needed.
2. If it takes longer, an inline notice says "Preparing your export…". Carry on with your work; you do not have to wait.
3. When the notice says "Your export is ready", select **Download** in the notice, or select **My exports** to see the list. In the top bar the download arrow shows a number while exports are ready.
4. On My Exports, find the row with status **Ready** and select **Download**. The file is saved by your browser.
5. Select **Dismiss** on the notice when you have finished with it.

### Alternative workflow

1. Select the download arrow in the top bar at any time to open the list, even if you dismissed the notice.
2. Select **Refresh** to see the latest status if the list seems behind.

### Exception handling

1. **Three exports are already open.** You can have only 3 waiting or preparing exports at a time. Wait for one to finish or select **Cancel** on one you no longer need.
2. **Too many rows.** An export holds at most one million rows. Narrow the filters (a shorter period, one facility) and ask again.
3. **Taking too long.** Exports are stopped after 30 minutes. Narrow the filters and ask again.
4. **A ready file has expired.** Ask for it again from the original screen.

### Error recovery

1. If **Download** shows an error under the row, read it. "You don't have permission to export this report" means your role no longer holds that export permission; ask your administrator.
2. If you were signed out, sign in and ask for the export again; a list left from before is not kept.
3. If **Cancel** was selected by mistake, ask for the export again from the original screen.
4. A repeated request while the first is still running sends nothing new, so selecting the export button twice does not create two files.

!!! warning "Exports can contain patient information"
    A downloaded file is no longer protected by PathScribe. Save it only where your laboratory's policy allows, and delete it when done. Files in this list are deleted after 7 days, but a file already saved to your computer is not.

## Tips and Best Practices

### Common mistakes

- Waiting on the page. You can carry on working; the notice tells you when it is ready.
- Starting the same export repeatedly. Use the existing row instead.
- Expecting a colleague to see your exports. The list is yours alone.

### Efficiency recommendations

- Use narrow filters so exports are small and download at once.
- Watch the number on the top-bar download arrow instead of opening the list.

### Workflow recommendations

- Download the file the same day, long before the 7 days are up.
- For recurring reports, note the filters you used so you can repeat them.

## Related Features

### Upstream workflow

- [Audit Log](help:audit-log), [Quality](help:quality) and [Search](help:search): examples of screens that start exports.
- [Registry Exceptions](help:registry-exceptions): its transmission audit download goes through the same list.

### Downstream workflow

- None. The downloaded file is used outside PathScribe.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "You have no exports from the last 7 days." | Nothing was exported, or the exports were small and downloaded at once. |
| The export I just asked for is not here | It downloaded straight away because it was small, or the list needs **Refresh**. |
| Status stays Waiting | Other exports are ahead of it. |
| Download is refused | The permission was withdrawn, or the file expired. |
| The top bar download arrow has no number | No export from this window is ready to download. The arrow itself is always shown. |

### Resolution steps

1. Select **Refresh**.
2. Read the reason shown under the row.
3. Narrow the filters and ask again.
4. Sign out and in again if you see the "session has ended" message.

### When to contact support

Contact your laboratory's PathScribe support when an export fails again after you narrow the filters, when a ready export will not download, or when exports stay Waiting for a long time. Have the export name and the time you asked for it ready.
