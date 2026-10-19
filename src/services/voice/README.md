# services/voice

## Batch 463 (new folder)

`voiceCommandEvents.ts`: the voice provider offers what it heard to the screen first (`offerVoiceCommandToScreen(text, language)`, a `pathscribe:voice-command` window event). A screen that understands it (today the Mohs stage question, `components/OrganMap/MohsStagesInput.tsx`) marks it handled and says what it did (`applied`, `noStage`, `noChange`; `screenVoiceStatusKey` gives the voice bar's message); otherwise the usual voice commands run. `language` is the voice profile's language (en/fr/de/nl/ko).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 609 (#177, #179)

`dictationRefinementPrompt.ts` (pure): builds the AI refinement instructions per dictation language (French, German, Dutch, Korean keep their language) and, for English, per spelling convention (US, GB/IE, AU/NZ, CA). `VoiceProvider` and `PathScribeAIService.refineTranscript` both use it; Configuration, System, Voice lists every prompt for review. Tests: `dictationRefinementPrompt.test.ts`.
