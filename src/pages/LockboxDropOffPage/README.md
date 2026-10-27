# pages/LockboxDropOffPage/

**Batch 648.** In the demonstration the screen opens with six seeded receipts (see `services/lockbox/README.md`); Demo Reset restores them. The presenting script is in `docs/product/DEMO_GUIDE.md`.

Batch 645: **Lockbox Drop-Off** (`/lockbox-drop-off`, Home tile "Lockbox Drop-Off" between Intraop Queue and My Contributions; behind `ScreenGate`, capability `screen:lockbox-drop-off:open`). Service and contract: `services/lockbox/`, `docs/architecture/LOCKBOX_API.md`.

| File | What it is |
|---|---|
| `LockboxDropOffPage.tsx` | The shell: two tabs, breadcrumb, the `LOCKBOX` voice context, and the action events. The Overnight folder tab exists only with `lockbox:folder:review`. The Drop-Off panel stays mounted so a half-typed scan survives a look at the folder. |
| `DropOffPanel.tsx` | The kiosk: one large scan field that takes focus again after each scan; Enter submits; no confirmation dialogs; the Urgent toggle (armed before a scan, applies to that receipt only) with an optional callback number. |
| `PlaceholderForm.tsx` | State B (no pending order): ordering client and physician pick lists from the existing dictionaries, free text for a client not in the list, time dropped (default now). Everything is optional. Enter records, Escape cancels. |
| `ReceiptCard.tsx` | The receipt just written, or the earlier one on a re-scan. Matched: accession number and ordering facility only. Placeholder: its id. |
| `OvernightFolderPanel.tsx` | Receipts not yet accessioned (urgent first, then oldest) with waiting time, state, number or placeholder id and who received them; Mark accessioned, Link to order (placeholder), a link to the Accession screen; the QA time-to-receipt summary. |
| `hooks/useLockboxScan.ts` | The kiosk flow (lookup, then receive, placeholder form or earlier receipt; a write that loses a race to a duplicate shows the earlier receipt). |
| `hooks/useLockboxFolder.ts`, `useLockboxPicklists.ts`, `useLockboxActionEvents.ts` | Folder data and its two actions; the active clients and physicians; `PATHSCRIBE_LOCKBOX_*` events from voice and hotkeys. |
| `lockboxMessages.ts` | Which message shows a refusal code (fixed codes only, never server text). |
| `LockboxDropOffPage.css` | The page's styles (logical properties, no inline CSS). |

**Keys and voice** (`constants/lockboxActionGroup.ts`, `services/actionRegistry/lockboxVoiceCommands.ts`): Alt+S focus the scan field, Alt+G mark the next drop urgent, Alt+D Drop-Off tab, Alt+M Overnight folder, all spoken too; Go to Lockbox Drop-Off is Alt+Shift+Z or Alt+J then Shift+Z (`components/Lockbox/LockboxNavigation.tsx`).

**Notes.** The scan field must keep focus: the app's global scan handlers (material tracking, default action on scan) skip this route, but a scan typed with no field focused would go nowhere. Accession numbers, barcodes, callback numbers and the link field carry `data-phi="true"`. "Open Accession" is a plain link: the Accession screen takes no prefill. The `ko`, `fr`, `de`, `nl` and `es` text is machine translated and needs native-speaker review.
