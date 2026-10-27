---
module: Quality & Compliance
screen: Patient Match and Management
slug: quality/patient-matching
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager, Accessioner]
keywords: [patient match review, patient management, merge patients, link patients, move a case, confirm as new patient, duplicate patient, same person, family relation, downtime identity, MRN]
routes: []
previous: quality/access-requests
next: quality/turnaround-and-linkage
related: [quality, accession, audit-log]
status: Draft
---

# Patient Match and Management {#top}

## Overview

**Purpose.** Two Quality Assurance screens look after patient identity. **Patient Match Review** is a queue of new patients whose MRN, name or date of birth only partly matched an existing patient. PathScribe never settles these by itself, because a wrong guess would show one person's history on another person's case. **Patient Management** lets you search for any patient and merge, link or move a case on purpose.

**Intended users.** Quality staff and laboratory managers who are allowed to correct patient identity.

**Where it fits.** Both are tiles on the **Operations** pillar of **Quality Assurance**. Records reach the review queue from [Accession](help:accession). Every action is recorded in the [Audit Log](help:audit-log). See also [Quality & Compliance](help:quality).

## Screen Tour

![Patient Match Review with one record, its accession details and a possible match](capture:quality-patient-matching-review)

### Field definitions

**Patient Match Review.** Each waiting record is a card.

| Item | What it means |
|---|---|
| Name, MRN, DOB, Flagged | The new record and when it was flagged. |
| Needs Review | The status of the card. |
| Reason line | Why PathScribe could not decide. |
| From this accession | The case that created the record: accession number, specimen, "referred by" the requesting provider, "accessioned by" the person and the date. It helps you judge whether two records are one person. |
| Possible existing matches | The existing patients that partly match, each with MRN and date of birth. |
| Organisation | Only for people who may work across organisations. Choose one organisation, or All organisations. Until chosen the screen says to select an organisation, and the box reads "Select an organisation…". |

While the queue opens it says "Loading review queue…". When empty it says nothing is pending review for the organisation.

**Patient Management.** The search box reads "Search by name or MRN…" and finds patients once you have typed two characters. Choose **Select** beside a result. The patient card then shows name, MRN, date of birth, a list of **Real Cases**, and any links: "Same person:" followed by names, and "Family relation:" followed by names. The card also warns about the record's state:

| Warning | Meaning |
|---|---|
| This record was merged into another patient | You are looking at a retired record; the surviving record is usually the right one. |
| Flagged for review | The record is waiting in the match review queue. |
| Downtime/placeholder identity | The record was created during a downtime and stands in for a real patient. |

If the patient has no cases the list says "No real cases under this identity."

### Toolbar

| Button | What it does |
|---|---|
| Confirm as new patient | On a review card. Says this person is genuinely new. The window offers **Confirm as new**. |
| Link | Beside a possible match. Records the two as the same person under a different identity, without merging their cases. The window is **Link patient records**. |
| Merge | Beside a possible match. Moves every case from the new record to the existing patient. The window is **Merge patient records**. It cannot be undone from this screen. |
| Merge Into… | In Patient Management. Merges the selected patient into another. |
| Link To… | In Patient Management. Links the selected patient to another; choose the relationship first. |
| Move a Case… | In Patient Management. Moves one case to another patient. Greyed out when the patient has no cases. |
| New Search | Returns to the search box. |
| Continue | After choosing the target patient. Opens **Confirm Patient Management Action**. |
| Export | On Patient Match Review. Saves the waiting records as a spreadsheet file. Your role must allow it. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Amber dot, Needs Review | Waiting for a decision. |
| Green banner after a merge | Says how many cases were moved to the confirmed patient. |
| Relationship: the same real person | The two records are one person with different names (for example a maiden and married name). |
| Relationship: a family relation | Distinct real people who are related, for example a newborn and mother. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Patient Match Review**. If you may work in several organisations, choose one.
2. Read the reason and the **From this accession** details. Compare the possible matches.
3. If it is the same person as a listed match, select **Merge** (cases move to the match) or **Link** (both records stay, joined as one person). Read the window and confirm.
4. If none is the same person, select **Confirm as new patient**, then **Confirm as new**. The card leaves the queue.

### Alternative workflow

1. In **Patient Management**, search by name or MRN and select the patient.
2. Choose **Merge Into…**, **Link To…** or **Move a Case…**.
3. For a link, choose the relationship. For a move, answer **Which case?**.
4. Search for the target. The title asks **Merge into which patient?**, **Link to which patient?** or **Move to which patient?**. Select the person and choose **Continue**.
5. The window **Confirm Patient Management Action** states what will happen. Choose **Confirm**.
6. A green line reports the result. A merge says how many cases and encounters moved.

### Exception handling

1. When the target is in a different organisation the confirm window adds a warning, and the action is recorded in the audit log.
2. A downtime or placeholder record is retired by the restricted Map Patient tool on the Audit screen, not here. See [Audit Log](help:audit-log).

### Error recovery

1. A move that cannot be done shows "⚠ Move failed:" and the reason. Nothing moved. Correct the cause and try again.
2. A merge cannot be undone from this screen. If you merged in error, contact support before doing anything else.

## Tips and Best Practices

### Common mistakes

- Merging two people who only look alike. Use Link, or Confirm as new patient, when unsure.
- Using Merge for a family relation. Relatives stay separate people.

### Efficiency recommendations

- Read the accession details first; they often settle the question.

### Workflow recommendations

- Clear the queue each day so reports are never filed under a doubtful identity.

## Related Features

### Upstream workflow

- [Accession](help:accession): where a partly matching patient is entered.

### Downstream workflow

- [Audit Log](help:audit-log): the record of every merge, link and move.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Search finds nobody | Fewer than two characters, or the patient is in another organisation. |
| Move a Case… is greyed out | The patient has no real cases. |
| The queue is empty | Nothing is waiting in that organisation. |

### Resolution steps

1. Search by MRN instead of name.
2. Check the organisation chosen.

### When to contact support

Contact your laboratory's PathScribe support after any wrong merge, or when a case shows under the wrong patient. Have both patients' MRNs ready.
