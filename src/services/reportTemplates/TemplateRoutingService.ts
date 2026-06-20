// src/services/reportTemplates/TemplateRoutingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Resolves the correct Case Report Template for an Outreach case.
//
// Priority:
//   1. CAP synoptic template ID (most specific — encodes subspecialty + procedure)
//   2. Subspecialty ID fallback
//   3. Gold standard (universal fallback)
//
// If multiple CAP protocols on a single case resolve to different report
// templates (multi-organ case), `ambiguous: true` is returned and `candidates`
// lists all qualifying template IDs.  The caller should surface the choice to
// the pathologist via the Sequencer or case header dropdown.
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateRoutingInput {
  /** Subspecialty ID from the case or order (e.g. 'breast', 'gi') */
  subspecialtyId?: string;
  /** CAP / RCPath synoptic template IDs from synopticReports[].templateId */
  synopticTemplateIds?: string[];
  /** Performing/receiving client ID — enables client-specific template overrides */
  performingClientId?: string;
  /** Ordering physician ID — enables physician-preference overrides */
  orderingPhysicianId?: string;
}

export interface TemplateRoutingResult {
  /** Resolved Case Report Template ID */
  templateId: string;
  /** True when >1 distinct templates qualify — caller should prompt the pathologist */
  ambiguous: boolean;
  /** All qualifying template IDs in priority order */
  candidates: string[];
  /** How the template was resolved */
  resolvedBy: 'cap-protocol' | 'client-override' | 'physician-preference' | 'subspecialty' | 'gold-standard';
}

// ── CAP synoptic template → Case Report Template ─────────────────────────────
// Key = synopticReports[].templateId value in mock case data
// Value = Case Report Template ID (see mockReportTemplateService)

const CAP_TO_REPORT: Record<string, string> = {
  // Breast
  'cap-breast-invasive-resection': 'tmpl-breast',
  'cap-breast-dcis-resection':     'tmpl-breast',
  'cap-breast-core-biopsy':        'tmpl-breast',
  'cap-her2-ish':                  'tmpl-breast',

  // Gastrointestinal
  'cap-colon-rectum-resection':    'tmpl-gi',
  'cap-colon-resection':           'tmpl-gi',
  'cap-colon-biopsy':              'tmpl-gi',
  'cap-gastric-resection':         'tmpl-gi',
  'cap-liver-biopsy':              'tmpl-gi',

  // Thoracic / Pulmonary
  'cap-lung-resection':            'tmpl-thoracic',
  'cap-lung-biopsy':               'tmpl-thoracic',
  'cap-mesothelioma':              'tmpl-thoracic',
  'cap-thymic-resection':          'tmpl-thoracic',

  // Urological
  'cap-prostate-biopsy':           'tmpl-uro',
  'cap-prostate-resection':        'tmpl-uro',
  'cap-bladder-resection':         'tmpl-uro',
  'cap-kidney-resection':          'tmpl-uro',

  // Gynaecological
  'cap-cervix-biopsy':             'tmpl-gold-standard',
  'cap-endometrium-resection':     'tmpl-gold-standard',
  'cap-ovary-resection':           'tmpl-gold-standard',

  // Haematopathology
  'cap-lymphoma':                  'tmpl-gold-standard',
  'cap-bone-marrow-biopsy':        'tmpl-gold-standard',

  // Dermatopathology
  'cap-melanoma-excision':         'tmpl-gold-standard',
  'cap-skin-biopsy':               'tmpl-gold-standard',
};

// ── Subspecialty → Case Report Template fallback ─────────────────────────────

const SUBSPECIALTY_TO_REPORT: Record<string, string> = {
  'breast':        'tmpl-breast',
  'gi':            'tmpl-gi',
  'thoracic':      'tmpl-thoracic',
  'uro':           'tmpl-uro',
  'derm':          'tmpl-gold-standard',
  'neuro':         'tmpl-gold-standard',
  'heme':          'tmpl-gold-standard',
  'gyn':           'tmpl-gold-standard',
  'oncology-pool': 'tmpl-gold-standard',
};

// ── Client-specific template overrides ───────────────────────────────────────
// Key = clientId from order.clientId
// Value = Case Report Template ID
// Used when a specific client always requires a particular template format
// regardless of specimen type (e.g. a paediatric hospital always uses a
// custom paediatric template).
// Admins manage this via System → Template Routing Rules (future Config screen).

const CLIENT_TO_REPORT: Record<string, string> = {
  // Example: 'CLIENT-PAED': 'tmpl-paediatric',
  // Add client-specific overrides here or load from config
};

// ── Physician preference overrides ───────────────────────────────────────────
// Key = requestingProvider / physician ID
// Value = Case Report Template ID
// Rarely needed — most routing should be by protocol or subspecialty.

const PHYSICIAN_TO_REPORT: Record<string, string> = {
  // Example: 'PATH-UK-001': 'tmpl-breast',
};

// ── Resolver ─────────────────────────────────────────────────────────────────
// Two versions:
//   resolveReportTemplate()      — sync, uses hardcoded maps (build-time default)
//   resolveReportTemplateAsync() — async, loads admin rules from service first

export function resolveReportTemplate(input: TemplateRoutingInput): TemplateRoutingResult {
  const candidates = new Set<string>();

  // Pass 0 — Client-specific override (highest priority)
  // Merges hardcoded map with admin-defined overrides from service
  const clientMap    = { ...CLIENT_TO_REPORT,    ...((input as any)._clientOverrides    ?? {}) };
  const physicianMap = { ...PHYSICIAN_TO_REPORT, ...((input as any)._physicianOverrides ?? {}) };
  if (input.performingClientId) {
    const clientMapped = clientMap[input.performingClientId];
    if (clientMapped) {
      return {
        templateId:  clientMapped,
        ambiguous:   false,
        candidates:  [clientMapped],
        resolvedBy: 'client-override',
      };
    }
  }

  // Pass 0b — Physician preference
  if (input.orderingPhysicianId) {
    const physicianMapped = physicianMap[input.orderingPhysicianId];
    if (physicianMapped) {
      return {
        templateId:  physicianMapped,
        ambiguous:   false,
        candidates:  [physicianMapped],
        resolvedBy: 'physician-preference',
      };
    }
  }

  // Pass 1 — CAP protocol (most specific)
  for (const capId of (input.synopticTemplateIds ?? [])) {
    const mapped = CAP_TO_REPORT[capId];
    if (mapped) candidates.add(mapped);
  }

  if (candidates.size > 0) {
    const list = Array.from(candidates);
    return {
      templateId:  list[0],
      ambiguous:   list.length > 1,
      candidates:  list,
      resolvedBy: 'cap-protocol',
    };
  }

  // Pass 2 — subspecialty fallback
  if (input.subspecialtyId) {
    const mapped = SUBSPECIALTY_TO_REPORT[input.subspecialtyId];
    if (mapped) {
      return {
        templateId:  mapped,
        ambiguous:   false,
        candidates:  [mapped],
        resolvedBy: 'subspecialty',
      };
    }
  }

  // Pass 3 — gold standard
  return {
    templateId:  'tmpl-gold-standard',
    ambiguous:   false,
    candidates:  ['tmpl-gold-standard'],
    resolvedBy: 'gold-standard',
  };
}

/**
 * Async version — loads admin-defined routing rules from the service,
 * merges them with the hardcoded maps, then resolves.
 * Use this in contextBuilder.ts for runtime resolution.
 */
export async function resolveReportTemplateAsync(
  input: TemplateRoutingInput
): Promise<TemplateRoutingResult> {
  try {
    const { mockRoutingRuleService } = await import('../routingRules/mockRoutingRuleService');
    const [clientMapResult, physicianMapResult] = await Promise.all([
      mockRoutingRuleService.getClientMap(),
      mockRoutingRuleService.getPhysicianMap(),
    ]);
    const clientOverrides    = (clientMapResult as any).ok    ? (clientMapResult as any).data    : {};
    const physicianOverrides = (physicianMapResult as any).ok ? (physicianMapResult as any).data : {};
    // Merge admin rules into the hardcoded maps (admin rules take precedence)
    return resolveReportTemplate({
      ...input,
      _clientOverrides:    clientOverrides,
      _physicianOverrides: physicianOverrides,
    } as any);
  } catch {
    // Fall back to sync resolution if service unavailable
    return resolveReportTemplate(input);
  }
}
