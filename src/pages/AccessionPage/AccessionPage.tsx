// src/pages/AccessionPage/AccessionPage.tsx
// ─────────────────────────────────────────────────────────────
// Orchestration Stage 0 entry point — Stage 0 Requirements §6.1.
// Captures patient/case info and specimen list, then on submit:
//   1. Generates an O26- case ID (temporary scheme — see ID generation
//      note below; superseded once the Case Registry, S0-CF-08/09/10,
//      exists)
//   2. Calls evaluateGrossingTemplateAssignment() to pick a Grossing
//      Route (A/B/C) per specimen
//   3. Builds a GrossingReportInstance per specimen, status 'draft'
//   4. Creates the Case via caseRouter.createCase() with
//      status: 'accessioned'
//
// SPECIMEN MODEL — Name (read-only, from dictionary) / Description
// (editable, pre-filled from dictionary) / Comment (free text). Each row
// is populated from useSpecimenDictionary's SpecimenEntry — the same
// dictionary SpecimenEditModal.tsx already uses elsewhere in the app.
// That dictionary already carries type/site/laterality/procedure per
// entry, which directly satisfies S0-CF-01–03's "structured specimen
// data" requirement — those fields were not actually unbuilt, just not
// wired into this page. A specimen can still be entered manually
// ("— Custom specimen —") for anything not yet in the dictionary, same
// allowance SpecimenEditModal gives.
//
// SKELETON SCOPE — explicitly deferred to later Stage 0 build-order steps:
//   - Accession Number mask config (S0-CF-07) — uses a simple max+1 scheme.
//   - Pass G0 client override admin UI (S0-CF-12) — routingOverrides is
//     passed as empty; the evaluation function already accepts it.
//   - Per-field aiSuggestions pre-population on the created
//     GrossingReportInstance (S0-FR-03's "where the template has fields
//     the AI can already answer") — left empty; the seed mock data (Stage
//     0 §5) shows the target shape but synthesizing it from arbitrary
//     real specimen descriptions per template is real per-template-field
//     mapping work, not part of this skeleton.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { caseRouter } from '@/services/cases/CaseRouter';
import { evaluateGrossingTemplateAssignment } from '@/services/cases/mockCaseService';
import { mockClientService, Client } from '@/services/clients/mockClientService';
import { mockUserService } from '@/services/users/mockUserService';
import type { StaffUser } from '@/services/users/IUserService';
import type { Case, GrossingReportInstance } from '@/types/case/Case';
import type { HistologyBlock } from '@/types/case/Specimen';
import type { CaseComment } from '@/types/case/CaseComment';
import { deficiencyTypeService } from '@/services';
import { stainTypeService } from '@/services';
import type { StainType } from '@/services/stains/IStainService';
import { protocolService } from '@/services';
import type { Protocol } from '@/services/protocols/IProtocolService';
import { diagnosisCodesService } from '@/services';
import type { Icd10Code } from '@/services/diagnosisCodes/IDiagnosisCodesService';
import type { DeficiencyType } from '@/services/deficiencies/IDeficiencyService';
import { ReportDeficiencyModal } from './ReportDeficiencyModal';
import type { SpecimenEntry } from '@/components/Config/System/specimenTypes';
import { getSpecimenLabel, getBlockLabel } from '@/utils/specimenLabeling';
import type { GrossingTemplateAssignment } from '@/services/grossing/IGrossingEvaluationService';
import { useAuth } from '@/contexts/AuthContext';
import { useSpecimenDictionary } from '@/components/Config/System/useSpecimenDictionary';
import { orderIntakeService } from '@/services';
import type { IncomingOrder } from '@/services';
import { specimenDeficiencyService } from '@/services';
import { priorityService } from '@/services';
import type { PriorityLevel } from '@/services';
import type { CasePriority } from '@/services/cases/ICaseService';
import { SuffixSelect } from '@/components/Common/SuffixSelect';
import { formatFullDisplayName } from '@/utils/personName';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { getHospitalIdForOrganisation, getOrganisationDisplayName } from '@/services/organisation/organisationService';
import { PATIENT_ID_BY_JURISDICTION } from '@/types/systemConfig';
import { SpecimenDictionaryPicker } from '@/components/AccessionPage/SpecimenDictionaryPicker';
import { CaseCommentModal } from '@/pages/Synoptic/Comments/CaseCommentModal';
import { ReportCommentModal } from '@/pages/Synoptic/Comments/ReportCommentModal';
import { mockActionRegistryService } from '@/services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '@/constants/systemActions';

// ── Local form types ────────────────────────────────────────────────────────

interface SpecimenDraft {
  label: string;              // auto-assigned A, B, C…
  dictionaryEntryId: string;  // '' = manual / not yet picked ("— Custom specimen —")
  description: string;        // editable; pre-filled from the dictionary entry on pick
  comments: CaseComment[];    // append-only thread, separate from description
  /**
   * A manually-reported deficiency for this specimen — distinct from
   * needsDictionaryResolution (auto-detected on order import). Not
   * every real specimen issue is a dictionary mismatch — container
   * damage, insufficient volume, a labeling discrepancy noticed by the
   * accessioner — none of those get auto-detected, so there needs to be
   * a way to flag one manually. Raised (not raised-and-resolved) at
   * submit time — a manually-reported issue isn't something the
   * accessioner necessarily has the answer to on the spot, unlike the
   * auto-detected dictionary mismatch, which gets resolved in the same
   * sitting it's found.
   */
  manualDeficiency?: { deficiencyTypeId: string; comment: string };
  /** Set only when this specimen came from "Import from Order" — the
   *  Specimen Category that resolveOrder() matched it to (crosswalk or
   *  auto-created), shown as an informational note. Not sent anywhere on
   *  submit; evaluateGrossingTemplateAssignment still does its own
   *  independent AI reasoning per specimen. */
  resolvedCategoryName?: string;
  categoryWasAutoCreated?: boolean;

  /**
   * True when this specimen came from an imported order whose text
   * didn't exactly match any Specimen Dictionary entry. Deliberately no
   * AI/fuzzy-matching here, and no auto-created pending entry — the
   * Specimen Dictionary has no unique key to dedupe against (unlike NPI
   * for Physician or code for Client/Category), so auto-creating on a
   * near-miss just produces near-duplicate entries for someone to clean
   * up later. This is the specimen-requisition-deficiency case instead:
   * the accessioner — who has the actual specimen and order in front of
   * them — resolves it directly, either by picking the correct existing
   * entry or explicitly confirming no match exists. Blocks submission
   * (specimensValid) until resolved either way.
   */
  needsDictionaryResolution?: boolean;
  /** The order's original specimen text, kept for display in the
   *  resolution prompt even if the editable description field changes.
   *  Also doubles as "this specimen had a deficiency raised against it
   *  at some point" — checked at submit time to decide whether a
   *  SpecimenDeficiency record needs writing, even after resolution. */
  unmatchedOrderText?: string;
  /** Set once needsDictionaryResolution is cleared — which
   *  ResolutionType.id applies, so the eventual SpecimenDeficiency
   *  record reflects how it was actually resolved. */
  resolutionTypeId?: string;

  // ── Timing / processing (Specimen.collection/processing/container) ──────
  // Three distinct moments, not one — see the design discussion this was
  // built from. collectedAt starts the cold-ischemia clock; processedAt
  // (fixative added) ends it — the gap between them is what CAP/ASCO
  // biomarker guidance (breast ER/PR/HER2 etc.) actually constrains.
  // receivedAt is when the lab got it, a separate fact from either.
  /** When the specimen was actually taken from the patient. Left blank by
   *  default — collection almost always happened before accessioning, so
   *  defaulting to "now" would be actively wrong, not just imprecise. */
  collectedAt: string;
  /** When fixative was added — the cold-ischemia end point. Also blank by
   *  default; see processedAtIsEstimated below for what happens when the
   *  real time was never documented. */
  processedAt: string;
  /** True when processedAt is a professional estimate, not a directly
   *  documented time — see Specimen.ts's SpecimenProcessing.
   *  processedAtIsEstimated for the full reasoning. */
  processedAtIsEstimated: boolean;
  /** When the lab received the specimen — the one moment the accessioner
   *  is actually present for, so this alone defaults to "now". */
  receivedAt: string;

  // ── Manual override fields for custom (non-dictionary) specimens ────────
  // Pre-filled from the matched dictionary entry when one is picked
  // (site/laterality), but editable — the requisition may state these
  // more precisely than the dictionary's own defaults, and a custom
  // specimen has no dictionary entry to pull them from at all.
  containerType: string;
  anatomicSite: string;
  laterality: string;
}


// Auto-generates Block A with stain orders from the matched dictionary
// entry's defaultStains — falls back to H&E if unset, which is most
// entries today (defaultStains was added to the SpecimenEntry type but
// never backfilled onto real seed data). Built for a same-week
// end-to-end demo (Accession → Grossing Template → Blocks/Stains →
// Worklist → Synoptic → sign-out) — deliberately minimal, see
// Specimen.blocks's own doc comment (types/case/Specimen.ts) for full
// scope reasoning and what's explicitly cut for time.
// Auto-generates blocks/stains from the matched dictionary entry.
//
// Two paths, branching on whether the entry has a protocolId resolving
// to a real Protocol (services/protocols/IProtocolService.ts — a
// standalone, referenceable dictionary; multiple unrelated specimen
// types can map to the same Protocol record):
//
//   - Protocol configured (e.g. Medical Renal → LM/IF/EM): one block
//     PER PATHWAY, each carrying that pathway's own fixative/format/
//     decal requirement — a real fix for the flat "one specimen, one
//     block" assumption this started as, for the specimen types where
//     that assumption was actually wrong (a kidney biopsy splitting
//     into three genuinely different processing streams isn't three
//     blocks of the same thing).
//   - No protocol (still true for most specimen types — this is new,
//     opt-in, nothing regresses for anything without one configured):
//     unchanged, original single-block behavior from defaultStains/H&E.
//
// Built for a same-week end-to-end demo originally; still deliberately
// minimal beyond the protocol rewire — no editing UI yet, no block-
// level priority, no full exception-status lifecycle. See
// Specimen.blocks's own doc comment (types/case/Specimen.ts) for the
// original scope reasoning, still true for what's not covered here.
// ── ICD-10 diagnosis code picker — search + multi-select, same pattern as ──
// ── the Protocol editor's stain picker, for the same scalability reason: ───
// ── even this deliberately small seed set shouldn't be a static list. ──────
const Icd10Picker: React.FC<{
  allCodes: Icd10Code[];
  selected: Icd10Code[];
  onChange: (codes: Icd10Code[]) => void;
}> = ({ allCodes, selected, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const matches = allCodes
    .filter(c => !selected.some(s => s.code === c.code))
    .filter(c => {
      const q = query.trim().toLowerCase();
      return !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    })
    .slice(0, 20);

  const add = (c: Icd10Code) => { onChange([...selected, c]); setQuery(''); };
  const remove = (code: string) => onChange(selected.filter(s => s.code !== code));

  return (
    <div className="ps-protocol-stainselect" ref={wrapRef}>
      {selected.length > 0 && (
        <div className="ps-protocol-stainselect-chips">
          {selected.map(c => (
            <span key={c.code} className="ps-protocol-stainselect-chip">
              {c.code} — {c.description}
              <button type="button" onClick={() => remove(c.code)} className="ps-protocol-stainselect-chip-remove">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="ps-input-dark"
        placeholder="Search ICD-10 diagnosis codes — code or description…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && matches.length > 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          {matches.map(c => (
            <div key={c.code} className="ps-protocol-stainselect-option" onMouseDown={() => add(c)}>
              <span>{c.code}</span>
              <span className="ps-protocol-stainselect-option-cat">{c.description}</span>
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          <div className="ps-protocol-stainselect-empty">No matching codes.</div>
        </div>
      )}
    </div>
  );
};

function generateDefaultBlocks(
  entry: SpecimenEntry | undefined,
  specimenId: string,
  specimenLabelStyle?: 'alpha-specimen' | 'numeric-specimen',
  stainTypes: StainType[] = [],
  protocols: Protocol[] = []
): HistologyBlock[] {
  const stainName = (stainTypeId: string) => stainTypes.find(s => s.id === stainTypeId)?.name ?? stainTypeId;
  // Resolved from the standalone Protocol dictionary via protocolId —
  // no longer an embedded object on the specimen entry itself. See
  // that field's own doc comment (Config/System/specimenTypes.ts) for
  // why: the same protocol record can be mapped from multiple
  // unrelated specimen types, updated once, cascading to all of them.
  const protocol = entry?.protocolId ? protocols.find(p => p.id === entry.protocolId) : undefined;

  if (protocol?.pathways?.length) {
    return protocol.pathways.map((pathway, pathwayIndex) => {
      const blockLabel = getBlockLabel(pathwayIndex, specimenLabelStyle);
      const sortedTasks = [...pathway.tasks].sort((a, b) => a.stepOrder - b.stepOrder);
      const stains: HistologyBlock['stains'] = [];
      sortedTasks.forEach((task, taskIdx) => {
        task.stainTypeIds.forEach((stainTypeId, stainIdx) => {
          stains.push({
            id: `${specimenId}-BLOCK-${blockLabel}-STAIN-${taskIdx}-${stainIdx}`,
            stainName: stainName(stainTypeId),
            status: 'Pending Cut',
          });
        });
      });
      return {
        id: `${specimenId}-BLOCK-${blockLabel}`,
        label: blockLabel,
        status: 'Pending',
        stains,
        sourcePathwayName: pathway.pathwayName,
        fixativeType: pathway.fixativeType,
        processingFormat: pathway.processingFormat,
        requiresDecal: pathway.requiresDecal,
      };
    });
  }

  const stainNames = entry?.defaultStains?.length ? entry.defaultStains : ['H&E'];
  const blockLabel = getBlockLabel(0, specimenLabelStyle);
  return [{
    id: `${specimenId}-BLOCK-${blockLabel}`,
    label: blockLabel,
    status: 'Pending',
    stains: stainNames.map((name, i) => ({
      id: `${specimenId}-BLOCK-${blockLabel}-STAIN-${i}`,
      stainName: name,
      status: 'Pending Cut',
    })),
  }];
}

function emptySpecimen(label: string): SpecimenDraft {
  return {
    label, dictionaryEntryId: '', description: '', comments: [],
    collectedAt: '', processedAt: '', processedAtIsEstimated: false,
    // receivedAt defaults to "now" — the one moment the accessioner is
    // actually present for. Formatted for a datetime-local input.
    receivedAt: new Date().toISOString().slice(0, 16),
    containerType: '', anatomicSite: '', laterality: '',
  };
}

// ── Component ────────────────────────────────────────────────────────────

type TabKey = 'case' | 'specimens';

const AccessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb('Accession', '/accession'); }, [pushCrumb]);

  const [tab, setTab] = useState<TabKey>('case');
  const [submitting, setSubmitting] = useState(false);

  // ── Reference data ──────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [pathologists, setPathologists] = useState<StaffUser[]>([]);
  const [pendingOrders, setPendingOrders] = useState<IncomingOrder[]>([]);

  const loadPendingOrders = () => {
    orderIntakeService.listPendingOrders().then(res => { if (res.ok) setPendingOrders(res.data); });
  };

  useEffect(() => {
    mockClientService.getAll().then(res => { if (res.ok) setClients(res.data.filter(c => c.status === 'Active')); });
    mockUserService.getAll().then(res => {
      if (res.ok) setPathologists(res.data.filter(u => u.status === 'Active' && u.roles.includes('Pathologist')));
    });
    loadPendingOrders();
  }, []);

  // ── Patient / case fields ───────────────────────────────────────────────
  // Prefix/Given/Family/Preferred/Suffix instead of rigid First/Last —
  // see utils/personName.ts. givenNames/familyNames are the real data;
  // Case.patient.firstName/lastName get mirrored from them at submit
  // time for backward compatibility with Worklist/report-rendering/etc.
  const [namePrefix, setNamePrefix] = useState('');
  const [givenNames, setGivenNames] = useState('');
  const [familyNames, setFamilyNames] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [nameSuffix, setNameSuffix] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | 'U'>('F');
  const [mrn, setMrn] = useState('');

  // Origin Hospital is derived from the accessioning user's own
  // organisation, not a free-pick dropdown — see organisationService.ts's
  // getHospitalIdForOrganisation() doc comment for why. Falls back to
  // 'HOSP-001' only if the session has no resolvable organisationId
  // (matches the deny-by-default posture elsewhere; a case created under
  // an unresolvable org will itself be inaccessible to everyone except
  // superadmin, which is the correct fail-safe rather than guessing).
  const originHospitalId = (user?.organisationId && getHospitalIdForOrganisation(user.organisationId)) || 'HOSP-001';
  const [priority, setPriority] = useState<CasePriority>('Routine');
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([]);
  useEffect(() => {
    priorityService.getAll().then(res => { if (res.ok) setPriorityLevels(res.data.filter(p => p.isActive)); });
  }, []);
  const [deficiencyTypes, setDeficiencyTypes] = useState<DeficiencyType[]>([]);
  const [deficiencyModalOpenForIdx, setDeficiencyModalOpenForIdx] = useState<number | null>(null);
  const [caseDeficiencyModalOpen, setCaseDeficiencyModalOpen] = useState(false);
  const [caseManualDeficiency, setCaseManualDeficiency] = useState<{ deficiencyTypeId: string; comment: string } | undefined>(undefined);
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [allIcd10Codes, setAllIcd10Codes] = useState<Icd10Code[]>([]);
  useEffect(() => {
    protocolService.getAll().then(res => { if (res.ok) setProtocols(res.data.filter(p => p.active)); });
    diagnosisCodesService.getAll().then(res => { if (res.ok) setAllIcd10Codes(res.data); });
  }, []);
  useEffect(() => {
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data); });
  }, []);
  useEffect(() => {
    deficiencyTypeService.getAll().then(res => { if (res.ok) setDeficiencyTypes(res.data); });
  }, []);
  const [requestingProvider, setRequestingProvider] = useState('');
  const [clientId, setClientId] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [icd10Codes, setIcd10Codes] = useState<Icd10Code[]>([]);
  // General accessioning note — distinct from Clinical Indication (the
  // clinical reason, feeds Grossing Route AI). This is a whole-case
  // note, same reasoning as the specimen-level Comment field, just at
  // case scope — e.g. "STAT per phone call with Dr. Smith."
  const [caseComments, setCaseComments] = useState<CaseComment[]>([]);
  const addCaseComment = (text: string) => {
    setCaseComments(prev => [...prev, {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: user?.id ?? 'unknown',
      authorName: user?.name ?? 'Unknown User',
      text,
      createdAt: new Date().toISOString(),
      // Anything typed through PathScribe's own composer is, by
      // definition, PathScribe-originated — this isn't a user choice.
      origin: 'pathscribe',
      syncStatus: 'pending',
    }]);
  };
  const [assignedTo, setAssignedTo] = useState('');

  // Default "assign to" to the logged-in user if they're a pathologist —
  // most accessions in practice are logged by/for the pathologist on call.
  useEffect(() => {
    if (user?.role === 'pathologist' || user?.role === 'pathologist-admin' || user?.role === 'superadmin') {
      setAssignedTo(prev => prev || user.id);
    }
  }, [user]);

  // ── Specimens ────────────────────────────────────────────────────────────
  const { dictionary } = useSpecimenDictionary();
  const [specimens, setSpecimens] = useState<SpecimenDraft[]>([emptySpecimen('A')]);

  const addSpecimen = () => {
    setSpecimens(prev => [...prev, emptySpecimen(getSpecimenLabel(prev.length, selectedClient?.specimenLabelStyle))]);
  };
  const removeSpecimen = (idx: number) => {
    setSpecimens(prev =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, label: getSpecimenLabel(i, selectedClient?.specimenLabelStyle) }))
    );
  };
  const updateSpecimen = (idx: number, description: string) => {
    setSpecimens(prev => prev.map((s, i) => (i === idx ? { ...s, description } : s)));
  };
  const addSpecimenComment = (idx: number, text: string) => {
    const newComment: CaseComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: user?.id ?? 'unknown',
      authorName: user?.name ?? 'Unknown User',
      text,
      createdAt: new Date().toISOString(),
      origin: 'pathscribe',
      syncStatus: 'pending',
    };
    setSpecimens(prev => prev.map((s, i) => (i === idx ? { ...s, comments: [...s.comments, newComment] } : s)));
  };
  const updateSpecimenField = <K extends keyof SpecimenDraft>(idx: number, field: K, value: SpecimenDraft[K]) => {
    setSpecimens(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  // Applying a dictionary entry pre-fills Description from the entry
  // (editable afterward) — same mapping SpecimenEditModal.tsx uses
  // elsewhere in the app. Name stays locked to the entry once picked;
  // switching back to "— Custom specimen —" clears it for manual entry.
  // Either path also resolves a pending needsDictionaryResolution flag —
  // picking a real entry is itself the resolution.
  const applyDictionaryEntry = (idx: number, entryId: string) => {
    if (!entryId) {
      setSpecimens(prev => prev.map((s, i) => (i === idx ? { ...s, dictionaryEntryId: '' } : s)));
      return;
    }
    const entry = dictionary.find(e => e.id === entryId);
    if (!entry) return;
    setSpecimens(prev => prev.map((s, i) => (i === idx
      ? {
          ...s, dictionaryEntryId: entryId, description: entry.normalizedLabel || entry.name,
          needsDictionaryResolution: false,
          resolutionTypeId: s.unmatchedOrderText ? 'res-matched-existing' : s.resolutionTypeId,
          // Pre-filled from the dictionary entry, not locked — the
          // requisition may state these more precisely, and the
          // accessioner can always override.
          anatomicSite: entry.site ?? s.anatomicSite,
          laterality: entry.laterality ?? s.laterality,
        }
      : s)));
  };

  // Explicit resolution path for a specimen-requisition-style deficiency:
  // the accessioner has looked at the order text and the dictionary and
  // confirmed there genuinely is no match — not the system guessing that
  // for them. Distinct action from just leaving the picker on "Custom",
  // so there's a real record of a deliberate decision rather than an
  // unresolved flag just quietly not being checked.
  const confirmCustomSpecimen = (idx: number) => {
    setSpecimens(prev => prev.map((s, i) => (i === idx
      ? { ...s, needsDictionaryResolution: false, resolutionTypeId: 'res-confirmed-custom' }
      : s)));
  };

  // Which specimen row's dictionary picker modal is currently open, if any.
  const [pickerOpenForIdx, setPickerOpenForIdx] = useState<number | null>(null);
  const [caseCommentModalOpen, setCaseCommentModalOpen] = useState(false);
  const [specimenCommentOpenForIdx, setSpecimenCommentOpenForIdx] = useState<number | null>(null);

  // ── Import from Order ───────────────────────────────────────────────────
  const [sourceOrderId, setSourceOrderId] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');

  // Consumes ScannerProvider's global PATHSCRIBE_SCAN event — the scan-vs-
  // typing detection (HID burst timing) is already handled there, this
  // just reacts to it. A scanned order-number label won't match
  // ScannerProvider's accession or MRN patterns (those are case/patient
  // identifiers, a different format), so it comes through as
  // type: 'unknown' — the provider fires the event either way and takes
  // no further action itself for that type, which is exactly the gap this
  // fills. Also switches to the Case & Patient tab, since that's the only
  // tab the order picker renders on — a scan should work regardless of
  // which tab happens to be open when it comes in, not just the one where
  // the field is visible.
  useEffect(() => {
    const onScan = (e: Event) => {
      const detail = (e as CustomEvent).detail as { raw: string; type: string } | undefined;
      if (!detail || detail.type !== 'unknown') return; // accession/MRN scans are handled by ScannerProvider itself
      setTab('case');
      setOrderSearch(detail.raw);
    };
    window.addEventListener('PATHSCRIBE_SCAN', onScan);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', onScan);
  }, []);

  // ── Action Registry (voice commands + keyboard shortcuts) ──────────────────
  // This page previously had zero integration with the Action Registry —
  // confirmed by checking for any reference to it anywhere in this file —
  // despite Worklist, the Synoptic editor, Search, and Messages all having
  // substantial voice/shortcut coverage. NEXT_TAB/PREVIOUS_TAB already
  // exist as live, globally-eligible actions (NAVIGATION is a
  // GLOBAL_CATEGORIES member) and were already firing everywhere,
  // including here — nothing was listening. ADD_SPECIMEN and
  // SUBMIT_ACCESSION reuse internalKeys (specimen.add, case.create) that
  // were reserved in systemActions.ts but never wired to a live action
  // until this pass.
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.ACCESSION);
    return () => { mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  useEffect(() => {
    const unsubscribe = mockActionRegistryService.onAction((actionId: string) => {
      switch (actionId) {
        case 'NEXT_TAB':
          setTab(prev => prev === 'case' ? 'specimens' : prev);
          break;
        case 'PREVIOUS_TAB':
          setTab(prev => prev === 'specimens' ? 'case' : prev);
          break;
        case 'ADD_SPECIMEN':
          setTab('specimens');
          addSpecimen();
          break;
        case 'SUBMIT_ACCESSION':
          // Deliberately does NOT call handleSubmit() directly — a
          // misheard voice command should never be able to finalize an
          // accession outright. Navigates to the Specimens tab, where
          // Submit now lives (no separate Review tab as of this pass),
          // so the pathologist/accessioner still has to look and click
          // Submit themselves.
          setTab('specimens');
          break;
        case 'ACCESSION_IMPORT_ORDER':
          setTab('case');
          break;
        case 'ACCESSION_CASE_COMMENT':
          setCaseCommentModalOpen(true);
          break;
      }
    });
    return unsubscribe;
  }, []);

  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    // Empty search shows nothing, not the full pending queue — with
    // hundreds of orders in a real deployment, listing them all by
    // default would be unusable. A minimum of 2 characters avoids
    // firing a near-full-list match on a single keystroke.
    if (q.length < 2) return [];
    return pendingOrders.filter(o =>
      o.externalOrderNumber.toLowerCase().includes(q) ||
      `${o.patient.firstName} ${o.patient.lastName}`.toLowerCase().includes(q) ||
      (o.patient.mrn ?? '').toLowerCase().includes(q) ||
      o.externalClientCode.toLowerCase().includes(q)
    );
  }, [pendingOrders, orderSearch]);

  // True if the accessioner has already typed something meaningful into
  // the form — used to decide whether picking an order needs a warning
  // first. Deliberately not gating on every field (e.g. priority/sex
  // defaults don't count as "unsaved work").
  const hasUnsavedProgress = () =>
    givenNames.trim() || familyNames.trim() || dob || mrn.trim() ||
    clinicalIndication.trim() || caseComments.length > 0 || specimens.some(s => s.description.trim());

  async function handleImportOrder(orderId: string) {
    if (!orderId) return;
    if (hasUnsavedProgress() && sourceOrderId !== orderId) {
      const proceed = window.confirm(
        'This form has unsaved information. Importing this order will replace it. Continue?'
      );
      if (!proceed) return;
    }
    setImporting(true);
    try {
      const res = await orderIntakeService.resolveOrder(orderId);
      if (!res.ok) { toast.error(`Could not resolve order: ${res.error}`); return; }
      const { order, warnings } = res.data;

      // IncomingOrder.patient is still the simpler {firstName,lastName}
      // shape (the order-intake source data doesn't carry prefix/
      // preferred/suffix) — mapped into givenNames/familyNames, the
      // accessioner can add prefix/preferred/suffix manually if needed.
      setNamePrefix('');
      setGivenNames(order.patient.firstName);
      setFamilyNames(order.patient.lastName);
      setPreferredName('');
      setNameSuffix('');
      setDob(order.patient.dateOfBirth ?? '');
      setSex(order.patient.sex ?? 'U');
      setMrn(order.patient.mrn ?? '');
      setPriority(order.priority ?? 'Routine');
      setRequestingProvider(order.requestingProvider);
      setClinicalIndication(order.clinicalIndication ?? '');
      setIcd10Codes(order.icd10Codes ?? []);
      if (order.clientId) setClientId(order.clientId);

      const categoriesModule = await import('@/services/specimenCategories/mockSpecimenCategoryService');
      const catsRes = await categoriesModule.mockSpecimenCategoryService.getAll();
      const catNameById = new Map((catsRes.ok ? catsRes.data : []).map(c => [c.id, c.name]));

      // Exact match only against the Specimen Dictionary — no AI/fuzzy
      // matching. A near-miss ("R breast core bx" vs "Right breast core
      // needle biopsy") doesn't get guessed at; it becomes a
      // needsDictionaryResolution flag the accessioner resolves directly,
      // same reasoning as this field's own doc comment above.
      const activeDictionary = dictionary.filter(e => e.active);
      let unresolvedCount = 0;
      const importedClientStyle = clients.find(c => c.id === order.clientId)?.specimenLabelStyle;

      setSpecimens(order.specimens.map((sp, i) => {
        const text = sp.description.trim().toLowerCase();
        const exactMatch = activeDictionary.find(
          e => e.name.trim().toLowerCase() === text || (e.normalizedLabel ?? '').trim().toLowerCase() === text
        );
        if (!exactMatch) unresolvedCount++;
        return {
          label: getSpecimenLabel(i, importedClientStyle),
          dictionaryEntryId: exactMatch?.id ?? '',
          description: exactMatch ? (exactMatch.normalizedLabel || exactMatch.name) : sp.description,
          comments: [],
          resolvedCategoryName: sp.specimenCategoryId ? catNameById.get(sp.specimenCategoryId) : undefined,
          categoryWasAutoCreated: sp.categoryWasAutoCreated,
          needsDictionaryResolution: !exactMatch,
          unmatchedOrderText: exactMatch ? undefined : sp.description,
        };
      }));

      if (unresolvedCount > 0) {
        toast.warning(`${unresolvedCount} specimen(s) didn't exactly match the Specimen Dictionary — resolve on the Specimens tab before submitting.`);
      }

      setSourceOrderId(order.id);
      setImportWarnings(warnings);
      if (warnings.length > 0) {
        toast.warning(`Imported order ${order.externalOrderNumber} — ${warnings.length} item(s) need admin follow-up (see banner).`);
      } else if (unresolvedCount === 0) {
        toast.success(`Imported order ${order.externalOrderNumber} — client and specimens resolved cleanly.`);
      }
    } catch (e) {
      toast.error(`Import failed: ${(e as Error)?.message ?? 'unknown error'}`);
    } finally {
      setImporting(false);
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const caseInfoValid = givenNames.trim() && familyNames.trim() && dob && clientId && requestingProvider.trim();
  const specimensValid = specimens.length > 0
    && specimens.every(s => s.description.trim().length > 0 && !s.needsDictionaryResolution);
  const canSubmit = !!caseInfoValid && specimensValid && !submitting;

  const selectedClient = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  // Patient ID field label/format follows the selected client's
  // jurisdiction — NHS Number for a Fenwick case, CHI Number for
  // Ardgowan, MRN for a US client — rather than a fixed generic label.
  // Defaults to US/MRN when no client is selected yet (safe default,
  // matches the rest of the form before a client is picked).
  const patientIdStandard = PATIENT_ID_BY_JURISDICTION[selectedClient?.jurisdiction ?? 'US'];

  // ── ID generation ────────────────────────────────────────────────────────
  // TEMPORARY scheme — Stage 0 Requirements §4.2 (S0-CF-07/08/09/10) calls
  // for a configurable per-institution mask plus a Case Registry; neither
  // exists yet, so this mirrors the existing O26-NNNN convention by finding
  // the current max and incrementing. Replace this function (not its
  // callers) once S0-CF-07 lands — the rest of this page doesn't care how
  // the id is produced.
  async function generateNextCaseId(): Promise<string> {
    // bypassAccessControl: true — this needs to see every existing O26-
    // number across ALL organisations to avoid two different orgs'
    // accessioners independently generating the same id (each org would
    // otherwise only see its own numbering sequence after the access-
    // control fix, since CASES is one shared store). This is a system-
    // level uniqueness check, not data being displayed to the user — see
    // CaseRouter.getAll()'s own doc comment on this flag.
    const res = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
    const existingNums = (res.ok ? res.data : [])
      .map(c => c.id)
      .filter(id => id.startsWith('O26-'))
      .map(id => parseInt(id.slice(4), 10))
      .filter(n => !isNaN(n));
    const next = (existingNums.length ? Math.max(...existingNums) : 0) + 1;
    return `O26-${String(next).padStart(4, '0')}`;
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const [lastResult, setLastResult] = useState<{ assignments: GrossingTemplateAssignment[]; warnings: string[]; specimenBlocks: { specimenId: string; label: string; blocks: HistologyBlock[] }[] } | null>(null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setLastResult(null);

    try {
      const caseId = await generateNextCaseId();
      const nowIso = new Date().toISOString();

      const specimenRecords = specimens.map(s => {
        const entry = s.dictionaryEntryId ? dictionary.find(e => e.id === s.dictionaryEntryId) : undefined;
        return {
          id: `${caseId}-SP-${s.label}`,
          label: s.label,
          description: s.description.trim(),
          comments: s.comments.length ? s.comments : undefined,
          specimenDictionaryEntryId: s.dictionaryEntryId || undefined,
          // receivedAt defaults to "now" if the accessioner didn't touch
          // the field; collectedAt/processedAt stay genuinely blank when
          // not entered, rather than defaulting to "now" — see the
          // design discussion this was built from (guessing a collection
          // or fixation time would be actively wrong, not just imprecise).
          receivedAt: s.receivedAt ? new Date(s.receivedAt).toISOString() : nowIso,
          collectedAt: s.collectedAt ? new Date(s.collectedAt).toISOString() : undefined,
          collection: s.collectedAt || s.anatomicSite || s.laterality ? {
            collectedAt: s.collectedAt ? new Date(s.collectedAt).toISOString() : undefined,
            bodySite: s.anatomicSite.trim() || undefined,
            laterality: s.laterality || undefined,
          } : undefined,
          processing: s.processedAt ? {
            processedAt: new Date(s.processedAt).toISOString(),
            processedAtIsEstimated: s.processedAtIsEstimated || undefined,
          } : undefined,
          container: s.containerType.trim() ? { type: s.containerType.trim() } : undefined,
          specimenFlags: [],
          blocks: generateDefaultBlocks(entry, `${caseId}-SP-${s.label}`, selectedClient?.specimenLabelStyle, stainTypes, protocols),
          // kept alongside the record (not part of Specimen's own shape)
          // purely to feed evaluateGrossingTemplateAssignment below —
          // stripped before the record is cast into the Case
          _entry: entry,
        };
      });

      // ── Resolve candidate Grossing Templates (S0-IN-06): published,
      // isDiagnostic === false — the inverse of Stage 1's filter. Dynamic
      // import mirrors handleGrossComplete's own pattern in
      // SynopticReportPage.tsx.
      const templateModule = await import('@/services/templates/templateService');
      const allTemplates = await templateModule.listTemplates('published');
      const availableTemplates = (allTemplates as any[])
        .filter(t => t.isDiagnostic === false)
        .map(t => ({ id: t.id, name: t.name, category: t.category }));

      const evalResult = await evaluateGrossingTemplateAssignment({
        specimens: specimenRecords.map(sp => ({
          specimenId: sp.id,
          specimenLabel: sp.label,
          specimenDesc: sp.description,
          // Structured fields from the Specimen Dictionary, when a
          // specimen was picked from it — S0-CF-01–03's "structured
          // specimen data" flowing into routing for the first time.
          specimenType: sp._entry?.type,
          bodySite: sp._entry?.site,
          laterality: sp._entry?.laterality,
        })),
        clinicalIndication: clinicalIndication.trim() || undefined,
        caseContext: { clientId },
        availableTemplates,
        routingOverrides: [], // S0-CF-12 admin UI not built yet — always empty for now
      });

      setLastResult({
        assignments: evalResult.assignments,
        warnings: evalResult.warnings,
        specimenBlocks: specimenRecords.map(sp => ({ specimenId: sp.id, label: sp.label, blocks: sp.blocks })),
      });

      const assignmentBySpecimenId = new Map(evalResult.assignments.map(a => [a.specimenId, a]));

      const grossingReports: GrossingReportInstance[] = specimenRecords.map(sp => {
        const assignment = assignmentBySpecimenId.get(sp.id);
        return {
          instanceId: `${sp.id}_grossing_${Math.random().toString(36).slice(2, 10)}`,
          specimenId: sp.id,
          templateId: assignment?.templateId ?? 'grossing_standard_tissue',
          templateName: assignment?.templateName ?? 'Standard Tissue Grossing (Gold Standard) — Route A',
          status: 'draft',
          answers: {},
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      });

      const newCase: Case = {
        id: caseId,
        reportingMode: 'orchestrator',
        accession: { accessionNumber: caseId.replace('O26-', 'O'), accessionPrefix: 'O', accessionYear: new Date().getFullYear(), fullAccession: caseId },
        originHospitalId,
        status: 'accessioned' as any,
        patient: {
          id: `OPAT-${caseId.slice(4)}`,
          mrn: mrn.trim() || `AUTO-${caseId.slice(4)}`,
          namePrefix: namePrefix.trim() || undefined,
          givenNames: givenNames.trim(),
          familyNames: familyNames.trim(),
          preferredName: preferredName.trim() || undefined,
          nameSuffix: nameSuffix.trim() || undefined,
          // Backward-compat mirrors — Worklist/report rendering/etc.
          // still read these directly; see Patient.ts's own doc comments.
          firstName: givenNames.trim(),
          lastName: familyNames.trim(),
          dateOfBirth: new Date(dob).toISOString(),
          sex,
        } as any,
        specimens: specimenRecords.map(({ _entry, ...sp }) => sp) as any,
        order: {
          priority,
          requestingProvider: requestingProvider.trim(),
          clientId,
          clientName: selectedClient?.name,
          clinicalIndication: clinicalIndication.trim() || undefined,
          icd10Codes: icd10Codes.length ? icd10Codes : undefined,
          caseComments: caseComments.length ? caseComments : undefined,
          receivedDate: nowIso,
          assignedTo: assignedTo || undefined,
          assignedParticipationTypeId: assignedTo ? 'primary' : undefined,
        },
        diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
        grossingReports,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await caseRouter.createCase(newCase);

      // Write a permanent record for any specimen that had a
      // requisition-deficiency detected (and resolved) during this
      // session — same reasoning as the type's own doc comment: even
      // though resolution happened live, in one sitting, the record
      // itself is what lets data-quality issues (e.g. one client's order
      // feed consistently failing to match the dictionary) be tracked
      // over time rather than disappearing the moment they're resolved.
      await Promise.all(specimens.map((s, i) => {
        if (!s.unmatchedOrderText) return Promise.resolve();
        return specimenDeficiencyService.raiseAndResolve(
          {
            caseId,
            specimenId: specimenRecords[i].id,
            specimenLabel: s.label,
            deficiencyTypeId: 'def-no-dict-match',
            comment: `Order text: "${s.unmatchedOrderText}"`,
            raisedBy: 'system',
          },
          {
            resolutionTypeId: s.resolutionTypeId ?? 'res-resolved-accessioner',
            resolutionComment: s.comments?.length ? s.comments[s.comments.length - 1].text : undefined,
            resolvedBy: user?.id ?? 'unknown',
          }
        );
      }));

      // Manually-reported deficiencies (Deficiency (optional) button per
      // specimen row) — genuinely open records, unlike the auto-detected
      // one above. An accessioner flagging "container damaged" doesn't
      // necessarily have the resolution in hand on the spot, so this
      // uses raise() alone, not raiseAndResolve(). Tracked to resolution
      // from the dedicated Deficiencies work queue, independent of this
      // case's own lifecycle.
      await Promise.all(specimens.map((s, i) => {
        if (!s.manualDeficiency) return Promise.resolve();
        return specimenDeficiencyService.raise({
          caseId,
          specimenId: specimenRecords[i].id,
          specimenLabel: s.label,
          deficiencyTypeId: s.manualDeficiency.deficiencyTypeId,
          comment: s.manualDeficiency.comment || undefined,
          raisedBy: user?.id ?? 'unknown',
        });
      }));

      // Case-level manual deficiency — genuinely no specimenId/
      // specimenLabel, unlike every other raise() call in this file.
      // Not every real issue is tied to one specimen; forcing a
      // specimen choice for something like a missing requisition
      // (which covers the whole order, not one particular specimen)
      // was always a small fiction — see specimenId's own doc comment
      // on the SpecimenDeficiency type for the full reasoning.
      if (caseManualDeficiency) {
        await specimenDeficiencyService.raise({
          caseId,
          deficiencyTypeId: caseManualDeficiency.deficiencyTypeId,
          comment: caseManualDeficiency.comment || undefined,
          raisedBy: user?.id ?? 'unknown',
        });
      }

      if (sourceOrderId) {
        await orderIntakeService.markOrderLinked(sourceOrderId, caseId);
        loadPendingOrders(); // remove it from the pending list now that it's linked
      }

      const lowConfidenceCount = evalResult.assignments.filter(a => a.belowThreshold).length;
      toast.success(
        lowConfidenceCount > 0
          ? `Case ${caseId} accessioned — ${lowConfidenceCount} of ${specimens.length} specimen(s) fell back to the default Grossing Template (see below).`
          : `Case ${caseId} accessioned with ${specimens.length} Grossing Template assignment(s).`
      );

      setTab('specimens');
    } catch (e) {
      console.error('[PathScribe] Accession submit failed:', e);
      toast.error(`Accession failed: ${(e as Error)?.message ?? 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setNamePrefix(''); setGivenNames(''); setFamilyNames(''); setPreferredName(''); setNameSuffix('');
    setDob(''); setSex('F'); setMrn('');
    setPriority('Routine'); setRequestingProvider(''); setClientId(''); setClinicalIndication(''); setIcd10Codes([]); setCaseComments([]); setAssignedTo(''); setCaseManualDeficiency(undefined);
    setSpecimens([emptySpecimen('A')]);
    setLastResult(null);
    setSourceOrderId(null); setOrderSearch(''); setImportWarnings([]);
    loadPendingOrders();
    setTab('case');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ps-accession-shell">
      <div className="ps-accession-content">

        <div className="ps-accession-header">
          <h1 className="ps-accession-title">Accession</h1>
          <p className="ps-accession-subtitle">
            Log a new Orchestration case and assign Grossing Templates per specimen.
          </p>
        </div>

        <div className="ps-tab-bar ps-accession-tabs">
          <button className={`ps-tab-btn ${tab === 'case' ? 'active' : ''}`} onClick={() => setTab('case')}>Case & Patient</button>
          <button className={`ps-tab-btn ${tab === 'specimens' ? 'active' : ''}`} onClick={() => setTab('specimens')}>
            Specimens {specimens.length ? `(${specimens.length})` : ''}
          </button>
        </div>

        {tab === 'case' && (
          <div className="ps-card-dark ps-accession-card">
            {pendingOrders.length > 0 && (
              <div className="ps-accession-import-row">
                <label className="ps-label">Import from Order ({pendingOrders.length} pending)</label>
                <div className="ps-accession-order-picker">
                  <div className="ps-accession-order-picker-search-wrap">
                    <input type="text" placeholder="Search by order #, patient name, MRN, or client code…"
                      value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                      className="ps-accession-order-picker-search" disabled={importing} />
                  </div>
                  <div className="ps-accession-order-picker-list">
                    {orderSearch.trim().length < 2 ? (
                      <div className="ps-accession-order-picker-empty">
                        {orderSearch.trim().length === 1 ? 'Keep typing…' : 'Type at least 2 characters to search pending orders.'}
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="ps-accession-order-picker-empty">No pending orders match.</div>
                    ) : filteredOrders.map(o => (
                      <div key={o.id}
                        className={`ps-accession-order-picker-item ${sourceOrderId === o.id ? 'ps-accession-order-picker-item--selected' : ''} ${importing ? 'ps-accession-order-picker-item--disabled' : ''}`}
                        onClick={() => !importing && handleImportOrder(o.id)}>
                        <div className="ps-accession-order-picker-main">
                          <strong>{o.externalOrderNumber}</strong> — {o.patient.firstName} {o.patient.lastName}
                          {o.patient.mrn && <span> · MRN {o.patient.mrn}</span>}
                        </div>
                        <div className="ps-accession-order-picker-meta">{o.externalClientCode} · {o.source.toUpperCase()} · {o.priority ?? 'Routine'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {importing && <div className="ps-accession-order-picker-status">Importing…</div>}
                {sourceOrderId && importWarnings.length > 0 && (
                  <div className="ps-accession-warnings">
                    {importWarnings.map((w, i) => <div key={i} className="ps-accession-warning-item">{w}</div>)}
                  </div>
                )}
              </div>
            )}
            <div className="ps-accession-grid">
              <div>
                <label className="ps-label">Given Name(s)</label>
                <input data-phi="name" className="ps-input-dark" value={givenNames} onChange={e => setGivenNames(e.target.value)}
                  placeholder='e.g. "John Michael" or "Juan Carlos"' />
              </div>
              <div>
                <label className="ps-label">Family Name(s)</label>
                <input data-phi="name" className="ps-input-dark" value={familyNames} onChange={e => setFamilyNames(e.target.value)}
                  placeholder='e.g. "Smith" or "García López"' />
              </div>
              <div>
                <label className="ps-label">Preferred Name (optional)</label>
                <input data-phi="name" className="ps-input-dark" value={preferredName} onChange={e => setPreferredName(e.target.value)}
                  placeholder="If different from Given Name(s)" />
              </div>
              <div>
                <label className="ps-label">Prefix (optional)</label>
                <select className="ps-input-dark" value={namePrefix} onChange={e => setNamePrefix(e.target.value)}>
                  <option value="">None</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mx.">Mx.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Sir">Sir</option>
                  <option value="Dame">Dame</option>
                </select>
              </div>
              <div>
                <label className="ps-label">Suffix (optional)</label>
                <SuffixSelect value={nameSuffix} onChange={setNameSuffix} selectClassName="ps-input-dark" inputClassName="ps-input-dark" />
              </div>
              <div>
                <label className="ps-label">Date of Birth</label>
                <input className="ps-input-dark" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div>
                <label className="ps-label">Sex</label>
                <select className="ps-input-dark" value={sex} onChange={e => setSex(e.target.value as any)}>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="U">Other / Unspecified</option>
                </select>
              </div>
              <div>
                <label className="ps-label">Patient ID (optional)</label>
                <input className="ps-input-dark" value={mrn} onChange={e => setMrn(e.target.value)}
                  placeholder={selectedClient
                    ? `${patientIdStandard.label} format, e.g. ${patientIdStandard.example} — auto-generated if blank`
                    : 'Select a Submitting Client first, or leave blank to auto-generate'} />
              </div>
              <div>
                <label className="ps-label">Priority</label>
                <select className="ps-input-dark" value={priority} onChange={e => setPriority(e.target.value as CasePriority)}>
                  {priorityLevels.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ps-label">Submitting Client</label>
                <select className="ps-input-dark" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="ps-label">Origin Hospital / Organisation</label>
                <input className="ps-input-dark ps-input-readonly" readOnly disabled
                  value={user?.organisationId ? (getOrganisationDisplayName(originHospitalId) ?? originHospitalId) : 'No organisation on session — contact an admin'} />
              </div>
              <div>
                <label className="ps-label">Requesting Provider</label>
                <input className="ps-input-dark" value={requestingProvider} onChange={e => setRequestingProvider(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
              <div>
                <label className="ps-label">Assign to Pathologist (optional)</label>
                <select className="ps-input-dark" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">Unassigned — leave for triage</option>
                  {pathologists.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="ps-accession-field--full">
                <label className="ps-label">Clinical Indication</label>
                <textarea className="ps-input-dark ps-accession-textarea"
                  value={clinicalIndication} onChange={e => setClinicalIndication(e.target.value)}
                  placeholder="Reason for the specimen — feeds the Grossing Template assignment AI" />
              </div>
              <div className="ps-accession-field--full">
                <label className="ps-label">ICD-10 Diagnosis Code(s)</label>
                <Icd10Picker allCodes={allIcd10Codes} selected={icd10Codes} onChange={setIcd10Codes} />
              </div>
              <div className="ps-accession-field--full">
                <label className="ps-label">Case Comment (optional)</label>
                <button type="button"
                  className={`ps-accession-specimen-trigger${caseComments.length === 0 ? ' ps-accession-specimen-trigger--placeholder' : ''}`}
                  onClick={() => setCaseCommentModalOpen(true)}>
                  {caseComments.length === 0
                    ? 'General note about the whole case — e.g. "STAT per phone call with Dr. Smith." Not used by the routing AI — see Clinical Indication above for that.'
                    : `✓ ${caseComments.length} comment${caseComments.length === 1 ? '' : 's'} — click to view / add`}
                </button>
              </div>
              <div className="ps-accession-field--full">
                <label className="ps-label">Case-Level Deficiency (optional)</label>
                <button type="button"
                  className={`ps-accession-specimen-trigger${!caseManualDeficiency ? ' ps-accession-specimen-trigger--placeholder' : ' ps-accession-specimen-trigger--deficiency'}`}
                  onClick={() => setCaseDeficiencyModalOpen(true)}>
                  {!caseManualDeficiency
                    ? '⚠ Flag something wrong with the whole case, not a specific specimen — e.g. missing requisition paperwork'
                    : `⚠ ${deficiencyTypes.find(t => t.id === caseManualDeficiency.deficiencyTypeId)?.name ?? 'Deficiency reported'} — click to edit`}
                </button>
              </div>
            </div>
            <div className="ps-accession-actions">
              <button className="ps-btn-primary" onClick={() => setTab('specimens')} disabled={!caseInfoValid}>
                Next: Specimens →
              </button>
            </div>
          </div>
        )}

        {tab === 'specimens' && (
          <div>
            {lastResult ? null : <>
            {specimens.map((s, idx) => {
              const selectedEntry = s.dictionaryEntryId ? dictionary.find(e => e.id === s.dictionaryEntryId) : undefined;
              return (
                <div key={idx} className={`ps-card-dark ps-accession-specimen-row ${s.needsDictionaryResolution ? 'ps-accession-specimen-row--deficient' : ''}`}>
                  <div className="ps-accession-specimen-badge">{s.label}</div>
                  <div className="ps-accession-specimen-field ps-accession-specimen-field--stacked">

                    {s.needsDictionaryResolution && (
                      <div className="ps-accession-deficiency-banner">
                        <strong>Specimen requisition deficiency — could not match to dictionary.</strong>
                        <div>Order text: "{s.unmatchedOrderText}" didn't exactly match any Specimen Dictionary entry.
                          Select the correct entry below, or confirm no match exists.</div>
                        <button className="ps-btn-secondary ps-accession-deficiency-confirm" onClick={() => confirmCustomSpecimen(idx)}>
                          Confirm — no dictionary match, proceed as custom
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="ps-label">Specimen {s.label} — Dictionary Entry</label>
                      <button
                        type="button"
                        className={`ps-accession-specimen-trigger${!selectedEntry ? ' ps-accession-specimen-trigger--placeholder' : ''}`}
                        onClick={() => setPickerOpenForIdx(idx)}
                      >
                        {selectedEntry ? selectedEntry.name : '— Select from Specimen Dictionary, or leave as Custom —'}
                      </button>
                    </div>

                    <div className="ps-accession-specimen-field--wide">
                      <label className="ps-label">Description</label>
                      <input className="ps-input-dark" value={s.description}
                        onChange={e => updateSpecimen(idx, e.target.value)}
                        placeholder='e.g. "Right breast core needle biopsy" or "Pleural fluid, thoracentesis"' />
                    </div>

                    <div className="ps-accession-specimen-field--wide">
                      <label className="ps-label">Comment (optional)</label>
                      <button type="button"
                        className={`ps-accession-specimen-trigger${s.comments.length === 0 ? ' ps-accession-specimen-trigger--placeholder' : ''}`}
                        onClick={() => setSpecimenCommentOpenForIdx(idx)}>
                        {s.comments.length === 0
                          ? 'e.g. received in two fragments, labeling confirmed by phone with OR'
                          : `✓ ${s.comments.length} comment${s.comments.length === 1 ? '' : 's'} — click to view / add`}
                      </button>
                    </div>

                    <div className="ps-accession-specimen-field--wide">
                      <label className="ps-label">Deficiency (optional)</label>
                      <button type="button"
                        className={`ps-accession-specimen-trigger${!s.manualDeficiency ? ' ps-accession-specimen-trigger--placeholder' : ' ps-accession-specimen-trigger--deficiency'}`}
                        onClick={() => setDeficiencyModalOpenForIdx(idx)}>
                        {!s.manualDeficiency
                          ? '⚠ Flag a problem with this specimen — container damage, insufficient volume, etc.'
                          : `⚠ ${deficiencyTypes.find(t => t.id === s.manualDeficiency!.deficiencyTypeId)?.name ?? 'Deficiency reported'} — click to edit`}
                      </button>
                    </div>

                    <div className="ps-accession-specimen-row-3col">
                      <div>
                        <label className="ps-label">Anatomic Site</label>
                        <input className="ps-input-dark" value={s.anatomicSite}
                          onChange={e => updateSpecimenField(idx, 'anatomicSite', e.target.value)}
                          placeholder="e.g. Breast" />
                      </div>
                      <div>
                        <label className="ps-label">Laterality</label>
                        <select className="ps-input-dark" value={s.laterality}
                          onChange={e => updateSpecimenField(idx, 'laterality', e.target.value)}>
                          <option value="">— not specified —</option>
                          <option value="Left">Left</option>
                          <option value="Right">Right</option>
                          <option value="Bilateral">Bilateral</option>
                          <option value="Midline">Midline</option>
                          <option value="N/A">Not applicable</option>
                        </select>
                      </div>
                      <div>
                        <label className="ps-label">Container Type</label>
                        <input className="ps-input-dark" value={s.containerType}
                          onChange={e => updateSpecimenField(idx, 'containerType', e.target.value)}
                          placeholder="e.g. Jar, Cassette" />
                      </div>
                    </div>

                    <div className="ps-accession-specimen-row-3col">
                      <div>
                        <label className="ps-label">Date/Time Collected</label>
                        <input className="ps-input-dark" type="datetime-local" value={s.collectedAt}
                          onChange={e => updateSpecimenField(idx, 'collectedAt', e.target.value)} />
                        <div className="ps-accession-field-hint">Blank if unknown — starts the cold-ischemia clock.</div>
                      </div>
                      <div>
                        <label className="ps-label">Date/Time Placed in Fixative</label>
                        <input className="ps-input-dark" type="datetime-local" value={s.processedAt}
                          onChange={e => updateSpecimenField(idx, 'processedAt', e.target.value)} />
                        <label className="ps-accession-checkbox-row">
                          <input type="checkbox" checked={s.processedAtIsEstimated}
                            onChange={e => updateSpecimenField(idx, 'processedAtIsEstimated', e.target.checked)} />
                          Estimated — not directly documented
                        </label>
                      </div>
                      <div>
                        <label className="ps-label">Date/Time Received</label>
                        <input className="ps-input-dark" type="datetime-local" value={s.receivedAt}
                          onChange={e => updateSpecimenField(idx, 'receivedAt', e.target.value)} />
                      </div>
                    </div>

                    {s.resolvedCategoryName && (
                      <div className={`ps-accession-assignment-meta ${s.categoryWasAutoCreated ? 'ps-accession-assignment-meta--warn' : ''}`}>
                        Category: {s.resolvedCategoryName}{s.categoryWasAutoCreated ? ' (new — pending admin review)' : ''}
                      </div>
                    )}
                  </div>
                  {specimens.length > 1 && (
                    <button className="ps-btn-icon ps-accession-remove-btn" onClick={() => removeSpecimen(idx)} title="Remove specimen">✕</button>
                  )}
                </div>
              );
            })}
            <button className="ps-btn-secondary ps-accession-add-btn" onClick={addSpecimen}>+ Add Specimen</button>

            {pickerOpenForIdx !== null && (
              <SpecimenDictionaryPicker
                dictionary={dictionary}
                currentEntryId={specimens[pickerOpenForIdx]?.dictionaryEntryId || undefined}
                onSelect={entry => {
                  applyDictionaryEntry(pickerOpenForIdx, entry?.id ?? '');
                }}
                onClose={() => setPickerOpenForIdx(null)}
              />
            )}

            {specimenCommentOpenForIdx !== null && (
              <ReportCommentModal
                specimenName={`Specimen ${specimens[specimenCommentOpenForIdx].label} \u203a ${specimens[specimenCommentOpenForIdx].description || '(no description yet)'}`}
                specimenId={specimens[specimenCommentOpenForIdx].label}
                comments={specimens[specimenCommentOpenForIdx].comments}
                isFinalized={false}
                currentUserId={user?.id ?? 'unknown'}
                currentUserName={user?.name ?? 'Unknown User'}
                onAddComment={text => addSpecimenComment(specimenCommentOpenForIdx, text)}
                onClose={() => setSpecimenCommentOpenForIdx(null)}
              />
            )}

            {deficiencyModalOpenForIdx !== null && (
              <ReportDeficiencyModal
                specimenLabel={specimens[deficiencyModalOpenForIdx].label}
                deficiencyTypes={deficiencyTypes}
                existing={specimens[deficiencyModalOpenForIdx].manualDeficiency}
                onSave={(deficiencyTypeId, comment) => {
                  setSpecimens(prev => prev.map((s, i) =>
                    i === deficiencyModalOpenForIdx ? { ...s, manualDeficiency: { deficiencyTypeId, comment } } : s
                  ));
                  setDeficiencyModalOpenForIdx(null);
                }}
                onRemove={() => {
                  setSpecimens(prev => prev.map((s, i) =>
                    i === deficiencyModalOpenForIdx ? { ...s, manualDeficiency: undefined } : s
                  ));
                  setDeficiencyModalOpenForIdx(null);
                }}
                onClose={() => setDeficiencyModalOpenForIdx(null)}
              />
            )}

            {caseDeficiencyModalOpen && (
              <ReportDeficiencyModal
                deficiencyTypes={deficiencyTypes}
                existing={caseManualDeficiency}
                onSave={(deficiencyTypeId, comment) => {
                  setCaseManualDeficiency({ deficiencyTypeId, comment });
                  setCaseDeficiencyModalOpen(false);
                }}
                onRemove={() => {
                  setCaseManualDeficiency(undefined);
                  setCaseDeficiencyModalOpen(false);
                }}
                onClose={() => setCaseDeficiencyModalOpen(false)}
              />
            )}

            <div className="ps-card-dark ps-accession-card">
              <h3>Ready to accession</h3>
              <p className="ps-accession-summary-meta" data-phi="name">
                {formatFullDisplayName({ namePrefix, givenNames, familyNames, preferredName, nameSuffix })}
                {preferredName.trim() && ` (${preferredName.trim()})`}
                {' '}· {specimens.length} specimen(s) · {priority}
                {selectedClient ? ` · ${selectedClient.name}` : ''}
              </p>
            </div>

            <div className="ps-accession-actions ps-accession-actions--split">
              <button className="ps-btn-secondary" onClick={() => setTab('case')}>← Back</button>
              <button className="ps-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? 'Assigning Grossing Templates…' : 'Submit Accession'}
              </button>
            </div>
            </>}

            {lastResult && (
              <div className="ps-card-dark ps-accession-card">
                <h3>Grossing Templates assigned</h3>
                {lastResult.assignments.map(a => (
                  <div key={a.specimenId} className="ps-form-row ps-accession-assignment-row">
                    <div className="ps-accession-assignment-head">
                      <strong className="ps-accession-assignment-name">{a.specimenId.split('-SP-')[1] ?? a.specimenId}</strong>
                      <span className={`ps-accession-assignment-meta ${a.belowThreshold ? 'ps-accession-assignment-meta--warn' : ''}`}>
                        {a.templateName} {a.fromOverride ? '(override)' : `· ${a.confidence}% confidence`}
                      </span>
                    </div>
                    <div className="ps-accession-assignment-reason">{a.reason}</div>
                  </div>
                ))}
                {lastResult.warnings.length > 0 && (
                  <div className="ps-accession-warnings">
                    {lastResult.warnings.map((w, i) => (
                      <div key={i} className="ps-accession-warning-item">{w}</div>
                    ))}
                  </div>
                )}

                <h3 className="ps-accession-blocks-heading">Blocks &amp; Stains</h3>
                {lastResult.specimenBlocks.map(sb => (
                  <div key={sb.specimenId} className="ps-accession-blocks-specimen">
                    <strong className="ps-accession-assignment-name">Specimen {sb.label}</strong>
                    {sb.blocks.map(block => (
                      <div key={block.id} className="ps-accession-block-row">
                        <span className="ps-accession-block-label">
                          Block {block.label}{block.sourcePathwayName ? ` (${block.sourcePathwayName})` : ''}
                        </span>
                        <span className="ps-accession-block-status">{block.status}</span>
                        <span className="ps-accession-block-stains">
                          {block.stains.length ? block.stains.map(st => st.stainName).join(', ') : '(no stains ordered yet)'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="ps-accession-actions ps-accession-actions--split">
                  <button className="ps-btn-secondary" onClick={resetForm}>Accession Another Case</button>
                  <button className="ps-btn-primary" onClick={() => navigate('/worklist')}>Go to Worklist →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {caseCommentModalOpen && (
        <CaseCommentModal
          accession="(new case — not yet accessioned)"
          comments={caseComments}
          currentUserId={user?.id ?? 'unknown'}
          currentUserName={user?.name ?? 'Unknown User'}
          onAddComment={addCaseComment}
          onClose={() => setCaseCommentModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AccessionPage;
