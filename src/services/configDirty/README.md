# services/configDirty

PS-128 (Batch 437): what the Configuration page knows about unsaved changes. Pure; tested in `configDirtyRegistry.test.ts`.

## `configDirtyRegistry.ts`

- `createConfigDirtyRegistry(onChange)` holds two kinds of unsaved change:
  - **reports** from editors that know their own state exactly. An inline settings form compares its draft with what was saved (`report(id, dirty)`), so typing a value back makes it clean again.
  - **dialogs** in which a field was edited (`dialogEdited`). A dialog counts until it leaves the page (`pruneClosedDialogs`), whether by Save or Cancel. A configuration save that goes through (`configSaved`, from `authorization/guardConfigWrites.ts` `onConfigWritten`) clears dialog edits, for the few dialogs that save and stay open.
- `isTrackedEdit(facts)` decides whether an `input`/`change` event counts:
  - only fields inside an open dialog count;
  - search boxes, buttons and anything inside `data-dirty-ignore` (a filter or a picker's search) don't.
- `draftDiffers(saved, draft)` compares a draft with what was saved, ignoring key order and undefined fields.

## Who uses it

- `pages/ConfigurationPage.tsx` owns the registry. It:
  - provides it through `components/Config/configDirtyGuardContext.ts` (`useReportConfigDirty`, `useConfigNavigationGuard`);
  - watches dialogs with `hooks/useConfigEditTracking.ts`;
  - tells the app-wide guard (`contexts/DirtyStateContext`), so the logo, breadcrumbs, nav bar, header search (`hooks/useGuardedNavigate.ts`) and Sign Out ask first.
- These sections report their exact state, 25 in all:
  - Cytology: Nomenclature, Routing, Screening Strategy, Registry, Workload Cap, Instrumentation, Compliance Features and Cyto-Histologic Correlation;
  - System: Cytology QC settings, Cancer Registry, Country Signing Rules, Governing Bodies, Retention, Crosswalk, SNOMED cervical severity mapping, Support Access, Research Feed, Follow-up Tracking, Inking Validation Mode, Organ Maps and Tumor Board Rules;
  - AI Provider Settings and the Action Registry's shortcut editor;
  - Macros and Assist LIS polling, through Batch 309's `setDirty`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): five later sections added (20 → 25), from `useReportConfigDirty` call sites.*

## Batch 438: closing a dialog from outside

Pete: clicking outside some pop-ups still closed them without asking.
- `forgetDialog`, `dialogDirty`, `dirtyDialogs` on the registry.
- `outsideCloseNeedsConfirm`: a click on a dialog's backdrop, or Escape, asks first when that dialog has edits.
- **Correction to Batch 437:** the page noticed edits in the capture phase, before React handled them, and re-rendered in between, so the first keystroke (or first pick) in a dialog or form with nothing unsaved yet was lost. It now listens after React (bubble phase). A test checks the listener phase.

## PS-128 review (Oct 15, 2026): "Discard changes" closes the dialog

The review test found that after a backdrop click (or Escape) on Cassette Colours' Add dialog, **Discard changes** forgot the edits but left the dialog open. Batch 438 replayed the held click or key, and most Configuration dialogs (Cassette Colours, Departments and most System dictionaries) close only from their own Cancel, so the replay did nothing. Escape + Discard behaved the same way for those dialogs.
- `discardDialogEdits(dialog, deps)`: forget the edits, replay the click or key, and if the dialog is still open once the page has rendered, close it with its own Cancel. A dialog that can't be closed either way still counts as unsaved.
- `pickDismissControl(controls, labels)`: picks that control. A button marked `data-dialog-dismiss` comes first, then one labelled Cancel in the person's language, then Close (text, `aria-label` or `title`), then a ✕ styled as a close control.
- One path for every Configuration dialog: `pages/ConfigurationPage.tsx` calls it, and `hooks/useConfigEditTracking.ts` `dismissConfigDialog` reads the dialog's buttons.
