---
module: Batch Management
screen: Engraver Monitor
slug: batch-management/engraver-monitor
workflow: Bench chain of custody
role: [Histotechnologist, Laboratory Manager]
keywords: [engraver, cassette engraver, device status, supply low, cassette supply, fault, offline, diagnostics, cassette engine]
routes: [/batch-management/engraver-monitor]
previous: batch-management/label-reprint
next: batch-management/wsi-scan
related: [batch-management, batch-management/label-reprint, grossing]
status: Draft
---

# Engraver Monitor {#top}

## Overview

**Purpose.** The Engraver Monitor is a read-only status board for the cassette engravers in your laboratory. It shows, for every engraver that has reported in, whether it is online, engraving, warning, faulted or offline, any supply warnings (cassettes low or out, a cassette colour unavailable), and when it last reported. It is a quick answer to "can I print cassettes now, and will I run out?".

**Intended users.** Histotechnologists, grossing staff who depend on cassettes, and laboratory managers.

**Where it fits.** Engravers are driven by the cassette engine, which owns the machine's detailed diagnostics. PathScribe shows only a coarse summary here, and a link to the engine's own diagnostics for anything deeper. Cassettes engraved here are the ones [Grossing](help:grossing) prints and that later appear in [Pending Batch Load](help:batch-management/pending-load).

!!! note "Demonstration data today"
    With no live engraver feed connected, the screen shows a set of example devices and a **Simulated** badge in the toolbar. When the badge is shown, nothing on the board is a real machine. Hopper-level detail and hardware controls are not built into PathScribe; they stay in the cassette engine.

## Screen Tour

![The Engraver Monitor with status counts and device cards](capture:batch-management-engraver-monitor-overview)

The page title is **Engraver Monitor**. The subtitle reads: "A real, high-level status summary for every engraver the Cassette Engine reports on — status, real warning summaries, and a direct link to the Engine's own diagnostics for anything deeper. PathScribe doesn't model hopper-level detail or hardware telemetry here; that stays the Engine's own job."

### Field definitions

**Status tiles.** Five tiles each show a count: Online, Engraving, Warning, Fault and Offline. They count the devices shown (so they follow the organisation filter). They are not buttons.

**Device cards**

| Item | What it means |
|---|---|
| Name | The device name, or its identifier if it has no name. |
| Identifier and location | The device ID, and its location label if one was reported. |
| Status badge | Online, Engraving, Warning, Fault or Offline. |
| Warnings | A list that appears when there is anything to report. Supply warnings read "(colour) Low", "(colour) Depleted" or "(colour) Unavailable", or just Low, Depleted or Unavailable when no colour applies. Other warnings are shown as the device sent them. |
| Reported (time) | When the device last reported. |
| Launch Engine Diagnostics | A link that opens the engine's own diagnostics for this machine in a new tab. Shown only when the engine supplied a link. |

Devices:

- "Devices (n)" counts the devices shown.
- "Loading real device status..." appears on the first load.
- "No engraver has reported status yet." appears when no device has reported.

### Toolbar

| Control | What it does |
|---|---|
| Refresh | Reads the latest status now. Reads "Refreshing..." while it works. |
| Filter by organisation | Appears only when devices belong to more than one organisation. Choose All organisations or one. |
| Simulated badge | Shown when the board is running on example data. |

The board also refreshes itself: at once when a change is announced, and otherwise every 30 seconds, without showing "Refreshing...".

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Online (green) | The engraver is ready and idle. |
| Engraving (blue) | It is working on a job. |
| Warning (amber) | It is running but has something you should look at, such as low supply. |
| Fault (red) | It has stopped because of a fault. |
| Offline (grey) | It is not reporting. |
| Simulated badge | The data is demonstration data. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Engraver Monitor** tile. The status tiles and device cards appear.
2. Read the five tiles to see how many engravers are in each state.
3. Find your engraver's card by name or location. Check the status badge.
4. Read any warnings. A "Low" or "Depleted" warning on a colour means restock that colour of cassette before printing.
5. Check "Reported (time)". If it is old, the engraver may be offline or the link down.
6. For a fault, select **Launch Engine Diagnostics** and follow the engine's own screens. Then return and select **Refresh**.

### Alternative workflow

1. Leave the screen open on a bench monitor. It updates itself.
2. In a multi-organisation setup, use the organisation filter to see only your own devices.

### Exception handling

1. **No devices.** "No engraver has reported status yet." Nothing has reported. Check the engraver and the cassette engine connection, or whether this is a Simulated board.
2. **A device shows Offline.** Check power and network at the machine. The last report time tells you how long.
3. **Fault.** Use the diagnostics link, if shown. If there is none, contact your engine support.
4. **A colour is unavailable.** Choose another cassette colour at Grossing or restock.
5. **The Simulated badge shows on a live system.** The live feed is not connected; contact support.

### Error recovery

1. The board looks out of date. Select **Refresh**.
2. The diagnostics link does nothing. Your browser may be blocking the new tab; allow pop-ups.
3. Counts seem wrong after filtering. The tiles follow the filter; choose All organisations.

## Tips and Best Practices

### Common mistakes

- Expecting to control the machine from here. The board is read-only.
- Treating a Simulated board as real.
- Ignoring "Reported (time)". A green badge from an hour ago may be stale.

### Efficiency recommendations

- Check supply warnings before a large grossing session, not during it.
- Keep the screen open on a bench monitor.

### Workflow recommendations

- Report persistent faults to your laboratory manager with the device ID shown on the card.
- Use [Equipment Log](help:batch-management/equipment-log) to record maintenance of the engraver after a fix.

## Related Features

### Upstream workflow

- [Equipment Log](help:batch-management/equipment-log): the engraver's service history.

### Downstream workflow

- [Grossing](help:grossing): printing cassettes.
- [Label Reprint](help:batch-management/label-reprint): reprinting cassette labels in bulk.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Every tile shows zero | No device has reported. |
| The organisation filter is missing | Only one organisation is reporting. |
| No diagnostics link on a card | The engine did not send one for that device. |
| Colour names show as codes | The colour is not in your cassette colour list. |

### Resolution steps

1. Select **Refresh**.
2. Check the machine's power and network.
3. Open the engine diagnostics if a link is shown.
4. Ask your laboratory manager to check the engine connection.

### When to contact support

Contact your laboratory's PathScribe support when engravers are working but the board shows none, or the board shows Simulated on a live system. Have the device ID and the last report time ready.
