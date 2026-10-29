---
module: Margin Exception Review
workflow: Bench and Workstation Work
role: [Pathologist, Fellow, Resident, Pathology Assistant]
keywords: [margin, margin distance, distance to margin, exception, free text, tumor board rule, resolve, dismiss, closest margin, millimetres, synoptic answer]
routes: [/margin-exception-review]
previous: report/synoptic-reporting
next: tumor-board
related: [report, report/synoptic-reporting, tumor-board, quality, case-flags]
status: Draft
---

# Margin Exception Review {#top}

## Overview

**Purpose.** When a pathologist types a margin distance in words into a synoptic report field (for example "close to the inked edge" instead of "2 mm"), PathScribe tries to read a number from it. Where it cannot do so with confidence, it does not guess. The answer goes into this review list so that a person can either type in the real distance in millimetres (**Resolve**) or close the item with a reason (**Dismiss**). The number matters because laboratories can set rules that send a case to a tumor board when a margin is closer than a set distance.

**Intended users.** Pathologists, fellows, residents and pathology assistants. These are the roles that have the screen and the permission to resolve exceptions by default. Resolving is a clinical judgment about what the pathologist's words mean, so the buttons are greyed out for anyone without that permission.

**Where it fits.** Items arrive in this list after a case is signed out, one for each margin-distance answer that could not be read. The case's report stays as written. The number you record here is kept separately, out of sight of the report, and is the value the tumor board rules use. See [Tumor Board](help:tumor-board). The screen is one of the tiles in [Quality & Compliance](help:quality), because the work happens after a case is signed out.

!!! note "What is and is not changed"
    Resolving or dismissing never changes the text of the report. It records a hidden number (or a reason for having none) beside the answer, writes an entry in the audit log, and then checks the tumor board rules again for that case straight away. If the number you recorded trips a rule, the case is flagged for that board at once and the screen says so.

## Screen Tour

![The Margin Exception Review list with one row per unreadable margin answer](capture:margin-exception-review-overview)

The screen is titled **Margin Exception Review**. Under the title: "Margin-distance free-text answers the extraction layer couldn't confidently parse into a number. Tag the real distance, or dismiss with a reason." Below is a list with one row for each pending item. When none are waiting the list reads "No pending margin-distance exceptions." Under it, a second list titled **Resolved and dismissed** shows what has already been decided (see below).

### Field definitions

Each row shows the following.

| Part | What it means |
|---|---|
| Patient and accession | The patient's name and the case number. If the case cannot be found the case identifier is shown instead. |
| Field name | The name of the report field the answer was typed into, for example the distance to the closest margin. |
| What was typed | The exact text the pathologist entered. |
| Reason | Why it could not be read: "No answer given yet", "No number found in the text", or "A number was found, but surrounded by text this parser doesn't trust". |
| Margin distance (mm) | A number box, labelled "mm", where you type the real distance. Zero or more, in steps of 0.1. |

**How the system reads an answer.** PathScribe looks only at free-text fields whose names end in a unit of millimetres or centimetres. It accepts a number with its unit ("2mm", "0.5 cm", "<1 mm") and converts centimetres to millimetres. A bare number ("2") is read in the unit the field is named for. Anything else is sent here: no number at all ("cannot be assessed"), or a number in a sentence with other words besides a few plain ones such as "approximately" or "from the margin".

**Examples (demonstration wording).**

| Typed in the field | What PathScribe does |
|---|---|
| 2mm | Reads 2 mm. Not listed here. |
| 0.5 cm | Reads 5 mm. Not listed here. |
| <1 mm | Reads "less than 1 mm". Not listed here. |
| approximately 2 mm from the margin | Reads 2 mm: a few plain filler words such as "approximately", "from the margin" are allowed. Not listed here. |
| 2 (field name ends in mm) | Reads 2 mm. Not listed here. |
| cannot be assessed | No number found in the text. Listed for review. |
| 2 mm from the deep margin, 5 mm from the lateral margin | A number surrounded by other text. Listed for review. |
| (field left empty) | Nothing is read and nothing is listed. |

### Toolbar

| Button | What it does |
|---|---|
| Resolve | Saves the number in the **mm** box as the margin distance for that field, moves the item to **Resolved and dismissed**, writes an audit log entry, and checks the tumor board rules again for the case. |
| Dismiss | Opens the window **Dismiss exception**: type why the field has no distance to give (for example the margin could not be assessed), then select **Dismiss**. The item moves to **Resolved and dismissed**, no number is recorded, an audit log entry is written, and the tumor board rules are checked again for the case. **Cancel** closes the window. |
| Open Case | Opens the case's full report page so you can read the answer in context. Its back control returns to this list. |

Resolve and Dismiss are greyed out for a person without the permission to resolve margin-distance exceptions. **Open Case** is available to anyone who can open this screen. Everyone who can open the screen can also see the typed text and patient name, so treat the screen as patient information.

### Resolved and dismissed

Under the pending list, **Resolved and dismissed** shows every item that has been decided, newest first. It is read-only: each row shows the patient and accession, the field, the text that was typed, either "Resolved: … mm recorded" (the number you recorded, for example 2) or "Dismissed: " followed by the reason, and who decided it and when. **Open Case** is the only button. There is no undo; see Error recovery.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Yellow message under a row | The last Resolve for that row did not work. The text says why. |
| Green message above the list | The decision was saved and the tumor board rules were checked again. It says whether the case was flagged for a board or whether no rule flags it. |
| Yellow message above the list | The decision was saved, but the rule check could not be run again (it will run at the next sign-out), or the audit log entry could not be written (tell your laboratory manager). |
| Buttons greyed while saving | The item is being saved. Wait for it to finish. |
| Dismiss button disabled in the window | The reason box is empty. |

Messages you may see under a row: "Enter a margin distance of 0 or more." (the box is empty, not a number, or negative), "You don't have permission to resolve margin-distance exceptions." and "Couldn't save — please try again."

### Hotkeys

None. This screen has no keys or spoken commands of its own. F1 opens this help article.

## Step-by-Step Procedures

### Standard workflow

1. Open the **Margin Exception Review** tile in [Pathology Workspace](help:pathology-workspace). The list loads. Each row shows who and which field.
2. Read the typed text and the reason for the first row. If you need more context, select **Open Case**; the full report opens, and going back returns to this list.
3. Decide what the pathologist meant. If the text says a distance, such as "about 2 mm to the deep margin", type the distance in millimetres in the **mm** box. For centimetres, multiply by ten: 0.5 cm is 5.
4. Select **Resolve**. The row moves to **Resolved and dismissed**, and a message above the list says whether the case was flagged for a tumor board.
5. If the answer genuinely gives no distance, select **Dismiss**, type the reason (for example "Margin not assessable, specimen fragmented"), and select **Dismiss** in the window. The row moves to **Resolved and dismissed**.
6. Continue until the list reads "No pending margin-distance exceptions."

### Alternative workflow

1. **Check before you decide.** Select **Open Case**, find the synoptic field in the report, and read the surrounding answers (other margins, the diagnosis) before you choose a number.
2. **Ask the pathologist.** If the text is ambiguous, leave the row. It stays in the list until someone resolves or dismisses it.
3. **Change the report answer instead.** If the pathologist re-types the answer with a clear number, the answer is read again the next time the case is signed out, and the earlier pending item for that field is replaced by the new reading.

### Exception handling

1. **Several margins in one text.** The box takes one number for the one field. If the text gives two distances, choose the closest one, since that is the one the rules care about, and say so in the report if needed.
2. **A less-than answer.** For "<1 mm" type 1 (or the nearest number you are comfortable recording). The screen cannot yet record "less than" or "greater than", only an exact number. An answer that PathScribe can read itself, such as "<1mm", is stored as less than and does not come here.
3. **Nothing to record.** Use **Dismiss** and give the reason. A dismissed item records no number, so no margin rule can match that field.
4. **No permission.** If Resolve and Dismiss are greyed out, ask your laboratory manager. You can still read the rows and open cases.

!!! warning "Be sure before you record a number"
    The number you type becomes the value that decides whether a case is offered to a tumor board. A wrong number can send a case to a board it should not go to, or keep it from one it should. Open the case and check the report if you are unsure.

### Error recovery

1. If "Enter a margin distance of 0 or more." appears, type a number in the **mm** box. Use a point for decimals as your keyboard shows it.
2. If "Couldn't save — please try again." appears, select **Resolve** again. If it keeps failing, reload the page; the item is still listed if it was not saved.
3. If you dismissed an item by mistake, there is no undo on this screen, but the item is listed under **Resolved and dismissed** with your reason. Tell the pathologist or your laboratory manager. If the report answer is changed, it is read again the next time the case is checked.
4. If you recorded the wrong number, there is no edit or undo here. Find the row under **Resolved and dismissed** and tell your laboratory manager the case number and the field. The decision and who made it are in the audit log. Note that a case already flagged for a board by the wrong number stays flagged until someone removes it on the [Tumor Board](help:tumor-board) screen.

## Tips and Best Practices

### Common mistakes

- Typing centimetres in the millimetres box. The unit is always millimetres.
- Dismissing an answer that could have been read, only because it is quicker.
- Expecting Resolve to always send the case to a tumor board. The rules are checked again when you resolve or dismiss, but a case is flagged only if a rule matches, and a case already on a board's agenda is left alone. The message above the list tells you the result.
- Looking for an item before its case is signed out. Items arrive only when the case is signed out.

### Efficiency recommendations

- Work through the list from the top; the top list shows pending items only, so the count of rows is your remaining work.
- Keep the report open in another window if you do many items for the same case.
- Ask pathologists to type margins with a number and a unit. Items then never reach this list.

### Workflow recommendations

- Review the list at the end of each day so that tumor board nominations are not delayed.
- Agree in your laboratory who reviews it (for example the pathology assistant on the case, or a rota).
- Use short, specific dismiss reasons that a colleague can understand later. The reason is written to the audit log and shown under **Resolved and dismissed**, so do not put the patient's name in it.

## Related Features

### Upstream workflow

- [Synoptic Reporting](help:report/synoptic-reporting): where the free-text margin-distance answer is typed.
- [Report](help:report): sign-out is the moment answers are read and exceptions are created.
- [Pathology Workspace](help:pathology-workspace): the Margin Exception Review tile.

### Downstream workflow

- [Tumor Board](help:tumor-board): cases are offered to a board by rule, using the margin values read at sign-out or recorded here (the rules are checked again as soon as you resolve or dismiss), or flagged by hand.
- [Case Flags](help:case-flags): other flags on the case.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Margin Exception Review tile | Your role does not include this screen. |
| The list is empty | There are no unreadable margin answers, or the cases have not yet been signed out. |
| Resolve and Dismiss are greyed out | You do not have the permission to resolve margin-distance exceptions. |
| A row's patient shows a long identifier | The case could not be loaded for the name. Select **Open Case** to check. |
| A row is back after reloading | It was not saved. Resolve it again. |
| A decided item is not in the pending list | Look under **Resolved and dismissed**. |
| The message says the rules could not be checked again | The decision is saved. The rules will run again at the next sign-out of the case; ask your laboratory manager if the case needs a board now. |
| A reason says "No answer given yet" | This reason is listed in the screen but cannot currently occur: an empty answer is skipped, not listed. If you see it, open the case, check the field, then dismiss the item. |
| Open Case opens a case I do not expect | The row belongs to a different case; read the accession. |

### Resolution steps

1. Read the message under the row.
2. Check that your number is zero or more and in millimetres.
3. Reload the page and see whether the row is still there.
4. Open the case and confirm the answer text matches the row.

### When to contact support

Contact your laboratory's PathScribe support when a row will not save after reloading, a case you signed out never produces an item although its margin text has no number, or the permission buttons are greyed out for someone who should have them. Have the case number and the field name ready.
