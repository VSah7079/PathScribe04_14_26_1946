# The stain and scanner QC gate (Batch 763)

**Source:** Pete's video feedback (Nov 2, 2026): "Missing QC gate: a Post-Stain / Pre-Distribution QC checkpoint with Option A (vendor sign-off via the interface engine) and Option B (native PathScribe QC), configurable per instrument". Scope: stainers and scanners.

**Status:** Built (Demo), browser side, tested. Server routes Planned (`docs/architecture/STAIN_QC_API.md`).

## Four voices

- **Practitioner:** When a staining run finishes, its slides wait at the **QC checkpoint** at the top of Slide Distribution. Open the rack, look at the slides, and press **Sign off: all slides passed**. If a slide is not good enough, press **Fail** on it, choose **Re-stain** or **Re-cut** and a reason, then sign off. Until the run is signed off its slides can't be handed out and the rack can't be checked out. A stainer that signs off its own runs releases them by itself; the checkpoint says so. Scanned images can wait here too: **Release to the Pathologist** or **Scan again** with a reason; until then the Pathologist sees "Waiting for image QC".
- **System administrator:** Configuration → System → Workstation & Hardware → **Stain & scan QC**: the default for stainers and for slide scanners (Auto-accept, Instrument sign-off through the interface engine, PathScribe sign-off), and a list of every stainer and scanner with its mode. Each instrument's own mode: Configuration → System → Equipment → edit the stainer or scanner → **QC sign-off**. Permissions: `stain:qc:sign-off` and `scan:image-qc:sign-off` (the roles that open Slide Distribution, and Lab Director), `stain:qc:override` (Lab Director: sign off a run that waits for its stainer), `config:stain-qc:manage` (Admin, Lab Director). The Action list has a **Stain & Scan QC** group (Histotechnologist and Lab Director; Superadmin has every action). The audit log shows Stain QC Pending, Passed, Failed, Instrument Result Ignored; Image QC Pending, Passed, Failed; Stain QC Settings Saved.
- **Marketing:** No slide leaves the stainer and no image reaches the Pathologist until it has passed QC: signed off by the instrument itself, by a technologist in PathScribe, or accepted automatically, chosen instrument by instrument, with every decision on the audit trail.
- **FormedrixAI/partners:** Built (Demo), tested. The demonstration's stainers: `VENTANA_HE600_01` (Instrument sign-off) and `LEICA_ST5020_01` (PathScribe sign-off); other stainers take the default, PathScribe sign-off; scanners default to Auto-accept. The stainer's sign-off message (`stain-qc-sign-off`) has a browser handler and a contract; the interface engine's channel for it, and the server routes, are Planned. A run's slides are the rack's slide items. Per-stain QC criteria are not built: the fail reasons are a fixed list. A PathScribe sign-off also counts as the run's visual read for the existing sign-out QC gate.

## What it does

| Step | Built |
|---|---|
| A run finishes | The stainer's **Run Completed** (or moving the rack on) opens the run's QC; its slides show **Waiting for QC** on the case and on the Facility Operations wall. |
| Option A: the instrument signs off | The stainer's pass or fail arrives through the interface engine and decides the run; a failed slide is held for re-stain. A run signed off in PathScribe ignores it (audited). A supervisor can sign off instead. |
| Option B: PathScribe sign-off | Slide Distribution → **QC checkpoint**: every slide passes by default; mark a failed one with Re-stain or Re-cut and a reason; one click signs off. |
| Auto-accept | The run passes at once, audited as auto-accepted. |
| Held at distribution | A block whose slides are all held, or a held slide, is refused at Slide Distribution with the reason; the rack can't be checked out. |
| Scanners | At unload, an image is held when the scanner's mode needs it (Instrument sign-off without the scanner's own pass, or PathScribe sign-off); **Release to the Pathologist** or **Scan again**. |

## For the demo

1. Configuration → System → Equipment: open **LEICA_ST5020_01** and see **QC sign-off: PathScribe sign-off**; **Stain & scan QC** lists every stainer and scanner.
2. Slide Distribution: scan the staining rack **CONT-STN-WALL-1** (an H&E rack at Staining). Checking it out is refused ("This rack's stained slides wait for QC") and the rack appears in the **QC checkpoint** above.
3. Open it, mark one slide **Fail** → **Re-cut**, **Folded tissue**, and press **Sign off: 1 slide failed**. Scan the rack again: it is checked out; the failed slide shows **Recut Requested** on its case.
4. Audit log: Stain QC Pending, then Stain QC Failed with the slide, the reason and the re-cut.

## Files

`services/stainQc/` (types, rules, the service, case writes, mock, http, instance), `services/hl7/processInboundStainQcSignOffEvent.ts`, `types/events/StainQcSignOffEventPayload.ts`, `hooks/useQcCheckpoint.ts`, `useStainQcSettings.ts`, `components/StainQc/QcCheckpointPanel.tsx`, `components/Config/System/StainQcSection.tsx`, `authorization/stainQcCapabilities.ts`, `constants/stainQcActionGroup.ts`; changed: `mockBatchService.ts` (the gate), `wsiScanQueue.ts` and `wsiScanBatchWorkflow.ts` (holding images), `slideImages.ts`, `useSlideDistributionStation.ts`, `EquipmentSection.tsx`, `mockEquipmentService.ts` (two stainers), `Specimen.ts` (`QC Pending`).
