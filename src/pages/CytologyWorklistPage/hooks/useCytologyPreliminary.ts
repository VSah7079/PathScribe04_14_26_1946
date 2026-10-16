// src/pages/CytologyWorklistPage/hooks/useCytologyPreliminary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026). Runs an urgent preliminary report on the
// Cytology screening page: whether one can be sent for this specimen, the
// inline panel (quick-pick reason, optional note), the signature when the
// laboratory requires it, the release, and the reload. Decisions are the
// service's (releaseCytologyPreliminary.ts): the permission, the reason, the
// specimen's state and the signature rule.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  cytologyPreliminaryBlock, cytologyPreliminariesFor, cytologyPreliminaryDeps, preliminarySignatureRequired, releaseCytologyPreliminary,
  type CytologyPreliminaryReason,
} from '@/services';
import { cytologyReviewReportContent } from '@/services/cytology/cytologyCaseActions';
import { cytologyWorkspaceDeps } from '@/services/cytology/cytologyWorkspaceDeps';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { Case } from '@/types/case/Case';

interface Args {
  caseData: Case | null;
  specimen: Parameters<typeof cytologyReviewReportContent>[0]['specimen'];
  specimenId: string | null | undefined;
  reviews: CytologyReviewRecord[];
  categories: CytologyCategoryEntry[];
  /** The specimen's chosen final diagnosis review. */
  finalDiagnosisReviewId: string | undefined;
  /** The specimen has a sign-out record. */
  signedOut: boolean;
  isPathologist: boolean;
  user: { id: string; name: string } | null | undefined;
  reload: () => Promise<void>;
}

export function useCytologyPreliminary({ caseData, specimen, specimenId, reviews, categories, finalDiagnosisReviewId, signedOut, isPathologist, user, reload }: Args) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CytologyPreliminaryReason | null>(null);
  const [note, setNote] = useState('');
  const [signatureNeeded, setSignatureNeeded] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const review = finalDiagnosisReviewId ? reviews.find(r => r.id === finalDiagnosisReviewId) : undefined;
  const available = !!caseData && !!specimenId && cytologyPreliminaryBlock(caseData, signedOut, !!review) === null;
  const sent = caseData && specimenId ? cytologyPreliminariesFor(caseData, specimenId) : [];

  const start = useCallback(async () => {
    if (!caseData) return;
    setReason(null); setNote('');
    setSignatureNeeded(await preliminarySignatureRequired(caseData, cytologyPreliminaryDeps));
    setOpen(true);
  }, [caseData]);
  const cancel = useCallback(() => { setOpen(false); setConfirming(false); }, []);

  const send = async (confirmation?: SignatureConfirmation) => {
    setConfirming(false);
    if (!caseData || !specimenId || !user?.id || !reason || !review) return;
    setSending(true);
    try {
      const content = await cytologyReviewReportContent({ caseData, specimen, reviews, review, categories, isPathologist }, cytologyWorkspaceDeps);
      const result = await releaseCytologyPreliminary({
        caseData, specimenId, reviewRecordId: review.id, content, reason, note,
        user: { id: user.id, name: user.name, isPathologist }, ...(confirmation ? { confirmation } : {}),
      }, cytologyPreliminaryDeps);
      if (result.ok === false) {
        toast.error(result.error === 'signatureRefused' && result.reason
          ? t(`signatureEvidence.refused.${result.reason}`)
          : t(`cytologyPreliminary.errors.${result.error}`));
        return;
      }
      toast.success(t('cytologyPreliminary.sent'));
      setOpen(false);
      await reload();
    } finally {
      setSending(false);
    }
  };

  /** Send: through the signature window when the laboratory requires it, otherwise at once. */
  const requestSend = () => { if (signatureNeeded) setConfirming(true); else void send(); };

  return { available, sent, open, start, cancel, reason, setReason, note, setNote, signatureNeeded, confirming, setConfirming, sending, requestSend, send };
}
