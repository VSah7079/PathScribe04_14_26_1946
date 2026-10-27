# Translating the Administrator Guide (Batch 647)

The guide is written in English (`docs/admin-guide/src/NN-*.md`) and translated into French (`fr`), German (`de`), Dutch (`nl`), Korean (`ko`) and Spanish (`es`). A translation is a folder `docs/admin-guide/src/<lang>/` holding the same ten file names. The builder (`scripts/admin-guide/build.py`) builds each language into `<edition>/<lang>/`, and `scripts/admin-guide/parity.py` refuses a translation that changes anything the app or the builder depends on. The translations are machine-made; native-speaker review is still needed (see the end).

## The one rule

Change the words. Change nothing else. The English file is the master: same headings in the same order, same table rows, same links, same lines.

## Keep exactly as in English (the checker fails on a change)

| Keep | Example |
|---|---|
| Heading levels and `{#ids}` | `### Department Dictionary {#screen-departments}` becomes `### Répertoire des services {#screen-departments}` |
| The prefix `[FORMEDRIXAI INTERNAL ONLY]` on a heading (translate only the words after it) | `### [FORMEDRIXAI INTERNAL ONLY] Dictionnaire d'interface {#screen-interface-dictionary}` |
| Link targets: `(#screen-...)`. Translate only the link text | `[Services](#screen-departments)` |
| The line `Setup step: Tier 2, step 6` and `Setup step: Reference, not part of setup`, word for word. The builder shows them in your language | unchanged |
| The words `Breadcrumb:`, `Requires:`, `Unlocks:` at the start of a line | `Requires: [Modèles](#screen-x)` |
| `[SCREENSHOT PLACEHOLDER: capture-id - description]`: keep the literal `[SCREENSHOT PLACEHOLDER: ` and the id; translate the description | |
| The Status line of each screen: translate the bold label, then start the value with the status word from `strings.json` | `**Statut :** Réalisé` |
| Everything in backticks: capability keys, ids, values, file names, codes (`config:departments:manage`, `Active`) | unchanged |
| Table shape: the same number of rows and columns; never an unescaped `\|` inside a cell | |
| The first column header of the field and error-code tables: use the exact words in `scripts/admin-guide/strings.json` for your language (`fieldName`, `errorCode`). The other header words come from the same file: `dataType`, `requiredOptional`, `description`, `systemDefault` | |
| Status words: use `statusBuilt`, `statusDemonstration`, `statusPartial`, `statusPlanned`, `statusNotBuilt` from `strings.json` | |
| The word for "none" at the start of a Requires or Unlocks value must be one of the `noneWords` for your language, for example `Aucun, c'est un point de départ.` | |
| Front matter keys `chapter` and `id` (translate `title`) | |
| Glossary lines: `- **TERM**: definition.` with an ASCII colon, same number of lines, same order | |
| Fenced code blocks (diagrams): same number; translate labels inside only if the diagram stays aligned | |

## Never translate

Product and vendor names and standards: PathScribe, ForMedrixAI, BridgeLink, HL7, FHIR, DICOM, SNOMED, LOINC, CPT, ICD, CAP, CLIA, ISO 15189, HIPAA, GDPR, NAACCR, Epic, Cerner, MEDITECH, athenahealth, SignalR, SQL Server, Azure, OIDC, SAML, and similar. Capability keys, error codes, field keys, file and route names. Keyboard keys (Alt+J). Numbers, limits and defaults: copy them exactly.

## On-screen names use the app's own words

The app is already translated (`src/i18n/locales/<lang>.json`). A button, field, tab, menu item or window title named in bold, and every part of a Breadcrumb, must read exactly as that screen reads in your language. Look each one up with:

```
python3 scripts/admin-guide/uitext.py <lang> "Add Department" "Departments"
python3 scripts/admin-guide/uitext.py <lang> --like "grossing"
```

If the app has no translation for a text, translate it yourself and keep it consistent through the chapter.

## Glossary terms

Terms in the translated glossary (`src/<lang>/99-glossary.md`) are linked automatically on first use. Use exactly those translated terms in the chapters (same spelling, same capitalisation). The glossary is translated first.

## Style

Plain, present tense, short sentences, the administrator addressed formally (fr vous, de Sie, nl u, es usted, ko 합니다/하십시오 form). Medical and laboratory vocabulary as a laboratory professional in that country would write it. No marketing words. Keep every caution, limit and "Known limits" statement as written; do not soften or add. Do not add, remove or reorder sentences, rows or sections. Do not "fix" the English; if you think it is wrong, finish the translation and add one line to `docs/admin-guide/open-questions/translation-notes.md`.

## Working steps

1. `python3 scripts/admin-guide/chunks.py split <chapter-file> <dir>` cuts the English chapter into chunks (`01.md`, `02.md`, ...).
2. Translate each chunk into a file with the same name in another directory.
3. Check each chunk against its English: `python3 scripts/admin-guide/parity.py --pair <english-chunk> <translated-chunk> <lang>`; fix everything it lists.
4. `python3 scripts/admin-guide/chunks.py join <lang> <chapter-file> <dir-of-translated-chunks>` writes `src/<lang>/<chapter-file>`.
5. `python3 scripts/admin-guide/parity.py <lang> <chapter-file>` must print `0 problems`.

## Review still needed

Machine translation is not a substitute for a native-speaking laboratory professional. Before the guide is given to a customer in that language, a reviewer should read the chapters for the language and sign off the screens they know (Batch 647 records this as open work, the same as the app's own text).
