# PathScribe — working rules for Claude

PathScribe (`pathscribe-ai`) is ForMedrixAI LLC's AI-assisted clinical pathology reporting / LIS platform, built for the US, UK, EU, and other markets. React + TypeScript on Vite, tested with vitest, UI text through i18next. Services are mostly localStorage-backed mocks today (the `I*Service` → `mock*` / `firestore*` pattern). **The production database is Microsoft SQL Server** (Pete, Sep 2026), reached through a PathScribe API server built on **ASP.NET Core, with SignalR for live updates** (Pete, Sep 26, 2026; see `docs/architecture/LIVE_UPDATES_SIGNALR.md`); the `firestore*` stubs, `firestore.rules` and Firebase emulator tests predate that decision and will be replaced, so don't extend them. **Source control (PS-468, Pete, Oct 11, 2026): trunk-based.** Short-lived `feature/` and `bugfix/` branches (Jira key in the branch name and the PR title) merge into a single `main` through pull requests, with Vercel previews and CI gates (PS-471). Never push to `main`. Until the GitHub repository exists and is connected to the session, the working copy is **not** a git repository and every change still ships as a delta zip.

Pete Nimmo (product owner) is a domain expert, not a coder. When he raises a feature he's asking about feasibility and fit, not claiming it already exists.

---

## Standing rules — check every change against these before delivery, without being asked

### 1. No inline CSS
- All styling lives in real CSS classes, mostly in `src/pathscribe.css` (`.ps-*` families).
- A `style={…}` prop may set **only CSS custom properties**, and only for genuinely per-instance values (a user-chosen colour, say). A real CSS rule consumes the property:
  ```tsx
  <span className="ps-type-color-swatch" style={{ '--swatch-color': c } as React.CSSProperties} />
  ```
  ```css
  .ps-type-color-swatch { background: var(--swatch-color); }
  ```
- Never build colours in JSX (`hex + '18'`). Pass the base hue (`--ps-hue`) and derive tints with `color-mix(in srgb, var(--ps-hue) 9%, transparent)`, the pattern already used throughout `pathscribe.css`.
- If you touch a file that has raw inline styles, convert them in the same change. "Pre-existing" isn't an exemption for a file you edited.
- A helper that returns custom properties for a `style` prop is named `…Vars` (`themeVars`, `labelStyleVars`).
- **Enforced by** `src/services/styleRules/inlineCss.guard.test.ts`, across the whole app, with no exception list (Batch 367).

### 2. No business logic in components
- Components render and dispatch. Anything that decides something goes in `src/services/` or `src/utils/`: filtering, resolution, permission checks, seeding defaults, diffing, save sequencing, audit construction. Keep it pure where possible and test it directly.
- Hooks (`pages/**/hooks/`) orchestrate service calls and state, but decisions still live in services.
- Pass service dependencies in (see `saveParticipationTypeWithAudit(input, { typeService, auditService })`) so they're testable without module mocks.

### 3. International support — every change, all five languages
Full reference: [`src/i18n/README.md`](src/i18n/README.md). The essentials:
- **Every user-facing string goes through `t()`** (or `<Trans>` for inline markup). No hard-coded UI text, labels, placeholders, tooltips, toasts, or error messages, and no hard-coded punctuation between translated pieces either: use a template key (`"{{flag}}: {{value}}"` in English, `"{{flag}} : {{value}}"` in French).
- **Add every new key to all five locale files in the same change**: `src/i18n/locales/{en,fr,de,nl,ko}.json`. Never add a key to `en.json` alone.
- **Belgian Dutch (`nl-BE.json`) and Belgian French (`fr-BE.json`) are regional variants**, not full files: each holds only what Belgian users word differently (aanmelden/afmelden, familienaam, gsm, GSM, Belgian address order) and falls back to `nl` or `fr` for everything else. A new key doesn't go there unless its text uses a word Belgium doesn't; `localeParity.test.ts` flags any that do (inloggen/uitloggen, achternaam; soixante-dix, quatre-vingt-dix).
- **Keys stay sorted** at every level of each file.
- **Same `{{placeholders}}` and same `<tags>`** in every language as in English.
- **Plurals** use i18next suffixes (`key_one` / `key_other`).
- **Word-order pairs** (`…Prefix` / `…Suffix`) may leave one side empty when the partner carries the text (Korean puts the verb last). That's the only allowed empty value.
- **Data is not chrome.** Admin-entered or persisted values (type labels, facility names, stored codes) are never translated at the data layer, but their *display* can go through a lookup key (see `batchManagement.nodes.*`).
- **Jurisdiction names** come from `t('jurisdictionNames.<code>')`, never the English-only `JURISDICTION_LABELS` constant. Some older screens still use that constant; convert them when you touch them.
- **Dates, times, numbers**: format with the user's locale. Use `utils/formatDate.ts` (`formatDate` / `formatDateLong` / `formatDateTime(iso, i18n.language)`), or `JURISDICTION_LOCALE` / `utils/formatAddress.ts` for jurisdiction-specific formats. Never hard-code a locale (`'en-US'`, `'en-GB'`).
- **Terminology Pete has decided** (French MRN is IPP, percentage-point wording per language, Korean name honorifics, the Ms. qualifier) is listed under "Terminology decisions" in `src/i18n/README.md`. Follow it in every new string.
- **Copy names are data.** A duplicated record's name is stored, so it comes from `t('common.copyOfName', { name })`, never an English `" (Copy)"`.
- **Converting on touch**: editing a page's own UI text means converting that page's visible strings in the same change.
- **Audit-log `detail` text stays literal English.** Audit records are compliance artifacts, not UI (see `services/auditlog/README.md`).
- Machine translations for fr/de/nl/ko follow standard professional lab terminology. Korean clinical wording in particular should get native-speaker review before clinical use; say so when adding a lot of it.

**Enforced by tests:**
- `src/i18n/uiText.guard.test.ts`, app-wide (Batch 513): no literal on-screen text, UI attribute or toast message in any UI `.tsx` file; allowed literals are listed in the test with reasons. It can't see English held in a constant and rendered later, so still check those by hand.
- `src/i18n/localeParity.test.ts`, project-wide: every key present in every locale, non-empty, placeholder and markup parity, sorted, `SUPPORTED_LANGUAGES` matches the files.
- `src/services/participationTypes/standingRules.guard.test.ts`: all three rules at source level for the signing-authority screens. Copy its pattern for new high-stakes screens.
- `src/services/duplication/duplicatePolicy.guard.test.ts`: the duplication policy (below), no English copy markers anywhere in `src/`, and no inline CSS in the admin screens the policy covers.

### Duplicate actions
Offer **Duplicate** only where Pete's framework allows it. Yes for complex configuration, templates, and multi-site variants. No for real people or entities, flat lookups of a few fields, and transactional or audit records. Record the decision in `src/services/duplication/duplicatePolicy.ts`, put the copy rules (identity fields cleared, nested data deep-copied) in `duplicateEntities.ts`, and make the save decide add-vs-update from an explicit `mode`, never from whether an entry was passed in. See `src/services/duplication/README.md`.

### 4. Deployment-neutral UI (public or private cloud)
PathScribe must deploy to public or private cloud, so the UI never assumes where data lives.
- **Mock services:** UI code (`components/`, `pages/`, `hooks/`, `contexts/`) never imports a mock service file directly. Use `@/services` or take the service as a dependency.
- **Browser storage:** UI code never touches `localStorage`/`sessionStorage`. Per-user display preferences go through `utils/uiPreferences.ts`; settings that belong to the computer (its scan station, OR terminal, display profile, foot pedal, window positions) go through `utils/workstationSettings.ts`; anything that is data goes through a service.
- **Data in services:** a service that keeps data in the browser uses `dataStorage` / `tabDataStorage` (`services/browserData/dataStorage.ts`) or `mockStorage`, never localStorage / sessionStorage directly; with the API server configured these stay in memory, so no patient data is written to the browser (PS-485, Batch 525). Only preferences, workstation settings and the sign-in session touch browser storage directly. **Enforced by** `src/services/browserData/browserData.guard.test.ts`.
- **Firebase:** no direct Firebase SDK import outside services (and none in new code at all: production is SQL Server).
- **No exceptions:** `services/deploymentReadiness/deploymentBaseline.ts` is empty since Batch 506 (PS-477), and the guard fails if anything is added to it.
- **Enforced by** `src/services/deploymentReadiness/deploymentReadiness.guard.test.ts`.

### 5. Patient data on screen is redactable
- Anything that shows a patient identifier (name, date of birth, MRN, accession or case number, patient contact details) goes inside an element tagged `data-phi="<kind>"`, so support-ticket screenshots redact it. Toasts that name a case: `PhiToastMessage` / `phiToastContent()`, or `showToast(msg, kind, { containsPhi: true })` on the report page.
- Staff names are not patient PHI (Pete's decision).
- **Enforced by** `src/services/phi/phiTagging.guard.test.ts` (no exception list). See `src/services/phi/README.md`.

### 6. Verify, don't trust
- Re-verify ticket descriptions, README claims, and code comments against the current source before building on them. They lag the code: tickets have undercounted bugs and named deleted files, and a comment claimed no `firestore.rules` existed when one sits at the repo root.
- Search the **whole repo**, not just `src/`, before stating that something doesn't exist.
- When you find your own earlier statement was wrong, correct it everywhere you repeated it (code comments, READMEs, the changelog, Jira) and say so plainly.

### 7. A protected action ships with its capability (PS-355, Batch 369)
- Any change that adds or touches an action someone should need permission for (an export, a sign-off, a release, a delete, a configuration change) adds its capability to `src/services/authorization/capabilityCatalog.ts` and checks it in the service that does the work, in the same change: `authorizationService.enforce('<domain:object:verb>', context)`, stopping on a refusal. Screens grey the action out with `CapabilityButton` / `useCapabilities`; that is presentation only.
- Keys are `domain:object:verb`, verb last. One capability per distinct action or report (Pete: no blanket flags). If one capability exposes another's data, list it in `requires`.
- No bypass for any role, Superadmin included: Superadmin is a role granted capabilities like any other. It is reserved for ForMedrixAI support staff; hospitals can't change or assign it (Pete, Batch 371). A capability only ForMedrixAI support should have is `platformOnly: true` (`platform:` domain).
- Built-in role grants go in `capabilitySeeds.ts`; least privilege (Pathologist gets nothing by default).
- The voice/keyboard commands in `constants/systemActions.ts` are not access control; don't gate on them.
- **A new screen reached from Home or a hub** gets a `screen:<name>:open` capability, a seed for the roles that use it, a tile id in `services/screens/screenAccess.ts`, and a `ScreenGate` on its route (Batch 374).
- **Enforced by** `src/services/authorization/capabilities.guard.test.ts`: every catalog capability has a check, every key used is in the catalog, and every capability has its locale text. Server contract: `docs/architecture/AUTHORIZATION_API.md`.

### 8. Click economy (Pete, Oct 11, 2026: "be cognizant of click fatigue")
Pathologists and bench staff repeat the same steps hundreds of times a day. Count the clicks, and remove the ones that add nothing:
- **Don't interrupt.** Show information inline (a banner, a badge, a field note) instead of a window that must be dismissed. Keep a blocking window for a decision that genuinely has to be made before going on (a high-risk mismatch at sign-out, a destructive action).
- **Sensible defaults, pre-filled.** Pre-select the likely answer, and remember the person's last choice (`utils/uiPreferences.ts`).
- **Quick picks before typing.** Offer picklist reasons, with the note optional unless the record needs it.
- **One step, not two.** No confirmation for an action that can be undone. Save on change where it's safe.
- **Keyboard and scanner first.** Every frequent action can be done without the mouse (PS-491).
- When a change adds a click or a window to a frequent path, say so in the summary and why it's needed.

### 9. Every capability is documented for the people who sell, configure, teach and use it (Pete, Oct 11, 2026)
Admin and user guides, training, marketing and RFP answers are written from the docs, so a batch isn't finished until what it changed is written down for them:
- **`docs/product/GUIDE_UPDATES.md`:** one entry per batch that changes what someone sees or can do. It covers what changed, the User Guide and Admin Guide sections affected (the PDFs in `public/help/` are edited outside this repo), the steps for training, a one-line description for marketing and RFPs, and any standards it supports (WCAG, CAP, ISO 15189, HIPAA, GDPR).
- **`docs/product/FEATURE_OVERVIEW.md`:** the area's entry, with its status kept honest (Live / Partial / Planned).
- **Permissions:** `docs/architecture/AUTHORIZATION_API.md` (enforced by its guard).
- **A feature that needs explaining** (a workflow, a rule set, a governance model) gets its own guide in `docs/product/`, as `CLINICAL_MISMATCH_CHECK.md` does.
- Planned work is labelled Planned, never described as built.

---

## Delivery routine (every batch)

1. **Research first.** Read the real code paths and state what's already done vs. genuinely open before writing code.
2. **Build.** Follow the standing rules above.
3. **Validate:** `npm run type-check`, then `npm test` (the full suite, ~6 minutes: give the command a ~590 s timeout). Both must be clean. Report exact file and test counts.
4. **Docs.** Update the `README.md` of every folder you touched **and every ancestor folder up to the repo root**, including the root `README.md` when the change is notable at project level. Add a `## Batch N — …` entry to `src/i18n/README.md` (the master build changelog). Check the last `## Batch` header for the next number.
5. **Package.** Once the repository is connected (PS-468): a `feature/PS-nnn-…` or `bugfix/PS-nnn-…` branch and a pull request into `main`; CI must pass. Until then: a delta zip mirroring `src/` paths (plus any root files), delivered with `SendUserFile`. A zip can't delete files: list every deleted or moved-away path in the root `DELETED_FILES.txt` (newest first). `npm run cleanup:deleted` removes them, and `deletedFiles.guard.test.ts` fails while any is still present (Batch 507).
6. **Jira** (project `PS`, site `formedrixai.atlassian.net`, cloudId `d909ed2d-8fe5-490b-be39-3a2ef8635aa0`): record what was done, what was verified, and what's still open as a comment or in the description.
   - **Statuses (Pete, Oct 12, 2026):** when a batch fully delivers a story or task (nothing material left open), move it to **In Review** with a comment naming the batch and anything for Pete to check. Pete moves it to Done. Never move anything to Done, and never move a ticket that still has open items; comment instead.
   - Don't create new tickets or expand scope unless Pete asks or directs the work.

### Pre-delivery checklist
- [ ] No `style={{ … }}` with a real CSS property in any file touched
- [ ] No new mock-service import, browser-storage use or Firebase import in UI code (deployment-readiness guard passes)
- [ ] No decision logic left in the code paths changed. In a large legacy file, move the logic in the path you changed and list what's left in the summary; don't claim the whole file is clean
- [ ] Every new or changed UI string in all five locales; `localeParity.test.ts` passes
- [ ] Any patient identifier shown on screen is tagged `data-phi` (PHI guard passes)
- [ ] Any new or touched protected action checks its capability in the service (capabilities guard passes)
- [ ] Type-check clean, full suite green, counts reported
- [ ] READMEs updated from each touched folder up to the root; changelog batch entry added
- [ ] `docs/product/GUIDE_UPDATES.md` entry (and `FEATURE_OVERVIEW.md`) for anything a user, admin or buyer would notice
- [ ] Anything disclosed-but-not-fixed is listed plainly in the summary and in Jira
