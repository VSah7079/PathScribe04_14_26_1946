// src/services/screens/configSectionAccess.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 429 (Pete: grey out each section's controls). Which capabilities let a
// person change each Configuration section, so the screen can show it view
// only to someone without them. Any one of the listed capabilities makes the
// section editable; the section's services still check each action, and a
// refused change still shows the refusal banner.
//
// A section that isn't listed is left alone: it has no capability (Terminology
// checks only), holds only the person's own settings (Macros, Voice accent),
// or already greys its own controls (Staff, Support access, Field
// requirements, Template review settings, the registries, governing bodies,
// intraop critical results, Demo Reset).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG_SECTION_CAPABILITIES: Readonly<Record<string, readonly string[]>> = {
  // Configuration tabs
  'tab:ai':          ['config:ai-behavior:manage', 'config:ai-provider:manage', 'config:ai-model:manage', 'config:ai-vendor-policy:manage'],
  'tab:actions':     ['config:actions:manage'],
  'tab:tat':         ['config:tat-targets:manage'],
  'tab:templates':   ['config:report-template:manage', 'config:report-template:publish', 'config:template-routing:manage'],
  'tab:validation':  ['config:validation-studies:manage', 'validation:approval:record'],
  'tab:protocols':   ['config:protocol:draft', 'config:protocol:approve', 'config:protocol:publish', 'config:protocol:retire'],
  'voice:deployment': ['config:voice:manage'],
  'staff:fppe':      ['config:fppe:manage'],
  'staff:cytotech-competency': ['config:cytotech-competency:manage'],
  // Configuration → System
  flags:                    ['config:case-flags:manage'],
  subspecialties:           ['config:subspecialties:manage'],
  specimens:                ['config:specimen-dictionary:manage'],
  stains:                   ['config:stain-dictionary:manage'],
  ink_colors:               ['config:ink-color:manage'],
  inking_validation_mode:   ['config:inking-validation-mode:manage'],
  vendor_integrations:      ['config:vendor-integrations:manage'],
  cytology_qc_rules:        ['config:cytology-qc-rules:manage'],
  or_suite_terminals:       ['config:or-suite-terminals:manage'],
  display_profiles:         ['config:display-profiles:manage'],
  simulated_mail:           ['config:vendor-integrations:manage'],
  performance_targets:      ['config:tat-targets:manage'],
  client_sla:               ['config:tat-targets:manage'],
  migration_field_mappings: ['config:migration-mappings:manage'],
  protocols:                ['config:processing-protocols:manage'],
  printer_profiles:         ['config:printers:manage'],
  simulated_print:          ['config:printers:manage'],
  site_agents:              ['config:site-agents:enroll', 'config:site-agent-config:manage'],
  workstations:             ['config:workstations:manage', 'config:workstation-tokens:manage'],
  bi_feed:                  ['config:bi-feed:manage', 'config:bi-feed-tokens:manage', 'config:bi-feed-identified:approve'],
  requisition_ingestion:    ['config:requisition-ingestion:manage'],
  grossing_route_overrides: ['config:grossing-routes:manage'],
  departments:              ['config:departments:manage'],
  asset_locations:          ['config:asset-locations:manage'],
  cold_chain:               ['config:cold-chain:manage'],
  research_cases:           ['config:research-cases:manage', 'config:batch-purposes:manage'],
  smart_capture:            ['config:smart-capture:manage'],
  interface_dictionary:     ['platform:interface-dictionary:manage'],
  container_types:          ['config:container-types:manage'],
  reagent_lots:             ['config:reagent-lots:manage'],
  workstation_groups:       ['config:workstation-groups:manage'],
  action_groups:            ['config:action-groups:manage'],
  scan_stations:            ['config:scan-stations:manage'],
  equipment:                ['config:equipment:manage', 'equipment:maintenance:record'],
  stain_qc:                 ['config:stain-qc:manage'],
  grossing_hardware:        ['config:grossing-hardware:manage'],
  cassette_routing_rules:   ['config:cassette-routing:manage'],
  cassette_colors:          ['config:cassette-colors:manage'],
  print_settings:           ['config:print-settings:manage'],
  label_designer:           ['config:label-layouts:manage'],
  fonts:                    ['config:report-appearance:manage'],
  document_style:           ['config:report-appearance:manage'],
  retention:                ['config:retention-policy:manage'],
  delegation_types:         ['config:delegation-types:manage'],
  billing_dictionary:       ['config:billing-rules:manage'],
  pending_approvals:        ['config:billing-tables:approve'],
  code_import:              ['config:billing-code-import:run'],
  modifier_dictionary:      ['config:billing-modifiers:manage'],
  billing_type_triggers:    ['config:billing-triggers:manage'],
  rvu_code_map:             ['config:billing-rvu:manage'],
  ncci_edit_rules:          ['config:billing-ncci:manage'],
  master_payment_types:     ['config:payment-types:manage'],
  jurisdiction_payment_mappings: ['config:payment-mappings:manage'],
  outbound_message_preview: ['config:interface-preview:view'],
  dft_export_preview:       ['config:interface-preview:view'],
  participation_types:      ['config:participation-types:manage'],
  country_signing_rules:    ['platform:signing-rules:manage'],
  code_systems:             ['config:code-systems:manage'],
  session_security:         ['config:session-security:manage'],
  release_buffer:           ['config:release-buffer:manage'],
  concordance_review_settings: ['config:concordance-review:manage'],
  delivery_rules:           ['config:delivery-rules:manage'],
  delivery_schedules:       ['config:delivery-schedules:manage'],
  billing_release:          ['config:billing-release:manage'],
  us_epath:                 ['config:us-epath:manage'],
  batch_registry_feed:      ['config:batch-registry-feed:manage'],
  cosd_destination:         ['config:cosd-destination:manage'],
  history_extraction:       ['config:history-extraction:manage'],
  print_routing_rules:      ['config:print-routing:manage'],
  contribution_settings:    ['config:contribution-settings:manage'],
  external_resources:       ['config:external-resources:manage'],
  research_feed:            ['config:research-feed:manage'],
  clients:                  ['config:facilities:manage'],
  crosswalk:                ['config:crosswalk:manage'],
  case_mask_config:         ['config:case-masks:manage'],
  case_routing:             ['config:case-routing:manage', 'case:routing:run'],
  routing_rules:            ['config:case-routing:manage'],
  physicians:               ['config:physicians:manage'],
  deficiencies:             ['config:deficiency-types:manage'],
  revision_reasons:         ['config:revision-reasons:manage'],
  bench_reasons:            ['config:bench-reasons:manage'],
  peer_review_gate:         ['config:peer-review:manage'],
  clinical_mismatch_rules:  ['config:clinical-mismatch-rules:manage'],
  ai_instructions:          ['config:ai-prompt:edit', 'config:ai-prompt:approve'],
  qa_trend_policy:          ['config:qa-trend-policy:manage'],
  feedback:                 ['config:feedback:manage'],
  abnormal_trigger_rules:   ['config:abnormal-triggers:manage'],
  assist_lis_polling:       ['config:assist-polling:manage', 'assist:lis-message:ingest'],
  qa_config_center:         ['config:qa-types:manage'],
  biopsy_resection_correlation: ['config:biopsy-resection-correlation:manage'],
  tumor_board_rules: ['config:tumor-board-rules:manage'],
  follow_up_tracking: ['config:follow-up-tracking:manage'],
  organ_maps:         ['config:organ-map-scheme:manage', 'config:organ-map-bindings:manage'],
  // Configuration → Cytology
  cytology_categories:          ['config:cytology-categories:manage'],
  non_gyn_cytology_categories:  ['config:cytology-categories:manage'],
  cytology_nomenclature:        ['config:cytology-nomenclature:manage'],
  cytology_screening_strategy:  ['config:cytology-screening-strategy:manage'],
  cytology_histology_correlation: ['config:cytology-histology-correlation:manage'],
  cytology_routing:             ['config:cytology-routing:manage'],
  cytology_qc_settings:         ['config:cytology-qc-rates:manage'],
  cytology_workload_cap:        ['config:cytology-workload-cap:manage'],
  cytology_instrumentation:     ['config:cytology-instrumentation:manage'],
  snomed_histology_severity_mapping: ['config:cytology-severity-mapping:manage'],
};

export interface ConfigSectionAccess {
  /** True when the person may change something in the section (or it isn't gated). */
  editable: boolean;
  /** The capabilities that would make it editable (empty when not gated). */
  needs: readonly string[];
}

/** Batch 612: sections shown only to someone holding one of these capabilities (ForMedrixAI staff sections).
 *  Everyone else does not see them in the list. */
export const PLATFORM_ONLY_SECTIONS: Readonly<Record<string, readonly string[]>> = {
  interface_dictionary: ['platform:interface-dictionary:manage'],
};

/** Whether a section is listed for someone holding `has` (pure). */
export function configSectionVisible(section: string, has: (capability: string) => boolean): boolean {
  const needs = PLATFORM_ONLY_SECTIONS[section];
  return !needs || needs.some(has);
}

/** Whether a section is editable for someone holding `has`. */
export function configSectionAccess(section: string, has: (capability: string) => boolean): ConfigSectionAccess {
  const needs = CONFIG_SECTION_CAPABILITIES[section] ?? [];
  return { editable: needs.length === 0 || needs.some(has), needs };
}

/** In a view-only section, whether this click or change on a control is still
 *  allowed. Clicks: navigation (tabs, sub-tabs, search, closing a dialog, or
 *  anything marked data-config-nav) and focusing a field; buttons, checkboxes
 *  and radios are blocked. Changes (Batch 430): only search and filter fields
 *  (marked data-config-nav, type search, or a class naming search or filter);
 *  every other field, including a dropdown that saves as soon as it changes,
 *  keeps its value. */
export function isViewOnlyControlAllowed(el: { tagName: string; type?: string; className?: string; role?: string | null; navMarked?: boolean }, event: 'click' | 'change' = 'click'): boolean {
  if (el.navMarked) return true;
  const tag = el.tagName.toUpperCase();
  const cls = el.className ?? '';
  if (event === 'change') {
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return true;
    return el.type === 'search' || /search|filter/i.test(cls);
  }
  if (tag === 'BUTTON') {
    // Same test as the CSS that greys the rest (pathscribe.css, .ps-config-viewonly).
    return el.role === 'tab' || /tab|close|search/.test(cls);
  }
  if (tag === 'INPUT') return !(el.type === 'checkbox' || el.type === 'radio');
  return true;
}
