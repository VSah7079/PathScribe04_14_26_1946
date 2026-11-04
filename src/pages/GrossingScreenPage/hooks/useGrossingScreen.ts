// src/pages/GrossingScreenPage/hooks/useGrossingScreen.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the Protocol-Driven Workflow Infrastructure story's Part
// 3 Grossing Screen. Same real optimistic-update + concurrency-
// conflict-retry shape as useSpecimenBlockManagement.ts's own write
// handlers — wraps utils/grossingScreenOperations.ts's pure functions
// with the actual real persistence.
// ─────────────────────────────────────────────────────────────────────────────

import { setBlockPieceMap } from '@/utils/blockPieceRules';
import type { BlockPiece, BlockType } from '@/types/case/blockPieces';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { caseRouter } from '@/services/cases/CaseRouter';
import { specimenDeficiencyService, fieldRequirementService, authorizationService, auditService, inkColorService, facilityService } from '@/services';
import { caseLabelStyle } from '@/services/labeling/liveCaseLabelStyle';
import { resolveFieldRequirements, type ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import {
  completeGrossing, missingGrossingItems, specimensForSecondaryReview, type CompleteGrossingRefusal,
} from '@/services/grossing/grossingCompletion';
import {
  recordMarginInkApplication, type RecordMarginInkApplicationInput, type RecordMarginInkApplicationResult,
} from '@/services/grossing/recordMarginInkApplication';
import { routeCaseAfterGrossing } from '@/services/grossing/routeCaseAfterGrossing';
import { resolveInkingValidationSeverity, type InkingValidationResult } from '@/services/grossing/resolveInkingValidationSeverity';
import { getInkingValidationMode } from '@/services/grossing/inkingSiteSettings';
import { evaluateInkingGate, gateSpecimensOf, type InkingGateResult } from '@/services/grossing/evaluateInkingGate';
import type { InkColor } from '@/services/inkColors/IInkColorService';
import type { Jurisdiction } from '@/types/systemConfig';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import type { ProtocolPathway } from '@/services/protocols/IProtocolService';
import type { StainType } from '@/services/stains/IStainService';
import {
  addGrossingBlock, removeGrossingBlock, addGrossingStain, removeGrossingStain, updateGrossingPieceCount, updateGrossingPieceDescription, updateMatrixBlockPieces,
} from '@/utils/grossingScreenOperations';
import type { SigningUser, SetConcurrencyConflict } from '@/pages/SynopticReportPage/hooks/sharedHookTypes';
import { handleConcurrencyConflict } from '@/pages/SynopticReportPage/hooks/sharedHookTypes';

interface UseGrossingScreenParams {
  caseData: Case | null;
  setCaseData: (updater: Case | ((prev: Case | null) => Case | null)) => void;
  signingUser: SigningUser;
  knownVersionRef: React.MutableRefObject<number>;
  setConcurrencyConflict: SetConcurrencyConflict;
}

export function useGrossingScreen({ caseData, setCaseData, signingUser, knownVersionRef, setConcurrencyConflict }: UseGrossingScreenParams) {
  const [pendingStainRemoval, setPendingStainRemoval] = useState<{ specimenId: string; blockId: string; stainId: string; origin: 'protocol' | 'existing' } | null>(null);
  // Real, per direct request — tracks which specimens already have a
  // real, OPEN def-missing-fixation-completion deficiency, so the
  // "Raise Deficiency" action can show its own real, recorded state
  // instead of silently doing something with no visible feedback,
  // same real convention as the fixation fields themselves above.
  // Multiple deficiencies per specimen are genuinely allowed (see
  // services/deficiencies/README.md's own real fix on this) — this
  // only reflects whether at least one open one already exists, it
  // never blocks raising another.
  const [specimensWithOpenFixationDeficiency, setSpecimensWithOpenFixationDeficiency] = useState<Set<string>>(new Set());

  // Structured Inking, Module 3 (PS-359 follow-up): the severity engine's
  // WARN_ONLY/STRICT_ENFORCE advisory display, unblocked this batch by
  // re-scoping inking_validation_mode from Site to the real, current
  // Case.order.facilityId (see inkingSiteSettings.ts's own header for why),
  // plus the active ink-colour palette for the additive Severity 3
  // margin_ink_color_unmapped check. Display only — this does not change
  // what blocks Complete grossing (services/grossing/grossingCompletion.ts);
  // that's a further, separate wiring step, not attempted this batch.
  const [inkColors, setInkColors] = useState<InkColor[]>([]);
  // Batch 484 (Gate Logic Engine): a palette read that genuinely fails
  // (service unreachable/errored) is fail-closed by evaluateInkingGate
  // below — distinct from the initial empty-array render before the
  // first successful load, which inkColorsLoaded tracks.
  const [inkColorsLoaded, setInkColorsLoaded] = useState(false);
  const [inkPaletteAvailable, setInkPaletteAvailable] = useState(true);
  useEffect(() => {
    void inkColorService.getAll()
      .then(res => { if (res.ok) { setInkColors(res.data); setInkPaletteAvailable(true); } else { setInkPaletteAvailable(false); } setInkColorsLoaded(true); })
      .catch(() => { setInkPaletteAvailable(false); setInkColorsLoaded(true); });
  }, []);
  const activeInkColorCodes = useMemo(
    () => new Set(inkColors.filter(c => c.active).map(c => c.code.trim().toUpperCase())),
    [inkColors],
  );
  const inkingValidationMode = caseData ? getInkingValidationMode(caseData.order?.facilityId ?? '') : 'WARN_ONLY';
  const inkingValidation: InkingValidationResult = useMemo(
    () => resolveInkingValidationSeverity(caseData?.specimens ?? [], inkingValidationMode, { activeInkColorCodes }),
    [caseData?.specimens, inkingValidationMode, activeInkColorCodes],
  );

  // Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
  // PS-519 follow-up). Gate A — the real decision this app was still
  // missing per the comment above (Batch 481's own "display only — this
  // does not change what blocks Complete grossing... a further, separate
  // wiring step, not attempted this batch"). This is that wiring step.
  const [facilityJurisdiction, setFacilityJurisdiction] = useState<Jurisdiction | undefined>(undefined);
  useEffect(() => {
    const facilityId = caseData?.order?.facilityId;
    if (!facilityId) { setFacilityJurisdiction(undefined); return; }
    void facilityService.getById(facilityId).then(res => { if (res.ok) setFacilityJurisdiction(res.data.jurisdiction); });
  }, [caseData?.order?.facilityId]);
  const inkingGate: InkingGateResult = useMemo(() => evaluateInkingGate({
    caseId: caseData?.id ?? '', facilityId: caseData?.order?.facilityId ?? '', actionContext: 'GROSSING_COMPLETE',
    specimens: gateSpecimensOf(caseData ?? {}), mode: inkingValidationMode, jurisdiction: facilityJurisdiction,
    activeInkColorCodes: inkColorsLoaded ? activeInkColorCodes : undefined, paletteAvailable: inkPaletteAvailable,
  }), [caseData, inkingValidationMode, facilityJurisdiction, activeInkColorCodes, inkColorsLoaded, inkPaletteAvailable]);
  const [showInkingGateBlock, setShowInkingGateBlock] = useState(false);
  const [showInkingAdvisoryConfirm, setShowInkingAdvisoryConfirm] = useState(false);

  useEffect(() => {
    if (!caseData?.id) return;
    specimenDeficiencyService.getByCaseId(caseData.id).then(res => {
      if (!res.ok) return;
      const open = res.data.filter(d => d.deficiencyTypeId === 'def-missing-fixation-completion' && d.status !== 'closed');
      setSpecimensWithOpenFixationDeficiency(new Set(open.map(d => d.specimenId).filter((id): id is string => !!id)));
    });
  }, [caseData?.id]);

  const persistSpecimen = useCallback(async (updatedSpecimen: Specimen) => {
    if (!caseData?.id) return;
    const updatedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) => sp.id === updatedSpecimen.id ? updatedSpecimen : sp);
    setCaseData(prev => prev ? ({ ...prev, specimens: updatedSpecimens } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[GrossingScreen] Failed to persist specimen change:', e);
    }
  }, [caseData, setCaseData, knownVersionRef, setConcurrencyConflict]);

  const handleAddBlock = useCallback(async (specimenId: string, pathway: ProtocolPathway) => {
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    // Batch 715: the new block is labelled in the case's letters/numbers style.
    const result = addGrossingBlock(specimen, pathway, caseData.accession?.fullAccession ?? caseData.id, await caseLabelStyle(caseData));
    if (result.ok) await persistSpecimen(result.specimen);
  }, [caseData, persistSpecimen]);

  // Batch 513 (PS-269): a refusal is a reason code, not English text; the
  // screen words it. `detail` is the operation's own diagnostic, never shown.
  const handleRemoveBlock = useCallback(async (specimenId: string, blockId: string): Promise<{ ok: true } | { ok: false; reasonCode: 'caseNotLoaded' | 'specimenNotFound' | 'notRemovable'; detail?: string }> => {
    if (!caseData) return { ok: false, reasonCode: 'caseNotLoaded' };
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return { ok: false, reasonCode: 'specimenNotFound' };
    const result = removeGrossingBlock(specimen, blockId);
    if (!result.ok) return { ok: false, reasonCode: 'notRemovable', detail: 'error' in result ? result.error : undefined };
    await persistSpecimen(result.specimen);
    return { ok: true };
  }, [caseData, persistSpecimen]);

  const handleAddStain = useCallback(async (specimenId: string, blockId: string, stainType: StainType) => {
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    const result = addGrossingStain(specimen, blockId, stainType, signingUser?.id ?? 'unknown', caseData.accession?.fullAccession ?? caseData.id);
    if (result.ok) await persistSpecimen(result.specimen);
  }, [caseData, signingUser, persistSpecimen]);

  // Real, per the spec's own "confirmation prompt if removing a
  // protocol default." First call (confirmed omitted/false) against a
  // real protocol-default stain returns needsConfirmation instead of
  // removing anything — the caller (the page) shows a real confirm
  // dialog and calls confirmPendingStainRemoval() only if the tech
  // actually confirms. A user-added stain never needs this round trip
  // at all — see grossingScreenOperations.ts's own doc comment.
  const handleRemoveStain = useCallback(async (specimenId: string, blockId: string, stainId: string): Promise<{ ok: true } | { needsConfirmation: true }> => {
    if (!caseData) return { ok: true };
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return { ok: true };
    const result = removeGrossingStain(specimen, blockId, stainId, signingUser?.id ?? 'unknown', false);
    if (!result.ok && 'needsConfirmation' in result) {
      setPendingStainRemoval({ specimenId, blockId, stainId, origin: result.origin });
      return { needsConfirmation: true };
    }
    if (result.ok) await persistSpecimen(result.specimen);
    return { ok: true };
  }, [caseData, signingUser, persistSpecimen]);

  const confirmPendingStainRemoval = useCallback(async () => {
    if (!caseData || !pendingStainRemoval) return;
    const { specimenId, blockId, stainId } = pendingStainRemoval;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    setPendingStainRemoval(null);
    if (!specimen) return;
    const result = removeGrossingStain(specimen, blockId, stainId, signingUser?.id ?? 'unknown', true);
    if (result.ok) await persistSpecimen(result.specimen);
  }, [caseData, pendingStainRemoval, signingUser, persistSpecimen]);

  const cancelPendingStainRemoval = useCallback(() => setPendingStainRemoval(null), []);

  const handleUpdatePieceCount = useCallback(async (specimenId: string, blockId: string, newCount: number) => {
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    const result = updateGrossingPieceCount(specimen, blockId, newCount, signingUser?.id ?? 'unknown');
    if (result.ok) await persistSpecimen(result.specimen);
  }, [caseData, signingUser, persistSpecimen]);

  // Batch 659 (finding 8): the piece description of a block, and the pieces of a matrix block.
  const handleUpdatePieceDescription = useCallback(async (specimenId: string, blockId: string, text: string) => {
    const specimen = (caseData?.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    const result = updateGrossingPieceDescription(specimen, blockId, text, signingUser?.id ?? 'unknown');
    if (result.ok) await persistSpecimen(result.specimen);
  }, [caseData, signingUser, persistSpecimen]);

  /** Batch 732 (spec §11.1, §11.2): the block's type and piece map (utils/blockPieceRules.ts). False when not valid. */
  const handleSetBlockPieceMap = useCallback(async (specimenId: string, blockId: string, blockType: Exclude<BlockType, 'matrix'>, pieces: BlockPiece[]): Promise<boolean> => {
    const specimen = (caseData?.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return false;
    const result = setBlockPieceMap(specimen, blockId, blockType, pieces);
    if (!result.ok) return false;
    await persistSpecimen(result.specimen);
    return true;
  }, [caseData, persistSpecimen]);

  const handleUpdateMatrixBlock = useCallback(async (matrixBlockId: string, patch: { pieceCount?: number; pieceDescription?: string }) => {
    if (!caseData?.id) return;
    const next = updateMatrixBlockPieces(caseData.matrixBlocks ?? [], matrixBlockId, patch);
    if (!next) return;
    setCaseData(prev => prev ? ({ ...prev, matrixBlocks: next } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { matrixBlocks: next }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[GrossingScreen] Failed to persist matrix block change:', e);
    }
  }, [caseData, setCaseData, knownVersionRef, setConcurrencyConflict]);

  // Real, per direct request (ISO 15189 traceability — "duration of
  // fixation... from specimen collection to grossing") — grossing is
  // the real, natural moment tissue actually leaves the fixative, so
  // this is where fixationEndedAt gets recorded. Record only, per
  // direct decision — no gating on this yet.
  const handleRecordFixationEnded = useCallback(async (specimenId: string) => {
    if (!caseData) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    await persistSpecimen({
      ...specimen,
      processing: { ...specimen.processing, fixationEndedAt: new Date().toISOString() },
    });
  }, [caseData, persistSpecimen]);

  // Real, per direct guidance's own follow-up ("timestamp and user ID
  // associated with the... check to satisfy laboratory accreditation
  // traceability requirements") — a real audit object, not a bare
  // boolean. No real, structured tissue volume/weight field exists to
  // compute an actual ratio against (confirmed directly before this
  // was built), so this records a grossing tech's own direct,
  // qualitative confirmation instead.
  const handleConfirmFixativeRatio = useCallback(async (specimenId: string) => {
    if (!caseData || !signingUser?.id) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    await persistSpecimen({
      ...specimen,
      processing: {
        ...specimen.processing,
        fixativeToTissueRatioConfirmation: {
          userId: signingUser.id, userName: signingUser.name ?? signingUser.id, confirmedAt: new Date().toISOString(),
        },
      },
    });
  }, [caseData, signingUser, persistSpecimen]);

  // Real, per direct decision — a human, not a gate, raises this. No
  // capaTriggerRule/automatic-detection mechanism at all, unlike
  // def-ai-discordance/def-confirmed-high-risk-finding elsewhere in
  // this app; whoever is grossing and notices the gap raises it on
  // the spot. Reuses the real, existing specimenDeficiencyService.raise()
  // — a SpecimenDeficiency IS the real CAPA record in this app (see
  // services/deficiencies/README.md's own "Firestore-backed CAPA
  // foundation" section) — never a new, parallel CAPA entity.
  const handleRaiseFixationDeficiency = useCallback(async (specimenId: string) => {
    if (!caseData?.id || !signingUser?.id) return;
    const specimen = (caseData.specimens ?? []).find((sp: Specimen) => sp.id === specimenId);
    if (!specimen) return;
    const result = await specimenDeficiencyService.raise({
      caseId: caseData.id,
      specimenId: specimen.id,
      specimenLabel: specimen.label,
      deficiencyTypeId: 'def-missing-fixation-completion',
      comment: 'Flagged manually at grossing — fixation end time and/or fixative:tissue ratio confirmation missing.',
      raisedBy: signingUser.id,
    });
    if (result.ok) {
      setSpecimensWithOpenFixationDeficiency(prev => new Set(prev).add(specimenId));
    }
  }, [caseData, signingUser]);

  // Batch 378 (PS-359): Complete grossing, checked against the organisation's
  // Grossing field requirements. The decisions are in services/grossing.
  // Batch 379: with the protocol rule switched off, specimens without a
  // protocol need a confirmation (pendingProtocolConfirmation) and are then
  // routed for secondary review; the result says which.
  const [grossingRequirements, setGrossingRequirements] = useState<ResolvedFieldRequirement[]>(() => resolveFieldRequirements('grossing'));
  useEffect(() => { void fieldRequirementService.forSession('grossing').then(setGrossingRequirements); }, [signingUser?.id]);
  const missingItems = caseData ? missingGrossingItems(caseData, grossingRequirements) : [];
  const secondaryReviewSpecimens = caseData ? specimensForSecondaryReview(caseData, grossingRequirements) : [];
  const [completeRefusal, setCompleteRefusal] = useState<CompleteGrossingRefusal | null>(null);
  const [pendingProtocolConfirmation, setPendingProtocolConfirmation] = useState<string[] | null>(null);
  const [completionReview, setCompletionReview] = useState<{ routedForReview: string[]; reviewNotRaised: string[]; routedToPool?: string } | null>(null);

  // One completion at a time: a double click, or a command heard twice,
  // must not start a second attempt against the same case version.
  const completingRef = useRef(false);
  const runCompleteGrossing = useCallback(async (confirmedWithoutProtocol: boolean) => {
    if (!caseData || completingRef.current) return;
    completingRef.current = true;
    try {
      const result = await completeGrossing(caseData, grossingRequirements, knownVersionRef.current, {
        authorization: authorizationService,
        updateCase: (id, patch, version) => caseRouter.updateCase(id, patch, version),
        audit: entry => auditService.logEvent(entry),
        raiseDeficiency: input => specimenDeficiencyService.raise(input),
        actorName: signingUser?.name ?? signingUser?.id ?? 'unknown',
        actorId: signingUser?.id ?? 'unknown',
      }, { confirmedWithoutProtocol });
      if (result.ok === false) {
        if (result.reason === 'needsConfirmation') { setPendingProtocolConfirmation(result.withoutProtocol ?? []); setCompleteRefusal(null); return; }
        setCompleteRefusal(result.reason);
        return;
      }
      knownVersionRef.current = knownVersionRef.current + 1;
      setCompleteRefusal(null);
      // Batch 652: pool routing after grossing, the same call the report page's Gross Complete makes.
      const routing = await routeCaseAfterGrossing(result.case);
      setCompletionReview(result.routedForReview.length || result.reviewNotRaised.length || routing.routed
        ? { routedForReview: result.routedForReview, reviewNotRaised: result.reviewNotRaised, routedToPool: routing.poolName } : null);
      setCaseData(prev => (prev ? ({ ...prev, status: 'gross-complete' } as typeof prev) : prev));
    } catch (e) {
      if (!handleConcurrencyConflict(e, setConcurrencyConflict)) setCompleteRefusal('failed');
    } finally {
      completingRef.current = false;
    }
  }, [caseData, grossingRequirements, knownVersionRef, signingUser, setCaseData, setConcurrencyConflict]);

  // Batch 484: the real Gate A decision, ahead of the existing
  // protocol-requirements check. BLOCK/PALETTE_UNAVAILABLE stop here with
  // no bypass; a WARN with severity-2 issues needs the "Proceed with
  // Advisory Note" confirmation below before runCompleteGrossing ever runs.
  const handleCompleteGrossing = useCallback(() => {
    if (inkingGate.mode === 'BLOCK' || inkingGate.mode === 'PALETTE_UNAVAILABLE') { setShowInkingGateBlock(true); return; }
    if (inkingGate.mode === 'WARN' && inkingGate.highestSeverity === 2) { setShowInkingAdvisoryConfirm(true); return; }
    void runCompleteGrossing(false);
  }, [inkingGate, runCompleteGrossing]);

  const cancelInkingGateBlock = useCallback(() => setShowInkingGateBlock(false), []);
  const cancelInkingAdvisory = useCallback(() => setShowInkingAdvisoryConfirm(false), []);
  const confirmInkingAdvisoryAndComplete = useCallback(async () => {
    setShowInkingAdvisoryConfirm(false);
    if (caseData?.id) {
      await auditService.logEvent({
        type: 'user', event: 'Inking gate advisory acknowledged', user: signingUser?.name ?? signingUser?.id ?? 'unknown',
        caseId: caseData.id, confidence: null, facilityId: caseData.order?.facilityId ?? null,
        detail: `Grossing completed with ${inkingGate.issues.length} unresolved Severity 2 inking issue(s), advisory note acknowledged by ${signingUser?.name ?? signingUser?.id ?? 'unknown'}.`,
      });
    }
    await runCompleteGrossing(false);
  }, [caseData, inkingGate.issues.length, signingUser, runCompleteGrossing]);
  const confirmCompleteWithoutProtocol = useCallback(async () => {
    setPendingProtocolConfirmation(null);
    await runCompleteGrossing(true);
  }, [runCompleteGrossing]);
  const cancelCompleteWithoutProtocol = useCallback(() => setPendingProtocolConfirmation(null), []);

  // Batch 481 (Structured Inking, Module 2; PS-359 follow-up): records a
  // margin's first ink application (creating it) or appends a further one
  // to an existing margin, via the real, capability-checked, version-safe
  // service built in Batch 480. That service doesn't hand back the updated
  // case the way recordAutopsyOrganTag.ts does, so on success this re-reads
  // the case — the same real idiom this hook's own initial load already
  // uses — rather than reconstructing the new margins locally.
  const handleRecordMarginInk = useCallback(async (
    input: RecordMarginInkApplicationInput,
  ): Promise<RecordMarginInkApplicationResult> => {
    if (!caseData?.id) return { ok: false, reasonCode: 'caseNotFound' };
    const result = await recordMarginInkApplication(caseData.id, input, signingUser?.name ?? signingUser?.id ?? 'unknown');
    if (result.ok) {
      const fresh = await caseRouter.getCase(caseData.id);
      if (fresh) {
        setCaseData(fresh);
        knownVersionRef.current = (fresh as unknown as { version?: number }).version ?? knownVersionRef.current + 1;
      }
    }
    return result;
  }, [caseData?.id, signingUser, setCaseData, knownVersionRef]);

  return {
    handleAddBlock, handleRemoveBlock, handleAddStain, handleRemoveStain,
    pendingStainRemoval, confirmPendingStainRemoval, cancelPendingStainRemoval,
    handleUpdatePieceCount, handleUpdatePieceDescription, handleUpdateMatrixBlock, handleSetBlockPieceMap, handleRecordFixationEnded, handleConfirmFixativeRatio,
    handleRaiseFixationDeficiency, specimensWithOpenFixationDeficiency,
    missingItems, handleCompleteGrossing, completeRefusal,
    secondaryReviewSpecimens, pendingProtocolConfirmation, confirmCompleteWithoutProtocol, cancelCompleteWithoutProtocol,
    completionReview,
    handleRecordMarginInk,
    inkColors, inkingValidation, inkingValidationMode,
    inkingGate, showInkingGateBlock, cancelInkingGateBlock,
    showInkingAdvisoryConfirm, cancelInkingAdvisory, confirmInkingAdvisoryAndComplete,
  };
}
