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
// ─────────────────────────────────────────────────────────────────────────────

import { useRouteCaseId } from '@/hooks/useRouteCaseId';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { formatFullDisplayName } from '@/utils/personName';
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
  const [searchInput, setSearchInput] = useState('');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [priority, setPriority] = useState<AddOnOrderPriority>('Routine Sign-Out');
  const [slideMediaType, setSlideMediaType] = useState<SlideMediaType>('Standard Charged');
  const [cuttingInstructions, setCuttingInstructions] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  useEffect(() => { w.loadDirectories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Batch 403: this page has its own voice/keyboard context ("add to order", "submit order").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.ADD_ON_ORDER);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  /** The text for a refused action. */
  const describeFailure = (result: AddOnActionResult): string => {
    if (result.notPermitted) return t('addOnOrder.errors.notPermitted');
    if (result.inHouseNotAvailable?.length) return t('addOnOrder.errors.inHouseNotAvailable', { tests: formatList(result.inHouseNotAvailable, i18n.language) });
    if (result.missing?.length) {
      return t('fieldRequirements.stillRequired', { fields: formatList(result.missing.map(id => t(`fieldRequirements.fields.addOnOrder.${id}`)), i18n.language) });
    }
    if (result.refused?.length) {
      return result.refused.map(r => t(`addOnOrder.errors.${r.code}`, { block: r.block })).join(' ');
    }
    return t('addOnOrder.errors.failed');
  };
  const report = (result: AddOnActionResult) => { if (!result.ok) setSubmitError(describeFailure(result)); };

  // Batch 375 (Pete): Add-On Orders is an action on a case now, not a Home
  // tile. The report page's "Add-on order" opens this page with ?case=<id>,
  // and the case is opened straight away, as if searched for.
  // Batch 446: ?case= carries the case's reference, not its accession.
  const requested = useRouteCaseId('addOnOrders', 'case');
  useEffect(() => {
    if (!requested) return;
    setSearchInput(requested);
    void w.openCase(requested);
  }, [requested]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = async () => {
    setSubmitError(null);
    setSubmitNotice(null);
    await w.openCase(searchInput);
  };

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
    const result = await w.submitOrder(selectedBlockIds, lines, submission);
    if (result.ok) {
      setCart([]);
      setSelectedBlockIds([]);
      setCuttingInstructions('');
      setSubmitNotice(result.molecularNotQueued ? t('addOnOrder.summary.submittedMolecularNotQueued', { count: result.molecularNotQueued }) : t('addOnOrder.summary.submitted') as string);
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
        <div className="ps-addon-search-row">
          <input
            className="ps-addon-scan-input"
            placeholder={t('addOnOrder.search.placeholder') as string}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleOpen(); }}
            autoFocus
          />
          <button type="button" className="ps-btn-primary" onClick={handleOpen}>{t('addOnOrder.search.open')}</button>
        </div>
        {w.searchError && <div className="ps-addon-scan-error">{t(w.searchError.key, w.searchError.values)}</div>}
      </div>
    );
  }

  const caseData = w.caseData;
  const patientName = formatFullDisplayName({
    namePrefix: caseData.patient.namePrefix,
    givenNames: caseData.patient.givenNames ?? caseData.patient.firstName,
    familyNames: caseData.patient.familyNames ?? caseData.patient.lastName,
    nameSuffix: caseData.patient.nameSuffix,
  });
  const fullAccession = caseData.accession.fullAccession ?? caseData.accession.accessionNumber;

  return (
    <div className="ps-addon-page">
      <div className="ps-addon-header">
        <button type="button" className="ps-btn-secondary" onClick={w.closeCase}>{t('common.back')}</button>
        <h1 className="ps-addon-title">{t('addOnOrder.pageTitle')}</h1>
      </div>

      <div className="ps-addon-context-bar">
        <span><strong data-phi="accession">{fullAccession}</strong></span>
        <span data-phi="name">{patientName}</span>
        <span>{t('addOnOrder.context.caseStatusLine', { status: CASE_STATUS_LABEL_KEY[caseData.status] ? t(CASE_STATUS_LABEL_KEY[caseData.status]) : caseData.status })}</span>
        {caseData.order?.assignedTo && <span>{t('addOnOrder.context.primaryPathologistLine', { name: caseData.order.assignedTo })}</span>}
        {!w.performingLabFacilityId && <span className="ps-addon-warning-inline">{t('addOnOrder.context.noPerformingLab')}</span>}
      </div>

      {submitNotice && <div className="ps-addon-notice-banner">{submitNotice}</div>}
      {submitError && <div className="ps-addon-warning-banner">{submitError}</div>}

      <div className="ps-addon-layout">
        <BlockContextPanel specimens={caseData.specimens ?? []} selectedBlockIds={selectedBlockIds} onToggleBlock={handleToggleBlock} />
        <OrderBuilderPanel stainTypes={w.stainTypes} onAddLines={handleAddLines} requirements={w.requirements} />
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
          requirements={w.requirements}
          caseId={caseData.id}
        />
      </div>

      <OrderTrackingDashboard
        orders={w.trackedOrders()}
        caseId={caseData.id}
        requirements={w.requirements}
        onMarkBlockRetrieved={id => { setSubmitError(null); void w.handleMarkBlockRetrieved(id).then(report); }}
        onFlagException={(id, reason, note) => { setSubmitError(null); void w.handleFlagException(id, reason, note).then(report); }}
        onResolveException={(id, action, note, changes) => { setSubmitError(null); void w.handleResolveException(id, action, note, changes).then(report); }}
      />
    </div>
  );
};

export default AddOnOrderPage;
