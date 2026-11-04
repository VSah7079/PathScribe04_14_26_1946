---
module: Report
screen: Case Team
workflow: Case Reporting and Sign-Out
role: [Pathologist, Fellow, Resident, Pathology Assistant, MDT Coordinator]
routes: []
keywords: [case team, participation type, add collaborator, consultant, delegate, delegation, flag for MDT, tumor board, request review, peer review, second opinion, collaborating cases, secure message, primary pathologist, cytotechnologist]
previous: report/sign-out-and-release
next: report/synoptic-reporting
related: [report, report/sign-out-and-release, worklist, tumor-board, messaging, external-consult, case-flags, voice-and-keyboard]
status: Draft
---

# Case Team {#top}

## Overview

**Purpose.** A case has a team: the people who work on it, each in a role called a participation type (Attending / Primary Pathologist, Resident / Fellow, Grossing / PA, Consultant and so on). This article explains how to see and change the team, how to bring in a colleague for a second look (**Add Collaborator**, **Req. Review**), how to hand a case or part of it to someone else (**Delegate**), how to nominate a case for a multidisciplinary meeting (**Tumor Board**), how a colleague finds the case afterwards (the **Collaborating Cases** tile on the Worklist), and how the messages that go with these actions work.

**Intended users.** Pathologists, fellows and residents who share a case; pathology assistants and technologists who appear on the team as grossing staff; MDT coordinators who follow flagged cases. Which buttons work depends on your role (see "Who can do what").

**Where it fits.** The team matters at the end of the case: only an active team member whose participation type can finalize is allowed to sign the case out (see [Sign Out and Release](help:report/sign-out-and-release)). Everything here is on the [Report](help:report) screen's bottom action bar.

!!! note "Demonstration data"
    Messages and review requests are stored in PathScribe's message centre. They do not leave the system. The **Consult** button for an outside reviewer is demonstration or pilot only and is not real security; see [External Consult](help:external-consult).

## Screen Tour

![The bottom action bar with Delegate, Team, Req. Review, Consult, History, Flags and Tumor Board](capture:report-case-team-action-bar)

![The Case Team window with the staff directory on the left and participation types on the right](capture:report-case-team-window)

The buttons for this article sit together on the bottom action bar. They are hidden for a pool case you have not claimed (select **Claim This Case** first).

### Field definitions

**Case Team window**

| Field | What it means |
|---|---|
| Case Team (heading) | The window title. The hint reads "Drag staff cards onto participation types to assign". |
| Staff Directory | Active staff. A search box (**Search staff…**) filters by name or role. Each card shows the name, roles and subspecialty, and small badges for the participation types the person is eligible for. A person already on the case shows **on case** and cannot be dragged again. |
| Participation Types | One lane per type. A lane marked **SINGLE** takes only one person (for example the Primary pathologist); the others take several. |
| Lane badges | **Can finalise** (this type may sign the case out) and **Countersign req.** (a person in this type needs an attending to countersign). |
| Drop preview | While you drag, each lane says **Drop to assign**, **Drop to replace**, **Already assigned — will offer to replace**, or **Not eligible for this role**. |
| (you) | Marks your own card in a lane. |
| Remove, Undo | The remove mark on a person's chip takes them off a lane; **Undo** brings them back before you save. |
| Delegate (in the Primary lane) | Shown on your own chip. You cannot remove yourself as sole primary pathologist; use this to hand the case over. |
| Technical component facility | A pick list below the lanes. Choose another laboratory here when it did the processing, cutting and staining; the report then shows that laboratory's letterhead as well. The default is **None (same lab)**. It saves on its own, with **Saved.** or "Could not save. Reload the case and try again." |
| Footer | "(n) team members", **Unsaved changes**, **Cancel** and **Save**. |

**Participation types built into PathScribe** (your administrator can add more, and a laboratory can change who may finalize):

| Type | Short name | Who it is for | Can finalize | Countersign |
|---|---|---|---|---|
| Attending / Primary Pathologist | PATH | The pathologist responsible for diagnosis and sign-out. Only one. | Yes | No |
| Resident / Fellow | RES | Trainee drafting the report | No | Required |
| Co-Signer / Supervisor | ATT | Supervising pathologist; also FPPE proctor and PA gross sign-off. Only one. | Yes | No |
| Grossing / PA | GROSS | Pathologist assistant, resident or histotechnologist who grossed the case | No | Required |
| Cytotechnologist | CYTO | Screened cytology slides | No | Required |
| Consultant / Subspecialist | CONS | Internal expert reviewing slides | No | No |
| Frozen Section Pathologist | FS | Performed the intraoperative diagnosis. Only one. | No | Required |
| Second Opinion | 2nd Op | Second attending doing a mandatory QA double-read | No | No |
| Provisional Hire (FPPE) | FPPE | A new pathologist under focused review; proctor countersign required | No | Required |

Two more types (Biomedical Scientist and Advanced Practitioner BMS) are offered only in jurisdictions where they exist.

**Delegate Case window**

| Field | What it means |
|---|---|
| Delegation Type (left) | The kinds of hand-over your laboratory has switched on. Each shows a description, and **transfers ownership** where the case changes hands. |
| Delegate To (right) | Recipients. Switch between **Individual** (search "Search by name or role…") and **Pool / Queue** (search "Search pools…"). For a type that sends to a pool, only pools are shown. |
| Select Synoptic | Appears when the type hands over a single synoptic report and the case has more than one. |
| Note | "Add a note…". Labelled **Note (required)** for types that need one. |
| Confirm Delegation | Does the delegation. |

Delegation types as built (an administrator can turn them on or off and add custom types):

| Type | Ownership | Note | On by default |
|---|---|---|---|
| Case Reassignment | transfers ownership | Optional | Yes |
| Move to Pool | transfers ownership (to a pool) | Optional | Yes |
| Second Opinion | You keep ownership and sign-out | Required | Yes |
| Teaching Case | You keep ownership; may go to several recipients | Optional | Yes |
| External Consultation | You keep ownership | Required | Yes |
| Informal Review | You keep ownership | Optional | No (off by default; use **Req. Review**) |
| Tumor Board | Not a sign-out | Optional | No (use **Tumor Board** on the bar) |

**Req. Review window (Request Colleague Review)**

| Field | What it means |
|---|---|
| Review Type | **Informal Review**, **Consultation**, **Second Opinion**, **Clinical Observation** or **Code Review**. |
| Send To | A colleague, chosen from active pathologists (**Search colleagues…**). For Code Review there is no colleague: the case goes to the billing review pool. |
| Additional Context | Optional free text, for example "Please review the deep margin — uncertain if pT1 or muscularis invasion…". |
| Send Request | Sends it. |

The window is headed **Informal Review Request**. While the colleague list opens it says "Loading colleagues…"; if the list is empty it says "No active pathologists found." After sending a Code Review the window says "Case sent to Code Review" and adds the case to the billing review pool; a billing specialist reviews it in Quality Assurance, and it does not block sign-out.

**Flag for Tumor Board / MDT window**

| Field | What it means |
|---|---|
| Board | Breast MDT, GI MDT, Thoracic MDM or Gyn-Onc. |
| Meeting date, Meeting time | Optional. Leave blank if not known; the case lands in the Unscheduled group. Time needs a date. |
| Flag for MDT | Nominates the case. |

### Toolbar

| Button | What it does |
|---|---|
| Delegate | Opens the Delegate Case window. |
| Team | Opens the Case Team window. |
| Req. Review | Opens the Request Colleague Review window. Does not transfer ownership. |
| Consult | Gives an outside reviewer access for a second opinion (demonstration or pilot only). |
| Flags | Opens the Flag Manager (see [Case Flags](help:case-flags)). |
| Tumor Board | Opens the Flag for Tumor Board / MDT window. Greyed out when your role may not flag cases. |
| History | Opens the patient's history. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Peer review banner | Under the header: the state of a peer review before sign-out (see "Peer review before sign-out"). |
| Also opened by | Colleagues who have the case open now. |
| Collaborating Cases tile | A Worklist tile with a count of the cases you are a team member of. |
| Delegated tile | A Worklist tile for cases handed to you that are waiting. |
| Informal review tile | A Worklist tile for informal review requests sent to you. |

### Hotkeys

A key acts only when the screen it belongs to is showing, and is ignored while another window is open in front.

| Action | Key | Spoken phrases |
|---|---|---|
| Add Collaborator | Ctrl+Alt+Shift+0 | "add collaborator (name)", "add a collaborator (name)", "invite collaborator (name)" |
| Open Case Team | Alt+T | "open case team", "case team", "manage team", "show team", "team members" |
| Add Team Member | Alt+M | "add team member", "add participant", "add to team", "assign participant" |
| Assign to Participation Type | Alt+Shift+A | "assign as", "assign to", "set as primary", "set as consultant", "set as grossing" |
| Open Delegation Menu | Alt+D | "open delegation", "delegate case", "transfer case", "show handoff" |
| Request Consultation | Ctrl+Alt+R | "request consultation", "request review", "send for review", "consult colleague", "second opinion", "peer review" |
| Select Peer Review (in the Delegate window) | Alt+1 | "request peer review", "internal review", "informal opinion" |
| Select Formal Consult (in the Delegate window) | Alt+2 | "formal consultation", "add consultant", "official consult" |
| Select Full Transfer (in the Delegate window) | Alt+3 | "full transfer", "transfer ownership", "assign to pool" |
| Confirm Delegation | Ctrl+Enter | "confirm delegation", "send case", "complete transfer" |
| Return to Trainee | Ctrl+Alt+Shift+T | "return to trainee", "reject with notes", "send back to resident" |
| Open Flag Manager | Alt+F | "open flags", "manage flags", "show flags", "add flag" |
| Collaborating Cases (on the Worklist) | Ctrl+Alt+F | "collaborating cases", "show collaborations", "cases i collaborate on" |

How the commands behave:

- **Add Collaborator** is the only one that carries a name. Say the command and the name together ("add collaborator Nguyen"). The hotkey on its own has no name to use, so it tells you to say who to add.
- **Open Case Team, Add Team Member and Assign to Participation Type** all open the Case Team window. They do not pick a person or lane for you; you drag the card yourself.
- **Request Consultation** and its phrases ("request review", "second opinion", "peer review") open the **Delegate Case** window, not the Req. Review window. The **Req. Review** button itself has no spoken command.
- **Select Peer Review** chooses the Informal Review type. Because that type is off by default, a laboratory that has not switched it on sees "That delegation type is turned off. Choose another type." Say "formal consultation" or "full transfer" instead.
- **Confirm Delegation** presses Confirm Delegation with the same checks as the button; it is a spoken form of a deliberate confirmation.
- There is no spoken or keyboard command for the **Tumor Board** button yet other than the button itself; use the bar.

## Step-by-Step Procedures

### Standard workflow

**View the team**

1. On the Report screen select **Team** (or press Alt+T). The Case Team window opens.
2. Read the lanes on the right. Each person on the case appears as a chip in their lane. When the case was assigned to someone not yet on the team, that person is added when the window opens: as the primary pathologist, or as a cytotechnologist if they are a cytotechnologist.

**Change the team**

1. Find the person in the **Staff Directory** (use **Search staff…**).
2. Drag the card onto a lane. The lane previews the result.
   - **Not eligible for this role:** the person's roles do not allow that type. Nothing changes and a message names the role and the type.
   - **Already assigned:** a **(Type) already assigned** window asks whether to **Replace**. It reads "(Name) is currently the (type). Replace with (name)?" and "This only changes the draft — nothing is saved until you click Save below."
3. To remove someone, use the remove mark on their chip. **Undo** reverses it before saving. You cannot remove yourself as the sole primary pathologist: **Cannot Remove Primary** explains this and offers **Open Delegate →**.
4. Select **Save**. The footer shows **Saving…**. If the primary pathologist changed, the case moves to the new primary's Worklist.
5. If you have unsaved changes and select **Cancel** or close the window, **Discard changes?** asks whether to **Keep editing** or **Discard changes**.

**Add a collaborator by voice (an in-lab consultation)**

1. With the case open and no window in front, say "add collaborator" followed by the person's name, for example "add collaborator Nguyen". Titles such as "Doctor" are ignored.
2. PathScribe looks for exactly one active staff member whose first or last name contains every word you said. The name needs to be unambiguous: if no one matches you see **No active staff member matches "(name)".**; if more than one matches you see **More than one person matches "(name)". Say the first and last name.**; if you said no name you see **Say who to add, for example "add collaborator Nguyen".** Nobody is added in these cases.
3. The person is added to the team as a **Consultant / Subspecialist**. The message reads **(Name) added to the case team as a consultant.**
4. They receive a message from you (sent by the app, not typed by you) with the subject "Consultation requested — (case)" and the text "(You) added you to the case team for case (case) as a Consultant. Please open the case link below to review the report and leave an internal note." The case link opens the report with the Internal Notes drawer.
5. If the message cannot be sent, the person is still added, and you see **(Name) was added to the case team, but the message to them could not be sent.**
6. The collaborator now sees the case under **Collaborating Cases** on their Worklist, can read the report and leaves an **Internal Note**. A Consultant cannot sign out the case and does not take ownership.

**Request a colleague's review (informal, no ownership change)**

1. Select **Req. Review**.
2. Choose the **Review Type**, search **Send To**, and optionally add **Additional Context**.
3. Select **Send Request**. The window reads **Review request sent**: "(Name) has been sent a message with a link to case (case)." and "They can open the case and leave an internal note when reviewed."
4. For an **Informal Review** the colleague also gets a request on their Worklist. The other types are message-only.
5. For **Code Review** the case is added to the billing review pool instead: **Case (case) has been added to the billing review pool.** This does not block sign-out.

**Delegate a case**

1. Select **Delegate** (or press Alt+D).
2. Choose a **Delegation Type** on the left, by clicking it or by dropping a recipient on it.
3. Choose the recipient on the right: drag the card onto the type, or click it. For a pool type choose a pool.
4. Type the note. If the type needs one, the field is labelled **Note (required)** and the Confirm button stays greyed out until it is filled.
5. Select **Confirm Delegation** (or press Ctrl+Enter). The window shows **Delegating…** and closes; the message reads **Case delegated.**
6. What happens depends on the type:
   - **Case Reassignment** (transfers ownership): the recipient becomes the primary pathologist and the case moves to their Worklist. You are no longer responsible.
   - **Move to Pool:** the case leaves your list and goes to the pool for any available pathologist to claim.
   - **Second Opinion, Teaching Case, External Consultation and similar:** the recipient is added to the team (as Second Opinion or Consultant) and keeps the case in their view; you remain the owner and sign out.
7. The recipient sees the case under **Delegated**. When the recipient signs the case out, their pending delegations on it are completed.

**Flag a case for Tumor Board / MDT**

1. Select **Tumor Board** on the bar. The window **Flag for Tumor Board / MDT** opens.
2. Choose the **Board**. Optionally set **Meeting date** and **Meeting time**.
3. Select **Flag for MDT**. The message reads **Case flagged for (board).** The case appears on the [Tumor Board](help:tumor-board) screen as Pending Presentation with no presenter.

### Alternative workflow

1. **Hand over only one report.** If your laboratory has a delegation type for assigning a single synoptic report, the Delegate window shows **Select Synoptic** for it. The recipient finalizes that report and an attending countersigns. The standard delegation types listed above do not include this; ask your administrator.
2. **Open from a message.** A colleague's message with a case link opens the report with the Internal Notes drawer ready. Leave a note, then reply in the message centre. See [Messaging](help:messaging).
3. **Use the Worklist.** From the Worklist, select the **Collaborating Cases** tile (or press Ctrl+Alt+F) to list the cases you are a team member of. While the list is showing, the tile reads **← Back to** your case list; select it to return.
4. **Delegate to several people.** For a type that allows several recipients (Teaching Case), click or drop more than one person onto the type. If one of several is refused, the window lists who was delegated and who was not, with the reason, and a **Done** button.
5. **Ask for a peer review before sign-out.** Use the Peer review banner (below), not Req. Review, when you need an independent read of the diagnosis for a first-time malignancy.

### Exception handling

1. **Cytotechnologists cannot be Consultants (or any pathologist type).** A cytotechnologist cannot hold a pathologist role on a case. Adding one by voice reads **(Name) is a cytotechnologist and cannot be added as a consultant.** In the Case Team window the message reads "(Name) is a cytotechnologist and can't be (type). Cytotechnologists can't hold pathologist roles on a case." In the Delegate window: "Cases can't be delegated to a cytotechnologist: a delegation makes its recipient a pathologist on the case."
2. **You may not change the team.** **You are not allowed to change this case's team.** (voice) or "You don't have permission to change this case's team." (window). Ask your manager.
3. **Someone else changed the team first.** **Not saved: someone else changed this case's team while you were editing it. Close and reopen Case Team to see the latest team, then make your changes again.** Nothing is overwritten. By voice: **Someone else changed the team, or it could not be saved. Nobody was added.**
4. **Already on the team.** **(Name) is already on the case team.** Someone you removed earlier is brought back as a consultant.
5. **Delegation refused.** Messages: "You don't have permission to delegate cases.", "Choose a recipient.", "This delegation type sends a case to one recipient only. Choose a single recipient.", "That delegation type is turned off. Choose another type.", "The case or report couldn't be found."
6. **Tumor Board refused.** Messages: "This case is already flagged for a Tumor Board.", "This board's case list is locked for its upcoming meeting — choose a later date.", "You don't have permission to flag a case for Tumor Board.", "Could not flag this case for Tumor Board — please try again."
7. **Review request refused.** "You don't have permission to send review requests." Nothing is sent.
8. **Pool case.** The team buttons are hidden until you select **Claim This Case**.

### Error recovery

1. **Changed the wrong lane.** Before saving, use **Undo** on the chip, or **Cancel** and **Discard changes**. After saving, drag the person to the right lane and save again; the change is recorded in the audit log.
2. **Delegated to the wrong person.** If ownership transferred, ask the new owner to delegate it back, or ask your manager. A non-ownership delegation can be left in place; you still sign out.
3. **Added the wrong collaborator.** Open **Team** and remove them from the Consultant lane, then **Save**. The message already sent stays in their inbox.
4. **Flagged the wrong board.** Open [Tumor Board](help:tumor-board) and ask the coordinator to dismiss or change the listing; the Flag window will not create a second active listing for the same case.
5. **Team window will not save.** Close it, reopen it, and repeat your change.

## Who can do what

| Action | What is needed |
|---|---|
| Change the case team, Add Collaborator | The permission to change a case's team. By default every role that could open a case report has it. |
| Delegate a case | The permission to delegate cases. By default every role that could open a case report has it. |
| Request an informal review | The permission to ask a colleague for an informal review (pathologists by default). |
| Flag a case for Tumor Board | The permission to flag a case for Tumor Board. |
| Ask for, record or override a peer review | Three separate permissions (ask, record, override). The gate itself is off by default. |
| Sign out | An active team member whose participation type can finalize, and the sign-out permission. |

If a button is greyed out, your role does not have the permission; ask your laboratory manager.

## Peer review before sign-out

The Peer review banner appears under the header. It is a different action from **Req. Review**:

- **Req. Review** is a message to a colleague. It never blocks sign-out.
- A **peer review** is a structured independent read, recorded in PathScribe, for a first-time malignancy. The banner says "First-time malignancy for this patient (no prior malignant case)". Depending on your laboratory it is recommended, or sign-out waits for it.
- Any pathologist can still ask for one on a case not yet signed out: **Ask for peer review**, choose the **Reviewer** (another pathologist, never the one signing out), add an optional note and select **Ask for review**.
- The reviewer sees **Record your review**, answers "Do you agree with the diagnosis?" (**I agree** / **I disagree**), gives their diagnosis and, if they disagree, how far apart the reads are (Minor, Moderate, Major).
- On disagreement either pathologist records the outcome with **Record outcome**: **Consensus reached** (with the consensus diagnosis) or **No consensus (unresolved)** (a reason is required, and a corrective action is recommended to the quality lead).
- The requester can **Withdraw** the request (a reason is required).
- Where sign-out is waiting for a review, **Sign out now** lets a pathologist with the override permission sign out for urgent care. Choose the reason; the review is still owed within 24 hours.

## The Collaborating Cases tile

On the Worklist, the **Collaborating Cases** tile counts the cases where you are an active member of the case team, leaving out Finalized and closed cases. It therefore includes cases you were added to as a consultant or second opinion, and also cases where you are a team member in another role. Select it to see the list; select it again (it then reads **← Back to** your case list) to go back. The count and list update as the team changes. Cases that were never given a team do not appear. See [Worklist](help:worklist).

## Case Team window: messages

- Dragging a person onto a participation type shows **Drag staff here** in the empty drop area. Staff are listed on the left; a search with no match says **No staff found**.
- Each assignee has a bin button with the tooltip **Remove from this participation type**.
- If the person's role is not allowed for that type, the window refuses with a message such as "(role) cannot be assigned as (type)."

## Delegation window: messages

The delegation window is headed **Case Action · Delegation**. Search staff or pools; if no staff match it shows **No results for "(search)"**, and an empty pool search shows **No pools found**. When only some people could be delegated, the result lists who was delegated and then **Not delegated:** with the names and reasons.

## Tips and Best Practices

### Common mistakes

- Using **Delegate** with Case Reassignment when you only wanted an opinion. That hands the case over. Use **Add Collaborator**, **Req. Review**, or the Second Opinion type, which keep you as owner.
- Expecting a Consultant to sign out. A Consultant, a Second Opinion and a Resident cannot finalize on their own.
- Saying only the first name of a common name. Say the first and last name if the response is "More than one person matches".
- Removing yourself as primary. The window will not allow it; delegate instead.
- Waiting for a reply with no note. Put the question in **Additional Context** or the delegation note so the reader knows what to look at.

### Efficiency recommendations

- Say "add collaborator (name)" rather than opening the window and dragging a card.
- Use **Req. Review** with a one-line question for a quick look; use Delegate only to change who is responsible.
- Keep the Worklist's **Collaborating Cases** tile in view so requests are not missed.
- Tick the right lane on first drag; the preview before you drop tells you if it is not eligible.

### Workflow recommendations

- Settle the team early. The primary pathologist and any trainee should be on the team before sign-out; the sign-out check looks at the team.
- A trainee who needs an attending's countersign should have a Co-Signer / Supervisor on the case (see [Sign Out and Release](help:report/sign-out-and-release)).
- Use the Technical component facility box when another laboratory processed the case, so the report carries both letterheads.
- Flag for Tumor Board at sign-out or when the diagnosis is clear; leave the date blank if the coordinator will schedule it.

## Related Features

### Upstream workflow

- [Worklist](help:worklist): where you open the case and see Collaborating, Delegated and Countersign tiles.
- [Grossing](help:grossing): the grossing staff who appear on the team.
- [Messaging](help:messaging): where review requests and collaborator notices arrive.

### Downstream workflow

- [Sign Out and Release](help:report/sign-out-and-release): who may sign and how a countersign works.
- [Tumor Board](help:tumor-board): where a flagged case is scheduled and presented.
- [External Consult](help:external-consult): giving an outside reviewer access.
- [Case Flags](help:case-flags): the Flag Manager on the same bar.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The team buttons are missing | The case is still in a pool; select **Claim This Case**. |
| Add Collaborator does nothing | A window is open in front, no case is open, or you said no name. |
| "No active staff member matches" | The name is misspelled, the person is inactive, or two words from different people were combined. |
| "More than one person matches" | Two active staff share the name. Say first and last name. |
| A cytotechnologist cannot be added | By design: cytotechnologists cannot hold pathologist roles or be delegated to. |
| Cannot drop a card on a lane | **Not eligible for this role**: the person's role does not allow that type. |
| "Not saved: someone else changed this case's team" | A colleague saved the team while yours was open. Close, reopen, repeat. |
| The Tumor Board button is greyed out | Your role may not flag cases. |
| The colleague did not get the request | The message is sent from the app; check the message centre. A failed collaborator message says so in the toast. |
| A case does not appear under Collaborating Cases | It is Finalized or closed, or the person is not an active team member. |

### Resolution steps

1. Read the message on screen; it names the person, the type or the permission.
2. Reopen the Case Team window to see the latest team.
3. Check the person's roles with your manager if they are not eligible for a lane.
4. If a spoken command is not recognised, use the button; the window keys also work.

### When to contact support

Contact your laboratory's PathScribe support when a team change will not save after reopening, a delegation shows as done but the recipient cannot see the case, or a message to a colleague never arrives. Have the case number and the time of the problem ready.
