# services/voice

## Batch 463 (new folder)

`voiceCommandEvents.ts`: the voice provider offers what it heard to the screen first (`offerVoiceCommandToScreen(text, language)`, a `pathscribe:voice-command` window event). A screen that understands it (today the Mohs stage question, `components/OrganMap/MohsStagesInput.tsx`) marks it handled and says what it did (`applied`, `noStage`, `noChange`; `screenVoiceStatusKey` gives the voice bar's message); otherwise the usual voice commands run. `language` is the voice profile's language (en/fr/de/nl/ko).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
