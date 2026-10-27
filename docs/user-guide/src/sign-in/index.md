---
module: Sign In
workflow: Starting and ending a session
role: [All staff]
keywords: [sign in, login, log in, password, single sign-on, sso, microsoft, google, temporary password, second factor, session, lockout, sign out, log out, language, station, which bench is this, idle timeout]
routes: [/login, /auth/callback/:providerId]
next: help
related: [help, home, personal-settings]
status: Draft
---

# Sign In {#top}

## Overview

**Purpose.** The sign-in screen is where you start a PathScribe session. You sign in either with the email and password your administrator gave you, or with your organisation's single sign-on (Microsoft, Google or your own organisation's sign-in). This article also covers what happens during the session: the "Already signed in elsewhere" question, the inactivity warning, the question "Which bench is this?", choosing a language, and signing out.

On a live installation you sign in with your organisation's single sign-on only; email-and-password sign-in is part of the demonstration version.

**Intended users.** Everyone who works in PathScribe.

**Where it fits.** Sign-in comes first. After it you land on the page you were trying to open, or on [Home](help:home) if there was none. Every other screen needs you to be signed in. The few pages meant for outside people (a consult link, a critical alert reference) do not.

## Screen Tour

![The sign-in screen with email, password and single sign-on buttons](capture:sign-in-overview)

The sign-in card shows the PathScribe logo and the words "Clinical Pathology Reporting". Which parts below it appear depends on how your installation is set up.

### Field definitions

| Field | What it means |
|---|---|
| Environment badge | Production, Validation, Training or Development. Shown only when your installation names its environment. Check it before you start: it tells you which system you are signing in to. |
| Email | Your work email address. The cursor starts here. |
| Password | Your password. The eye button beside it shows or hides what you typed ("Show password" / "Hide password"). |
| Forgot password? | Shows the message "Ask your administrator to reset your password from the Staff screen." You cannot reset your password yourself on this screen. |
| or continue with | A line above the single sign-on buttons. |
| Microsoft, Google, Organisation sign-in | Single sign-on buttons. Only the ones set up for your installation appear. |
| Soon | On installations with password sign-in but no single sign-on, the Google and Microsoft buttons are greyed out with a **Soon** tag and the tooltip "Single sign-on is not yet available". |
| Notice | "This system contains protected health information. Access is restricted to authorized users and activity is recorded." |
| Version | A small version number at the foot of the card, when known. |

**Choose your own password** (shown after a first sign-in with a temporary password)

| Field | What it means |
|---|---|
| New password | At least the stated number of characters, and different from the temporary password. |
| Confirm new password | Type it again. |
| Hint | "At least (n) characters, different from the temporary one. Common, patterned or breached passwords are refused." |

**Second factor** (when your organisation requires it on password sign-in)

| Field | What it means |
|---|---|
| Set up your second factor | First time: an account name and a secret key to add to an authenticator app, then the six-digit code it shows. |
| Save your recovery codes | Shown once after set-up. Each works once if you lose your authenticator. |
| Second factor | Later sign-ins: enter the six-digit code, or a recovery code. |
| Simulated | A tag on these screens: in the demonstration the authenticator is a stand-in and protects nothing. With your hospital's identity provider, the provider asks for the second factor instead. |

**Which bench is this?** (a window after sign-in)

| Field | What it means |
|---|---|
| Station list | "— Select a station —" then the active stations. Set the real bench or scan station this computer is. |

**Second-factor step wording**

- **Six-digit code or recovery code** is the label of the box where you type the code from your authenticator, or one of your saved recovery codes.
- **Show demo code (Simulated)** appears only on installations that use the demonstration authenticator. Select it and the line "Demo code: …" shows the current code so you can type it. It is a stand-in for training and protects nothing.
- When a password change fails for a reason the screen does not name, the message reads "That didn't work. Try again."

### Toolbar

| Button | What it does |
|---|---|
| Sign In | Signs you in with the email and password. Reads "Signing in..." while it works. |
| Microsoft / Google / Organisation sign-in | Sends you to that provider to sign in, then back to PathScribe. |
| Save and sign in | Saves your new password and signs you in. |
| Verify / Turn on | Checks your second-factor code; Turn on finishes set-up. |
| I have saved them, continue | Confirms you have kept your recovery codes. |
| Back to sign in | Leaves the second-factor step. |
| Sign In Here | In the "Already signed in elsewhere" question: sign in on this tab and sign the other one out. |
| Set station / Skip, I don't scan here | In the station window. |
| Stay Logged In / Log Out | In the "Session Expiring Soon" window. |
| Sign Out (icon at the top right) | Ends your session. |
| Language button (top right) | Changes the language of PathScribe's screens. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red message under the form | A sign-in problem. See Error recovery. |
| Eye icon | Shows or hides the password. |
| Finishing sign-in... | The page you see for a moment after single sign-on, while PathScribe completes it. |

### Hotkeys

| Key | Action |
|---|---|
| Alt+L | Log Out, while signed in. |
| F1 | Opens the User Guide in a new tab, once signed in. |

The spoken commands "log out", "logout" and "log me out" also sign you out. On the sign-in screen itself, press Enter to submit the form.

## Step-by-Step Procedures

### Standard workflow

**Sign in with email and password**

1. Open PathScribe's address. If you are not signed in, the sign-in screen appears. If you were trying to open a particular page, PathScribe remembers it.
2. Check the environment badge, if there is one.
3. Type your email and password. A password manager may fill them in; PathScribe reads what is in the boxes when you select Sign In.
4. Select **Sign In** (or press Enter). The button reads "Signing in...".
5. You go to the page you were trying to open, or to Home.
6. If the window "Which bench is this?" appears, choose your station and select **Set station**.

**Sign in with single sign-on**

1. Select **Microsoft**, **Google** or **Organisation sign-in**.
2. Your browser goes to that provider. Sign in there as you normally do.
3. You return to PathScribe on a page that says "Finishing sign-in...". It then takes you to the page you wanted, or to Home.

**Sign out**

1. Select the **Sign Out** icon at the top right, or press Alt+L.
2. If a case or accession has unsaved changes, a window "Unsaved Data" says "You have an active session with unsaved changes. Logging out now will discard your current progress." Select **Return to Page** to save first, or **Log Out & Discard Changes**.
3. You return to the sign-in screen.

**Change the language**

1. Select the language button at the top right (it shows a code such as EN).
2. Choose English, French (France or Belgium), German, Dutch (Netherlands or Belgium), Korean or Spanish (Spain).
3. The screens change at once. The choice is saved to you, and the sign-in screen later uses the language last used on that computer.

### Alternative workflow

1. **First sign-in with a temporary password.** Your administrator set a temporary password. After you sign in, the screen says "Your administrator set a temporary password. Choose your own to continue." Enter and confirm a new password, then select **Save and sign in**.
2. **Second factor.** If your organisation requires one, enter the six-digit code after the password. The first time, add the secret key to an authenticator app, type the code, and save the recovery codes.
3. **Station set once.** If an administrator has given you a default station, or this computer already has one, you are not asked.
4. **Change your station later.** Use the station icon next to your name at the top.

### Exception handling

1. **Already signed in elsewhere.** The window says "This account is already signed in on another tab or window on this browser. Continuing here will sign that session out. Any unsaved work there will be preserved and offered for review the next time it's opened. Continue?" Select **Sign In Here** to continue, or **Cancel**.
2. **You were signed out by another sign-in.** On the sign-in screen the notice "Signed out: logged in elsewhere" says the account was signed in on another tab. Unsaved work was preserved. Select **OK**, sign in, and it is offered for review on the case you were working on.
3. **Inactivity.** After a period set by your laboratory a window "Session Expiring Soon" says you have been inactive and counts down. Select **Stay Logged In** to continue, or **Log Out**. The window warns: "Please save any unsaved work now. Changes are not automatically preserved."
4. **Your sign-in provider refused you.** You return to the sign-in screen with a message explaining why (see Error recovery).

### Error recovery

1. "Please enter your email and password." Fill both boxes.
2. "Incorrect email or password. Please try again." Check both. Capital letters count in the password.
3. "Incorrect email or password. One more failed attempt will lock sign-in for this email for (n) minutes." You have one try left.
4. "Too many failed sign-in attempts. Sign-in for this email is locked; try again in (n) minutes." Wait, or ask your administrator to set a new password for you.
5. Password rules when choosing a new one: "Use at least (n) characters.", "The two passwords don't match.", "That password is too common...", "That password has appeared in a known data breach...", "Choose a password different from the temporary one.", "The password can't be your email address.", "The password can't contain PathScribe, ForMedrixAI or your email address or the name before the @." Choose another.
6. "Your session expired. Sign in again with the temporary password." Start again from the first step.
7. Second factor: "That code wasn't accepted.", "That code was already used. Wait for the next one.", or "Too many attempts. Second-factor codes are locked until (time)." Wait for the time shown.
8. "Your organisation requires a second factor, but none is available for this account. Contact your system administrator."
9. Single sign-on messages: "Sign-in was cancelled."; "The sign-in service returned an error. Please try again."; "The sign-in response couldn't be verified. Please try again."; "PathScribe couldn't check your account just now. Please try again."; "This sign-in option isn't set up for this installation."
10. "You signed in, but there is no active PathScribe account for you. Ask your system administrator to add you." / "Your PathScribe account is inactive." / "Your PathScribe account doesn't include access to this application." / "More than one PathScribe account matches this sign-in." / "This PathScribe account is already linked to a different sign-in account." These need your administrator.
11. "Sign-in isn't set up for this installation. Contact your system administrator." Neither password sign-in nor single sign-on is available.

!!! warning "Always sign out on a shared computer"
    PathScribe shows patient information. When you leave a shared workstation, sign out instead of walking away. Activity is recorded under your name.

!!! warning "Unsaved work is not saved for you"
    Signing out from the top-right icon discards unsaved case changes if you choose **Log Out & Discard Changes**. After an inactivity timeout, the Session Expiring Soon window says changes are not automatically preserved. Save before you step away. When another sign-in takes over your session, or the session times out, PathScribe keeps your unsaved work and offers it for review the next time you open that case.

## Tips and Best Practices

### Common mistakes

- Signing in to the wrong environment. Read the badge before you enter anything.
- Using a colleague's account to save time. Everything is recorded under the account that signed in.
- Leaving the Session Expiring Soon window unanswered. The session ends when the countdown reaches zero.
- Typing the password into the email box when a password manager fills in the wrong place. Check both boxes.
- Choosing "Skip" in the station window on a computer where you do scan. Cassette and slide scans are tracked against the station.

### Efficiency recommendations

- Use single sign-on if your organisation offers it.
- Let the browser or password manager fill in the form; it works with PathScribe.
- Open the page you need directly. After sign-in PathScribe returns you to it.

### Workflow recommendations

- Sign in at the start of the shift, set the station once, and sign out when you leave the bench.
- Do not rely on a second tab. A second sign-in in the same browser signs the first one out.

## Related Features

### Upstream workflow

- Your administrator creates your account, roles and temporary password.

### Downstream workflow

- [Home](help:home): where you land after signing in.
- [Help](help:help): the User Guide, once you are signed in.
- [Personal settings](help:personal-settings): your own preferences.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The form is blank after a password manager filled it in | PathScribe reads the boxes at submit; select Sign In again. |
| "Forgot password?" does not reset the password | It only tells you to ask your administrator. |
| The Microsoft and Google buttons are grey | Single sign-on is not set up on this installation yet. |
| Sign-in works, but I land on Home, not the page I wanted | The page address was not one PathScribe could return to safely. |
| The sign-in screen is in the wrong language | It uses the last language used on this computer. Sign in and change it with the language button. |
| Sign-in is locked | Five failed attempts in a row lock that email for 15 minutes. |
| I was signed out while working | Inactivity timeout, or the account signed in elsewhere in the same browser. |
| A page does not open and sends me to sign in | You are not signed in, or the session ended. |

### Resolution steps

1. Read the red message and follow it.
2. Check the environment badge and the email address.
3. Wait out a lockout, or ask your administrator to set a new password.
4. Close other PathScribe tabs if you are told you are signed in elsewhere.
5. Try single sign-on if password sign-in keeps failing, or the reverse.

### When to contact support

Contact your laboratory's PathScribe administrator for locked accounts, inactive accounts and missing access, and PathScribe support when sign-in fails for everyone or a single sign-on message repeats. Have your email address (never your password) and the time of the problem ready.
