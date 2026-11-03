// src/pages/GrossingScreenPage/GrossingScreenPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the Protocol-Driven Workflow Infrastructure story's Part
// 3: "New workflow surface between accessioning and sign-out. The
// grossing tech operates here; the pathologist does not." A
// deliberately separate, dedicated page from SynopticReportPage.tsx
// (the pathologist's own reporting surface) — reuses the exact same
// real Specimen/HistologyBlock/StainOrder data model (no parallel
// schema), routed via the same real case-access-control loader
// (synopticLoader — see App.tsx) since a grossing tech needs the same
// real pediatric/orchestration access checks a pathologist does.
// ─────────────────────────────────────────────────────────────────────────────

import { useOpenCase } from '@/hooks/useOpenCase';
import { useRouteCaseId } from '@/hooks/useRouteCaseId';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { caseRouter } from '@/services/cases/CaseRouter';
import { protocolService, stainTypeService, batchService, actionRegistryService } from '@/services';
import { canCompleteGrossingFrom } from '@/services/grossing/grossingCompletion';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CaseClinicalHistoryBar } from '@/components/ClinicalHistory/CaseClinicalHistoryBar';
import { formatList } from '@/utils/formatList';
import { formatDateTime } from '@/utils/formatDate';
import { stainOrigin } from '@/utils/grossingScreenOperations';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { Margin } from '@/types/case/Margin';
import type { Protocol, ProtocolPathway } from '@/services/protocols/IProtocolService';
import type { StainType } from '@/services/stains/IStainService';
import type { Batch } from '@/services/batches/IBatchService';
import type { RecordMarginInkApplicationReasonCode } from '@/services/grossing/recordMarginInkApplication';
import { useGrossingScreen } from './hooks/useGrossingScreen';
import GrossingBenchTools from './GrossingBenchTools';
import './GrossingBlockTable.css';
import BlockPieceMapEditor from './components/BlockPieceMapEditor';
import ScanTrailPanel from '@/components/Workstation/ScanTrailPanel';
import { ForeignIdTag, TypedEntryCheck } from '@/components/Workstation/BenchIdentity';
import { useTypedEntryCheck } from '@/hooks/useTypedEntryCheck';
import { specimenSources } from '@/services/material/benchIdentity';
import WrongCaseScanBanner from '@/components/Workstation/WrongCaseScanBanner';
import { useWrongCaseScanCheck } from '@/hooks/useWrongCaseScanCheck';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { GrossingMatrixBlocks } from './GrossingMatrixBlocks';
import { LoadingState } from '@/components/Common/LoadingState';
import DivideSpecimenPanel from '@/components/Material/DivideSpecimenPanel';
import { useSpecimenDivision } from '@/hooks/useSpecimenDivision';

function findPathwayForBlock(protocol: Protocol | undefined, block: HistologyBlock): ProtocolPathway | undefined {
  if (!protocol || !block.sourcePathwayName) return undefined;
  return protocol.pathways.find(p => p.pathwayName === block.sourcePathwayName);
}

// Batch 513 (PS-269): a refused margin-ink save is worded from its reason
// code; the service's own `error` text is an English diagnostic, never shown.
const MARGIN_INK_REASON_KEY: Record<RecordMarginInkApplicationReasonCode, string> = {
  notPermitted:     'grossingScreen.margins.reason.notPermitted',
  caseNotFound:     'grossingScreen.margins.reason.caseNotFound',
  specimenNotFound: 'grossingScreen.margins.reason.specimenNotFound',
  blockNotFound:    'grossingScreen.margins.reason.blockNotFound',
  marginNotFound:   'grossingScreen.margins.reason.marginNotFound',
  conflict:         'grossingScreen.margins.reason.conflict',
};

const GrossingScreenPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  // Batch 446: the address carries the case's reference, not its accession.
  const caseId = useRouteCaseId('grossing');
  const openCasePage = useOpenCase();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  // Batch 729 (spec §7.3): a scanned cassette, block or slide from another case is flagged here.
  const { effectiveStationId: grossingStationId } = useEffectiveScanStation();
  const wrongCase = useWrongCaseScanCheck(caseData?.accession?.fullAccession ?? caseData?.id, caseData?.id, { stationId: grossingStationId, userId: user?.id ?? '', userName: user?.name ?? user?.id ?? '' });
  const [isLoaded, setIsLoaded] = useState(false);
  // Batch 759 (spec §2.2, §3): opened from a typed accession, the identifiers to check against the containers.
  const typedEntry = useTypedEntryCheck([caseData?.accession?.fullAccession, caseData?.id]);
  // Batch 741 (fluid decisions 2 and 3): Divide specimen and its aliquots' status.
  const division = useSpecimenDivision(caseData, user?.name ?? user?.id ?? '', useCallback((c: Case) => { setCaseData(c); knownVersionRef.current = c.version ?? knownVersionRef.current; }, []));
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [fovByDisplayId, setFovByDisplayId] = useState<Map<string, { masterBarcode: string; fovCount?: number }>>(new Map());
  const [concurrencyConflict, setConcurrencyConflict] = useState<{ actualVersion: number } | null>(null);
  const knownVersionRef = useRef(0);
  const [addStainForBlock, setAddStainForBlock] = useState<{ specimenId: string; blockId: string } | null>(null);
  const [selectedStainId, setSelectedStainId] = useState('');
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set());

  // Batch 481 (Structured Inking, Module 2): the "add a new margin" and
  // "add a further ink application to an existing margin" inline forms —
  // same toggle-open-row shape as addStainForBlock/selectedStainId above.
  const [marginFormFor, setMarginFormFor] = useState<{ specimenId: string; blockId?: string } | null>(null);
  const [marginForm, setMarginForm] = useState({ name: '', orientation: '', laterality: '', colorName: '', colorCode: '', examined: true });
  const [inkFormFor, setInkFormFor] = useState<{ specimenId: string; blockId?: string; marginId: string } | null>(null);
  const [inkForm, setInkForm] = useState({ colorName: '', colorCode: '', examined: true });
  const [marginSubmitError, setMarginSubmitError] = useState<string | null>(null);
  const [marginSubmitting, setMarginSubmitting] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    caseRouter.getCase(caseId).then(c => { setCaseData(c ?? null); knownVersionRef.current = (c as any)?.version ?? 0; setIsLoaded(true); });
  }, [caseId]);

  useEffect(() => {
    protocolService.getAll().then(res => { if (res.ok) setProtocols(res.data); });
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data.filter(s => s.active)); });
    // Real, per the spec's own cytology block-table column "Imager
    // batch · FOV count" — built once from every real batch's own
    // items, keyed by displayId (the same real identifier a
    // StainOrder/decant slide already carries), rather than a second,
    // separate per-slide fetch for each row.
    batchService.getAll().then(res => {
      if (!res.ok) return;
      const map = new Map<string, { masterBarcode: string; fovCount?: number }>();
      for (const batch of res.data as Batch[]) {
        for (const item of batch.items) {
          map.set(item.displayId, { masterBarcode: batch.masterBarcode, fovCount: item.fovCount });
        }
      }
      setFovByDisplayId(map);
    });
  }, []);

  const {
    missingItems, handleCompleteGrossing, completeRefusal,
    secondaryReviewSpecimens, pendingProtocolConfirmation, confirmCompleteWithoutProtocol, cancelCompleteWithoutProtocol,
    completionReview,
    handleAddBlock, handleRemoveBlock, handleAddStain, handleRemoveStain,
    pendingStainRemoval, confirmPendingStainRemoval, cancelPendingStainRemoval,
    handleUpdatePieceCount, handleUpdatePieceDescription, handleUpdateMatrixBlock, handleSetBlockPieceMap, handleRecordFixationEnded, handleConfirmFixativeRatio,
    handleRaiseFixationDeficiency, specimensWithOpenFixationDeficiency,
    handleRecordMarginInk,
    inkColors, inkingValidation, inkingValidationMode,
    inkingGate, showInkingGateBlock, cancelInkingGateBlock,
    showInkingAdvisoryConfirm, cancelInkingAdvisory, confirmInkingAdvisoryAndComplete,
  } = useGrossingScreen({ caseData, setCaseData: setCaseData as any, signingUser: user, knownVersionRef, setConcurrencyConflict });

  // Batch 378 (Pete): Complete grossing can be asked for by voice or keyboard
  // too ("complete grossing", Alt+Shift+F9, action GROSSING_COMPLETE). The
  // service decides whether it can happen, exactly as for the button.
  // Batch 379: the "complete without a protocol?" confirmation can be
  // answered the same way (GROSSING_COMPLETE_CONFIRM / _CANCEL).
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.GROSSING);
    const unsubscribe = actionRegistryService.onAction((actionId: string) => {
      if (actionId === 'GROSSING_COMPLETE') void handleCompleteGrossing();
      else if (actionId === 'GROSSING_COMPLETE_CONFIRM' && pendingProtocolConfirmation) void confirmCompleteWithoutProtocol();
      else if (actionId === 'GROSSING_COMPLETE_CANCEL' && pendingProtocolConfirmation) cancelCompleteWithoutProtocol();
    });
    return () => { unsubscribe(); actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, [handleCompleteGrossing, pendingProtocolConfirmation, confirmCompleteWithoutProtocol, cancelCompleteWithoutProtocol]);

  const onRemoveBlock = useCallback(async (specimenId: string, blockId: string) => {
    const result = await handleRemoveBlock(specimenId, blockId);
    if (!result.ok) window.alert(t('grossingScreen.removeBlockFailed'));
  }, [handleRemoveBlock, t]);

  const onRemoveStainClick = useCallback(async (specimenId: string, blockId: string, stainId: string) => {
    await handleRemoveStain(specimenId, blockId, stainId);
  }, [handleRemoveStain]);

  const toggleAudit = (specimenId: string) => {
    setExpandedAudit(prev => {
      const next = new Set(prev);
      if (next.has(specimenId)) next.delete(specimenId); else next.add(specimenId);
      return next;
    });
  };

  // Batch 481 (Structured Inking, Module 2): submits the "add a new margin"
  // inline form. The attach-to choice (specimen vs. a specific block) comes
  // straight from marginFormFor.blockId, set by the form's own select.
  const onSubmitNewMargin = useCallback(async () => {
    if (!marginFormFor) return;
    setMarginSubmitting(true);
    setMarginSubmitError(null);
    const result = await handleRecordMarginInk({
      specimenId: marginFormFor.specimenId,
      blockId: marginFormFor.blockId,
      marginName: marginForm.name,
      orientation: marginForm.orientation || undefined,
      laterality: marginForm.laterality || undefined,
      colorName: marginForm.colorName,
      colorCode: marginForm.colorCode,
      examined: marginForm.examined,
    });
    setMarginSubmitting(false);
    if (result.ok) {
      setMarginFormFor(null);
      setMarginForm({ name: '', orientation: '', laterality: '', colorName: '', colorCode: '', examined: true });
    } else {
      setMarginSubmitError(t(result.reasonCode ? MARGIN_INK_REASON_KEY[result.reasonCode] : 'grossingScreen.margins.saveFailed'));
    }
  }, [marginFormFor, marginForm, handleRecordMarginInk, t]);

  // Appends a further ink application to an already-existing margin —
  // never renames it or touches its orientation/laterality.
  const onSubmitInk = useCallback(async () => {
    if (!inkFormFor) return;
    setMarginSubmitting(true);
    setMarginSubmitError(null);
    const result = await handleRecordMarginInk({
      specimenId: inkFormFor.specimenId,
      blockId: inkFormFor.blockId,
      marginId: inkFormFor.marginId,
      colorName: inkForm.colorName,
      colorCode: inkForm.colorCode,
      examined: inkForm.examined || undefined,
    });
    setMarginSubmitting(false);
    if (result.ok) {
      setInkFormFor(null);
      setInkForm({ colorName: '', colorCode: '', examined: true });
    } else {
      setMarginSubmitError(t(result.reasonCode ? MARGIN_INK_REASON_KEY[result.reasonCode] : 'grossingScreen.margins.saveFailed'));
    }
  }, [inkFormFor, inkForm, handleRecordMarginInk, t]);

  // One margin row — its name/orientation/laterality/status, its full,
  // append-only ink history, and the inline "+ Add ink application"
  // toggle. Used for both specimen-level and block-level margins; the
  // caller's blockId (undefined for a specimen-level margin) is what tells
  // recordMarginInkApplication.ts which one a new ink application belongs to.
  const renderMarginRow = (specimenId: string, blockId: string | undefined, m: Margin) => (
    <div key={m.id} className="ps-grossing-margin-row">
      <div className="ps-grossing-margin-row-header">
        <span className="ps-grossing-margin-name">{m.name}</span>
        {(m.orientation || m.laterality) && (
          <span className="ps-grossing-margin-detail">{[m.orientation, m.laterality].filter(Boolean).join(' · ')}</span>
        )}
        <span className={`ps-grossing-margin-status ps-grossing-margin-status--${m.examinationStatus}`}>
          {t(`grossingScreen.margins.status.${m.examinationStatus}`)}
        </span>
      </div>
      <ul className="ps-grossing-margin-ink-list">
        {m.inkApplications.map(app => (
          <li key={app.id} className="ps-grossing-margin-ink-entry">
            {t('grossingScreen.margins.inkEntry', {
              colorName: app.colorName, colorCode: app.colorCode, by: app.appliedByName, when: formatDateTime(app.appliedAt, i18n.language),
            })}
          </li>
        ))}
      </ul>
      {/* Structured Inking, Module 3 (PS-359 follow-up): the severity
          engine's own real, current findings for this margin — display
          only, mirrors resolveInkingValidationSeverity.ts's issues array
          verbatim rather than re-deriving anything here. */}
      {inkingValidation.issues.filter(i => i.marginId === m.id).length > 0 && (
        <ul className="ps-grossing-margin-issue-list">
          {inkingValidation.issues.filter(i => i.marginId === m.id).map((issue, idx) => (
            <li key={idx} className={`ps-grossing-margin-issue ps-grossing-margin-issue--${issue.severity}`}>
              {issue.colorCode ? t(`grossingScreen.margins.issues.${issue.code}`, { colorCode: issue.colorCode }) : t(`grossingScreen.margins.issues.${issue.code}`)}
            </li>
          ))}
        </ul>
      )}
      {inkFormFor?.marginId === m.id ? (
        <div className="ps-grossing-add-stain-row">
          <select aria-label={t('a11y.fields.inkColour')}
            className="ps-conf-select" value={inkForm.colorCode}
            onChange={e => {
              const chosen = inkColors.find(c => c.code === e.target.value);
              setInkForm(f => ({ ...f, colorCode: e.target.value, colorName: chosen?.name ?? '' }));
            }}
          >
            <option value="">{t('grossingScreen.margins.selectColorPlaceholder')}</option>
            {inkColors.filter(c => c.active).map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
          </select>
          <label className="ps-grossing-margin-examined-check">
            <input type="checkbox" checked={inkForm.examined} onChange={e => setInkForm(f => ({ ...f, examined: e.target.checked }))} />
            {t('grossingScreen.margins.markExamined')}
          </label>
          <CapabilityButton
            capability="grossing:margin-ink:record" className="ps-conf-btn-primary"
            context={{ caseId: caseData!.id }}
            disabled={marginSubmitting || !inkForm.colorName || !inkForm.colorCode}
            onClick={() => { void onSubmitInk(); }}
          >
            {t('common.save')}
          </CapabilityButton>
          <button type="button" className="ps-grossing-stain-remove" onClick={() => { setInkFormFor(null); setMarginSubmitError(null); }}>×</button>
        </div>
      ) : (
        <button
          type="button" className="ps-grossing-add-stain-link"
          onClick={() => { setInkFormFor({ specimenId, blockId, marginId: m.id }); setInkForm({ colorName: '', colorCode: '', examined: true }); setMarginSubmitError(null); }}
        >
          + {t('grossingScreen.margins.addInk')}
        </button>
      )}
    </div>
  );

  if (!isLoaded) return <LoadingState label={t('common.loading')} />;
  if (!caseData || !caseId) return <div className="ps-grossing-screen-loading">{t('grossingScreen.caseNotFound')}</div>; // caseData only loads with a caseId

  return (
    <div className="ps-grossing-screen-page">
      <div className="ps-grossing-screen-header">
        <button className="ps-btn-secondary" onClick={() => void openCasePage(caseId, 'synoptic')}>
          {t('grossingScreen.backToCase')}
        </button>
        <h1 className="ps-grossing-screen-title" data-phi="accession">{t('grossingScreen.pageTitle', { accession: caseData.accession?.fullAccession ?? caseData.id })}</h1>
        {/* Batch 759 (spec §2.1): an outside case's Foreign Identifier, beside the accession, for good. */}
        <ForeignIdTag order={caseData.order} />
      </div>
      {typedEntry && <TypedEntryCheck accession={caseData.accession?.fullAccession ?? caseData.id} source={specimenSources(caseData.specimens).map(p => t('benchIdentity.specimenSource', { label: p.label, description: p.description })).join('; ')} />}

      {/* Batch 530 (Pete): add or reconcile the clinical history while grossing. */}
      <CaseClinicalHistoryBar caseData={caseData}
        onSaved={(clinicalHistory, version) => { knownVersionRef.current = version; setCaseData(prev => (prev ? { ...prev, order: { ...prev.order, clinicalHistory }, version } : prev)); }} />

      <WrongCaseScanBanner flag={wrongCase.flag} onChoose={wrongCase.choose} />
      {/* Batch 729 (spec §7.4): the case's station scan trail. */}
      <ScanTrailPanel caseAccession={caseData.accession?.fullAccession ?? caseData.id} />

      {/* Batch 720: cassettes, photos, decal bench and add-on orders, as on the Material tab. */}
      <GrossingBenchTools caseData={caseData} setCaseData={setCaseData} signingUser={user} knownVersionRef={knownVersionRef} setConcurrencyConflict={setConcurrencyConflict} />

      {/* Batch 378 (PS-359): Complete grossing, checked against the
          organisation's Grossing field requirements. */}
      <div className="ps-grossing-complete-bar">
        {caseData.status === 'gross-complete' ? (
          <>
            <span className="ps-grossing-complete-done">✓ {t('grossingScreen.complete.done')}</span>
            {completionReview && completionReview.routedForReview.length > 0 && (
              <p className="ps-grossing-complete-review" role="status">
                {t('grossingScreen.complete.routedForReview', { count: completionReview.routedForReview.length, specimens: formatList(completionReview.routedForReview, i18n.language) })}
              </p>
            )}
            {completionReview?.routedToPool && (
              <p className="ps-grossing-complete-review" role="status">{t('useGrossingCompletion.toast.routedToPool', { poolName: completionReview.routedToPool })}</p>
            )}
            {completionReview && completionReview.reviewNotRaised.length > 0 && (
              <p className="ps-grossing-complete-error" role="alert">
                {t('grossingScreen.complete.reviewNotRaised', { count: completionReview.reviewNotRaised.length, specimens: formatList(completionReview.reviewNotRaised, i18n.language) })}
              </p>
            )}
          </>
        ) : canCompleteGrossingFrom(caseData.status) ? (
          <>
            <CapabilityButton capability="case:grossing:complete" className="ps-btn-primary"
              context={{ caseId: caseData.id, facilityId: caseData.order?.facilityId ?? null }}
              disabled={missingItems.length > 0} onClick={() => { void handleCompleteGrossing(); }}>
              {t('grossingScreen.complete.button')}
            </CapabilityButton>
            {missingItems.length > 0 && (
              <p className="ps-grossing-complete-missing" role="status">
                {t('fieldRequirements.stillRequired', { fields: formatList(missingItems.map(m => m.where.length
                  ? t('grossingScreen.complete.missingAt', { field: t(`fieldRequirements.fields.grossing.${m.fieldId}`), where: formatList(m.where, i18n.language) })
                  : t(`fieldRequirements.fields.grossing.${m.fieldId}`)), i18n.language) })}
              </p>
            )}
            {missingItems.length === 0 && secondaryReviewSpecimens.length > 0 && (
              <p className="ps-grossing-complete-review" role="status">
                {t('grossingScreen.complete.reviewNotice', { count: secondaryReviewSpecimens.length, specimens: formatList(secondaryReviewSpecimens, i18n.language) })}
              </p>
            )}
            {completeRefusal && completeRefusal !== 'missing' && completeRefusal !== 'needsConfirmation' && (
              <p className="ps-grossing-complete-error" role="alert">{t(`grossingScreen.complete.refusals.${completeRefusal}`)}</p>
            )}
          </>
        ) : (
          <span className="ps-grossing-complete-past">{t('grossingScreen.complete.pastGrossing')}</span>
        )}
      </div>

      {(caseData.specimens ?? []).map((sp: Specimen) => {
        const protocol = sp.protocolSnapshot ? protocols.find(p => p.id === sp.protocolSnapshot!.id) : undefined;
        const blocks = sp.blocks ?? [];
        const decants = sp.decants ?? [];
        // Batch 481 (Structured Inking, Module 2): margins live either on
        // the specimen directly or on one of its blocks — never both for
        // the same margin — per types/case/Margin.ts's own header.
        const specimenMargins = sp.margins ?? [];
        const blocksWithMargins = blocks.filter(b => (b.margins ?? []).length > 0);
        const hasAnyMargins = specimenMargins.length > 0 || blocksWithMargins.length > 0;
        const protocolModified = blocks.some(b => b.userModified);
        const overrides = sp.grossingOverrides ?? [];
        // Real — the block-kind pathways this specimen's own protocol
        // offers for a real "Add Block" (another instance of that
        // same pathway's own defaults). A specimen with no
        // protocolSnapshot, or whose protocol has no block-kind
        // pathway, simply has nothing to add from — Add Block doesn't
        // render at all rather than offering a meaningless choice.
        const addableBlockPathways = (protocol?.pathways ?? []).filter(p => p.materialKind === 'block');

        return (
          <div key={sp.id} className="ps-grossing-specimen-section">
            <div className="ps-grossing-protocol-header">
              <div className="ps-grossing-protocol-specimen">{t('grossingScreen.specimenHeader', { label: sp.label, description: sp.description })}</div>
              {sp.protocolSnapshot ? (
                <div className="ps-grossing-protocol-info">
                  {t('grossingScreen.protocolVersion', { name: sp.protocolSnapshot.name, version: sp.protocolSnapshot.version })}
                  {protocolModified && <span className="ps-grossing-protocol-modified-badge">{t('grossingScreen.protocolModified')}</span>}
                </div>
              ) : (
                <div className="ps-grossing-protocol-info ps-grossing-protocol-info--none">{t('grossingScreen.noProtocol')}</div>
              )}
            </div>

            {/* Real, per direct request (ISO 15189 traceability) —
                record only, no gating. Fixation end is the real,
                natural moment tissue actually leaves the fixative at
                grossing; the ratio confirmation is a real, qualitative
                judgment call, not a computed number — see
                Specimen.ts's own doc comments for the full reasoning. */}
            <div className="ps-grossing-fixation-tracking">
              <div className="ps-grossing-fixation-field">
                <span className="ps-grossing-fixation-label">{t('grossingScreen.fixation.endedLabel')}</span>
                {sp.processing?.fixationEndedAt ? (
                  <span className="ps-grossing-fixation-value">{formatDateTime(sp.processing.fixationEndedAt, i18n.language)}</span>
                ) : (
                  <button type="button" className="ps-grossing-fixation-action" onClick={() => handleRecordFixationEnded(sp.id)}>
                    {t('grossingScreen.fixation.recordNow')}
                  </button>
                )}
              </div>
              <div className="ps-grossing-fixation-field">
                <span className="ps-grossing-fixation-label">{t('grossingScreen.fixation.ratioLabel')}</span>
                {sp.processing?.fixativeToTissueRatioConfirmation ? (
                  <span className="ps-grossing-fixation-value">
                    {t('grossingScreen.fixation.ratioConfirmedBy', {
                      name: sp.processing.fixativeToTissueRatioConfirmation.userName,
                      when: formatDateTime(sp.processing.fixativeToTissueRatioConfirmation.confirmedAt, i18n.language),
                    })}
                  </span>
                ) : (
                  <button type="button" className="ps-grossing-fixation-action" onClick={() => handleConfirmFixativeRatio(sp.id)}>
                    {t('grossingScreen.fixation.confirmRatio')}
                  </button>
                )}
              </div>
              {/* Real, per direct decision — a human, not a gate, raises
                  this. Only offered while real fixation data is
                  genuinely still missing; once both are recorded above,
                  there's nothing left to flag. */}
              {(!sp.processing?.fixationEndedAt || !sp.processing?.fixativeToTissueRatioConfirmation) && (
                specimensWithOpenFixationDeficiency.has(sp.id) ? (
                  <div className="ps-grossing-fixation-field">
                    <span className="ps-grossing-fixation-value ps-grossing-fixation-value--flagged">{t('grossingScreen.fixation.deficiencyRaised')}</span>
                  </div>
                ) : (
                  <div className="ps-grossing-fixation-field">
                    <button type="button" className="ps-grossing-fixation-action ps-grossing-fixation-action--deficiency" onClick={() => handleRaiseFixationDeficiency(sp.id)}>
                      {t('grossingScreen.fixation.raiseDeficiency')}
                    </button>
                  </div>
                )
              )}
            </div>

            {blocks.length > 0 && (
              <table className="ps-grossing-block-table">
                <thead>
                  <tr>
                    <th>{t('grossingScreen.col.blockId')}</th>
                    <th>{t('grossingScreen.col.pieceCount')}</th>
                    <th>{t('grossingScreen.col.pieceDescription')}</th>
                    <th>{t('grossingScreen.col.stains')}</th>
                    <th>{t('grossingScreen.col.status')}</th>
                    <th>{t('grossingScreen.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map(block => {
                    const pathway = findPathwayForBlock(protocol, block);
                    const allowedIds = pathway?.allowedAdditionalStainTypeIds;
                    const availableStainTypes = allowedIds ? stainTypes.filter(s => allowedIds.includes(s.id)) : stainTypes;
                    return (
                      <tr key={block.id} className={block.userModified ? 'ps-grossing-block-row--modified' : ''}>
                        <td>{sp.label}{block.label}</td>
                        <td>
                          <input aria-label={t('a11y.fields.pieceCount')}
                            type="number" min={0} className="ps-grossing-piece-count-input"
                            defaultValue={block.pieceCount ?? ''}
                            onBlur={e => {
                              const n = parseInt(e.target.value, 10);
                              if (!isNaN(n) && n !== block.pieceCount) handleUpdatePieceCount(sp.id, block.id, n);
                            }}
                          />
                        </td>
                        <td>
                          <input aria-label={t('a11y.fields.pieceDescription')} className="ps-grossing-piece-description-input" defaultValue={block.pieceDescription ?? ''}
                            onBlur={e => { if (e.target.value.trim() !== (block.pieceDescription ?? '')) void handleUpdatePieceDescription(sp.id, block.id, e.target.value); }} />
                          {/* Batch 732 (spec §11.1, §11.2): the block's type and piece map. */}
                          <BlockPieceMapEditor block={block} partLabels={(caseData.specimens ?? []).map(x => x.label)} defaultPart={sp.label}
                            onSave={(type, pieces) => handleSetBlockPieceMap(sp.id, block.id, type, pieces)} />
                        </td>
                        <td>
                          <ul className="ps-grossing-stain-list">
                            {block.stains.map(stain => (
                              <li key={stain.id} className={stain.userAdded ? 'ps-grossing-stain--user-added' : 'ps-grossing-stain--auto'}>
                                <span>{stain.stainName}</span>
                                <span className="ps-grossing-stain-flag">
                                  {t(`grossingScreen.stainOrigin.${stainOrigin(sp, stain)}`)}
                                </span>
                                <button
                                  type="button" className="ps-grossing-stain-remove"
                                  title={t('grossingScreen.removeStainTitle')}
                                  onClick={() => onRemoveStainClick(sp.id, block.id, stain.id)}
                                >×</button>
                              </li>
                            ))}
                          </ul>
                          {addStainForBlock?.specimenId === sp.id && addStainForBlock.blockId === block.id ? (
                            <div className="ps-grossing-add-stain-row">
                              <select aria-label={t('a11y.fields.stain')} className="ps-batch-select" value={selectedStainId} onChange={e => setSelectedStainId(e.target.value)}>
                                <option value="">{t('grossingScreen.selectStain')}</option>
                                {availableStainTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <button
                                type="button" className="ps-btn-secondary" disabled={!selectedStainId}
                                onClick={() => {
                                  const st = stainTypes.find(s => s.id === selectedStainId);
                                  if (st) handleAddStain(sp.id, block.id, st);
                                  setAddStainForBlock(null); setSelectedStainId('');
                                }}
                              >{t('common.add')}</button>
                              <button type="button" className="ps-grossing-stain-remove" onClick={() => setAddStainForBlock(null)}>×</button>
                            </div>
                          ) : (
                            <button type="button" className="ps-grossing-add-stain-link" onClick={() => setAddStainForBlock({ specimenId: sp.id, blockId: block.id })}>
                              + {t('grossingScreen.addStain')}
                            </button>
                          )}
                        </td>
                        <td>{block.status}</td>
                        <td>
                          <button
                            type="button" className="ps-btn-secondary"
                            disabled={block.status !== 'Pending'}
                            title={block.status !== 'Pending' ? t('grossingScreen.removeBlockedTitle', { status: block.status }) : undefined}
                            onClick={() => onRemoveBlock(sp.id, block.id)}
                          >
                            {t('grossingScreen.removeBlock')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <DivideSpecimenPanel specimen={sp as never} suggestedPurposes={protocol?.divisionPurposes} busy={division.busy} message={division.message} onDivide={division.divide} onStatus={division.setStatus} />

            {decants.length > 0 && (
              <table className="ps-grossing-block-table">
                <thead>
                  <tr>
                    <th>{t('grossingScreen.col.slideId')}</th>
                    <th>{t('grossingScreen.col.stain')}</th>
                    <th>{t('grossingScreen.col.imagerBatch')}</th>
                    <th>{t('grossingScreen.col.fovCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {decants.flatMap(decant => decant.stains.map(stain => {
                    const fov = stain.displayId ? fovByDisplayId.get(stain.displayId) : undefined;
                    return (
                      <tr key={stain.id}>
                        <td>{stain.displayId ?? `${sp.label}${decant.label}`}</td>
                        <td>{stain.stainName}</td>
                        <td>{fov?.masterBarcode ?? t('grossingScreen.notYetImaged')}</td>
                        <td>{fov?.fovCount ?? '—'}</td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            )}

            {/* Batch 481 (Structured Inking, Module 2; PS-359 follow-up):
                recording margins and their ink applications during
                grossing. Data model, the recording service, and the
                severity engine are Batch 480's; this is the first UI that
                calls recordMarginInkApplication.ts.
                Structured Inking, Module 3 (PS-359 follow-up): the
                severity engine's own WARN_ONLY/STRICT_ENFORCE advisory
                display, unblocked by re-scoping inking_validation_mode
                from Site to the real, current Case.order.facilityId (see
                services/grossing/inkingSiteSettings.ts's own header), plus
                the ink-colour admin palette (services/inkColors/) the
                Severity 3 margin_ink_color_unmapped check validates
                against. Display only — doesn't change what blocks
                Complete grossing yet (see useGrossingScreen.ts's own
                comment). */}
            <div className="ps-grossing-margins-section">
              <div className="ps-grossing-margins-header">
                <span className="ps-grossing-margins-title">{t('grossingScreen.margins.title')}</span>
              </div>
              {hasAnyMargins && (
                <p className="ps-grossing-margins-mode-notice">
                  {t(`grossingScreen.margins.validationNotice.${inkingValidationMode === 'STRICT_ENFORCE' ? 'strictEnforce' : 'warnOnly'}`)}
                </p>
              )}
              {!hasAnyMargins && marginFormFor?.specimenId !== sp.id && (
                <div className="ps-grossing-margins-empty">{t('grossingScreen.margins.empty')}</div>
              )}
              {specimenMargins.length > 0 && (
                <div className="ps-grossing-margins-group">
                  <div className="ps-grossing-margins-group-label">{t('grossingScreen.margins.onSpecimen')}</div>
                  {specimenMargins.map(m => renderMarginRow(sp.id, undefined, m))}
                </div>
              )}
              {blocksWithMargins.map(block => (
                <div key={block.id} className="ps-grossing-margins-group">
                  <div className="ps-grossing-margins-group-label">{t('grossingScreen.margins.onBlock', { label: `${sp.label}${block.label}` })}</div>
                  {(block.margins ?? []).map(m => renderMarginRow(sp.id, block.id, m))}
                </div>
              ))}
              {marginFormFor?.specimenId === sp.id ? (
                <div className="ps-grossing-add-margin-row">
                  <select aria-label={t('a11y.fields.block')}
                    className="ps-conf-select" value={marginFormFor.blockId ?? ''}
                    onChange={e => setMarginFormFor({ specimenId: sp.id, blockId: e.target.value || undefined })}
                  >
                    <option value="">{t('grossingScreen.margins.attachToSpecimen')}</option>
                    {blocks.map(b => (
                      <option key={b.id} value={b.id}>{t('grossingScreen.margins.attachToBlock', { label: `${sp.label}${b.label}` })}</option>
                    ))}
                  </select>
                  <input
                    type="text" className="ps-conf-input" placeholder={t('grossingScreen.margins.namePlaceholder')}
                    value={marginForm.name} onChange={e => setMarginForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <input
                    type="text" className="ps-conf-input" placeholder={t('grossingScreen.margins.orientationPlaceholder')}
                    value={marginForm.orientation} onChange={e => setMarginForm(f => ({ ...f, orientation: e.target.value }))}
                  />
                  <input
                    type="text" className="ps-conf-input" placeholder={t('grossingScreen.margins.lateralityPlaceholder')}
                    value={marginForm.laterality} onChange={e => setMarginForm(f => ({ ...f, laterality: e.target.value }))}
                  />
                  <select aria-label={t('a11y.fields.inkColour')}
                    className="ps-conf-select" value={marginForm.colorCode}
                    onChange={e => {
                      const chosen = inkColors.find(c => c.code === e.target.value);
                      setMarginForm(f => ({ ...f, colorCode: e.target.value, colorName: chosen?.name ?? '' }));
                    }}
                  >
                    <option value="">{t('grossingScreen.margins.selectColorPlaceholder')}</option>
                    {inkColors.filter(c => c.active).map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                  </select>
                  <label className="ps-grossing-margin-examined-check">
                    <input type="checkbox" checked={marginForm.examined} onChange={e => setMarginForm(f => ({ ...f, examined: e.target.checked }))} />
                    {t('grossingScreen.margins.markExamined')}
                  </label>
                  <CapabilityButton
                    capability="grossing:margin-ink:record" className="ps-conf-btn-primary"
                    context={{ caseId: caseData.id }}
                    disabled={marginSubmitting || !marginForm.name || !marginForm.colorName || !marginForm.colorCode}
                    onClick={() => { void onSubmitNewMargin(); }}
                  >
                    {t('common.add')}
                  </CapabilityButton>
                  <button
                    type="button" className="ps-grossing-stain-remove"
                    onClick={() => { setMarginFormFor(null); setMarginSubmitError(null); }}
                  >×</button>
                </div>
              ) : (
                <button
                  type="button" className="ps-grossing-add-stain-link"
                  onClick={() => { setMarginFormFor({ specimenId: sp.id }); setMarginForm({ name: '', orientation: '', laterality: '', colorName: '', colorCode: '', examined: true }); setMarginSubmitError(null); }}
                >
                  + {t('grossingScreen.margins.addMargin')}
                </button>
              )}
              {marginSubmitError && <p className="ps-grossing-complete-error" role="alert">{marginSubmitError}</p>}
            </div>

            {addableBlockPathways.length > 0 && (
              <div className="ps-grossing-add-block-row">
                {addableBlockPathways.map(pathway => (
                  <button key={pathway.id} type="button" className="ps-btn-secondary" onClick={() => handleAddBlock(sp.id, pathway)}>
                    + {t('grossingScreen.addBlock', { pathwayName: pathway.pathwayName })}
                  </button>
                ))}
              </div>
            )}

            <div className="ps-grossing-audit-panel">
              <button className="ps-grossing-audit-header" onClick={() => toggleAudit(sp.id)}>
                <span>{t('grossingScreen.auditPanelTitle', { count: overrides.length })}</span>
                <span>{expandedAudit.has(sp.id) ? '▾' : '▸'}</span>
              </button>
              {expandedAudit.has(sp.id) && (
                <div className="ps-grossing-audit-body">
                  {overrides.length === 0 ? (
                    <div className="ps-grossing-audit-empty">{t('grossingScreen.noOverrides')}</div>
                  ) : (
                    overrides.map((ov, i) => (
                      <div key={i} className="ps-grossing-audit-row">
                        {t('grossingScreen.auditEntry', {
                          blockLabel: ov.blockLabel, field: t(`grossingScreen.auditField.${ov.field}`),
                          originalValue: ov.originalValue, newValue: ov.newValue, actor: ov.actor,
                          timestamp: formatDateTime(ov.timestamp, i18n.language),
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <GrossingMatrixBlocks matrixBlocks={caseData.matrixBlocks ?? []} onChange={(id, patch) => { void handleUpdateMatrixBlock(id, patch); }} />

      {pendingStainRemoval && (
        <div className="ps-overlay" onClick={cancelPendingStainRemoval}>
          <div className="ps-modal-dark" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header">
              <div className="ps-batch-modal-title">{t(`grossingScreen.confirmRemoveStain.${pendingStainRemoval.origin}Title`)}</div>
            </div>
            <div className="ps-batch-modal-body">
              <p>{t(`grossingScreen.confirmRemoveStain.${pendingStainRemoval.origin}Body`)}</p>
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-secondary" onClick={cancelPendingStainRemoval}>{t('common.cancel')}</button>
              <button className="ps-btn-primary" onClick={confirmPendingStainRemoval}>{t('grossingScreen.confirmRemove')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch 484 (Structured Inking Gate Logic Engine, Gate A). A
          Severity 3 issue (or an unreadable ink-colour palette) hard-blocks
          Complete grossing — no bypass, ever. */}
      {showInkingGateBlock && (
        <div className="ps-overlay" onClick={cancelInkingGateBlock}>
          <div className="ps-modal-dark" aria-modal="true" role="alertdialog" aria-labelledby="inking-gate-block-title" onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header">
              <div id="inking-gate-block-title" className="ps-batch-modal-title">{t('inkingGate.grossingBlock.title')}</div>
            </div>
            <div className="ps-batch-modal-body">
              <p>{t(inkingGate.mode === 'PALETTE_UNAVAILABLE' ? 'inkingGate.paletteUnavailable.body' : 'inkingGate.grossingBlock.body')}</p>
              {inkingGate.mode !== 'PALETTE_UNAVAILABLE' && (
                <ul className="ps-inking-gate-issue-list">
                  {inkingGate.issues.filter(i => i.severity === 3).map((issue, idx) => (
                    <li key={idx}>{t('inkingGate.issueLine', { specimen: issue.specimenDisplayName ?? issue.specimenId, code: t(`inkingGate.issueCode.${issue.code}`) })}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-primary" onClick={cancelInkingGateBlock}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Gate A, Severity 2: a soft "Proceed with Advisory Note" warning —
          never a hard block, and audited either way. */}
      {showInkingAdvisoryConfirm && (
        <div className="ps-overlay" onClick={cancelInkingAdvisory}>
          <div className="ps-modal-dark" aria-modal="true" role="alertdialog" aria-labelledby="inking-gate-advisory-title" onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header">
              <div id="inking-gate-advisory-title" className="ps-batch-modal-title">{t('inkingGate.advisoryConfirm.title')}</div>
            </div>
            <div className="ps-batch-modal-body">
              <p>{t('inkingGate.advisoryConfirm.body', { count: inkingGate.issues.length })}</p>
              <ul className="ps-inking-gate-issue-list">
                {inkingGate.issues.map((issue, idx) => (
                  <li key={idx}>{t('inkingGate.issueLine', { specimen: issue.specimenDisplayName ?? issue.specimenId, code: t(`inkingGate.issueCode.${issue.code}`) })}</li>
                ))}
              </ul>
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-secondary" onClick={cancelInkingAdvisory}>{t('common.cancel')}</button>
              <button className="ps-btn-primary" onClick={() => { void confirmInkingAdvisoryAndComplete(); }}>{t('inkingGate.advisoryConfirm.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch 379 (Pete): the organisation has switched off the protocol
          rule, and some specimens have no protocol. Completing routes each
          of them for secondary review. */}
      {pendingProtocolConfirmation && (
        <div className="ps-overlay" onClick={cancelCompleteWithoutProtocol}>
          <div className="ps-modal-dark" aria-modal="true" role="alertdialog" aria-labelledby="grossing-no-protocol-title" onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header">
              <div id="grossing-no-protocol-title" className="ps-batch-modal-title">{t('grossingScreen.complete.withoutProtocol.title')}</div>
            </div>
            <div className="ps-batch-modal-body">
              <p>{t('grossingScreen.complete.withoutProtocol.body', { count: pendingProtocolConfirmation.length })}</p>
              <p className="ps-grossing-complete-review">
                {t('grossingScreen.complete.withoutProtocol.specimens', { count: pendingProtocolConfirmation.length, specimens: formatList(pendingProtocolConfirmation, i18n.language) })}
              </p>
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-secondary" onClick={cancelCompleteWithoutProtocol}>{t('common.cancel')}</button>
              <button className="ps-btn-primary" onClick={() => { void confirmCompleteWithoutProtocol(); }}>{t('grossingScreen.complete.withoutProtocol.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {concurrencyConflict && (
        <div className="ps-overlay">
          <div className="ps-modal-dark" role="dialog" aria-modal="true">
            <div className="ps-batch-modal-body">{t('grossingScreen.concurrencyConflict')}</div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-primary" onClick={() => window.location.reload()}>{t('grossingScreen.reload')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrossingScreenPage;
