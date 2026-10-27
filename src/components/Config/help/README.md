# components/Config/help/

**Batch 668:** `RouteHelpButton` is deleted (the top bar's `Help/TopBarHelpButtons` replaces it); `AdminGuideHelpButton` (Configuration and Migration Jobs) now opens through `hooks/useGuideWindow.ts` and has no floating mode.

**Batch 647.** `RouteHelpButton.tsx` mounts once in `SignedInApp` and shows a floating **Help** button (bottom corner, logical position, so it mirrors in right-to-left) on screens outside Configuration that have a guide section. `AdminGuideHelpButton` gained a `floating` prop and follows the interface language. Styles moved to `adminGuideHelp.css`. No new text keys.

**Batch 646** (Pete, Oct 21, 2026: a Help button on a maintenance screen that opens that screen's page in the guide, with no searching).

- `AdminGuideHelpButton.tsx`: a link, "Help", that opens the Administrator Guide at the section for the screen in a new tab (so unsaved edits stay). `target` is a Configuration tab and section; `screen` is a screen outside Configuration; `inline` places it in the page's own header instead of the Configuration page's top-right corner. Where it goes is decided in `services/help/adminGuideLinks.ts`.
- `ConfigHelpContext.ts`: `useRegisterConfigHelpSection(section)`, called by a tab that keeps its open section in its own state (System, Cytology, Staff, Report Templates, Validation Studies), tells the Configuration page's button which section is open. The Synoptic Library keeps its section in the address, which the page reads.

On a Configuration screen the button sits top right of the page header. Also on the Migration Jobs screen (the Facility Dictionary is a System section, so the page's own button covers it). Not on the Audit Log (a log, not a maintenance screen; its file is over the 1,000-line limit).
