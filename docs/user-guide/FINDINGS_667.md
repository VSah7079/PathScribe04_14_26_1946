# Findings (Batch 667)

| # | Where | Finding |
|---|---|---|
| 1 | System Information panel (top bar) | NLM Terminology row is hard-coded to a green "Available" and secure email is shown as not wired; neither reflects a live check. |
| g5-1 | src/protocols/ProtocolEditor.tsx | The Protocol Editor screen is not imported by any route or button, so no user can reach it. Its labels are listed in coverage-ignore.json until it is connected. Its choice questions also show "Choice options editing can be added next" (options cannot be edited). |
| g5-2 | Autopsy report screen, Complete Authorization and Release Body windows | Both windows existed in no article. They open only from banners on the report screen, so the new article has no address of its own (it is reached by links). |
| g5-3 | Embedding Station, Last flagged | The reporter shows as a user ID, not a name, and there is no way to clear the flag at the station. |
| 2 | Search, Schedules panel | Scheduled reports are stored and Run now only records counts (marked Simulated); no delivery to recipients is built. |
| G1-1 | `src/components/Editor/PathScribeEditor.tsx` (Line & Paragraph Spacing menu) | The Single/1.15/1.5/Double line spacing choices and Add Space Before/After Paragraph only focus the editor and close the menu; they do not change the text. Documented as a known limit in Microscopic and Material. |
| G1-2 | `src/pages/SynopticReportPage/components/SmartCaptureLauncher.tsx` | Smart Capture is a prototype (hidden unless switched on) and its export goes to a simulated engine in the demonstration. Documented as a known limit in Billing Review. |
| G1-3 | `src/components/PatientHistory/PatientHistoryModal.tsx` | "Similarity Score (Demonstration)" in the similar-case view is demonstration data, not a validated match score. |
| G1-4 | `BillingReviewPanel.tsx`, `ChargeApprovalQueue.tsx`, `BillingCorrectionDialog.tsx` | The billing review, Smart Capture, charge approval and billing correction windows had no User Guide coverage; a new Billing Review article was added. |
| 3 | Worklist, Slide Detail panel | The Request Rescan button is never shown: no screen passes the rescan action to the panel. |
| 4 | Worklist, pool claim window | All three screens that open the claim window ask for Claim & Continue; the Claim Case / View Report variant is unused. |
| g4-1 | Label Designer, Exported ZPL box | The box is headed "Exported ZPL" even after Export EPL or Export DPL; only the note above the text names the real language. Noted in the Administrator Guide known limits. |
| 5 | My Contribution > Productivity > Export PDF | The Export PDF button only shows a message, "PDF export — connect to your PDF library". No file is made. Print works. |
| 6 | Quality Assurance > Cytology QA > Workload Tracking | The Cytotechnologist column shows the user number, not the person's name. |
| 7 | Quality Assurance > Cytology QA > APAC Proficiency Testing | Panel grading is a built-in demonstration key (marked Simulated); real provider grades are not received yet. |
| 8 | My Contribution > Quality > TAT by Facility | Peer figures are estimated; there is no real cross-pathologist aggregation yet (the screen says so). |
| 9 | My Contribution > AI Contribution > AI-Assisted vs Manual | Comparison is illustrative: manual, non-AI cases are not tracked yet. Marked Demo data. |
| 10 | Audit > Review Interface Exception | Manual identity resolution is not built for message types other than the patient-binding ones; the window says to dismiss once corrected at the source. |
| 11 | Claim window opened from the full report | If the case has no pool name the heading falls back to the fixed name "MFT Pool", which may not be your pool. |
| 12 | Audit Log, Financial, Outbound Charge DLQ | Charge dispatch is not built: failures other than a missing ICD-10 code or NPI appear only through the Simulate Rejected / Simulate Timeout test buttons. |
