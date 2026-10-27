# components/Help/

**Batch 668:** the Help buttons moved from floating buttons over the screen into the top bar, beside the microphone. `TopBarHelpButtons.tsx` (rendered by `NavBar`) shows a round ? (User Guide article) and, where the screen has a section there, an open book (Administrator Guide). Targets come from `services/help/helpTargets.ts`; both open through `hooks/useGuideWindow.ts`, a window that remembers its place with a new tab as the fallback. F1 (View Help) sends `PATHSCRIBE_OPEN_USER_GUIDE`. `UserGuideHelpButton` is deleted.

**Batch 657.** `UserGuideHelpButton.tsx`: the floating Help button, placed once beside the app shell. It appears on every screen that has a User Guide article and opens that article in a new tab. Configuration and the administrator screens keep the Administrator Guide buttons in `components/Config/help/`; no screen has both.

- Batch 669b: the User Guide route (`/help/*`) moved into the no-top-bar shell in `SignedInApp.tsx`, so the guide window shows only the guide.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).
