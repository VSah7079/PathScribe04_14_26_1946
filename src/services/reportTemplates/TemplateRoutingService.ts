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
// Key = synopticReports[].templateId value in real case data — these MUST
// match the IDs actually seeded in templateService.ts's editorStore
// (editorStore.set('breast_invasive', ...) etc.) — NOT an invented naming
// convention. Previously this map used fictitious 'cap-xxx-resection' style
// keys that didn't match any real protocol ID anywhere in the codebase,
// which meant Pass 1 (the most specific, highest-priority match) could
// never fire against real data. Re-keyed against the authoritative list
// in templateService.ts as of June 2026.
//
// MAINTENANCE: if a new CAP/RCPath protocol is added to templateService.ts's
// editorStore, it must also be added here (or routed to gold-standard by
// omission) — these two files are not otherwise kept in sync automatically.
// Value = Case Report Template ID (see mockReportTemplateService)

const CAP_TO_REPORT: Record<string, string> = {
  // Breast
  'breast_invasive':                          'tmpl-breast',
  'breast_dcis_resection':                    'tmpl-breast',
  'rcpath_g148_breast_surgical_excision':      'tmpl-breast',

  // Gastrointestinal
  'colon_resection':                          'tmpl-gi',
  'rcpath_colorectal_resection':               'tmpl-gi',
  'rcpath_colorectal_local_excision':          'tmpl-gi',
  'rcpath_colorectal_further_investigations':  'tmpl-gi',

  // Thoracic / Pulmonary
  'lung_adeno':                                'tmpl-thoracic',
  'lung_resection':                            'tmpl-thoracic',

  // Urological (includes renal — no dedicated renal template exists)
  'prostate_needle_biopsy':                    'tmpl-uro',
  'prostate_resection':                        'tmpl-uro',
  'rcpath_prostate_biopsy':                    'tmpl-uro',
  'rcpath_prostate_radical_prostatectomy':     'tmpl-uro',
  'rcpath_prostate_turp_enucleation':          'tmpl-uro',
  'kidney_resection':                          'tmpl-uro',
  'kidney_biopsy':                             'tmpl-uro',
  'wilms_resection':                           'tmpl-uro',
  'wilms_biopsy':                              'tmpl-uro',

  // Dermatopathology — no dedicated derm template exists yet
  'skin_melanoma_bx':                          'tmpl-gold-standard',
  'skin_invasive_melanoma_biopsy':             'tmpl-gold-standard',
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

// ── Protocol → Subspecialty derivation (fallback only) ───────────────────────
// Case.subspecialtyId is the correct, durable source for Pass 2 once it's
// populated upstream (e.g. at case triage). Until then, this lets Pass 2
// still do something useful by deriving a subspecialty from whatever
// synoptic protocol the case already has — covering, in particular, the
// case where a protocol exists but isn't (yet) in CAP_TO_REPORT above, so
// it doesn't fall all the way through to Gold Standard unnecessarily.
// Keys are the real protocol IDs from templateService.ts's editorStore —
// same groupings as the Admin Guide's Appendix B.

const PROTOCOL_TO_SUBSPECIALTY: Record<string, string> = {
  'breast_invasive':                         'breast',
  'breast_dcis_resection':                   'breast',
  'rcpath_g148_breast_surgical_excision':    'breast',
  'colon_resection':                         'gi',
  'rcpath_colorectal_resection':             'gi',
  'rcpath_colorectal_local_excision':        'gi',
  'rcpath_colorectal_further_investigations':'gi',
  'lung_adeno':                               'thoracic',
  'lung_resection':                           'thoracic',
  'prostate_needle_biopsy':                   'uro',
  'prostate_resection':                       'uro',
  'rcpath_prostate_biopsy':                   'uro',
  'rcpath_prostate_radical_prostatectomy':    'uro',
  'rcpath_prostate_turp_enucleation':         'uro',
  'kidney_resection':                         'uro',
  'kidney_biopsy':                            'uro',
  'wilms_resection':                          'uro',
  'wilms_biopsy':                             'uro',
  'skin_melanoma_bx':                         'derm',
  'skin_invasive_melanoma_biopsy':            'derm',
};

/**
 * Best-effort subspecialty derivation from a case's synoptic protocol IDs,
 * used only when Case.subspecialtyId itself isn't set. Returns the first
 * recognized mapping, or undefined if none of the given IDs are recognized.
 */
export function deriveSubspecialtyFromProtocols(synopticTemplateIds: string[] | undefined): string | undefined {
  for (const id of (synopticTemplateIds ?? [])) {
    const sub = PROTOCOL_TO_SUBSPECIALTY[id];
    if (sub) return sub;
  }
  return undefined;
}

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

// ── Trace types — full per-pass evaluation record ─────────────────────────────
// Used by the Routing Rules admin UI's Test panel to show what happened at
// every pass, not just which one won.

export interface TemplateRoutingPassTrace {
  pass: TemplateRoutingResult['resolvedBy'];
  /** False if a higher-priority pass already matched — this pass never ran */
  reached: boolean;
  /** False if there was no input value to check against this pass at all */
  inputProvided: boolean;
  matched: boolean;
  /** Human-readable explanation of what was checked and why it did/didn't match */
  detail: string;
}

export interface TemplateRoutingTrace {
  result: TemplateRoutingResult;
  passes: TemplateRoutingPassTrace[];
}

// ── Resolver ─────────────────────────────────────────────────────────────────
// Three versions, all delegating to the same trace logic so they can never
// drift apart:
//   resolveReportTemplate()        — sync, uses hardcoded maps (build-time default)
//   resolveReportTemplateAsync()   — async, loads admin rules from service first
//   traceReportTemplateResolution() — sync, returns the full per-pass trace

export function traceReportTemplateResolution(input: TemplateRoutingInput): TemplateRoutingTrace {
  const passes: TemplateRoutingPassTrace[] = [];
  let resolved: TemplateRoutingResult | null = null;

  const clientMap      = { ...CLIENT_TO_REPORT,    ...((input as any)._clientOverrides      ?? {}) };
  const physicianMap   = { ...PHYSICIAN_TO_REPORT, ...((input as any)._physicianOverrides   ?? {}) };
  // Admin-defined CAP protocol mappings take precedence over the hardcoded
  // fallback map — lets an admin self-service a new/changed protocol
  // mapping from Routing Rules without a code deploy.
  const capMap = { ...CAP_TO_REPORT, ...((input as any)._capProtocolOverrides ?? {}) };

  // Pass 0 — Client override
  {
    const provided = !!input.performingClientId;
    const mapped = provided ? clientMap[input.performingClientId!] : undefined;
    if (mapped) {
      resolved = { templateId: mapped, ambiguous: false, candidates: [mapped], resolvedBy: 'client-override' };
      passes.push({ pass: 'client-override', reached: true, inputProvided: true, matched: true,
        detail: `${input.performingClientId} → ${mapped}` });
    } else {
      passes.push({ pass: 'client-override', reached: true, inputProvided: provided, matched: false,
        detail: provided ? `${input.performingClientId} — no override rule defined` : 'No performing client specified' });
    }
  }

  // Pass 0b — Physician preference
  if (!resolved) {
    const provided = !!input.orderingPhysicianId;
    const mapped = provided ? physicianMap[input.orderingPhysicianId!] : undefined;
    if (mapped) {
      resolved = { templateId: mapped, ambiguous: false, candidates: [mapped], resolvedBy: 'physician-preference' };
      passes.push({ pass: 'physician-preference', reached: true, inputProvided: true, matched: true,
        detail: `${input.orderingPhysicianId} → ${mapped}` });
    } else {
      passes.push({ pass: 'physician-preference', reached: true, inputProvided: provided, matched: false,
        detail: provided ? `${input.orderingPhysicianId} — no preference rule defined` : 'No ordering physician specified' });
    }
  } else {
    passes.push({ pass: 'physician-preference', reached: false, inputProvided: false, matched: false, detail: 'Not reached — higher-priority pass already matched' });
  }

  // Pass 1 — CAP protocol (most specific)
  if (!resolved) {
    const ids = input.synopticTemplateIds ?? [];
    const candidateSet = new Set<string>();
    ids.forEach(id => { const m = capMap[id]; if (m) candidateSet.add(m); });
    if (candidateSet.size > 0) {
      const list = Array.from(candidateSet);
      resolved = { templateId: list[0], ambiguous: list.length > 1, candidates: list, resolvedBy: 'cap-protocol' };
      passes.push({ pass: 'cap-protocol', reached: true, inputProvided: true, matched: true,
        detail: `${ids.join(', ')} → ${list.join(', ')}` });
    } else {
      passes.push({ pass: 'cap-protocol', reached: true, inputProvided: ids.length > 0, matched: false,
        detail: ids.length > 0 ? `${ids.join(', ')} — no protocol mapping found` : 'No CAP synoptic template ID specified' });
    }
  } else {
    passes.push({ pass: 'cap-protocol', reached: false, inputProvided: false, matched: false, detail: 'Not reached — higher-priority pass already matched' });
  }

  // Pass 2 — Subspecialty fallback
  if (!resolved) {
    const provided = !!input.subspecialtyId;
    const mapped = provided ? SUBSPECIALTY_TO_REPORT[input.subspecialtyId!] : undefined;
    if (mapped) {
      resolved = { templateId: mapped, ambiguous: false, candidates: [mapped], resolvedBy: 'subspecialty' };
      passes.push({ pass: 'subspecialty', reached: true, inputProvided: true, matched: true,
        detail: `${input.subspecialtyId} → ${mapped}` });
    } else {
      passes.push({ pass: 'subspecialty', reached: true, inputProvided: provided, matched: false,
        detail: provided ? `${input.subspecialtyId} — no subspecialty mapping found` : 'No subspecialty specified' });
    }
  } else {
    passes.push({ pass: 'subspecialty', reached: false, inputProvided: false, matched: false, detail: 'Not reached — higher-priority pass already matched' });
  }

  // Pass 3 — Gold standard (universal fallback, always available)
  if (!resolved) {
    resolved = { templateId: 'tmpl-gold-standard', ambiguous: false, candidates: ['tmpl-gold-standard'], resolvedBy: 'gold-standard' };
    passes.push({ pass: 'gold-standard', reached: true, inputProvided: true, matched: true, detail: 'Universal fallback — always available' });
  } else {
    passes.push({ pass: 'gold-standard', reached: false, inputProvided: false, matched: false, detail: 'Not reached — higher-priority pass already matched' });
  }

  return { result: resolved, passes };
}

export function resolveReportTemplate(input: TemplateRoutingInput): TemplateRoutingResult {
  return traceReportTemplateResolution(input).result;
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
    const [clientMapResult, physicianMapResult, capMapResult] = await Promise.all([
      mockRoutingRuleService.getClientMap(),
      mockRoutingRuleService.getPhysicianMap(),
      mockRoutingRuleService.getCapProtocolMap(),
    ]);
    const clientOverrides      = (clientMapResult as any).ok ? (clientMapResult as any).data : {};
    const physicianOverrides   = (physicianMapResult as any).ok ? (physicianMapResult as any).data : {};
    const capProtocolOverrides = (capMapResult as any).ok ? (capMapResult as any).data : {};
    // Merge admin rules into the hardcoded maps (admin rules take precedence)
    return resolveReportTemplate({
      ...input,
      _clientOverrides:      clientOverrides,
      _physicianOverrides:   physicianOverrides,
      _capProtocolOverrides: capProtocolOverrides,
    } as any);
  } catch {
    // Fall back to sync resolution if service unavailable
    return resolveReportTemplate(input);
  }
}
