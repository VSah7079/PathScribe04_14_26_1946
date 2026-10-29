---
module: Add-On Orders
workflow: Case Review
role: [Pathologist, Fellow, Resident]
keywords: [add-on order, additional levels, recut, deeper levels, special stain, immunostain, IHC, IHC panel, molecular, send-out, cart, submit order, order tracking, block exhausted, destructive cutting, control slide, reference lab]
routes: [/add-on-orders]
previous: report
next: workstations/microtomy
related: [report, report/microscopic-and-material, workstations/microtomy, workstations/slide-distribution, molecular/order-queue, batch-management, voice-and-keyboard]
status: Draft
---

# Add-On Orders {#top}

!!! note "Ordering from the Grossing screen"
    The Grossing screen has an **Add-On Orders** button (Alt+Shift+4) that opens this builder for the case you are grossing. Pathology assistants and the other grossing roles can also open it from the **Add-On Orders** tile under Pathology Workspace.

!!! note "Where do the labels print?"
    Nothing prints when you place the order. The order goes to the microtomy queue; the technologist scans the block at the bench, the order opens, and the slide labels print on that bench's printer. A way to choose a different printing place when ordering is being considered.

## Overview

**Purpose.** Add-On Orders is where a pathologist orders more work on a case that already exists: deeper levels or recuts of a block, special stains, immunostains (single stains or a panel of them), and molecular or send-out tests. You open the case, tick the blocks, build a cart of order lines, choose the priority and the type of slide, and submit. The screen then follows each order through the laboratory and is where you answer the bench if a block has run out of tissue.

**Intended users.** Pathologists, fellows and residents. These roles have the screen and the permission to place orders by default. A person without the permission to place orders can open the screen and read the tracking list, but **Submit Add-On Order** is greyed out for them.

**Where it fits.** There is no Home tile. The usual way in is the **Add-on order** button in the block row of the [report](help:report) screen's header, which opens this screen with that case already loaded. Each slide you order appears as a Pending slide on its block at the [Microtomy Workstation](help:workstations/microtomy), where the technologist cuts, labels and prints it. Finished slides are routed at the [Slide Distribution Station](help:workstations/slide-distribution). A molecular test run in the laboratory goes to the molecular order queue (see [Order Queue](help:molecular/order-queue)); a test that is sent out goes to the reference laboratory you choose.

## Screen Tour

![The Add-On Order Builder with the case's blocks on the left, the builder in the middle, the order summary on the right and order tracking below](capture:add-on-orders-overview)

The page is titled **Add-On Order Builder**. If you arrive without a case, it shows only a search box: "Search or scan an accession number…" and an **Open Case** button. **Back** at that point returns to Home. Once a case is open, **Back** closes the case and returns to the search box.

A bar across the top shows the accession, the patient name, "Case status: …" and "Primary pathologist: …" (the pathologist's name; if the case holds something that is not a known user, it is shown as stored). If PathScribe cannot work out which laboratory performs the work, the bar adds "No performing lab could be resolved for this case — routing will show all matching stations, not scoped to one lab."

Below are three panels side by side, and the **Order Tracking** list underneath.

### Field definitions

**Left panel: Block & Tissue Context**

| Field | What it means |
|---|---|
| Specimen heading | The specimen letter and description. |
| Block row | A tick box, the block label (for example A1), and a note such as "3 level(s) already cut", with **Tiny Tissue** and **Fragile** if those flags are set. The count includes every slide already on the block. |
| Exhausted, Lost, Damaged, Cancelled | A badge on a block that cannot be ordered from. Its tick box is greyed out. |

**Center panel: Add-On Order Builder**

| Field | What it means |
|---|---|
| Order kind | Four buttons: **Recut / Deep Level**, **Special Stain**, **IHC**, **Molecular / Send-Out**. |
| IHC Panel | With IHC chosen: Breast Panel (ER/PR/HER2/Ki-67), Lynch/MMR Panel (MLH1/MSH2/MSH6/PMS2) and Renal IF Panel (IgG/IgA/IgM/C3/C1q/Kappa/Lambda). Choosing a panel adds one line for each stain of the panel. |
| Search stains… | Narrows the stain buttons by name. |
| Stain buttons | The stains offered for the kind chosen (the first 24 that match). A recut can use any stain; the others show only stains of their kind. "No matching stains." if none. |
| Level Depth (µm) | Recut only. Starts at 4. Required only if your organisation requires it. |
| Control Pairing | Appears for a stain that needs a control, or when a panel is chosen: **No Control**, **On-Slide Control**, **Separate Control Slide**. |

**Right panel: Order Summary & Routing**

| Field | What it means |
|---|---|
| Blocks selected | How many blocks are ticked. The cart is ordered on **every** ticked block. |
| Cart lines | The stain name, a panel tag, the depth ("4 µm levels"), the control choice, and where it goes ("Routes to:" the benches that can do it, or "No matching station configured for this lab yet — order still routes to the queue."). **Remove** takes a line out. |
| Molecular line | Where a laboratory can run the test itself, a choice between in-house and sent out; if not, "Sent out (this lab doesn’t run this test in-house)." In-house: "Goes to the Molecular Workcenter’s Order Queue." Sent out: **Reference / Send-Out Lab** with a list of labs; "Only the labs approved for this test are listed." or "No labs are linked to this test yet, so every reference lab is listed." |
| Priority | **STAT / Urgent**, **Routine Sign-Out** (the start), **Research / Protocol**. |
| Slide Media & Charge | **Standard Charged** (the start), **Uncharged**, **Plus Glass**. |
| Microtome Bench Instructions | Free text for the technologist. Optional unless your organisation requires it. |
| Submit Add-On Order | Places the order. |

Some fields can be required by your organisation (a red star). A line beginning "Still required" names what is missing, and the button stays grey. By default the blocks, at least one order line, and the reference laboratory of a sent-out test are required.

**Order Tracking** (below the panels; one row for each order placed on this case through this screen, plus any slide on the case that has an open exception, even if it was not ordered here, such as an original H&E that a technologist flagged as exhausted)

| Field | What it means |
|---|---|
| Block and stain | For example "A1 — ER", with the panel tag. |
| Stage badge | Requested, Block Retrieved, Cut / Pending Stain, Stained / QC, Checked Out / Scanned, Exception or Cancelled. |
| Details | "Ordered by …", the priority, the queue it was routed to, and "Send-out: …". |

### Prompts and messages

| Text | Where and what it means |
|---|---|
| This case has no specimens. | Shown in the block list when the case has no specimens, so there is nothing to order on. |
| No blocks on this specimen. | Shown under a specimen that has no blocks yet. |
| {{count}} block(s) selected | In the order summary, how many blocks are ticked. The number replaces the braces. |
| No order lines added yet. | Shown in the cart until you add a line. Submit stays grey. |
| Select a reference lab… | The first choice in the list for a sent-out line. Choose the laboratory that will run the test. |

### Toolbar

| Button | What it does |
|---|---|
| Open Case | Opens the case for the accession typed or scanned in the search box. |
| Add to Cart | Adds the chosen stain (or panel) to the cart. |
| Remove | Takes a line out of the cart. |
| Submit Add-On Order | Places the cart's lines on every ticked block. |
| Mark Block Retrieved | On a Requested order: records that the block has been pulled. Greyed out without the permission to mark a block retrieved. |
| Flag Exception | On an order not yet finished: opens the reason and note boxes. **Flag Exception** confirms; **Cancel** closes. Greyed out without the permission to flag a block exception. |
| Approve Destructive Cutting | Answers an exception: the technologist may cut the block away. Needs the permission to approve it. |
| Modify & Resubmit | Answers an exception: opens boxes for the level depth and the bench instructions; **Resubmit** sends the order back to the bench. |
| Cancel Order | Answers an exception: cancels the order. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Status badge on a block | Exhausted, Lost, Damaged or Cancelled: no orders can be placed on it. |
| Stage badge | The order's place in the laboratory (see above). It moves on by itself as the slide is cut, stained and routed. |
| Banner "Order submitted." | The order was placed. |
| Banner about molecular orders | "Order submitted, but … molecular order(s) didn’t reach the Molecular Order Queue. Tell the molecular lab." The slides are ordered; only the molecular part needs a call. |
| Warning banner | The order was refused; the text says why. |
| Banner "The exception was flagged. No ordering pathologist is recorded for this slide, so the notice was sent to the Supervisor / Accessioning Desk." | The slide was not ordered through this screen, so there was nobody to e-mail. The notice went to the people with the Lab Director or Accessioner role instead. |
| Warning "The exception was flagged, but nobody could be told …" | The flag is saved, but there is no ordering pathologist and no Supervisor / Accessioning Desk address. Tell your supervisor. |
| Warning under the IHC panel buttons: "… not in the stain dictionary, so … left out of this panel" | One or more stains of the chosen panel are missing from your laboratory's (active) stain list. The warning names them; **Add to Cart** still adds the others. If none exist it says nothing can be added. |
| Exception panel in a row | A technologist has flagged a problem; it holds the reason, the note, "Flagged by …" and the response buttons. |

### Hotkeys

Both keys work while this screen is open, and each does what its button does, including the "Still required" checks. An administrator can change them.

| Key | Spoken phrase | Action |
|---|---|---|
| Ctrl+Alt+Shift+A | "add to order" or "add to cart" | Add to Cart. |
| Ctrl+Alt+Shift+S | "submit order" or "submit add-on order" | Submit Add-On Order. Without the permission to place orders the order is refused with a message. |
| F1 | none | Opens this help article. |

Phrases are also available in French, German, Dutch, Korean and Spanish. See [Voice and Keyboard](help:voice-and-keyboard).

## Step-by-Step Procedures

### Standard workflow

1. From the report, select **Add-on order** in the block row. The case opens with its blocks listed. (Or open the screen and enter or scan the accession, then select **Open Case**.)
2. Tick each block you want to order from. Blocks that are Exhausted, Lost, Damaged or Cancelled cannot be ticked.
3. Choose the kind of order: **Recut / Deep Level**, **Special Stain**, **IHC** or **Molecular / Send-Out**.
4. Choose the stain (use **Search stains…** to find it) or, for IHC, a panel. For a recut, check the **Level Depth (µm)**. If a control is needed, choose the **Control Pairing**.
5. Select **Add to Cart**. A line appears in the Order Summary, with where it routes. Repeat from step 3 for further lines.
6. In the summary, choose the **Priority** and the **Slide Media & Charge**, and type any **Microtome Bench Instructions**.
7. For a molecular line, choose in-house or sent out, and, if sent out, the reference laboratory.
8. Check the number of blocks selected and the lines in the cart. They multiply: three lines on two blocks make six orders.
9. Select **Submit Add-On Order** (or press Ctrl+Alt+Shift+S). The banner reads "Order submitted.", the cart and the ticks clear, and the orders appear in **Order Tracking** as Requested.

!!! warning "Orders multiply across blocks"
    Every line in the cart is ordered on every ticked block. Tick only the blocks you mean. After submitting, the orders cannot be edited or deleted from this screen; the only ways to change one are through an exception (Modify & Resubmit or Cancel Order) or at the bench.

### Alternative workflow

1. **An IHC panel.** Choose **IHC**, then a panel button. The stain buttons disappear and one **Add to Cart** adds all the stains of the panel. A panel stain that is not in your laboratory's stain list is left out, and a warning under the panel buttons names it: order it separately, or ask your administrator to add it to the stain list.
2. **Several kinds of order at once.** Build the cart across kinds (a recut, then a special stain, then a molecular test) before one submit. Special stains and immunostains go to their benches; recuts go to the histology cutting queue; a sent-out test goes to the reference laboratory queue.
3. **Control slides.** Choose **Separate Control Slide** to add a control slide next to the patient slide (it is marked as a control at the bench), or **On-Slide Control** for control tissue on the same slide.
4. **Order from the report.** The block row of the report screen lists each block, its stains and its status; the **Add-on order** button next to **Edit** opens this screen on that case.

### Exception handling

1. **The bench tells you the block is exhausted.** An order shows the stage **Exception**, with the reason (Block exhausted, Insufficient tissue for panel or Requires re-grossing), the note, and who flagged it. The pathologist who placed the order is also e-mailed the accession, the block and the reason. If the slide was not ordered here (an original H&E, say), or that pathologist has no e-mail address, the Supervisor / Accessioning Desk is e-mailed instead and the technologist is told so; the slide still appears in this list so it can be answered. Type a **Response note** (required only if your organisation requires it) and choose:
   - **Approve Destructive Cutting**, if the block may be cut down to nothing. The bench is allowed to carry on, and the block stays marked Exhausted.
   - **Modify & Resubmit**, to change the level depth or the instructions. The order goes back to Pending at the bench.
   - **Cancel Order**, to drop the order. If the flag was Block exhausted, the block's status goes back to what it was before.
2. **You see a problem with an order yourself.** Select **Flag Exception** on its row (needs the permission to flag a block exception), choose the reason, type a note and select **Flag Exception**. The row then shows the response buttons, which work only for someone with the matching permission.
3. **The bench has pulled the block.** Select **Mark Block Retrieved** (needs the permission to mark a block retrieved) on a Requested order to move it to Block Retrieved.
4. **A block is not available.** If a block is Exhausted, Lost, Damaged or Cancelled you cannot order from it. Ask the technologist to find it, re-embed it, or ask the grossing team for another block.
5. **The test cannot be run in-house.** "This case’s lab doesn’t run … in-house. Choose send-out." Change the line to send-out and choose a reference laboratory.

!!! warning "Approve Destructive Cutting"
    Approving lets the technologist cut the block through to the end, and tissue left on it for other tests may be lost. Approve only when the order justifies it, and write the reason in the response note.

### Error recovery

1. If "No case found for “…”." appears, check the accession and try again.
2. If "Enter or scan an accession number." appears, the search box is empty.
3. If submitting shows "Block A2 is exhausted; no more cutting orders can be placed on it." (or lost, damaged or cancelled), the whole order is refused and nothing at all is placed. Untick that block and submit again.
4. If it shows "Add at least one order line for block …", the cart is empty.
5. If it shows "You don’t have permission for this. Ask your administrator.", your role cannot place orders, approve destructive cutting, flag a block exception or mark a block retrieved (whichever you tried).
6. If it shows "That didn’t go through. The order may have changed; reopen the case and try again.", go **Back**, open the case again and check the Order Tracking list before you submit, so that you do not order twice.
7. If it shows "Not saved: …", the order, the block-retrieved mark, the exception or the answer was not stored (PathScribe first tried again on the newest copy of the case). The case on screen has been reloaded as stored, so nothing shows as ordered that is not. Check the Order Tracking list, then repeat the action once.
8. If you ordered the wrong stain, the screen has no direct delete. Flag an exception on the order (choose the nearest reason and explain in the note), then answer it with **Cancel Order**, and tell the bench.

## Tips and Best Practices

### Common mistakes

- Ticking more blocks than needed. Each line is ordered on each ticked block.
- Leaving the cart unsubmitted. Leaving the page loses the cart; nothing is saved until you submit.
- Choosing Routine Sign-Out for an urgent case. Choose **STAT / Urgent**; the priority is recorded with each order and shown in Order Tracking.
- Ordering a recut without a depth when your laboratory wants one.
- Forgetting that a send-out test needs a reference laboratory.

### Efficiency recommendations

- Use the panels for the common immunostain sets instead of adding stains one by one.
- Use the keys: Ctrl+Alt+Shift+A to add and Ctrl+Alt+Shift+S to submit.
- Open the screen from the report rather than typing the accession.
- Leave the Slide Media at Standard Charged unless the stain needs another kind.

### Workflow recommendations

- Check **Order Tracking** before ordering the same stain again.
- Watch for the e-mail about an exception, and answer it from the tracking list.
- Use the bench instructions for what the technologist cannot see, such as "levels at 50 µm intervals".

## Related Features

### Upstream workflow

- [Report](help:report): the case under review; the **Add-on order** button is in its block row.
- [Microscopic and Material](help:report/microscopic-and-material): the blocks and slides on the case.

### Downstream workflow

- [Microtomy Workstation](help:workstations/microtomy): ordered slides appear as Pending; the technologist's **Block exhausted** button starts an exception here.
- [Slide Distribution Station](help:workstations/slide-distribution): a slide checked out or loaded on a scanner moves the order to Checked Out / Scanned.
- [Molecular Order Queue](help:molecular/order-queue): in-house molecular orders.
- [Batch Management](help:batch-management): staining and other steps of the chain of custody.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Add-on order button on the report | Your role does not include the Add-On Orders screen. |
| A block cannot be ticked | It is Exhausted, Lost, Damaged or Cancelled. |
| Add to Cart is grey | No stain or panel is chosen, or a recut needs a depth. Read the "Still required" line. |
| Submit is grey | No block is ticked, the cart is empty, a sent-out test has no reference laboratory, or you lack the permission. |
| The stain I want is not listed | The stain list shows only stains of the kind you chose; for a recut every stain is listed. Only the first 24 matches are shown; type in the search box. |
| The tracking list does not show an order | Only orders placed here by a pathologist are listed. |
| An order stays at Requested | Nobody has marked the block retrieved or started cutting. |
| A red "Not saved" line | The last action was not stored and the case was reloaded; repeat it. |
| Approve Destructive Cutting is grey | You do not have that permission, or the response note is required and empty. |
| Mark Block Retrieved or Flag Exception is grey | You do not have the permission to mark a block retrieved or to flag a block exception. Ask your laboratory manager. |

### Resolution steps

1. Read the line under the button or the banner at the top.
2. Check the blocks ticked and the lines in the cart.
3. Go **Back** and open the case again to see the current orders.
4. Ask your laboratory manager to check your permission for placing or approving orders.

### When to contact support

Contact your laboratory's PathScribe support when an order is accepted but its slide never appears on the block at the bench, a sent-out test shows no reference laboratory although one is approved, or an exception answer does not clear. Have the case number, the block and the stain ready.
