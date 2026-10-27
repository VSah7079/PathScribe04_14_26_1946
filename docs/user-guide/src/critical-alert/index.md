---
module: Critical Alert
workflow: Critical result notification
role: [Receiving physician, Pathologist, Laboratory Manager]
keywords: [critical alert, critical result, reference link, acknowledge reviewed, notification, sms, secure email, expired link, one-time link]
routes: [/critical-alert/:token]
previous: external-consult
next: audit-log
related: [audit-log, report, external-consult]
status: Draft
---

# Critical Alert {#top}

## Overview

**Purpose.** When a case has a critical finding, PathScribe can send the responsible physician a short message by secure email or text. The message carries a reference link. The link opens the Critical Alert page, a small reference page that shows which case and which physician the alert is for, and lets the physician mark it as reviewed. This article describes that page and what the laboratory sees afterwards.

**Intended users.** The physician who receives the alert. The pathologist and laboratory manager, who track whether alerts were opened and acknowledged.

**Where it fits.** The alert is sent in addition to the pathologist's own recorded verbal notification, never instead of it. The recipient opens the link, reads the reference page, and selects **Acknowledge Reviewed**. The laboratory follows the result on the Critical Alerts tab of the [Audit Log](help:audit-log).

!!! warning "The page never shows the patient or the finding"
    By design the page shows no patient name, date of birth, medical record number or clinical detail, and never says what the critical finding is. It shows only the accession number, the physician's name and the status of the link. The physician must get the result itself from the laboratory or from the hospital record. In production, tapping the link is meant to hand off to the hospital's own sign-in; that handoff is not connected in this environment, so only the reference information is shown.

!!! warning "Demonstration and simulated delivery today"
    The page carries the banner "This is a demo/pilot reference link, not a production-secure one." The channels that send the alert (secure email, text message, EHR inbox push) are stand-ins in this environment. The Audit Log marks them **Simulated** and the alert text shows what would have been sent. Do not rely on this page to reach a real physician.

## Screen Tour

![The Critical Alert reference page with the accession number, physician and Acknowledge Reviewed button](capture:critical-alert-overview)

The page is one dark card. There is no menu and no sign-in. The link is the only way in, and it works for a limited time.

### Field definitions

| Field | What it means |
|---|---|
| Banner | The notice described above, with a red warning triangle. |
| PathScribe Critical Alert | The heading line. |
| Accession number | The laboratory's number for the case. It is the only case identifier shown. |
| For | The name of the physician the alert was sent to. |
| Active / Expired | The status of the link. You will normally see Active; an expired link does not open. |
| Link expires (date and time) | When the link stops working. The time is shown in the time zone of the laboratory's facility, and the zone is named beside it (for example MST), so it means the same moment wherever you open the link. |
| Viewed {{count}} time | Reads "Viewed 1 time" or "Viewed 3 times" (the number replaces the braces). How many times the link has been opened, including this view. |
| Acknowledge Reviewed | The button that records your review. |
| Thanks, this review has been recorded. | Shown in place of the button after you acknowledge. |

### Toolbar

| Button | What it does |
|---|---|
| Acknowledge Reviewed | Records that you reviewed the alert, with the time. The laboratory sees it on the Critical Alerts tab. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Green Active badge | The link is valid now. |
| Expired badge | The link's time has passed. |
| Green tick with the thank-you text | The review has been recorded. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

**For the physician**

1. Open the link in the secure email or text. The page says "Loading..." and then shows the reference card.
2. Check the accession number and your name against what you expect.
3. Obtain the result itself from the laboratory or the hospital record. The page does not show it.
4. Select **Acknowledge Reviewed**. A green tick and "Thanks, this review has been recorded." replace the button.

**For the laboratory**

1. Open the [Audit Log](help:audit-log) and choose the **Critical Alerts** tab.
2. Find the case, using **Filter by case** if needed.
3. Read the Channels column to see how it was sent, the Reference Link column to see whether it is Active or Expired and how often it was viewed, and the Acknowledged column for the time of acknowledgement, or "Not yet acknowledged".
4. If an alert is not acknowledged within your laboratory's expected time, contact the physician directly and record the call as your procedure requires.

### Alternative workflow

1. An alert sent only by EHR inbox push has no reference link. The Critical Alerts tab says "No reference link (EHR push only)".
2. If no channel could be resolved (for example no contact details), the tab says "No channel could be resolved". Notify the physician by telephone.
3. Reopening a link after acknowledging shows the confirmation instead of the button, as long as the link has not expired.

### Exception handling

1. **The link is invalid or expired.** The page says "This link is invalid or no longer active. It may have expired or never existed. Contact the laboratory directly for this result." It does not say which. Do not wait: call the laboratory.
2. **You opened the link on a shared device.** The page shows an accession number and a physician name only. Close the tab.
3. **The link was sent to the wrong person.** Tell the laboratory. The Audit Log shows how many times it was viewed.

### Error recovery

1. If the page stays on "Loading...", check your connection and reopen the link.
2. If **Acknowledge Reviewed** seems to do nothing, wait a moment and look for the green tick. If it is still not there, reload; if the button returns, select it again.
3. If you acknowledged the wrong alert, tell the laboratory. The acknowledgement cannot be undone from the page.

!!! warning "Acknowledging is not receiving the result"
    **Acknowledge Reviewed** records that you opened the reference. It does not carry the finding. Never treat an acknowledgement as the clinical handover; the pathologist's recorded verbal notification is the handover.

## Tips and Best Practices

### Common mistakes

- Looking on the page for the finding. It is never shown; ask the laboratory.
- Forwarding the link. It identifies the physician and counts views.
- Waiting on an expired link instead of calling.
- Treating an acknowledgement as proof the physician knows the finding. Only the recorded verbal notification does.

### Efficiency recommendations

- Open the link as soon as it arrives; it expires.
- Laboratory staff: filter the Critical Alerts tab by case, then look at the Acknowledged column first.

### Workflow recommendations

- Review the Critical Alerts tab each shift for alerts with "Not yet acknowledged".
- Treat the automated alert as a prompt, always followed by the pathologist's own call.

## Related Features

### Upstream workflow

- [Report](help:report): sign-out of a case with a critical finding triggers the alert.
- [External Consult](help:external-consult): the other page an outside person opens without signing in.

### Downstream workflow

- [Audit Log](help:audit-log): the Critical Alerts tab shows dispatch, views and acknowledgement.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "This link is invalid or no longer active" | The link expired, was mistyped, or never existed. |
| The page shows no patient or finding | That is by design. |
| The expiry time looks wrong | It is shown in the facility's time zone, named beside the time, not your device's. If your laboratory's time zone setting is wrong, ask your administrator to correct it under Configuration. |
| The acknowledgement time is not shown to me | The page shows only a confirmation; the laboratory sees the time. |
| The Audit Log shows Simulated | The alert channels are stand-ins in this environment; nothing was delivered. |

### Resolution steps

1. Reopen the link from the original message.
2. Check the time against the expiry shown on the card.
3. Telephone the laboratory for the result.
4. Ask the laboratory to check the Critical Alerts tab for the alert.

### When to contact support

Contact the laboratory directly for the result. Contact your laboratory's PathScribe support when alerts are not arriving, a link is refused straight away, or the Critical Alerts tab does not match what was sent. Have the accession number and the time of the alert ready.
