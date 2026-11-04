// PathScribe reporting feed: Power Query (M) for Power BI Desktop.
// Batch 730 (Lab Workflow & Batch spec §9.3, §9.3a). NOT RUN AGAINST REAL DATA: written against the contract in
// docs/architecture/BI_FEED_API.md, which the API server has not implemented yet. See POWER_BI_KIT.md.
//
// How to use: in Power BI Desktop, Home > Transform data > New Source > Blank Query, open the Advanced Editor and
// paste one block at a time, naming each query as shown in its first comment line.

// ── Query name: FeedBaseUrl  (Manage Parameters > New Parameter, type Text) ─────────────────────────────────────
// Example value: "https://pathscribe.example-lab.org/api/bi/v1"   (your lab's address; never hard-code it in the queries)

// ── Query name: FeedToken  (Manage Parameters > New Parameter, type Text) ───────────────────────────────────────
// The feed token from Configuration > System > Reporting feed (Power BI). Starts "psbi_". Treat it as a password.

// ── Query name: GetDataset  (a function) ─────────────────────────────────────────────────────────────────────────
let
    GetDataset = (dataset as text) as table =>
        let
            Fetch = (page as number) as record =>
                Json.Document(
                    Web.Contents(
                        FeedBaseUrl,
                        [
                            RelativePath = dataset,
                            Query = [format = "json", page = Number.ToText(page), pageSize = "10000"],
                            Headers = [Authorization = "Bearer " & FeedToken]
                        ]
                    )
                ),
            Pages = List.Generate(
                () => [Response = Fetch(1)],
                each [Response] <> null,
                each if [Response][nextPage] = null then [Response = null] else [Response = Fetch([Response][nextPage])],
                each [Response][rows]
            ),
            Rows = List.Combine(Pages),
            AsTable = Table.FromRecords(Rows, null, MissingField.UseNull)
        in
            AsTable
in
    GetDataset

// ── Query name: StationEvents ─────────────────────────────────────────────────────────────────────────────────────
let
    Source = GetDataset("station_events"),
    Typed = Table.TransformColumnTypes(Source, {
        {"event_at", type datetimezone}, {"minutes_since_accession", type number}, {"event_date_offset_days", Int64.Type},
        {"from_carrier", type logical}, {"is_research", type logical}
    }, "en-US"),
    // Spec §10.3: a carrier-wide event never counts as an item reaching a step. Research cases are left out (Decision 4).
    OwnScans = Table.SelectRows(Typed, each [from_carrier] <> true and [is_research] <> true)
in
    OwnScans

// ── Query name: Batches ───────────────────────────────────────────────────────────────────────────────────────────
let
    Source = GetDataset("batches"),
    Typed = Table.TransformColumnTypes(Source, {
        {"created_at", type datetimezone}, {"sealed_at", type datetimezone}, {"completed_at", type datetimezone},
        {"target_minutes", type number}, {"item_count", Int64.Type}, {"missing_count", Int64.Type}, {"unexpected_count", Int64.Type},
        {"override", type logical}
    }, "en-US")
in
    Typed

// ── Query name: AddOnOrders ───────────────────────────────────────────────────────────────────────────────────────
let
    Source = GetDataset("add_on_orders"),
    Typed = Table.TransformColumnTypes(Source, {
        {"ordered_at", type datetimezone}, {"cut_at", type datetimezone}, {"minutes_to_cut", type number}, {"is_research", type logical}
    }, "en-US"),
    Clinical = Table.SelectRows(Typed, each [is_research] <> true)
in
    Clinical

// ── Query name: ItemEndStates (Batch 731, spec §10.5; untested like the rest of this kit) ─────────────────────────
let
    Source = GetDataset("item_end_states"),
    Typed = Table.TransformColumnTypes(Source, {
        {"recorded_at", type datetimezone}, {"minutes_since_accession", type number}, {"is_research", type logical}
    }, "en-US"),
    Clinical = Table.SelectRows(Typed, each [is_research] <> true)
in
    Clinical

// ── Query name: Cases ─────────────────────────────────────────────────────────────────────────────────────────────
let
    Source = GetDataset("cases"),
    Typed = Table.TransformColumnTypes(Source, {{"accessioned_at", type datetimezone}, {"signed_out_at", type datetimezone}, {"turnaround_hours", type number}}, "en-US")
in
    Typed

// ── Query name: StepReached  (one row per case and step: when the case's last item reached it) ───────────────────
let
    Source = StationEvents,
    WithStep = Table.AddColumn(Source, "tat_step", each
        if [action] = "completed" and [step] = "Embedding" then "embed"
        else if [action] = "completed" and [step] = "Microtomy / Sectioning" then "cut"
        else if [step] = "Staining" and List.Contains({"matched", "completed", "unloaded"}, [action]) then "stain"
        else if [action] = "completed" and ([station_stage] = "Slide Distribution" or [step] = "Checkout") then "distribute"
        else null, type text),
    Steps = Table.SelectRows(WithStep, each [tat_step] <> null),
    Grouped = Table.Group(Steps, {"case_key", "tat_step"}, {{"hours_from_accession", each List.Max([minutes_since_accession]) / 60, type number}})
in
    Grouped
