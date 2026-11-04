# biFeed (Batch 613, PS-787)

The reporting feed that lets Power BI and other BI tools read PathScribe data through the API server. The browser side holds the settings and tokens and answers a Simulated pull.

- `biFeedCatalog.ts`: the six datasets and every field, with what the de-identified feed does with it (kept, removed, generalised). Field ids are schema names, not translated.
- `biFeedRules.ts`: pure rules. Settings and approval checks, token draft checks, token shape (`psbi_` plus 48 hex characters), SHA-256 hashing, display state, the fields a pull returns, and `decideBiPull` (the answer the server would give).
- `biFeedService.ts`: the service factory. `createToken` and `rotateToken` return the token once; only its hash is stored. `pull` is the Simulated pull and records dataset, row count and field count, never rows. Every change is audited and PHI-free.
- `biFeedServices.ts`: wires the browser demo and applies the capabilities `config:bi-feed:manage`, `config:bi-feed-tokens:manage` and `config:bi-feed-identified:approve`.
- Screen: Configuration > System > Reporting feed (Power BI), `components/Config/System/BiFeedSection.tsx`, hook `hooks/useBiFeed.ts`.
- Server contract for the backend team: `docs/architecture/BI_FEED_API.md` (work item PS-787).

## Batch 617 (part A): server versions (PS-514)

`biFeedService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/BI_FEED_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).

## Batch 730

- `biFeedCatalog.ts`: + `station_events`, `batches`, `add_on_orders` (spec §9.3). Timestamps are generalised to the month when de-identified; turnaround uses `minutes_since_accession` and `minutes_to_cut`. `biFeedRules.ts`: their Simulated row counts.

## Batch 731

- `station_events` gains `parent_item_key` (spec §10.4); new dataset `item_end_states` (spec §10.5; the free-text reason is removed when de-identified).

## Batch 732

- Batch 732: `add_on_orders` gains `block_type`, `slide_size`, `level_count`, `piece_count`.
