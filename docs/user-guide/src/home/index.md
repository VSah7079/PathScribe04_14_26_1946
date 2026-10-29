---
module: Home
workflow: Starting your day
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Laboratory Manager, MDT Coordinator, Quality Staff]
keywords: [home, dashboard, tiles, landing page, start, main menu, welcome]
routes: [/]
next: accession
related: [accession, worklist, search, sign-in, help, voice-and-keyboard, personal-settings, messaging, notifications]
status: Draft
---

# Home Dashboard {#top}

## Overview

**Purpose.** The Home Dashboard is the first screen after you sign in. It is a set of tiles, one for each part of PathScribe you are allowed to use. Choose a tile to open that part of the system.

**Intended users.** Everyone who signs in. What you see depends on your role.

**Where it fits.** Home is the starting point of every workflow. From here you go to Accession to log a new specimen, to the Worklist to continue your cases, or to any other area your laboratory has given you.

## Screen Tour

![The Home Dashboard with its tiles](capture:home-overview)

!!! note "You only see your own tiles"
    A tile appears only if your role may open that area. A colleague with a different role will see a different set. If a tile you expect is missing, ask your laboratory manager to check your access.

### Field definitions

| Item | What it means |
|---|---|
| Welcome back, *name* | Greets you by your family name. |
| Tiles | One per area of PathScribe. Each has a title and a short, one-line description (kept brief so it fits the tile in every language). |
| Registry exception count | A small count on the tile that leads to registry exceptions, shown when cancer registry submissions need a person to look at them. |
| Latest research article | A line showing a recent pathology article chosen for your subspecialty. Select it to read it in a separate window. |
| System status | At the bottom of the screen. It says "Checking" while PathScribe asks the server, then "Operational", "Degraded" or "Unavailable". If the check itself fails it says "Status unavailable", which means the status is not known, not that the system is fine. It is checked when Home opens and again when you return to the tab after five minutes. In a demo with no server it adds "(demo: simulated)". Beside it is the line "© 2026 PathScribe AI Systems". |

- **Tile descriptions.** The My Contribution tile reads "Workload • Quality • TAT". The Search tile reads "Find completed and open cases". Bench Contributions reads "Bench throughput and TAT", Intraop Queue "Unlinked intraop entries", Lockbox Drop-Off "After-hours specimen drop-offs", Pathology Workspace "Cytology, molecular, benches", Quality & Compliance "Audit trail and quality queues" and Tumor Board / MDT "Flag cases, manage the agenda".
- **From PubMed.** The small badge on the research article line. The dot beside it is a button: its tooltip is "Click to check for a more recent article", and while it works it says "Checking for a more recent article…".

### Toolbar

The Home Dashboard has no toolbar of its own.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Tile highlight when you point at it | The tile you are about to open. |
| Number on a tile | Items on that tile that need someone's attention (for example registry exceptions). |
| Green dot, "Operational" | The server reports that every part it checks is working. |
| Amber dot, "Degraded" | The server reports a part is working below normal. Tell your administrator if it persists. |
| Red dot, "Unavailable" | The server reports a part is not working. |
| Empty circle, "Status unavailable" | The check did not get an answer, so the status is not known. |

### Hotkeys

None are specific to this screen. Alt+H (Go Home) returns you here from most screens, and Alt+J then H works from every screen. F1 (View Help) opens the guide page for the screen you are on. The **Help** button does the same.

### The tiles

| Tile | What you do there | Guide |
|---|---|---|
| Accession | Log new specimens and assign grossing templates. | [Accession](help:accession) |
| Worklist | View and manage pending pathology cases. | [Worklist](help:worklist) |
| Bench Contributions | See accessioning rate, batch throughput, queue aging, stage-to-stage turnaround time and molecular quality control for bench roles. | [Bench Contributions](help:bench-contributions) |
| Configuration | System settings and AI preferences (administrators). | Administrator Guide |
| Intraop Queue | Match unlinked intraoperative entries to a formal accession. | [Intraop Queue](help:intraop-queue) |
| Lockbox Drop-Off | Scan specimens dropped off after hours and follow them up in the morning. | [Lockbox Drop-Off](help:lockbox-drop-off) |
| My Contribution | Your own workload, quality, turnaround time and trends. | [My Contribution](help:my-contribution) |
| Pathology Workspace | Cytology screening, molecular diagnostics, the microtomy, embedding and slide distribution workstations, and batch management. | [Pathology Workspace](help:pathology-workspace) |
| Quality & Compliance | Activity logs, the audit trail and the quality assurance working queue: deficiencies, reconciliation and corrective action. | [Quality & Compliance](help:quality) |
| Search | Find completed and in-progress cases. | [Search](help:search) |
| Tumor Board / MDT | Flag a case for tumor board or MDT and manage its agenda listing. | [Tumor Board](help:tumor-board) |

!!! note "Hubs"
    Pathology Workspace and Quality & Compliance are hubs: they open a second screen that lists the workstations or queues inside them. They show only the items you may open.

## Step-by-Step Procedures

### Standard workflow

1. Sign in. The Home Dashboard opens.
2. Find the tile for the work you want to do.
3. Select the tile. The screen for that area opens.
4. When you finish, return to Home with Alt+H (or Alt+J then H).

### Alternative workflow

1. Select the round **?** Help button in the top bar, beside the microphone (or press F1) to open the guide page for the screen you are on.
2. To reach a case without Home, use the Search screen.

### Exception handling

1. If a tile you expect is missing, your role does not include that area. Tell your laboratory manager which tile you need and why.
2. If a tile shows a number you do not understand, open the tile: the screen explains what needs attention.

### Error recovery

1. If the dashboard does not appear after sign-in, refresh the page.
2. If tiles are missing after a refresh, sign out and sign in again.

## Tips and Best Practices

### Common mistakes

- Looking for Configuration on a tile when your role does not include it. Configuration is for administrators.
- Using Home for every move. Once you know the screen, the keyboard shortcuts are faster.

### Efficiency recommendations

- Accession and Worklist are always shown first because they are used most.
- Use the latest research line to keep up with your subspecialty during quiet moments.

### Workflow recommendations

- Start the day at the Worklist, then work through your cases.
- Accessioners start at Accession; bench staff start at Bench Contributions or their workstation under Pathology Workspace.

## Related Features

### Upstream workflow

- Signing in is the step before Home.

### Downstream workflow

- [Accession](help:accession): log a new specimen.
- [Worklist](help:worklist): continue your cases.
- [Search](help:search): find an existing case.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A tile is missing | Your role does not include that area. |
| The latest research line is empty | The research service is not reachable, or none was found for your subspecialty. It does not affect your work. |
| A tile shows a count | Items on it need attention. Open the tile. |

### Resolution steps

1. Refresh the page.
2. Sign out and sign in again.
3. Ask your laboratory manager to confirm your access.

### When to contact support

Contact your laboratory's PathScribe support when tiles you should have are missing after you have checked with your manager, or when the dashboard does not load after signing in again. Have your name and the time of the problem ready.
