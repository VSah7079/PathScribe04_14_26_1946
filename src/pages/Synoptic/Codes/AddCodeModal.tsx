// src/pages/Synoptic/Codes/AddCodeModal.tsx
// Navy design system — matches FlagManagerModal.
// Live terminology search via NLM API (codeSearchService).
// Left panel: applied codes per case/specimen with strikethrough/undo.
// Right panel: system tabs + hierarchy filters + live search.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; import { AiSuggestionMeta } from './AiSuggestionMeta';
import { suggestAiCodesWithDrops, aiDetailFor, canApplyCode, type AiCodeSuggestion } from '@/services/coding/aiCodeSuggestions';
import '../../../pathscribe.css';
import type { MedicalCode } from '../synopticTypes';
import ManualIcdoEntry from './ManualIcdoEntry';
import { RegistryCheckNote } from './RegistryCheckNote';
import { useCodePolicy } from './useCodePolicy';
import { Opcs4Notice } from './Opcs4Notice';
import { CaseCodingDisplay } from './CaseCodingDisplay';
import { pillStates, systemsOffByPolicy } from '@/services/coding/codePolicyEnforcement';
import { CodeSystemOffNote } from '@/components/Coding/CodeSystemOffNote';
import { reconcileEntries } from '@/services/coding/caseCodingEntries';
import { fromCaseCoding } from '@/services/coding/caseCodingAdapter';
import type { CodedEntry, CodeSource, CodedEntryAiDetail } from '@/services/coding/codedEntry';
import type { CaseCoding } from '@/types/case/Case';
import { icd10VariantForJurisdiction, snomedReleaseForJurisdiction, type Jurisdiction } from '@/types/systemConfig';
import { isSimulatedResult } from '../../../services/terminologySearch/simulatedCodeLookup';
import type { TriggerCodeQuery } from '../../../services/abnormalDetection/triggerCodeQueries';
import { searchCodes, type CodeResult, type SnomedFilter } from '../../../services/terminologySearch/codeSearchService';
import { getOrganisationByHospitalId, type CodingSystem } from '@/services/organisation/organisationService';
import { CODE_MAP_TABLE, resolveSpecimenDictionaryBaseCptCode } from '@/services/billing/codeMapTable';
import { clickableContainer, pressable } from '@/utils/a11y/pressable';
import { CapabilityButton } from '@/components/Common/CapabilityButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpecimenOption { index: number; id: number; specimenId?: string | null; name: string; specimenDictionaryEntryId?: string; complexity?: 'GROSS_ONLY' | 'GROSS_AND_MICRO'; }

export type { AiCodeSuggestion };

export interface AddCodeModalProps {
  existingCodes: MedicalCode[];
  allSpecimens: SpecimenOption[];
  /** Real feature, per direct feedback: the Specimen Dictionary already
   *  has a real, coder-entered "Default Base CPT Code" per specimen
   *  type - a genuinely verified value, not a guess. When available
   *  for the currently-targeted specimen's own type, this is shown as
   *  a real, high-confidence default rather than relying on the AI's
   *  own narrative-text estimate for something a real coder has
   *  already, deliberately determined. */
  specimenDictionary?: { id: string; defaultBaseCptCode?: string }[];
  activeSpecimenIndex?: number;  // reserved for future per-specimen default targeting
  /** Real fix: which coding-system tab to open on - e.g. 'CPT' when
   *  launched from a specimen's own "+Code" contextual button, so the
   *  user lands directly where they meant to go rather than needing to
   *  switch tabs manually. Defaults to 'SNOMED', preserving existing
   *  behavior for every other caller. */
  initialSystem?: CodeSystem;
  /** `entries` (Batch 607): the same codes as uniform entries with system release, source and AI detail. */
  onAddToSpecimens: (codes: Omit<MedicalCode, 'id' | 'source'>[], specimenIndices: number[], entries?: CodedEntry[]) => Promise<void>;
  /** Batch 607: the case's saved coding (with its entries), for the case coding view. */
  caseCoding?: CaseCoding;
  /** Batch 607: whose code-system policy applies. Defaults to the laboratory's jurisdiction. */
  jurisdiction?: Jurisdiction;
  /** PS-138: matched abnormal-detection triggers. Each offers a live search; the pathologist chooses what is applied. */
  triggerQueries?: TriggerCodeQuery[];
  onClose: () => void;
  originHospitalId?: string;
  /** Optional — if provided, enables AI code suggestions */
  caseText?: { gross: string; microscopic: string; ancillary: string };
  synopticAnswers?: Record<string, string | string[]>;
  templateName?: string;
  /** Tier 1: codes pre-derived from CAP template option metadata */
  synopticDerivedCodes?: AiCodeSuggestion[];
  /** Whether Orchestrator/narrative mode is active */
  narrativeText?: string;
  /** The case's ordering facility — needed to resolve which AI model this
   *  specific facility is actually approved to use for AI code
   *  suggestions. Optional so callers without a resolvable facility
   *  still fall back safely to the org-wide default. */
  facilityId?: string;
  /** Real, per direct requirement: "the Pathologist has the right to
   *  update all billing, even those that are deterministic ... LIS
   *  will handle the billing in assist mode" alongside a real,
   *  separate follow-up ("can we still keep RVU... useful to track
   *  Pathologist performance"). A CPT code added here in orchestration
   *  mode is a real billing decision; in assist mode it's honestly
   *  relabeled as RVU/productivity tracking only - never hidden
   *  entirely, since contributionDashboardCalculations.ts genuinely
   *  prefers a specimen's own real, applied CPT code over its generic
   *  fallback estimate. Optional, defaulting to false (assist-style
   *  labeling) so no existing caller needs to change to keep working -
   *  a real caller should pass this explicitly rather than rely on
   *  the default. */
  isOrchestrationMode?: boolean;
}

type CodeSystem = 'SNOMED' | 'ICD10' | 'ICD11' | 'LOINC' | 'ICDO' | 'CPT' | 'OPCS4';

export interface PendingCode {
  /** Real, per direct feedback ("if an IHC interp was done on 4
   *  slides, they have to enter the code 4 times?"): a stable,
   *  per-instance identifier - the old code+specimenIndex matching
   *  throughout this file couldn't tell two real, separate instances
   *  of the same code apart, so deleting/moving/restoring "one" of
   *  them actually affected every instance at once. */
  id: string;
  code: string;
  display: string;
  system: string;
  specimenIndex: number | null;
  pendingDelete: boolean;
  /** Batch 607: where the code came from (default: typed). */
  source?: CodeSource;
  ai?: CodedEntryAiDetail;
}

/**
 * Real, per direct guidance: "if the code exists already it is
 * flagged so the Pathologist knows it has been applied. From there
 * the Pathologist can assign the code to a different case specimen or
 * maybe they want it at the case level." Finds every real, active
 * (non-pending-delete) application of this exact code to a target
 * OTHER than the one currently selected — the real, cross-target
 * awareness this app's own existing "applied to THIS target" check
 * never had. Extracted as its own, pure, testable function since the
 * same real logic is needed in both the search-results list and the
 * AI-suggestions panel.
 */
export function findAppliedElsewhere(applied: PendingCode[], code: string, currentTarget: number | null): PendingCode[] {
  return applied.filter(c => c.code === code && c.specimenIndex !== currentTarget && !c.pendingDelete);
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Full registry of all supported coding systems
// Visibility per site is controlled by organisationService.Site.codingSystems
const ALL_SYSTEMS: { id: CodeSystem; label: string; accent: string }[] = [
  { id: 'SNOMED', label: 'SNOMED CT', accent: '#0891B2' },
  { id: 'ICD10',  label: 'ICD-10',   accent: '#7c3aed' },
  { id: 'ICD11',  label: 'ICD-11',   accent: '#0369a1' },
  { id: 'LOINC',  label: 'LOINC',    accent: '#0f766e' },
  { id: 'ICDO',   label: 'ICD-O',    accent: '#b45309' },
  { id: 'CPT',    label: 'CPT',      accent: '#7c3aed' },
  { id: 'OPCS4',  label: 'OPCS-4',   accent: '#0891B2' },
];

// Real, label-key-maps — SYSTEM_LABEL_KEY covers the official coding-
// standard names (SNOMED CT, ICD-10, etc.), which stay identical across
// every locale as proper nouns (same established precedent as the
// existing synopticReportPage.snomedCt/snomedTitle keys elsewhere in
// this app) but are still wrapped in a translation key for structural
// consistency. SNOMED_FILTER_LABEL_KEY/HINT_KEY cover the plain-English
// hierarchy-filter names, which DO vary per locale.
const SYSTEM_LABEL_KEY: Record<CodeSystem, string> = {
  SNOMED: 'addCodeModal.systemLabel.SNOMED', ICD10: 'addCodeModal.systemLabel.ICD10', ICD11: 'addCodeModal.systemLabel.ICD11',
  LOINC: 'addCodeModal.systemLabel.LOINC', ICDO: 'addCodeModal.systemLabel.ICDO', CPT: 'addCodeModal.systemLabel.CPT', OPCS4: 'addCodeModal.systemLabel.OPCS4',
};
const SNOMED_FILTER_LABEL_KEY: Record<SnomedFilter, string> = {
  all: 'addCodeModal.snomedFilter.all.label', morphology: 'addCodeModal.snomedFilter.morphology.label',
  anatomy: 'addCodeModal.snomedFilter.anatomy.label', specimen: 'addCodeModal.snomedFilter.specimen.label', organism: 'addCodeModal.snomedFilter.organism.label',
};
const SNOMED_FILTER_HINT_KEY: Record<SnomedFilter, string> = {
  all: 'addCodeModal.snomedFilter.all.hint', morphology: 'addCodeModal.snomedFilter.morphology.hint',
  anatomy: 'addCodeModal.snomedFilter.anatomy.hint', specimen: 'addCodeModal.snomedFilter.specimen.hint', organism: 'addCodeModal.snomedFilter.organism.hint',
};

// Batch 513 (PS-269): the filter order only; the visible names and hints
// come from SNOMED_FILTER_LABEL_KEY / SNOMED_FILTER_HINT_KEY above.
const SNOMED_FILTERS: readonly SnomedFilter[] = ['all', 'morphology', 'anatomy', 'specimen', 'organism'];

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoCode = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 6l-3 2 3 2M11 6l3 2-3 2M9 4l-2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IcoCase = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

const IcoSpec = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  </svg>
);

const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IcoTrash = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcoUndo = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M3 7V3L1 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 3C3 3 5 1 8 1C11.866 1 15 4.134 15 8C15 11.866 11.866 15 8 15C4.134 15 1 11.866 1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const AddCodeModal: React.FC<AddCodeModalProps> = ({
  existingCodes, allSpecimens, specimenDictionary = [], onAddToSpecimens, onClose,
  caseText, synopticAnswers, templateName, synopticDerivedCodes, narrativeText,
  originHospitalId, activeSpecimenIndex, initialSystem, facilityId, triggerQueries = [], isOrchestrationMode = false,
  caseCoding, jurisdiction,
}) => {
  const { t } = useTranslation();
  const codePolicy = useCodePolicy(jurisdiction);
  const [showCaseCoding, setShowCaseCoding] = useState(false);
  // ── Site coding config ────────────────────────────────────────────────────
  // Coding systems shown are driven by site config from organisationService.
  // This replaces any hardcoded locale/country checks.
  // When backend is ready: replace with useSessionSiteConfig() hook.
  const siteOrg = React.useMemo(() => {
    return getOrganisationByHospitalId(originHospitalId ?? 'HOSP-001');
  }, [originHospitalId]);
  const siteCodingSystems = React.useMemo<CodingSystem[]>(() => {
    const systems = siteOrg?.sites?.[0]?.codingSystems;
    return systems?.length ? systems : ['SNOMED', 'ICD10', 'ICD11', 'LOINC', 'ICDO', 'CPT'] as CodingSystem[];
  }, [siteOrg]);
  // Batch 607 (#137, #182): only the systems the jurisdiction's policy allows today; required ones are marked.
  const pillRoles = React.useMemo(
    () => pillStates(ALL_SYSTEMS.map(s => s.id), codePolicy.policy, codePolicy.today),
    [codePolicy.policy, codePolicy.today],
  );
  const bySite = ALL_SYSTEMS.filter(s => siteCodingSystems.includes(s.id) && !(s.id === 'CPT' && isOrchestrationMode));
  const byPolicy = bySite.filter(s => pillRoles.some(p => p.system === s.id));
  // A policy that switches every offered system off would leave nothing to pick: the site's own list is shown instead.
  const SYSTEMS = byPolicy.length ? byPolicy : bySite;
  // Batch 614 (PS-762): say so when the policy hides a system the site lists, or hides all of them.
  const policyFallback = byPolicy.length === 0 && bySite.length > 0;
  const offBySetting = byPolicy.length ? systemsOffByPolicy(bySite.map(x => x.id), codePolicy.policy, codePolicy.today) : [];
  const requiredIds = pillRoles.filter(p => p.required).map(p => p.system);
  const isUK = siteOrg?.sites?.[0]?.defaultLocale === 'en-GB';

  const [system,       setSystem]       = useState<CodeSystem>(initialSystem ?? 'SNOMED');
  const [snomedFilter, setSnomedFilter] = useState<SnomedFilter>('morphology');
  const [query,        setQuery]        = useState('');
  useEffect(() => { if (SYSTEMS.length && !SYSTEMS.some(x => x.id === system)) setSystem(SYSTEMS[0].id); }, [SYSTEMS, system]);
  const [results,      setResults]      = useState<CodeResult[]>([]);
  const [searchError,  setSearchError]  = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(-1);
  const [target,       setTarget]       = useState<number | null>(activeSpecimenIndex ?? null);
  const [applied,      setApplied]      = useState<PendingCode[]>(() => {
    const fromExisting = existingCodes
      // Guards against malformed entries with an empty/missing code --
      // these were rendering as blank rows (grabber + trash icon, no
      // visible text) with no indication anything was wrong. Filtering
      // here means they're excluded from the very first render, and
      // since handleSave's diff logic works entirely off this `applied`
      // array (not existingCodes directly), any of these already sitting
      // in the real backend data get silently dropped the next time this
      // case's codes are saved for any reason -- no separate cleanup
      // migration needed.
      .filter(c => !!c.code)
      .map((c, idx) => {
        // Resolve specimenId back to specimenIndex so left panel groups correctly
        const specOption = (c as any).specimenId
          ? allSpecimens.find(s => s.specimenId === (c as any).specimenId)
          : null;
        return {
          id:            `existing-${idx}-${c.code}-${c.system}`,
          code:          c.code,
          display:       c.display,
          system:        c.system,
          specimenIndex: specOption ? specOption.index : null,
          pendingDelete: false,
        };
      });
    // Real fix, per direct clarification: "something that defaults from
    // maintenance/configuration doesn't need to be verified, it should
    // automatically get applied." A Specimen Dictionary default base
    // CPT code is a real, deliberate, prior coder determination, not a
    // guess - matches how AccessionPage.tsx already auto-populates
    // this same field right at specimen creation. This is the same
    // real default, applied here too, for any specimen that doesn't
    // already have a CPT code - backfills cases created before a
    // dictionary default existed, or where the dictionary was updated
    // after the specimen was already accessioned. Scoped to Assist
    // mode only - orchestration mode's own real rule engine already
    // resolves this far more precisely from structured stain data.
    const autoDefaults: PendingCode[] = !isOrchestrationMode
      ? allSpecimens
        .filter(sp => !fromExisting.some(c => c.specimenIndex === sp.index && c.system === 'CPT'))
        .map((sp): PendingCode | null => {
          const defaultCode = sp.specimenDictionaryEntryId
            ? resolveSpecimenDictionaryBaseCptCode({ specimenDictionaryEntryId: sp.specimenDictionaryEntryId, complexity: sp.complexity }, specimenDictionary)
            : null;
          if (!defaultCode) return null;
          const entry = CODE_MAP_TABLE.find(e => e.code === defaultCode);
          return {
            id: `dictionary-default-${sp.index}-${defaultCode}`,
            code: defaultCode,
            display: entry?.description ?? defaultCode,
            system: 'CPT',
            specimenIndex: sp.index,
            pendingDelete: false,
          };
        })
        .filter((c): c is PendingCode => c !== null)
      : [];
    if (autoDefaults.length > 0) setTimeout(() => setIsDirty(true), 0);
    return [...fromExisting, ...autoDefaults];
  });
  const [isDirty, setIsDirty] = useState(false);
  const [aiSuggestions,    setAiSuggestions]    = useState<AiCodeSuggestion[]>([]);
  const [aiLoading,        setAiLoading]        = useState(false);
  const [aiError,          setAiError]          = useState<string | null>(null);
  const [aiRan,            setAiRan]            = useState(false);
  const [aiUnverified,     setAiUnverified]     = useState(0);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

  // The suggestion list shows only the active system tab's codes (one shared filter feeds the count and the list),
  // and a code counts as "already applied" only when it matches this exact target (specimen or case level).
  const targetSpecimenId = target !== null ? (allSpecimens.find(s => s.index === target)?.specimenId ?? null) : null;

  const visibleSuggestions = React.useMemo(() => (
    aiSuggestions
      .filter((s, i, a) => a.findIndex(x => x.code === s.code) === i)
      .filter(s => !existingCodes.some(ec => ec.code === s.code && ec.system === s.system && ((ec as any).specimenId ?? null) === targetSpecimenId))
      .filter(s => s.system === system)
  ), [aiSuggestions, existingCodes, system, targetSpecimenId]);


  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [dragCode,     setDragCode]     = useState<PendingCode | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<number | null | 'none'>('none'); // null=case, number=spec, 'none'=not dragging
  const [contextMenu,  setContextMenu]  = useState<{ entry: PendingCode; x: number; y: number } | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const sysInfo = SYSTEMS.find(s => s.id === system) ?? SYSTEMS[0];

  // ── Live search with debounce ─────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Real fix: CPT is a small, curated table (services/billing/), not
    // a large live search like every other system here - an empty
    // query still searches, showing the real, active table's full list
    // as a default view (Pete's "top/frequent codes" default) rather
    // than requiring a keystroke first. Every other system keeps the
    // original "require a real query" behavior - correct for a live
    // NLM search that could otherwise return thousands of results.
    if (!query.trim() && system !== 'CPT') { setResults([]); setLoading(false); return; }

    setLoading(true);
    setSearchError(null);
    debounceRef.current = setTimeout(async () => {
      const filter = system === 'SNOMED' ? snomedFilter : 'all';
      try {
        const data = await searchCodes(system, query, filter);
        setResults(data);
      } catch (err: any) {
        // Real fix, per direct feedback: a failed search (missing API
        // key, network error, CORS) previously looked identical to a
        // genuine "no matches" result. Distinct state here so the UI
        // can tell the person their search backend is unavailable,
        // not that the term itself has no matches.
        setResults([]);
        setSearchError(err?.message ?? t('addCodeModal.searchFailedDefault'));
      }
      setLoading(false);
      setFocused(-1);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, system, snomedFilter, t]);

  // ── Applied code helpers ──────────────────────────────────────────────────

  const caseApplied           = applied.filter(c => c.specimenIndex === null);
  const activeCaseApplied     = caseApplied.filter(c => !c.pendingDelete);
  const specimenApplied       = (idx: number) => applied.filter(c => c.specimenIndex === idx);
  const activeSpecimenApplied = (idx: number) => specimenApplied(idx).filter(c => !c.pendingDelete);
  const totalActive           = applied.filter(c => !c.pendingDelete).length;

  // ── Add / remove / undo ───────────────────────────────────────────────────

  const addCode = useCallback((r: CodeResult, meta?: { source: CodeSource; ai?: CodedEntryAiDetail }) => {
    // Real fix, per direct feedback: "if an IHC interp was done on 4
    // slides, they have to enter the code 4 times?" - the old logic
    // hard-blocked re-adding an already-active code, silently
    // undercounting a real, repeated procedure with no error or
    // feedback at all. If a pending-delete instance of this exact
    // code exists, restore that one first (matches the original
    // "oops, didn't mean to remove that" intent behind this branch);
    // otherwise, always add a new, genuinely separate instance - a
    // real, repeatable procedure needs a real, separate count, not a
    // single toggle.
    if (!canApplyCode(r)) { setSearchError(t('addCodeModal.opcs4DemoNotApplicable')); return; }
    if (byPolicy.length && !byPolicy.some(x => x.id === r.system)) { setSearchError(t('addCodeModal.systemNotAllowed', { system: r.system })); return; }
    const pendingDeleteInstance = applied.find(c => c.code === r.code && c.specimenIndex === target && c.pendingDelete);
    if (pendingDeleteInstance) {
      setApplied(prev => prev.map(c =>
        c.id === pendingDeleteInstance.id ? { ...c, pendingDelete: false } : c
      ));
    } else {
      setApplied(prev => [...prev, {
        id: `new-${r.code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        code: r.code, display: r.display, system: r.system,
        specimenIndex: target, pendingDelete: false,
        ...(meta ? { source: meta.source, ...(meta.ai ? { ai: meta.ai } : {}) } : {}),
      }]);
    }
    setIsDirty(true);
  }, [applied, target, byPolicy, t]);

  const removeCode = useCallback((id: string) => {
    setApplied(prev => prev.map(c =>
      c.id === id ? { ...c, pendingDelete: true } : c
    ));
    setIsDirty(true);
  }, []);

  const undoRemove = useCallback((id: string) => {
    setApplied(prev => prev.map(c =>
      c.id === id ? { ...c, pendingDelete: false } : c
    ));
    setIsDirty(true);
  }, []);

  // Move a code from one specimen/case to another
  const moveCode = useCallback((entry: PendingCode, toSpecimenIndex: number | null) => {
    if (entry.specimenIndex === toSpecimenIndex) return; // already there
    setApplied(prev => prev.map(c =>
      c.id === entry.id
        ? { ...c, specimenIndex: toSpecimenIndex, pendingDelete: false }
        : c
    ));
    setIsDirty(true);
    setContextMenu(null);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  // ── AI Code Generation ───────────────────────────────────────────────────
  const generateAiCodes = useCallback(async () => {
    if (!caseText) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { suggestions: verified, unverified } = await suggestAiCodesWithDrops({ caseText, synopticAnswers, templateName, narrativeText, isUK, siteCodingSystems, isOrchestrationMode, facilityId });
      setAiSuggestions(verified);
      setAiUnverified(unverified);
      // Batch 656: open the tab that has suggestions, so the panel never reads "0" while another system has some.
      if (verified.length > 0 && !verified.some(v => v.system === system)) setSystem(verified[0].system as CodeSystem);
      setAiRan(true);
    } catch (e: any) {
      setAiError(e?.message ?? t('addCodeModal.aiSuggestionFailedDefault'));
    } finally {
      setAiLoading(false);
    }
  }, [caseText, synopticAnswers, templateName, isUK, narrativeText, siteCodingSystems, isOrchestrationMode, t, facilityId, system]);

  // Auto-run on open — after generateAiCodes is defined
  // Tier 1: use pre-derived synoptic codes immediately
  // Tier 2/3: auto-call AI so codes are ready when modal opens
  React.useEffect(() => {
    if (synopticDerivedCodes?.length) {
      setAiSuggestions(synopticDerivedCodes);
      setAiRan(true);
    } else if (caseText && !aiRan) {
      // Auto-run AI once on open — aiRan guard prevents re-running on re-render
      generateAiCodes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Batch 607 (#138): the codes now applied, as uniform entries (kept in step with what the case already recorded).
  const entriesNow = React.useMemo<CodedEntry[]>(() => {
    const j = codePolicy.jurisdiction;
    const releaseOf = (sys: string) => sys === 'ICD10' ? icd10VariantForJurisdiction(j) : sys === 'SNOMED' ? snomedReleaseForJurisdiction(j) : sys === 'ICDO' ? 'ICD-O-3' : undefined;
    const active: CodedEntry[] = applied.filter(c => !c.pendingDelete).map(c => {
      const release = releaseOf(c.system);
      return {
        system: c.system, code: c.code, display: c.display, source: c.source ?? 'typed',
        ...(release ? { release } : {}), ...(c.ai ? { ai: c.ai } : {}),
      };
    });
    const previous = [...(caseCoding?.entries ?? []), ...fromCaseCoding(caseCoding)];
    return reconcileEntries(previous, active);
  }, [applied, caseCoding, codePolicy.jurisdiction]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    // Include codes that are new OR have been moved to a different specimen
    const toAdd = applied.filter(c => {
      if (c.pendingDelete) return false;
      const original = existingCodes.find(e => e.code === c.code && e.system === c.system);
      if (!original) return true; // new code
      // Check if specimenId changed — if so, it's a move and needs saving
      const originalSpecId = (original as any).specimenId ?? null;
      const newSpecOption  = c.specimenIndex !== null
        ? allSpecimens.find(s => s.index === c.specimenIndex)
        : null;
      const newSpecId = newSpecOption ? (newSpecOption as any).specimenId ?? String(newSpecOption.id) : null;
      return originalSpecId !== newSpecId; // moved
    });
    // Build complete resolved code list — source of truth for the parent
    const allActiveCodes = applied
      .filter(c => !c.pendingDelete)
      .map(c => {
        const sp = c.specimenIndex !== null
          ? allSpecimens.find(s => s.index === c.specimenIndex)
          : null;
        return {
          code:       c.code,
          display:    c.display,
          system:     c.system as MedicalCode['system'],
          specimenId: sp ? ((sp as any).specimenId ?? String(sp.id)) : null,
        };
      });

    const hasDeletions = applied.some(c => c.pendingDelete);
    if (toAdd.length > 0 || hasDeletions) {
      const specimenIndices = [...new Set(toAdd.map(c => c.specimenIndex ?? 0))];
      // Previously fired onAddToSpecimens and closed the modal
      // immediately afterward regardless of whether the save actually
      // succeeded -- the parent's real persist call only had a
      // console.error on failure, invisible in normal use. Now the
      // modal genuinely waits: closes only on confirmed success, shows
      // a real error and stays open (so nothing looks "saved" when it
      // wasn't) on failure. Also fixes saving never being reset to
      // false, which previously left the button stuck disabled.
      try {
        await onAddToSpecimens(allActiveCodes, specimenIndices, entriesNow);
        onClose();
      } catch (err: any) {
        setSaveError(err?.message ?? t('addCodeModal.saveFailedDefault'));
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(false);
      onClose();
    }
  }, [applied, existingCodes, allSpecimens, onAddToSpecimens, onClose, t, entriesNow]);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  // Real fix, found ahead of a live demo: selecting a code in this
  // modal only updates the local, staged `applied` list - real
  // persistence to specimen.coding.cpt only happens via the separate
  // Save button below (see handleSave). All three ways to leave this
  // modal (X button, Cancel, Escape) previously called onClose
  // directly with zero check for unsaved changes, so a code that felt
  // "added" the moment it was clicked could be silently discarded if
  // the modal was closed before Save - exactly what happened when a
  // base code was picked here but never showed up as applied anywhere
  // else in the app.
  const handleCloseAttempt = () => {
    if (isDirty && !window.confirm(t('addCodeModal.unsavedChangesConfirm'))) {
      return;
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && focused >= 0 && results[focused]) addCode(results[focused]);
    if (e.key === 'Escape') handleCloseAttempt();
  };

  // ── Pending counts for footer ─────────────────────────────────────────────

  const toAddCount    = applied.filter(c => !c.pendingDelete && !existingCodes.some(e => e.code === c.code)).length;
  const toRemoveCount = applied.filter(c => c.pendingDelete).length;

  // ── CodeChip — draggable + right-click context menu ──────────────────────

  // Grabber icon SVG
  const IcoGrab = () => (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="acd-drag-handle">
      <circle cx="3" cy="2.5" r="1.2" fill="currentColor"/>
      <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
      <circle cx="3" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="7" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="3" cy="11.5" r="1.2" fill="currentColor"/>
      <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
    </svg>
  );

  const CodeChip: React.FC<{ entry: PendingCode }> = ({ entry }) => {
    return (
      <div
        className={`fm-flag-chip acd-code-chip${entry.pendingDelete ? ' deleted' : ''}`}
        draggable={!entry.pendingDelete}
        onDragStart={e => {
          setDragCode(entry);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => { setDragCode(null); setDragOverTarget('none'); }}
        onContextMenu={e => {
          e.preventDefault();
          if (!entry.pendingDelete) setContextMenu({ entry, x: e.clientX, y: e.clientY });
        }}
      >
        {/* Grabber — only shown when not deleted */}
        {!entry.pendingDelete && (
          <span className="acd-icon-wrap">
            <IcoGrab />
          </span>
        )}
        <span className={`fm-flag-chip-name${entry.pendingDelete ? ' strikethrough' : ''}`}>
          <span className="acd-code-mono" title={`${entry.code} — ${entry.display}`}>{entry.code}</span>
          {entry.display}
        </span>
        {entry.pendingDelete ? (
          <button className="fm-chip-undo-btn" onClick={() => undoRemove(entry.id)} title={t('addCodeModal.undoRemoval')}>
            <IcoUndo />
          </button>
        ) : (
          <button className="fm-chip-remove-btn" onClick={() => removeCode(entry.id)} title={t('addCodeModal.removeCode')}>
            <IcoTrash />
          </button>
        )}
      </div>
    );
  };

  // Real feature, per direct feedback ("if an IHC interp was done on 4
  // slides, they have to enter the code 4 times?" / "use the same
  // display approach ... used in the Billing review pane"): when the
  // same real code has more than one genuine instance for this
  // specimen (e.g. a real, repeated ancillary procedure), shows them
  // as one compact row - the description once, then each instance's
  // code comma-separated with its own "code — definition" tooltip,
  // matching BillingReviewPanel.tsx's own stain/block row treatment
  // exactly, rather than N redundant, full-size chips each repeating
  // the same description text. A single instance (the common case)
  // still renders as the existing, full CodeChip - drag-and-drop and
  // the right-click context menu stay exactly as they were.
  const GroupedCodeRow: React.FC<{ entries: PendingCode[] }> = ({ entries }) => {
    const first = entries[0];
    return (
      <div className="fm-flag-chip acd-grouped-chip">
        <span className="acd-grouped-display">{first.display}</span>
        <span className="acd-grouped-codes">
          {entries.map((entry, i) => (
            <span key={entry.id} className="acd-grouped-code-item">
              {i > 0 && <span className="acd-grouped-comma">,</span>}
              <span
                className={`acd-code-mono${entry.pendingDelete ? ' strikethrough' : ''}`}
                title={`${entry.code} — ${entry.display}`}
              >
                {entry.code}
              </span>
              {entry.pendingDelete ? (
                <button className="fm-chip-undo-btn" onClick={() => undoRemove(entry.id)} title={t('addCodeModal.undoRemoval')}>
                  <IcoUndo />
                </button>
              ) : (
                <button className="fm-chip-remove-btn" onClick={() => removeCode(entry.id)} title={t('addCodeModal.removeThisInstance')}>
                  <IcoTrash />
                </button>
              )}
            </span>
          ))}
        </span>
      </div>
    );
  };

  // Groups a specimen's (or the case level's) own applied entries by
  // real code value, preserving first-seen order - a group of one
  // renders as the existing, full CodeChip; a group of several
  // renders compactly via GroupedCodeRow above.
  const renderAppliedGroups = (entries: PendingCode[]) => {
    const order: string[] = [];
    const groups = new Map<string, PendingCode[]>();
    entries.forEach(e => {
      if (!groups.has(e.code)) { groups.set(e.code, []); order.push(e.code); }
      groups.get(e.code)!.push(e);
    });
    return order.map(code => {
      const group = groups.get(code)!;
      return group.length > 1
        ? <GroupedCodeRow key={code} entries={group} />
        : <CodeChip key={group[0].id} entry={group[0]} />;
    });
  };

  // ── Drop target wrapper ───────────────────────────────────────────────────

  const DropZone: React.FC<{ specimenIndex: number | null; children: React.ReactNode }> = ({ specimenIndex, children }) => {
    const isOver = dragCode !== null && dragOverTarget === specimenIndex;
    const isSame = dragCode?.specimenIndex === specimenIndex;
    return (
      <div
        onDragOver={e => { e.preventDefault(); if (!isSame) setDragOverTarget(specimenIndex); }}
        onDragLeave={() => setDragOverTarget('none')}
        onDrop={e => {
          e.preventDefault();
          if (dragCode && !isSame) moveCode(dragCode, specimenIndex);
          setDragOverTarget('none');
        }}
        className={`acd-drop-zone${isOver && !isSame ? ' acd-drop-zone--over' : ''}`}
      >
        {children}
      </div>
    );
  };

  // ── Context menu ──────────────────────────────────────────────────────────

  const ContextMenu = contextMenu ? (
    <div
      onClick={() => setContextMenu(null)}
      className="acd-ctx-backdrop"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="acd-ctx-menu"
        style={{
          '--ctx-x': `${Math.min(contextMenu.x, window.innerWidth - 220)}px`,
          '--ctx-y': `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
        } as React.CSSProperties}
      >
        <div className="acd-ctx-menu-label">
          {t('addCodeModal.moveTo')}
        </div>

        {/* Case Level */}
        {contextMenu.entry.specimenIndex !== null && (
          <button
            onClick={() => moveCode(contextMenu.entry, null)}
            className="acd-ctx-menu-btn"
          >
            <IcoCase />
            {t('addCodeModal.caseLevel')}
          </button>
        )}

        {/* Specimens */}
        {allSpecimens
          .filter(sp => sp.index !== contextMenu.entry.specimenIndex)
          .map(sp => (
            <button
              key={sp.index}
              onClick={() => moveCode(contextMenu.entry, sp.index)}
              className="acd-ctx-menu-btn"
            >
              <IcoSpec />
              <span className="acd-sp-label">
                <span className="acd-sp-label-prefix">{t('addCodeModal.specimenPrefix', { id: sp.id })}</span> {sp.name}
              </span>
            </button>
          ))
        }
      </div>
    </div>
  ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div data-capture-hide="true" className="ps-overlay">
      <div className="ps-research-modal fm-modal acd-modal-inner" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">{t('addCodeModal.eyebrow')}</div>
            <div className="fm-title-row">
              <IcoCode />
              <h2 className="fm-title">{t('addCodeModal.title')}</h2>
              {totalActive > 0 && (
                <span className="fm-active-badge">{t('addCodeModal.activeCount', { count: totalActive })}</span>
              )}
            </div>
          </div>
          <button className="acd-close-btn" aria-label={t('addCodeModal.close')} onClick={handleCloseAttempt}>✕</button>
        </div>

        <div className="acd-body">

          {/* ── LEFT PANEL ── */}
          <div className="fm-left-panel acd-left">
            <div className="acd-left-title">{t('addCodeModal.appliedCodes')}</div>
            {dragCode && (
              <div className="acd-left-hint">
                {t('addCodeModal.dragHint')}
              </div>
            )}

            {/* Case level */}
            <DropZone specimenIndex={null}>
              <button
                className={`fm-target-row${target === null ? ' active' : ''}`}
                onClick={() => setTarget(null)}
              >
                <IcoCase />
                <span className="acd-case-label-flex">{t('addCodeModal.caseLevel')}</span>
                {activeCaseApplied.length > 0 && (
                  <span className="fm-count-badge">{activeCaseApplied.length}</span>
                )}
              </button>
              {renderAppliedGroups(caseApplied)}
              {caseApplied.length === 0 && (
                <div className="fm-no-flags-note">{t('addCodeModal.noCaseLevelCodes')}</div>
              )}
            </DropZone>

            <div className="fm-divider" />

            {/* Specimens */}
            {allSpecimens.map(sp => {
              const spApplied   = specimenApplied(sp.index);
              const activeCount = activeSpecimenApplied(sp.index).length;
              return (
                <DropZone key={sp.index} specimenIndex={sp.index}>
                  <button
                    className={`fm-target-row${target === sp.index ? ' active' : ''}`}
                    onClick={() => setTarget(sp.index)}
                  >
                    <IcoSpec />
                    <span className="acd-sp-row-label">
                      <span className="acd-sp-label-prefix">{t('addCodeModal.specimenPrefix', { id: sp.id })}</span>{'  '}{sp.name}
                    </span>
                    {activeCount > 0 && (
                      <span className="fm-count-badge">{activeCount}</span>
                    )}
                  </button>
                  {renderAppliedGroups(spApplied)}
                  {spApplied.length === 0 && (
                    <div className="fm-no-flags-note">{t('addCodeModal.noCodesAppliedDragHint')}</div>
                  )}
                </DropZone>
              );
            })}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="fm-right-panel acd-right">

            {/* AI Suggest button */}
            {caseText && (
              <div className="acd-ai-header-row">
                <button
                  onClick={generateAiCodes}
                  disabled={aiLoading}
                  className={`acd-ai-suggest-btn${aiLoading ? ' acd-ai-suggest-btn--loading' : ''}`}
                >
                  <span className="acd-ai-sparkle">✦</span>
                  {aiLoading ? t('addCodeModal.aiThinking')
                    : aiRan && synopticDerivedCodes?.length ? `↻ ${t('addCodeModal.rerunSynoptic')}`
                    : aiRan && narrativeText ? `↻ ${t('addCodeModal.rerunNarrative')}`
                    : aiRan ? `↻ ${t('addCodeModal.rerunAiSuggestions')}`
                    : narrativeText ? `✦ ${t('addCodeModal.aiSuggestNarrative')}`
                    : `✦ ${t('addCodeModal.aiSuggestCodes')}`}
                </button>
                {aiError && <span className="acd-ai-error">⚠ {aiError}</span>}
                {!aiLoading && aiUnverified > 0 && <span className="acd-ai-error">{t('addCodeModal.aiUnverifiedNote', { count: aiUnverified })}</span>}
              </div>
            )}

            {/* AI Suggestions panel */}
            {aiSuggestions.length > 0 && (
              <div className="acd-ai-panel">
                <div
                  {...pressable(() => setAiPanelCollapsed(c => !c))}
                  className="acd-ai-panel-header"
                >
                  <span>✦</span>
                  <span className="acd-ai-panel-label">{t('addCodeModal.aiSuggestedCodesHeader')}</span>
                  <span className="acd-ai-panel-count">
                    {t('addCodeModal.suggestionsCount', { count: visibleSuggestions.length })}
                  </span>
                  <span className={`acd-ai-panel-chevron${aiPanelCollapsed ? ' acd-ai-panel-chevron--collapsed' : ''}`}>▾</span>
                </div>
                {!aiPanelCollapsed && visibleSuggestions
                  .map((sug) => {
                  const activeCount = applied.filter(c => c.code === sug.code && c.specimenIndex === target && !c.pendingDelete).length;
                  // Real, per direct guidance — same real fix as the
                  // search results list above: a suggestion for a code
                  // already applied to a DIFFERENT specimen previously
                  // showed as if entirely fresh here too.
                  const elsewhere = activeCount === 0
                    ? findAppliedElsewhere(applied, sug.code, target)
                    : [];
                  return (
                    <div
                      key={sug.code}
                      // Batch 567 (axe nested-interactive): the row can hold a button (Move here), so it isn't a button
                      // itself; clicking it still applies the code, and the button at its end does the same from the keyboard.
                      {...clickableContainer(elsewhere.length === 0 ? () => addCode({ code: sug.code, display: sug.display, system: sug.system }, { source: 'ai', ai: aiDetailFor(sug) }) : undefined)}
                      className={`acd-ai-suggestion-row${activeCount > 0 ? ' acd-ai-suggestion-row--active' : ''}`}
                    >
                      <span className="acd-code-badge">
                        {sug.code}
                      </span>
                      <span className="acd-system-badge">
                        {sug.system}
                      </span>
                      {sug.system === 'CPT' && (
                        <span
                          className="acd-estimate-badge"
                          title={t('addCodeModal.estimateTooltip')}
                        >
                          {t('addCodeModal.estimate')}
                        </span>
                      )}
                      {sug.simulated && <span className="ps-simulated-badge">{t('addCodeModal.simulatedResult')}</span>}
                      <span className={`acd-sug-desc ${activeCount > 0 ? 'acd-sug-desc--active' : 'acd-sug-desc--default'}`}>
                        {sug.display}
                      </span>
                      <AiSuggestionMeta sug={sug} />
                      {sug.rvu != null && (
                        <span className="acd-already-added">
                          {t('addCodeModal.rvuValue', { rvu: sug.rvu })}
                        </span>
                      )}
                      {activeCount > 0 ? (
                        <button type="button" className="ps-row-open-btn acd-added-check" aria-label={t('addCodeModal.applyAgainLabel', { applied: `✓ ×${activeCount}` })} title={t('addCodeModal.appliedNTimes', { count: activeCount })}
                          onClick={e => { e.stopPropagation(); addCode({ code: sug.code, display: sug.display, system: sug.system }, { source: 'ai', ai: aiDetailFor(sug) }); }}>✓ ×{activeCount}</button>
                      ) : elsewhere.length > 0 ? (
                        <span
                          className="acd-elsewhere-hint"
                          title={t('addCodeModal.alreadyAppliedTo', { targets: elsewhere.map(e => e.specimenIndex === null ? t('addCodeModal.caseLevel') : (allSpecimens.find(s => s.index === e.specimenIndex)?.name ?? t('addCodeModal.anotherSpecimen'))).join(', ') })}
                        >
                          {t('addCodeModal.elsewhere')}
                          <button
                            type="button"
                            className="ps-conf-btn-row"
                            onClick={(e) => { e.stopPropagation(); moveCode(elsewhere[0], target); }}
                          >
                            {t('addCodeModal.moveHere')}
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="ps-row-open-btn acd-add-btn" title={t('addCodeModal.applyCode')} aria-label={t('addCodeModal.applyCode')}
                          onClick={e => { e.stopPropagation(); addCode({ code: sug.code, display: sug.display, system: sug.system }, { source: 'ai', ai: aiDetailFor(sug) }); }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="3" x2="19" y2="9"/><line x1="16" y1="6" x2="22" y2="6"/></svg></button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PS-138: findings that matched an abnormal-detection trigger. Choosing one fills the search box; nothing is searched
                until it is chosen, and nothing is applied until a result is chosen. */}
            {triggerQueries.length > 0 && SYSTEMS.some(x => x.id === 'SNOMED') && (
              <div className="acd-trigger-row" data-testid="trigger-code-queries">
                <span className="acd-trigger-label">{t('addCodeModal.triggerHeader')}</span>
                {triggerQueries.map(q => (
                  <button
                    key={`${q.ruleId}-${q.specimenId}-${q.matchedValue}`}
                    type="button"
                    className={`acd-trigger-chip acd-trigger-chip--${q.severity.toLowerCase()}`}
                    title={t('addCodeModal.triggerChipTitle', { query: q.query })}
                    onClick={() => {
                      const sp = allSpecimens.find(x => x.specimenId === q.specimenId);
                      setSystem('SNOMED');
                      if (sp) setTarget(sp.index);
                      setQuery(q.query);
                      setFocused(-1);
                      inputRef.current?.focus();
                    }}
                  >
                    {q.fieldLabel}: {q.matchedValue}
                  </button>
                ))}
              </div>
            )}

            {/* System tabs */}
            <div className="acd-filter-row">
              {SYSTEMS.map(s => (
                <button key={s.id} onClick={() => { setSystem(s.id); setQuery(''); setFocused(-1); inputRef.current?.focus(); }}
                  className={`acd-system-tab-btn${system === s.id ? ' acd-system-tab-btn--active' : ''}`}
                  style={{ '--ps-hue': s.accent } as React.CSSProperties}
                >{s.id === 'CPT' ? (isOrchestrationMode ? t('addCodeModal.billingCode') : t('addCodeModal.cptRvu')) : t(SYSTEM_LABEL_KEY[s.id])}{requiredIds.includes(s.id) && <span className="acd-required-mark" title={t('addCodeModal.requiredHint')}>{t('addCodeModal.required')}</span>}</button>
              ))}
              <button type="button" className="acd-system-tab-btn" aria-pressed={showCaseCoding} onClick={() => setShowCaseCoding(v => !v)}>{t('addCodeModal.caseCodingToggle')}</button>
            </div>
            {policyFallback && <div className="ps-code-system-off-note" role="note" data-testid="code-policy-fallback">{t('codeSystemsPolicy.fallbackNote')}</div>}
            <CodeSystemOffNote systems={offBySetting} />
            {showCaseCoding && <CaseCodingDisplay entries={entriesNow} />}

            {/* Hierarchy filters — SNOMED only */}
            {system === 'SNOMED' && (
              <div className="acd-filter-row">
                {SNOMED_FILTERS.map(f => (
                  <button key={f} onClick={() => setSnomedFilter(f)} title={t(SNOMED_FILTER_HINT_KEY[f])}
                    className={`acd-snomed-filter-btn${snomedFilter === f ? ' acd-snomed-filter-btn--active' : ''}`}
                  >{t(SNOMED_FILTER_LABEL_KEY[f])}</button>
                ))}
              </div>
            )}

            {/* Target indicator */}
            <div className="acd-hint-text">
              {t('addCodeModal.applyingTo')}{' '}
              <strong className="acd-hint-strong">
                {target === null ? t('addCodeModal.caseLevel') : t('addCodeModal.specimenTarget', { id: allSpecimens.find(s => s.index === target)?.id ?? target + 1 })}
              </strong>
              <span className="acd-hint-muted">{t('addCodeModal.clickToChange')}</span>
            </div>

            {/* Real, honest note, per direct requirement: "the
                Pathologist has the right to update all billing, even
                those that are deterministic ... LIS will handle the
                billing in assist mode" alongside the real, separate
                follow-up on keeping RVU tracking useful. Only shown on
                the CPT tab, only in assist mode - never hidden, since
                the code itself still needs to be added for RVU
                tracking to work, just honestly labeled as not a real
                charge here. */}
            {system === 'CPT' && !isOrchestrationMode && (
              <div className="acd-hint-text acd-assist-mode-note">
                ⓘ {t('addCodeModal.assistModeNote')}
              </div>
            )}

            {/* Search */}
            <div className="fm-search-wrap acd-search-mb">
              <span className="fm-search-icon"><IcoSearch /></span>
              <input
                ref={inputRef}
                autoFocus
                className="fm-search-input"
                value={query}
                onChange={e => { setQuery(e.target.value); setFocused(-1); }}
                onKeyDown={handleKeyDown}
                placeholder={t('addCodeModal.searchPlaceholder', { system: t(SYSTEM_LABEL_KEY[sysInfo.id]) })}
              />
              {query && (
                <button className="fm-search-clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}>✕</button>
              )}
            </div>

            {system === 'ICDO' && <ManualIcdoEntry onAdd={addCode} />}
            {system === 'OPCS4' && <Opcs4Notice />}

            {/* Results */}
            <div className="acd-list-scroll">
              {loading ? (
                <div className="fm-empty">
                  <div className="fm-empty-hint">{t('addCodeModal.searchingSystem', { system: t(SYSTEM_LABEL_KEY[sysInfo.id]) })}</div>
                </div>
              ) : !query.trim() ? (
                <div className="fm-empty">
                  <IcoSearch />
                  <div className="fm-empty-heading">{t('addCodeModal.searchSystemHeading', { system: t(SYSTEM_LABEL_KEY[sysInfo.id]) })}</div>
                  <div className="fm-empty-hint">
                    {system === 'SNOMED' ? t('addCodeModal.searchHint.snomed') :
                     system === 'ICD10'  ? t('addCodeModal.searchHint.icd10') :
                     system === 'LOINC'  ? t('addCodeModal.searchHint.loinc') :
                     system === 'ICD11'  ? t('addCodeModal.searchHint.icd11') :
                     t('addCodeModal.searchHint.icdo')}
                  </div>
                </div>
              ) : searchError ? (
                <div className="fm-empty">
                  <IcoSearch />
                  <div className="fm-empty-heading acd-empty-heading--warning">{t('addCodeModal.searchUnavailable')}</div>
                  <div className="fm-empty-hint">{searchError}</div>
                </div>
              ) : results.length === 0 ? (
                <div className="fm-empty">
                  <IcoSearch />
                  <div className="fm-empty-heading">{t('addCodeModal.noResultsFor', { query })}</div>
                  <div className="fm-empty-hint">{t('addCodeModal.tryDifferentTerm')}</div>
                </div>
              ) : results.map((r, i) => {
                const activeCount = applied.filter(c => c.code === r.code && c.specimenIndex === target && !c.pendingDelete).length;
                // Real, per direct guidance: "if the code exists
                // already it is flagged so the Pathologist knows it
                // has been applied. From there the Pathologist can
                // assign the code to a different case specimen or
                // maybe they want it at the case level." The existing
                // activeCount check above only ever looked at the
                // CURRENTLY-selected target — a code applied to a
                // different specimen showed as if it had never been
                // applied at all anywhere on the case. This surfaces
                // that real, cross-target state and reuses the
                // already-existing, already-working moveCode() (the
                // same real reassignment this app's own drag-and-drop
                // already performs) rather than building a second,
                // separate reassignment mechanism.
                const elsewhere = activeCount === 0
                  ? findAppliedElsewhere(applied, r.code, target)
                  : [];
                const isFocus  = focused === i;
                return (
                  <div
                    key={r.code}
                    className={`fm-flag-card acd-result-card${activeCount > 0 ? ' applied' : ''}${isFocus && activeCount === 0 ? ' acd-result-card--focused' : ''}`}
                    onMouseEnter={() => setFocused(i)}
                    // Batch 567: as the suggestion rows above (a mouse shortcut; the button at its end, or Enter in the search box).
                    {...clickableContainer(elsewhere.length === 0 ? () => addCode(r) : undefined)}
                  >
                    <span className={`fm-code-chip${activeCount > 0 ? ' applied' : ''}`}>
                      {r.code}
                    </span>
                    <span className={`acd-sug-desc ${activeCount > 0 ? 'acd-sug-desc--active' : 'acd-sug-desc--default'}`}>
                      {r.display}
                    </span>
                    {isSimulatedResult(r) && <span className="ps-simulated-badge">{t('addCodeModal.simulatedResult')}</span>}
                    {r.system === 'ICDO' && <RegistryCheckNote code={r.code} />}
                    {activeCount > 0 ? (
                      <button type="button" className="ps-row-open-btn acd-added-text" aria-label={t('addCodeModal.applyAgainLabel', { applied: `✓ ${t('addCodeModal.appliedTimesLabel', { count: activeCount })}` })} title={t('addCodeModal.appliedNTimes', { count: activeCount })}
                        onClick={e => { e.stopPropagation(); addCode(r); }}>✓ {t('addCodeModal.appliedTimesLabel', { count: activeCount })}</button>
                    ) : elsewhere.length > 0 ? (
                      <span
                        className="acd-elsewhere-hint"
                        title={t('addCodeModal.alreadyAppliedTo', { targets: elsewhere.map(e => e.specimenIndex === null ? t('addCodeModal.caseLevel') : (allSpecimens.find(s => s.index === e.specimenIndex)?.name ?? t('addCodeModal.anotherSpecimen'))).join(', ') })}
                      >
                        {t('addCodeModal.appliedElsewhere')}
                        <button
                          type="button"
                          className="ps-conf-btn-row"
                          onClick={(e) => { e.stopPropagation(); moveCode(elsewhere[0], target); }}
                        >
                          {t('addCodeModal.moveHere')}
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="ps-row-open-btn fm-apply-btn acd-apply-btn-right" title={t('addCodeModal.applyCode')} aria-label={t('addCodeModal.applyCode')}
                        onClick={e => { e.stopPropagation(); addCode(r); }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="3" x2="19" y2="9"/><line x1="16" y1="6" x2="22" y2="6"/></svg></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CONTEXT MENU ── */}
        {ContextMenu}

        {/* ── FOOTER ── */}
        <div className="fm-footer">
          <span className={`fm-footer-status${isDirty ? ' dirty' : ''}${saveError ? ' acd-footer-status--error' : ''}`}>
            {saveError
              ? saveError
              : isDirty
              ? [
                  toAddCount > 0 ? t('addCodeModal.toAddCount', { count: toAddCount }) : null,
                  toRemoveCount > 0 ? t('addCodeModal.toRemoveCount', { count: toRemoveCount }) : null,
                ].filter(Boolean).join(' · ')
              : t('addCodeModal.noChanges')
            }
          </span>
          <div className="acd-footer-row">
            <button className="fm-btn-cancel" onClick={handleCloseAttempt}>{t('addCodeModal.cancel')}</button>
            {/* Batch 649: greyed without case:diagnosis-code:apply (the save checks it again). */}
            <CapabilityButton capability="case:diagnosis-code:apply" className="fm-btn-save" disabled={saving || !isDirty} onClick={() => { void handleSave(); }}>
              {saving ? t('addCodeModal.saving') : t('addCodeModal.save')}
            </CapabilityButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCodeModal;
