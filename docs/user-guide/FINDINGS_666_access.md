# Findings while drafting the Access and Compliance User Guide pages (group "access")

Found by reading the screens against the code. Nothing was changed in source. Pages describe today's behaviour.

| # | Where | Finding |
|---|---|---|
| 1 | Audit Log | The footer line "SYSTEMS OPERATIONAL" and the green dot are fixed text, not a health check. The footer also says "HIPAA Compliant" as a fixed claim. — Fixed in Batch 669. |
| 2 | Audit Log | The page shows a Pathologist-only role notice and scopes a pathologist's view, but the default roles that open the screen are Admin, Lab Director and QA Reviewer; a Pathologist cannot open it by default. |
| 3 | Audit Log | Quick Links (Alt+Q) has no visible button on the screen. |
| 4 | Audit Log | No tamper-evidence or verify action for the main audit log (already in Known Gaps); the Quality Assurance tab date filter defaults to All Time while the Audit Log tab defaults to 7 days. |
| 5 | Migration Jobs | No tile, menu or button leads to /migration-jobs; it is reachable only by typing the address. The import is a browser-side simulation. The Help button is the Administrator Guide one, not the User Guide one. |
| 6 | Mock EMR | The banner badge always reads "NHS", and Active Problems, Medications, Encounter status and Ward are the same fixed text for every patient. |
| 7 | Mock Interface Engine | Banner text and subtitle name internal ticket and URL details (PS-239, a POST path); the page title includes "(PS-239)". The page and the Mock EMR exist only in demonstration builds. |
| 8 | Help | The profile card's User Guide and Administrator Guide buttons open the older bundled guide documents, not the new /help pages. Two Help buttons on a configuration-plus-guide screen both read "Help". |
| 9 | Help | The /help page has no Help button and no article (routes: [] per coordinator), so F1 on /help opens the contents page. |
| 10 | Sign In | "Forgot password?" only shows a message to ask an administrator. The sign-in page has no language switcher; it uses the workstation's last language. The Google and Microsoft "Soon" buttons are fixed placeholders. |
| 11 | External Consult | The page shows the patient's name and date of birth to anyone holding the link, while the banner says only a demonstration link; the link works only in the issuing browser. Submitting a Draft shows the same "recorded and returned" confirmation as a Signed opinion. — Draft confirmation fixed in Batch 669 (a Draft now says it was saved as a draft and not returned). Patient name and date of birth on the page: Fixed in Batch 669 (masked by default; full identity is an audited opt-in; passcode verification Planned). Batch 669 follow-up: a Signed opinion no longer closes the link at once; it allows 3 more views or 48 hours (the server counts both); dates of birth are written DD-MMM-YYYY (24-OCT-1980, masked **-***-1980); Lab Director can preview identity without being able to issue. |
| 12 | Critical Alert | The "Viewed n times" count is read before this view is recorded, so it lags by one. The expiry time uses the device's locale and time zone, not the facility's. After acknowledging, reopening shows the confirmation; there is no way to undo it. The viewed-count plural uses a base key for the singular. — Fixed in Batch 669: the count includes the current view, the expiry time is shown in the facility time zone (Configuration setting facilityTimezone) with the zone named, and the plural uses a proper singular key. Not changed: no way to undo an acknowledgement (by design; it is an audit record). |
