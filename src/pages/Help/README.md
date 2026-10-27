# pages/Help/

**Batch 657.** `UserGuidePage.tsx`: the User Guide inside the app. `/help` shows the contents and a search box; `/help/<module>/<screen>` shows an article with its "You are here" trail, workflow and role, previous and next step and related actions. What surrounds an article is decided in `services/help/userGuideNavigation.ts`; the article text is built from `docs/user-guide/` and sanitised before it is shown. `userGuide.css` holds its styles.
