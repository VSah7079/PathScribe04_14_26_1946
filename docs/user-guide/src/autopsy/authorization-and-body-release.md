---
module: Autopsy
screen: Authorization and Body Release
workflow: Autopsy case handling
role: [Pathologist, Pathology Assistant, Laboratory Manager]
keywords: [autopsy, authorization, consent, written order, temporary accession, excluded organs, retention, body release, released to, released by, gross examination hold]
routes: []
previous: accession
next: report
related: [autopsy, report, accession, quality]
status: Draft
---

# Autopsy Authorization and Body Release {#top}

## Overview

**Purpose.** An autopsy case can be opened before its legal authority is complete. This article covers the two windows on the report screen that finish an autopsy case at either end: **Complete Authorization**, where the written order or the family's consent is entered so that gross examination can go ahead, and **Release Body**, where you record where the body went once the preliminary diagnosis is signed.

**Intended users.** Pathologists, pathology assistants and the laboratory staff who handle autopsy paperwork. The release needs a specific permission, so the button is greyed out for roles without it.

**Where it fits.** The case is started on [Accession](help:accession) as a temporary accession. Both windows open from the case's [report](help:report) screen. The turnaround figures for the same cases are on the [Autopsy Dashboards](help:autopsy).

## Screen Tour

![The Complete Authorization window for a hospital-consented autopsy](capture:autopsy-authorization-and-body-release-overview)

Neither window has a menu entry of its own. A banner on the report screen opens each one, so this article has no address of its own and is reached from the links in related articles.

### Field definitions

**Complete Authorization window**

The window is titled **Complete Authorization**. Its introduction says to enter the written authorization once it arrives, and that gross examination stays blocked until it is on file. A **Temporary Accession** badge shows while the case is still blocked. What follows depends on how the autopsy was authorized.

| Field | What it means |
|---|---|
| Already on File | A heading above what was recorded at intake: for a legal (medicolegal) case, who gave the verbal order and when; for a hospital-consented case, the family point of contact and their relationship. |
| Written Order | Legal cases only. The heading above the two fields below. |
| Order Reference | The reference number of the written order, for example a coroner's order or form number. |
| Order Date | The date on the written order. |
| Consent Grant | Hospital-consented cases only. The heading above the consent fields. |
| Consent Given At | The date and time the family gave consent. |
| Consent Scope | What the consent covers, typed as words, for example "full" or "no organ retention", separated by commas. |
| Excluded Organs | Organs the consent leaves out of examination or retention, the hint in the box reads "e.g. brain, heart (comma-separated)". Terms the system does not recognise are ignored. Optional. |
| Retention of tissue/organs is permitted | A tick box, ticked at first. Clear it when the family did not agree to keep tissue or organs. |

A red star marks any field your organisation requires. A line beginning "Still required" lists what is missing, and **Save Authorization** stays grey until it is complete. A second badge below the fields previews the result: **Temporary Accession** with the note that gross examination cannot begin until full authorization is on file, or **Fully Authorized** with a note that saving will allow gross examination to proceed.

**Release Body window**

| Field | What it means |
|---|---|
| Released To | Who received the body. The hint reads "e.g. Smith Family Funeral Home". |
| Released By | The staff member who handed it over. The hint reads "e.g. Tech: M. Davis". |

The window is titled **Release Body**, with the line "Record where the body is being released to. This becomes part of the specimen's own permanent location history." If the case is not ready, the window lists the reasons instead of the fields: release needs a signed Preliminary Anatomical Diagnosis (the final report is not required), and it is blocked while an ancillary hold is active.

### Toolbar

| Button | What it does |
|---|---|
| Complete authorization | On the amber report-screen banner "Autopsy: temporary accession, written authorization pending". Opens the Complete Authorization window. Another button beside it lets a person with the override permission continue with a recorded reason. |
| Save Authorization | Saves the authorization on the case and closes the window. A message reads "Authorization recorded". Grey until the required fields are complete. |
| Release Body | On the banner "Autopsy — Ready for Body Release", which appears once the preliminary diagnosis is signed and no hold is active. Opens the Release Body window. |
| Confirm Release | Records the release and closes the window. A message reads "Body released". It shows "Releasing…" while it works, and is grey until both fields are filled or when you lack the release permission. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Temporary Accession | Authority is not complete. Gross examination is blocked. |
| Fully Authorized | The order or consent is on file. |
| Autopsy — Ready for Body Release | The preliminary diagnosis is signed and nothing is holding the case. |

### Hotkeys

| Key | Spoken phrase | Action |
|---|---|---|
| Ctrl+Alt+Shift+3 | "record authorization" | Saves the authorization while the window is open, with the same checks as the button. |
| Ctrl+Alt+Shift+4 | "release body" | Confirms the release while the window is open, with the same checks. |

## Step-by-Step Procedures

### Standard workflow

1. Open the autopsy case's report screen. If the banner reads "Autopsy: temporary accession, written authorization pending", select **Complete authorization**.
2. For a legal case, type the **Order Reference** and choose the **Order Date**. For a hospital-consented case, enter **Consent Given At** and **Consent Scope**, list any **Excluded Organs**, and clear **Retention of tissue/organs is permitted** if retention was refused.
3. Check that the badge below reads **Fully Authorized**, then select **Save Authorization**. The window closes and gross examination can proceed.
4. After the preliminary diagnosis is signed, the banner "Autopsy — Ready for Body Release" appears. Select **Release Body**.
5. Type **Released To**, for example "Smith Family Funeral Home", and **Released By**, for example "Tech: M. Davis". Select **Confirm Release**. The banner disappears and the release joins the body's location history.

### Alternative workflow

1. Use the keys or spoken phrases in the Hotkeys table instead of the buttons.

### Exception handling

1. **The authorization has not arrived.** Leave the case as a temporary accession. Do not enter an order reference you do not have; a person with the override permission can continue with a recorded reason.
2. **The release window lists reasons instead of fields.** Sign the preliminary diagnosis, or wait for the ancillary hold to be lifted.
3. **The consent was narrowed or withdrawn later.** This window does not do that. Use the consent controls on the autopsy panel of the report screen.

### Error recovery

1. If **Confirm Release** shows "Something went wrong. Please try again.", select it again. If the case changed while you worked, reopen the case first.
2. If you do not have permission, the message says so; ask a colleague who holds it.
3. A release cannot be undone from this window. Check both names before you confirm.

## Tips and Best Practices

### Common mistakes

- Leaving the retention box ticked when the family refused retention.
- Typing the person who released the body into **Released To**.

### Efficiency recommendations

- Enter the written order as soon as it arrives so that gross examination is not held up.

### Workflow recommendations

- Record the release the same day, while the names are fresh.

## Related Features

### Upstream workflow

- [Accession](help:accession): where the temporary autopsy accession is created.

### Downstream workflow

- [Report](help:report): sign-out of the preliminary and final diagnoses.
- [Autopsy Dashboards](help:autopsy): turnaround against target.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Save Authorization is grey | A required field is empty; read the "Still required" line. |
| No Release Body banner | The preliminary diagnosis is not signed, a hold is active, or the body was already released. |
| Confirm Release is grey | Released To or Released By is empty, or your role lacks the release permission. |

### Resolution steps

1. Read the line under the fields and fill what it names.
2. Check the case for a hold and for a signed preliminary diagnosis.
3. Ask your laboratory manager about the release permission.

### When to contact support

Contact your laboratory's PathScribe support when a saved authorization does not clear the banner, or a release is confirmed but does not appear in the body's history. Have the case number and the time of the problem ready.
