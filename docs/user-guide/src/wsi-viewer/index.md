---
module: Slide Images
slug: wsi-viewer
workflow: Case Review
role: [Pathologist, Cytotechnologist, Laboratory Manager]
keywords: [slide image, reference preview, thumbnail, whole slide image, wsi, digital slide, open slide, digital pathology application, slide viewer, save position, window position, image quality, scanning, queued, wsi viewer, demonstration viewer]
routes: [/wsi-viewer, /window-position]
previous: batch-management/wsi-scan
next: report
related: [batch-management/wsi-scan, workstations/slide-distribution, report, cytology/screening-case, demonstration-tools]
status: Draft
---

# Slide Images {#top}

## Overview

**Purpose.** PathScribe has no slide viewer of its own. For a slide that has been scanned it shows a small **reference preview**: the picture your laboratory's scanner or image system made of the slide, shown as it arrived. Selecting the preview opens the slide in your laboratory's own digital pathology application, in a separate window that remembers where you put it. A slide without an image says where it is instead: **No image yet**, **Queued**, **Scanning**, **Scan failed** or **Failed image quality**.

**Intended users.** Pathologists in the block and stain window of a case, cytotechnologists screening cytology slides scanned as whole-slide images, and anyone who sets up a workstation.

**Where it fits.** Slides go from the [Slide Distribution Station](help:workstations/slide-distribution) to the scanner through [WSI Scan](help:batch-management/wsi-scan). Once a slide is scanned, its preview appears beside it; the slide itself is read in your laboratory's digital pathology application, which has its own sign-in.

!!! warning "Reference preview. Not for diagnosis."
    Every preview carries this note. The preview is a small picture for recognising the slide. PathScribe does not change it in any way: no cropping, sharpening or analysis. Read the slide in your laboratory's digital pathology application.

## Screen Tour

![A slide in the block and stain window with its reference preview and the note Reference preview. Not for diagnosis.](capture:wsi-viewer-overview)

The preview sits beside each slide in the block and stain window of the [report](help:report) (select **Edit** in a block row), and on the bar of the [Cytology Screening Case](help:cytology/screening-case) when the case is screened on whole-slide images. While PathScribe looks up the slide it shows "Loading slide image…".

### Field definitions

| Field | What it means |
|---|---|
| Reference preview | The small picture of the slide from the scanner or image system. Its description for screen readers reads "Reference preview of slide" and the slide's identifier. Select it to open the slide. |
| Reference preview. Not for diagnosis. | The note shown beside every preview. |
| Open slide | Shown instead of a picture when the slide is scanned but no preview picture is available. Opens the slide. |
| No image yet | The slide has not gone to a scanner. |
| Queued | The slide is in the scanning queue. |
| Scanning | The slide is loaded on a scanner. |
| Scan failed | The scanner could not scan the slide; it is back in the scanning queue. |
| Failed image quality | The slide was scanned but the image failed the quality check; it is back in the scanning queue. The preview is still shown, so you can see the problem, and you can still open the slide. |

### Toolbar

None. The preview is the only control.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Grey label | The slide's image state (No image yet, Queued, Scanning). |
| Amber label | Scan failed, or Failed image quality. |
| Red message | The slide could not be opened. The message says why (see Error recovery). |

### Hotkeys

None of its own. Tab moves to the preview; Enter or Space opens the slide. F1 opens this help article.

## Step-by-Step Procedures

### Standard workflow

1. Open the case in the [report](help:report) screen and select **Edit** in the block row. The block and stain window lists the slides on each block, each with its preview or image state.
2. Find the slide by its identifier (for example S26-5404-B1-L1) and its preview.
3. Select the preview. Your laboratory's digital pathology application opens in its own window on that slide. Sign in to it if it asks; that sign-in belongs to the other application, not to PathScribe.
4. Select the next slide's preview. The same window moves to that slide.

PathScribe records each opening in the audit log: who opened which slide, and when.

### Alternative workflow

**Setting where the slide window opens on this workstation.**

1. Select the station button in the top bar (the pin with the station name). The workstation menu opens.
2. Under **Slide image window**, select **Set position…**. The slide image window opens with instructions.
3. Drag the window to the screen and place where slides should open, and size it.
4. Select **Save position**. The window reads "Position saved for this workstation. You can close this window." Select **Close**.

In Chrome and Edge the browser may ask whether PathScribe may manage windows on all your displays. Allow it: the window then comes back on the screen you chose, and if that screen is not connected later, it opens on the main screen. In other browsers the window opens at the saved place. The position also updates by itself when you move the slide window.

### Exception handling

1. **"No viewer address is set. Ask your administrator."** Your laboratory has not set the address of its digital pathology application. Your administrator sets it in the Administrator Guide's slide image settings.
2. **"You don't have permission to open slide images."** Your role does not include opening slide images. Ask your administrator.
3. **No preview picture, but Open slide.** The scanner's preview could not be loaded. Open the slide with **Open slide**.
4. **Failed image quality.** The slide goes back for rescanning. The preview shows the failed image; do not rely on it.

### Error recovery

1. **"Your browser blocked the slide window."** Select the blocked pop-up icon at the end of the address bar, choose to always allow pop-ups from PathScribe, then select the slide again.
2. **The window opens on a screen you cannot see.** Use **Set position…** in the workstation menu to place it again.
3. **The application opens on the wrong slide.** Close it, check the slide identifier against the glass, and tell your administrator the slide and the time.

## Tips and Best Practices

### Common mistakes

- Treating the preview as the slide. It is a small picture for recognising the slide.
- Selecting the preview repeatedly when the pop-up was blocked. Allow pop-ups once.
- Moving the slide window to a screen that is often unplugged. Save its position on a screen that is always there.

### Efficiency recommendations

- Place the slide window on the second monitor once with **Set position…**; every slide after that opens there.
- Keep the slide window open while you work through a case.

### Workflow recommendations

- Check the image state before calling the scanning room: Queued and Scanning mean the slide is on its way.
- Report a **Failed image quality** slide that stays in the queue to the histology team.

### The demonstration page

Installations with the demonstration tools also have an older page at the address /wsi-viewer: a notice, a case line and a grey box where a slide would be. It shows no image and is not used to open slides; opened without a case it reads "No case specified.". In the demonstration installation, previews open a separate demonstration page labelled "demonstration only, not for diagnosis".

## Related Features

### Upstream workflow

- [Slide Distribution Station](help:workstations/slide-distribution): routes slides to a scanner.
- [WSI Scan](help:batch-management/wsi-scan): loads the scanner and records the scan, including the image quality check.

### Downstream workflow

- [Report](help:report): the pathologist reports the case.
- [Cytology Screening Case](help:cytology/screening-case): screening of cytology slides scanned as whole-slide images.
- [Demonstration Tools](help:demonstration-tools): the other demonstration pages.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No preview, only "No image yet" | The slide has not been sent for scanning. |
| "Queued" for a long time | The slide is waiting in the scanning queue. Ask the scanning room. |
| "Scan failed" or "Failed image quality" | The slide is back in the queue for rescanning. |
| "No viewer address is set. Ask your administrator." | The address of the laboratory's application is not set. |
| Nothing opens | A pop-up was blocked. |
| The application asks me to sign in | That is the other application's own sign-in. |

### Resolution steps

1. Allow pop-ups for PathScribe.
2. Check the slide's image state.
3. Use **Set position…** if the window is out of sight.
4. Ask your administrator to check the slide image settings.

### When to contact support

Contact your laboratory's PathScribe support when a slide opens on the wrong image, or nothing opens although pop-ups are allowed and an address is set. Have the slide identifier and the time ready.
