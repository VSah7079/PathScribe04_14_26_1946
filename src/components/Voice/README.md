# components/Voice/

Voice dictation and command UI — toggle button, command overlay,
miss-recognition prompt, accent/settings, and the voice macro (text
expansion via spoken phrase) config tab. All real, all wired to
`contexts/VoiceProvider.tsx` and real services. No bugs found in this
folder — two minor consistency notes only.

**Pattern:** Small, focused components, each consuming `useVoice()` from
`VoiceProvider.tsx` for shared voice state (phase, transcript, etc.).

## Files

- **`VoiceSettings.tsx`** — Accent selection + mounts `SpeechConfigTab`
  and (from `Config/System/`) `VoiceSection` — the real consumer of that
  cross-folder file noted in `Config/System/README.md`. No issues.
- **`VoiceMissPrompt.tsx`** — Shown when a voice command isn't recognised,
  up to 3 fuzzy candidates, auto-dismiss/auto-confirm timing logic clearly
  documented in its own header. Deliberately not shown during dictation
  (word misses aren't command misses). No issues.
- **`VoiceToggleButton.tsx`** — Main voice on/off control, 4-color phase
  indicator (standby/local/ai/dictate). References the real, separate
  Gemini-backed voice integration (`VITE_GEMINI_API_KEY`) — distinct from
  the main narrative-generation AI provider abstraction in `Config/AI/`,
  confirmed correct in the `Config/System/` pass, not a stale reference.
  No issues.
- **`VoiceCommandOverlay.tsx`** — Success/fail flash on command
  recognition. No issues.
- **`SpeechConfigTab.tsx`** — Voice macro (spoken phrase → written text
  expansion) admin list. **See Notes — minor consistency items, not bugs.**

## Notes

- **Style inconsistency, not a bug:** `SpeechConfigTab.tsx` instantiates
  `new MockVoiceMacroService()` directly rather than importing a
  pre-built singleton the way every other mock service in this codebase
  is consumed (`mockActionRegistryService`, `mockClientService`, etc. are
  all exported already-instantiated). No functional risk here — the
  service persists to `localStorage`, so even multiple instances would
  read/write the same underlying data — but worth matching the
  established convention if this file is touched again. Confirmed via
  grep: `SpeechConfigTab.tsx` is the sole consumer, so there's no existing
  divergent-instance bug to fix, just a pattern to align.
- **Naming convention, not a bug:** the hook this tab uses is
  `hooks/usepathscribeSpeech.ts` — lowercase 'p', where every other hook
  in this codebase follows `use` + PascalCase (`useSpecimenDictionary`,
  `useSynopticAudit`, `useAuditLog`). Cosmetic only; not renamed here
  since a hook filename rename has broader import-path ripple than fits a
  quick pass — flagging for whenever that file is next touched.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
