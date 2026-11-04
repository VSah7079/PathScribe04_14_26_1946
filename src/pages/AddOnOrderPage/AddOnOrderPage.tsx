// src/pages/AddOnOrderPage/AddOnOrderPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-287 (Pathologist-Initiated Add-On Orders — Recuts,
// Special Stains, IHC, and Molecular). Fourth of the confirmed
// PS-284→285→286→287→288 workstation-build sequence — genuinely
// different shape from its three siblings: this is CASE-scoped (search
// or scan an accession to open the whole case), not block/slide-scoped,
// since a pathologist places an add-on order in the context of one
// case's own full block list, not one pre-selected block. See
// useAddOnOrderStation.ts's own header for the full reasoning and this
// folder's own README.md for the complete investigation this was built
// against, including the two real, direct Jira follow-up comments this
// implementation is scoped to honor (performing-lab-scoped routing
// through the real ScanStation.workflowStage backbone).
//
// Real, per direct visual-consistency guidance carried through the
// whole series: same header/back-button pattern, same dark palette —
// see pathscribe.css's own ps-addon-* block.
//
// Batch 403 (PS-287 / PS-359): the page sets its own voice context
// (ADD_ON_ORDER: "add to order", "submit order"). A molecular/send-out line
// starts with its test's default reference lab (Stain Dictionary). Every
// action's outcome is shown in the user's language: what is still required,
// a refused block and why, or a missing permission. The case status is
// translated.
//
// Batch 731 (spec §10.6): selecting an exhausted block shows ExhaustedBlockChoices (what remains, each line's
// alternative, the reason); the choices go with the order and the service checks them again. A "Block exhausted"
// flag on the tracking dashboard can be answered with the same alternatives.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouteCaseId } from '@/hooks/useRouteCaseId';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useNavigate } from 'react-router';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ForeignIdTag, TypedEntryCheck } from '@/components/Workstation/BenchIdentity';
import { useTypedEntryCheck } from '@/hooks/useTypedEntryCheck';
import { specimenSources } from '@/services/material/benchIdentity';
import { actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { CASE_STATUS_LABEL_KEY } from '@/utils/search/caseSearchLabels';
import { formatList } from '@/utils/formatList';
import type { AddOnActionResult } from '@/services/addOnOrders/addOnOrderActions';
import { useAddOnOrderStation } from './hooks/useAddOnOrderStation';
import BlockContextPanel from './components/BlockContextPanel';
import OrderBuilderPanel from './components/OrderBuilderPanel';
import OrderSummaryRoutingPanel, { type CartLine } from './components/OrderSummaryRoutingPanel';
import OrderTrackingDashboard from './components/OrderTrackingDashboard';
import ExhaustedBlockChoices from './components/ExhaustedBlockChoices';
import { StationScanField } from '@/components/Workstation/StationScanField';
import { useBenchReasons } from '@/hooks/useBenchReasons';
import { choicesForSubmit, whatRemains, type CartExhaustedChoice } from '@/utils/exhaustedBlockRules';
import { withDefaultSendOutLab, type AddOnOrderLineInput } from '@/utils/addOnOrderOperations';
import { type AddOnOrderPriority, type SlideMediaType } from '@/types/case/AddOnOrder';
import '../../pathscribe.css';

let cartIdCounter = 0;
function nextCartId(): string { cartIdCounter += 1; return `cart-${cartIdCounter}`; }

const AddOnOrderPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('addOnOrder.pageTitle'), '/add-on-orders'); }, [pushCrumb, t]);

  const w = useAddOnOrderStation();
  // Batch 759 (spec §2.2, §3): after a typed entry, the identifiers to check against the containers.
  const typedEntry = useTypedEntryCheck([w.caseData?.accession?.fullAccession, w.caseData?.id]);
  // Batch 736: joins a picked bench reason and its note into the saved text.
  const addOnReasons = useBenchReasons('BENCH_ADDON_EXHAUSTED');
  const { has } = useCapabilities();
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [priority, setPriority] = useState<AddOnOrderPriority>('Routine Sign-Out');
  const [slideMediaType, setSlideMediaType] = useState<SlideMediaType>('Standard Charged');
  const [cuttingInstructions, setCuttingInstructions] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  // Batch 730 (spec §5, §8): where the new slides' labels print: '' = at the microtome when the block is cut.
  const [printAt, setPrintAt] = useState('');
  // Batch 731 (spec §10.6): per exhausted block, each cart line's alternative and the reason.
  const [exhaustedChoices, setExhaustedChoices] = useState<Record<string, CartExhaustedChoice>>({});
  // Batch 732 (spec §11.4): the pieces of a multi-piece block the order is for (none: the whole block).
  const [pieceTargets, setPieceTargets] = useState<Record<string, string[]>>({});

  useEffect(() => { w.loadDirectories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Batch 403: this page has its own voice/keyboard context ("add to order", "submit order").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.ADD_ON_ORDER);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  /** The text for a refused action. */
  const describeFailure = (result: AddOnActionResult): string => {
    if (result.notSaved) return t(`workstationSave.${result.notSaved}`);
    if (result.notPermitted) return t('addOnOrder.errors.notPermitted');
    if (result.alternativeRefused) return t(`addOnOrder.errors.alternativeRefused.${result.alternativeRefused}`);
    if (result.inHouseNotAvailable?.length) return t('addOnOrder.errors.inHouseNotAvailable', { tests: formatList(result.inHouseNotAvailable, i18n.language) });
    if (result.missing?.length) {
      return t('fieldRequirements.stillRequired', { fields: formatList(result.missing.map(id => t(`fieldRequirements.fields.addOnOrder.${id}`)), i18n.language) });
    }
    if (result.refused?.length) {
      return result.refused.map(r => t(`addOnOrder.errors.${r.code}`, { block: r.block, count: r.lines?.length ?? 0 })).join(' ');
    }
    return t('addOnOrder.errors.failed');
  };
  const report = (result: AddOnActionResult) => { if (!result.ok) setSubmitError(describeFailure(result)); };
  /** Batch 669 (ws-3): after a flagged exception is saved, who was told (the Supervisor / Accessioning Desk when the slide has no ordering pathologist), or that nobody could be. */
  const reportFlag = (result: AddOnActionResult) => {
    report(result);
    if (result.ok && result.noticeToDesk) setSubmitNotice(t('addOnOrder.tracking.flagSentToDesk'));
    if (result.ok && result.noticeNotSent) setSubmitError(t('addOnOrder.tracking.flagNobodyNotified'));
  };

  // Batch 375 (Pete): Add-On Orders is an action on a case now, not a Home
  // tile. The report page's "Add-on order" opens this page with ?case=<id>,
  // and the case is opened straight away, as if searched for.
  // Batch 446: ?case= carries the case's reference, not its accession.
  const requested = useRouteCaseId('addOnOrders', 'case');
  useEffect(() => {
    if (!requested) return;
    void w.openCase(requested);
  }, [requested]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch spec T1 (Batch 735): the shared scan field hands the accession in; an accession scanned while nothing
  // has focus (PATHSCRIBE_SCAN) opens the case too, since the app no longer navigates away from this screen.
  const handleOpen = async (value: string) => {
    setSubmitError(null);
    setSubmitNotice(null);
    await w.openCase(value);
  };
  useEffect(() => {
    const listener = (e: Event) => {
      const scan = (e as CustomEvent<{ raw: string; type?: string }>).detail;
      if (scan?.type === 'accession' && scan.raw) void handleOpen(scan.raw);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleBlock = (blockId: string) => {
    setSelectedBlockIds(prev => prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]);
  };

  const handleAddLines = (lines: AddOnOrderLineInput[]) => {
    setCart(prev => [...prev, ...lines.map(l => ({ ...withDefaultSendOutLab(l, w.referenceLabs, w.performingLabFacilityId), cartId: nextCartId() }))]);
  };

  const handleLineLabChange = (cartId: string, labId: string, labName: string) => {
    setCart(prev => prev.map(l => l.cartId !== cartId ? l : { ...l, sendOutReferenceLabFacilityId: labId || undefined, sendOutReferenceLabName: labId ? labName : undefined }));
  };

  const handleLineRoutingChange = (cartId: string, routing: 'IN_HOUSE' | 'SEND_OUT') => {
    setCart(prev => prev.map(l => l.cartId !== cartId ? l : { ...l, molecularRouting: routing }));
  };

  const handleRemoveLine = (cartId: string) => {
    setCart(prev => prev.filter(l => l.cartId !== cartId));
  };

  const handleSubmit: React.ComponentProps<typeof OrderSummaryRoutingPanel>['onSubmit'] = async (submission) => {
    setSubmitError(null);
    setSubmitNotice(null);
    const lines: AddOnOrderLineInput[] = cart.map(({ cartId, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
    const chosen = Object.fromEntries(Object.entries(exhaustedChoices).filter(([id]) => selectedBlockIds.includes(id)));
    const pieces = Object.fromEntries(Object.entries(pieceTargets).filter(([id, ids]) => selectedBlockIds.includes(id) && ids.length > 0));
    const result = await w.submitOrder(selectedBlockIds, lines, submission, printAt || undefined, choicesForSubmit(cart.map(l => l.cartId), chosen, addOnReasons.textOf), pieces);
    if (result.ok) {
      setCart([]);
      setSelectedBlockIds([]);
      setExhaustedChoices({});
      setPieceTargets({});
      setCuttingInstructions('');
      const placed = result.molecularNotQueued ? t('addOnOrder.summary.submittedMolecularNotQueued', { count: result.molecularNotQueued }) : t('addOnOrder.summary.submitted') as string;
      const station = w.printStations.find(st => st.id === printAt)?.name ?? '';
      const p = result.printedAt;
      setSubmitNotice(!p ? placed : t('addOnOrder.printAt.withPlaced', { placed, printed: p.status === 'printed'
        ? t(p.failed > 0 ? 'addOnOrder.printAt.printedSomeFailed' : 'addOnOrder.printAt.printed', { count: p.printed, failed: p.failed, station })
        : t(`addOnOrder.printAt.${p.status}`, { station }) }));
    } else {
      setSubmitError(describeFailure(result));
    }
  };

  if (!w.caseData) {
    return (
      <div className="ps-addon-page">
        <div className="ps-addon-header">
          <button type="button" className="ps-btn-secondary" onClick={() => navigate('/')}>{t('common.back')}</button>
          <h1 className="ps-addon-title">{t('addOnOrder.pageTitle')}</h1>
        </div>
        <StationScanField onScan={handleOpen} phiKind="accession"
          placeholder={t('addOnOrder.search.placeholder') as string} submitLabel={t('addOnOrder.search.open')} />
        {w.searchError && <div className="ps-addon-scan-error">{t(w.searchError.key, w.searchError.values)}</div>}
      </div>
    );
  }

  const caseData = w.caseData;
  const fullAccession = caseData.accession.fullAccession ?? caseData.accession.accessionNumber;

  return (
    <div className="ps-addon-page">
      <div className="ps-addon-header">
        <button type="button" className="ps-btn-secondary" onClick={w.closeCase}>{t('common.back')}</button>
        <h1 className="ps-addon-title">{t('addOnOrder.pageTitle')}</h1>
      </div>

      <div className="ps-addon-context-bar">
        <span><strong data-phi="accession">{fullAccession}</strong></span>
        {/* Batch 759 (Patient Verification spec §1): no patient name at the bench; an outside case shows its Foreign Identifier. */}
        <ForeignIdTag order={caseData.order} />
        <span>{t('addOnOrder.context.caseStatusLine', { status: CASE_STATUS_LABEL_KEY[caseData.status] ? t(CASE_STATUS_LABEL_KEY[caseData.status]) : caseData.status })}</span>
        {w.primaryPathologistName && <span>{t('addOnOrder.context.primaryPathologistLine', { name: w.primaryPathologistName })}</span>}
        {!w.performingLabFacilityId && <span className="ps-addon-warning-inline">{t('addOnOrder.context.noPerformingLab')}</span>}
        <span className="ps-ml-auto"><StationScanField compact onScan={handleOpen} phiKind="accession"
          placeholder={t('addOnOrder.search.placeholder') as string} submitLabel={t('addOnOrder.search.open')} /></span>
      </div>

      {typedEntry && <TypedEntryCheck accession={fullAccession} source={specimenSources(caseData.specimens).map(p => t('benchIdentity.specimenSource', { label: p.label, description: p.description })).join('; ')} />}
      {submitNotice && <div className="ps-addon-notice-banner">{submitNotice}</div>}
      {submitError && <div className="ps-addon-warning-banner">{submitError}</div>}

      <div className="ps-addon-layout">
        <BlockContextPanel specimens={caseData.specimens ?? []} matrixBlocks={caseData.matrixBlocks ?? []} selectedBlockIds={selectedBlockIds} onToggleBlock={handleToggleBlock}
          pieceTargets={pieceTargets}
          onTogglePiece={(blockId, pieceId) => setPieceTargets(prev => { const ids = prev[blockId] ?? []; return { ...prev, [blockId]: ids.includes(pieceId) ? ids.filter(x => x !== pieceId) : [...ids, pieceId] }; })} />
        <div>
          <ExhaustedBlockChoices
            specimens={caseData.specimens ?? []}
            selectedBlockIds={selectedBlockIds}
            cart={cart}
            choices={exhaustedChoices}
            onChange={(blockId, next) => setExhaustedChoices(prev => ({ ...prev, [blockId]: next }))}
            canRequestReembed={has('material:reembed:request')}
            pieceTargets={pieceTargets}
          />
          <OrderBuilderPanel stainTypes={w.stainTypes} onAddLines={handleAddLines} requirements={w.requirements} />
        </div>
        <OrderSummaryRoutingPanel
          cart={cart}
          onRemoveLine={handleRemoveLine}
          selectedBlockIds={selectedBlockIds}
          priority={priority}
          onPriorityChange={setPriority}
          slideMediaType={slideMediaType}
          onSlideMediaTypeChange={setSlideMediaType}
          cuttingInstructions={cuttingInstructions}
          onCuttingInstructionsChange={setCuttingInstructions}
          referenceLabs={w.referenceLabs}
          onLineLabChange={handleLineLabChange}
          onLineRoutingChange={handleLineRoutingChange}
          performingLabFacilityId={w.performingLabFacilityId}
          stationsForLine={(line) => w.stationsForRouting(line.orderKind, line.stainType.category)}
          performingLabResolved={Boolean(w.performingLabFacilityId)}
          onSubmit={handleSubmit}
          printStations={has('print:job:redirect') ? w.printStations : []}
          printAt={printAt}
          onPrintAtChange={setPrintAt}
          requirements={w.requirements}
          caseId={caseData.id}
        />
      </div>

      <OrderTrackingDashboard
        orders={w.trackedOrders()}
        caseId={caseData.id}
        requirements={w.requirements}
        onMarkBlockRetrieved={id => { setSubmitError(null); setSubmitNotice(null); void w.handleMarkBlockRetrieved(id).then(report); }}
        onFlagException={(id, reason, note) => { setSubmitError(null); setSubmitNotice(null); void w.handleFlagException(id, reason, note).then(reportFlag); }}
        onResolveException={(id, action, note, changes, alternative, individually, reasonCode) => {
          setSubmitError(null); setSubmitNotice(null);
          void w.handleResolveException(id, action, note, changes, alternative, individually, reasonCode).then(r => {
            report(r);
            // Batch 733: one answer for every waiting slide on the block says how many it covered.
            if (r.ok && (r.answered ?? 1) > 1) setSubmitNotice(t('addOnOrder.tracking.answeredCount', { count: r.answered }));
          });
        }}
        remainsFor={(specimenId, blockId) => { const sp = (caseData.specimens ?? []).find(s => s.id === specimenId); return sp ? whatRemains(sp, blockId) : null; }}
        canRequestReembed={has('material:reembed:request')}
      />
    </div>
  );
};

export default AddOnOrderPage;
