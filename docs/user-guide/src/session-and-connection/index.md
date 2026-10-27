---
module: Session and Connection
workflow: Everyday awareness
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [session, timeout, idle, sign out, expire, offline, reconnecting, connection, logged in elsewhere, unsaved]
routes: []
previous: case-search-bar
next: clinical-links
related: [notifications, sign-in, report, personal-settings]
status: Draft
---

# Session and Connection {#top}

## Overview

**Purpose.** This page explains what happens when you stop working for a while, when you sign in on a second window, when you sign out with unsaved work, and when your connection drops.

**Intended users.** Everyone who signs in.

**Where it fits.** These behaviours apply on every screen.

## Screen Tour

![The Session Expiring Soon window](capture:session-and-connection-expiring)

### Field definitions

| Item | Meaning |
|---|---|
| Idle time allowed | Set by your organisation (15 minutes if nothing is set). A facility can set a different time while you are on a case. |
| **Session Expiring Soon** | Opens 60 seconds before the end, with a countdown. |
| **Unsaved Data** | Opens when you sign out with unsaved case work. |
| "Signed out — logged in elsewhere" | Shown on the sign-in page. |

### Toolbar

| Control | What it does |
|---|---|
| **Stay Logged In** | Keeps your session. |
| **Log Out** | Ends it now. |
| **Log Out & Discard Changes** | Signs out and throws away unsaved work. |
| **Return to Page** | Cancels the sign out. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Strip: Offline (red) | No connection. |
| Strip: Reconnecting… (orange) | Trying again. |
| Strip: Reconnected, "Connection restored." (green) | Back. |
| Badge: Live, Local updates, Connecting…, Offline, Reconnecting… | Whether a list updates by itself. |

**Something went wrong on this screen.** If a screen stops working because of an unexpected fault, PathScribe replaces it with this message and keeps the rest of the application running. A line says either that unsaved changes on the screen may have been lost or that they were lost; work you had already saved is safe. **Try again** reloads the screen; **Back to worklist** appears when the whole application stopped. The message ends with "Reference for support: …" and a short code. Read that code to support. If a single section of a report fails, only that section shows **This panel stopped working** (with the same reference and **Try again**) and the rest of the report stays usable.

### Hotkeys

None are specific to this feature.

## Step-by-Step Procedures

### Standard workflow

1. Keep working; any click or key press restarts the idle clock.
2. If **Session Expiring Soon** appears, select **Stay Logged In**.
3. When finished, select Sign out. If **Unsaved Data** appears, choose **Return to Page** and save.

### Alternative workflow

1. Select **Log Out** in the warning if you have finished.
2. If the screen says you were logged in elsewhere, sign in again where you want to work.

### Exception handling

1. **Offline strip.** Keep the page open; PathScribe retries. Save when it shows Reconnected.
2. **You were signed out while away.** Sign in again; drafts kept by an idle sign-out are restored.
3. **Signed in on a second tab.** The first tab is signed out.

### Error recovery

1. After an expiry, reopen the case and check the last edit.
2. After **Log Out & Discard Changes**, the work is gone; redo it.

!!! warning "Save before the window ends"
    The warning says "Please save any unsaved work now — changes are not automatically preserved." An idle sign out keeps drafts, but an explicit sign out discards them by default.

!!! warning "Do not sign out and discard a report you meant to keep"
    **Log Out & Discard Changes** cannot be undone.

## Tips and Best Practices

### Common mistakes

- Walking away mid-report on a shared computer.
- Ignoring the Reconnecting strip and editing for a long time.

### Efficiency recommendations

- Save often with the save hotkey on the Report.
- Sign out when you leave; do not rely on the timer.

### Workflow recommendations

- Laboratory managers: ask your administrator for a time that fits your bench.

## Related Features

### Upstream workflow

- [Sign In](help:sign-in)

### Downstream workflow

- [Notifications](help:notifications): the other signals.
- [Report](help:report): where unsaved work matters most.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Logged out often | Short idle time set by your organisation. |
| Signed out suddenly | Same account used in another tab. |
| Badge says Local updates | Live updates are not available; the list refreshes on a timer. |

### Resolution steps

1. Check the strip under the top bar.
2. Reload the page.
3. Sign in again.

### When to contact support

Contact your laboratory's PathScribe support when sessions end much sooner than your idle time or the connection strip stays red.
