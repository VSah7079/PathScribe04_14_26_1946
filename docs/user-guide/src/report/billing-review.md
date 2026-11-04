---
module: Report
screen: Billing Review
workflow: Case Reporting and Sign-Out
role: [Pathologist, Laboratory Manager, Quality Staff]
routes: []
keywords: [billing review, AI billing code review, CPT, billing codes, base code, ancillary code, confirm all, override, Smart Capture, charge approval, charges awaiting approval, billing correction, credit, biopsy array, evaluated cores]
previous: report/sign-out-and-release
next: report/case-team
related: [report, report/sign-out-and-release, report/synoptic-reporting, quality]
status: Draft
---

# Billing Review {#top}

## Overview

**Purpose.** Shows the billing codes PathScribe suggests for a case, lets the pathologist confirm, replace or remove them, and covers the three related windows used after sign-out: Smart Capture, the approval list for charges, and the billing correction window.

**Intended users.** Pathologists review and confirm codes. Laboratory managers and quality staff approve or correct charges.

**Where it fits.** The review sits on the Report screen (Orchestration mode) beside the report, before sign-out. Charge approval and billing correction are opened from the Financials area of [Quality & Compliance](help:quality).

## Screen Tour

![The AI Billing Code Review panel](capture:report-billing-review-overview)

### Field definitions

| Field | What it means |
|---|---|
| AI Billing Code Review | Title of the panel. Suggestions come from the stains and blocks recorded on the case. |
| Pending review | Suggestions waiting for a decision. A line reads "N codes need review before sign-out". |
| Specimens | The list of specimens on the case. A line reads "No specimens on this case yet." when there are none. Each specimen can be expanded to show its blocks. |
| Expand stains / Collapse stains | The small arrow beside a block shows or hides the stains under it. |
| Billing codes | The detail for the specimen or block you select. |
| Base code | The main code for the specimen. When none is set the panel says "No base code applied yet." (the list shows "No base code"). |
| Applied codes | Codes already confirmed for the selected block. |
| AI source | The stain that produced a suggestion. When the stain is unknown the line says "stain not recorded". |
| Replace with | The area where you choose a different code when overriding a suggestion. |
| Search codes… | Opens the code search. After a code is picked the button shows the code and its description. |
| This code is already applied here. | Warning when the code you picked is already on that block. |
| Add a code manually | Adds a code that the system did not suggest. |
| Evaluated / Reviewed for Diagnosis | A tick box, one per specimen, in the Biopsy Array section. |
| Biopsy Array — Evaluated Cores | Section for a case with a biopsy array. Billing only counts a core that a pathologist confirms was evaluated on the stained slide. Ordering a stain for a core does not bill it by itself. |

**Code search window (Search Billing Codes).** It opens from **Search codes…** and from the block's code buttons.

- "Start typing to search." shows before you type. Matches are grouped; codes that fit the level you are working at are listed first, and **Other codes** lists the rest. If none fit the level, "No matching … codes found." names the level (block, specimen or stain).
- **All stains** ticks every stain of the block in one step and then reads **Deselect all stains**.
- **Added this session** lists the codes you have added since the window opened.

### Toolbar

| Button | What it does |
|---|---|
| Confirm All (N) | Applies every pending suggestion in one step. N is how many are waiting. |
| Override | Opens a card to replace a suggested code with another one. |
| Remove this billing code (bin icon) | Removes a code that was already applied. |
| Dismiss — no code needed for this stain (bin icon) | Rejects a suggestion because the stain needs no billing code. |
| No replacement needed — reject only | Inside Override: rejects the suggestion and adds nothing in its place. |
| Save Evaluation | Saves which cores you ticked as evaluated. |
| Reject | In the Biopsy Array section: rejects the suggested code for that stain. |
| Smart Capture | Opens the Smart Capture drawer (see below). |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Applied | A code has been confirmed. |
| Pending review | A suggestion waits for a decision. |
| Declined — no code applied | The suggestion was rejected and nothing replaced it. |
| No codes | Nothing was suggested or applied. |

After a decant is added, changed or removed on the Material tab, a notice says that expected charges were recalculated. If a material change could not be saved, a notice says the charges are back to the saved state.

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open the Report screen in Orchestration mode and choose **$ Billing review**. The panel titled **AI Billing Code Review** opens.
2. Read the line that says how many codes need review.
3. Select a specimen, then expand a block with the arrow (**Expand stains**) to see its stains.
4. Check each pending suggestion and its **AI source** line.
5. Choose **Confirm All (N)** to accept all of them, or decide one at a time as described below.
6. Make sure each specimen shows a base code before you sign out.

### Alternative workflow

1. To replace one suggestion, open its card and choose **Override**.
2. Select **Search codes…**, pick the new code, then confirm. The original suggestion is rejected and the new code applied together.
3. To reject without a replacement, choose **No replacement needed — reject only**, or the bin icon (**Dismiss — no code needed for this stain**).
4. To add a code the system did not suggest, choose **Add a code manually** under **Billing codes**, then **Search codes…**.

### Exception handling

1. If a specimen has no base code, add one with **Add a code manually**. Sign-out opens this panel when an ancillary code exists without a base code.
2. For a biopsy array, tick **Evaluated / Reviewed for Diagnosis** for each specimen you actually evaluated on the slide, then choose **Save Evaluation**.
3. To remove a code that was applied by mistake, use **Remove this billing code**. A removed suggested code can come back as a new suggestion, because the stain evidence has not changed.

### Error recovery

1. If the code search shows **This code is already applied here.**, pick a different code.
2. If a notice says a material change was undone, check the Material tab and repeat the change.
3. For a code that was already charged, use the billing correction window described below instead of removing it.

## Smart Capture (prototype)

Smart Capture is a prototype that suggests charge lines for a person to check. It only appears when your laboratory has switched it on, and it carries the badge "Prototype, not compliance-reviewed". In the demonstration it talks only to a simulated engine and nothing reaches a payer.

1. Choose **Smart Capture**. The drawer shows **Making suggestions…** and then a list of lines.
2. Each line shows the CPT code, a plain description and the units, then "Specimen {{specimen}} · rule {{rule}}" (the specimen label and the rule that produced the line) and the evidence behind it, such as the blocks or stains counted or the word that matched.
3. A line starts as "Not yet reviewed". Choose **Accept** or **Reject** on each.
4. A line above the list reads "Status: {{state}}. Rule set {{version}}." (for example "Status: Suggested. Rule set 3."). The status moves through Suggested, Reviewed, Approved and Exported.
5. Tick "I have reviewed the accepted lines and confirm them as the pathologist." Only a pathologist can do this.
6. Choose **Approve accepted lines**. The lines are locked.
7. Choose **Export approved lines**. A **Structured payload preview** shows exactly what was handed on. In the demonstration the message says it was simulated.
8. To change locked lines, choose **Start again**. This also happens when the case or the rules changed ("The case or the rule set changed after the earlier review. Open the drawer again to make fresh suggestions.").

If the case's jurisdiction does not use CPT, the drawer says nothing is suggested.

!!! warning "Known limit: simulated engine"
    Smart Capture is a prototype. Exporting sends the lines to a simulated engine in this version, and no claim reaches a payer.

## Charges awaiting approval

Some laboratories require a second person to approve charges before they go to the billing system. The list is under Financials in Quality & Compliance.

| Column | Meaning |
|---|---|
| Charge | The source, CPT code and modifier. |
| Type | Charge, or Credit when an earlier charge is being reversed. |
| Performing lab | The laboratory the charge belongs to. "Lab not known" means it cannot be worked out from the case; check the case's ordering facility. |
| Status | "Awaiting approval" or "On hold". |
| Drafted | When the charge was drafted. |

Choose **Approve**, **Hold**, **Release hold** or **Reject**. **Reject** opens **Reject charge**, where you give a **Reason**; the charge is not sent. You cannot approve or reject a charge that you drafted yourself. When nothing is waiting, the list says "No charges are waiting for approval."

## Billing correction

The billing correction window changes a charge after sign-out without opening the case. The correction is recorded as a billing deficiency and audited.

1. Type a **Case ID or accession number** (for example S26-12345) and choose **Find case**. The window says **Loading the case…**, or that no visible case matches.
2. Choose the **Correction**: Change the CPT code, Change the modifier, Add a missing charge or Reverse the charge.
3. For a change or reversal, pick the charge under **Charge** (**— Select a charge —**). If the case has none, the window says "This case has no active charges."
4. For a new code, type the **Corrected CPT code** (for example 88307). For a modifier change, type the new modifier (for example 26) under **New modifier (leave empty to remove it)**.
5. To add a missing charge, pick the **Specimen** (**— Select a specimen —**), the **Block** (or **The whole specimen**) and the **Billing code** (**— Select a billing code —**).
6. Choose a reason, write a **Comment** that says what was wrong and what was changed, then choose **Save correction**.

The original charge is credited and, where needed, a new charge is made. If your laboratory requires approval, both wait in the list above.

### Correct a single applied code

In the billing review, the correct-code action on an already charged code opens **Correct Billing Code**. Enter the **Corrected CPT Code** (it must differ from the original) and choose **Correct Code**. The original is credited and a new charge made.

## Tips and Best Practices

### Common mistakes

- Using Confirm All without reading the AI source lines. Check unusual stains first.
- Ticking every core in a biopsy array. Only tick cores you evaluated.
- Removing an already charged code. Use a correction so the original is credited.

### Efficiency recommendations

- Use **Confirm All (N)** when the suggestions are straightforward, then override the few that differ.

### Workflow recommendations

- Finish the billing review before opening the sign-out window.

## Related Features

### Upstream workflow

- [Synoptic Reporting](help:report/synoptic-reporting): the stains and blocks recorded here drive the suggestions.

### Downstream workflow

- [Sign Out and Release](help:report/sign-out-and-release): the Coding Summary and the base code check.
- [Quality & Compliance](help:quality): billing deficiencies and the Financials area.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Smart Capture button | Your laboratory has not switched the prototype on. |
| Approve is refused | Only a pathologist can approve; every line must be accepted or rejected first, and at least one accepted. |
| Cannot approve a charge | You drafted it, or you lack permission for that laboratory. |
| Correction says there is no active rule | The billing dictionary has no rule for that code on the date of service. |

### Resolution steps

1. Read the message under the button; it names the missing step.
2. Complete that step and try again.

### When to contact support

Contact your laboratory's PathScribe support when a message about a missing performing lab or rule persists. Have the case number and the time of the problem ready.
