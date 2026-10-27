---
module: Molecular
screen: Order Queue
workflow: Molecular order messages and demonstration
role: [Laboratory Manager, Administrator]
keywords: [molecular order queue, outbound orders, HPV co-test, reflex genotyping, simulate result, demonstration, testing tools, queued, sent, failed, instrument order]
routes: [/molecular-order-queue]
previous: molecular
next: molecular/batch
related: [molecular, outbound-queue, accession, demonstration-tools, cytology]
status: Draft
---

# Order Queue {#top}

## Overview

**Purpose.** This screen, titled "Molecular Order Queue", lists the outbound molecular order messages that PathScribe has produced: an HPV co-test order raised when a specimen was accessioned, a reflex genotyping order raised by a positive HPV screen, and instrument orders. Above the list is a small demonstration panel where you can place an HPV order and then simulate the laboratory's result coming back, to show the whole HPV order and reflex workflow without an analyser.

**Intended users.** This is a testing and demonstration page, not a bench screen. It is meant for laboratory managers, administrators and trainers who need to show or test the HPV order and result path.

!!! note "Do not confuse this with the Order Queue tab"
    The **Order Queue tab** on the [Molecular](help:molecular) screen is where technologists put in-house molecular orders on plates. It is a different list with different content. This article is about the separate page at "Molecular Order Queue". Orders placed from the Add-on Orders page appear in the tab, not here.

**Who can open it.** The page is protected by the Configuration screen permission, the same one that opens Configuration. By default that is the Administrator, Template Author, Template Approver and Laboratory Director roles. A Molecular Technologist, who has the Molecular screen, does **not** have it by default and sees "You don't have access to this screen" with a **Back to Home** button. An administrator can add the Configuration screen to another role in the Role Dictionary.

**Where it fits.** There is no tile for it on Home. Open **Configuration**, choose the **Demo Reset** tab, find the heading "Testing & Demo Tools", and select **Open** beside "Molecular Order Queue". The card describes it as "Simulate ordering and inbound HPV results against a fixed seed case. A testing/demo surface, not a production ordering workflow." The Demo Reset tab works only in a demonstration environment. At a site connected to live servers it shows "Demo reset is unavailable" and this link is not offered.

## Screen Tour

![The Molecular Order Queue page with the HPV demonstration panel above the table of queued orders](capture:molecular-order-queue-overview)

The page has a heading and a line under it: "Outbound molecular assay and instrument orders — fired automatically at accession, or by an HPV reflex genotyping trigger on a positive standalone screen." Then the demonstration panel, then the table.

### Field definitions

**Demonstration panel ("Demo: HPV order & reflex workflow")**

The panel says "Operates against real seed case S26-5003-CYT-001, Specimen A — already configured with an HPV co-test pending. Queue the assay order, then simulate the lab result coming back." The case and specimen are fixed. You cannot pick another case on this page, and the case is demonstration data, not a real patient.

| Field | What it means |
|---|---|
| Assay used | Which HPV test the simulated order and result are for. **st-hpv-highrisk-screen (standalone)** is the high-risk HPV screen on its own. **st-hpv-reflex (bundled)** is the version that already includes reflex testing. |
| Simulated result | The result the simulated laboratory returns: **Positive** or **Negative**. |
| Message line under the buttons | The outcome of your last action (see the list under Error recovery). |

**The table of queued orders**

The newest entry is at the top. With nothing queued you see "No orders queued yet."

| Column | What it means |
|---|---|
| Type | **Molecular** for an assay order, or **Instrument** for an order that was prepared for an instrument. |
| Accession | The accession number followed by the specimen letter, for example S26-5003-CYT-001-A. For an instrument order it shows the master barcode instead. |
| Assay | The assay code ordered (for an instrument order, the instrument vendor). |
| Reason | **Protocol-configured (accession)** when the order was raised automatically at accessioning because the specimen's protocol says so. **HPV reflex genotyping** when a positive standalone screen raised it. A dash for instrument orders. |
| Status | **Queued** (waiting to be sent), **Sent**, or **Failed**. |
| Queued at | The date and time the order was placed, in your language's format. |

A row raised by an HPV reflex is tinted so it stands out.

### Toolbar

| Button | What it does |
|---|---|
| Queue HPV co-test order | Places an order for the chosen assay on the demonstration case, as if the accession had raised it. You see "Order queued." and a new **Queued** row appears at the top of the table. |
| Simulate inbound HPV result | Plays the part of the laboratory: sends a result (Positive or Negative) for the chosen assay on the demonstration case, through the same result handling that a real interface would use. |

Both buttons are greyed out for a moment while they run.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Queued | The message is waiting to go out. |
| Sent | The message has gone out. |
| Failed | The message could not be sent. |
| Tinted row | The order was raised by an HPV reflex. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

Demonstrating the standalone HPV screen with a reflex:

1. Sign in as someone with the Configuration screen and open Configuration. Choose the **Demo Reset** tab and, under "Testing & Demo Tools", select **Open** by "Molecular Order Queue". The page opens.
2. In **Assay used**, leave **st-hpv-highrisk-screen (standalone)** selected.
3. Select **Queue HPV co-test order**. The line under the buttons reads "Order queued." and a **Molecular** row for S26-5003-CYT-001-A with the reason **Protocol-configured (accession)** and status **Queued** appears at the top.
4. In **Simulated result**, choose **Positive**.
5. Select **Simulate inbound HPV result**. The line reads "Result applied — genotyping reflex order fired below." (If you press it again, the line says the reflex order already exists and no second row is added.)
6. Look at the table. A second, tinted row has appeared, for the genotyping test, with the reason **HPV reflex genotyping**. That is the reflex: a positive result on the standalone screen orders genotyping automatically.
7. If you want to see the result on the specimen, open case S26-5003-CYT-001 in the cytology screen. See [Cytology](help:cytology).

### Alternative workflow

1. **Negative result.** Choose **Negative** in step 4. The line reads "Result applied." and no reflex row is added.
2. **Bundled assay.** Choose **st-hpv-reflex (bundled)** in step 2. A positive result reads "Result applied." and does not add a reflex row, because the bundled assay already includes reflex testing.
3. **Checking real orders.** After the accession of a specimen whose protocol is marked to send an outbound order, its order appears here as **Protocol-configured (accession)**. Use the table to confirm it was raised.
4. **Following the message to the outside world.** The same messages also appear in the [Outbound Queue](help:outbound-queue) screen with their send status and retry controls.

### Exception handling

1. **The result says "Outcome: …".** When the result could not be applied, the line says so in your language instead of "Result applied.": the message was already processed, the demonstration case was not found, the case has no such specimen, or the result message was incomplete or contradicted itself. On the demonstration case these should not appear unless the demonstration data was changed or removed. See Resolution steps.
2. **No row appears after Queue HPV co-test order.** The message line should say "Order queued." If the table is still empty, reopen the page.
3. **Simulating a result before queueing an order.** The page lets you do it: the result is applied to the demonstration case whether or not an order row exists. The two buttons are independent.

!!! note "One reflex order per specimen"
    Every press of **Simulate inbound HPV result** is a new message, but a specimen gets only one genotyping reflex order. Pressing **Positive** again says "Result applied. The genotyping reflex order for this specimen is already on the queue, so no second one was made." and the table gains no second reflex row. The same protection applies to a real result sent again under a new message number. The table has no way to clear entries yet, so a reflex row stays until the demonstration data is reset.

### Error recovery

1. **You queued the order twice by mistake.** There is no button to delete a queue entry on this page. Leave it. They are demonstration data. In a demonstration environment, an administrator can reset the demonstration data from the same Demo Reset tab.
2. **The result line says the demonstration case was not found, or has no such specimen.** The demonstration case may have been removed or changed. Ask an administrator to reset the demonstration data on the Demo Reset tab, then try again.
3. **A row is Failed.** The message could not be sent. Open the [Outbound Queue](help:outbound-queue), find the entry and use its retry control.

## Tips and Best Practices

### Common mistakes

- **Using this page for real work.** It is a testing surface. Real in-house molecular orders are managed in the Order Queue tab of [Molecular](help:molecular).
- **Expecting to choose a case.** The demonstration case is fixed.
- **Expecting a real laboratory to answer.** Nothing leaves PathScribe from this page; the "laboratory" is you pressing the button.
- **Pressing the result button more than once.** See the warning above.

### Efficiency recommendations

- For a training session, go through the Positive standalone path first (it shows the reflex), then the Negative path.
- Keep the page open in one window and the cytology case in another to show the result landing on the specimen.

### Workflow recommendations

- Reset the demonstration data from the Demo Reset tab before a new training session so the table starts empty.
- Do not leave the demonstration page open in a live production site. It needs the Configuration screen precisely so that ordinary users do not reach it.

## Related Features

### Upstream workflow

- [Accession](help:accession): a specimen whose protocol is set to send an outbound order raises a **Protocol-configured (accession)** entry here.
- [Demonstration Tools](help:demonstration-tools): the Demo Reset tab that leads to this page.

### Downstream workflow

- [Outbound Queue](help:outbound-queue): the same messages with their send status.
- [Cytology](help:cytology): where the HPV result is shown on the specimen.
- [Molecular](help:molecular): the real working screen for in-house molecular orders.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| I cannot open the page. | Your role does not have the Configuration screen. Molecular Technologists do not by default. |
| I cannot find a tile for it. | There is none. Use Configuration, Demo Reset, "Testing & Demo Tools". |
| The table is empty. | Nothing has been queued yet: "No orders queued yet." |
| The reflex row did not appear. | The result was Negative, or the assay was the bundled one, or the result line shows an "Outcome:" message, or a reflex order for this specimen was already on the queue. |
| The result applied but I cannot see it. | Check the demonstration case S26-5003-CYT-001, Specimen A, in the cytology screen. |
| The status never leaves Queued. | Nothing sends the message on this page. Sending is done by the outbound queue and, in a demonstration, by a simulated receiver. |

### Resolution steps

1. Read the message line under the buttons.
2. If it shows an "Outcome:" message, note it and reset the demonstration data from the Demo Reset tab, then repeat.
3. If a row is Failed, retry it from the [Outbound Queue](help:outbound-queue).
4. Reload the page to read the queue again.

### When to contact support

Contact your laboratory's PathScribe support when the demonstration reset does not bring back the demonstration case, or when a real accession-raised order does not appear here at all. Have the accession number and the time of the problem ready.
