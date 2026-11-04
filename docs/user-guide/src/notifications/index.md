---
module: Notifications
workflow: Everyday awareness
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [notifications, alerts, badge, unread, urgent, critical finding, critical alert, banner, toast, registry exceptions, my exports, session warning, tone, bell]
routes: []
previous: messaging
next: personal-settings
related: [messaging, critical-alert, report/sign-out-and-release, registry-exceptions, my-exports, session-and-connection]
status: Draft
---

# Notifications {#top}

## Overview

**Purpose.** This page explains how PathScribe gets your attention, what each signal means and how to clear it. PathScribe does not have one single notification centre or a bell icon. Instead it uses a small number of signals, each in a fixed place: numbered badges on the top bar, urgent messages, a critical-finding window at sign-out, short messages that appear after an action, and banners and warnings about your session and connection.

**Intended users.** Everyone who signs in. Which badges you see depends on what your role may open.

**Where it fits.** These signals are always on, whatever screen you are working on. The top bar is the place to look first. Most notices arrive as a message in [Messaging](help:messaging), so that is also where you clear most of them.

!!! note "There is no bell"
    If you were expecting a bell icon with a list of alerts, there is not one in this version. The speech-bubble button with its number is the closest thing, and automatic notices land in your Messages. This page lists every signal that exists today.

## Screen Tour

![The top bar with the speech-bubble badge, the registry exceptions button and the My exports button](capture:notifications-top-bar)

### Field definitions

**What raises a notice, and where it appears**

| Signal | Where you see it | What caused it |
|---|---|---|
| Number on the speech-bubble button | Top bar | Messages you have not opened. Includes notices sent by PathScribe itself. |
| Red speech bubble and a two-beep tone | Top bar | An unread urgent message. |
| Notice from "PathScribe System", "Delivery monitor", "PathScribe follow-up tracking", "LIS Integration" or "System Admin" | Messages | Something happened that needs a person (see the table below). |
| Amber triangle with a number | Top bar | Registry submissions that need attention. Shown only when the number is above zero and your role may open Registry Exceptions. |
| Download arrow, with a number when exports are ready | Top bar | Exports you asked for. Shown when large exports are prepared in the background on your installation. |
| **Critical Finding Detected** window | Report, when you sign out or finalize | The text of the case contains a term that may need an urgent call to the physician. |
| Short message at the foot of the screen | Report and other screens | The result of something you just did: saved, refused, failed. |
| Coloured strip under the top bar | Every screen | Your connection to PathScribe is offline, reconnecting or has been restored. |
| **Session Expiring Soon** window | Every screen | You have been idle and your session will end in under a minute. |
| Live status badge (Live, Local updates, Offline) | Some work screens | Whether the list updates by itself. |

**Notices PathScribe sends to your Messages**

| Notice | Who gets it | What to do |
|---|---|---|
| "Follow-up due soon" or "Follow-up overdue" for a case | Staff responsible for follow-up. Overdue ones are urgent. | Open the case link, then record the outcome or email the ordering clinician in Quality Assurance, Operations, Follow-up. |
| "Delivery failed after N attempts" | Administrators and laboratory directors. Urgent. | Resend the report from its queue; the notice names where the failure is listed. |
| "Case … corrected in LIS, review required" | The pathologist who signed the case. Urgent. | Review the correction and decide whether your synoptic data also needs amending. |
| "High Priority: Interface Exception" | Staff who resolve interface problems. Urgent, with an **Open Configuration** button. | Use the button to go to the exception. |
| "You're presenting at …" | A tumor board presenter. | Open the case link before the meeting. |
| Access request or decision | Case owners, administrators, and the person who asked | Grant or refuse in the screen the notice names, or read the decision. |
| Request for a review or a consultation, or being added as a collaborator | The colleague named | Open the case link and leave an internal note. |
| "Your template request is ready" | The person who asked for a new synoptic template | The template is in the Synoptic Library. |
| Support access request | Approvers. Urgent, with **Open Configuration**. | Approve or refuse in Configuration. |

### Toolbar

| Control | What it does |
|---|---|
| Speech-bubble button | Opens Messages (Alt+I). |
| Amber triangle | Opens the Registry Exceptions screen. See [Registry Exceptions](help:registry-exceptions). |
| Download arrow | Opens My exports. See [My Exports](help:my-exports). |
| × on a short message | Closes it at once. Clicking anywhere on it closes it too. |
| Stay Logged In / Log Out | The two choices in the Session Expiring Soon window. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Blue number badge | A count: unread messages, registry submissions, exports ready. |
| Red badge or red bubble | Urgent. |
| ✓ green short message | Success. |
| ℹ blue short message | Information. |
| ⚠ amber short message | Warning: something needs your attention. Read it; it is announced to screen readers as an alert. |
| ✕ red short message | An action failed. Nothing was changed unless the message says so. |
| Coloured dot in the strip under the top bar | Orange when reconnecting, red when offline, green when restored. |

### Hotkeys

| Key | Action |
|---|---|
| Alt+I | Open Messages |
| Ctrl+Alt+Shift+7 | Send the secure email (in the secure email window) |

No key opens the registry or exports buttons; select them with the mouse.

## Step-by-Step Procedures

### Standard workflow

1. Look at the top bar when you start work. A number on the speech bubble means unread messages; red means at least one is urgent.
2. Select the bubble. Urgent messages are at the top. Open each one.
3. Act on it. Most notices include a case link or a button that takes you to the right screen.
4. When you have dealt with it, leave it read, or delete it from the list. The number on the bubble drops by one each time you open a message.
5. If the amber triangle is showing, select it and work through the submissions listed; the number falls as each is resolved.
6. If the download arrow shows a number, open My exports and select **Download** for each file that is ready.

**Responding to Critical Finding Detected**

1. When you start sign-out (or finalize) and PathScribe's check finds a term that may be a critical finding in the case text, sign-out stops and the **Critical Finding Detected** window appears over the report. It lists each term with the exact words it found. Sign-out can continue once you have recorded the notification or acknowledged the window.
2. Telephone or otherwise tell the responsible physician first. The window records that you did; it does not make the call.
3. Fill in **Notified by** (it starts as your name), **Clinician notified**, and **Method** (Verbal / Phone Call, Secure Page, Direct LIS Flag, Secure Email or Fax).
4. For anything except email, tick **Clinician read back the finding to confirm** when they did. For Secure Email, choose **Write the secure email…**; the notification is recorded when the email has been sent.
5. Select **Record Notification**. The window closes and the record is kept with the case.

### Alternative workflow

1. If the finding was already communicated some other way and you do not want a new record, select **Acknowledge without recording**. Use this only when the communication is already documented.
2. To clear many messages at once, open Messages, select **Edit**, tick them, then **Read All**.
3. If sound bothers you, turn the computer's volume down. The urgent tone cannot be changed inside PathScribe.

### Exception handling

1. **A number never goes to zero.** Messages you sent count too until you open them (see Messaging, Troubleshooting). Open the oldest unread message in the list.
2. **The strip says Offline.** Keep working if you can; changes made by others may be out of date. PathScribe keeps trying and shows Reconnected when it succeeds. See [Session and Connection](help:session-and-connection).
3. **The Session Expiring Soon window appears while you are writing.** Select **Stay Logged In** at once, then save your work. Changes are not saved for you.
4. **You do not see the amber triangle or the download arrow.** Your role may not open that screen, or there is nothing waiting. This is normal.

### Error recovery

1. If you chose **Acknowledge without recording** by mistake, tell your laboratory manager. Acknowledging creates no notification record, so the communication must be documented the way your laboratory's procedure requires.
2. If you opened an urgent message and cannot find it later, open the filter button in Messages and choose **Recently Deleted**; restore it if you deleted it.
3. If a short message flashed past, repeat the action. Most failures say "Try again".

!!! warning "A critical finding window is a patient-safety step"
    The window is a reminder to communicate, not the communication itself. Do not record a notification you have not made. Do not select **Acknowledge without recording** to get past the window.

## Tips and Best Practices

### Common mistakes

- Treating an unread number as unimportant. Urgent notices from the delivery monitor or the laboratory system link to a real failure.
- Ignoring the strip that says Reconnecting. Two people can open the same list and see different things until it clears.
- Replying to a system notice. Nobody reads it; act in the screen it names.
- Closing a short warning without reading it. It says why an action did not complete.

### Efficiency recommendations

- Check the speech bubble, then the amber triangle, then the download arrow: it takes three seconds and covers every badge.
- Use Edit and Read All to clear housekeeping notices, and keep urgent ones open until you have acted.
- Press Alt+I to jump to Messages from any screen.

### Workflow recommendations

- Laboratory managers: look at the delivery and interface notices first thing; they mean a report or a result did not reach its destination.
- Pathologists: do not sign out several cases in a row without reading the notice window for each; each case has its own.
- Everyone: tell your administrator if a notice you expected never arrives, so it can be traced.

## Related Features

### Upstream workflow

- [Report](help:report): finalizing a case can raise the critical finding window.
- [Sign-out and release](help:report/sign-out-and-release): what happens after a case is signed out.

### Downstream workflow

- [Messaging](help:messaging): read, reply to and clear notices.
- [Critical Alert](help:critical-alert): how an automatic critical alert reaches the ordering physician.
- [Registry Exceptions](help:registry-exceptions) and [My Exports](help:my-exports): the two other badged screens.
- [Session and Connection](help:session-and-connection): the connection strip and the session warning.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No sound for an urgent message | The browser keeps sound off until the page has been clicked once; or the computer is muted. |
| The tone plays only once | It plays when an unread urgent message first appears, not on every one after. |
| The speech bubble number is higher than expected | Deleted messages are not counted, but unread messages you sent are. |
| The amber triangle does not appear | There are no submissions needing attention, or your role does not open Registry Exceptions. |
| The critical finding window appeared for a harmless word | The check works on wording, including terms near negations. Record the real situation, or acknowledge it as handled. |
| Automatic critical alerts do not reach the physician | In this version the email, text and record-system channels are demonstration stand-ins and are labelled Simulated. The call you record in the window is what counts. See Critical Alert. |

### Resolution steps

1. Open Messages and read the oldest unread item.
2. Reload the page if a badge looks stale; it refreshes when you return to the window and every minute or so.
3. Check the strip under the top bar for a connection warning.
4. Ask your administrator whether your role should see the registry and export buttons.

### When to contact support

Contact your laboratory's PathScribe support when a critical finding window never appears for a case where you expected one, when a notice you know was sent never arrives, or when a badge number is wrong after a reload. Have the case number, the time and the exact wording on screen ready.
