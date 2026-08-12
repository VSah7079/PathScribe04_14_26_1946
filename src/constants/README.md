# src/constants/

Five files — voice/action registries, macros, and a manually-maintained
config search index.

## The real find: duplicate internalKeys in the keyboard/voice dispatch registry

`systemActions.ts`'s own header states an explicit, documented
invariant: "Never reuse or reassign an internalKey even if an action
is removed." Checked whether that actually held — it didn't. 21
`internalKey` values were each assigned to two genuinely different
actions (two spots were even 3-way collisions) — e.g. `F17+PS001` was
shared by both `diagnosis.grossDescription` and `ai.diagnosisSuggest`,
two completely different commands. Since this key is what the
keyboard handler actually dispatches on, a real collision means the
system can't distinguish between the colliding actions.

Root cause, once mapped out precisely: an entire later block of
actions (`ai.*`, `delegation.*`, `synoptic.*`, `pool.*`) had
internalKeys identical to an earlier block — the pattern strongly
suggests the later block was copy-pasted from the earlier one as a
template and never renumbered.

**Fixed:** kept the earlier block's keys unchanged, assigned fresh,
sequential, genuinely non-conflicting numbers to the later block's
colliding entries, chosen by finding the actual highest existing
number already used in each `Fnn` block first — so the file's own
numbering convention stays intact. Verified via a script that
enumerates every `internalKey` in the file: 188 entries, 188 unique
keys, zero duplicates remaining.

**Found, not fixed — a related but more complex cross-file question:**
`services/actionRegistry/mockActionRegistryService.ts` imports
`ACTION_MAP` from this file, and in several places deliberately reuses
an existing action's key via `ACTION_MAP['x']?.internalKey` — a
legitimate alias pattern. Beyond those, found 10 more real collisions
where that file defines its own separate, hardcoded-key action that
happens to share an internalKey with a `systemActions.ts` entry. Not
fixed — genuinely more complex than a numbering fix, since one
colliding pair (`systemActions.ts`'s `synoptic.confirmField` and
`mockActionRegistryService.ts`'s `CONFIRM_FIELD`) share the exact same
label, raising a real question of whether some of these 10 are
actually two independent definitions of the same logical action that
should be consolidated, not just renumbered. Flagged for a follow-up
decision rather than guessed at. Full detail in `PRIORITY_FIXES.md`
item #36.

## The other four files

`computationalActions.ts`, `defaultMacros.ts`, `voiceProfiles.ts` —
clean, no issues. `configSearchIndex.ts` is a manually-maintained
search index for the Configuration page's search bar, with its own
honest, self-documented confidence levels (explicitly flags which
entries are "verified" against the Admin Guide vs. "placeholder"
best-guesses for tabs that were never documented) — a genuinely mature
pattern, not something needing correction here.
