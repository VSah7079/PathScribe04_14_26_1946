**Batch 668:** `helpTargets.ts` decides which guide pages the top-bar Help buttons open (`resolveHelpTargets`) and names the F1 event `OPEN_USER_GUIDE_EVENT`; `userGuideButtonStacked` and `openUserGuideForCurrentPage` are removed.

**Batch 666:** `userGuide.guard.test.ts` also fails when a screen route of the app has no User Guide article and is not listed with a reason in `docs/user-guide/route-exemptions.json`.

**Batch 667:** `userGuide.coverage.guard.test.ts` fails when a screen label (3 to 40 characters, used through `t('key')`) is not in the User Guide or the English Administrator Guide and not in `docs/user-guide/coverage-ignore.json`.

# services/help/

**Batch 647.** `adminGuideUrl(anchor, base, language)` opens the guide in the interface language (`fr`, `de`, `nl`, `ko`, `es`; `fr-BE` is French, `nl-BE` is Dutch; any other language is English). `adminGuideAnchorForRoute(pathname, search)` maps a screen outside Configuration (Audit Log tabs, Batch Management, Outbound Queue and others) to its guide section, for the floating Help button. The guard also checks every language has the same `screen-` anchors as the English.

**Batch 646.** Where the Help button on an admin screen goes in the Administrator Guide.

- `adminGuideLinks.ts`: `adminGuideAnchorFor({ tab, section })` turns the open Configuration tab and section into the guide's anchor id (`screen-<section>` for System and Cytology sections, `screen-<tab>-<sub-tab>` for the other tabs' sub-tabs, `screen-tab-<tab>` for a tab alone); `adminGuideAnchorForScreen(name)` does the same for a screen outside Configuration; `adminGuideUrl(anchor, base)` gives the address of the guide's redirect page (`help/admin-guide/go.html#<anchor>`); `configHelpSection` picks the open section (a tab's own, or the Synoptic Library's `?section=`).
- `adminGuideAnchors.guard.test.ts`: fails when a Configuration tab or section has no section in the guide's source chapters (`docs/admin-guide/src/*.md`), so a screen added to a sidebar cannot ship undocumented.

The guide itself: `docs/admin-guide/` (written in Markdown, built to HTML by `scripts/admin-guide/build.py`, published to `public/help/admin-guide/`). Button: `components/Config/help/`.

**Batch 657: the User Guide.** `userGuideLinks.ts` finds the article for the open screen from the generated route table (`userGuideRoutes.generated.ts`, written by `scripts/user-guide/build.py` from each article's front matter) and builds `/help/<module>/<screen>` addresses; `openUserGuideForCurrentPage` is what the View Help action (F1) runs. `userGuideNavigation.ts` gives the page its "You are here" trail, previous and next step, related actions and grouped contents; `userGuideSearch.ts` searches the published index; `userGuideClient.ts` reads the published files. `userGuide.guard.test.ts` keeps the published guide, the route table and the app's routes in step, and checks no screen opens both guides.

- Batch 669b: the User Guide route (`/help/*`) moved into the no-top-bar shell in `SignedInApp.tsx`, so the guide window shows only the guide.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).
