---
module: Personal Settings
workflow: Everyday setup
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [personal settings, profile, user menu, language, theme, macros, dictionary, my dictionary, voice commands, station, bench, compact header, biometric, system information, sign out]
routes: []
previous: notifications
next: case-flags
related: [messaging, notifications, voice-and-keyboard, case-search-bar, session-and-connection, clinical-links, report, sign-in]
status: Draft
---

# Personal Settings {#top}

## Overview

**Purpose.** This page explains the settings that belong to you: the language of the screen, your own spelling dictionary, the voice commands PathScribe has learned from you, your text shortcuts (macros), the bench your computer is set to, and how compact the report header is. It also describes the account menu at the top right of every screen.

**Intended users.** Everyone who signs in.

**Where it fits.** There is no single "Settings" screen. Your personal choices are spread over the top bar, the account menu, the Report screen and, for macros, the Configuration screen. This page tells you where each one lives and who it stays with.

!!! note "Whose setting is it?"
    Some choices follow **you** to any computer you sign in on (screen language, your dictionary, learned voice commands). Some belong to **the browser** on the computer you are using (compact report header, light or dark editor). Some belong to **the computer** (the scan station). The table in the Screen Tour shows which is which.

!!! note "Things that are not in this version"
    There is no page-wide light or dark theme choice, no personal signature setting, and no screen for managing the dictation corrections PathScribe learns. Each is explained below.

## Screen Tour

![The top bar with the station button, language switcher and account badge](capture:personal-settings-top-bar)

### Field definitions

**Where each personal choice is kept**

| Choice | Where you change it | Stays with |
|---|---|---|
| Screen language | Language switcher in the top bar | You |
| My dictionary | Account menu, **My dictionary** | You |
| My voice commands | Account menu, **My voice commands** | You |
| Voice accent | Configuration, Voice, **Regional Accent Profile** | You |
| Spelling language for one report | **Spelling** list on the report | That case |
| Personal macros | Configuration, Macros tab, **My Macros** | You |
| Compact or full report header | Report header button | This browser |
| Light or dark editor | Editor toolbar button | This browser |
| Scan station (bench) | Station button in the top bar | This computer |

**The account menu**

Select your initials or name at the top right (its tooltip is "Account and system information"). A panel shows your initials, name and role, followed by these items:

| Item | What it does |
|---|---|
| **User Guide** | Opens this guide. |
| **Admin Guide** | Opens the administrator guide. It is labelled "all users in demo", so every demonstration user can open it. |
| **My dictionary** | Opens your spelling dictionary. |
| **My voice commands** | Opens the voice phrases PathScribe has learned for you. |
| **Biometric signing** | Shown only when your laboratory's policy turns it on. Works as a demonstration (see below). |
| **System Information** | Shows technical details for support. |
| **Close** | Closes the panel. |

**System Information** has sections for User, Application, AI Provider, Browser & System and Connectivity. **Copy to Clipboard** copies a support report. The report hides your name and ID. The Secure Email line reads "Not wired (stub)" because secure email is a demonstration today.

### Toolbar

| Control | What it does |
|---|---|
| PathScribe logo | Goes to Home. |
| Light bulb (Enhancement Request) | Opens a form to suggest an improvement (Alt+Y). Your administrator decides whether it is sent by email or delivered to a page on the ForMedrixAI website. |
| Bug button | Opens QA/Testing Feedback. Appears only if your administrator has turned it on (Alt+X). It includes an **AI / Template validation** category. |
| Search bar | Finds a case. See [Case Search Bar](help:case-search-bar). |
| Station button with a pin | Shows and changes the scan station. |
| **Go to Bench** | Appears when your station has a bench screen ready. |
| Voice toggle | Turns voice commands on and off. See [Voice and Keyboard](help:voice-and-keyboard). |
| Speech bubble | Messages. See [Messaging](help:messaging). |
| Amber triangle, download arrow | Registry exceptions and My exports. See [Notifications](help:notifications). |
| Link button (Clinical Links) | Opens a list of outside references. See [Clinical Links](help:clinical-links). |
| Language switcher | Changes the screen language. |
| Account badge | Opens the account menu. |
| Sign out | Ends your session. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| ✓ before a language | The language now in use. |
| Pin on the station button | A scan station is set. The tooltip says whether it is fixed to this terminal, your own default, or not set. |
| **Simulated** banner in Biometric signing | The fingerprint or face step is a demonstration; nothing is read from a sensor. |
| **Compact view** / **Full view** | Report header buttons. |

**Scan station button.** Its pin tooltip shows where the station came from: "This terminal is fixed to this station" (set for this computer by an administrator), "Your own default station" (your personal choice), or, with no station, "No scan station set — click to set one". When your station has a bench screen, **Go to Bench** carries the tooltip "Go to your bench for …".

**Unsaved-changes question when you scan a different station.** If you have unsaved work and a scan would switch your active station, a window titled "Unsaved changes" offers **Save & Switch to …** (saves your work, then switches), **Discard & Switch** and **Cancel — stay here**.

**Messages tooltip.** With unread messages the speech-bubble button reads "Messages, … unread".

**Focused Mode.** On a phone or small tablet that was switched to the full desktop view, a **Focused Mode** button appears in the top bar (tooltip "Switch back to Focused Mode"). It returns you to the simplified Intraop Queue screen made for small devices. Computers do not show it.

**System Information panel** (account menu, **System Information**). Rows are grouped. The AI group shows the provider, the model, how the connection is made, and **Voice AI**: "✓ Gemini active" when the voice-understanding service answered, otherwise "Local only", meaning voice commands are interpreted on this computer without the extra service. Browser and system rows show your browser, operating system, screen size and language. The connectivity group lists each outside service with a coloured dot: green for working, grey while checking or when not connected. **NLM Terminology** always shows "Available" and the secure email row shows that it is not connected yet. See the Known limits note under Exception handling. Quote this panel to support when you report a problem.

**My dictionary and My voice commands.** An empty list says "You haven’t added any words yet." or "No learned voice commands yet." Nothing is wrong; entries appear as you add words or as PathScribe learns your phrases.

**Biometric signing messages.** "Enrolled with … on …." (your device and the date) shows your current enrolment. While you confirm on your device the button reads "Waiting for your device…". "This computer has no biometric reader." means enrolment is not possible here; your password always works. "The enrolment couldn’t be removed." means **Remove** did not complete; try again.

### Hotkeys

| Key | Action |
|---|---|
| Alt+Y | Enhancement Request |
| Alt+X | QA/Testing Feedback (when turned on) |
| Alt+Shift+B | Focus the case search bar |

Press Alt+J and then a letter if a screen has already used a key. See [Voice and Keyboard](help:voice-and-keyboard).

## Step-by-Step Procedures

### Standard workflow

**Change the screen language**

1. Select the language switcher in the top bar. A list opens with English, Français (France), Français (Belgique), Deutsch, Nederlands (Nederland), Nederlands (België), Español (España) and 한국어. Each is written in its own language.
2. Choose one. The labels, buttons and messages change at once, and the language now in use shows a ✓.
3. Sign in again later on any computer. Your choice is remembered for you. The sign-in page uses the language last used on that computer.

What changes: the screens, buttons, messages and lists that ship with PathScribe. What does not change: anything your laboratory typed itself (template wording, flag names it created, facility names, free text in reports and messages). The language of a printed report follows the performing laboratory, not your choice.

!!! note "Translation quality"
    French, German, Dutch, Spanish (Spain, formal "usted") and Korean were machine translated. The Korean wording in particular should be reviewed by a native speaker before clinical use. The two Belgian choices change only a few words and use the French or Dutch text for the rest.

**Add a word to your dictionary**

1. In a report, right-click a word underlined as misspelled. The spelling menu offers **Add to my dictionary**, **Add to the (facility) dictionary** and **Ignore for this session**.
2. Choose **Add to my dictionary**. The underline goes away and stays away in your own reports.
3. To add one without a right-click, open the account menu, choose **My dictionary**, type the word under **Add a word** and confirm. Use a single word. A word with spaces is refused with a message.
4. To remove a word, open **My dictionary** and select the remove control beside it. Only the person who added a word can remove it.

**Set the spelling language for one report**

1. On the report, find the **Spelling** list.
2. Choose a language, or **Default**. The line beside it says why that language is in use: "chosen for this case", "facility default", "pathologist's preference" or "platform default".
3. A language that is not yet built shows "(language) isn't available yet".

**Choose your bench**

1. After you sign in on a computer with no station, **Which bench is this?** appears once.
2. Choose your station (the list shows only the stations at the facilities you work for) and select **Set station**. A toast says "Switched to (station)". Or select **Skip — I don't scan here**; the question is not asked again on this computer.
3. To change it later, select the station button. The menu includes **Clear this terminal's fixed station**.
4. If your station has a bench screen, **Go to Bench** appears next to it.
5. If the station set on this computer belongs to a facility you do not work for, the button reads **No station**, the menu says so, and scans are not recorded against it. Pick one of your own stations.

**Shrink the report header**

1. On the report, select **Compact view** in the patient header. The header becomes one line and the report gains room.
2. Select **Full view** to bring it back. The choice is kept on this browser.

### Alternative workflow

1. **My voice commands.** Open it from the account menu. Each row reads "Runs 'X' · used N times". These are phrases you confirmed once. Select **Remove** to unlearn one.
2. **Personal macros.** Open Configuration and choose the Macros tab, titled **My Macros**. A macro's trigger must start with `;` (for example `;gs`) and expands when you press Space. Choose the **Personal** tier to keep it for yourself. **Import from Word** is offered. Only people with the "Manage shared macros" permission can make Enterprise macros or see everyone's.
3. **Light editor.** In the comment windows and the microscopic panel, the toolbar button **Switch to light mode** or **Switch to dark mode** changes that editor only.
4. **Biometric signing.** If shown, choose **Enrol**, **Enrol again** or **Remove**, or **Later**. This is a demonstration.
5. **Feedback about an AI result or a template.** Select the bug button (Alt+X), write a title and a description, and choose the category **AI / Template validation**. Two optional lists appear: **Validation study** (only studies that are active) and **Template** (with its version). Choose either, both or neither; if you pick a study that names its own templates, the template list shortens to those. The links go with your message so the validation team can find the study and template. The confirmation tells you whether it went to the validation recipients or, because none are set, to the QA recipients. Never type a patient name or a case number: the form warns you if it finds one.
6. **Suggesting an improvement.** Select the light bulb (Alt+Y). The confirmation says where the request went. If your administrator set a website address, it reads "Delivered to" and the website's name. In a demonstration copy of PathScribe nothing is ever sent: the confirmation says "Simulated" and that nothing was sent. If the website cannot be reached you see "The request could not be delivered to the destination. Nothing was sent." Your text is kept in the form, so you can try again later.

### Exception handling

1. **You cannot reach Configuration.** Many roles do not open Configuration by default (it is given to administrators, template authors and approvers, and laboratory directors). Ask your administrator to grant it, or to create macros for you.
2. **A station barcode for a facility you do not work for is scanned.** The message says you are not set up to use that station, and nothing changes.
3. **A station barcode is scanned while you have unsaved work.** An **Unsaved changes** window offers **Save & Switch**, **Discard & Switch** and **Cancel — stay here**.
4. **A word will not go into your dictionary.** Read the message: it says whether the word is empty, has spaces or is already there.

!!! note "Known limits"
    In System Information, **NLM Terminology** always reads "Available": the panel does not test that service. The secure email row shows that secure email is not connected in this build. The sign-out check in **Biometric signing** is a demonstration (see above).

### Error recovery

1. If the screen came up in the wrong language, use the language switcher at once; the page is not lost.
2. If you removed a dictionary word or voice command by mistake, add or confirm it again; nothing else is affected.
3. If a report header or editor looks different on a shared computer, another person on the same browser changed it. Change it back.

!!! warning "Discard & Switch loses work"
    **Discard & Switch** in the Unsaved changes window throws away everything not yet saved on the case. Choose **Save & Switch** unless you are sure.

!!! warning "Dictionary words are not checked"
    A word in your dictionary is never flagged. A misspelled drug, site or laterality term added by mistake will pass in your reports. Add only words you have checked.

## Tips and Best Practices

### Common mistakes

- Expecting a language change to translate report text already written, or what your administrator typed.
- Skipping the bench question on a shared scanning computer, then wondering why scans do not route.
- Putting a patient name in a macro or in the dictionary. Use neither for patient details.
- Assuming compact header and light editor follow you to another computer. They stay on the browser.

### Efficiency recommendations

- Make macros for phrases you type every day (`;gs`, `;nad`). Keep triggers short and distinct.
- Set the bench once on a bench computer and leave it.
- Use **Add to my dictionary** from the right-click menu rather than the dialog.

### Workflow recommendations

- Laboratory managers: decide which roles need Configuration for macros and tell staff.
- Pathologists: confirm voice commands only when you mean them; a wrong confirmation is remembered until removed.
- Everyone: sign out at a shared computer.

## Related Features

### Upstream workflow

- [Sign In](help:sign-in): the first language and bench questions are asked after sign-in.

### Downstream workflow

- [Voice and Keyboard](help:voice-and-keyboard): voice accent and hotkeys.
- [Report](help:report): the compact header, spelling language and dictionary are used here.
- [Messaging](help:messaging) and [Notifications](help:notifications): the other items in the top bar.
- [Case Search Bar](help:case-search-bar), [Clinical Links](help:clinical-links) and [Session and Connection](help:session-and-connection): other top bar features.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The sign-in page is in a different language from mine | It uses the last language chosen on this computer. Yours applies after sign-in. |
| I want a dark or light page | There is only a light or dark choice for editors; the page itself has no theme choice. |
| Where is my signature? | There is no signature setting. Signing out uses your password, or biometrics where enabled (demonstration). |
| Corrections PathScribe learned from my dictation | They are kept for you but there is no screen to view or remove them. Ask support. |
| My macro does not expand | The trigger must start with `;` and be followed by Space. |
| Biometric signing is missing from the menu | Your laboratory's policy has not turned it on. |
| Admin Guide opens for me | In this demonstration every user may open it. |

### Resolution steps

1. Reload the page after changing language if some text stays in the old one.
2. Check you are signed in as yourself; personal items belong to the signed-in person.
3. Open System Information and copy the support report if you need help.

### When to contact support

Contact your laboratory's PathScribe support when your dictionary or voice commands disappear, when a language choice is not remembered after sign-in, or when you need macros but cannot open Configuration. Send the System Information report.
