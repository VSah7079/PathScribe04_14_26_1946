---
module: Facility Operations
workflow: Laboratory operations
role: [Histotechnologist, Laboratory Manager, Accessioner, Administrator]
keywords: [facility operations, wall display, bench display, dashboard, grossing, intake, embedding, microtome, staining, IHC, send-out, reference laboratory, scanner, carousel, display profile, display token, offline, stale data, STAT, cold chain]
routes: [/facility-ops-dashboard]
previous: pathology-workspace
next: or-suite
related: [batch-management, batch-management/pending-load, batch-management/wsi-scan, intraop-queue]
status: Draft
---

# Facility Operations Display {#top}

## Overview

**Purpose.** The Facility Operations display is a wall screen for a laboratory bench or room. It shows, in large high-contrast type, what is waiting and what is late in one department: Grossing and Intake, Embedding and Microtome, Staining and IHC, Send-Out and Reference Laboratory, or Diagnostic Sign-Out and Scanner. A display can rotate through several of these views by itself.

**Intended users.** Everyone who works in or walks past the area. The screen is read-only for the people watching. It has nothing to click once it is running. An administrator sets it up once.

**Where it fits.** The numbers come from the same batches, cases and scan runs that staff work in [Batch Management](help:batch-management), the Pathology Workspace and the other bench screens. Nothing is entered here. The display does not use anyone's sign-in, so it carries no patient names or MRNs: only batch barcodes, accession numbers and counts.

!!! note "What the display needs"
    A display is bound to a **Display Profile** (which facility, which views, how fast they rotate) and needs a **Display Token** that an administrator issued for it. Without them it cannot start. Display Profiles and tokens are set up in Configuration, System, Display Profiles (see the Administrator Guide). A profile can also show only carriers of chosen purposes (for example Routine only, leaving Research and Teaching carriers off the wall); add-on orders always show. The administrator's page has an **Open Facility Ops Dashboard** button; a bench screen can also simply be pointed at the page address.

!!! note "Demonstration data today"
    In the demonstration build the figures come from the demonstration batches, cases, referrals and scan runs held in the browser. The "Offline / Stale Data" badge reports on the screen's own refresh, not on any real instrument. The check on the Display Token is made in the browser; the server-side check (refusing a revoked token on the server) is planned and not built.

## Screen Tour

![A Facility Operations display showing the Staining and IHC view with stat tiles, alerts and the batch queue](capture:facility-operations-overview)

### Field definitions

**First start (setup).** The first time a display opens, it shows **Bind This Display** with the line "Select the Display Profile this wall unit should show." and a list headed "— select display profile —". After you choose one, **Enter Display Token** asks for the token ("Enter the Display Token an administrator issued for "<name>" to start this display.") with **Back** and **Confirm**. If no profile has been set up the screen says "No display profiles are configured yet. Add one under Config → System → Display Profiles."

If the token is wrong, expired or revoked, the display says so ("That Display Token is not valid for this display. Check it and try again.", "This display's token has expired. Ask an administrator to issue a new one.", "This display's token has been revoked. Ask an administrator to issue a new one.", or "No Display Token has been issued for this display. Ask an administrator."). A display that loses its token goes blank with **Display unavailable** and a button **Enter a new token**. The display checks its token again about every minute while it is running, so a revoked token blanks the screen within a minute.

**Header.** The profile name, the title of the view being shown, the facility name, a live clock, a status note and, when the profile has more than one view, a row of dots marking which view is on screen.

| Item | What it means |
|---|---|
| Profile name (small, top) | The display profile this unit is bound to. |
| View title | One of the five views. |
| Clock | The time on this unit, in your language's format. |
| "Updated hh:mm:ss" | When the figures last refreshed successfully. |
| **Offline / Stale Data** | The last refresh failed or the data is older than expected (see "Icons and status indicators"). |
| Dots | The views in the profile; the filled one is on screen. |

**Stat tiles.** A row of large numbers. A tile turns amber (warning) or red (overdue) when its state says so.

**Alerts.** Rows under the tiles, each with a short kind label, a title and a detail. Critical alerts and warnings are styled differently.

**Queue.** The list of items in the department, oldest first. Each row shows a label and detail, a **STAT** tag for urgent items, and on the right either a countdown or an age ("2h 10m ago"). "Nothing in queue right now." shows when the list is empty. A countdown row is tinted amber when 30 minutes or fewer remain and red once overdue ("Overdue 1h 5m").

### The six views, and how the numbers are worked out

All views are filtered to the profile's facility. A batch belongs to a facility through its case's accession number or the workstation it was made on.

**Grossing and Intake**

| Tile or list | Meaning |
|---|---|
| Pending Intake | Specimens or materials in the pending load queue, awaiting intake. Red if any is STAT. |
| STAT Pending | Pending items whose case is STAT. |
| Decal / Special Processing | Active batches at the decalcification or special processing step. |
| Processing Batches | Active batches at the Processing step. |
| Alerts | One critical **STAT** alert per pending STAT specimen, and a critical **Decal Overdue** alert per overdue decalcification batch. |
| Queue | Active batches at decal, processing or checkout, oldest first. A decalcification batch with a target time counts down; others show their age. |

**Embedding and Microtome**

| Tile | Meaning |
|---|---|
| Embedding Batches | Active batches at the Embedding step. |
| Microtome Batches | Active batches at the Microtome / Sectioning step. |
| STAT Batches | Active batches marked STAT (red when any). |
| Cassettes/Slides In Process | Total items in those batches. |
| Add-Ons waiting | Add-on orders waiting at the microtome (Batch 726/727): every add-on slide still Pending Cut, whether or not it is in a carrier. Amber when one is close to the profile's time limit X, red when one is past it. |
| Alerts and queue | A critical **STAT** alert for each STAT batch and each STAT add-on. The queue lists batches and add-ons together by age, oldest first. Each add-on row shows the accession number with an **ADD-ON** tag (next to the STAT tag when it is STAT), the order type beneath it (Recut / levels, Special stain, IHC, Send-out sections, Molecular sections), the block and stain, and a countdown to X. An add-on that is STAT or past X is **Pinned** to the top; the others keep their place by age. |

**Staining and IHC**

| Tile | Meaning |
|---|---|
| Active Staining Batches / Cytology Staining Batches | Active batches at those two steps. |
| Slides In Staining | Stains whose status is Staining. |
| Ready for Review | Stains whose status is Ready for Review. |
| Recut Requested | Stains with a recut requested (amber when any). |
| QC Failed | Stains whose QC failed (red when any). |
| Alerts | Critical **QC Failed** and warning **Recut Requested** alerts with the accession number, block and stain name; critical **STAT** alerts for STAT batches. |

**Send-Out and Reference Laboratory**

| Tile | Meaning |
|---|---|
| Dispatched / In Transit / Delivered / Results Received | Referral batches by tracked transit status. A batch with no tracking record is not counted in any of these. |
| Cold-Chain Excursions | Referral batches with a temperature excursion that nobody has acknowledged (red when any). |
| Alerts | Critical **Cold-Chain Excursion** (temperature and time) and **STAT** alerts. |
| Queue | Referral batches (any not aborted), showing destination, test requested and transit status. |

**Diagnostic Sign-Out and Scanner**

| Tile | Meaning |
|---|---|
| Pending / Scanning / Completed | Slides in slide-scanner runs that are not yet unloaded, by scan status. |
| Scan Failed | Slides whose scan failed (red when any). |
| Image QC Failed | Completed slides whose image quality check failed (amber when any). |
| Alerts | Critical **Scan Failed** and warning **Scan QC Failed**, with the slide position and the reason. |
| Queue | Scanner runs, by time since loading. |

**Stations** (Batch 727)

The live minimum set: what is waiting at each step, across the lab.

| Tile or list | Meaning |
|---|---|
| STAT waiting | Open STAT carriers plus STAT add-ons waiting (red when any). |
| Past the time limit | Open carriers older than the profile's time limit X, plus add-ons past X (red when any). |
| Add-Ons waiting | As on Embedding and Microtome. |
| Missing or unexpected | Items still missing or scanned unexpectedly in carriers being reconciled (amber when any). |
| Cold-chain excursions | Carriers with a temperature excursion nobody has acknowledged (red when any). |
| Instrument runs failed | Staining runs the stainer reported as failed (red when any). |
| Not scanned recently | Cassettes, blocks and slides not scanned at any station for longer than the profile's not-scanned time (240 minutes unless set), leaving out finished items (a block completed at the Microtome, a slide sent on at Slide Distribution). Amber when any. Batch 729. |
| Alerts | **Reconciliation** (missing and unexpected counts), **Cold-Chain Excursion**, **Run Failed**, **Decal Overdue** and, for up to ten of the longest, **Not scanned** ("Last scanned at …, … ago"). |
| A step's row | Carriers and items waiting there; from Batch 729 also the items there without a carrier ("without a carrier: …"), so work moved by hand is counted. A step with only such items gets a row too. |
| Queue | One row per processing step that has open carriers: the number of carriers and items, and the age of the oldest. Red when the oldest is past X. |

### Toolbar

None. The running display has no buttons.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Amber tile or row | Warning: for a countdown, 30 minutes or fewer remain. |
| Red tile or row | Overdue, failed or critical. |
| **STAT** tag | An urgent item. |
| **Offline / Stale Data** | The last refresh failed, or no refresh has succeeded for more than two minutes while live updates are on (or about 40 seconds without them). Treat the figures on screen as out of date. |
| "Updated hh:mm:ss" | The figures are current. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

**Starting a display (for the person setting up the unit)**

1. Make sure an administrator has created a Display Profile and issued a Display Token for it, and given you the token. The token is shown once, when issued.
2. Open the page on the wall unit. It shows **Bind This Display**.
3. Choose the profile from the list. The **Enter Display Token** screen opens.
4. Type the token (it begins "psd_") and select **Confirm**. The display starts on the first view and refreshes by itself.
5. Leave it running. The unit remembers its profile and token, so it comes back after a restart.

**Reading the display**

1. Look at the view title and the stat tiles first. Red tiles need action.
2. Read the alerts, then the queue from the top, which is the oldest item.
3. If the display has several views, wait for the next one: the dots show how many there are. With one view it stays on that view.

### Alternative workflow

1. Run one display per department with a single-view profile, so the numbers stay on screen at all times.
2. Run a shared display with several views. Each view shows for the rotation time set in the profile (20 seconds if none is set; never faster than 5 seconds).

### Exception handling

1. **The display shows Offline / Stale Data.** Check the network on the unit. The screen keeps trying and clears the badge once a refresh succeeds. Until then, check the bench screens, not the wall.
2. **The display went blank with "Display unavailable".** The token was revoked, has expired, or is no longer valid. Select **Enter a new token** and type the new token an administrator issues.
3. **An item you expect is missing.** The view lists only items for the profile's facility, in the steps that view covers. A batch belongs to another step, or its case belongs to another facility.

### Error recovery

1. "That Display Token is not valid for this display. Check it and try again." Re-type the token carefully. It was shown only once; if you lost it, ask the administrator to issue a new one (which stops the old one at once).
2. If you chose the wrong profile, select **Back** on the token screen and choose another.
3. If the display shows the wrong facility or views, ask an administrator to change the Display Profile. The display does not offer a way to change it from the wall.

!!! warning "Treat the wall as out of date when the stale badge shows"
    The display is a convenience, not the system of record. A STAT specimen or a cold-chain excursion that is not on the wall may still exist. When "Offline / Stale Data" is showing, check the working screens.

## Tips and Best Practices

### Common mistakes

- Reading the Send-Out transit tiles as a total. A referral batch with no tracking record is in the queue but not in any tile.
- Assuming a quiet wall means nothing is wrong. Look for the stale badge first.
- Leaving a unit bound to the wrong profile after moving it to another room.

### Efficiency recommendations

- Put the screen where the department can see it without leaving the bench.
- Use a single-view profile for the busiest area and a rotating one for common areas.

### Workflow recommendations

- Agree what a red tile means for your team (who acts and how fast), and use the display as the prompt.
- Review the display at shift handover.

## Related Features

### Upstream workflow

- [Batch Management](help:batch-management): where batches are created and moved from step to step.
- [Pending Load](help:batch-management/pending-load): the queue behind the Pending Intake tile.
- [WSI Scan](help:batch-management/wsi-scan): the scanner runs behind the Diagnostic Sign-Out view.

### Downstream workflow

- [OR Suite Display](help:or-suite): the other wall display, for frozen sections in the operating room.
- [Pathology Workspace](help:pathology-workspace): the bench screens that act on what the display shows.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "No display profiles are configured yet." | An administrator has not created one. |
| Display blank with "Display unavailable" | Token revoked, expired or never issued. |
| Offline / Stale Data | The unit cannot refresh. |
| All tiles show 0 | No active items in the department for that facility, or the facility on the profile is wrong. |
| The view does not rotate | The profile has only one view. |
| Tile labels are in English on a translated unit | The stat tile labels and alert labels are fixed English text; the surrounding messages follow your language. |

### Resolution steps

1. Check the network on the unit and wait one refresh (about 20 seconds).
2. Reload the page. The unit keeps its binding.
3. Ask an administrator to check the profile's facility and views, and to issue a new token if needed.

### When to contact support

Contact your laboratory's PathScribe support when a display stays on Offline / Stale Data after the network is confirmed, when a token is refused although an administrator has just issued it, or when the numbers on the wall disagree with the bench screens. Have the profile name, the view and the time ready.
