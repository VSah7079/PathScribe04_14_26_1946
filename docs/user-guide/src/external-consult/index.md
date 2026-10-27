---
module: External Consult
workflow: Second opinion
role: [Outside consultant, Pathologist, Laboratory Manager]
keywords: [external consult, second opinion, consult link, outside consultant, revoke link, expired link, opinion, draft, signed opinion, slides in scope]
routes: [/consult, /consult/:token]
previous: report
next: critical-alert
related: [audit-log, report, critical-alert]
status: Draft
---

# External Consult {#top}

## Overview

**Purpose.** An external consult link lets a pathologist outside your laboratory look at the case, or some of its slides, and send back an opinion, without a PathScribe account. This article describes the page the outside consultant opens. It is also for the pathologist or manager who sends the link, so they know what the recipient will see.

**Intended users.** The outside consultant who receives a link. The ordering pathologist and laboratory manager, who issue links and track them.

**Where it fits.** The ordering pathologist issues a link from the case (External Consult Access on the case) and sends it to the consultant by whatever channel the laboratory uses. The consultant opens it, reads the specimens and slides in scope, and submits an opinion. The ordering pathologist then sees the opinion on the case and records how it compares with the report. Every link, its status and its views are listed on the Consult links tab of the [Audit Log](help:audit-log), where it can be revoked.

!!! warning "Demonstration links only today"
    The page itself says so in a banner: "Demo link: no PathScribe server checks it yet. It opens only in the browser that issued it. Its token is random and kept only as a fingerprint." Until PathScribe's server serves consult links, a link works only in the browser where it was issued. Do not send a link to a real outside party as if it were production.

!!! warning "The page masks the patient by default"
    Unless the person who issued the link ticked the opt-in, the consultant sees the accession number and a masked identity: initials with the rest hidden (for example J*** S****) and the date of birth as the year only (**-***-1980). The full name and date of birth are not on the page at all, not merely hidden. The link is still the only protection: anyone who has it can open it, and there is no passcode or identity check yet (Planned, needs the server). Send it through a channel you would use for patient information, and revoke it when it is no longer needed.

!!! info "Dates of birth are always written DD-MMM-YYYY"
    When the full identity is shown, the date of birth appears as day, three-letter English month in capitals, and year (for example 24-OCT-1980), in every language and country. The masked form keeps the same style (**-***-1980). This is the one place PathScribe does not follow the reader's own date format: laboratory dates must not be ambiguous (03/04/1980 means different days in different countries). Other dates on the page, such as when the link expires, still follow the reader's format.

## Screen Tour

![The consult page showing the case, specimens, slides and the opinion form](capture:external-consult-overview)

The page is a single dark card with a banner across the top, the case, the specimens and slides, and the opinion form. There is no menu and no sign-in.

### Field definitions

| Field | What it means |
|---|---|
| Banner | The Demo link notice (see above). |
| PathScribe External Consult | The heading line. |
| Accession number | The laboratory's number for the case. |
| Patient line | Masked by default: first letters only (J*** S****) and "DOB **-***-1980" (the year alone), with a note saying the identity is masked. When the issuer opted in: "Last, First" and "DOB 24-OCT-1980" (always day, English month, year). |
| Expiry banner | Appears only after a Signed opinion is in: "This secure link will expire in 2 views or 46 hours, whichever comes first." The numbers are worked out by the server each time the page opens. |
| Scope line | "Full case access" or "Scoped access" with the number of slides, then "Link expires (date and time)" in the reader's own date format. |
| Specimens & Slides | Each specimen as "label, description", and the slides the link covers. "No slides in scope for this link." if there are none. |
| Your Opinion | The form, or a confirmation once an opinion is in. |
| Diagnostic Category (optional) | Free text. The hint in the box reads "e.g. Benign, Malignant, Indeterminate". |
| Status | **Draft** or **Signed**. |
| Opinion text | The box with the grey prompt "Enter your diagnostic impression / opinion...". Required. |

On the laboratory's side, issuing a link asks for a consultant name or identifier, an optional organization, the access scope (Full Case or Specific Slides) and an optional internal note that the consultant never sees. The default lifetime is 24 hours, or 72 hours if that period would span a weekend.

### The External Consult Access window (for the person who issues links)

The ordering pathologist opens this window from the case. It is headed "External Consult / Second Opinion" and titled **External Consult Access**. A red banner repeats that links are demonstration only today.

| Item | What it means |
|---|---|
| + Issue New Consult Link | Opens the form for a new link. Needs the permission to issue links. Without it the button is greyed out and its tooltip reads "Requires permission to issue consult links." |
| Preview identity (Audit Log, Consult links tab) | For a person who may show full identity but may not issue links (the Lab Director by default). Shows the patient's name and date of birth on screen, for review only; nothing is sent to the consultant. Each use is recorded in the audit log. |
| Each link | The consultant's name and organisation, "Full case" or the number of slides, "Issued" and "Expires" times, a status (Active, Expired or Revoked) and **Revoke** while the link is active. |
| Viewed {{count}}× — last {{last}} | Shown once the consultant has opened the link: how often, and when last. |
| After the signed opinion: 2 views or 46 hours left. | Shown once a Signed opinion is in. When all 3 views are used or 48 hours have passed, it reads "Closed: all views after the signed opinion were used." or "Closed: the time allowed after the signed opinion has passed.", and the status shows Expired. |
| No consult links issued for this case yet. | Shown when the case has none. |
| Opinions received | Below the links, each opinion sent back, marked Draft or Signed. A signed one can be assessed as Agrees, Minor difference or Major discordance, with a note on what differs. A major discordance on an already released report recommends a corrective action to the quality lead. |

**Issue Consult Link form** (title "Issue Consult Link")

| Field | What it means |
|---|---|
| Consultant Identifier | Required. The consultant's name or a description such as "Dr. Jane Reviewer, Outside Hospital Dept. of Pathology". Free text; there is no directory to pick from. |
| Organization | Optional. The hint reads "e.g. Memorial Pathology Associates". |
| Access Scope | **Full Case** or **Specific Slides**. For specific slides, tick the slides to share. If none are recorded the list reads "No slides recorded on this case yet." |
| Note | Optional, for your team only. The consultant never sees it. |
| Show the patient's full name and date of birth to the consultant | Tick box, **off by default**. Leave it off unless the consultant genuinely needs to know who the patient is (the accession, specimens and slides are enough for an opinion). Needs the permission to show full identity (Pathologist and Lab Director by default); without it the box is greyed out. Decided now: to change it later, revoke the link and issue a new one. The audit log records that the opt-in was used, with no patient details. |
| This link would expire around | The expiry date and time the link will get. The default is 24 hours, or 72 hours if that period would cover a weekend. |
| Issue Link | Creates the link. The title changes to **Link Created** and the link is shown to copy and send. |

!!! warning "Send the link only through a secure channel"
    Even masked, the page carries the accession number and the specimens. With the full-identity opt-in the consultant also sees the patient's name and date of birth. Share the link as you would any patient information, and revoke it when it is no longer needed.

### Toolbar

| Button | What it does |
|---|---|
| Draft / Signed | Chooses the status of the opinion you are about to send. |
| Submit Opinion | Sends the opinion. Reads "Submitting..." while it works. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red warning triangle in the banner | The demonstration notice. |
| Green tick box | Your Signed opinion has been recorded and returned. |
| Amber box above the form | Your Draft is saved but has not been returned yet. |
| Red text under the box | The opinion was not sent; the text says why. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

**For the consultant**

1. Open the link you were sent. The page says "Loading..." and then shows the case.
2. Check the accession number against what you were told to expect. The patient shows as initials and a birth year unless the laboratory chose to show more.
3. Read the specimens and the slides listed. Only what the link covers is shown.
4. Optionally type a Diagnostic Category.
5. Choose **Draft** if you are not finished, or **Signed** if the opinion is final.
6. Type your opinion in the large box.
7. Select **Submit Opinion**. For a **Signed** opinion, a green tick and the message "Your opinion has been recorded and returned to the ordering pathologist." replace the form. For a **Draft**, an amber note says it "has been saved as a draft" and "has not been returned to the ordering pathologist yet"; the form stays so you can choose Signed and send it.

**For the ordering pathologist**

1. Issue the link from the case, choose the scope, and send it. Leave **Show the patient's full name and date of birth to the consultant** unticked unless it is needed.
2. Watch for the opinion on the case. A signed opinion can be assessed there: **Agrees**, **Minor difference** or **Major discordance**, with a note of what differs for the last two.
3. If the report was already released and the opinion differs, the case records that a CAPA has been recommended to the QA lead. If the report was not yet released, the screen says no CAPA is recommended and the diagnosis should be revised before sign-out.

### Alternative workflow

1. A draft can be followed by another submission. After you send a Draft the form stays on the page: choose **Signed** and select **Submit Opinion** to return it. Only a Signed opinion is returned to the ordering pathologist.
2. A signed opinion is final. The page says "A signed opinion is final: this link takes no more opinions after it." when you choose Signed. The link then stays open for a short time so you can look again: at most 3 more times you open it, or 48 hours after you signed, whichever comes first. Submitting the Signed opinion does not use up a view; every later opening does, and the banner on the page tells you how many views and hours are left. A Draft never starts this clock.
3. For a long opinion, write it elsewhere and paste it into the box.

### Exception handling

1. **The link does not work.** The page says "This link is invalid or no longer active. It may have expired, been revoked, or never existed. Contact the ordering pathologist for a new link." The page does not say which of these it was.
2. **A signed opinion was already sent.** Opening the link again (up to 3 times, within 48 hours of signing) shows "A signed opinion has already been sent on this link. To add anything, contact the ordering pathologist." After that the link is invalid like any expired link.
3. **The link is revoked while you write.** On submit the page says "This link is no longer active, so the opinion was not sent. Contact the ordering pathologist."
4. **A link needs to stop now.** The laboratory opens the Audit Log, Consult links tab, and selects **Revoke**. It closes at once.

### Error recovery

1. "An opinion is required before submitting." Type your opinion and submit again.
2. "The opinion could not be sent." Check your connection and try once more; if it repeats, tell the ordering pathologist.
3. If you chose Signed by mistake and have not yet submitted, choose Draft before you select Submit Opinion. After a signed opinion is sent it cannot be changed from this page.

!!! warning "Signed means final"
    Once a Signed opinion is submitted, the link accepts nothing more and stops working after 3 more openings or 48 hours, whichever comes first (and never later than the date it was issued to expire). Use Draft until you are certain.

## Tips and Best Practices

### Common mistakes

- Sending a link to the wrong person. Anyone with the link can open it; masking limits what they learn, it does not stop them opening it.
- Ticking the full-identity box out of habit. It is off by default for a reason: use it only when the consultant needs it.
- Leaving a link active after the opinion is in. Revoke it, or let it expire.
- Choosing Specific Slides but selecting none. The laboratory's window asks you to select at least one slide, or switch to Full Case access.
- Expecting the consultant to see clinical history. The consult page shows no clinical history.

### Efficiency recommendations

- Issue a link scoped to the slides in question; the consultant sees less and the case stays tighter.
- Links expire on their own (24 hours, 72 across a weekend) and an expired link opens nothing. There is no one-time-only link: a consultant can reopen it until it expires or is revoked; after a Signed opinion it allows 3 more openings or 48 hours.
- Put the question in the internal note for your own record; it is never shown to the consultant.

### Workflow recommendations

- Check the Consult links tab daily: views, status and expiry show whether the link was used.
- Assess each signed opinion promptly, because a late discordance on a released report should reach the QA lead.

## Related Features

### Upstream workflow

- [Report](help:report): the case the link is issued from.

### Downstream workflow

- [Audit Log](help:audit-log): the Consult links tab lists links, views and revocations.
- [Critical Alert](help:critical-alert): the other page an outside person opens without signing in.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "This link is invalid or no longer active" | It expired, was revoked, was never valid, or the browser is not the one that issued it (demonstration). |
| The address bar shows no code after the page loads | The page removes the code from the address bar on purpose. Reopen the original link if you need it again. |
| "This link is invalid" after I signed | You used the 3 views allowed after signing, or 48 hours have passed. Ask the ordering pathologist for a new link if more is needed. |
| The patient shows as J*** S**** | Normal: identity is masked unless the issuer opted in. Ask the ordering pathologist if you truly need it; they must issue a new link. |
| I cannot see the whole case | The link is scoped to some slides. |
| No slides are shown | None are in scope for this link. |
| The Submit button says "Submitting..." for long | The connection is slow; wait, then try again. |
| I cannot edit my opinion | A signed opinion is final. |

### Resolution steps

1. Check the link was copied whole.
2. Open it in the browser that issued it (demonstration).
3. Ask the ordering pathologist whether it is still active.
4. Ask for a new link if it expired.

### When to contact support

Contact the ordering pathologist first. Contact your laboratory's PathScribe support when a link that should be active is refused, or an opinion was recorded on the wrong case. Have the accession number and the time of the problem ready.
