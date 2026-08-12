# PathScribe — session bundle

Everything changed in this session, with an installer so nothing has to be
applied by hand.

## Use

Unzip into the project root, then from the project root:

```powershell
node _session-bundle/apply.cjs            # preview — writes nothing
node _session-bundle/apply.cjs --apply    # apply, with .bak backups
```

Then:

```powershell
npx tsc --noEmit -p .
```

and restart the dev server.

## What it does

**Safe to run more than once.** Every operation is idempotent — a second run
reports `= already up to date` and writes nothing. Safe after a partial manual
attempt, and safe if another session already applied some of it.

**Nothing is silently overwritten.** Existing files are copied to `.bak`
before the first change. Clean up afterwards with:

```powershell
Get-ChildItem -Recurse -Filter *.bak | Remove-Item
```

**Shared files are patched, not replaced.** `pathscribe.css`, `Home.tsx`,
`Config/System/index.tsx`, `useCompanionWindow.ts` and `index.html` are all
edited surgically, so concurrent changes made elsewhere in those files
survive. This matters because a full-file replace from this bundle would wipe
work done in another session.

**A patch that does not fit is skipped and reported, never guessed at.** If a
file has diverged from what this bundle expects, the anchor will not match and
the run exits non-zero so a partial apply cannot be mistaken for a clean one.
Reference copies of every patched file are in `03-patch-these-yourself/` to
diff against.

## Contents

| folder | what |
|---|---|
| `01-new-files/` | Files nothing else writes — copied wholesale |
| `02-css-blocks-to-append/` | Three independent CSS blocks, appended only if absent |
| `03-patch-these-yourself/` | Reference copies of the patched files, for diffing |
| `apply.cjs` | The installer |

## Not handled by the installer

Three documentation edits are left to you, because they are prose insertions
into files whose surrounding text may have changed:

- `src/services/README.md` — folder-index row + New folders (August 2026) entry
- `src/components/Config/README.md` — System/ file count 29 → 30
- `src/components/Common/README.md` — `PubMedTicker.tsx` entry

`.ps1` is deliberately not used — the execution policy on this machine blocks
it, and `node` is already a dependency.
