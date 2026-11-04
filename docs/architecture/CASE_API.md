# Case API: versioned saves (PS-71)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 458. The contract the PathScribe API server (ASP.NET Core, SQL Server) must honour for saving a case, so that a save made from an old copy never silently overwrites someone else's change. The browser build already behaves this way against its mock services; this document is what the server has to match.

## 1. The version

- Each case row has a `row_version`. Use a SQL Server `rowversion` column, or an `int` that the server increments on every write.
- The client sees it as `version` on the case. It comes back on every read, and on every successful write.
- The version covers the whole case, including specimens, blocks, slides, the team, codes, flags, holds and the report.
- Anything stored in child tables is written in the same transaction as the case row, and that write advances the case's version.

## 2. Saving

```
POST /api/cases/case/update-case
If-Match: "<version>"
Content-Type: application/json

{ "caseId": "<id>", "updates": { ...the changed top-level parts of the case... } }
```

- **`If-Match` is required.**
  - A save without it is refused: `428 Precondition Required`.
  - There is no unversioned save.
- **Version matches:** the server applies the change and increments the version, in one transaction. It returns `200` with the new `ETag: "<version+1>"`, and the saved case if asked.
- **Version doesn't match:** the server returns `409 Conflict` with `{ "currentVersion": n }`. Nothing is written.
  - It writes an audit row `case.write.conflict` (case, user, attempted version, current version).
  - The browser does the same today, in `CaseRouter.updateCase`.
- **Update in place:** the compare-and-swap is a single `UPDATE … WHERE id = @id AND row_version = @expected`. When it touches 0 rows, the server answers 409. It never reads, compares and then writes as separate steps.
- **Top-level parts are replaced whole** (for example the whole `specimens` array), as in the browser today. The version check is what makes that safe.

## 3. System saves: read, rebuild, retry

Saves that no person makes (interface messages, scans, batch and workspace actions, sign-out side effects) follow `services/cases/caseWrite.ts` `updateCaseWithRetry`:

1. Read the case and its version.
2. Build the change from what was read.
3. Save with `If-Match`.
4. On a 409, go back to step 1. Stop after 3 tries.

- After the last failed try, the work isn't done.
  - An interface message is left unprocessed so it is redelivered.
  - A person's action reports that it wasn't saved.
- The server may implement these as single transactions instead. The rule is the same: the change is decided against the version it is written to.

## 4. People's saves and the Edit Conflict dialog

- A screen sends the version it loaded, or the version it last saved.
- On a 409 the report page shows the Edit Conflict dialog:
  - **Keep working:** close the dialog; nothing is saved.
  - **View changes:** the parts of the case where this copy differs from the version now saved, and which parts "Save mine anyway" would replace. Every other part stays as saved.
  - **Use their version** (Batch 577; was "Reload their version"): the page reads the case (`GET`, with its version) and shows it in place, discarding what it held unsaved. Nothing new is needed from the server.
  - **Save mine anyway:**
    - Needs `case:edit-conflict:override` (Pathologist, Admin and Lab Director by default; Pete, Oct 4).
    - The server re-reads the newest version and saves the draft's own parts against it (`If-Match` with that version), so a third save landing in between is caught.
    - It audits "Concurrency conflict overridden", naming the version and the parts overwritten (not their values).
    - A refusal is audited too.
- A change to the finalized report (finalize, sign-out, amendment release) never offers "Save mine anyway": the only choice is to reload.
- **When a screen may take a saved version as its own:** only when that save landed straight on top of the screen's version (saved = known + 1), as in `adoptSavedVersion`. Otherwise the screen keeps its old version, so its next save of anything else is checked.

```
POST /api/cases/{caseId}/overwrite
If-Match: "<version the client last saw newest>"

{ "parts": { ...the draft's parts... } }
```

The server checks `case:edit-conflict:override`. It returns `403` when the user doesn't have it, and `409` when another save landed first.

### 4a. A draft save merges field by field

When a draft save gets 409, the client doesn't open the dialog straight away. It merges the draft onto the newest version (`caseWrite.ts` `mergeDraftParts` / `saveDraftParts`), comparing each section with the draft as the page last loaded or saved it:
- Records are matched by id (`instanceId` or `id`): report sections, synoptic and grossing reports, specimens, blocks, slides, flags, comments. Then field by field.
- A section changed only in this draft takes the draft's version; one changed only in the saved case takes the saved version.
- If no section was changed on both sides, the merged parts are saved with `If-Match` on the newest version, and the page takes up the saved case.
- Otherwise the Edit Conflict dialog opens, naming the sections both sides changed.

**Restored drafts.** The page keeps a browser copy of an unsaved draft, every second, together with the version it was built on and its merge base. Restoring it (after a crash, a reload or an inactivity sign-out; "Use their version" discards it, Batch 577) sets those back, so the next save is checked against that version and merged the same way. A restored copy never overwrites newer sections it didn't change.

The server can offer the same merge as `PATCH /api/cases/{id}/draft` with the base version, but it doesn't have to: the client's merge is checked by the ordinary version check.

### 4b. The person reviews before a merge is saved (Pete, Oct 4)

When the merge in 4a would succeed (the other changes are elsewhere), nothing is saved yet. The client shows "Someone else changed this case while you were working", listing what they changed and what this save changes:
- **Save mine with theirs** sends the merged parts with `If-Match` on the version reviewed. A 409 here means the case changed again, and the person reviews again.
- **Not yet** saves nothing. The page takes up the saved case with the person's changes on top, unsaved.

This applies to draft saves and to every instant save on the report page (comments, flags, codes, priority, specimen and block details). The server needs nothing extra: both choices are ordinary versioned saves.

## 5. Claiming and delegating

- **Accepting a pool case:** a versioned save that first checks, on the newest version, that nobody else holds the case. Of two people accepting at once, exactly one wins. The other gets `409` with `{ "reason": "alreadyAccepted" }` and is told so.
- **Delegating:** the team change is built from the newest version.

## 6. What the browser enforces today

- `src/services/cases/caseWriteVersion.guard.test.ts` fails on any case save without a version.
- `CaseRouter.updateCase` requires the version, so the type checker refuses a save without one.
- Tests that cover this: `caseWrite.test.ts`, `mockCaseServicePoolClaim.test.ts`, `blockCaseChanges.test.ts`, `EditConflictDialog.test.tsx`, plus the conflict test in each converted service's own test file.

## 7. Sanitise on save (Batch 500, PS-473)

The browser sanitises HTML **when it displays it** (`src/services/security/sanitizeHtml.ts`, DOMPurify): report sections and paragraphs, case and report comments, barcode SVGs. That is the protection that matters in the browser, but a modified client can save anything, so **the API server must also sanitise on save**:

- **Fields:** report section HTML (`orchSections` / narrative text), report paragraphs bound to case data, case comments and report comments (`text`).
- **Allowed:** ordinary formatting tags (p, br, strong/b, em/i, u, s, ul/ol/li, table/thead/tbody/tr/th/td, h1–h6, span, div, a, sup/sub, blockquote), `class`, `data-*` (including `data-phi`), `href` with http, https, mailto, tel or a relative address (DOMPurify's default URL rule), `target="_blank"` (with `rel="noopener noreferrer"` added), and inline `style` limited to `text-align`, `font-weight`, `font-style`, `text-decoration`.
- **Removed:** script, style, iframe, object, embed, form and form controls, template, every `on*` attribute, `javascript:`/`vbscript:` URLs.
- **Library:** a maintained allow-list sanitiser (e.g. HtmlSanitizer / Ganss.Xss for ASP.NET Core) configured to the list above, so what the server stores and what the browser renders agree.
- **Never** reject a save for content the sanitiser cleans: store the cleaned HTML and record that it was cleaned in the audit log.

## 8. A case's support reference (Batch 573)

`GET /api/cases/{caseId}/support-reference` → `200 { "ref": "SR-XXXX-XXXX" }`.

- The live hub's `caseReport` topic and case presence (`LIVE_UPDATES_SIGNALR.md` §14, §15) are keyed by this reference, so every user of a case must get the same one. The server issues it the first time it's asked for (random, never derived from the case number; `ISupportReferenceService.ts`) and keeps it.
- The caller must be allowed to open the case; otherwise `404`, the same as for a case that doesn't exist.
- Not audited: it is the case's own reference, asked for by someone who may open the case. (Resolving a reference to its case stays audited, `support_reference.resolved`.)
- The browser asks once per case per page load (`services/supportReferences/caseSupportReference.ts`) and, with no API server (the demo), uses its own reference service instead.

## 6. The reads, the worklist and creating a case (Batch 615, PS-482)

The browser's server version of the case service is `services/cases/httpCaseService.ts` (pattern: `HTTP_SERVICES_PATTERN.md`). Calls, in addition to the save in §2:

| Call | Request | Answer |
|---|---|---|
| Read one case | `GET /api/cases/case/get-case?caseId=<id>` | `200` the case with its `version`; `404` when there is none (the browser treats that as "no such case"). |
| List and filter | `POST /api/cases/case/get-all` with `{ search, patientName, hospitalId, patientId, accessionNo, status, pageSize, cursor }` (any may be left out) | `200 { "items": [case...], "nextCursor": "..." }`. `status` is a text or a list of text. `cursor` is used only with `pageSize`. Only cases the caller may see (`CASE_PRIVACY_MODEL.md`). |
| A user's worklist | `GET /api/cases/case/list-cases-for-user?userId=<id>` | `200 { "items": [case...] }` |
| Create | `POST /api/cases/case/create-case` with the case as the body (the browser generates the id) | `201`; the new case's `version` is 1. |

- A refusal is `403`; the browser shows nothing it wasn't given.
- `409` on a save carries `{ "currentVersion": n }`; the browser raises `ConcurrencyConflictError(caseId, expected, n)`, the same error the demo raises.


## Batch 618 (PS-336): the technical-component facility

Decision: the second facility is `order.technicalComponentFacilityId` on the case (string, optional), set at accessioning (the order the Accession screen builds) and changeable afterwards from the Case team window, which writes it with the usual versioned case update. It names a facility with the performing lab role. A value equal to the reporting lab (compared as the resolved performing lab) is treated as not split. The server must accept the field on case create and on order update, and must write an audit entry on a later change (case id and facility ids only, never names).
