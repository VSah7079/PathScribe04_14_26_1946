// PathScribe — Flag support types
//
// Previously "SmartTag Type System" — carried the full computational
// ordering/result apparatus (DataSourceBinding, ComputationalResult,
// StatusColorRule, ResultStatus, ActionabilityLevel) plus an entirely
// separate, unused SmartTag/ComputationalTag/AdministrativeTag type
// system that had zero references anywhere outside this file — an
// earlier, abandoned parallel design, same pattern as other dead code
// found elsewhere this session.
//
// Both were removed together. The ordering/result apparatus was
// shelved as a deliberate decision: it didn't solve a validated
// problem, was built on an outbound-polling integration model that
// never matched how either Orchestration or CoPilot actually receive
// data, and its one real working behavior (order-placement messaging)
// didn't even specify a real recipient. What remains here is only
// what genuinely still serves a purpose — Flag as a real catalog/
// triage concept (see IFlagService.ts), independent of any ordering
// or result-tracking mechanism.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum TagClass {
  ADMINISTRATIVE = "ADMINISTRATIVE",
  COMPUTATIONAL  = "COMPUTATIONAL",
}

// Predefined keys into the SVG/glyph library.
// Extend this union as new assay icons are added — no code elsewhere changes.
export type IconKey =
  | "ihc"
  | "fish"
  | "molecular"
  | "flow-cytometry"
  | "cytogenetics"
  | "micro"
  | "coag"
  | "generic-lab";
