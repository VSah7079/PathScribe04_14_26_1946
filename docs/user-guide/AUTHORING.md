# User Guide: how an article is written (Batch 657)

The User Guide teaches people how to do their work in PathScribe. It does not cover configuration: that is the Administrator Guide (`docs/admin-guide/`). Every article is a Markdown file in `docs/user-guide/src/<module>/`, built by `python3 scripts/user-guide/build.py` into `public/help/user-guide/` (what the app's Help button, the F1 key and the View Help action open at `/help/<module>/<screen>`). Start from `TEMPLATE.md`.

**Who reads it.** Pathologists, pathology assistants, accessioners, histotechnologists, laboratory managers, MDT coordinators and quality staff. Write in clear clinical language. No database, programming or developer words: the build fails on them (see `FORBIDDEN` in the build script).

**The rule that matters most: say only what the screen does today.** Check every field, button, key and message against the real screen before writing it. Where something is planned or only simulated with demonstration data, say so in a note. Never describe a feature that is not built.

## Front matter (the metadata that makes help context-aware)

```
---
module: Accession            # the part of PathScribe
screen: New Case             # leave out for a module's own page
workflow: Specimen Intake    # where it sits in the work
role: [Accessioner]          # who it is for
keywords: [new case, log specimen, intake]   # what people type in search
routes: [/accession]         # app addresses that open this article (patterns like /case/:caseId/synoptic are allowed)
previous: home               # slug of the previous step (optional)
next: worklist               # slug of the next step (optional)
related: [search]            # slugs of related articles (optional)
status: Draft                # Draft until Pete's reviewers mark it Reviewed
---
```

- The address is `/help/<module>/<screen>` (lower case, words joined with hyphens): module "Accession", screen "New Case" is `/help/accession/new-case`. A module's own page has no screen: `/help/accession`. Set `slug:` only to shorten a module name (Quality & Compliance is `/help/quality`).
- `routes` is how a screen finds its article. One route belongs to one article. Configuration and the other administrator screens are not listed here (they open the Administrator Guide).
- Add an article by adding the file and rebuilding: the route table is generated.

## Sections (the build checks every one)

`# Title`, then in this order:

1. **Overview**: purpose, intended users, typical workflow position.
2. **Screen Tour**: a screenshot, then `### Field definitions`, `### Toolbar`, `### Icons and status indicators`, `### Hotkeys` (write "None" when there are none).
3. **Step-by-Step Procedures**: `### Standard workflow` (numbered steps), `### Alternative workflow`, `### Exception handling`, `### Error recovery`.
4. **Tips and Best Practices**: `### Common mistakes`, `### Efficiency recommendations`, `### Workflow recommendations`.
5. **Related Features**: `### Upstream workflow`, `### Downstream workflow`, linked with `[text](help:slug)`.
6. **Troubleshooting**: `### Common user issues`, `### Resolution steps`, `### When to contact support`.

## Style

- Numbered steps, one action each; say what the person sees afterwards.
- Callouts: `!!! tip "Title"`, `!!! warning "Title"` (indented body). Use a warning for anything that can lose work or affect a patient report.
- Examples use demonstration data only (never a real patient).
- Screenshots: `![What it shows](capture:<module>-<screen>-<what>)`. Until `docs/user-guide/img/<id>.png` exists the page shows a placeholder and the id is listed in `MISSING_CAPTURES.md` (generated). Capture with demonstration data, 1600 px wide, no real patient information.
- The guide is English only for now. The app's page labels are in six languages; translated guides follow the Administrator Guide's approach once the English is reviewed.
- Hotkeys: check `docs/product/HOTKEY_DECISIONS.md` and the screen before quoting a key.

## Review

`status: Draft` shows a notice on the page. A clinical reviewer (Pete's team) checks the steps against the real screen and sets `Reviewed`. Update the article in the same change whenever a screen's behaviour changes (CLAUDE.md rule 9).
