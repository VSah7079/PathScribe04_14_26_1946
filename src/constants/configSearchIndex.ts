/**
 * configSearchIndex.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Searchable index of Configuration, for the search bar on ConfigurationPage.
 *
 * Batch 431 (Pete: "I was searching for Field Requirements, but the system
 * couldn't find any entries"): the hand-written list below covered about 50
 * settings, while the System tab alone has 69 sections, so most sections
 * could not be found. CONFIG_SEARCH_INDEX is now the hand-written entries
 * (which carry synonyms and descriptions) PLUS one entry for every tab and
 * for every System, Cytology, Staff and Synoptic Library section, generated from the
 * same section lists the sidebars use (System/systemSections.ts,
 * Cytology/cytologySections.ts). A new section is searchable as soon as it's
 * in its sidebar; configSearchIndex.test.ts checks that every section is.
 *
 * Confidence levels, since this was built from documentation rather than the
 * actual tab component source:
 *   - 'ai', 'system', 'staff', 'actions', 'templates', 'demo' entries are
 *     grounded in the Admin Guide v0.9.1 and should be accurate as of that
 *     writing, but should be spot-checked against current code.
 *   - 'macros' and 'validation' entries are PLACEHOLDERS — neither tab is
 *     covered anywhere in the Admin Guide, so these are best-guess based on
 *     the tab label alone. Replace with real entries once those components
 *     are reviewed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SECTIONS as SYSTEM_SECTIONS, GROUP_LABEL_KEY as SYSTEM_GROUP_LABEL_KEY } from '../components/Config/System/systemSections';
import { SECTIONS as CYTOLOGY_SECTIONS } from '../components/Config/Cytology/cytologySections';

export type ConfigTabId =
  | 'ai' | 'protocols' | 'staff' | 'voice' | 'system' | 'cytology' | 'tat'
  | 'actions' | 'macros' | 'templates' | 'validation' | 'demo';

/** Every Configuration tab, in the page's order (Batch 431: shared with ConfigurationPage). */
export const CONFIG_TABS: readonly ConfigTabId[] = ['ai', 'protocols', 'staff', 'voice', 'system', 'cytology', 'tat', 'actions', 'macros', 'templates', 'validation', 'demo'];

/** The Staff tab's sub-tabs (Config/Staff/StaffTab.tsx reads ?section=). */
export const STAFF_SECTIONS: readonly { id: string; labelKey: string }[] = [
  { id: 'members',       labelKey: 'staffTab.tabs.members' },
  { id: 'roles',         labelKey: 'staffTab.tabs.roles' },
  { id: 'credentialing', labelKey: 'staffTab.tabs.credentialing' },
];

/** Batch 449: the Report Templates tab's inner tabs (TemplateBuilder/ReportTemplatesSection.tsx reads ?section=). */
export const TEMPLATE_SECTIONS = [
  { id: 'templates', labelKey: 'templateListTab.title' },
  { id: 'parts',     labelKey: 'templateAssemblyPage.partLibraryTitle' },
  { id: 'routing',   labelKey: 'reportTemplatesSection.subtabs.routingRules' },
] as const;

/** Batch 449: the Validation Studies tab's inner tabs (ValidationStudies/ValidationStudiesSection.tsx reads ?section=). */
export const VALIDATION_SECTIONS = [
  { id: 'studies',   labelKey: 'validationStudies.tabs.studies' },
  { id: 'dashboard', labelKey: 'validationStudies.tabs.dashboard' },
  { id: 'reports',   labelKey: 'validationStudies.tabs.reports' },
] as const;

/** The Synoptic Library tab's sections (Config/Protocols/index.tsx reads ?section=). */
export const PROTOCOL_SECTIONS: readonly { id: string; labelKey: string }[] = [
  { id: 'active', labelKey: 'activeProtocolsSection.title' },
  { id: 'review', labelKey: 'templateRenderer.nav.breadcrumbReviewQueue' },
  { id: 'all',    labelKey: 'allProtocolsSection.title' },
];

export interface ConfigSearchEntry {
  id: string;
  /** i18n key for the on-screen label (either a new
   *  `configSearchIndex.entries.<id>.label` key, or the exact-text key of
   *  an existing translation elsewhere in the app for the same setting —
   *  see ConfigSearchBar.tsx's own i18n note). */
  labelKey: string;
  /** i18n key for the on-screen description, always
   *  `configSearchIndex.entries.<id>.description` — this index's own
   *  summary wording is never an exact-text match for any other on-screen
   *  string, so every entry gets its own new key. Batch 431: generated
   *  section entries have none; they show their group (contextKey). */
  descriptionKey?: string;
  /** Batch 431: where the setting sits, shown when there's no description
   *  (a System section's group). */
  contextKey?: string;
  /** Real, internal search-matching data, deliberately left untranslated —
   *  see ConfigSearchBar.tsx's own i18n note. */
  synonyms: string[];
  tabId: ConfigTabId;
  confidence: 'verified' | 'placeholder';
  /** Real, per direct report ("the top level search in config found the
   *  entry, but when clicked on, it did not go to the setting"): v1
   *  scope (see ConfigSearchBar.tsx's own former header comment) only
   *  ever switched the top-level tab, never the specific sub-section
   *  within it — for a tab with many sections (System has 30+), that
   *  usually landed nowhere near the actual setting searched for.
   *  Optional, System-tab-only for now: the exact SystemSection id
   *  (Config/System/index.tsx's own type) this entry corresponds to,
   *  reusing the same real PATHSCRIBE_SYSTEM_NAVIGATE event
   *  AppShell.tsx's own config-link chat messages already dispatch —
   *  not a new mechanism. Left undefined for entries without a
   *  confirmed, unambiguous section (e.g. 'sys-jurisdiction'/'sys-info'
   *  aren't real SystemSection sidebar items at all) rather than
   *  guessed. */
  section?: string;
}

const HAND_WRITTEN_ENTRIES: ConfigSearchEntry[] = [
  // ── AI Behavior tab ────────────────────────────────────────────────────────
  { id: 'ai-provider', labelKey: 'aiProviderSettings.providerLabel', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-provider.description',
    synonyms: ['anthropic', 'gemini', 'claude', 'model provider'] },
  { id: 'ai-vendor-policy', labelKey: 'aiVendorPolicySection.title', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-vendor-policy.description',
    synonyms: ['ai vendor', 'vendor policy', 'allowed ai', 'jurisdiction ai', 'hosting region', 'data residency', 'eu region', 'ai not available', 'bedrock region', 'azure region'] },
  { id: 'ai-model', labelKey: 'aiProviderSettings.modelLabel', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-model.description',
    synonyms: ['claude sonnet', 'llm', 'ai model version'] },
  { id: 'ai-confidence-threshold', labelKey: 'aiTab.confidenceThreshold.title', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-confidence-threshold.description',
    synonyms: ['threshold', 'ai triage', 'not found'] },
  { id: 'ai-gross-driven', labelKey: 'aiTab.grossDriven.title', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-gross-driven.description',
    synonyms: ['gross description ai'] },
  { id: 'ai-microscopic-driven', labelKey: 'aiTab.microscopicDriven.title', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-microscopic-driven.description',
    synonyms: ['microscopic description ai', 'protocol re-evaluation'] },
  { id: 'ai-auto-insert', labelKey: 'configSearchIndex.entries.ai-auto-insert.label', tabId: 'ai', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.ai-auto-insert.description',
    synonyms: ['auto apply', 'auto accept'] },
  // Batch 449: "API mode" (removed with the developer key path in Batch 444)
  // and "Voice AI" (no such switch on this tab) are gone.

  // ── System tab ─────────────────────────────────────────────────────────────
  { id: 'sys-dp-vendors', labelKey: 'configSearchIndex.entries.sys-dp-vendors.label', tabId: 'system', confidence: 'verified', section: 'vendor_integrations',
    descriptionKey: 'configSearchIndex.entries.sys-dp-vendors.description',
    synonyms: ['ai vendor', 'digital pathology', 'computational pathology', 'paige', 'ibex', 'pathai', 'proscia', 'hologic', 'fda cleared'] },
  { id: 'sys-wsi-viewer-vendors', labelKey: 'configSearchIndex.entries.sys-wsi-viewer-vendors.label', tabId: 'system', confidence: 'verified', section: 'vendor_integrations',
    descriptionKey: 'configSearchIndex.entries.sys-wsi-viewer-vendors.description',
    synonyms: ['wsi viewer', 'whole slide imaging', 'scanner', 'leica', 'aperio', 'roche', 'upath', 'hamamatsu', 'philips', 'intellisite', 'launch url', 'dicom'] },
  { id: 'sys-ims-vendors', labelKey: 'configSearchIndex.entries.sys-ims-vendors.label', tabId: 'system', confidence: 'verified', section: 'vendor_integrations',
    descriptionKey: 'configSearchIndex.entries.sys-ims-vendors.description',
    synonyms: ['image management', 'vna', 'pacs', 'dam', 'on-prem', 'file server', 'image storage', 'pdf storage', 'fallback url'] },
  { id: 'sys-gross-imaging-vendors', labelKey: 'configSearchIndex.entries.sys-gross-imaging-vendors.label', tabId: 'system', confidence: 'verified', section: 'vendor_integrations',
    descriptionKey: 'configSearchIndex.entries.sys-gross-imaging-vendors.description',
    synonyms: ['gross imaging', 'macro imaging', 'telepathology', 'grossing camera', 'cut-up', 'paxit', 'paxcam', 'pathozoom', 'smart in media', 'macropath', 'milestone medical'] },
  { id: 'sys-cytology-qc-rules', labelKey: 'systemTab.sections.cytologyQcRules', tabId: 'system', confidence: 'verified', section: 'cytology_qc_rules',
    descriptionKey: 'configSearchIndex.entries.sys-cytology-qc-rules.description',
    synonyms: ['qc rules', 'quality control', 'rescreen', 'peer review', 'cytology qc', 'clia', 'rapid rescreen', 'assignment engine'] },
  { id: 'sys-or-suite-terminals', labelKey: 'systemTab.sections.orSuiteTerminals', tabId: 'system', confidence: 'verified', section: 'or_suite_terminals',
    descriptionKey: 'configSearchIndex.entries.sys-or-suite-terminals.description',
    synonyms: ['or dashboard', 'intraoperative dashboard', 'frozen section', 'or suite', 'station identity', 'operating room terminal'] },
  { id: 'sys-intraop-critical-results', labelKey: 'systemTab.sections.intraopCriticalResults', tabId: 'system', confidence: 'verified', section: 'intraop_critical_results',
    descriptionKey: 'configSearchIndex.entries.sys-intraop-critical-results.description',
    synonyms: ['critical result', 'critical value', 'frozen section', 'intraoperative', 'surgeon unavailable', 'read back', 'positive margin'] },
  { id: 'sys-display-profiles', labelKey: 'systemTab.sections.displayProfiles', tabId: 'system', confidence: 'verified', section: 'display_profiles',
    descriptionKey: 'configSearchIndex.entries.sys-display-profiles.description',
    synonyms: ['facility ops dashboard', 'department dashboard', 'wall display', 'kiosk', 'display profile', 'grossing dashboard', 'staining dashboard', 'lab operations dashboard'] },
  { id: 'sys-simulated-mail', labelKey: 'systemTab.sections.simulatedMail', tabId: 'system', confidence: 'verified', section: 'simulated_mail',
    descriptionKey: 'configSearchIndex.entries.sys-simulated-mail.description',
    synonyms: ['simulated e-mail', 'outbox', 'mail log', 'demo e-mail', 'notification e-mail', 'sent mail'] },
  { id: 'sys-performance-targets', labelKey: 'systemTab.sections.performanceTargets', tabId: 'system', confidence: 'verified', section: 'performance_targets',
    descriptionKey: 'configSearchIndex.entries.sys-performance-targets.description',
    synonyms: ['performance target', 'productivity target', 'cases per month', 'RVU target', 'monthly RVUs', 'quota', 'workload target'] },
  { id: 'sys-client-sla', labelKey: 'systemTab.sections.clientSla', tabId: 'system', confidence: 'verified', section: 'client_sla',
    descriptionKey: 'configSearchIndex.entries.sys-client-sla.description',
    synonyms: ['client SLA', 'service level agreement', 'client turnaround', 'first touch target', 'STAT turnaround', 'SLA breach', 'contract TAT'] },
  { id: 'sys-jurisdiction-overview', labelKey: 'systemTab.sections.jurisdictionOverview', tabId: 'system', confidence: 'verified', section: 'jurisdiction_overview',
    descriptionKey: 'configSearchIndex.entries.sys-jurisdiction-overview.description',
    synonyms: ['jurisdiction', 'country setup', 'region settings', 'country overview', 'signing rules by country', 'code systems by country', 'retention body'] },
  { id: 'sys-simulated-print', labelKey: 'systemTab.sections.simulatedPrint', tabId: 'system', confidence: 'verified', section: 'simulated_print',
    descriptionKey: 'configSearchIndex.entries.sys-simulated-print.description',
    synonyms: ['simulated print', 'print log', 'simulated agent', 'demo printing', 'failure simulator', 'engrave log'] },
  { id: 'sys-migration-field-mappings', labelKey: 'systemTab.sections.migrationFieldMappings', tabId: 'system', confidence: 'verified', section: 'migration_field_mappings',
    descriptionKey: 'configSearchIndex.entries.sys-migration-field-mappings.description',
    synonyms: ['data migration', 'legacy import', 'field mapping', 'legacy lis', 'bulk import'] },
  { id: 'sys-cancer-registry-settings', labelKey: 'systemTab.sections.cancerRegistrySettings', tabId: 'system', confidence: 'verified', section: 'cancer_registry_settings',
    descriptionKey: 'configSearchIndex.entries.sys-cancer-registry-settings.description',
    synonyms: ['naaccr', 'cpac', 'cosd', 'inca', 'gekid', 'aihw', 'kccr', 'cancer registry', 'tumor registry', 'icd-o'] },
  // Real, per direct follow-up ("did we work on this yet? Per-facility
  // Specimen Deficiencies" → the config search bug this surfaced): five
  // entries removed here — LIS Integration Enabled/Endpoint/Owns Case
  // Statuses, Allow Post-Final Actions, and Identifier Formats — all
  // pointed at screens (LISSection.tsx, IdentifierFormatsSection.tsx)
  // confirmed to be genuinely dead: a prior session's own real
  // Facility-level migration had already replaced the global
  // SystemConfig fields these screens edited, but never finished
  // deleting the screens themselves. The real replacements now live
  // inside FacilityEditorModal.tsx's own "LIS Integration" tab and
  // Facility.identifierFormats — both edited per-facility from the
  // Facility Configuration screen, not indexed separately here (this
  // pass is deliberately scoped to the confirmed-stale removals plus
  // the one section directly asked about below, not a full rebuild of
  // this index against the current nav).
  // Batch 595: this entry now points at Configuration → System → Code Systems
  // (before, it promised a SNOMED CT release / ICD variant setting that had no screen).
  { id: 'sys-jurisdiction', labelKey: 'systemTab.sections.codeSystems', tabId: 'system', confidence: 'verified', section: 'code_systems',
    descriptionKey: 'configSearchIndex.entries.sys-jurisdiction.description',
    synonyms: ['snomed', 'icd', 'icd-10', 'icd-11', 'icd-o', 'cap', 'rcpath', 'region', 'jurisdiction', 'code system'] },
  { id: 'sys-specimens', labelKey: 'accessionPage.tabs.specimens', tabId: 'system', confidence: 'verified', section: 'specimens',
    descriptionKey: 'configSearchIndex.entries.sys-specimens.description',
    synonyms: ['specimen dictionary', 'specimen types', 'autopsy specimen category'] },
  // Real, per direct follow-up: "it all needs to be wired" — neither
  // the Protocol Dictionary nor the (newly-built) Asset Location
  // Dictionary had any real entry here at all, meaning searching
  // "autopsy" or "mortuary" in Config found nothing, even though the
  // real configuration itself exists.
  { id: 'sys-protocols', labelKey: 'systemTab.sections.protocols', tabId: 'system', confidence: 'verified', section: 'protocols',
    descriptionKey: 'configSearchIndex.entries.sys-protocols.description',
    synonyms: ['protocol', 'pathway', 'processing workflow', 'autopsy cardiac sectioning'] },
  { id: 'sys-asset-locations', labelKey: 'systemTab.sections.assetLocations', tabId: 'system', confidence: 'verified', section: 'asset_locations',
    descriptionKey: 'configSearchIndex.entries.sys-asset-locations.description',
    synonyms: ['mortuary', 'storage slot', 'autopsy storage', 'tray utilization', 'occupancy'] },
  { id: 'sys-cold-chain', labelKey: 'systemTab.sections.coldChain', tabId: 'system', confidence: 'verified', section: 'cold_chain',
    descriptionKey: 'configSearchIndex.entries.sys-cold-chain.description',
    synonyms: ['freezer', 'refrigerator', 'temperature', 'excursion', 'storage unit', 'smart container', 'telemetry', 'condition type'] },
  { id: 'sys-research-cases', labelKey: 'systemTab.sections.researchCases', tabId: 'system', confidence: 'verified', section: 'research_cases',
    descriptionKey: 'configSearchIndex.entries.sys-research-cases.description',
    synonyms: ['research', 'research patient', 'no charge', 'clinical trial', 'biobank', 'teaching', 'batch purpose', 'validation'] },
  { id: 'sys-smart-capture', labelKey: 'systemTab.sections.smartCapture', tabId: 'system', confidence: 'verified', section: 'smart_capture',
    descriptionKey: 'configSearchIndex.entries.sys-smart-capture.description',
    synonyms: ['charge capture', 'ai charge', 'suggested charges', 'prototype', 'production gate', 'billing suggestions'] },
  { id: 'sys-interface-dictionary', labelKey: 'systemTab.sections.interfaceDictionary', tabId: 'system', confidence: 'verified', section: 'interface_dictionary',
    descriptionKey: 'configSearchIndex.entries.sys-interface-dictionary.description',
    synonyms: ['message mapper', 'vendor profile', 'z segment', 'hl7 mapping', 'fhir mapping', 'extension field', 'vendor fields', 'interface mapping'] },
  { id: 'sys-workstations', labelKey: 'systemTab.sections.workstations', tabId: 'system', confidence: 'verified', section: 'workstations',
    descriptionKey: 'configSearchIndex.entries.sys-workstations.description',
    synonyms: ['workstation token', 'revoke token', 'grossing station', 'register computer', 'print routing workstation', 'room binding', 'context binding'] },
  { id: 'sys-bi-feed', labelKey: 'systemTab.sections.biFeed', tabId: 'system', confidence: 'verified', section: 'bi_feed',
    descriptionKey: 'configSearchIndex.entries.sys-bi-feed.description',
    synonyms: ['power bi', 'bi feed', 'reporting api', 'analytics', 'odata', 'feed token', 'de-identified', 'dashboard feed', 'business intelligence'] },
  { id: 'sys-stain-qc', labelKey: 'systemTab.sections.stainQc', tabId: 'system', confidence: 'verified', section: 'stain_qc',
    descriptionKey: 'configSearchIndex.entries.sys-stain-qc.description',
    synonyms: ['stain qc', 'qc gate', 'quality control', 'sign-off', 'sign off', 'stainer qc', 'image qc', 'scanner qc', 'pre-distribution', 'post-stain', 'vendor sign-off'] },
  { id: 'sys-requisition-ingestion', labelKey: 'systemTab.sections.requisitionIngestion', tabId: 'system', confidence: 'verified', section: 'requisition_ingestion',
    descriptionKey: 'configSearchIndex.entries.sys-requisition-ingestion.description',
    synonyms: ['requisition', 'requisition scan', 'scanned requisition', 'drop folder', 'watched folder', 'separator sheet', 'batch scan', 'unmatched requisitions', 'document ingestion'] },
  { id: 'sys-scope-reference', labelKey: 'systemTab.sections.scopeReference', tabId: 'system', confidence: 'verified', section: 'scope_reference',
    descriptionKey: 'configSearchIndex.entries.sys-scope-reference.description',
    synonyms: ['enterprise', 'facility', 'performing facility', 'scope', 'override', 'organisation wide', 'per facility'] },
  { id: 'sys-subspecialties', labelKey: 'systemTab.sections.subspecialties', tabId: 'system', confidence: 'verified', section: 'subspecialties',
    descriptionKey: 'configSearchIndex.entries.sys-subspecialties.description',
    synonyms: ['subspecialty pools', 'delegation routing'] },
  { id: 'sys-terminology', labelKey: 'systemTab.sections.terminology', tabId: 'system', confidence: 'verified', section: 'terminology',
    descriptionKey: 'configSearchIndex.entries.sys-terminology.description',
    synonyms: ['snomed ct', 'umls', 'terminology status'] },
  { id: 'sys-physicians', labelKey: 'configSearchIndex.entries.sys-physicians.label', tabId: 'system', confidence: 'verified', section: 'physicians',
    descriptionKey: 'configSearchIndex.entries.sys-physicians.description',
    synonyms: ['physicians', 'referring doctor', 'ordering physician'] },
  { id: 'sys-flags', labelKey: 'configSearchIndex.entries.sys-flags.label', tabId: 'system', confidence: 'verified', section: 'flags',
    descriptionKey: 'configSearchIndex.entries.sys-flags.description',
    synonyms: ['case flags', 'specimen flags', 'severity level'] },
  // Real, per direct follow-up ("did we work on this yet? Per-facility
  // Specimen Deficiencies"): this section was confirmed real, built,
  // and live (Config → System → Integrations group → Specimen
  // Deficiencies) but had zero index entry at all — added here now.
  // tabId 'system' since that's this section's own, real, confirmed
  // home (Config/Integrations/index.tsx, a genuine duplicate at the
  // time this was first written, has since been deleted entirely —
  // see components/Config/Integrations/README.md).
  { id: 'sys-revision-reasons', labelKey: 'systemTab.sections.revisionReasons', tabId: 'system', confidence: 'verified', section: 'revision_reasons',
    descriptionKey: 'configSearchIndex.entries.sys-revision-reasons.description',
    synonyms: ['amendment reason', 'correction reason', 'clinically significant', 'capa recommendation', 'revision reason'] },
  { id: 'sys-bench-reasons', labelKey: 'systemTab.sections.benchReasons', tabId: 'system', confidence: 'verified', section: 'bench_reasons',
    descriptionKey: 'configSearchIndex.entries.sys-bench-reasons.description',
    synonyms: ['quick reasons', 'preset reasons', 'block exhausted reason', 'abort reason', 'override reason', 'cold chain', 'reason codes'] },
  { id: 'sys-biopsy-resection-correlation', labelKey: 'biopsyResectionCorrelationSection.title', tabId: 'system', confidence: 'verified', section: 'biopsy_resection_correlation',
    descriptionKey: 'configSearchIndex.entries.sys-biopsy-resection-correlation.description',
    synonyms: ['correlation', 'biopsy', 'resection', 'follow-up window', '180 days', 'collection date', 'surgical qa'] },
  { id: 'sys-tumor-board-rules', labelKey: 'tumorBoardRulesSection.title', tabId: 'system', confidence: 'verified', section: 'tumor_board_rules',
    descriptionKey: 'configSearchIndex.entries.sys-tumor-board-rules.description',
    synonyms: ['tumor board', 'mdt', 'auto-flag', 'margin threshold', 'rule engine', 'close margin'] },
  { id: 'sys-follow-up-tracking', labelKey: 'followUpTrackingSection.title', tabId: 'system', confidence: 'verified', section: 'follow_up_tracking',
    descriptionKey: 'configSearchIndex.entries.sys-follow-up-tracking.description',
    synonyms: ['follow-up', 'overdue', 'not received', 'ordering clinician', 'email clinician', 'warning days', 'resection expected'] },
  { id: 'sys-organ-maps', labelKey: 'systemTab.sections.organMaps', tabId: 'system', confidence: 'verified', section: 'organ_maps',
    descriptionKey: 'configSearchIndex.entries.sys-organ-maps.description',
    synonyms: ['anatomical map', 'prostate map', 'pi-rads', 'sector map', 'biopsy map', 'map colours', 'map colors', 'patterns', 'legend', 'map bindings'] },
  { id: 'sys-peer-review-gate', labelKey: 'systemTab.sections.peerReviewGate', tabId: 'system', confidence: 'verified', section: 'peer_review_gate',
    descriptionKey: 'configSearchIndex.entries.sys-peer-review-gate.description',
    synonyms: ['peer review', 'second opinion', 'first-time malignancy', 'sign-out gate', 'independent review'] },
  // Batch 530 (Pete: every new configuration reachable from Config Search): Field
  // Requirements by page, including Staff, the Facility editor and Clinical history.
  { id: 'sys-field-requirements', labelKey: 'systemTab.sections.fieldRequirements', tabId: 'system', confidence: 'verified', section: 'field_requirements',
    descriptionKey: 'configSearchIndex.entries.sys-field-requirements.description',
    synonyms: ['required fields', 'mandatory fields', 'make a field required', 'optional fields', 'staff required fields', 'staff editor', 'npi required', 'gmc number', 'licence number', 'signature required',
      'facility required fields', 'facility editor', 'facility email', 'fax required', 'postal code', 'postcode', 'zip code', 'city', 'region',
      'clinical history required', 'coded clinical history', 'accession required fields', 'grossing required fields', 'still required'] },
  { id: 'sys-clinical-mismatch-rules', labelKey: 'systemTab.sections.clinicalMismatchRules', tabId: 'system', confidence: 'verified', section: 'clinical_mismatch_rules',
    descriptionKey: 'configSearchIndex.entries.sys-clinical-mismatch-rules.description',
    synonyms: ['mismatch', 'clinical-pathologic correlation', 'clinical correlation', 'discrepancy', 'unexpected malignancy', 'expected malignancy', 'cause of death', 'site or organ', 'threshold', 'alert threshold', 'action threshold', 'block sign-out', 'warn', 'risk rules', 'high risk', 'secondary review', 'ai suggestion'] },
  { id: 'sys-ai-instructions', labelKey: 'systemTab.sections.aiInstructions', tabId: 'system', confidence: 'verified', section: 'ai_instructions',
    descriptionKey: 'configSearchIndex.entries.sys-ai-instructions.description',
    synonyms: ['ai instructions', 'prompt', 'prompt template', 'ai prompt', 'approve prompt', 'mismatch check instructions', 'governed prompt', 'separation of duties', 'test prompt', 'prompt version'] },
  { id: 'sys-qa-trend-policy', labelKey: 'systemTab.sections.qaTrendPolicy', tabId: 'system', confidence: 'verified', section: 'qa_trend_policy',
    descriptionKey: 'configSearchIndex.entries.sys-qa-trend-policy.description',
    synonyms: ['discordance trend', 'pathologist trend', 'pattern', 'threshold', 'rolling window', 'administrative review', 'specimen type trend'] },
  { id: 'sys-feedback', labelKey: 'systemTab.sections.feedback', tabId: 'system', confidence: 'verified', section: 'feedback',
    descriptionKey: 'configSearchIndex.entries.sys-feedback.description',
    synonyms: ['qa feedback', 'feedback button', 'bug report', 'testing feedback', 'validation', 'qa recipients'] },
  { id: 'sys-deficiencies', labelKey: 'systemTab.sections.deficiencies', tabId: 'system', confidence: 'verified', section: 'deficiencies',
    descriptionKey: 'configSearchIndex.entries.sys-deficiencies.description',
    synonyms: ['deficiency type', 'resolution type', 'specimen deficiency', 'requisition deficiency', 'could not match specimen'] },
  { id: 'sys-delegation-types', labelKey: 'systemTab.sections.delegationTypes', tabId: 'system', confidence: 'verified', section: 'delegation_types',
    descriptionKey: 'configSearchIndex.entries.sys-delegation-types.description',
    synonyms: ['peer review', 'second opinion', 'mdt discussion'] },
  // No `section` here either, same reasoning as 'sys-jurisdiction'
  // above — 'info' isn't a real SystemSection sidebar item.
  { id: 'sys-info', labelKey: 'navBar.systemInfo.title', tabId: 'system', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.sys-info.description',
    synonyms: ['build version', 'support report', 'app version'] },

  // ── Cytology tab ───────────────────────────────────────────────────────────
  // Real, per direct report ("when I searched for Cytology, the
  // search did not return anything") — the three real, pre-existing
  // entries below were originally added under 'system' as a fix for
  // that report; relocated here (same real ids, section values, and
  // synonyms) now that Cytology has its own real, dedicated
  // Configuration tab (Config/Cytology/index.tsx). Six new entries
  // added alongside them for the real, previously-missing cascade
  // settings screens built in the same pass.
  { id: 'sys-cytology-categories', labelKey: 'configSearchIndex.entries.sys-cytology-categories.label', tabId: 'cytology', confidence: 'verified', section: 'cytology_categories',
    descriptionKey: 'configSearchIndex.entries.sys-cytology-categories.description',
    synonyms: ['cytology', 'bethesda', 'pap smear', 'cervical cytology', 'bscc', 'rcpath', 'sfcc', 'munchen', 'dyskaryosis'] },
  { id: 'sys-non-gyn-cytology-categories', labelKey: 'configSearchIndex.entries.sys-non-gyn-cytology-categories.label', tabId: 'cytology', confidence: 'verified', section: 'non_gyn_cytology_categories',
    descriptionKey: 'configSearchIndex.entries.sys-non-gyn-cytology-categories.description',
    synonyms: ['milan system', 'paris system', 'salivary gland cytology', 'urinary cytology', 'urine cytology', 'non-gyn', 'sump', 'hguc', 'nhguc'] },
  { id: 'sys-cytology-qc', labelKey: 'configSearchIndex.entries.sys-cytology-qc.label', tabId: 'cytology', confidence: 'verified', section: 'cytology_qc_settings',
    descriptionKey: 'configSearchIndex.entries.sys-cytology-qc.description',
    synonyms: ['cytology', 'rescreening', 'random selection', 'qc rate'] },
  { id: 'sys-cytology-histo-correlation', labelKey: 'configSearchIndex.entries.sys-cytology-histo-correlation.label', tabId: 'cytology', confidence: 'verified', section: 'snomed_histology_severity_mapping',
    descriptionKey: 'configSearchIndex.entries.sys-cytology-histo-correlation.description',
    synonyms: ['cytology', 'histology correlation', 'snomed mapping', 'cyto-histo'] },
  { id: 'cyt-nomenclature', labelKey: 'cytologyNomenclatureSettingsSection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_nomenclature',
    descriptionKey: 'configSearchIndex.entries.cyt-nomenclature.description',
    synonyms: ['cytology', 'nomenclature', 'bethesda', 'bscc', 'sfcc', 'palga', 'terminology system'] },
  { id: 'cyt-registry', labelKey: 'cytologyRegistrySettingsSection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_registry',
    descriptionKey: 'configSearchIndex.entries.cyt-registry.description',
    synonyms: ['cytology', 'registry', 'csms', 'cervicalcheck', 'palga', 'ncsr', 'kncsp'] },
  // Batch 533: whether an urgent cytology preliminary needs the signature (Country and laboratory rules).
  { id: 'cyt-preliminary-signature', labelKey: 'cytologyCompliance.features.preliminarySignature.label', tabId: 'cytology', confidence: 'verified', section: 'cytology_compliance_features',
    descriptionKey: 'configSearchIndex.entries.cyt-preliminary-signature.description',
    synonyms: ['preliminary', 'urgent preliminary', 'prelim signature', 'cytology preliminary', 'electronic signature', 'release policy'] },
  { id: 'cyt-routing', labelKey: 'cytologyRoutingSettingsSection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_routing',
    descriptionKey: 'configSearchIndex.entries.cyt-routing.description',
    synonyms: ['cytology', 'routing', 'non-gyn', 'fna', 'body fluid'] },
  { id: 'cyt-screening-strategy', labelKey: 'cytologyScreeningStrategySection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_screening_strategy',
    descriptionKey: 'configSearchIndex.entries.cyt-screening-strategy.description',
    synonyms: ['cytology', 'screening strategy', 'co-testing', 'primary hpv', 'reflex'] },
  { id: 'cyt-histology-correlation', labelKey: 'cytologyHistologyCorrelationSection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_histology_correlation',
    descriptionKey: 'configSearchIndex.entries.cyt-histology-correlation.description',
    synonyms: ['cytology', 'correlation', 'cyto-histo', 'follow-up window', '180 days', 'collection date', 'biopsy'] },
  { id: 'cyt-workload-cap', labelKey: 'cytologyWorkloadCapSettingsSection.title', tabId: 'cytology', confidence: 'verified', section: 'cytology_workload_cap',
    descriptionKey: 'configSearchIndex.entries.cyt-workload-cap.description',
    synonyms: ['cytology', 'workload cap', 'daily slide cap', 'clia', 'cytotechnologist'] },
  { id: 'cyt-instrumentation', labelKey: 'configSearchIndex.entries.cyt-instrumentation.label', tabId: 'cytology', confidence: 'verified', section: 'cytology_instrumentation',
    descriptionKey: 'configSearchIndex.entries.cyt-instrumentation.description',
    synonyms: ['cytology', 'instrumentation', 'wsi', 'whole slide imaging', 'traditional guided'] },

  // ── Staff tab ──────────────────────────────────────────────────────────────
  { id: 'staff-add', labelKey: 'staffTab.modal.addStaffMember', tabId: 'staff', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.staff-add.description',
    synonyms: ['new user', 'add user'] },
  { id: 'staff-roles', labelKey: 'configSearchIndex.entries.staff-roles.label', tabId: 'staff', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.staff-roles.description',
    synonyms: ['pathologist role', 'resident role', 'admin role', 'permissions'] },
  { id: 'staff-sign-in-password', labelKey: 'staffTab.signInPassword.title', tabId: 'staff', section: 'members', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.staff-sign-in-password.description',
    synonyms: ['password', 'reset password', 'temporary password', 'change password', 'sign-in', 'login', 'locked out'] },
  { id: 'staff-deactivate', labelKey: 'configSearchIndex.entries.staff-deactivate.label', tabId: 'staff', section: 'members', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.staff-deactivate.description',
    synonyms: ['disable user', 'block login'] },

  // ── Action Registry tab ───────────────────────────────────────────────────
  { id: 'actions-registry', labelKey: 'configuration.tabs.actions', tabId: 'actions', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.actions-registry.description',
    synonyms: ['voice triggers', 'keyboard shortcuts'] },

  // ── Report Templates tab ──────────────────────────────────────────────────
  { id: 'tpl-builder', labelKey: 'configSearchIndex.entries.tpl-builder.label', tabId: 'templates', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.tpl-builder.description',
    synonyms: ['parts', 'cap templates', 'template assembly', 'part library'] },
  { id: 'tpl-ai-generation', labelKey: 'configSearchIndex.entries.tpl-ai-generation.label', tabId: 'templates', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.tpl-ai-generation.description',
    synonyms: ['temperature', 'system instruction', 'max tokens'] },

  // ── Demo Reset tab ─────────────────────────────────────────────────────────
  { id: 'demo-reset', labelKey: 'configSearchIndex.entries.demo-reset.label', tabId: 'demo', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.demo-reset.description',
    synonyms: ['reset data', 'full reset', 'staging only'] },
  // Real, direct follow-up (Sep 2026): moved here from a flat top-level
  // Home tile, per direct guidance ("seems like a Testing tool") — see
  // DemoResetTab.tsx's own "Testing & Demo Tools" section.
  { id: 'demo-molecular-order-queue', labelKey: 'configSearchIndex.entries.demo-molecular-order-queue.label', tabId: 'demo', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.demo-molecular-order-queue.description',
    synonyms: ['molecular order queue', 'hpv simulation', 'reflex genotyping', 'outbound queue demo'] },

  // ── Voice tab ──────────────────────────────────────────────────────────────
  { id: 'voice-profile', labelKey: 'navBar.systemInfo.voiceProfile', tabId: 'voice', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.voice-profile.description',
    synonyms: ['en-us', 'en-gb', 'accent'] },

  // ── Synoptic Library tab ──────────────────────────────────────────────────
  { id: 'protocols-library', labelKey: 'configuration.tabs.protocols', tabId: 'protocols', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.protocols-library.description',
    synonyms: ['cap protocols', 'rcpath', 'synoptic templates'] },

  // ── Macros tab (Batch 449: described; it was a placeholder entry) ─────────
  { id: 'macros-library', labelKey: 'configuration.tabs.macros', tabId: 'macros', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.macros-library.description',
    synonyms: ['macro', 'text expansion', 'trigger', 'quick text', 'canned text', 'standard phrase', 'shortcuts'] },

  // ── Validation Studies tab (Batch 449: described; it was a placeholder entry) ─
  { id: 'validation-studies', labelKey: 'configuration.tabs.validation', tabId: 'validation', confidence: 'verified',
    descriptionKey: 'configSearchIndex.entries.validation-studies.description',
    synonyms: ['validation', 'ai validation', 'parallel run', 'irb', 'ethics review', 'study'] },
];

// ── Batch 431: generated entries ─────────────────────────────────────────────
// One per tab and per section, unless a hand-written entry already points
// at the same tab and section (that one has better synonyms).

/** The generated entries (pure; tested). */
export function generatedConfigSearchEntries(): ConfigSearchEntry[] {
  const out: ConfigSearchEntry[] = [];
  for (const tabId of CONFIG_TABS) {
    out.push({ id: `tab-${tabId}`, labelKey: `configuration.tabs.${tabId}`, tabId, confidence: 'verified', synonyms: [] });
  }
  for (const s of SYSTEM_SECTIONS) {
    out.push({ id: `section-system-${s.id}`, labelKey: s.labelKey, tabId: 'system', section: s.id, confidence: 'verified',
      contextKey: SYSTEM_GROUP_LABEL_KEY[s.group], synonyms: [s.id.replace(/_/g, ' ')] });
  }
  for (const s of CYTOLOGY_SECTIONS) {
    out.push({ id: `section-cytology-${s.id}`, labelKey: s.labelKey, tabId: 'cytology', section: s.id, confidence: 'verified',
      synonyms: [s.id.replace(/_/g, ' ')] });
  }
  for (const s of STAFF_SECTIONS) {
    out.push({ id: `section-staff-${s.id}`, labelKey: s.labelKey, tabId: 'staff', section: s.id, confidence: 'verified', synonyms: [] });
  }
  for (const s of PROTOCOL_SECTIONS) {
    out.push({ id: `section-protocols-${s.id}`, labelKey: s.labelKey, tabId: 'protocols', section: s.id, confidence: 'verified', synonyms: [] });
  }
  for (const s of TEMPLATE_SECTIONS) {
    out.push({ id: `section-templates-${s.id}`, labelKey: s.labelKey, tabId: 'templates', section: s.id, confidence: 'verified',
      contextKey: 'configuration.tabs.templates', synonyms: [`template ${s.id}`, `report template ${s.id}`] });
  }
  for (const s of VALIDATION_SECTIONS) {
    out.push({ id: `section-validation-${s.id}`, labelKey: s.labelKey, tabId: 'validation', section: s.id, confidence: 'verified',
      contextKey: 'configuration.tabs.validation', synonyms: [`validation ${s.id}`, `validation study ${s.id}`] });
  }
  return out;
}

/** Hand-written entries, then a generated entry for every tab and section they don't already cover. */
export function buildConfigSearchIndex(handWritten: readonly ConfigSearchEntry[]): ConfigSearchEntry[] {
  const covered = new Set(handWritten.map(e => `${e.tabId}|${e.section ?? ''}`));
  return [...handWritten, ...generatedConfigSearchEntries().filter(e => !covered.has(`${e.tabId}|${e.section ?? ''}`))];
}

export const CONFIG_SEARCH_INDEX: ConfigSearchEntry[] = buildConfigSearchIndex(HAND_WRITTEN_ENTRIES);
