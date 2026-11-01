# Demonstration checklists: kept out of customer areas (Batch 754), tagged and never copied (Batch 755a)

Pete, Oct 31, 2026. The 19 generic synoptic checklists in `src/data/templates/generic/` (every file there
whose `source` is not `PathScribe`) are **demonstration content**. Their wording is PathScribe's own (or still
placeholder), but their question list was inherited from older CAP- and RCPath-derived files, so no customer gets
them. PathScribe's own checklists stay everywhere: Mohs, oral cavity, neck dissection, and the cytology, grossing and
autopsy templates.

The list: `src/services/templates/demoChecklists.ts` (`DEMO_CHECKLIST_IDS`, pinned by a test against the files).

## 0. Names, the "Demo wording" tag and the copy refusal (Batch 755a)

- **Plain names.** The 19 were named "Generic Template — …"; they are now "Colon resection", "Prostate needle biopsy",
  "Radical prostatectomy", "Breast, invasive carcinoma (resection)", "Colorectal resection (UK layout)" and so on (the
  `name` in each file, the library entry in `demoChecklistRegistry.ts`, and the `templateName` the demo cases store).
  Nothing in PathScribe finds a checklist by its name: organ map bindings, the case's reports, copies and the removal
  tool all use the template id, so the rename changes only what is shown.
- **The tag.** Wherever a demonstration checklist's name is shown (the case's checklist header and its entry in the
  case sidebar, the checklist picker on a case, and the Synoptic Library lists), a grey **Demo wording** tag sits
  beside it (`components/Synoptic/DemoWordingTag.tsx`, decided by `showsDemoWordingTag()`). Its tooltip says the
  wording has not been reviewed by a pathologist and cannot be copied. The tag is not printed in a report.
- **No copy.** `checklistCopyRefusal()` refuses a demonstration checklist as the source of any copy:
  the library card offers no **Duplicate** or **New Version** (`protocolActions()`), **Build / Customise → existing
  template** leaves them out with a one-line note (`copySourceCandidates()`), the editor opened at
  `/template-editor/<id>?mode=duplicate` (or `newVersion`) shows "This checklist can't be copied" instead, and
  `templateService.saveDraft` refuses the first save of such a copy (`DEMO_CHECKLIST_COPY`) whatever a screen allowed.
- **When the tag comes off (Pete's rule).** Only after a pathologist has reviewed a checklist's wording. Then the file's
  `source` becomes `PathScribe` and its id leaves `DEMO_CHECKLIST_IDS` (a test keeps the two in step). One flag drives
  all three: the tag, the copy refusal and the customer-build exclusion, so a reviewed checklist is also offered to
  customers. Record the reviewer and date in the changelog entry that makes the change.
- **Copies made before Batch 755a** keep whatever name they were given and carry the inherited wording; they are not
  tagged, because a copy has its own id. The removal tool (section 2) does not touch them.

## 1. Customer builds: left out automatically

A customer build is `npm run build:server` (`vite build --mode server`).

- `templateService.ts` loads the 19 from `demoChecklistLoaders.ts` only when `DEMO_CHECKLISTS_IN_BUILD` (every mode
  except `server`), so Vite leaves their files out of a customer build altogether.
- The Synoptic Library (`protocolShared.tsx`) lists none of them in a customer build.
- `scripts/check-production-bundle.mjs` (run by `build:server`) **fails the build** if any of their files is in it.

The demonstration site (`npm run build`, Vercel) keeps them.

## 2. A customer organisation on a deployment that has them

For an organisation that started on a deployment carrying them (a pilot on the demonstration site, say), ForMedrixAI
support removes them from that organisation's library. Each is **archived**: not offered for new reports, and a
report already made with one still opens. One audit entry per checklist (the usual "archived" entry) and one summary
entry, `DEMO_CHECKLISTS_REMOVED`.

- **In the app:** Configuration → Synoptic Library → All protocols → **Demonstration checklists** card (shown only to
  holders of `platform:demo-checklists:remove`, ForMedrixAI support): **Check what would be removed** (a dry run),
  then **Remove demonstration checklists** and confirm. In the demonstration build the library belongs to the
  browser, so this applies to every demo organisation there until Full Reset.
- **From a command line, against an API server:**

  ```
  PS_API_TOKEN=<token> node scripts/remove-demo-checklists.mjs --api https://<server> --organisation <organisation id>
  PS_API_TOKEN=<token> node scripts/remove-demo-checklists.mjs --api https://<server> --organisation <organisation id> --apply
  ```

  A dry run unless `--apply`. The token is read from the environment and never printed or saved. **Planned:** it
  works once the API server offers the endpoint below; until then it reports that the server does not offer it.

### Endpoint contract (API server, Planned)

`POST /api/templates/remove-demo-checklists`

Request: `{ "organisationId": "ORG-123", "dryRun": true }`

Checks: `platform:demo-checklists:remove` and `config:protocol:retire` for that organisation; refuse with 403
otherwise. Apply the same rules as `services/templates/demoChecklistRemoval.ts` to **that organisation's** library
only: archive every demonstration checklist that is not already archived, write the audit entries, change nothing on
a dry run.

Response 200:

```json
{
  "dryRun": true,
  "plan": { "toRemove": [{ "id": "colon_resection", "name": "Colon resection", "status": "published" }],
            "alreadyRemoved": [], "notInLibrary": ["breast_invasive"] },
  "removed": [],
  "failed": []
}
```

`failed` items: `{ "entry": { "id": "…", "name": "…", "status": "…" }, "message": "…" }`.

## What this does not do

- It does not delete the files from the repository or from the demonstration site.
- An organisation's administrator holding `config:protocol:retire` can still restore an archived checklist (Restore
  returns it to draft, to be reviewed before use). Blocking that for demonstration checklists is not built.
- A customer's own copies (Duplicate, New Version) of a demonstration checklist are not touched, and they keep the inherited question list. Removing PathScribe's originals before go-live does not change that: the copies were made from content PathScribe supplied. So copies made from these checklists carry the same risk as the originals; a customer's live checklists should be built from content the customer or ForMedrixAI is licensed for, or written from scratch, not copied from these.
