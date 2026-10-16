// src/pages/MicrotomyWorkstationPage/hooks/useMicrotomyBilling.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460 (Pete): billing at the Microtomy bench. By default a read-only
// list of the codes the scanned block's slides generate, with their charge
// status and warnings (services/billing/materialChargePreview.ts). People
// with billing:applied-code:review get a switch to the full billing review
// (the same panel and services as the report page), saved against the case
// as saved (services/material/materialBillingWrites.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { useCaseBillingReview } from '@/hooks/useCaseBillingReview';
import {
  serviceChargeService, materialChargePreview, saveUnitCodingOnCase, saveSpecimensOnCase, materialBillingWriteDeps,
  type MaterialChargeTarget,
} from '@/services';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { StainType } from '@/services/stains/IStainService';
import type { Case } from '@/types/case/Case';
import type { MicrotomyWorkItem } from './useMicrotomyWorkstation';

export function useMicrotomyBilling(workItem: MicrotomyWorkItem | null, stainTypes: StainType[], adoptSavedCase: (c: Case) => void) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [charges, setCharges] = useState<ServiceChargeRecord[]>([]);
  const [fullReview, setFullReview] = useState(false);
  const caseData = workItem?.caseData ?? null;
  const caseId = caseData?.id;

  const reloadCharges = () => {
    if (!caseId) { setCharges([]); return; }
    serviceChargeService.getChargesForCase(caseId).then(r => setCharges(r.ok ? r.data : [])).catch(() => setCharges([]));
  };
  // Reloaded for each case, after each save, and when the full review closes.
  useEffect(reloadCharges, [caseId, caseData?.version, fullReview]);
  useEffect(() => { setFullReview(false); }, [caseId]);

  const target: MaterialChargeTarget | null = !workItem ? null
    : workItem.kind === 'block' && workItem.matrixBlock ? { kind: 'matrix', matrixBlockId: workItem.matrixBlock.id }
    : { kind: 'unit', specimenId: workItem.specimen.id, unitId: workItem.kind === 'block' ? workItem.block.id : workItem.decant.id };

  const preview = useMemo(
    () => (caseData && target ? materialChargePreview({ caseData, target, stainTypes, charges }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseData, JSON.stringify(target), stainTypes, charges],
  );

  const review = useCaseBillingReview({
    caseData, user,
    writer: {
      saveUnitCoding: async (specimenId, unitId, change) => {
        const saved = await saveUnitCodingOnCase({ caseId: caseId!, specimenId, unitId, change }, materialBillingWriteDeps);
        adoptSavedCase(saved);
        return saved.specimens ?? [];
      },
      saveSpecimens: async change => {
        const saved = await saveSpecimensOnCase({ caseId: caseId!, change }, materialBillingWriteDeps);
        adoptSavedCase(saved);
        return saved.specimens ?? [];
      },
    },
    onSpecimens: () => undefined, // adoptSavedCase already took up the saved case
    // As on the report page: only an orchestration case is billed here (the LIS bills Assist and older cases).
    chargesEnabled: caseData?.reportingMode === 'orchestrator',
    onWarning: key => toast.warning(t(key)),
    onSaveFailed: () => toast.error(t('microtomyWorkstation.billing.saveFailed')),
    onLedgerChanged: () => reloadCharges(),
  });

  return { preview, fullReview, setFullReview, review, reloadCharges };
}
