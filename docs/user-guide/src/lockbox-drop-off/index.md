---
module: Lockbox Drop-Off
workflow: After-hours specimen receipt
role: [Accessioner, Histotechnologist, Laboratory Manager]
keywords: [lockbox, drop-off, after hours, scan specimen, morning follow-up, overnight folder, placeholder, urgent drop, time to receipt]
routes: [/lockbox-drop-off]
previous: home
next: accession
related: [accession]
status: Draft
---

# Lockbox Drop-Off {#top}

## Overview

**Purpose.** Lockbox Drop-Off records specimens that arrive in the laboratory lockbox outside staffed hours. Whoever collects the containers scans each barcode, and PathScribe writes a permanent "Received in Lockbox" receipt with the time and the name of the person who scanned. The morning team then works from the **Overnight folder**, which lists everything received but not yet accessioned.

**Intended users.** Accessioners, histotechnologists and laboratory managers. Scanning a container needs one permission and working the Overnight folder needs another, so your role decides which parts you see.

**Where it fits.** The lockbox sits before [Accession](help:accession). A container scanned here is only *received*. Nothing is accessioned and no accession number is made until the morning team logs the case on the Accession screen.

!!! note "Demonstration data today"
    In this version the receipts, the pending orders that barcodes are matched against, and the "server time" all come from demonstration data held in your browser session. The time stamped on a receipt is your device's clock, and the name is the person signed in. A device-bound kiosk sign-in (a screen that stays signed in for the lockbox) is not built yet. Resetting the demonstration restores a fresh set of example receipts.

## Screen Tour

![The Lockbox Drop-Off screen on the Drop-Off tab](capture:lockbox-drop-off-overview)

The screen is titled **Lockbox Drop-Off**, with the line "Scan each container that arrives in the lockbox. The morning team picks up from the Overnight folder." Below it are one or two tabs. **Drop-Off** is always shown. **Overnight folder** appears only if your role allows reviewing the folder.

![The Overnight folder with the time to receipt summary](capture:lockbox-drop-off-overnight-folder)

### Field definitions

**Drop-Off tab**

| Field | What it means |
|---|---|
| Scan the container barcode | The large entry box. It keeps the cursor, so you can scan one container after another. Spaces and scanner control characters are removed and letters are made capitals. |
| Receive | Records the scan. Pressing Enter after the scan does the same. It reads "Checking" while PathScribe looks the barcode up. |
| Urgent | A toggle you switch on *before* you scan, for a container that needs prompt attention. It applies to the next receipt only. |
| Callback number (optional) | Appears when Urgent is on. A telephone number the morning team can ring about this container. It may hold digits, spaces and the characters + ( ) - . # * x, and must be 3 to 24 characters. |

**Received in Lockbox card** (shown after a scan)

| Field | What it means |
|---|---|
| Pending order found | The barcode matched an order already waiting in PathScribe. |
| Placeholder record kept. No accession number has been made. | The barcode matched no waiting order, so a placeholder was kept instead. |
| Accession number | For a matched order, the order's accession number. |
| Placeholder ID | For a placeholder, the identifier PathScribe gave it. Note it on the container paperwork if your laboratory asks for that. |
| Ordering facility | The facility on the matched order, or the one you chose or typed for a placeholder. Shows "Not recorded" if none. |
| Ordering physician | Shown only when you chose one for a placeholder. |
| Received | The date and time of the receipt. |
| Received by | The name of the person who scanned. |
| Callback number | Shown only for an urgent drop where you entered one. |

No patient name, date of birth or medical record number is read, shown or stored at the lockbox.

**No pending order for this barcode** (the placeholder form). Every field is optional.

| Field | What it means |
|---|---|
| Barcode | The code you just scanned, shown for checking. |
| Ordering client | Pick the facility from the list, or leave "Not listed or not known". |
| Client not in the list (optional) | Type the facility name when it is not on the list. |
| Ordering physician | Pick from the list, or leave "Not listed or not known". |
| Time dropped | Starts at the current time. Change it only if the container was dropped earlier. It cannot be more than a few minutes in the future or more than seven days ago. |

**Overnight folder tab**

| Column | What it means |
|---|---|
| Priority | An **Urgent** badge on urgent drops. |
| Accession number or placeholder | The accession number of a matched order or linked placeholder, or the placeholder ID. |
| State | "Order matched", "Placeholder, not linked", or "Placeholder, linked to an order". |
| Ordering facility | Facility, as recorded at the lockbox. |
| Waiting | How long the container has been in the folder, for example "3 h 20 min" or "1 d 4 h". |
| Received | When the receipt was written. |
| Received by | Who scanned it. |
| Actions | The buttons for that row (see Toolbar). |

The folder lists urgent items first, then the oldest first. When nothing is waiting it says "Nothing is waiting. Every specimen received in the lockbox has been accessioned."

**Time to receipt (QA).** A panel above the table, described as "From the drop in the lockbox to accessioned."

| Figure | What it means |
|---|---|
| Accessioned | How many lockbox specimens have been accessioned. |
| Median, Mean, Longest | Typical, average and longest time from drop to accessioned. |
| Urgent median | The median for urgent drops only. |
| Waiting now | How many are still in the folder. |
| Longest waiting | The longest current wait. |

"No data yet" appears for a figure that cannot be worked out yet.

### Toolbar

| Button | What it does |
|---|---|
| Drop-Off (tab) | Shows the scanning screen. |
| Overnight folder (tab) | Shows the morning follow-up list. Only shown if your role allows it. |
| Receive | Records the scanned barcode. |
| Urgent | Marks the next drop urgent. |
| Record drop | In the placeholder form, saves the placeholder receipt. |
| Cancel | In the placeholder form, discards the scan without recording anything. |
| Refresh | In the Overnight folder, reloads the list and figures. |
| Link to order | On a "Placeholder, not linked" row, opens a small form to type the real order or accession number. Needs a permission of its own. |
| Link | In that form, saves the link. It stays greyed out until you type a number. |
| Cancel | In that form, closes it without linking. |
| Mark accessioned | On a matched or linked row, closes the receipt as accessioned. |
| Open Accession | On a matched or linked row, opens the [Accession](help:accession) screen with the matched order already imported. |

If a button is greyed out, your role does not allow it; ask your laboratory manager.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Urgent button pressed in | The next drop will be marked urgent. |
| Urgent, high priority | A badge on the receipt card for an urgent drop. |
| Urgent badge and tinted row | An urgent drop in the Overnight folder. |
| Already received | The barcode was scanned before. The earlier receipt is shown and no new one was made. |
| Red message under the scan box | A problem. See Error recovery. |

### Hotkeys

On the screen: **Alt+S** puts the cursor in the scan box, **Alt+G** marks the next drop urgent, **Alt+D** shows the Drop-Off tab and **Alt+M** shows the Overnight folder (if your role allows it). To open Lockbox Drop-Off from anywhere, press **Alt+Shift+Z**, or Alt+J and then Shift+Z. The Mark accessioned and Link to order buttons have no key on purpose; you click them.

## Step-by-Step Procedures

### Standard workflow

**Receiving a container (after hours)**

1. Open Lockbox Drop-Off from the Home tile. The cursor is already in **Scan the container barcode**.
2. If this container is urgent, select **Urgent** first. A **Callback number (optional)** box appears; enter a number if the sender gave one.
3. Scan the container barcode, then press Enter (or select **Receive**). The button reads "Checking" for a moment.
4. If the barcode belongs to an order that is already waiting, the **Received in Lockbox** card appears at once with "Pending order found", the accession number, facility, time and your name. Nothing else needs confirming.
5. If the barcode matches no waiting order, **No pending order for this barcode** appears. Fill in what you know (all optional) and select **Record drop**. The card then shows "Placeholder record kept. No accession number has been made." with a Placeholder ID.
6. The card ends with "Scan the next container." The cursor returns to the scan box. Urgent switches itself off after each receipt.

**Morning follow-up**

1. Open Lockbox Drop-Off and select the **Overnight folder** tab. The list and the Time to receipt panel load.
2. Work from the top: urgent items first, then the longest waiting.
3. For a row that says "Order matched", select **Open Accession** and log the case (see the Accession article). When you save a case that was imported from the same order, PathScribe finds the lockbox receipt and marks it accessioned for you.
4. If the row was not closed that way, return and select **Mark accessioned**. The row leaves the list and the figures update.
5. For a row that says "Placeholder, not linked", find the real order. Select **Link to order**, type the order or accession number under "Real order or accession number", and select **Link**. The row becomes "Placeholder, linked to an order" and the Mark accessioned button is available.
6. Select **Refresh** whenever you want the latest list, for example after a colleague has worked on it.

### Alternative workflow

1. Use the keyboard only: Alt+S to reach the scan box, Alt+G to mark urgent, Enter to receive, Alt+M to check the folder, Alt+D to go back to scanning.
2. At the Accession screen you can scan the lockbox container's barcode itself. If it matches a waiting order, the order is imported, and saving the case closes the lockbox receipt automatically.

### Exception handling

1. **Barcode already received.** The card is headed "Already received" and says "This barcode was received earlier. The earlier receipt is shown and no new one was made." Check the earlier time and person. Do not scan it again.
2. **No pending order.** This is normal for urgent or intraoperative containers sent before the order reaches PathScribe. Record a placeholder. It is never given an accession number at the lockbox.
3. **Container dropped earlier than the scan.** In the placeholder form, change **Time dropped** to the real time.
4. **Scanned by mistake.** There is no delete. Receipts are permanent. Tell your laboratory manager; do not try to scan it again.
5. **A placeholder cannot be marked accessioned yet.** Mark accessioned is not offered on an unlinked placeholder. Link it to its order first.

### Error recovery

1. "Check the barcode, callback number and time, then try again." The barcode was empty or too long, the callback number is not a valid telephone number, or the time dropped is in the future or more than seven days old. Correct it and try again.
2. "You do not have permission to do this." Your role does not allow that action. Ask your laboratory manager.
3. "This was already done. Refresh and look again." Someone else acted on the same item first. Select **Refresh**.
4. "That receipt was not found. Refresh and try again." Select **Refresh**.
5. "This specimen is already marked accessioned." Nothing more is needed.
6. "Link this placeholder to its order first, then mark it accessioned." Use **Link to order**.
7. "Only a placeholder can be linked to an order." That row already has an order.
8. "Something went wrong. Nothing was lost; try again."

## Tips and Best Practices

### Common mistakes

- Switching Urgent on *after* scanning. Urgent is read when the receipt is written, so switch it on first.
- Treating a receipt as an accession. A lockbox receipt only proves the container arrived and when. The case still has to be accessioned.
- Leaving the Time dropped alone for a container that was dropped hours ago, which makes the waiting time too short.
- Typing the wrong number into Link to order. A placeholder can be linked only once and the first link stands.

### Efficiency recommendations

- Keep the cursor in the scan box and scan container after container; the screen returns to it after every receipt.
- Use Alt+S to get back to the scan box after clicking elsewhere.
- The placeholder form needs no typing at all: Record drop with every field blank is accepted.

### Workflow recommendations

- Begin each morning at the Overnight folder, urgent items first.
- Check the **Time to receipt (QA)** panel at the end of the shift or week; laboratory managers and quality staff can use the median and longest waiting figures to see how fast overnight specimens are picked up.
- Link placeholders as soon as the order arrives so the folder shows what is really outstanding.

## Related Features

### Upstream workflow

- [Home](help:home): the Lockbox Drop-Off tile opens this screen.

### Downstream workflow

- [Accession](help:accession): log the case for each container in the Overnight folder.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Overnight folder tab | Your role may scan containers but not review the folder. |
| Mark accessioned or Link to order is greyed out | Your role does not allow that action. |
| Every scan asks for placeholder details | The order has not reached PathScribe yet, or the barcode is not the order's accession number or a container barcode on it. |
| "Already received" on a container you have not scanned | A colleague scanned it earlier. Read the time and name on the card. |
| The row stays in the folder after the case was accessioned | The case was typed in by hand rather than imported from the order, or your role cannot update the folder. Use Mark accessioned. |
| Time looks wrong | In this version the time comes from your device's clock. |

### Resolution steps

1. Select **Refresh** on the Overnight folder.
2. Check the barcode against the container label and scan it again.
3. Confirm the order has reached PathScribe (the Accession screen's "Import from Order" box lists waiting orders).
4. Ask your laboratory manager to check that your role allows the action.

### When to contact support

Contact your laboratory's PathScribe support when a scan fails repeatedly with a valid barcode, when a receipt is missing from the folder, or when times look wrong on a live system. Have the barcode, the time and your name ready.
