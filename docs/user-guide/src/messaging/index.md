---
module: Messaging
workflow: Everyday communication
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [messages, inbox, compose, reply, urgent, secure email, case link, notice, recently deleted, unread, internal message, send message, edit mode, mark as read]
routes: []
previous: home
next: notifications
related: [notifications, personal-settings, report, worklist, voice-and-keyboard]
status: Draft
---

# Messaging {#top}

## Overview

**Purpose.** Messaging is PathScribe's built-in way to talk to colleagues without leaving the case. It holds your inbox, lets you write a new internal message or reply to one, and lets you send a secure email to someone outside your organisation. It is also where PathScribe delivers notices about your work: a follow-up that is overdue, a report that could not be delivered, an access request waiting for you, a case corrected in the laboratory system.

**Intended users.** Everyone who signs in. Reading messages needs no special permission. Sending a message or a reply ("Send a message or reply") and sending a secure email ("Send a secure email") are two separate permissions. Most roles have both by default, and your administrator can change that. Without the permission the Send button is grey and a line under the form says so; you can still read everything.

**Where it fits.** Messaging is not a page of its own. It is a panel that slides in over whatever screen you are on, opened from the speech-bubble button in the top bar (or with Alt+I). Close it and you are back exactly where you were. A message that mentions a case gives you a link that opens that case; from the case you can return to the panel with one click.

!!! note "Demonstration data today"
    In this version the people you can message come from a small demonstration list of staff and departments (for example Lab Manager, System Admin, QA Team, Billing Dept). Messages are kept in the browser. Secure email is **Simulated**: the window works from start to finish, but no gateway is connected, so nothing is delivered and the window says so. After a send, the window also shows "This message is recorded in the audit log." once the Audit Log entry has been written.

## Screen Tour

![The Messages panel with the message list on the left and a conversation on the right](capture:messaging-inbox)

The panel has a top bar, a list of messages on the left and the open conversation (or the new message form) on the right. On a phone-sized window only one side shows at a time and a back arrow at the top returns you to the list.

### Field definitions

**Message list (left)**

| Item | What it means |
|---|---|
| Sender's name (button) | Opens the message. In Edit mode it ticks or unticks the message instead. |
| Round initials | The first and last initial of the sender. Red for an urgent message. |
| Subject | The subject line, or "(No subject)". |
| Preview | The opening text of the conversation. A reply does not change it; open the conversation to read the replies. A reply, sent or received, moves the conversation to the top of the list (urgent conversations stay first). |
| Time | Today's messages show the time of day, yesterday's say "Yesterday", the past week shows the weekday, older ones the date (with the year once it is over a year old). |
| Blue dot | The message is unread for you. A message you wrote, or a conversation where your reply is the latest, never shows a dot to you. |
| Urgent pill | The message was marked Urgent. Urgent messages sort to the top; within each group the newest comes first. |
| Search box | Filters the list by the sender's name or the message text. It does not search the subject line. |

**Open conversation (right)**

| Item | What it means |
|---|---|
| Name and Urgent badge | Who the message is with, and whether it is urgent. |
| Subject | The subject of the conversation. |
| Case link ("Case" plus the number) | Opens that case. Shown when the message belongs to a case, and for case numbers PathScribe finds written in the subject or text (only for cases you are allowed to open). |
| Open Configuration | Shown on some notices from the system. Takes you straight to the setting the notice is about. |
| Conversation bubbles | Each reply, with the sender and time. Your own are on the right. |
| Reply box | Type a reply and press Enter or the send arrow. Placeholder "Reply…". |
| ⋯ menu | **Mark as unread** and **Delete message**. **Mark as unread** is greyed out, with the tip "You wrote the latest message, so it cannot be marked unread", when you wrote the latest message in the conversation. |

**New message form**

| Field | What it means |
|---|---|
| To | One or more recipients, shown as name tags. Type a name to see suggestions. Required. |
| Magnifying-glass button | Opens **Find a recipient** to search by name or department. |
| Subject | Placeholder "Enter subject…". Required unless your organisation has switched the requirement off (an asterisk beside the label shows what is required). |
| Urgent | Toggles the urgent mark. When on, the button is highlighted in red. |
| Message text | The body of the message. Required. |
| Still required line | A line under the form names anything still missing, for example "Still required: Recipient, Subject". Send stays grey until nothing is missing. |

**Wording you may meet in the messaging window**

- **Find a recipient.** Opened by the magnifying-glass button, whose tooltip is "Browse all internal users". Tick the people you want. The button at the foot reads **Add recipients** (greyed) until you tick someone, then **Add 1 recipient**, **Add 2 recipients** and so on. "No users found." means nothing matches what you typed.
- **Type your message here…** is the hint inside the empty message box of a new message.
- **Send as secure external email** is the tooltip of the **Secure Email** button. It is greyed until the message can be sent that way.
- **Synoptic Template Request** is the title of the banner on a message that asks for a new synoptic template.
- **Open configuration page** is the tooltip of **Open Configuration** on a system notice.
- **Back to message list** is the arrow shown on a narrow screen to leave an open message and return to the list.
- **Permanently Delete Messages.** In Edit mode, **Delete** on ticked messages asks this question first. It says how many messages will be removed and that this cannot be undone. Confirm with **Delete** or cancel.

### Toolbar

| Button | What it does |
|---|---|
| Speech-bubble button in the top bar | Opens or closes the panel. A number on it counts your unread messages; it turns red when any unread message is urgent. |
| Edit / Done (top left of the panel) | Edit mode puts a tick box on each message. **Read All** marks the ticked messages as read; **Delete** moves them to Recently Deleted. Choose **Done** to leave Edit mode. |
| Filter button (three lines) | Chooses **Messages** (your inbox) or **Recently Deleted**. |
| Pencil button (bottom of the list) | Starts a new internal message. Greyed while you are already writing one. |
| Lock-and-envelope button (bottom of the list) | Opens the secure email window ("Send secure external email"). |
| Close (×) | Closes the panel. If you have typed an unsent message you are asked first. |
| Recently Deleted: Restore | Puts a message back in the inbox. |
| Recently Deleted: Delete | Removes one message for good, after a confirmation. |
| Recently Deleted: Delete All | Removes every message in Recently Deleted for good, after a confirmation. |
| New message: Cancel | Leaves the form and returns to the message you were reading. |
| New message: Secure Email | Sends the text you have written as a secure email instead (see the procedures). |
| New message: Send | Sends the message to every recipient. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Number on the speech bubble | Count of messages that are unread for you (deleted ones, and ones you wrote last, are not counted). |
| Red speech bubble | At least one unread message is urgent. A short two-beep tone also plays when an unread urgent message first arrives. Some browsers keep sound off until you have clicked on the page once. |
| Blue dot beside a message | Unread. Opening the message marks it read. |
| Red initials / Urgent pill | Urgent message. |
| "Loading…" | The list is being read. |
| "Your inbox is empty." / "No deleted messages." | Nothing to show. |
| "Select a message to read" | Nothing is open yet. |
| Template request banner | A message that asks for a new synoptic template shows the standard, organ and procedure with a **＋ Create Template** button (for people who build templates). |

### Hotkeys

These keys act while the Messages panel is open. A few of them are also used by the screen underneath; if a key does something else, press Alt+J and then the key (see [Voice and Keyboard](help:voice-and-keyboard)).

| Key | Action |
|---|---|
| Alt+I | Open Messages (from any screen) |
| Escape | Close Messages |
| Alt+Down / Alt+Up | Next message / previous message |
| Alt+Shift+R | Reply |
| Alt+Shift+C | New internal message |
| Alt+Shift+Enter | Send the message or reply |
| Alt+T | Toggle Urgent |
| Alt+S | Search recipients (opens Find a recipient) |
| Alt+R | Add the highlighted recipient |
| Alt+G / Alt+B | Go to Subject / go to the message text |
| Alt+C / Alt+Shift+M | Clear the subject / clear the message text |
| Alt+Shift+E | Open the secure email window |
| Ctrl+Alt+Shift+7 | Send the secure email (while the secure email window is open) |
| Alt+M / Alt+U | Mark as read / mark as unread |
| Alt+A | Mark all as read |
| Alt+Delete | Delete the open message (permanently, if you are in Recently Deleted) |
| Alt+E | Toggle Edit mode |
| Alt+D | Delete all selected |
| Alt+Shift+S | Search messages |
| Alt+V / Alt+Shift+V | View Recently Deleted / view Messages |
| Ctrl+Alt+R | Restore the open deleted message |

Every one of these can also be spoken, for example "open messages". The phrases are in [Voice and Keyboard](help:voice-and-keyboard).

## Step-by-Step Procedures

### Standard workflow

**Read and reply**

1. Select the speech-bubble button (or press Alt+I). The panel opens with your messages, urgent ones first.
2. Select a sender's name. The conversation opens on the right and the blue dot goes away.
3. Type your answer in the **Reply…** box and press Enter. Your reply appears as a bubble on the right. The other person sees the conversation as unread again; you do not.

**Write a new message**

1. Open the panel and select the pencil button. The **New Message** form opens.
2. In **To**, start typing a name. Choose a suggestion with the arrow keys and press Enter or Tab, or select it with the mouse. The name appears as a tag. Repeat for more recipients; Backspace in an empty box removes the last tag.
3. Type the **Subject** and the message text.
4. Turn on **Urgent** only when the message cannot wait. Urgent messages ring a tone and show red on the recipient's bubble.
5. Select **Send**. The form closes and the message is in your list.

**Message a colleague from the Worklist**

1. On the [Worklist](help:worklist), find the case and look in its Staff column. Each person has a small envelope button ("Message" and their name).
2. Select it. The panel opens already addressed to that person, with the subject "Case" plus the case number.
3. Write your text and select **Send**.

**Open the case a message is about**

1. Open the message and select the **Case …** link beside the subject.
2. The panel closes and the case opens in the [Report](help:report) screen.
3. To return, select **← Back to Messages** at the top left of the report. The panel opens again.

### Alternative workflow

**Send a secure email to someone outside your organisation**

1. Select the lock-and-envelope button at the bottom of the message list (or write your message first and select **Secure Email** on the form, which carries over your subject and text).
2. In the **New Secure Message** window, check the **From** line. If your laboratory has set up more than one secure gateway, choose one in **Send through**.
3. Type the recipient's address in **To**. For a clinical messaging gateway the box is **To (recipient ID)** and takes the recipient's ID in that network's directory.
4. Type the **Subject** and the message.
5. Leave **Contains patient or case details** ticked if the message names a patient or a finding. Untick it only when it truly does not. A gateway that has no agreement in force with your organisation cannot carry patient details; the window says so and keeps **Send Securely** grey.
6. Select **Send Securely**. You see "Message sent securely" and who it was delivered to. In this version you also see a line beginning "Simulated" because no gateway is connected.

**Clean up**

1. Select **Edit**, tick the messages, then **Delete** (they go to Recently Deleted) or **Read All**.
2. To recover one, choose the filter button, then **Recently Deleted**, hover over the message and select **Restore**.

### Exception handling

1. **You cannot send.** If Send is grey and a line says "You don't have permission to send messages.", your role cannot send messages. You can still read. Ask your laboratory manager.
2. **A notice asks you to act in Configuration.** Select **Open Configuration**. If you cannot open Configuration, forward the notice to your administrator.
3. **A message mentions a case you cannot open.** The number stays plain text, with no link. This is deliberate: PathScribe does not confirm that a case exists to someone who cannot open it.
4. **You want to write to someone who is not in the list.** Use secure email if they are outside your organisation. Staff who do not appear in the recipient list must be added by your administrator.
5. **Secure email says your lab has no secure messaging gateway.** An administrator sets one up in the laboratory's facility settings, under Secure messaging.

### Error recovery

1. **"The message could not be sent. Try again."** Your draft is kept. Select **Send** again. Several recipients are sent one after another; if one fails, the ones before it have already gone.
2. **You closed the panel by mistake with a draft open.** If you had typed message text, PathScribe asks "You have an unsent message. Are you sure you want to close?" Choose Cancel to keep writing. A draft with only a subject is not counted as unsent text.
3. **You deleted a message by mistake.** Open Recently Deleted and select **Restore**.
4. **You marked a message read and need to remember it.** Open the ⋯ menu and choose **Mark as unread**.
5. **A permanent delete** ("Permanently Delete Message", "Empty Deleted Messages") cannot be undone. Read the confirmation before you accept it.

!!! warning "Permanent deletion cannot be undone"
    Delete in the inbox only moves a message to Recently Deleted. **Delete** inside Recently Deleted, and **Delete All**, remove messages for good after a confirmation. Do not delete a notice you may need as evidence of a critical result conversation.

!!! warning "Patient details in messages"
    Internal messages stay in PathScribe. Secure email leaves your organisation. Put patient details only in a secure email, through a gateway that shows an agreement on file, and use case numbers rather than names wherever you can.

## Tips and Best Practices

### Common mistakes

- Writing the patient's name in a message when the case number is enough. Use the case number; the recipient can open the case from the link.
- Using Urgent for routine questions. When everything is urgent, nothing is. Reserve it for results and problems that cannot wait.
- Expecting a reply to a system notice to reach a person. Notices from "PathScribe System", the delivery monitor or follow-up tracking are automatic. Act on them in the screen they name; do not wait for an answer.
- Searching for a subject in the search box. It looks at the sender's name and the message text only.
- Looking in the list for the newest reply. The preview keeps the opening message; open the conversation to read the replies. A new reply shows as a blue dot and moves the conversation to the top of the list.

### Efficiency recommendations

- Press Alt+I to open Messages from any screen, Alt+Down and Alt+Up to move through messages, and Escape to close.
- Use the envelope on the Worklist's Staff column to start a message already addressed and subjected.
- Use Edit, then **Read All** to clear a run of notices in one action.
- Say "open messages" if you work by voice.

### Workflow recommendations

- Check the red speech bubble at the start of the shift and after a break. An unread urgent message is the most common thing that needs action first.
- Keep case conversation attached to the case: use the case link and the internal notes rather than long threads.
- Close the panel when you are done. It stays open across a page reload within the same session.

## Related Features

### Upstream workflow

- [Notifications](help:notifications): what raises a message, a badge or an alert, and what to do about each.
- [Worklist](help:worklist): the Staff column starts a message about a case.
- [Report](help:report): sending a review request or adding a collaborator sends the colleague a message.

### Downstream workflow

- [Report](help:report): the case link opens the case; **← Back to Messages** returns you.
- [Personal Settings](help:personal-settings): your language, station and personal lists in the top bar.
- [Voice and Keyboard](help:voice-and-keyboard): every message command and the phrases that run it.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Send is grey | Recipient, subject or text is missing (read the "Still required" line), or your role may not send messages. |
| The Secure Email button on the New Message form is grey | It needs the same fields as an internal message, including a recipient. Use the lock-and-envelope button at the bottom of the list to open the secure email window directly. |
| My own sent message appears in my list | Your list holds the messages you sent as well as those you received, and each row shows the sender's name, which is yours for a message you sent. Your own messages and replies never show a blue dot or count in your number. **Mark as unread** is greyed out on a conversation where you wrote the latest message; its tip says so. |
| No sound for an urgent message | The browser has not been allowed to play sound yet. Click anywhere on the page once; check the computer's volume. |
| A case number in a message is not a link | You cannot open that case, or the number is not a known case number. |
| Secure email says "Simulated" | No secure-mail gateway is connected in this version. Nothing was delivered. |
| The panel opens again after I reload | It remembers that it was open within the same session. Select Close. |
| I cannot find a person | The recipient list shows only the staff your organisation has loaded. |

### Resolution steps

1. Read the line under the form: it names exactly what is missing or refused.
2. Check that the panel is open on the right side (**Messages**, not **Recently Deleted**).
3. Close the panel and open it again to reload the list.
4. For a refused send, ask your laboratory manager whether your role includes "Send a message or reply" or "Send a secure email".
5. For secure email problems, read the message in red in the window; it names the gateway and the missing agreement.

### When to contact support

Contact your laboratory's PathScribe support when messages you know were sent never arrive, when the unread number does not match the list, or when a send is refused although your manager has confirmed your permission. Have the time, the sender and recipient names and the case number (never the patient's name) ready.
