// src/pages/CytologyWorklistPage/hooks/useCytologyRevision.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 (Batch 390). Runs one correction or addendum on the Cytology screening
// page: which form is open and what is typed in it, the signature confirmation,
// the release, and what follows (the corrected review becomes the specimen's
// Final Diagnosis, the page reloads). Decisions are the services': the
// permission and the mandatory reason are checked in releaseCytologyCorrection /
// releaseCytologyAddendum, what the form still needs in cytologyChecks, how the
// findings and report context are built in resolveCytologyRevisionInputs.
// ─────────────────────────────────────────────────────────────────────────────

import { submitCytologyRevisionToRegistry } from '@/services/screeningRegistry/submitCytologyRevisionToRegistry';
import { submitCytologyRevisionToRegistryDeps } from '@/services/screeningRegistry/submitCytologyRevisionToRegistryDeps';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { signatureGate } from '@/services';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';
import { releaseCytologyCorrection } from '@/services/cytology/releaseCytologyCorrection';
import { releaseCytologyAddendum } from '@/services/cytology/releaseCytologyAddendum';
import { resolveCytologyFinalDiagnosisSnapshot } from '@/services/cytology/resolveCytologyFinalDiagnosisSnapshot';
import {
  buildCorrectedFindings, correctionDraftFromReview, resolveCytologyReleaseContext, EMPTY_CORRECTION_DRAFT, type CytologyCorrectionDraft,
} from '@/services/cytology/resolveCytologyRevisionInputs';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyRevisionMode } from '../components/CytologyRevisionActions';

interface Args {
  caseData: any;
  specimen: any;
  specimenId: string | undefined;
  /** The review the signed-out report was built from. */
  signedReview: CytologyReviewRecord | undefined;
  categories: CytologyCategoryEntry[];
  user: { id: string; name: string } | null | undefined;
  isPathologist: boolean;
  /** Batch 419: whether the specimen is GYN (a cervical screening registry takes only GYN). */
  isGynCytology: boolean;
  updateSpecimen: (patch: Record<string, any>) => Promise<void>;
  reload: () => Promise<void>;
}

export function useCytologyRevision({ caseData, specimen, specimenId, signedReview, categories, user, isPathologist, isGynCytology, updateSpecimen, reload }: Args) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<CytologyRevisionMode | null>(null);
  const [draft, setDraft] = useState<CytologyCorrectionDraft>({ ...EMPTY_CORRECTION_DRAFT });
  const [addendumText, setAddendumText] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const start = useCallback((next: CytologyRevisionMode) => {
    setDraft(correctionDraftFromReview(signedReview));
    setAddendumText('');
    setReason('');
    setMode(next);
  }, [signedReview]);

  const cancel = useCallback(() => { setMode(null); setConfirming(false); }, []);

  const release = async (confirmation: SignatureConfirmation) => {
    setConfirming(false);
    if (!mode || !caseData || !specimenId || !user?.id) return;
    const caseRef = caseData.accession?.fullAccession ?? caseData.id;
    const accepted = await signatureGate.accept(confirmation, { caseId: caseData.id, caseRef, actions: ['cytology-sign-out'] });
    if (accepted.ok === false) { toast.error(t(`signatureEvidence.refused.${accepted.reason}`)); return; }

    setSaving(true);
    try {
      const ctx = resolveCytologyReleaseContext(caseData, specimen);
      const releasingUser = { id: user.id, name: user.name, isPathologist };
      const result = mode === 'correction'
        ? await releaseCytologyCorrection(caseData.id, specimenId, buildCorrectedFindings(draft, categories), categories, ctx.patient, ctx.order, ctx.specimen, releasingUser, reason)
        : await releaseCytologyAddendum(caseData.id, specimenId, addendumText, releasingUser, reason, ctx.order.facilityId);

      if (result.ok === false) {
        signatureGate.release(caseData.id);
        toast.error(t(result.notPermitted ? 'cytologyRevision.toasts.notPermitted' : 'cytologyRevision.toasts.failed'));
        return;
      }
      if (mode === 'correction' && 'review' in result && result.review) {
        await updateSpecimen({ finalDiagnosis: { ...resolveCytologyFinalDiagnosisSnapshot(result.review), selectedBy: user.id, selectedByName: user.name, selectedAt: new Date().toISOString() } });
      }
      await signatureGate.commit(caseData.id, 'signed', { kind: 'cytology-sign-out', id: result.signOutRecordId });
      // Batch 419 (SRS v2.1 FR-008.4): the registry gets the new version (CORRECTION / AMENDMENT). The release stands whatever it says.
      if (result.signOutRecordId) {
        await submitCytologyRevisionToRegistry({ caseData, signOutRecordId: result.signOutRecordId, kind: mode, isGynCytology, categories }, submitCytologyRevisionToRegistryDeps).catch(() => undefined);
      }
      toast.success(t(mode === 'correction' ? 'cytologyRevision.toasts.correctionReleased' : 'cytologyRevision.toasts.addendumReleased'));
      setMode(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return {
    mode, draft, setDraft, addendumText, setAddendumText, reason, setReason, saving,
    confirming, requestRelease: () => setConfirming(true), cancelConfirm: () => setConfirming(false),
    start, cancel, release,
  };
}
