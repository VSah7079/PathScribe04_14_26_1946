---
module: Batch Management
screen: Disposal Queue
slug: batch-management/disposal
workflow: Retention and disposal
role: [Histotechnologist, Cytotechnologist, Molecular Technologist, Laboratory Manager]
keywords: [disposal, dispose, retention, discard blocks, discard slides, wet tissue, scan to dispose, red screen, retention period, eligible for disposal]
routes: [/batch-management/disposal]
previous: batch-management/retention-holds
next: batch-management/disposal-report
related: [batch-management, batch-management/retention-holds, batch-management/disposal-report, report]
status: Draft
---

# Disposal Queue {#top}

## Overview

**Purpose.** The Disposal Queue lists the specimens, blocks and slides that may be thrown away today, and lets you record the disposal by scanning the physical item. Before it accepts a scan, PathScribe re-checks that the item is really allowed to go. Anything that is not is refused at once with a full-screen red warning, so the wrong block is not discarded.

**Intended users.** Staff who handle retained material: histotechnologists, cytotechnologists, molecular technologists and laboratory managers. Scanning to dispose needs its own permission, which the bench roles have by default.

**Where it fits.** Material enters this list when the case has been signed out and the retention period for that kind of material has ended, and no retention hold is active on the case. Placing a hold on the case removes its material from the list. What is disposed here appears in the [Waste Tracking Report](help:batch-management/disposal-report).

!!! warning "Disposal cannot be undone"
    A successful scan marks the item as disposed on the case, with your name and the time. There is no undo on this screen. Scan only the item you hold in your hand, and put it in the waste stream straight after the green confirmation.

!!! note "Retention periods"
    How long each kind of material is kept comes from your laboratory's retention policy and jurisdiction, set by your administrator. In this version some of the supplied retention figures are placeholders that your records or compliance lead must confirm before relying on them. Ask your laboratory manager which policy is active.

## Screen Tour

![The Disposal Queue listing items qualifying for disposal](capture:batch-management-disposal-overview)

The page title is **Disposal Queue**. The subtitle reads: "A real, computed list of blocks and slides that genuinely qualify for disposal right now — retention period elapsed, no active hold, not already disposed. Scan a physical item's own barcode to dispose it; anything that doesn't match gets rejected immediately, on screen." After it comes either "Scoped to (facility)." or "No scan station set — showing all locations. Set a station for a location-scoped queue."

Under that is the line "Scan a cassette or slide barcode to dispose it. Hands-free — no need to click into a field first." You do not click anywhere before scanning.

### Field definitions

| Field | What it means |
|---|---|
| Qualifying for Disposal (n) | The number of items that may be disposed of now. |
| Item identifier | The identifier on the item's label. |
| Type | **Tissue Block**, **Slide** or **Wet Tissue** (a specimen or a decanted portion). Cassettes are shown as Tissue Block. |
| Specimen / Eligible since / location | For example "A · Eligible since 12 Mar 2026 · Histology Store". The last part is the item's last known location and is left out if none was recorded. A block shared by several specimens (a matrix block) shows "A, B (shared)" so you can see that more than one specimen is affected. |

Which items appear:

- The case must be signed out. The retention clock starts at sign-out.
- The retention period for that kind of material, and for the specimen type, must have ended. When specimens of different types share a block, the longest period applies.
- The case must have no active retention hold.
- The item must not be disposed of already.
- If a scan station is set, the item's last known location must belong to that station's facility. "Last known location" is one rule everywhere (the queue, the scan check and the Waste Tracking Report): the location event with the latest time. A location entered late with an earlier time does not count as the current one, and for two events at the same time the one recorded later wins.

### Toolbar

None. The screen has no buttons. You act by scanning.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Green flash "(identifier) disposed" | The scan was accepted. The item has been recorded as disposed and removed from the list. A beep sounds. The flash stays for about two and a half seconds. |
| Full red screen with a stop sign | The scan was refused. The message names the reason. It clears itself after about four seconds, or when you click it ("Tap anywhere to dismiss"). An error tone sounds. |
| Computing the real, current queue... | The list is being worked out. |
| Nothing qualifies for disposal right now at this location. | The list is empty. |

The red screen messages:

| Message | What to do |
|---|---|
| (identifier) was already disposed on (date). | Nothing; it has already been recorded. Check that you are not holding a second copy. |
| "(text)" doesn't match any cassette, slide or container on any case. | The label could not be matched to anything. Check the barcode. |
| (identifier) couldn't be found in its case record. | The label matches a case but not a record on it. Tell your laboratory manager. |
| (identifier) can't be disposed until (date), when its retention period ends. | Keep it. Put it back. If the date is not known the message reads "an unknown date" in its place; ask your laboratory manager when the retention ends. |
| (identifier)'s case isn't signed out yet, so its retention period hasn't started. | Keep it. |
| (identifier) can't be disposed: its case has an active retention hold ((note)). | Keep it. The hold's note is shown. See Retention Holds. |
| (identifier) was last recorded at another location, not this facility. | The item is recorded as belonging elsewhere. Do not discard it here. |
| You don't have permission to dispose of retained material. | Your role does not include this permission. |

### Hotkeys

None. Any barcode scan on this page is read as a disposal scan.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Disposal** tile. The Disposal Queue opens with the list of items that qualify.
2. Check the scope line. If the page says no scan station is set, ask your laboratory manager to set one for this computer so that you see only your own location.
3. Take the physical item to be discarded and scan its label.
4. If the screen shows a green "(identifier) disposed", place the item in the waste. The row disappears and the count falls by one.
5. If the screen turns red, read the message. Do not discard the item. Dismiss the message by clicking it and carry on with the next item.
6. Continue until the pile is finished. The list should show only items you have not yet reached.

### Alternative workflow

1. To dispose of an item that is not on the list because it was scanned at another location, take it to a computer whose station belongs to its facility.
2. To see what has already been disposed of, open the [Waste Tracking Report](help:batch-management/disposal-report).

### Exception handling

1. **An item is on the list but the scan is refused.** The list can be a few moments old; the scan always re-checks. For example, a colleague may have placed a hold after the list loaded. Believe the red screen.
2. **A hold is shown.** Do not discard. If the hold should have been released, a person with the right permission releases it on [Retention Holds](help:batch-management/retention-holds).
3. **The label will not scan.** Reprint it from [Label Reprint](help:batch-management/label-reprint), or ask for the item to be identified from its case.
4. **Two specimens share a block.** The row shows "(shared)". Disposing of it affects every specimen on the block. The longest of their retention periods has already been applied.
5. **Permission refused.** Ask your laboratory manager. The permission is separate from simply seeing the screen.

### Error recovery

1. You scanned the wrong item and got a green flash. There is no undo here. Tell your laboratory manager at once. The disposal is on the record with your name; the case history will show it, and the item must be located if it is still on the bench.
2. A red screen covers the page. Click anywhere or wait about four seconds. The next scan works straight away.
3. The count looks wrong. The list is worked out when the page opens and is not refreshed by itself, apart from the rows you dispose of. Reload the page to recompute it.

## Tips and Best Practices

### Common mistakes

- Scanning a stack of items without watching the screen. A red screen means keep it. Watch every scan.
- Discarding an item before the green flash.
- Assuming that an item on the list is still safe to discard an hour later. A hold or a change can appear at any time; the scan re-checks.
- Working without a scan station set, then wondering why items from other sites appear.

### Efficiency recommendations

- Keep the scanner in your hand and the screen in view. No clicking is needed.
- Dispose of by case or by shelf so the count falls steadily and you can see you are finished.

### Workflow recommendations

- Dispose on a regular schedule so the list does not grow.
- Check [Retention Holds](help:batch-management/retention-holds) before a large disposal run.
- Keep the Waste Tracking Report for audits; do not keep paper lists.

## Related Features

### Upstream workflow

- [Report](help:report): sign-out of the case starts the retention clock, and the Retention Hold control on the case's Specimens & Reports section stops disposal.
- [Retention Holds](help:batch-management/retention-holds): cases with holds never appear here.

### Downstream workflow

- [Waste Tracking Report](help:batch-management/disposal-report): the permanent record of everything disposed of.
- [Batch Management](help:batch-management): the tile that opens this screen.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The list is empty | Nothing is past its retention period, or a hold covers it, or the station's facility has no eligible items. |
| An item I expect is missing | The case is not signed out, the retention period is not over, a hold is active, or its last location is at another facility. |
| Every scan is refused for permission | Your role does not include disposal. |
| The red screen is unreadable or too quick | Click it to dismiss; the message is the same one every time for the same reason. Scan again to see it. |
| The scan does nothing | The scanner is not sending a barcode to the page, or the browser window is not in focus. |

### Resolution steps

1. Reload the page to recompute the list.
2. Check the scope line and your scan station.
3. Read the red message carefully and act on its reason.
4. Ask your laboratory manager to check the retention policy and holds on the case.

### When to contact support

Contact your laboratory's PathScribe support when an item that should qualify is refused repeatedly, when an item is recorded as disposed that you did not dispose of, or when the retention dates look wrong for the policy. Have the item identifier, the case number and the time ready.
