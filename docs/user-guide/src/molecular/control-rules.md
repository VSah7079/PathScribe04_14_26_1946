---
module: Molecular
screen: Control Rules
workflow: Setting the controls each molecular test requires
role: [Laboratory Manager, Administrator, Molecular Technologist]
keywords: [control rules, assay control rules, required controls, NTC, positive control, calibrator, fixed position, random position, deck slots, sample rack slot, position enforcement]
routes: [/molecular-control-rules]
previous: molecular/rack
next: molecular
related: [molecular, molecular/batch, molecular/rack, molecular/rack-board]
status: Draft
---

# Control Rules {#top}

## Overview

**Purpose.** This screen, headed "Assay Control Rules", defines which controls a molecular test must carry on every plate before the plate can be created, and whether each control is fixed to one well or may go anywhere on the plate. A rule can also name the instrument deck slots where that test's sample rack is allowed to go. The plate builder and the rack screen enforce what you set here.

**Intended users.** Laboratory managers, quality staff and administrators who set or review the rules. Molecular technologists open the screen to see what a plate will be checked against.

**Who can open it, and who can change it.** The page has its own permission and no longer depends on the Molecular screen. Opening it and reading the rules needs "View molecular assay control rules"; holding "Manage molecular assay control rules" also opens it. By default the Administrator, the Laboratory Director and the Quality Reviewer hold the view permission, and so does the Molecular Technologist (and any role that holds the Molecular screen). An administrator can give it to other roles in the Role Dictionary. Changing rules needs the manage permission, which needs the view permission with it; by default the Administrator and the Laboratory Director hold it. Without it the screen is view-only: a line under the title reads "You can read these rules but not change them…", and **+ New Rule**, **Edit** and **Delete** stay on the screen but greyed out. Hold the pointer over one and the tip reads "Your roles don't include" followed by the name of the permission. The same permission is checked again when you save, so a change is never made without it. A person who holds neither permission is shown the "no access" page if they type the address, and the **Control Rules** button on the Molecular screen is not offered to them. The rules themselves are still applied to every plate and rack for everyone who works one, whatever they hold here.

!!! note "This page is not behind the Configuration screen or the Molecular screen"
    Only the Molecular Order Queue demonstration page ([Order Queue](help:molecular/order-queue)) needs the Configuration screen. Control Rules opens for anyone with the view or the manage permission, with or without the Molecular screen. What a person can do on it depends on the manage permission.

**Where it fits.** Rules are set up before plates are built. When a plate is created ([Batch](help:molecular/batch)), PathScribe checks its wells against the rule for its test. The Order Queue also keeps the fixed control wells free when it puts orders on a plate. Rack placement ([Rack](help:molecular/rack)) offers only the deck slots a rule allows. A test with **no rule** has no control requirement at all: the plate builder does not insist on any control for it.

## Screen Tour

![The Assay Control Rules list with a rule being edited](capture:molecular-control-rules-overview)

The page opens with a **← Back to Batches** button, the heading "Assay Control Rules", the line "Define which controls a given assay requires before a batch can be created, and whether each one is fixed to a specific well or allowed anywhere on the plate.", and a **+ New Rule** button.

### Field definitions

**The list of rules**

| Column | What it means |
|---|---|
| Assay Code | The test, shown by its name. |
| Required Controls | One line per control: the control type, then "fixed at A01" or "random position". For example "NTC: fixed at A01" and "PTC (High): fixed at A02". |
| Sample rack slots | The deck slots the test's rack may use, or "Any sample-rack slot" when none are named. |
| Actions | **Edit** and **Delete**. |

When there is no rule yet the table reads "No control rules defined yet."

**The rule form ("New Control Rule" or "Edit Control Rule")**

| Field | What it means |
|---|---|
| Assay * | The molecular test, chosen from the active molecular tests in the diagnostic catalog ("— select assay —" until you choose). Required. Each test can have one rule. |
| Required Controls: control type | NTC (no-template control), PTC (High), PTC (Low) or Calibrator. Patient specimens are not on this list. |
| Required Controls: Position | **Fixed position** (the control must sit in one exact well) or **Random position** (it must be on the plate but may sit in any well). |
| Required Controls: Well | For a fixed control: the well, for example A01 (the box shows "A01" as an example). Disappears for a random control. |
| Reason for this change * | Required, for a new rule, a change and a delete. Type why (for example "new kit lot" or "rule corrected"). It is written to the audit log with your name, the test and the controls. |
| Deck slots for this assay's sample rack | Tick boxes, one for each deck slot that takes a sample rack on any active analyser. The hint reads "Rack Loading offers only these slots for this assay. Leave all unticked to allow any slot that takes a sample rack." When no analyser has a deck layout the section reads "No analyser has a deck layout yet (Configuration → Equipment)." |

Choosing "random" is meant to prevent the same control always falling in the same place on every plate, which protects against a pattern of cross-contamination.

### Toolbar

| Button | What it does |
|---|---|
| ← Back to Batches | Returns to the [Molecular](help:molecular) screen. |
| + New Rule | Opens a blank rule form. Needs the manage permission. Hidden while a form is open. |
| Edit | Opens the rule in the form. Needs the manage permission. |
| Delete | Asks "Delete this control rule?" and for a reason; the confirming **Delete** waits for the reason. Needs the manage permission. |
| + Add Required Control | Adds a control line to the form. |
| Remove | Removes that control line. |
| Save Rule | Saves the form ("Saving…" while it works). Needs the manage permission and a reason. |
| Cancel | Closes the form or the delete question without changing anything. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Greyed-out button | You do not hold the manage permission (the screen is view-only). |
| Red message above or inside the form | A rule was refused, with the reason in words. |
| Delete question | A box titled "Delete this control rule?" with the text "New *test name* plates will no longer be checked for these controls, and its sample racks can go in any sample-rack slot." |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

Adding a rule for a test:

1. Open **Control Rules** from the [Molecular](help:molecular) screen. The list of existing rules opens.
2. Select **+ New Rule**. The form "New Control Rule" opens with one control line already added (NTC, fixed, well A01).
3. Choose the **Assay**.
4. For the first control line, check the type. Choose NTC, PTC (High), PTC (Low) or Calibrator.
5. Choose **Fixed position** or **Random position**. For a fixed position type the well, such as A01, in the Well box. Use the well name as it is on the plate grid.
6. Select **+ Add Required Control** for each further control and fill it in the same way. Use **Remove** on a line you do not want.
7. If the test's sample rack is limited to certain slots, tick them. Leave all unticked to allow any sample-rack slot.
8. Select **Save Rule**. The form closes and the rule appears in the list.

### Alternative workflow

1. **Changing a rule.** Select **Edit** on the row, change what you need, and **Save Rule**. The change applies to plates created from then on.
2. **Removing a rule.** Select **Delete**, read the question, then confirm with **Delete**. Or select **Cancel** to keep it. After a delete the test has no control requirement. Plates already created are unaffected.
3. **Looking only.** If you hold only the Molecular screen, read the list to know where each control must go before you build a plate.
4. **Starting a plate from the rule.** After saving, select **← Back to Batches** and then **+ New Batch**. The controls you listed are now enforced.

### Exception handling

1. **"Choose the assay this rule is for."** You did not choose a test. Choose one in the **Assay** list.
2. **"NTC is set to a fixed position but no well was given."** A fixed control has an empty Well box. Type the well or switch it to **Random position**. The control type named in the message is the line to fix.
3. **"This assay already has a rule. Edit that one instead."** A test can have one rule only. Find its row and use **Edit**. The check applies when you change a rule's test on Edit as well as when you create one.
4. **"You don't have permission to manage molecular control rules."** Your role lacks the manage permission. Ask an administrator.
   **"You don't have permission to view the molecular control rules."** appears instead of the list when the view permission was taken away while the page was open (the page itself needs the view or the manage permission to open).
5. **"This rule no longer exists."** Someone deleted it while you worked. Return to the list.
6. **"Unknown error saving this rule."** The rule was not saved for a reason PathScribe did not recognise. Try again once, then report it.
7. **"Add at least one required control."** A rule with no control lines is refused, because it would check nothing and look as if the test were covered. To stop checking a test, delete its rule instead.
8. **"Enter a reason for this change."** The reason box is empty. Type a reason and save again.
9. **A refusal for lack of permission.** If the permission was taken away while the form was open, the message "You don't have permission to manage molecular control rules." appears in red; nothing is saved.

!!! warning "A rule change affects every new plate"
    Changing or deleting a rule changes what every plate for that test is checked against from that moment. A rule set too loosely lets a plate go ahead without a control that your laboratory's procedure requires. Agree changes with the laboratory director. The screen asks for a reason and writes it to the audit log with your name, so the change can be explained later.

!!! warning "Fixed wells and the Order Queue"
    When the Order Queue puts orders on a plate, it keeps the wells of fixed controls free even if the control is not loaded yet. If you move a control to a different well in the rule, plates built under the old rule may carry the control in the old well. Check a plate against the current rule before you send its worklist.

### Error recovery

1. **You saved the wrong well for a control.** Select **Edit** and correct it. Plates already created keep their layout.
2. **You deleted a rule by mistake.** Add it again with **+ New Rule** and the same assay, controls and slots. PathScribe cannot restore it.
3. **You chose the wrong assay on a new rule.** Select **Cancel** and start again, or change the assay before saving.
4. **A plate was refused after you changed a rule.** Read the red lines on the plate builder. If the rule is right, fix the plate. If the rule is wrong, correct it here and then create the plate.

## Tips and Best Practices

### Common mistakes

- **Typing a well that does not exist on the plate.** The page does not check the well against any plate layout. A rule asking for "A01" on a 6-well plate is fine, but "H12" on a 24-well plate can never be met. Use wells that exist on your usual plate.
- **Listing a control twice.** The page does not stop you. Each line is checked on its own.
- **Wanting a rule only for the rack slots.** A rule needs at least one control. A test that needs only a slot limit must name a control too.
- **Forgetting the deck slots.** Leaving them all unticked allows any sample-rack slot.
- **Leaving a test with no rule.** A test with no rule asks for no control at all.

### Efficiency recommendations

- Set the rule once per test, with fixed positions for the standard controls. A fixed layout makes plates quick to build and easy to check by eye.
- Tick the deck slots in the same session so rack placement is already correct for the first run.
- Use **Random position** only where your procedure calls for varying the control's place.

### Workflow recommendations

- Review the rules whenever a new reagent kit, instrument or plate layout is introduced.
- Tell technologists when a rule changes, because the checks on new plates change with it.
- The reason you type is kept in the audit log; use words someone else will understand later.

## Related Features

### Upstream workflow

- Molecular tests are defined in the diagnostic catalog by an administrator. A test must be active and in the molecular category to appear in the Assay list.
- The instrument deck layouts are set by an administrator under Configuration → System → Workstation & Hardware → Equipment; the slot tick boxes come from there.

### Downstream workflow

- [Batch](help:molecular/batch): the plate is refused if a required control is missing or in the wrong fixed well.
- [Rack](help:molecular/rack): the deck slots offered when you place a rack come from the rule's tick boxes.
- [Molecular](help:molecular): the Order Queue keeps the rule's fixed wells free when it assigns orders.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| I cannot open Control Rules, or the button is missing on the Molecular screen. | Your role holds neither "View molecular assay control rules" nor "Manage molecular assay control rules". Ask an administrator; holding the Molecular screen alone is not enough. |
| New Rule, Edit and Delete are greyed out. | You do not hold the manage permission; the screen is view-only for you. |
| The Assay list is empty or lacks my test. | The test is not active, or not in the molecular category, in the diagnostic catalog. |
| My test has a rule but the plate builder does not ask for controls. | The rule was saved before rules without controls were refused (an old rule). Edit it and add the controls. |
| No slots are offered to tick. | No active analyser has a deck layout with a slot for a sample rack. |
| Save Rule says the assay already has a rule. | One rule per test. Edit the existing one. |
| I changed a rule but an old plate did not change. | Plates keep the layout they were created with. |

### Resolution steps

1. Read the red message; it names the cause.
2. Check which permissions your role holds with your administrator.
3. Check the diagnostic catalog and equipment register for the test and the deck layout.
4. Reload the page and look at the list again.

### When to contact support

Contact your laboratory's PathScribe support when a rule saves but the plate builder behaves as if it were not there, or when the list shows a rule you cannot edit even though you hold the permission. Have the test name and the time of the problem ready.
