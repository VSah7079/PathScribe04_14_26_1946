---
module: Batch Management
screen: Slide Scanning
slug: batch-management/wsi-scan
workflow: Digital pathology hand-off
role: [Histotechnologist, Cytotechnologist, Molecular Technologist, Laboratory Manager]
keywords: [slide scanning, whole slide imaging, WSI, scan batch, slide scanner, load, send to scanner, unload, scanning queue, digital pathology, image QC]
routes: [/batch-management/wsi-scan]
previous: batch-management/engraver-monitor
next: batch-management/equipment-log
related: [workstations/slide-distribution, wsi-viewer, batch-management, batch-management/equipment-log]
status: Draft
---

# Slide Scanning {#top}

## Overview

**Purpose.** Slide Scanning is the bench hand-off to the slide scanners. Slides that were routed to Digital wait in a scanning queue. You choose a scanner, tick the slides to put on it and load them as a scan batch. You then send the batch to the scanner and, when every slide has a result, unload it. Slides that scanned and passed image quality check are marked Scanned. The rest go back to the queue.

**Intended users.** Histotechnologists, cytotechnologists and molecular technologists, and laboratory managers. Loading, sending and unloading are separate permissions, checked against the scanner's laboratory. Administrators can open the screen but do not have those permissions unless they are added to their role.

**Where it fits.** The [Slide Distribution](help:workstations/slide-distribution) workstation decides where each slide goes: to a pathologist's desk, or Digital. A slide routed to Digital appears here. After scanning, images can be opened in the [WSI viewer](help:wsi-viewer).

!!! note "Demonstration data today"
    Scanner traffic goes through the interface engine. In this version the scanner is simulated, so sending a batch does not drive a real machine, and the progress of the slides comes from the demonstration. The scanners listed come from the Equipment register.

## Screen Tour

![The Slide Scanning screen with the scanning queue and the scan batches table](capture:batch-management-wsi-scan-overview)

The page title is **Slide scanning**. The subtitle reads: "Load slides from the scanning queue onto a slide scanner, send the batch to the scanner, and unload it when every slide has its result. Slides that didn't scan go back to the queue."

The screen has two parts: the scanning queue with a load bar, and the scan batches table.

### Field definitions

**Scanning queue**

| Field | What it means |
|---|---|
| Scanning queue (n slides) | The slides routed to Digital and not yet in a scan batch. STAT cases come first, then Rush, then the rest, oldest first. |
| Slide scanner | The scanner to load. The list holds the active slide scanners in the Equipment register ("— Select a scanner —"). |
| Choose (tick box) | One tick box per slide. Its label reads "Choose (block) (stain)". |
| Case | The case accession number. |
| Slide | The block and the stain, for example "A1 · H&E". |
| Priority | The case priority, or a dash. |
| Routed to | The scanner that Slide Distribution assigned, shown by name. |
| Rack / slot | The rack and slot recorded at distribution, or a dash. |

If no scanners exist: "No slide scanners are set up. Add them in Configuration → Equipment (kind "Slide scanner")." If the queue is empty: "No slides are waiting. Slides routed to Digital at the Slide Distribution Station appear here."

**Scan batches**

| Column | What it means |
|---|---|
| Batch | The scan batch barcode with an arrow. Select it to open or close the list of its slides. |
| Scanner | The scanner's name. |
| Status | Loaded, not sent; Scanning; Scanned, ready to unload; Finished with failures, ready to unload; or Unloaded. A failed send adds "Not sent ((code), (time))" in red. |
| Progress | "(n) scanned · (n) failed · (n) waiting (of (total))". |
| Loaded | When the batch was loaded. Newest batches first. |
| Actions | **Send to scanner** or **Send again**, and **Unload**. |

When a batch is opened, each slide row shows its position, the case, the slide, its status (Waiting, Scanning, Scanned or Scan failed), the failure reason if any ("Image QC failed: (reason)") and when the scan finished. If no batch exists: "No scan batches yet."

### Toolbar

| Control | What it does |
|---|---|
| Live status badge | Shows whether the page is receiving changes by itself. The batch list updates without reloading when a scanner reports. |
| Refresh | Reads the queue, batches and scanners again. Reads "Refreshing..." meanwhile. |
| Load (n) slide(s) | Loads the ticked slides onto the chosen scanner as a new scan batch. Greyed out until a scanner is chosen and at least one slide is ticked (tooltip: "Choose a scanner and at least one slide"). Dimmed if you lack the load permission. |
| Send to scanner / Send again | Sends the batch's manifest to the scanner. Shown for a batch that is Loaded, not sent. "Send again" appears after a failed send. |
| Unload | Takes the batch off the scanner. Shown for a Loaded, not sent batch, and for a batch where every slide has a result. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Green message | "(n) slide(s) loaded on (scanner)." "(batch) sent to the scanner." "(batch) unloaded." |
| Red message | A refusal. See Error recovery. |
| Status text | The batch's state, as listed above. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Slide scanning** tile. The queue and the batches load.
2. In **Slide scanner**, choose the scanner you are loading.
3. Tick the slides you have placed on that scanner. The button now reads "Load (n) slides".
4. Select **Load**. The message "(n) slides loaded on (scanner)." appears, the slides leave the queue and a new batch appears in the table as "Loaded, not sent". Where Slide Distribution recorded a rack and slot, that position is used; otherwise positions are numbered in the order you ticked.
5. Select **Send to scanner** on the new batch. The message "(batch) sent to the scanner." appears and the status becomes Scanning.
6. Watch the progress column. When every slide has a result, the status changes to Scanned or Finished with failures and **Unload** appears.
7. Select **Unload**. The message "(batch) unloaded." appears. Slides that scanned and passed image quality check are marked Scanned. Others return to the scanning queue.

### Alternative workflow

1. **Check a batch's slides.** Select the batch name to expand it and read each slide's status and any failure reason.
2. **Cancel a load.** Before sending, select **Unload** on a Loaded, not sent batch. Every slide returns to the queue.
3. **Rely on live updates.** With the Live badge on, leave the page open; it refreshes when the scanner reports.

### Exception handling

1. **A send fails.** The batch stays loaded. The status shows "Not sent ((code), (time))" and the button reads **Send again**. Wait until the interface engine is reachable and try again.
2. **A slide fails or fails image QC.** It is marked Scan failed or "Image QC failed", with a reason. After you unload, it returns to the scanning queue. Re-clean the slide if needed and load it again.
3. **A slide was picked by someone else.** "A chosen slide is no longer in the scanning queue. Refresh and try again."
4. **You cannot unload.** Slides are still scanning. Wait until every slide has a result.
5. **A scanner is missing from the list.** It is inactive or is not of kind Slide scanner in the Equipment register. Ask your administrator.

### Error recovery

1. "Choose a slide scanner." Pick a scanner.
2. "Choose at least one slide." Tick a slide.
3. "That scanner isn't an active slide scanner in the Equipment register."
4. "You don't have permission to do this for this scanner's lab." Ask your laboratory manager.
5. "The interface engine didn't accept the batch. It stays loaded; send it again when the engine is reachable."
6. "Slides are still scanning. Unload when every slide has its result."
7. "This batch has already been sent." Someone else sent it; refresh.
8. "That scan batch no longer exists." Refresh.
9. "That couldn't be saved. Try again."

## Tips and Best Practices

### Common mistakes

- Loading slides in PathScribe that you did not put on the scanner. Load only what is physically on the machine.
- Choosing the wrong scanner in the list.
- Unloading before the scanner is finished and then wondering why slides came back.
- Ignoring the red "Not sent" note.

### Efficiency recommendations

- Tick slides in the order they sit in the rack when no rack and slot were recorded.
- Leave the page open with the Live badge on.

### Workflow recommendations

- Load STAT slides first; they are listed first.
- Check failed slides on the batch's expanded list before the next load.
- Log scanner maintenance in the [Equipment Log](help:batch-management/equipment-log).

## Related Features

### Upstream workflow

- [Slide Distribution](help:workstations/slide-distribution): routes slides to Digital.
- [Equipment Log](help:batch-management/equipment-log): the scanner's service state.

### Downstream workflow

- [WSI Viewer](help:wsi-viewer): opening scanned images.
- [Batch Management](help:batch-management): the module page.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The queue is empty | No slides are routed to Digital, or they are already in a batch. |
| The scanner list is empty | No active slide scanner in the Equipment register. |
| Load is greyed out | No scanner chosen or no slide ticked. |
| Load, Send or Unload is dimmed | Missing permission for that scanner's lab. |
| A batch stays on Scanning | The scanner has not reported all slides. |
| Slides keep returning to the queue | They fail the scan or the image quality check. |

### Resolution steps

1. Select **Refresh**.
2. Open the batch and read each slide's status.
3. Send again if the send failed.
4. Check the scanner's state in the Equipment Log.

### When to contact support

Contact your laboratory's PathScribe support when sends fail repeatedly, or a batch never receives results. Have the batch barcode, the scanner name and the time ready.
