# components/Printing/

On-screen feedback for printing that isn't tied to one screen. Both parts sit in one column at the bottom left (`.ps-print-feedback` in `App.tsx`): network print jobs above, the agent status line below.

## Files

- **`AgentPrintStatus.tsx`** (Batch 346, PS-52) — a small status line at the bottom left while this tab's labels are going through the PathScribe Agent:
  - "Sending label to the printer…";
  - "Label queued: 2 jobs ahead" (or "prints next");
  - "Printing on ZD421", only with an agent that sends the optional `PRINT_STARTED`;
  - plus "1 more label waiting" when this tab has several labels in flight.

  It disappears when the job finishes; the screen that printed reports the outcome, as before. It is mounted once, in `App.tsx`, and is an ARIA live region (`role="status"`), so screen readers announce the changes.

  Renders only. The jobs and the wording choice come from `utils/labels/pathscribeAgent/printJobStatus.ts`; the text is `agentPrintStatus.*` in all five languages. Styles: `.ps-agent-print-status*` in `pathscribe.css`.
- **`AgentPrintStatus.test.tsx`** — the line follows a job from sending to done, and is empty otherwise.
- **`NetworkPrintJobs.tsx`** (Batch 347, PS-54) — labels sent to *Direct via Interface Engine* printers.
  - **What it shows:** "sent, waiting for the printer", then "printed" (for 5 s), or "did not print: <reason>" with **Retry** and **Dismiss**. A label with no answer after two minutes can be retried as well.
  - **Retry** is manual only, and a retried label shows its attempt number.
  - **Demo buttons:** with no API server, two dashed buttons simulate the engine's answer.
  - A failure is announced (`role="alert"`).
  - **Renders only:** the jobs, the retry and the message choice come from `services/networkPrint/` (`networkPrintJobs` in `@/services`). Text is `networkPrint.*` and styles are `.ps-netprint-*`.
- **`NetworkPrintJobs.test.tsx`** — waiting, a simulated failure, Retry (new attempt sent), then printed.

---
*See [components/README.md](../README.md) for the other component folders.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 552 (PS-539 phase 2d: site agent screens)

- `SiteAgentStatusLine.tsx` (new): in the Print Queue, "Site agents — online, need attention, offline" with a link to Site agents; with the API server and at least one agent not revoked; refreshed every minute.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- `PrintDestinationFields.tsx` (Batch 553, new): where a report prints, a site agent printer (from the site's list; the only one is picked) or a printer address. Used by the routing rule window and the Print Queue's Redirect.
