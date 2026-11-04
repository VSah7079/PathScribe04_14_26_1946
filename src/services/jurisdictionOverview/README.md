# services/jurisdictionOverview

Batch 610 (#163). The data behind Configuration, System, Jurisdiction Overview, a read-only page with one table per country.

- `jurisdictionOverview.ts`: pure `buildJurisdictionOverview(input)` joins what is already set up for each jurisdiction (active facilities, roles offered, who can sign out and who needs a countersign, code systems and their role on the day, AI policy, retention rule sources, cancer registries) and `JURISDICTION_SETTING_LINKS`, the screen where each is edited. `jurisdictionsToList` picks the countries to show.
- `jurisdictionOverviewLoader.ts`: `loadJurisdictionOverview(deps)` reads those settings through the services and returns the rows.

The page changes nothing; each Change link goes to the setting's own screen. Nothing is stored here.
