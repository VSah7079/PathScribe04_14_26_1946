---
module: Demonstration Tools
workflow: Demonstration and training
role: [Laboratory Manager, Trainer, Administrator]
keywords: [mock emr, demo, demonstration, training, mock interface engine, simulated, interface engine, inbound message simulator, hl7, scanner simulation, sidecar]
routes: [/mock-emr, /dev/mock-interface-engine]
previous: migration-jobs
next: help
related: [report, audit-log]
status: Draft
---

# Demonstration Tools {#top}

## Overview

**Purpose.** Two pages exist so PathScribe can be shown and taught without the hospital systems it normally talks to. **Mock EMR** stands in for the hospital's patient record, and **Mock Interface Engine** stands in for the interface engine that carries messages between PathScribe and other systems.

!!! warning "These are not production screens"
    Nothing on these pages is real clinical information or a real connection. The Mock EMR shows made-up clinical details. The Mock Interface Engine answers messages that no real system received. They appear only in demonstration and training installations. In a production installation connected to a PathScribe server, neither page is there. Never use either to look up or decide anything about a real patient.

**Intended users.** Trainers, laboratory managers and administrators running a demonstration or a training session. Pathologists see the Mock EMR only when they press the **EMR** button on a report in a demonstration installation.

**Where it fits.** The Mock EMR opens from the report screen. The Mock Interface Engine is not linked from any menu or tile; it is opened by typing its address, `/dev/mock-interface-engine`, and it needs Configuration access.

## Screen Tour

![The Mock EMR page showing a demonstration patient with the DEMO: SYNTHETIC DATA badge](capture:demonstration-tools-mock-emr)

![The Mock Interface Engine page with its response mode choices and simulator panels](capture:demonstration-tools-mock-interface-engine)

### Field definitions

**Mock EMR (`/mock-emr`)**

| Item | What it means |
|---|---|
| NHS badge | A fixed label in the banner. It does not depend on your laboratory's country. |
| Patient name, date of birth, sex, MRN | Looked up from the case you opened it from, using that case's MRN. "DOB: not recorded" if there is none. |
| DEMO: SYNTHETIC DATA | A badge on the banner that says the page is a demonstration. |
| Encounter | Status "Admitted" and Ward "4B (Urology)". Fixed text. |
| Integration Note | A line saying production uses a different, standards-based connection to the laboratory system. A reminder that this page is not the real connection. |
| Clinical Summary | Active Problems (Elevated PSA, Prostate PI-RADS 4 Lesion) and Medications (Metformin 500mg, Lisinopril 10mg). The same fixed text appears for every patient. |
| No Patient Found | Shown when the case has no MRN or no record matches ("No patient identifier was provided" or "No record matches MRN ..."). |

**Mock Interface Engine (`/dev/mock-interface-engine`)**

| Item | What it means |
|---|---|
| Red-bordered banner | "Developer tool: not real functionality." It says the page answers in place of systems that do not exist here yet, and never touches real case data. |
| Enabled / Disabled and the intercepting line | Whether the simulator is answering. "intercepting real dispatch calls", "starting..." or "not intercepting". |
| Response Mode | **Always Succeed** (every message is accepted at once), **Always Fail** (every message is refused with the failure status you choose) or **Timeout** (every message hangs, like an unreachable engine). |
| Failure HTTP Status | Shown for Always Fail. A number; 500 if you clear it. |
| Answer for the slide scanner | A tick box, on at first. After a scan batch is accepted, each slide is reported as scanning and then scanned, so slide scanning can be shown from start to finish. |
| Molecular instrument results | Positive, Negative or No results. After a molecular worklist is accepted, the simulated instrument reports this call for every patient sample. |
| Inbound message simulator | Choose a sample message (patient admit, update, link, merge, move, identifier change, or an event such as a damaged block, an HPV result or a material move) or paste one, then **Process message**. It is run through the same processing as a real incoming message. Labelled Simulated. |
| Received by the simulated interface engine | A list of outbound messages with type, outcome (Accepted, Rejected, Timed out) and time, with **Clear list**. |
| Receive a registry acknowledgement | Pick what a registry would answer for a sent submission (Accepted, Accepted with warnings, Rejected can be corrected, Rejected fatal, No answer) and select **Receive**. |

**Messages on the demonstration panels**

| Text | Where and what it means |
|---|---|
| Send block order to instrument, Send slide orders, Send specimen label | Three buttons in the Block and stain editor of the report screen, shown when the simulated engine is on. Each sends the matching order to the simulated engine. They produce a stand-in message only; no instrument receives it. |
| Accepted. The message that was sent: | Shown with the text of the message after a send is accepted. A **Simulated** badge sits beside it. |
| The block order was not sent. | Shown when the simulated engine refused the order (for example in Always Fail mode), followed by the reason. |
| The sample could not be prepared. | The Inbound message simulator could not load the chosen sample. Choose it again or paste a message. |
| Simulated registry answer processed. | A brief notice after **Receive** in the registry acknowledgement panel. |
| Nothing received yet. | Shown in the list of messages received by the simulated engine until something has been sent. |

### Toolbar

| Button | What it does |
|---|---|
| Enable / Disable (Mock Interface Engine) | Starts or stops the simulated answers. |
| Load sample | Fills the message box with the chosen sample. |
| Process message | Runs the message. A toast says "Simulated message processed." or "Simulated message not applied." |
| Receive | Plays the chosen registry answer for a sent submission. |
| Clear list | Empties the list of messages received by the simulated engine. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Simulated badge | The panel is a stand-in. Nothing came from, or went to, a real system. |
| Processed / Not applied | The result of an inbound simulated message. |
| Accepted / Rejected / Timed out | What the simulated engine answered to an outbound message. |

### Hotkeys

None on these pages. F1 opens this User Guide page in a new tab.

## Step-by-Step Procedures

### Standard workflow

**Show the Mock EMR from a report**

1. Open a case report in a demonstration installation.
2. Select the **EMR** button on the bottom bar ("Open Patient Record in EMR Sidecar"). A second window opens with the Mock EMR for that patient. "Looking up patient..." shows briefly.
3. Read the patient banner, then close the window when done.
4. If your browser blocks the second window, the record opens in a drawer on the report instead.

**Run a demonstration of a failing interface**

1. Open the Mock Interface Engine and select the enable button. The line changes to "intercepting real dispatch calls".
2. Under **Response Mode** choose **Always Fail** and, if you wish, change the status number.
3. On another screen, send a message, for example a worklist or a scan batch.
4. Return here. The message appears under "Received by the simulated interface engine" with the outcome Rejected.
5. Open the Audit Log, Interface Log, **Outbound Interface DLQ** to show the failed message and **Retry Dispatch**.
6. Choose **Always Succeed** and retry to show the recovery.

### Alternative workflow

1. To show a message arriving from another system, use the Inbound message simulator: choose a sample such as "A01 admit (new patient)", select **Load sample**, then **Process message**.
2. To show a message that cannot be matched, choose "A40 with unknown patients (goes to the exception queue)". It is queued as an Interface Exception; open the Audit Log, Interface Log to bind it by hand.
3. To show a registry answer, send a submission first, then choose the registry's reply under **Receive a registry acknowledgement**.

### Exception handling

1. **Timeout mode leaves a screen waiting.** That is the point: it shows a stuck dispatch. Switch to Always Succeed or disable the simulator to end it.
2. **No sent submission to answer.** The registry panel says "No sent registry submission yet." Send one first.

### Error recovery

1. If the Mock EMR says "No Patient Found", open it from a case that has an MRN.
2. If a message is "Not applied", read the explanation shown with the result and try a different sample.
3. If the simulator still answers when you do not want it, select **Disable** and refresh the page.

!!! warning "Switch the simulator off after the session"
    While enabled, the Mock Interface Engine answers the messages the application sends. Disable it when the demonstration ends so that later test or training work is not answered by a stand-in.

## Tips and Best Practices

### Common mistakes

- Treating the Mock EMR's problems and medications as the patient's. They are the same fixed demonstration text for everyone.
- Leaving the simulator on in Always Fail or Timeout mode.
- Using a real patient's case for a demonstration. Use demonstration cases only.

### Efficiency recommendations

- Keep the simulator page in its own window while you drive the demonstration from another.
- Use the sample messages instead of typing a message.

### Workflow recommendations

- Open the Audit Log beside the simulator to show each message's result.
- Say plainly to an audience that these pages are stand-ins, and that in production the hospital's own systems answer.

## Related Features

### Upstream workflow

- [Report](help:report): the **EMR** button launches the Mock EMR in a demonstration installation.

### Downstream workflow

- [Audit Log](help:audit-log): the Interface Log shows the exceptions and failed messages the simulator creates.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Mock Interface Engine address shows "You don't have access to this screen" | You lack Configuration access. |
| The pages do not exist | This is a production installation, which does not include demonstration tools. |
| The EMR window does not open | The browser blocked the popup; a drawer opens instead. |
| Nothing arrives in the received list | The simulator is disabled, or no message was sent while it was on. |
| The Mock EMR shows "NHS" for a US laboratory | The label is fixed text. |

### Resolution steps

1. Check that the simulator reads "intercepting".
2. Check the Response Mode.
3. Refresh the page and enable again.
4. For the EMR window, allow popups for PathScribe.

### When to contact support

Contact your laboratory's PathScribe support when the demonstration pages are missing from a training installation, or the simulator stays on after you disable it. Have the address and the time of the problem ready.
