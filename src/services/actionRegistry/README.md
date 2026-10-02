# services/actionRegistry/

Voice-command and keyboard-shortcut action catalog — the registry of every named system action (e.g. 'DELEGATE_FULL_TRANSFER') that voice commands and shortcuts can trigger.

**Pattern:** Standard interface/mock/firestore pattern.

**Real, honest gap, found while fixing the RFP-APLIS-2026-GLOBAL Multi-Language UI & Localization Framework's own voice-input BCP-47 bug (Sep 2026)**: this registry's own 191 real entries all carry English-only `voiceTriggers` phrases. The new French/German/Dutch/Korean voice *language* profiles (`constants/voiceProfiles.ts`) let the browser's speech engine correctly recognize spoken French/German/Dutch/Korean for free-text dictation, and `contexts/punctuationMaps.ts` covers spoken punctuation commands in those same four languages — but a navigation/action command spoken in one of these languages (e.g. "supprimer" for "delete") would not match any of this registry's own trigger phrases, since none had been translated.

**Update (Sep 2026) — the data model and matching logic are now real and built**: `SystemAction` gained an additive, optional `voiceTriggersByLanguage` field (existing `voiceTriggers` completely untouched — zero migration risk across the 191 real entries), and `findActionByTrigger()` now takes an optional `language` argument, checking a real, translated set first (when one exists) with English kept as a deliberate fallback tier in every matching tier, including the fuzzy one. **Phase 3a also now real and built**: 18 representative, everyday-workflow actions (navigation, sign-out, common AI-review confirm/override/skip) carry real, native-language content for French, German, Dutch, and Korean, verified end to end through real matching tests. **Phase 3b also now real and built (Sep 2026)**: every one of this registry's remaining 170 actions carries the same real, native-language content too — the complete real action surface, 188 of 188 real, matchable actions, applied via a verified translation script and confirmed with 9 more end-to-end matching tests (`phase3bTranslatedTriggers.test.ts`), including disambiguation checks across several real app contexts. One real, honest finding surfaced while testing this: `findActionByTrigger()`'s own `phraseMatch()` has a pre-existing (not introduced by this work) word-boundary-substring quirk — see `MULTILANG_VOICE_COMMANDS_PLAN.md` for the full account. **What's still real, separate work, not attempted here**: a native-speaker quality review of all this translated content, and the separate Gemini refinement-prompt audit (Piece 4 of the plan). Converting an action's own `voiceTriggers` into real, translated phrases when that action is next added or updated falls under the same real "new/updated UI converts its own strings" rule `src/i18n/README.md` already establishes for page/modal text. **See `src/MULTILANG_VOICE_COMMANDS_PLAN.md` for the full scoping plan**, including a real, honest trade-off recorded there: keeping English as a fuzzy-tier fallback reduces, but doesn't eliminate, a genuine cross-language false-positive risk — a deliberate choice favoring bilingual usability, revisitable later.

**Real fix (PS-66, Sep 2026)** — `mockActionRegistryService.ts` had 12 real
`internalKey` collisions against `constants/systemActions.ts`'s own `ACTION_MAP`
(the ticket itself claimed 10; independent verification found 3 it missed and
1 false positive in its list — full count and per-key rationale in
`constants/README.md`). 9 of the 12 were the same logical action described
twice (`ENTER_ADDENDUM`, `NEXT_UNANSWERED`, `NEXT_REQUIRED`, `CONFIRM_FIELD`,
`EDIT_FIELD`, and all four `GROSSING_*` entries) — each now aliases
`systemActions.ts`'s own key via `ACTION_MAP['id']?.internalKey ?? 'fallback'`,
the same pattern already used by `ENTER_GROSS`/`ENTER_MICRO`/`ENTER_DIAGNOSIS`/
`MSG_MARK_UNREAD`/`MSG_COMPOSE`, so the two files can no longer silently drift
apart on these keys. The other 3 (`SKIP_FIELD`, `FULL_VIEW`, `TABBED_VIEW`) had
no `systemActions.ts` counterpart at all — genuinely different actions that had
only accidentally collided — so those keep local literals, just fresh,
never-used ones (`F17+PS054`–`PS056`). `mockActionRegistryService.test.ts`
gained two regression tests: one confirming no hardcoded literal in this file
collides with any `ACTION_MAP` key, one confirming each of the 9 consolidations
and 3 renumbers landed exactly where intended. The existing "every action has a
genuinely unique internalKey" test (mock-internal only) still passes unchanged.
Deliberately **not** touched here: a separate, larger, purely-internal
duplication within `systemActions.ts` itself (16 more keys, unrelated to this
file) — see `constants/README.md` for that disclosure.

## Batch 378

`GROSSING_COMPLETE` (Complete Grossing, category `GROSSING`, Alt+Shift+F9, `grossing.complete` / F24+PS050): voice phrases in all five languages. The Grossing screen sets the `GROSSING` context. Existing stores pick the action up through `loadActions`' merge of new seed actions; the registry version wasn't bumped, so no one's customised shortcuts are wiped.

## Batch 379

`GROSSING_COMPLETE_CONFIRM` (Alt+Shift+F10, `grossing.completeConfirm` / F24+PS051) and `GROSSING_COMPLETE_CANCEL` (Alt+Shift+F11, `grossing.completeCancel` / F24+PS052), in category `GROSSING`, with voice phrases in all five languages. They answer the Grossing screen's "complete grossing without a protocol?" confirmation hands-free, and do nothing when no confirmation is open. They merge into existing stores like `GROSSING_COMPLETE` did, with no version bump.

**Fixed: every action was announced twice.** `executeAction` dispatched `VOICE_ACTION_TRIGGERED` once at the start and again after doing the work. So every page's `onAction` listener ran each command twice: Grossing, Accession, the report page, Intraop, Pool Claim and Delegate. The success toast also showed twice. It now announces once. Found when a voice-confirmed Complete grossing ran a second time against the same case version and showed "This case was updated elsewhere". Guarded by `executeActionDispatch.test.ts`.

## Batch 388

Two buttons in a new category `MICROTOMY` (voice phrases in all five languages; the Microtomy page sets `VOICE_CONTEXT.MICROTOMY` while it is open): `MICROTOMY_ADD_COMMENT` ("add comment", Ctrl+Alt+Shift+A, F26+PS016) and `MICROTOMY_ADD_STAIN` ("add stain", Ctrl+Alt+Shift+B, F26+PS017). The comment drawer and the slide grid's stain picker listen while on screen and act exactly as their Add buttons do, checks included. "add stain" is also a phrase of the case report page's `ADD_ORDERS_STAIN`; the two are in different categories and are never eligible together.

## Batch 397: five more save commands

`ADD_ORDERS_ADD_BLOCK` ("confirm block order", Ctrl+Alt+Shift+8, SYNOPTIC) and, in a new **INTRAOP** category (only while the Intraop page is open), `INTRAOP_START_SESSION` ("continue to specimen", Ctrl+Alt+Shift+1), `INTRAOP_SAVE_SPECIMEN_NEXT` ("next specimen", +2), `INTRAOP_SAVE_SPECIMEN_CLOSE` ("close and save", +3), `INTRAOP_MERGE_CONFIRM` ("merge session", +4). Each acts exactly as its button does, Field Requirements included. The older intraop actions stay in NAVIGATION.

## Batch 401

Two buttons in a new category `EMBEDDING` (voice phrases in all five languages; the Embedding station sets `VOICE_CONTEXT.EMBEDDING` while it is open): `EMBEDDING_CONFIRM_PIECE_COUNT` ("confirm count", "confirm embedding", Ctrl+Alt+Shift+C, F28+PS001) and `EMBEDDING_ADD_COMMENT` ("add comment", Ctrl+Alt+Shift+A, F28+PS002). They act exactly as Confirm and Add Comment do, Field Requirements included. "add comment" is also a Microtomy phrase; the two categories are never eligible together.

## Batch 402

Two buttons in a new category `SLIDE_DISTRIBUTION` (the Slide distribution station sets `VOICE_CONTEXT.SLIDE_DISTRIBUTION` while open): `SLIDE_DIST_CONFIRM_PHYSICAL` ("confirm checkout", "check out slide", Ctrl+Alt+Shift+P, F29+PS001) and `SLIDE_DIST_CONFIRM_DIGITAL` ("confirm scanner", "send to scanner", Ctrl+Alt+Shift+D, F29+PS002), in all five languages. Each acts exactly as its button does, Field Requirements included, and only while its destination is the one on screen.

## Batch 403

A new category, `ADD_ON_ORDER`, is set by the Add-On Orders page while it is open. It has two actions:
- `ADD_ON_ADD_TO_ORDER`: "add to order", Ctrl+Alt+Shift+A, F30+PS001.
- `ADD_ON_SUBMIT_ORDER`: "submit order", Ctrl+Alt+Shift+S, F30+PS002.

Both have phrases in all five languages. Each acts exactly as its button does, Field Requirements and permission included.

## Batch 404

`BATCH_CREATE_CONTAINER` ("create container", Ctrl+Alt+Shift+N, F31+PS001), in a new category, `BATCH_MANAGEMENT`, which Batch Management sets while it's open. It does what New Container's Generate does. Aborting, forcing a reconciliation complete and acknowledging a cold-chain excursion deliberately have no voice command.

## Batch 405

`MOLECULAR_CREATE_PLATE` ("create plate", Ctrl+Alt+Shift+N, F32+PS001), in a new category, `MOLECULAR`, which the plate builder sets while it's open. It does what Create does. Clone & Supersede has no voice command.

## Batch 406

`MOLECULAR_PLACE_RACK` ("place rack", Ctrl+Alt+Shift+P, `F32+PS002`, in `VOICE_CONTEXT.MOLECULAR`) does what Rack Loading's "Place rack" button does, including its Field Requirements and deck-slot checks.

## Batch 428: Configuration permissions

Changing the lab's shortcuts and voice commands (`updateAction`) needs `config:actions:manage` (guardConfigWrites).

## Batch 432

Learned voice commands are per person (Pete): kept as a personal setting (`ps_learned_triggers`), reloaded when someone else signs in; the old shared list carries over the first time. Listed and removable in the profile menu → "My voice commands".

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 380

The report page's modal save buttons, category `SYNOPTIC`, with voice phrases in all five languages:
- `SPECIMEN_EDIT_SAVE` ("save specimen", Alt+Shift+F2, `specimen.saveEdit` / F20+PS009)
- `REVISION_SAVE` ("save amendment", "save correction", "release addendum", Alt+Shift+F3, `diagnosis.saveRevision` / F17+PS057)
- `CRITICAL_NOTIFICATION_RECORD` ("record notification", Alt+Shift+F7, `diagnosis.recordCriticalNotification` / F17+PS058)

Each modal listens while it's open and saves exactly as its button does, Field Requirements check included.

## Batch 381

The group 2 modals' save buttons (category `SYNOPTIC`, voice phrases in all five languages):
- `HOLD_PLACE` ("place hold", Alt+Shift+F5, `case.hold`)
- `HOLD_RELEASE` ("release hold", Alt+Shift+F6, `case.releaseHold`)
- `COMMENT_POST` ("post comment", Alt+Shift+F8, `case.postComment` / F19+PS013)
- `BIOPSY_ARRAY_SAVE` ("save biopsy array", Alt+Shift+F12, `specimen.saveBiopsyArray` / F20+PS010)

The Delegate modal now listens for the existing `DELEGATE_CONFIRM` ("confirm delegation"), which was seeded but had nothing listening. Block cancel and restain have no voice command: several blocks' forms can be open at once, so a command couldn't tell which block it meant.

## Batch 382

Three more modal buttons (category `SYNOPTIC`, voice phrases in all five languages):
- `DISCORDANCE_RECORD` ("record discordance", Ctrl+Alt+Shift+Z, `diagnosis.recordDiscordance` / F17+PS059)
- `POST_SIGNOUT_BILLING_CONFIRM` ("confirm billing change", Ctrl+Alt+Shift+1, `billing.confirmPostSignoutChange` / F24+PS053)
- `CORRECT_CODE_CONFIRM` ("correct billing code", Ctrl+Alt+Shift+2, `billing.correctAppliedCode` / F24+PS054)

Alt+Shift+F1 and F4 were left free (F1 is help; Alt+F4 closes a window). Each modal listens while it's open and acts exactly as its button does, checks included; the correction also needs `billing:applied-code:correct`.

## Batch 383

Four more buttons (category `SYNOPTIC`, voice phrases in all five languages):
- `AUTOPSY_AUTH_SUBMIT` ("record authorization", Ctrl+Alt+Shift+3, `case.recordAutopsyAuthorization` / F19+PS014)
- `AUTOPSY_RELEASE_SUBMIT` ("release body", Ctrl+Alt+Shift+4, `case.releaseAutopsyBody` / F19+PS015)
- `FIXATIVE_GATE_CONTINUE` ("continue fixation gate", Ctrl+Alt+Shift+5, `specimen.continueFixativeGate` / F20+PS011)
- `PREANALYTIC_GATE_CONTINUE` ("continue date gate", Ctrl+Alt+Shift+6, `specimen.continuePreAnalyticGate` / F20+PS012)

Each form or modal listens while it is open and acts exactly as its button does, checks included; the body release also needs `autopsy:body:release`.

## Batch 384

One more button (category `MESSAGES`, voice phrases in all five languages): `SECURE_EMAIL_SUBMIT` ("submit secure email", Ctrl+Alt+Shift+7, `messages.submitSecureEmail` / F18+PS025). The Secure email window listens while it is in its compose state and sends exactly as its button does, checks included. The drawer's Send by voice (`MSG_SEND`) already existed.

## Batch 386

Four buttons in category `CYTOLOGY` (voice phrases in all five languages): `CYTOLOGY_SAVE_REVIEW` ("save review", Ctrl+Alt+Shift+A, F26+PS012), `CYTOLOGY_SAVE_CISOEA` ("save CISOE-A review", +B, PS013), `CYTOLOGY_COMPLETE_RETROSPECTIVE` ("complete retrospective review", +C, PS014) and `CYTOLOGY_RECORD_CORRELATION` ("record correlation", +D, PS015). Each form listens while it is on screen and acts exactly as its button does, checks included.

