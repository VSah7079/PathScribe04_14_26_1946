---
module: WSI Viewer
workflow: Case Review
role: [Pathologist, Cytotechnologist, Laboratory Manager]
keywords: [wsi viewer, whole slide image, digital slide, launch in viewer, slide viewer, demonstration viewer, mock viewer, scanned slide, image viewer, companion window]
routes: [/wsi-viewer]
previous: batch-management/wsi-scan
next: report
related: [batch-management/wsi-scan, workstations/slide-distribution, report, cytology/screening-case, demonstration-tools]
status: Draft
---

# WSI Viewer {#top}

## Overview

**Purpose.** The WSI Viewer page is a stand-in for the window in which a laboratory's whole-slide-image viewer would show a digital slide. It reads the case it is given and shows the accession, the patient and the specimen, and a grey box where the slide image would be. It is a **demonstration page**. It does not show a slide image, and it cannot zoom or pan.

**Intended users.** People demonstrating, testing or training on PathScribe. A pathologist or cytotechnologist who wants to open a real digital slide does not use this page; they use the **Launch in Viewer** button, which opens the laboratory's own viewer (see Alternative workflow).

**Where it fits.** Digital slides start at the [Slide Distribution Station](help:workstations/slide-distribution), pass through [WSI Scan](help:batch-management/wsi-scan) in Batch Management, and are then read in a viewer. The viewer is a separate product that the laboratory connects through the Administrator Guide's vendor settings. PathScribe does not store or draw slide images itself.

!!! warning "A demonstration page, not a viewer"
    The page carries its own notice at the top: "Mock WSI viewer — no real image server exists in this environment. This is a real, honest placeholder for where a real digital pathology viewer would render this specimen's own real slide." Never use it to review a slide for a diagnosis. In a production installation the page is not present at all.

## Screen Tour

![The WSI Viewer demonstration page with its notice, the case line and the placeholder slide surface](capture:wsi-viewer-overview)

The page has no menu, toolbar or buttons. From the top it shows:

1. A notice bar, with the text quoted above.
2. A case line: the accession number in bold, then "— Specimen A" (the label of the case's first specimen), then the patient name.
3. A large box reading "[ Real WSI slide surface — pan/zoom would render here ]". This is a placeholder. Nothing can be done in it.

The page learns which case to show from the web address it is opened with (a case identifier added to the end). Nothing in the application's menus opens it that way today, so you reach it only by being given the address. Without a case it shows "No case specified."; with a case that cannot be found it shows "No case found for '…'."

### Field definitions

| Field | What it means |
|---|---|
| Notice bar | States that this is a demonstration. Always shown. |
| Accession | The case's accession number. |
| Specimen | The first specimen on the case. Other specimens are not shown, even when the case has several. |
| Patient name | Shown last name first, then first name, as recorded on the case. |
| Slide surface | A placeholder box. No image is loaded. |

### Toolbar

None. The page has no buttons.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Notice bar at the top | The page is a demonstration. |
| "No case specified." | The address has no case. |
| "No case found for '…'." | The case named in the address does not exist. |
| Loading indicator | The case is being looked up. |

### Hotkeys

None. This page has no keys or spoken commands of its own. F1 opens this help article.

## Step-by-Step Procedures

### Standard workflow

This is how to see the demonstration page, for trainers and testers only.

1. Sign in on an installation that includes the demonstration tools. If your installation is a production one, the address opens the sign-in page or nothing at all; stop here.
2. Open the address that was given to you for the viewer window, with the case named in it. The notice bar appears at once.
3. Wait for the loading indicator to clear. The case line shows the accession, the first specimen and the patient name.
4. Read the placeholder box. Close the window when you are done.

### Alternative workflow

This is how a pathologist or cytotechnologist opens a real digital slide.

1. Open the case in the [report](help:report) screen and select **Edit** in the block row. The block and stain window lists the slides on each block.
2. Look for the **Launch in Viewer** button beside a slide. It appears only when the slide is Coverslipped or Ready for Review, and the laboratory has at least one active viewer set up. In cytology screening, the same button appears on a case worked in whole-slide-image mode (see [Cytology Screening Case](help:cytology/screening-case)).
3. If the laboratory set up more than one viewer, choose the viewer in the small list beside the button.
4. Select **Launch in Viewer**. The viewer opens in a separate window, on the slide named by the slide's identifier. PathScribe remembers where you put that window.
5. If a small warning mark appears beside the button, hold the pointer over it to read the reason. If the browser says "Popup blocked — please allow popups for this site and try again", allow pop-ups for PathScribe and select the button again.

### Exception handling

1. **The Launch in Viewer button is missing.** The slide is not yet Coverslipped or Ready for Review, it has no identifier, or no viewer is active in the settings.
2. **The warning mark says no launch address is configured.** The viewer you chose has no address set. Ask your administrator to complete the vendor settings, or choose another viewer.
3. **The address is missing its slide placeholder.** The vendor's address was entered without the place where the slide identifier goes. The slide would not open on the right image, so PathScribe refuses to open it. Ask your administrator.
4. **The demonstration viewer opens a sample page.** One entry in the viewer list is marked as a demonstration. It opens a sample address, not your slide.

### Error recovery

1. If the page shows "No case specified.", the address is incomplete. Open it again from the instructions you were given.
2. If it shows "No case found for '…'.", check the accession or case identifier in the address.
3. If the window opens blank, check that pop-ups are allowed and close and reopen it.
4. If the viewer opens at the wrong slide, close it, check the slide identifier on the slide list against the glass, and tell your administrator the vendor, the slide and the time.

## Tips and Best Practices

### Common mistakes

- Treating the placeholder box as an image that has failed to load. It never contains an image.
- Expecting the demonstration page to appear in production. It does not.
- Choosing the demonstration viewer in the list when a real one is set up.
- Clicking **Launch in Viewer** repeatedly when a pop-up has been blocked. Allow pop-ups once.

### Efficiency recommendations

- Place the viewer window on the second monitor once. PathScribe remembers its position and size.
- Keep the viewer window open between slides of the same case.
- For training, show the real **Launch in Viewer** button on a demonstration case rather than this page.

### Workflow recommendations

- A trainer can use this page to show where a viewer window would sit beside PathScribe, and to show that the case line matches the case.
- Do not pass the page's web address to anyone who has no right to see the case; the page shows the patient's name.

## Related Features

### Upstream workflow

- [Slide Distribution Station](help:workstations/slide-distribution): routes slides to a scanner.
- [WSI Scan](help:batch-management/wsi-scan): loads the scanner and records the scan.

### Downstream workflow

- [Report](help:report): the pathologist reviews the slides and reports the case.
- [Cytology Screening Case](help:cytology/screening-case): screening of digital cytology slides.
- [Demonstration Tools](help:demonstration-tools): the other demonstration pages.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The address shows the sign-in page | You are not signed in, or this installation does not include the demonstration tools. |
| "No case specified." | The address has no case. |
| "No case found for '…'." | The case does not exist. |
| Only the first specimen is shown | The page shows the case's first specimen only. |
| I want to see the slide | Use **Launch in Viewer** in the block and stain window, not this page. |
| Launch in Viewer does nothing | A pop-up was blocked, or the viewer has no address set. |

### Resolution steps

1. Check that you are signed in.
2. Check the address and the case in it.
3. Allow pop-ups for PathScribe.
4. Choose another viewer from the list, if there is one.
5. Ask your administrator to check the viewer's address in the settings.

### When to contact support

Contact your laboratory's PathScribe support when Launch in Viewer opens the wrong slide, or the viewer will not open although its address is set. Have the accession, the slide identifier, the viewer name and the time ready.
