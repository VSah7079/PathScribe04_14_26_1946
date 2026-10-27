/**
 * PoolClaimModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown when a pathologist clicks a pool case.
 * They must explicitly Accept (assigns to them) or Pass (returns to pool).
 * The case is status-locked to 'claimed' while this modal is open.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useOpenCase } from '@/hooks/useOpenCase';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import '@/pathscribe.css';

import { sendAccessRequestToAdmins, pendingAccessRequestsFor } from '@/utils/accessRequests';
import { claimPoolCase, acceptPoolCase, passPoolCase, releasePoolClaim, isPoolActionNotPermitted, actionRegistryService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useCapabilities } from '@/hooks/useCapabilities';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { POOL_WINDOW_VOICE_CONTEXT, resolvePoolWindowAction } from '@/services/cases/poolClaimWindow';

interface PoolClaimModalProps {
  isOpen:            boolean;
  caseId:            string | null;
  caseSummary?:      string;
  poolName?:         string;
  currentUserId:     string;
  currentUserName:   string;
  // Real feature, per direct product decision: pool-restricted cases
  // stay visible with a real request-access path, the same as
  // Pediatric, rather than being hidden entirely. Needed for
  // sendAccessRequestToAdmins' own org-scoping — see that function's
  // own header comment for why an unrelated hospital's admin
  // shouldn't be the one granted this request by default.
  currentUserOrganisationId?: string;
  continueToReport?: boolean;
  fromFilter?:       string;
  /** Batch 650: the voice context of the screen this window opens over, handed back when it closes (default WORKLIST). */
  restoreVoiceContext?: string;
  onAccepted:        () => void;
  onPassed:          () => void;
  onClose:           () => void;
}

type Step = 'claiming' | 'ready' | 'blocked' | 'access-denied' | 'accepting' | 'passing';

// Locates one or more values inside an already-translated sentence and
// wraps each in <strong>, correct regardless of a locale's word order.
// Same pattern as RequestReviewModal.tsx's own boldSubstrings().
const boldSubstrings = (text: string, values: string[]): React.ReactNode => {
  const positions = values
    .filter(Boolean)
    .map(v => ({ v, i: text.indexOf(v) }))
    .filter(p => p.i !== -1)
    .sort((a, b) => a.i - b.i);
  if (positions.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  positions.forEach(({ v, i }, idx) => {
    if (i < cursor) return;
    parts.push(text.slice(cursor, i));
    parts.push(<strong key={idx} className="pcm-strong">{v}</strong>);
    cursor = i + v.length;
  });
  parts.push(text.slice(cursor));
  return parts;
};

export const PoolClaimModal: React.FC<PoolClaimModalProps> = ({
  isOpen, caseId, caseSummary, poolName,
  currentUserId, currentUserName, currentUserOrganisationId,
  continueToReport = false,
  fromFilter,
  restoreVoiceContext = VOICE_CONTEXT.WORKLIST,
  onAccepted, onPassed, onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openCasePage = useOpenCase();
  const [step,      setStep]      = useState<Step>('claiming');
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  // Batch 649: a refusal for want of case:pool:claim / case:pool:pass (the buttons are greyed without them).
  const [refusal, setRefusal] = useState<string | null>(null);
  // Real feature, per direct product decision: pool-restricted cases
  // stay visible with a real request-access path, mirroring the
  // Pediatric Access modal's own tracked-per-restriction pattern
  // (pedRequestedIds in WorklistTable.tsx). Scoped to the POOL, not
  // the individual case — the real thing being requested is
  // membership in that pool, so having asked once already covers
  // every other case sitting in the same restricted pool, not just
  // this one.
  // Batch 431: the "already requested" state comes from this person's own
  // pending access requests (it was kept per computer in the browser).
  const [accessRequestedPools, setAccessRequestedPools] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    let cancelled = false;
    pendingAccessRequestsFor(currentUserId).then(pending => {
      if (cancelled) return;
      setAccessRequestedPools(new Set(pending.filter(r => r.type === 'pool' && r.poolName).map(r => r.poolName!)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, currentUserId]);
  const markAccessRequested = (pool: string) => {
    setAccessRequestedPools(prev => new Set(prev).add(pool));
  };
  const accessAlreadyRequested = poolName ? accessRequestedPools.has(poolName) : false;

  const handleViewReport = () => {
    if (!caseId) return;
    void openCasePage(caseId, 'report', { state: { fromFilter: 'pool' } });
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !caseId) return;
    setStep('claiming');
    setBlockedBy(null);
    setRefusal(null);

    // claimPoolCase takes (caseId, userId) — name is resolved by the service
    claimPoolCase(caseId, currentUserId).then(result => {
      if (result.success) {
        setStep('ready');
      } else if ((result as any).claimedBy) {
        // Someone else is actively reviewing it right now — real,
        // temporary contention, not a permissions question.
        setBlockedBy((result as any).claimedBy);
        setStep('blocked');
      } else {
        // Real feature, per direct product decision: pool-restricted
        // cases stay visible with a real request-access path, the same
        // as Pediatric, rather than being hidden entirely. No
        // claimedBy means this is canUserClaimPoolCase's own
        // membership rejection, not a concurrent-claim race — a
        // genuinely different situation needing a genuinely different
        // (actionable) response, not the same "try again later" copy.
        setStep('access-denied');
      }
    });

    // Release claim if modal closes without action
    return () => { if (caseId) releasePoolClaim(caseId).catch(() => {}); };
  }, [isOpen, caseId, currentUserId, currentUserName]);

  const handleAccept = async () => {
    if (!caseId) return;
    setStep('accepting');
    // PS-71 (Batch 458): two people accepting at once: only the first wins.
    try { await acceptPoolCase(caseId, currentUserId, currentUserName); }
    catch (e) {
      if (isPoolActionNotPermitted(e)) { setRefusal(e.message); setStep('ready'); return; }
      setBlockedBy(null); setStep('blocked'); return;
    }
    if (continueToReport) {
      void openCasePage(caseId, 'synoptic');
    }
    onAccepted();
  };

  const handlePass = async () => {
    if (!caseId) return;
    setStep('passing');
    try { await passPoolCase(caseId); }
    catch (e) { if (isPoolActionNotPermitted(e)) { setRefusal(e.message); setStep('ready'); return; } throw e; }
    onPassed();
    navigate('/worklist', { state: { restoreFilter: fromFilter ?? 'pool' } });
  };

  // Voice and keys: POOL_ACCEPT_CASE (Alt+A) / POOL_PASS_CASE (Ctrl+Alt+P) press the Accept and Pass buttons below
  // (services/cases/poolClaimWindow.ts). The registry files them under the report screen's context, so while this window
  // is open it takes that context, and gives the host's back on close. They act only once the window is ready and the
  // button's capability is held; the handlers are the buttons' own, so acceptPoolCase / passPoolCase check it again.
  const { has } = useCapabilities();
  const canClaim = has('case:pool:claim', { caseId });
  const canPass = has('case:pool:pass', { caseId });
  useEffect(() => {
    if (!isOpen) return undefined;
    actionRegistryService.setCurrentContext(POOL_WINDOW_VOICE_CONTEXT);
    return () => actionRegistryService.setCurrentContext(restoreVoiceContext);
  }, [isOpen, restoreVoiceContext]);
  const latest = React.useRef({ step, canClaim, canPass, handleAccept, handlePass });
  latest.current = { step, canClaim, canPass, handleAccept, handlePass };
  useEffect(() => {
    if (!isOpen) return undefined;
    return actionRegistryService.onAction((actionId: string) => {
      const { handleAccept: accept, handlePass: pass, ...facts } = latest.current;
      const button = resolvePoolWindowAction(actionId, facts);
      if (button === 'accept') void accept();
      else if (button === 'pass') void pass();
    });
  }, [isOpen, caseId]);

  if (!isOpen || !caseId) return null;

  const busy = step === 'accepting' || step === 'passing';

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-pool-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ps-pool-header">
          <div className="ps-pool-header-col">
            <div className="ps-pool-eyebrow">{'👥 '}{poolName ?? t('poolClaimModal.defaultPoolName')} — {t('poolClaimModal.caseAssignment')}</div>
            <div className="ps-pool-title" data-phi="true">{caseSummary ?? caseId}</div>
            <div className="ps-pool-subtitle" data-phi="accession">{caseId}</div>
          </div>
        </div>

        {/* Body */}
        <div className={step === 'claiming' || step === 'blocked' || step === 'access-denied' ? 'ps-pool-body--centered' : 'ps-pool-body'}>

          {/* Claiming */}
          {step === 'claiming' && <>
            <div className="ps-pool-icon">⏳</div>
            {t('poolClaimModal.checkingAvailability')}
          </>}

          {/* Blocked */}
          {step === 'blocked' && <>
            <div className="ps-pool-icon">🔒</div>
            <div className="ps-pool-blocked-title">{t('poolClaimModal.caseUnavailable')}</div>
            <div className="pcm-body-text">
              {blockedBy
                ? boldSubstrings(t('poolClaimModal.reviewedByMessage', { name: blockedBy }), [blockedBy])
                : t('poolClaimModal.takenMessage')}
            </div>
            <div className="pcm-close-row">
              <button className="ps-btn-secondary" onClick={onClose}>{t('poolClaimModal.close')}</button>
            </div>
          </>}

          {/* Access denied — real feature, per direct product decision:
              pool-restricted cases stay visible with a real
              request-access path, mirroring the Pediatric Access
              modal's own structure and tone, rather than being hidden
              entirely (an admin oversight in pool membership shouldn't
              leave a pathologist with no way to even find out a case
              exists, let alone ask for access to it). */}
          {step === 'access-denied' && <>
            <div className="ps-pool-icon">🔒</div>
            <div className="ps-pool-blocked-title">{t('poolClaimModal.poolAccessRequired')}</div>
            <div className="pcm-body-text pcm-body-text--spaced">
              {boldSubstrings(
                t('poolClaimModal.belongsToPoolMessage', {
                  pool: poolName ?? t('poolClaimModal.defaultPoolNameThis'),
                  path: t('poolClaimModal.configPathLabel'),
                }),
                [poolName ?? t('poolClaimModal.defaultPoolNameThis'), t('poolClaimModal.configPathLabel')]
              )}
            </div>
            {accessAlreadyRequested ? (
              <div className="ps-ped-pending">
                {'⏳ '}{t('poolClaimModal.accessPending')}<br/>
                <span className="ps-ped-pending-sub">{t('poolClaimModal.accessPendingSub')}</span>
              </div>
            ) : (
              <div className="ps-ped-info-box">
                <strong className="ps-ped-highlight">{t('poolClaimModal.requestPoolAccess')}</strong><br/>
                {t('poolClaimModal.requestPoolAccessDesc')}
              </div>
            )}
            <div className="pcm-access-actions">
              <button className="ps-btn-secondary" onClick={onClose}>{t('poolClaimModal.close')}</button>
              {!accessAlreadyRequested && (
                <button className="ps-btn-primary" onClick={async () => {
                  try {
                    await sendAccessRequestToAdmins(
                      { id: currentUserId, name: currentUserName, organisationId: currentUserOrganisationId },
                      `Pool Access Request — ${currentUserName}`,
                      `${currentUserName} needs access to the ${poolName ?? 'restricted'} pool (attempted to claim case ${caseId}).\n\nTo grant access:\n1. Go to Configuration → Synoptic Library → Subspecialties\n2. Open the ${poolName ?? ''} pool\n3. Add ${currentUserName} to its member list\n\nThis was likely an oversight when the pool was originally configured.`,
                      '/configuration?tab=synoptic-library&section=subspecialties',
                      { type: 'pool', caseId, poolName },
                    );
                  } finally {
                    if (poolName) markAccessRequested(poolName);
                  }
                }}>
                  {t('poolClaimModal.requestPoolAccess')}
                </button>
              )}
            </div>
          </>}

          {/* Ready / Acting */}
          {(step === 'ready' || step === 'accepting' || step === 'passing') && <>
            <p className="ps-pool-description">
              {continueToReport
                ? <>
                    {t('poolClaimModal.descContinuePrefix')} <strong className="pcm-strong-blue">{t('poolClaimModal.claimContinuePhrase')}</strong>{t('poolClaimModal.descContinueMiddle')} <strong className="pcm-strong-amber">{t('poolClaimModal.passPhrase')}</strong> {t('poolClaimModal.descContinueSuffix')}
                  </>
                : <>
                    {t('poolClaimModal.descPrefix')} <strong className="pcm-strong-blue">{t('poolClaimModal.claimPhrase')}</strong> {t('poolClaimModal.descMiddle1')} <strong className="pcm-strong-purple">{t('poolClaimModal.viewReportPhrase')}</strong> {t('poolClaimModal.descMiddle2')} <strong className="pcm-strong-amber">{t('poolClaimModal.passPhrase')}</strong> {t('poolClaimModal.descSuffix')}
                  </>
              }
            </p>

            <div className="ps-pool-info-box">
              <div className="ps-pool-info-box-label">{t('poolClaimModal.whatHappensNext')}</div>
              <div className="ps-pool-info-box-items">
                {continueToReport
                  ? <>
                      <div>{'✅ '}<strong className="pcm-strong-light">{t('poolClaimModal.claimContinueLabel')}</strong> — {t('poolClaimModal.claimContinueDesc')}</div>
                      <div>{'⏭️ '}<strong className="pcm-strong-light">{t('poolClaimModal.passLabel')}</strong> — {t('poolClaimModal.passDesc')}</div>
                    </>
                  : <>
                      <div>{'✅ '}<strong className="pcm-strong-light">{t('poolClaimModal.claimCaseLabel')}</strong> — {t('poolClaimModal.claimCaseDesc')}</div>
                      <div>{'🔍 '}<strong className="pcm-strong-light">{t('poolClaimModal.viewReportLabel')}</strong> — {t('poolClaimModal.viewReportDesc')}</div>
                      <div>{'⏭️ '}<strong className="pcm-strong-light">{t('poolClaimModal.passLabel')}</strong> — {t('poolClaimModal.passDesc')}</div>
                    </>
                }
              </div>
            </div>

            <div className="ps-pool-actions">
              <CapabilityButton capability="case:pool:pass" context={{ caseId }} className="ps-btn-secondary" onClick={handlePass} disabled={busy}>{t('poolClaimModal.passLabel')}</CapabilityButton>

              {!continueToReport && (
                <button className="ps-btn-view-report" onClick={handleViewReport} disabled={busy}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {t('poolClaimModal.viewReportLabel')}
                </button>
              )}

              <CapabilityButton capability="case:pool:claim" context={{ caseId }} className="ps-btn-primary" onClick={handleAccept} disabled={busy}>
                {step === 'accepting' ? t('poolClaimModal.claiming') : continueToReport ? t('poolClaimModal.claimContinueLabel') : t('poolClaimModal.claimCaseLabel')}
              </CapabilityButton>
            </div>
            {refusal && <div className="ps-conf-error-text" role="alert">{refusal}</div>}
          </>}

        </div>
      </div>
    </div>
  );
};

export default PoolClaimModal;
