# services/voice

## Batch 463 (new folder)

`voiceCommandEvents.ts`: the voice provider offers what it heard to the screen first (`offerVoiceCommandToScreen(text, language)`, a `pathscribe:voice-command` window event). A screen that understands it (today the Mohs stage question, `components/OrganMap/MohsStagesInput.tsx`) marks it handled and says what it did (`applied`, `noStage`, `noChange`; `screenVoiceStatusKey` gives the voice bar's message); otherwise the usual voice commands run. `language` is the voice profile's language (en/fr/de/nl/ko).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 609 (#177, #179)

`dictationRefinementPrompt.ts` (pure): builds the AI refinement instructions per dictation language (French, German, Dutch, Korean keep their language) and, for English, per spelling convention (US, GB/IE, AU/NZ, CA). `VoiceProvider` and `PathScribeAIService.refineTranscript` both use it; Configuration, System, Voice lists every prompt for review. Tests: `dictationRefinementPrompt.test.ts`.

## Batch 650 (650a) — the voice engine, now testable

The dictation and command logic that sat inside `contexts/VoiceProvider.tsx` moved here, with seven fixes.

- **`reportDraftVoiceActions.ts`**: the Report Draft's 20 spoken commands as data, with phrases in six languages. The page used to hand an inline list to `actionRegistryService.registerAction?.()`, a method that does not exist, so none registered (Alt+1 to Alt+9 worked because they are key listeners). Registered through `registerTransientActions` by `pages/SynopticReportPage/hooks/useReportDraftVoiceActions.ts`. A test fails if a phrase clashes with another report-screen command.
- **`dictationSectionPicker.ts`**: which section Enter Gross / Micro / Diagnosis and "dictate ..." mean (by report-part id, then label, then position; locked sections skipped; the section being worked on wins among per-specimen gross sections). `ENTER_COMMAND_KIND` maps the three Enter commands.
- **`dictationSegmentFlow.ts`**: one final insert per dictated segment. With AI on, the local text is sent as a provisional (interim) insert and the AI has `REFINEMENT_BUDGET_MS` (2,000 ms); the final call carries the refined text (answered in time), or the local text (too slow, which drops the late answer, or an error). Tested with fake timers.
- **`dictationEditorWriter.ts`** and **`tiptapDictationPort.ts`**: put segments into a rich-text editor. The final replaces the provisional range exactly once (if the person edited it meanwhile, their text stays and the refined text is dropped). The last final segment is tracked through edits; on blur, if the person changed it, their version is stored for the words as heard. Used by `OrchestratorSectionEditor` and `MicroscopicEntryPanel` (before, both inserted the interim and the final text).
- **`dictationCorrections.ts`**: the per-person correction table (moved from `VoiceProvider`), applied before the AI and used as AI examples; the Internal Notes drawer and the report editors share it.
- **`voiceCommandRunner.ts`**: what happens to a heard command: the shared eligibility check, say-it-twice for commands marked `confirmByRepeat` (8 s window; the same command runs it, anything else or silence cancels it; eligibility is checked again), and the audit entry. A phrase that is a command on another screen is refused, not recorded as a miss.
- **`voiceCommandAudit.ts`**: events `Voice command executed` and `Voice command refused`; action id, screen, person and outcome only, never the speech or a case.

Removed dead code in the editors: the effects that waited for phase `dictate` with no target, a state only `startDictation` produces. Not changed: `IntraopQueuePage.tsx` and `VerbalReportForm.tsx` have the same effect. Tests: six new `*.test.ts` files here (44 tests).

## Batch 664 — Edit Field, Cancel

- **`editFieldCommand.ts`** (pure): "Edit Field [name]" → a dictation section request (kind from the words in six languages, else the section label; no name = the section being worked on). `useReportDraftVoiceActions` carries it to `OrchestratorSectionEditor`. `dictationSectionPicker` gained `active` and folds accents when matching a label (never picks a locked section).
- **`spokenAfterCommand.ts`**: `fold`, `textAfterCommand`, `phrasesOf`: what was said after a command's own words (shared with Add Collaborator).
- **`voiceCancel.ts`** (pure): `decideCancel`. Dictating with text dictated this session: the first Cancel asks, a second within 8 s removes it (`dictationEditorWriter.discardSession`, passages the person edited are kept) and ends dictation; nothing dictated: ends dictation; a command waiting to be said twice: dropped (`voiceCommandRunner.cancelPending`, audited as declined); otherwise nothing. Cancel never closes windows or undoes committed work. "cancel dictation" while dictating now runs Cancel (it used to be a stop phrase). `DictationTarget` gained optional `uncommitted` and `discard`; `dictationSessionFor(editor)` (tiptapDictationPort) supplies them to the Report Draft sections and the Microscopic entry. Tests: `editFieldCommand`, `voiceCancel`, `dictationDiscard`, `dictationSectionPicker`.

Batch 665: `editFieldCommand.ts` also matches synoptic template fields (`matchSynopticField`, `isFieldNameRequest`, `requestSynopticFieldEdit`): a name that is not a section word is offered to the synoptic panel first (focus only), then to the Report Draft.
