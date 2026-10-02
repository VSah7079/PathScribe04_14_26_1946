// src/components/Config/System/systemSections.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: the System tab's sections, as data, so the Configuration search
// can list every one of them (constants/configSearchIndex.ts) without loading
// the screens. SystemTab (./index.tsx) renders its sidebar from the same list.
// ─────────────────────────────────────────────────────────────────────────────

export type SystemSection =
  | 'flags'
  | 'subspecialties'
  | 'specimens'
  | 'stains'
  | 'vendor_integrations'
  | 'cytology_qc_rules'
  | 'or_suite_terminals'
  | 'intraop_critical_results'
  | 'display_profiles'
  | 'migration_field_mappings'
  | 'cancer_registry_settings'
  | 'departments'
  | 'asset_locations'
  | 'container_types'
  | 'reagent_lots'
  | 'workstation_groups'
  | 'action_groups'
  | 'scan_stations'
  | 'equipment'
  | 'grossing_hardware'
  | 'cassette_routing_rules'
  | 'cassette_colors'
  | 'fonts'
  | 'document_style'
  | 'retention'
  | 'session_security'
  | 'support_access'
  | 'field_requirements'
  | 'release_buffer'
  | 'concordance_review_settings'
  | 'template_governance'
  | 'delivery_rules'
  | 'print_routing_rules'
  | 'contribution_settings'
  | 'qa_config_center'
  | 'external_resources'
  | 'research_feed'
  | 'protocols'
  | 'grossing_route_overrides'
  | 'governing_bodies'
  | 'delegation_types'
  | 'rvu_code_map'
  | 'ncci_edit_rules'
  | 'master_payment_types'
  | 'jurisdiction_payment_mappings'
  | 'outbound_message_preview'
  | 'dft_export_preview'
  | 'billing_dictionary'
  | 'code_import'
  | 'billing_type_triggers'
  | 'pending_approvals'
  | 'modifier_dictionary'
  | 'participation_types'
  | 'country_signing_rules'
  | 'print_settings'
  | 'label_designer'
  | 'printer_profiles'
  | 'terminology'
  | 'crosswalk'
  | 'clients'
  | 'case_mask_config'
  | 'case_routing'
  | 'routing_rules'
  | 'physicians'
  | 'deficiencies'
  | 'abnormal_trigger_rules'
  | 'assist_lis_polling';

// Real, per PS-85 (Jira) — every item in this file belonged to
// exactly one of five real, named groups (Workstation & Hardware,
// Lab Materials & Workflows, Clinical Lookups, Financial & Revenue
// Lookups, Administration & Compliance); lis, identifiers,
// terminology, crosswalk, clients, facility_setup, case_mask_config,
// case_routing, routing_rules, physicians, and deficiencies moved OUT
// to their own top-level Integrations tab.
//
// Real, per direct follow-up, superseding PS-85's own top-level split:
// those 11 items are back here now, as a real sixth named group
// ("Integrations") rather than restored to the old, ungrouped flat
// list they lived in pre-PS-85. Integrations/index.tsx - which held
// only this same navigation wiring, no real content of its own - is
// deleted; nothing else referenced it.
// labelKey (not label) below — this array lives at module scope, outside
// any component's render, and can't call useTranslation() itself. Each
// key is resolved via t() at the one real render site (the sidebar nav
// button), same labelKey pattern established for GROSSING_TEMPLATES
// (SpecimenCategoriesSection.tsx, batch 70) and ROUTING_STEPS
// (CasePoolAssignmentSection.tsx, batch 67). `group` stays a literal,
// internal identifier (SystemTab's own group-equality checks and the
// GROUPS derivation below both key off it) — GROUP_LABEL_KEY, just
// below, maps each one to its own translated display text.
export const SECTIONS: { id: SystemSection; emoji: string; labelKey: string; group: string }[] = [
  // ── Workstation & Hardware ──
  // Real, per direct follow-up ("Yes. It should be alpha within the
  // group"): every group below re-sorted alphabetically by label —
  // confirmed, via a real search through past sessions, that this was
  // always the deliberate, actively-maintained convention (one past
  // session explicitly repositioned an item to preserve alphabetical
  // order when its label changed; another explicitly built this
  // array as "15 sidebar items now alphabetical"). The live array had
  // genuinely drifted from that as new items were added over time
  // (mostly the newer Financial & Revenue Lookups and Integrations
  // groups) and simply appended rather than re-sorted. Group order
  // itself (Workstation & Hardware → ... → Integrations) is
  // unchanged — only the order of items within each group. (That
  // alphabetization was by the real English label; it's left as-is
  // per language rather than re-sorted per locale, same as every
  // other alphabetized list elsewhere in this app.)
  { id: 'print_settings',      emoji: '🖨️', labelKey: 'systemTab.sections.printSettings'        , group: 'Workstation & Hardware' },
  { id: 'label_designer',      emoji: '🏷️', labelKey: 'systemTab.sections.labelDesigner'        , group: 'Workstation & Hardware' },
  { id: 'printer_profiles',    emoji: '🖨️', labelKey: 'systemTab.sections.printerProfiles'      , group: 'Workstation & Hardware' },
  { id: 'scan_stations',       emoji: '📍', labelKey: 'systemTab.sections.scanStations'         , group: 'Workstation & Hardware' },
  // Batch 358: the equipment register (took over Batch 356's Instruments list).
  { id: 'equipment',           emoji: '🔬', labelKey: 'systemTab.sections.equipment'            , group: 'Workstation & Hardware' },
  // Batch 359: grossing cameras and scales (settings; the device is in the register).
  { id: 'grossing_hardware',   emoji: '📷', labelKey: 'systemTab.sections.grossingHardware'     , group: 'Workstation & Hardware' },

  // ── Lab Materials & Workflows ──
  { id: 'cassette_colors',     emoji: '🎨', labelKey: 'systemTab.sections.cassetteColors'       , group: 'Lab Materials & Workflows' },
  { id: 'cassette_routing_rules', emoji: '🧊', labelKey: 'systemTab.sections.cassetteRoutingRules', group: 'Lab Materials & Workflows' },
  { id: 'container_types',     emoji: '🧪', labelKey: 'systemTab.sections.containerTypes'       , group: 'Lab Materials & Workflows' },
  { id: 'reagent_lots',        emoji: '🧫', labelKey: 'systemTab.sections.reagentLots'          , group: 'Lab Materials & Workflows' },
  { id: 'workstation_groups',  emoji: '🗺️', labelKey: 'systemTab.sections.workstationGroups'    , group: 'Lab Materials & Workflows' },
  { id: 'action_groups',       emoji: '⚡', labelKey: 'systemTab.sections.actionGroups'          , group: 'Lab Materials & Workflows' },
  { id: 'stains',              emoji: '🧪', labelKey: 'systemTab.sections.stains'               , group: 'Lab Materials & Workflows' },
  // Real, per this module's own DP/AI vendor integration plan's final
  // remaining item. Placed in the same real group as the diagnostic
  // catalog above — this is shared, cross-module infrastructure
  // (surgical pathology + cytology both order AI screenings from it),
  // never a cytology-only setting.
  { id: 'vendor_integrations', emoji: '🔌', labelKey: 'systemTab.sections.vendorIntegrations', group: 'Lab Materials & Workflows' },
  { id: 'cytology_qc_rules', emoji: '🔬', labelKey: 'systemTab.sections.cytologyQcRules', group: 'Lab Materials & Workflows' },
  // Real, per direct design brief on the RFP-APLIS-2026-GLOBAL
  // Intraoperative/Frozen Section Dashboard — same real group as the
  // other lab-hardware/workflow registries.
  { id: 'or_suite_terminals',  emoji: '🏥', labelKey: 'systemTab.sections.orSuiteTerminals'     , group: 'Lab Materials & Workflows' },
  // Batch 399 (Pete): which frozen results count as critical intraoperative results.
  { id: 'intraop_critical_results', emoji: '⚠️', labelKey: 'systemTab.sections.intraopCriticalResults', group: 'Lab Materials & Workflows' },
  // PS-288 — data-only device registry for the five real Facility Ops
  // Dashboard wall displays. Same real group as OR Suite Terminals,
  // a genuinely analogous physical-display registry.
  { id: 'display_profiles',    emoji: '🖥️', labelKey: 'systemTab.sections.displayProfiles', group: 'Lab Materials & Workflows' },
  // Real, per the RFP-APLIS-2026-GLOBAL Historical Data Migration
  // Engine gap.
  { id: 'migration_field_mappings', emoji: '📦', labelKey: 'systemTab.sections.migrationFieldMappings', group: 'Lab Materials & Workflows' },
  // Real, per the RFP-APLIS-2026-GLOBAL Broader Cancer Registry
  // Exports gap — genuinely separate from Cytology's own Registry
  // Reporting subtab, per the RFP's own "Non-Cytology-Scoped" title.
  { id: 'cancer_registry_settings', emoji: '🏛️', labelKey: 'systemTab.sections.cancerRegistrySettings', group: 'Lab Materials & Workflows' },
  { id: 'flags',               emoji: '🚩', labelKey: 'systemTab.sections.flags'                 , group: 'Lab Materials & Workflows' },
  { id: 'grossing_route_overrides', emoji: '🔀', labelKey: 'systemTab.sections.grossingRouteOverrides', group: 'Lab Materials & Workflows' },
  { id: 'specimens',           emoji: '🔬', labelKey: 'systemTab.sections.specimens'   , group: 'Lab Materials & Workflows' },
  { id: 'asset_locations',     emoji: '📍', labelKey: 'systemTab.sections.assetLocations', group: 'Lab Materials & Workflows' },

  // ── Clinical Lookups ──
  { id: 'governing_bodies',    emoji: '📋', labelKey: 'systemTab.sections.governingBodies'      , group: 'Clinical Lookups' },
  { id: 'abnormal_trigger_rules', emoji: '🚩', labelKey: 'systemTab.sections.abnormalTriggerRules', group: 'Clinical Lookups' },
  { id: 'participation_types', emoji: '👥', labelKey: 'systemTab.sections.participationTypes'   , group: 'Clinical Lookups' },
  { id: 'country_signing_rules', emoji: '🌐', labelKey: 'systemTab.sections.countrySigningRules', group: 'Clinical Lookups' },
  { id: 'protocols',           emoji: '🧬', labelKey: 'systemTab.sections.protocols'   , group: 'Clinical Lookups' },
  { id: 'departments', emoji: '🗂️', labelKey: 'systemTab.sections.departments'   , group: 'Clinical Lookups' },
  { id: 'subspecialties',      emoji: '🩺', labelKey: 'systemTab.sections.subspecialties'        , group: 'Clinical Lookups' },

  // ── Financial & Revenue Lookups ──
  { id: 'billing_dictionary',  emoji: '💲', labelKey: 'systemTab.sections.billingDictionary', group: 'Financial & Revenue Lookups' },
  { id: 'dft_export_preview',  emoji: '📄', labelKey: 'systemTab.sections.dftExportPreview', group: 'Financial & Revenue Lookups' },
  { id: 'code_import',         emoji: '📥', labelKey: 'systemTab.sections.codeImport', group: 'Financial & Revenue Lookups' },
  { id: 'billing_type_triggers', emoji: '🚦', labelKey: 'systemTab.sections.billingTypeTriggers', group: 'Financial & Revenue Lookups' },
  { id: 'modifier_dictionary', emoji: '🏷️', labelKey: 'systemTab.sections.modifierDictionary', group: 'Financial & Revenue Lookups' },
  { id: 'jurisdiction_payment_mappings', emoji: '🌍', labelKey: 'systemTab.sections.jurisdictionPaymentMappings', group: 'Financial & Revenue Lookups' },
  { id: 'master_payment_types', emoji: '💳', labelKey: 'systemTab.sections.masterPaymentTypes', group: 'Financial & Revenue Lookups' },
  { id: 'ncci_edit_rules',     emoji: '🚫', labelKey: 'systemTab.sections.ncciEditRules', group: 'Financial & Revenue Lookups' },
  { id: 'pending_approvals', emoji: '✅', labelKey: 'systemTab.sections.pendingApprovals', group: 'Financial & Revenue Lookups' },
  { id: 'rvu_code_map',        emoji: '📈', labelKey: 'systemTab.sections.rvuCodeMap', group: 'Financial & Revenue Lookups' },

  // ── Administration & Compliance ──
  { id: 'fonts',               emoji: '🔤', labelKey: 'systemTab.sections.fonts'        , group: 'Administration & Compliance' },
  { id: 'contribution_settings', emoji: '📊', labelKey: 'systemTab.sections.contributionSettings' , group: 'Administration & Compliance' },
  { id: 'retention',           emoji: '🗄️', labelKey: 'systemTab.sections.retention'        , group: 'Administration & Compliance' },
  { id: 'delegation_types',    emoji: '🔀', labelKey: 'systemTab.sections.delegationTypes'      , group: 'Administration & Compliance' },
  { id: 'document_style',      emoji: '🖋', labelKey: 'systemTab.sections.documentStyle'        , group: 'Administration & Compliance' },
  { id: 'external_resources',  emoji: '🌐', labelKey: 'systemTab.sections.externalResources'    , group: 'Administration & Compliance' },
  // PS-359 (Batch 376): which fields each page requires before saving.
  { id: 'field_requirements',  emoji: '✳', labelKey: 'systemTab.sections.fieldRequirements'    , group: 'Administration & Compliance' },
  { id: 'release_buffer',      emoji: '⏳', labelKey: 'systemTab.sections.releaseBuffer', group: 'Administration & Compliance' },
  { id: 'concordance_review_settings', emoji: '⚖', labelKey: 'systemTab.sections.concordanceReviewSettings', group: 'Administration & Compliance' },
  { id: 'delivery_rules', emoji: '📬', labelKey: 'systemTab.sections.deliveryRules', group: 'Administration & Compliance' },
  { id: 'print_routing_rules', emoji: '🖨', labelKey: 'systemTab.sections.printRoutingRules', group: 'Administration & Compliance' },
  { id: 'qa_config_center',    emoji: '✅', labelKey: 'systemTab.sections.qaConfigCenter' , group: 'Administration & Compliance' },
  { id: 'research_feed',       emoji: '📰', labelKey: 'systemTab.sections.researchFeed'         , group: 'Administration & Compliance' },
  { id: 'session_security',    emoji: '🔒', labelKey: 'systemTab.sections.sessionSecurity'      , group: 'Administration & Compliance' },
  // Batch 372: whether ForMedrixAI support may reach this organisation's data, approvals, and the support audit.
  { id: 'support_access',      emoji: '🛡', labelKey: 'systemTab.sections.supportAccess'        , group: 'Administration & Compliance' },
  // PS-63: template self-approval and required reviewers.
  { id: 'template_governance', emoji: '🧾', labelKey: 'systemTab.sections.templateGovernance', group: 'Administration & Compliance' },

  // ── Integrations ──
  // PS-87: Assist-mode LIS polling (settings, Poll now, activity log).
  { id: 'assist_lis_polling', emoji: '🔄', labelKey: 'systemTab.sections.assistLisPolling', group: 'Integrations' },
  { id: 'case_mask_config', emoji: '🔢', labelKey: 'systemTab.sections.caseMaskConfig', group: 'Integrations' },
  { id: 'case_routing',     emoji: '🔀', labelKey: 'systemTab.sections.caseRouting'           , group: 'Integrations' },
  { id: 'clients',          emoji: '🏥', labelKey: 'systemTab.sections.clients' , group: 'Integrations' },
  { id: 'crosswalk',        emoji: '🧩', labelKey: 'systemTab.sections.crosswalk', group: 'Integrations' },
  { id: 'outbound_message_preview', emoji: '📤', labelKey: 'systemTab.sections.outboundMessagePreview', group: 'Integrations' },
  { id: 'physicians',       emoji: '🩻', labelKey: 'systemTab.sections.physicians'             , group: 'Integrations' },
  { id: 'routing_rules',    emoji: '📋', labelKey: 'systemTab.sections.routingRules'          , group: 'Integrations' },
  { id: 'deficiencies',     emoji: '⚠️', labelKey: 'systemTab.sections.deficiencies'  , group: 'Integrations' },
  { id: 'terminology',      emoji: '🔌', labelKey: 'systemTab.sections.terminology'   , group: 'Integrations' },
];

// Data-key-stays-English, label-is-translated: `group` above stays the
// literal internal identifier (SystemTab's own equality checks key off
// it directly); only the tab-button text shown for each group is
// translated, via this map.
export const GROUP_LABEL_KEY: Record<string, string> = {
  'Workstation & Hardware': 'systemTab.groups.workstationHardware',
  'Lab Materials & Workflows': 'systemTab.groups.labMaterialsWorkflows',
  'Clinical Lookups': 'systemTab.groups.clinicalLookups',
  'Financial & Revenue Lookups': 'systemTab.groups.financialRevenueLookups',
  'Administration & Compliance': 'systemTab.groups.administrationCompliance',
  'Integrations': 'systemTab.groups.integrations',
};

