/**
 * configSearchIndex.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Manually-maintained searchable index of Configuration settings, for the
 * search bar on ConfigurationPage. NOT auto-derived from the individual tab
 * components (AITab, SystemTab, etc.) — this needs to be kept in sync by hand
 * whenever a setting is added, renamed, or removed.
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

export type ConfigTabId =
  | 'ai' | 'protocols' | 'staff' | 'voice' | 'system'
  | 'actions' | 'macros' | 'templates' | 'validation' | 'demo';

export interface ConfigSearchEntry {
  id: string;
  label: string;
  description: string;
  synonyms: string[];
  tabId: ConfigTabId;
  tabLabel: string;
  confidence: 'verified' | 'placeholder';
}

export const CONFIG_SEARCH_INDEX: ConfigSearchEntry[] = [
  // ── AI Behavior tab ────────────────────────────────────────────────────────
  { id: 'ai-provider', label: 'AI Provider', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'Select Anthropic Claude or Google Gemini as the active AI provider.',
    synonyms: ['anthropic', 'gemini', 'claude', 'model provider'] },
  { id: 'ai-model', label: 'Model', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'The specific AI model version used for clinical AI generation.',
    synonyms: ['claude sonnet', 'llm', 'ai model version'] },
  { id: 'ai-api-mode', label: 'API Mode', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'Proxy routes calls through the backend for production; Direct is development only.',
    synonyms: ['proxy', 'direct mode'] },
  { id: 'ai-confidence-threshold', label: 'Confidence Threshold', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: "Fields below this threshold show \"AI: not found\" instead of a suggestion. Controls the AI Triage modal at finalisation.",
    synonyms: ['threshold', 'ai triage', 'not found'] },
  { id: 'ai-gross-driven', label: 'Gross-Driven AI', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'AI analyses the gross description and pre-populates synoptic fields automatically.',
    synonyms: ['gross description ai'] },
  { id: 'ai-microscopic-driven', label: 'Microscopic-Driven AI', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'AI re-analyses after microscopic text is entered, refining suggestions and evaluating protocol assignments.',
    synonyms: ['microscopic description ai', 'protocol re-evaluation'] },
  { id: 'ai-auto-insert', label: 'Auto-insert suggestions', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'If on, AI suggestions are applied to fields without requiring pathologist confirmation.',
    synonyms: ['auto apply', 'auto accept'] },
  { id: 'ai-voice', label: 'Voice AI', tabId: 'ai', tabLabel: 'AI Behavior', confidence: 'verified',
    description: 'Enable Gemini-powered voice command recognition.',
    synonyms: ['voice recognition', 'voice commands ai'] },

  // ── System tab ─────────────────────────────────────────────────────────────
  { id: 'sys-lis-enabled', label: 'LIS Integration Enabled', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Master switch for HL7/FHIR integration. Enable only when the endpoint is configured and tested.',
    synonyms: ['hl7', 'fhir', 'master switch', 'lis integration'] },
  { id: 'sys-lis-endpoint', label: 'LIS Endpoint URL', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'The HL7 or FHIR endpoint for PathScribe outbound synoptic delivery.',
    synonyms: ['hl7 endpoint', 'fhir endpoint'] },
  { id: 'sys-lis-owns-status', label: 'LIS Owns Case Statuses', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Case status is read-only in PathScribe — the LIS is authoritative. Turn off only in Standalone mode.',
    synonyms: ['case status authority', 'standalone mode'] },
  { id: 'sys-post-final', label: 'Allow Post-Final Actions', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Allows addenda and amendments after sign-out.',
    synonyms: ['addenda', 'amendments', 'post-final'] },
  { id: 'sys-jurisdiction', label: 'Jurisdiction', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Sets the SNOMED CT release and ICD variant for the lab\'s region (US, CA, GB, IE).',
    synonyms: ['snomed', 'icd', 'cap', 'rcpath', 'region'] },
  { id: 'sys-identifier-formats', label: 'Identifier Formats', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Regex patterns for accession number and MRN formats, with live testing.',
    synonyms: ['accession number', 'mrn', 'regex pattern'] },
  { id: 'sys-specimens', label: 'Specimens', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'The specimen dictionary that drives autocomplete in Case Search and case creation.',
    synonyms: ['specimen dictionary', 'specimen types'] },
  { id: 'sys-subspecialties', label: 'Subspecialties', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Subspecialty pools for the delegation workflow.',
    synonyms: ['subspecialty pools', 'delegation routing'] },
  { id: 'sys-terminology', label: 'Terminology Services', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Connection status for SNOMED CT, UMLS, and other terminology services (Connected/Degraded/Offline).',
    synonyms: ['snomed ct', 'umls', 'terminology status'] },
  { id: 'sys-physicians', label: 'Physician Directory', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'External referring/ordering physician records used for report routing.',
    synonyms: ['physicians', 'referring doctor', 'ordering physician'] },
  { id: 'sys-flags', label: 'Flag Management', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Case and specimen flags — visual markers for clinical context or required actions.',
    synonyms: ['case flags', 'specimen flags', 'severity level'] },
  { id: 'sys-delegation-types', label: 'Delegation Types', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Labels for case delegation (Peer Review, Second Opinion, Subspecialty Referral, MDT Discussion).',
    synonyms: ['peer review', 'second opinion', 'mdt discussion'] },
  { id: 'sys-info', label: 'System Information', tabId: 'system', tabLabel: 'System', confidence: 'verified',
    description: 'Application version, AI provider/model, and API connectivity status for support diagnostics.',
    synonyms: ['build version', 'support report', 'app version'] },

  // ── Staff tab ──────────────────────────────────────────────────────────────
  { id: 'staff-add', label: 'Add Staff Member', tabId: 'staff', tabLabel: 'Staff', confidence: 'verified',
    description: 'Add a new Pathologist, Resident, or Admin user.',
    synonyms: ['new user', 'add user'] },
  { id: 'staff-roles', label: 'Roles and Permissions', tabId: 'staff', tabLabel: 'Staff', confidence: 'verified',
    description: 'Built-in and custom roles, with granular per-action permissions.',
    synonyms: ['pathologist role', 'resident role', 'admin role', 'permissions'] },
  { id: 'staff-deactivate', label: 'Deactivate / Reactivate Users', tabId: 'staff', tabLabel: 'Staff', confidence: 'verified',
    description: 'Block or restore a user\'s login access without deleting their record.',
    synonyms: ['disable user', 'block login'] },

  // ── Action Registry tab ───────────────────────────────────────────────────
  { id: 'actions-registry', label: 'Action Registry', tabId: 'actions', tabLabel: 'Action Registry', confidence: 'verified',
    description: 'Edit keyboard shortcuts and voice triggers for the 139 registered actions.',
    synonyms: ['voice triggers', 'keyboard shortcuts'] },

  // ── Report Templates tab ──────────────────────────────────────────────────
  { id: 'tpl-builder', label: 'Report Template Builder', tabId: 'templates', tabLabel: 'Report Templates', confidence: 'verified',
    description: 'Build and assemble CAP/RCPath-compliant report Parts into Templates.',
    synonyms: ['parts', 'cap templates', 'template assembly', 'part library'] },
  { id: 'tpl-ai-generation', label: 'AI Generation Configuration', tabId: 'templates', tabLabel: 'Report Templates', confidence: 'verified',
    description: 'Per-section AI narrative generation settings — system instruction, max tokens, temperature.',
    synonyms: ['temperature', 'system instruction', 'max tokens'] },

  // ── Demo Reset tab ─────────────────────────────────────────────────────────
  { id: 'demo-reset', label: 'Demo Reset', tabId: 'demo', tabLabel: 'Demo Reset', confidence: 'verified',
    description: 'Reset mock data for your hospital only, or a full reset across all testers (development/staging only).',
    synonyms: ['reset data', 'full reset', 'staging only'] },

  // ── Voice tab ──────────────────────────────────────────────────────────────
  { id: 'voice-profile', label: 'Voice Profile', tabId: 'voice', tabLabel: 'Voice', confidence: 'verified',
    description: 'EN-US or EN-GB — drives voice command recognition accuracy.',
    synonyms: ['en-us', 'en-gb', 'accent'] },

  // ── Synoptic Library tab ──────────────────────────────────────────────────
  { id: 'protocols-library', label: 'Synoptic Library', tabId: 'protocols', tabLabel: 'Synoptic Library', confidence: 'verified',
    description: 'CAP-compliant and RCPath synoptic protocol library used in case reporting.',
    synonyms: ['cap protocols', 'rcpath', 'synoptic templates'] },

  // ── Macros tab — PLACEHOLDER, not documented anywhere yet ────────────────
  { id: 'macros-placeholder', label: 'Macros', tabId: 'macros', tabLabel: 'Macros', confidence: 'placeholder',
    description: '(Undocumented) Likely text-expansion or voice macro shortcuts — needs review against actual component.',
    synonyms: ['text expansion', 'shortcuts'] },

  // ── Validation Studies tab — PLACEHOLDER, not documented anywhere yet ────
  { id: 'validation-placeholder', label: 'Validation Studies', tabId: 'validation', tabLabel: 'Validation Studies', confidence: 'placeholder',
    description: '(Undocumented) Admin/superadmin-only section — needs review against actual component.',
    synonyms: ['validation', 'studies'] },
];
